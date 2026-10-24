-- Invoice snapshot from the authoritative server-side catalogue; no client-submitted totals.

CREATE OR REPLACE FUNCTION public.mizato_billing_valid(billing jsonb)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public','pg_temp' AS $fn$
DECLARE fee jsonb; ids text[]:=array[]::text[]; k text; val numeric; tax numeric;
BEGIN
 IF billing IS NULL THEN RETURN true;END IF;
 IF jsonb_typeof(billing)<>'object'
   OR (SELECT COUNT(*) FROM jsonb_object_keys(billing) z)>2
   OR EXISTS(SELECT 1 FROM jsonb_object_keys(billing) z WHERE z NOT IN ('taxBps','fees'))
   OR jsonb_typeof(billing->'taxBps') IS DISTINCT FROM 'number'
   OR jsonb_typeof(billing->'fees') IS DISTINCT FROM 'array'
   OR jsonb_array_length(billing->'fees')>5
 THEN RETURN false;END IF;
 tax=(billing->>'taxBps')::numeric;
 IF tax<>trunc(tax) OR tax NOT BETWEEN 0 AND 3000 THEN RETURN false;END IF;
 FOR fee IN SELECT value FROM jsonb_array_elements(billing->'fees') LOOP
  IF jsonb_typeof(fee)<>'object'
   OR (SELECT COUNT(*) FROM jsonb_object_keys(fee))<>4
   OR EXISTS(SELECT 1 FROM jsonb_object_keys(fee) z WHERE z NOT IN ('id','label','kind','value'))
   OR jsonb_typeof(fee->'id') IS DISTINCT FROM 'string'
   OR jsonb_typeof(fee->'label') IS DISTINCT FROM 'string'
   OR jsonb_typeof(fee->'kind') IS DISTINCT FROM 'string'
   OR jsonb_typeof(fee->'value') IS DISTINCT FROM 'number'
  THEN RETURN false;END IF;
  k=fee->>'id';
  IF length(k) NOT BETWEEN 1 AND 40 OR k !~ '^[a-zA-Z0-9_-]+$' OR k=ANY(ids)
   OR length(trim(fee->>'label')) NOT BETWEEN 2 AND 40
   OR fee->>'kind' NOT IN ('fixed','percent')
  THEN RETURN false;END IF;
  ids=array_append(ids,k);val=(fee->>'value')::numeric;
  IF val<>trunc(val) OR val<0 OR (fee->>'kind'='fixed' AND val>1000000)
   OR (fee->>'kind'='percent' AND val>3000)
  THEN RETURN false;END IF;
 END LOOP;
 RETURN true;
EXCEPTION WHEN OTHERS THEN RETURN false;
END $fn$;
CREATE OR REPLACE FUNCTION public.mizato_invoice_quote(billing jsonb,subtotal bigint)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public','pg_temp' AS $fn$
DECLARE fee jsonb; amount bigint; fees_total bigint:=0; tax_total bigint:=0; lines jsonb:='[]'::jsonb;
BEGIN
 IF subtotal IS NULL OR subtotal<0 OR NOT public.mizato_billing_valid(COALESCE(billing,'{"taxBps":0,"fees":[]}'::jsonb))
  THEN RAISE EXCEPTION 'BILLING_INVALID: تنظیمات مالیات و خدمات معتبر نیست';END IF;
 IF subtotal=0 THEN RETURN jsonb_build_object('subtotalAmount',0,'taxAmount',0,'serviceAmount',0,'charges','[]'::jsonb,'totalAmount',0);END IF;
 FOR fee IN SELECT value FROM jsonb_array_elements(COALESCE(billing->'fees','[]'::jsonb)) LOOP
  amount=CASE WHEN fee->>'kind'='fixed' THEN (fee->>'value')::bigint
    ELSE round(subtotal::numeric*(fee->>'value')::numeric/10000)::bigint END;
  IF amount>0 THEN
   fees_total=fees_total+amount;
   lines=lines||jsonb_build_array(jsonb_build_object('id',fee->>'id','label',fee->>'label',
    'kind',fee->>'kind','value',(fee->>'value')::integer,'amount',amount));
  END IF;
 END LOOP;
 -- VAT is calculated on food subtotal. Service lines are separate; do not tax them twice.
 tax_total=round(subtotal::numeric*coalesce((billing->>'taxBps')::numeric,0)/10000)::bigint;
 RETURN jsonb_build_object('subtotalAmount',subtotal,'taxAmount',tax_total,'serviceAmount',fees_total,
  'charges',lines,'totalAmount',subtotal+tax_total+fees_total);
END $fn$;
CREATE OR REPLACE FUNCTION public.mizato_billing_settings_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public','pg_temp' AS $fn$
BEGIN
 IF NEW.settings ? 'billing' AND NOT public.mizato_billing_valid(NEW.settings->'billing')
  THEN RAISE EXCEPTION 'BILLING_INVALID: تنظیمات مالیات یا هزینه خدمات معتبر نیست';END IF;
 RETURN NEW;
END $fn$;
DROP TRIGGER IF EXISTS mizato_billing_guard ON public.businesses;
CREATE TRIGGER mizato_billing_guard BEFORE INSERT OR UPDATE OF settings ON public.businesses
FOR EACH ROW EXECUTE FUNCTION public.mizato_billing_settings_guard();
ALTER TABLE public.orders
 ADD COLUMN IF NOT EXISTS subtotal_toman bigint NOT NULL DEFAULT 0,
 ADD COLUMN IF NOT EXISTS tax_toman bigint NOT NULL DEFAULT 0,
 ADD COLUMN IF NOT EXISTS service_toman bigint NOT NULL DEFAULT 0,
 ADD COLUMN IF NOT EXISTS billing_rules_snapshot jsonb NOT NULL DEFAULT '{"taxBps":0,"fees":[]}'::jsonb,
 ADD COLUMN IF NOT EXISTS charge_lines_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb;
UPDATE public.orders SET subtotal_toman=total_toman WHERE subtotal_toman=0 AND tax_toman=0 AND service_toman=0;

CREATE OR REPLACE FUNCTION public.order_create(body jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare bid text=body->>'businessId';sid text=body->>'sessionId';key text=body->>'idempotencyKey';g session_guests;ss service_sessions;o orders;p products;group_row product_option_groups;option_row product_options;item jsonb;choice jsonb;chosen text[];qty int;extra bigint;line bigint;total bigint=0;idx int=0;xi int;itemid text;oid text;fingerprint text;n bigint;expected integer;bill jsonb;quote jsonb;
begin
 g=order_guest(bid,sid,body->>'guestToken');select * into ss from service_sessions where business_id=bid and id=sid for update;
 if ss.status<>'open' then raise exception 'SESSION_INVALID: نشست بسته شده است';end if;
 if length(coalesce(key,'')) not between 10 and 100 then raise exception 'شناسه درخواست معتبر نیست';end if;
 fingerprint=md5((body-'guestToken')::text);select * into o from orders where business_id=bid and guest_id=g.id and idempotency_key=key;
 if o.id is not null then if o.request_hash<>fingerprint then raise exception 'CONFLICT: شناسه درخواست با محتوای دیگری استفاده شده است';end if;return jsonb_build_object('status',200,'data',order_dto(bid,o.id));end if;
 if jsonb_typeof(body->'items') is distinct from 'array' or jsonb_array_length(body->'items') not between 1 and 50 then raise exception 'آیتم‌های سفارش معتبر نیست';end if;
 if not menu_rate('guest-order-'||g.id,20) then return jsonb_build_object('status',429,'data',jsonb_build_object('error','تعداد درخواست‌ها زیاد است؛ کمی صبر کن'));end if;
 if not exists(select 1 from businesses where id=bid and status='active' and coalesce((settings->>'orderAcceptanceActive')::boolean,true)) then raise exception 'این مجموعه فعلاً سفارش نمی‌پذیرد';end if;
 insert into business_order_counters values(bid,1001) on conflict do nothing;
 update business_order_counters set next_number=next_number+1 where business_id=bid returning next_number-1 into n;
 oid='order-'||gen_random_uuid();insert into orders(business_id,id,session_id,service_point_id,guest_id,number,total_toman,customer_name,customer_note,idempotency_key,request_hash) values(bid,oid,sid,ss.service_point_id,g.id,'#'||n,0,left(coalesce(body->>'customerName','مهمان'),80),left(coalesce(body->>'customerNotes',''),500),key,fingerprint);
 for item in select value from jsonb_array_elements(body->'items')loop
  select * into p from products where business_id=bid and id=item->>'productId' and status='active' and is_available for share;
  if p.id is null or not point_menu_allowed(bid,ss.service_point_id,p.menu_id) then raise exception 'MENU_UNAVAILABLE: یکی از غذاها در این بخش یا ساعت قابل سفارش نیست';end if;
  qty=(item->>'quantity')::int;if qty is null or qty not between 1 and 30 or (item->>'quantity')::numeric<>qty then raise exception 'تعداد معتبر نیست';end if;
  extra=0;chosen=array[]::text[];itemid=oid||'-'||idx;xi=0;
  insert into order_items(business_id,id,order_id,product_id,product_id_snapshot,menu_id_snapshot,name_snapshot,unit_price_toman,quantity,note,line_total_toman,sort_order) values(bid,itemid,oid,p.id,p.id,p.menu_id,p.name,p.price_toman,qty,left(coalesce(item->>'notes',''),500),0,idx);
  if jsonb_typeof(coalesce(item->'selectedOptions','[]'))<>'array' or jsonb_array_length(coalesce(item->'selectedOptions','[]'))>30 then raise exception 'گزینه‌ها معتبر نیست';end if;
  for choice in select value from jsonb_array_elements(coalesce(item->'selectedOptions','[]'))loop
   select * into group_row from product_option_groups where business_id=bid and product_id=p.id and (case when coalesce(choice->>'groupId','')<>'' then id=choice->>'groupId' else title=choice->>'groupTitle' end);
   select * into option_row from product_options where business_id=bid and product_id=p.id and group_id=group_row.id and (case when coalesce(choice->>'optionId','')<>'' then id=choice->>'optionId' else name=choice->>'optionName' end);
   if group_row.id is null or option_row.id is null or (group_row.id||':'||option_row.id)=any(chosen) then raise exception 'گزینه معتبر نیست یا تکراری است';end if;
   chosen=array_append(chosen,group_row.id||':'||option_row.id);extra=extra+option_row.extra_price_toman;
   insert into order_item_options values(bid,itemid||'-option-'||xi,itemid,option_row.id,group_row.id,group_row.title,option_row.name,option_row.extra_price_toman,xi);xi=xi+1;
  end loop;
  for group_row in select * from product_option_groups where business_id=bid and product_id=p.id loop
   select count(*) into expected from order_item_options where business_id=bid and item_id=itemid and group_id=group_row.id;
   if expected not between group_row.min_select and group_row.max_select then raise exception 'گزینه‌های لازم غذا را کامل کن';end if;
  end loop;
  line=(p.price_toman+extra)*qty;total=total+line;update order_items set line_total_toman=line where business_id=bid and id=itemid;
  if idx=0 then update orders set menu_id_snapshot=p.menu_id where business_id=bid and id=oid;end if;idx=idx+1;
 end loop;
 select settings->'billing' into bill from businesses where id=bid;
 quote=public.mizato_invoice_quote(bill,total);
 update orders set total_toman=(quote->>'totalAmount')::bigint,subtotal_toman=total,
 tax_toman=(quote->>'taxAmount')::bigint,service_toman=(quote->>'serviceAmount')::bigint,
 charge_lines_snapshot=quote->'charges',
 billing_rules_snapshot=coalesce(bill,'{"taxBps":0,"fees":[]}'::jsonb)
 where business_id=bid and id=oid;
 insert into order_events(business_id,id,order_id,sequence,actor_type,actor_id,action,after_version) values(bid,gen_random_uuid()::text,oid,1,'guest',g.id,'created',1);
 return jsonb_build_object('status',200,'data',order_dto(bid,oid));
end $function$;

CREATE OR REPLACE FUNCTION public.order_dto(bid text, oid text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
 select jsonb_build_object('id',o.id,'businessId',o.business_id,'menuId',o.menu_id_snapshot,'sessionId',o.session_id,'servicePointId',o.service_point_id,'version',o.version,'tableNumber',p.table_number,'orderNumber',o.number,'deliveredBy',(select split_part(s.name,' ',1) from order_events ev join mizato_staff s on s.business_id=ev.business_id and s.user_id::text=ev.actor_id where ev.business_id=o.business_id and ev.order_id=o.id and ev.action='deliver' order by ev.created_at desc limit 1),
 'invoice',jsonb_build_object('subtotalAmount',o.subtotal_toman,'taxAmount',o.tax_toman,'serviceAmount',o.service_toman,'charges',o.charge_lines_snapshot,'totalAmount',o.total_toman),
 'customerName',o.customer_name,'customerNotes',o.customer_note,'totalAmount',o.total_toman,'status',o.status,'restaurantConfirmed',o.restaurant_confirmed,
 'paymentStatus',case when exists(select 1 from order_payment_entries where business_id=bid and order_id=oid) and order_ledger_total(bid,oid)>=o.total_toman then 'paid_cash' else 'unpaid' end,
 'deliveryStatus',case when o.status='delivered' then 'delivered' else 'pending' end,'createdAt',o.created_at,'updatedAt',o.updated_at,'kitchenReceivedAt',(select min(e.created_at) from order_events e where e.business_id=o.business_id and e.order_id=o.id and e.action='send'),
 'items',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'productId',i.product_id_snapshot,'productName',i.name_snapshot,'menuId',i.menu_id_snapshot,'unitPriceSnapshot',i.unit_price_toman,'quantity',i.quantity,'notes',i.note,'waiterNotes',i.waiter_note,'itemTotal',i.line_total_toman,'deliveryStatus',case when i.delivered_quantity=i.quantity then 'delivered' else 'pending' end,
 'selectedOptions',coalesce((select jsonb_agg(jsonb_build_object('groupId',x.group_id,'optionId',x.option_id,'groupTitle',x.group_snapshot,'optionName',x.name_snapshot,'extraPrice',x.extra_price_toman) order by x.sort_order) from order_item_options x where x.business_id=bid and x.item_id=i.id),'[]')) order by i.sort_order,i.id) from order_items i where i.business_id=bid and i.order_id=oid),'[]'))
 from orders o join service_points p on p.business_id=o.business_id and p.id=o.service_point_id where o.business_id=bid and o.id=oid;
$function$;

CREATE OR REPLACE FUNCTION public.order_action(bid text, oid text, uid uuid, body jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare o orders;command_key text=body->>'idempotencyKey';fingerprint text=md5(body::text);cmd order_commands;act text=body->>'action';actor_role text=access_role(uid,bid);amount bigint;v jsonb;subtotal bigint;quote jsonb;
begin
 if (act in ('start','confirm') and actor_role is distinct from 'kitchen') or (act in ('send','deliver','remove','note') and actor_role is distinct from 'waiter') then raise exception 'مجوز این عملیات را ندارید';end if;
 select * into o from orders where business_id=bid and id=oid for update;if o.id is null then raise exception 'سفارش پیدا نشد';end if;
 if length(coalesce(command_key,'')) not between 10 and 100 or body->>'expectedVersion' is null then raise exception 'شناسه درخواست و نسخه سفارش لازم است؛ صفحه را تازه کن';end if;
 select * into cmd from order_commands where business_id=bid and order_id=oid and order_commands.key=command_key;
 if cmd.key is not null then if cmd.request_hash<>fingerprint then raise exception 'CONFLICT: محتوای فرمان تغییر کرده است';end if;return jsonb_build_object('status',200,'data',cmd.result);end if;
 if o.version<>(body->>'expectedVersion')::bigint then raise exception 'CONFLICT: سفارش تغییر کرده است؛ دوباره بررسی کن';end if;
 if o.status in ('delivered','cancelled') then raise exception 'سفارش بسته شده است';end if;amount=order_ledger_total(bid,oid);
 if act='send' then
  if o.status<>'pending_waiter' or not exists(select 1 from order_items where business_id=bid and order_id=oid) then raise exception 'سفارش قابل ارسال نیست';end if;
  insert into order_payment_entries(business_id,id,order_id,kind,amount_toman,actor_id,idempotency_key) values(bid,gen_random_uuid()::text,oid,'receipt',greatest(0,o.total_toman-amount),uid,command_key);
  update orders set status='cooking',restaurant_confirmed=false where business_id=bid and id=oid;
 elsif act='start' then
  if o.status<>'cooking' or o.restaurant_confirmed or amount<o.total_toman then raise exception 'شروع آماده‌سازی فقط پس از تأیید گارسون و تسویه مجاز است';end if;
  update orders set restaurant_confirmed=true where business_id=bid and id=oid;
 elsif act='confirm' then
  if o.status<>'cooking' or not o.restaurant_confirmed or amount<o.total_toman then raise exception 'ابتدا سفارش را تأیید کن و آماده‌سازی را شروع کن';end if;
  update order_items set kitchen_status='ready' where business_id=bid and order_id=oid;update orders set status='ready',restaurant_confirmed=true where business_id=bid and id=oid;
 elsif act='deliver' then
  if o.status<>'ready' or not o.restaurant_confirmed or amount<o.total_toman or exists(select 1 from order_items where business_id=bid and order_id=oid and kitchen_status<>'ready') then raise exception 'ابتدا تأیید آشپزخانه و تسویه لازم است';end if;
  update order_items set delivered_quantity=quantity,kitchen_status='delivered' where business_id=bid and order_id=oid;update orders set status='delivered' where business_id=bid and id=oid;
 elsif act in ('remove','note') then
  if o.status<>'pending_waiter' or exists(select 1 from order_payment_entries where business_id=bid and order_id=oid) then raise exception 'ویرایش عادی فقط قبل از دریافت وجه مجاز است';end if;
  perform 1 from order_items where business_id=bid and order_id=oid and id=body->>'itemId';if not found then raise exception 'آیتم پیدا نشد';end if;
  if act='remove' then delete from order_item_options where business_id=bid and item_id=body->>'itemId';delete from order_items where business_id=bid and order_id=oid and id=body->>'itemId';
   select coalesce(sum(line_total_toman),0) into subtotal from order_items where business_id=bid and order_id=oid;
   quote=public.mizato_invoice_quote(o.billing_rules_snapshot,subtotal);
   update orders set subtotal_toman=subtotal,total_toman=(quote->>'totalAmount')::bigint,
    tax_toman=(quote->>'taxAmount')::bigint,service_toman=(quote->>'serviceAmount')::bigint,
    charge_lines_snapshot=quote->'charges',
    status=case when exists(select 1 from order_items where business_id=bid and order_id=oid) then 'pending_waiter' else 'cancelled' end
   where business_id=bid and id=oid;
  else update order_items set waiter_note=left(coalesce(body->>'note',''),500) where business_id=bid and order_id=oid and id=body->>'itemId';end if;
 else raise exception 'عملیات معتبر نیست';end if;
 update orders set version=version+1,updated_at=now() where business_id=bid and id=oid;
 insert into order_events(business_id,id,order_id,sequence,actor_type,actor_id,action,before_version,after_version,data) values(bid,gen_random_uuid()::text,oid,o.version+1,'staff',uid::text,act,o.version,o.version+1,jsonb_build_object('itemId',body->>'itemId'));
 v=order_dto(bid,oid);if actor_role='kitchen' then v=access_kitchen_order(v);end if;
 insert into order_commands(business_id,order_id,key,request_hash,result) values(bid,oid,command_key,fingerprint,v);
 return jsonb_build_object('status',200,'data',v);
end $function$;

CREATE OR REPLACE FUNCTION public.point_resolve(body jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare bid text;pid text;mid text;available jsonb;s jsonb;chosen jsonb;
begin
 if coalesce(body->>'q','')<>'' then select q.business_id,q.service_point_id into bid,pid from qr_links q where token=body->>'q' and enabled;
 else bid=body->>'business';select id into pid from service_points where business_id=bid and table_number=(body->>'table')::integer;end if;
 if pid is null or not exists(select 1 from service_points p join businesses b on b.id=p.business_id where p.business_id=bid and p.id=pid and p.status='active' and b.status='active') then return jsonb_build_object('status',404,'data',jsonb_build_object('error','این کد یا سرویس‌پوینت فعال نیست','code','POINT_UNAVAILABLE'));end if;
 select coalesce(jsonb_agg(catalog_menu(bid,m.id) order by m.sort_order,m.id),'[]') into available from menus m where m.business_id=bid and point_menu_allowed(bid,pid,m.id);
 -- Legacy menu query is deliberately ignored. New requests may select only an allowed tab.
 mid=coalesce((select x->>'id' from jsonb_array_elements(available)x where x->>'id'=body->>'tab'),available#>>'{0,id}');
 s=(select jsonb_build_object('business',jsonb_build_object(
 'id',b.id,'name',b.name,'kind',b.kind_code,'timezone',b.timezone,
 'slug',b.settings->>'slug','branchName',b.settings->>'branchName',
 'branchCode',b.settings->>'branchCode','phone',b.settings->>'phone',
 'address',b.settings->>'address',
 'orderAcceptanceActive',coalesce((b.settings->>'orderAcceptanceActive')::boolean,true),
 'activeTemplate',b.settings->>'activeTemplate','billing',coalesce(b.settings->'billing','{"taxBps":0,"fees":[]}'::jsonb),'updatedAt',b.updated_at)) from businesses b where b.id=bid);chosen=case when mid is null then '{}'::jsonb else catalog_menu(bid,mid)->'appearance' end;
 return jsonb_build_object('status',200,'data',jsonb_build_object('business',(s->'business')||chosen,'menus',available,'activeMenuId',mid,'servicePoint',point_dto(bid,pid)-array['activeSession','menuIds','qrToken','qrCodeUrl','version','isOccupied'],'servicePoints',jsonb_build_array(point_dto(bid,pid)-array['activeSession','menuIds','qrToken','qrCodeUrl','version','isOccupied']),
 'products',coalesce((select jsonb_agg(catalog_product(bid,id) order by sort_order,id) from products where business_id=bid and menu_id=mid and status='active'),'[]'),
 'categories',coalesce((select jsonb_agg(jsonb_build_object('id',id,'menuId',menu_id,'name',title) order by sort_order,id) from categories where business_id=bid and menu_id=mid),'[]'),
 'orders','[]'::jsonb,'serviceCalls','[]'::jsonb,'message',case when mid is null then 'در این ساعت منویی برای این بخش فعال نیست؛ با مسئول مجموعه تماس بگیر.' end));
end $function$;

CREATE OR REPLACE FUNCTION public.catalog_api(p_path text, p_method text, p_body jsonb DEFAULT '{}'::jsonb, p_uid uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare a record; bid text; mid text; rid text; v jsonb; s jsonb; c jsonb; p jsonb; ap jsonb; old menus; existing catalog_commands;
 key uuid; fingerprint text; idx integer=0; count_items integer=0; lim integer; cid text;
begin
 select user_id,active_business_id business_id,status='blocked' is_banned into a from profiles where user_id=p_uid;
 if coalesce(a.is_banned,false) then return jsonb_build_object('status',403,'data',jsonb_build_object('error','حساب مسدود است','code','ACCOUNT_BANNED'));end if;
 if p_path='/public/menu' and p_method='GET' then
  bid=coalesce(p_body->>'business','pich-shemroon');mid=coalesce(p_body->>'menu','main');s=(select jsonb_build_object('business',jsonb_build_object(
 'id',b.id,'name',b.name,'kind',b.kind_code,'timezone',b.timezone,
 'slug',b.settings->>'slug','branchName',b.settings->>'branchName',
 'branchCode',b.settings->>'branchCode','phone',b.settings->>'phone',
 'address',b.settings->>'address',
 'orderAcceptanceActive',coalesce((b.settings->>'orderAcceptanceActive')::boolean,true),
 'activeTemplate',b.settings->>'activeTemplate','billing',coalesce(b.settings->'billing','{"taxBps":0,"fees":[]}'::jsonb),'updatedAt',b.updated_at)) from businesses b where b.id=bid and b.status='active');
  if not exists(select 1 from menus where business_id=bid and id=mid and status='published') then return jsonb_build_object('status',404,'data',jsonb_build_object('error','منو منتشر نشده است'));end if;
  s=jsonb_build_object('business',(s->'business')||(catalog_menu(bid,mid)->'appearance'),'menus',(select coalesce(jsonb_agg(catalog_menu(bid,id) order by sort_order,id),'[]') from menus where business_id=bid and status='published'),
   'categories',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'menuId',menu_id,'name',title,'sortOrder',sort_order) order by sort_order,id),'[]') from categories where business_id=bid and menu_id=mid),
   'products',(select coalesce(jsonb_agg(catalog_product(bid,id) order by sort_order,id),'[]') from products where business_id=bid and menu_id=mid and status='active'),
   'servicePoints',(select coalesce(jsonb_agg(point_dto(bid,id)-array['activeSession','menuIds','qrToken','qrCodeUrl','version','isOccupied'] order by table_number),'[]'::jsonb) from service_points where business_id=bid and status='active'),'orders','[]'::jsonb,'serviceCalls','[]'::jsonb,'catalogVersion',1);
  return jsonb_build_object('status',200,'data',s);
 end if;
 if a.user_id is null then return jsonb_build_object('status',401,'data',jsonb_build_object('error','ابتدا وارد حساب شو'));end if;
 bid=a.business_id;
 perform 1 from businesses where id=bid for update;
 if not found then raise exception 'کاتالوگ مجموعه منتقل نشده است';end if;
 if p_path='/business' and p_body ? 'websiteContent' then raise exception 'محتوای سایت را از پنل ادمین تنظیم کن';end if;
 if p_path='/workspace' and p_method='GET' then v=catalog_workspace_snapshot(bid);
 elsif p_path='/catalog/capabilities' and p_method='GET' then
  lim=catalog_limit(bid);v=jsonb_build_object('catalogVersion',1,'productLimit',lim,'products',(select count(*) from products where business_id=bid and status='active'),'menuLimit',30);
 elsif p_path='/menus/build' and p_method='POST' then
  key=(p_body->>'requestId')::uuid;if key is null then raise exception 'شناسه درخواست لازم است';end if;
  fingerprint=md5((p_body-'requestId')::text);select * into existing from catalog_commands where business_id=bid and request_id=key;
  if found then
   if existing.request_hash<>fingerprint then raise exception 'CONFLICT: درخواست با همان شناسه تغییر کرده است';end if;
   return jsonb_build_object('status',200,'data',existing.result);
  end if;
  if jsonb_typeof(p_body->'categories') is distinct from 'array' or jsonb_array_length(p_body->'categories') not between 1 and 100 then raise exception 'دسته‌ها را کامل کن';end if;
  mid=coalesce(nullif(p_body->>'menuId',''),'menu-'||gen_random_uuid());
  if p_body ? 'menuId' then
   if not exists(select 1 from menus where business_id=bid and id=mid and status<>'archived') or exists(select 1 from products where business_id=bid and menu_id=mid) or exists(select 1 from categories where business_id=bid and menu_id=mid) then raise exception 'این منو خالی نیست؛ دوباره بارگذاری کن';end if;
   update menus set title=trim(p_body->>'name'),kind_code=p_body->>'kind',version=version+1,updated_at=now() where business_id=bid and id=mid;
  else
   if (select count(*) from menus where business_id=bid and status<>'archived')>=30 then raise exception 'سقف تعداد منو رسیده است';end if;
   insert into menus(business_id,id,title,kind_code,sort_order) values(bid,mid,trim(p_body->>'name'),p_body->>'kind',(select count(*) from menus where business_id=bid));
   insert into menu_appearance(business_id,menu_id) values(bid,mid);
  end if;
  for c in select value from jsonb_array_elements(p_body->'categories') loop
   cid=coalesce(nullif(c->>'id',''),'cat-'||gen_random_uuid());
   if jsonb_typeof(c->'items') is distinct from 'array' or jsonb_array_length(c->'items')>200 then raise exception 'آیتم‌های دسته معتبر نیست';end if;
   insert into categories values(bid,mid,cid,trim(c->>'name'),idx);idx=idx+1;
   for p in select value from jsonb_array_elements(c->'items') loop
    perform catalog_put_product(bid,'prod-'||gen_random_uuid(),p||jsonb_build_object('menuId',mid,'categoryId',cid));count_items=count_items+1;
   end loop;
  end loop;
  v=jsonb_build_object('menu',catalog_menu(bid,mid),'productsCreated',count_items);
  insert into catalog_commands values(bid,key,fingerprint,v,now());
 elsif p_path='/menus' and p_method='POST' then
  if (select count(*) from menus where business_id=bid and status<>'archived')>=30 then raise exception 'سقف تعداد منو رسیده است';end if;
  if p_body ? 'requestId' then
   key=(p_body->>'requestId')::uuid;fingerprint=md5((p_body-'requestId')::text);select * into existing from catalog_commands where business_id=bid and request_id=key;
   if found then if existing.request_hash<>fingerprint then raise exception 'CONFLICT: شناسه درخواست تکراری است';end if;return jsonb_build_object('status',200,'data',existing.result);end if;
  end if;
  mid='menu-'||gen_random_uuid();insert into menus(business_id,id,title,kind_code,sort_order) values(bid,mid,trim(p_body->>'name'),coalesce(p_body->>'kind','restaurant'),(select count(*) from menus where business_id=bid));
  insert into menu_appearance(business_id,menu_id) values(bid,mid);v=catalog_menu(bid,mid);
  if key is not null then insert into catalog_commands values(bid,key,fingerprint,v,now());end if;
 elsif p_path like '/menus/%' and p_method='PATCH' then
  mid=split_part(p_path,'/',3);select * into old from menus where business_id=bid and id=mid;if not found then raise exception 'منو پیدا نشد';end if;
  if p_body ? 'expectedVersion' and (p_body->>'expectedVersion')::bigint<>old.version then raise exception 'CONFLICT: منو تغییر کرده است';end if;
  if p_body ? 'appearance' then
   ap=p_body->'appearance';
   if coalesce(ap->>'menuBackgroundImage','')<>'' and not exists(select 1 from media_assets where business_id=bid and url=ap->>'menuBackgroundImage') then raise exception 'تصویر پس‌زمینه متعلق به مجموعه نیست';end if;
   update menu_appearance set palette_key=coalesce(ap->>'menuPalette',palette_key),paper_key=coalesce((ap->>'menuPaper')::integer,paper_key),background_url=coalesce(ap->>'menuBackgroundImage',background_url),version=version+1 where business_id=bid and menu_id=mid;
  end if;
  update menus set title=coalesce(trim(p_body->>'name'),title),kind_code=coalesce(p_body->>'kind',kind_code),status=case when p_body ? 'published' then case when p_body->'published'='true' then 'published' else 'draft' end else status end,version=version+1,updated_at=now() where business_id=bid and id=mid;
  v=catalog_menu(bid,mid);
 elsif p_path='/categories' and p_method='POST' then
  mid=p_body->>'menuId';cid='cat-'||gen_random_uuid();insert into categories values(bid,mid,cid,trim(p_body->>'name'),(select count(*) from categories where business_id=bid and menu_id=mid));
  v=jsonb_build_object('id',cid,'menuId',mid,'name',trim(p_body->>'name'));
 elsif p_path like '/categories/%' and p_method='PATCH' then
  cid=split_part(p_path,'/',3);mid=p_body->>'menuId';update categories set title=trim(p_body->>'name') where business_id=bid and menu_id=mid and id=cid;
  if not found then raise exception 'دسته پیدا نشد';end if;v=jsonb_build_object('id',cid,'menuId',mid,'name',trim(p_body->>'name'));
 elsif p_path='/products' and p_method='POST' then v=catalog_put_product(bid,'prod-'||gen_random_uuid(),p_body);
 elsif p_path like '/products/%' and p_method='PATCH' then
  rid=split_part(p_path,'/',3);if catalog_product(bid,rid) is null then raise exception 'محصول پیدا نشد';end if;v=catalog_put_product(bid,rid,p_body);
 elsif p_path like '/products/%' and p_method='DELETE' then
 -- PRODUCT_ARCHIVE_V1
 rid=split_part(p_path,'/',3);
 if p_body ? 'expectedVersion' and exists(select 1 from products where business_id=bid and id=rid and status='active' and version<>(p_body->>'expectedVersion')::bigint) then raise exception 'CONFLICT: آیتم تغییر کرده؛ دوباره بررسی کن';end if;
 update products set status='archived',is_available=false,version=version+1,updated_at=now() where business_id=bid and id=rid;
 if not found then raise exception 'آیتم پیدا نشد';end if;
 v=jsonb_build_object('id',rid,'archived',true);
 elsif p_path like '/products/%/restore' and p_method='POST' then
 rid=split_part(p_path,'/',3);lim=catalog_limit(bid);
 if lim is not null and (select count(*) from products where business_id=bid and status='active')>=lim then raise exception 'PLAN_LIMIT: به سقف آیتم‌های اشتراک رسیده‌ای';end if;
 update products set status='active',version=version+1,updated_at=now() where business_id=bid and id=rid and status='archived';
 if not found then raise exception 'آیتم حذف‌شده پیدا نشد';end if;
 v=catalog_product(bid,rid);
 elsif p_path='/business' and p_method='PATCH' then
  if p_body ? 'name' then update businesses set name=trim(p_body->>'name') where id=bid;end if;
  update businesses set settings=settings||(p_body-array['id','name','slug','menuPalette','menuPaper','menuBackgroundImage','role','businessId']),version=version+1,updated_at=now() where id=bid;
  v=catalog_workspace_snapshot(bid)->'business';
 else return jsonb_build_object('status',404,'data',jsonb_build_object('error','مسیر کاتالوگ معتبر نیست'));end if;
 return jsonb_build_object('status',200,'data',v);
exception when others then
 return jsonb_build_object('status',case when sqlerrm like 'CONFLICT:%' or sqlerrm like 'PLAN_LIMIT:%' then 409 else 400 end,'data',jsonb_build_object('error',case when sqlstate='P0001' then sqlerrm else 'داده نامعتبر است؛ نام، دسته و قیمت را بررسی کن' end,'code',case when sqlerrm like 'CONFLICT:%' then 'CONFLICT' when sqlerrm like 'PLAN_LIMIT:%' then 'PLAN_LIMIT' else 'CATALOG_INVALID' end));
end $function$;
