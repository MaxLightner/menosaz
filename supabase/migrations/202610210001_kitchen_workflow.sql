-- Two-phase kitchen workflow and staff QR access. Non-destructive; retains existing order history.
begin;

-- mizato_staff_allowed
CREATE OR REPLACE FUNCTION public.mizato_staff_allowed(bid text, raw_phone text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
 select exists(select 1 from mizato_staff where business_id=bid and phone=mizato_phone(raw_phone) and role='waiter' and status='active') or exists(select 1 from business_memberships m join auth.users u on u.id=m.user_id where m.business_id=bid and m.role='kitchen' and m.status='active' and u.phone_confirmed_at is not null and replace(u.phone,'+','')=mizato_phone(raw_phone))
 and exists(select 1 from businesses where id=bid and status='active');
$function$;

-- mizato_staff_claim
CREATE OR REPLACE FUNCTION public.mizato_staff_claim(p_uid uuid, p_phone text, p_business text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare staff mizato_staff; existing_role text; real_phone text;
begin
 select replace(phone,'+','') into real_phone from auth.users where id=p_uid and phone_confirmed_at is not null;
 if real_phone is null or real_phone<>mizato_phone(p_phone) then raise exception 'شماره تأییدشده با حساب مطابقت ندارد';end if;
 existing_role=access_role(p_uid,p_business);
 if existing_role='kitchen' then
  update profiles set active_business_id=p_business,updated_at=now() where user_id=p_uid;
  return jsonb_build_object('ok',true,'role','kitchen');
 end if;
 select * into staff from mizato_staff where business_id=p_business and phone=real_phone and role='waiter' and status='active' for update;
 if not found then raise exception 'این شماره در فهرست گارسون‌های فعال رستوران ثبت نشده است';end if;
 existing_role=access_role(p_uid,p_business);
 if existing_role is not null and existing_role<>'waiter' then raise exception 'این حساب قبلاً با نقش دیگری تعریف شده است';end if;
 insert into profiles(user_id,display_name,active_business_id,profile_completed)
 values(p_uid,staff.name,p_business,true)
 on conflict(user_id) do update set
  active_business_id=excluded.active_business_id,profile_completed=true,
  display_name=case when profiles.display_name='' then excluded.display_name else profiles.display_name end;
 insert into business_memberships(business_id,user_id,role,status)
 values(p_business,p_uid,'waiter','active')
 on conflict(business_id,user_id) do update set role='waiter',status='active',updated_at=now();
 update mizato_staff set user_id=p_uid,updated_at=now() where business_id=p_business and phone=real_phone;
 return jsonb_build_object('ok',true,'name',staff.name);
end $function$;

-- access_authorize
CREATE OR REPLACE FUNCTION public.access_authorize(p_path text, p_method text, p_body jsonb, p_uid uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare p profiles; bid text; r text; admin boolean;
begin
 if p_path='/auth/logout' then return jsonb_build_object('allowed',true);end if;
 if p_uid is not null then
  select * into p from profiles where user_id=p_uid;
  if p.status='blocked' then return jsonb_build_object('allowed',false,'status',403,'error','حساب شما مسدود شده است؛ با پشتیبانی تماس بگیر','code','ACCOUNT_BANNED');end if;
 end if;
 if p_path in ('/public/content','/health','/public/menu','/public/feed','/public/resolve','/sessions/open','/sessions/status','/order-status','/presence') or (p_path in ('/orders','/calls') and p_method='POST') then
  if p_path in ('/orders','/calls') and exists(select 1 from businesses where id=p_body->>'businessId' and status<>'active') then return jsonb_build_object('allowed',false,'status',403,'error','این مجموعه فعلاً سفارش نمی‌پذیرد');end if;
  return jsonb_build_object('allowed',true);
 end if;
 if p_uid is null then return jsonb_build_object('allowed',false,'status',401,'error','ابتدا وارد حساب شو');end if;
 if p_path in ('/account','/register','/auth/me','/auth/register','/profile','/access/business') then return jsonb_build_object('allowed',true);end if;
 select exists(select 1 from platform_roles where user_id=p_uid and role='admin') into admin;
 if p_path like '/admin/%' then return jsonb_build_object('allowed',admin,'status',403,'error','دسترسی ادمین لازم است');end if;
 bid=p.active_business_id;r=access_role(p_uid,bid);
 if r is null then return jsonb_build_object('allowed',false,'status',403,'error','عضویت فعال در این مجموعه لازم است','code','MEMBERSHIP_REQUIRED');end if;
 if p_path like '/access/members%' then return jsonb_build_object('allowed',r='owner','status',403,'error','فقط مالک می‌تواند دسترسی کارکنان را تنظیم کند');end if;
 if p_path like '/orders/%/action' then
  return jsonb_build_object('allowed',case when p_body->>'action' in ('start','confirm') then r='kitchen' when p_body->>'action' in ('send','deliver','remove','note') then r='waiter' else false end,'status',403,'error','این عملیات فقط برای نقش مسئول آن مجاز است');
 end if;
 if p_path='/workspace' and p_method='GET' then return jsonb_build_object('allowed',true);end if;
 if p_path like '/sessions/%/close' or p_path like '/sessions/%/remind' then return jsonb_build_object('allowed',r in ('owner','manager','waiter'),'status',403,'error','دسترسی سالن لازم است');end if;if p_path like '/calls/%' or p_path like '/tables/%' then return jsonb_build_object('allowed',r in ('owner','manager','waiter'),'status',403,'error','دسترسی سالن لازم است');end if;
 return jsonb_build_object('allowed',r in ('owner','manager'),'status',403,'error','دسترسی مدیریت مجموعه لازم است');
end $function$;

-- order_dto
CREATE OR REPLACE FUNCTION public.order_dto(bid text, oid text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
 select jsonb_build_object('id',o.id,'businessId',o.business_id,'menuId',o.menu_id_snapshot,'sessionId',o.session_id,'servicePointId',o.service_point_id,'version',o.version,'tableNumber',p.table_number,'orderNumber',o.number,'deliveredBy',(select split_part(s.name,' ',1) from order_events ev join mizato_staff s on s.business_id=ev.business_id and s.user_id::text=ev.actor_id where ev.business_id=o.business_id and ev.order_id=o.id and ev.action='deliver' order by ev.created_at desc limit 1),
 'customerName',o.customer_name,'customerNotes',o.customer_note,'totalAmount',o.total_toman,'status',o.status,'restaurantConfirmed',o.restaurant_confirmed,
 'paymentStatus',case when exists(select 1 from order_payment_entries where business_id=bid and order_id=oid) and order_ledger_total(bid,oid)>=o.total_toman then 'paid_cash' else 'unpaid' end,
 'deliveryStatus',case when o.status='delivered' then 'delivered' else 'pending' end,'createdAt',o.created_at,'updatedAt',o.updated_at,'kitchenReceivedAt',(select min(e.created_at) from order_events e where e.business_id=o.business_id and e.order_id=o.id and e.action='send'),
 'items',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'productId',i.product_id_snapshot,'productName',i.name_snapshot,'menuId',i.menu_id_snapshot,'unitPriceSnapshot',i.unit_price_toman,'quantity',i.quantity,'notes',i.note,'waiterNotes',i.waiter_note,'itemTotal',i.line_total_toman,'deliveryStatus',case when i.delivered_quantity=i.quantity then 'delivered' else 'pending' end,
 'selectedOptions',coalesce((select jsonb_agg(jsonb_build_object('groupId',x.group_id,'optionId',x.option_id,'groupTitle',x.group_snapshot,'optionName',x.name_snapshot,'extraPrice',x.extra_price_toman) order by x.sort_order) from order_item_options x where x.business_id=bid and x.item_id=i.id),'[]')) order by i.sort_order,i.id) from order_items i where i.business_id=bid and i.order_id=oid),'[]'))
 from orders o join service_points p on p.business_id=o.business_id and p.id=o.service_point_id where o.business_id=bid and o.id=oid;
$function$;

-- access_kitchen_order
CREATE OR REPLACE FUNCTION public.access_kitchen_order(o jsonb)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
 select jsonb_build_object('id',o->>'id','version',o->'version','businessId',o->>'businessId','tableNumber',o->'tableNumber','orderNumber',o->>'orderNumber','customerNotes',o->>'customerNotes','status',o->>'status','deliveryStatus',o->>'deliveryStatus','restaurantConfirmed',o->'restaurantConfirmed','createdAt',o->>'createdAt','updatedAt',o->>'updatedAt','kitchenReceivedAt',o->>'kitchenReceivedAt','paymentStatus',o->>'paymentStatus','items',(select jsonb_agg(jsonb_build_object('id',i->>'id','productId',i->>'productId','productName',i->>'productName','quantity',i->'quantity','selectedOptions',(select coalesce(jsonb_agg(x-'extraPrice'),'[]') from jsonb_array_elements(coalesce(i->'selectedOptions','[]'))x),'notes',i->>'notes','waiterNotes',i->>'waiterNotes','deliveryStatus',i->>'deliveryStatus')) from jsonb_array_elements(o->'items')i));
$function$;

-- order_action
CREATE OR REPLACE FUNCTION public.order_action(bid text, oid text, uid uuid, body jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare o orders;command_key text=body->>'idempotencyKey';fingerprint text=md5(body::text);cmd order_commands;act text=body->>'action';actor_role text=access_role(uid,bid);amount bigint;v jsonb;
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
   update orders set total_toman=(select coalesce(sum(line_total_toman),0) from order_items where business_id=bid and order_id=oid),status=case when exists(select 1 from order_items where business_id=bid and order_id=oid) then 'pending_waiter' else 'cancelled' end where business_id=bid and id=oid;
  else update order_items set waiter_note=left(coalesce(body->>'note',''),500) where business_id=bid and order_id=oid and id=body->>'itemId';end if;
 else raise exception 'عملیات معتبر نیست';end if;
 update orders set version=version+1,updated_at=now() where business_id=bid and id=oid;
 insert into order_events(business_id,id,order_id,sequence,actor_type,actor_id,action,before_version,after_version,data) values(bid,gen_random_uuid()::text,oid,o.version+1,'staff',uid::text,act,o.version,o.version+1,jsonb_build_object('itemId',body->>'itemId'));
 v=order_dto(bid,oid);if actor_role='kitchen' then v=access_kitchen_order(v);end if;
 insert into order_commands(business_id,order_id,key,request_hash,result) values(bid,oid,command_key,fingerprint,v);
 return jsonb_build_object('status',200,'data',v);
end $function$;

commit;
