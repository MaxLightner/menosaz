-- Bound staff history and prevent occupancy disclosure through public menus.
begin;
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
  bid=coalesce(p_body->>'business','pich-shemroon');mid=coalesce(p_body->>'menu','main');s=(select jsonb_build_object('business',b.settings||jsonb_build_object('id',b.id,'name',b.name,'kind',b.kind_code,'timezone',b.timezone,'version',b.version,'updatedAt',b.updated_at)) from businesses b where b.id=bid and b.status='active');
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
 s=(select jsonb_build_object('business',b.settings||jsonb_build_object('id',b.id,'name',b.name,'kind',b.kind_code,'timezone',b.timezone,'version',b.version,'updatedAt',b.updated_at)) from businesses b where b.id=bid);chosen=case when mid is null then '{}'::jsonb else catalog_menu(bid,mid)->'appearance' end;
 return jsonb_build_object('status',200,'data',jsonb_build_object('business',(s->'business')||chosen,'menus',available,'activeMenuId',mid,'servicePoint',point_dto(bid,pid)-array['activeSession','menuIds','qrToken','qrCodeUrl','version','isOccupied'],'servicePoints',jsonb_build_array(point_dto(bid,pid)-array['activeSession','menuIds','qrToken','qrCodeUrl','version','isOccupied']),
 'products',coalesce((select jsonb_agg(catalog_product(bid,id) order by sort_order,id) from products where business_id=bid and menu_id=mid and status='active'),'[]'),
 'categories',coalesce((select jsonb_agg(jsonb_build_object('id',id,'menuId',menu_id,'name',title) order by sort_order,id) from categories where business_id=bid and menu_id=mid),'[]'),
 'orders','[]'::jsonb,'serviceCalls','[]'::jsonb,'message',case when mid is null then 'در این ساعت منویی برای این بخش فعال نیست؛ با مسئول مجموعه تماس بگیر.' end));
end $function$;

CREATE OR REPLACE FUNCTION public.order_api(p_path text, p_method text, p_body jsonb, p_uid uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare bid text;sid text;pid text;rid text;g session_guests;v jsonb;grant_row jsonb;o orders;
begin
 select active_business_id into bid from profiles where user_id=p_uid;
 if p_path='/sessions/open' and p_method='POST' then return order_open_session(p_body);
 elsif p_path='/sessions/status' and p_method='POST' then
  bid=p_body->>'businessId';sid=p_body->>'sessionId';g=order_guest(bid,sid,p_body->>'guestToken',false);
  v=jsonb_build_object('status',(select status from service_sessions where business_id=bid and id=sid),'orders',(select coalesce(jsonb_agg(order_dto(bid,id) order by created_at),'[]') from orders where business_id=bid and guest_id=g.id),
   'notices',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'message',message,'createdAt',created_at) order by created_at),'[]') from session_notices where business_id=bid and session_id=sid and created_at>=g.created_at));
 elsif p_path='/sessions/report' and p_method='GET' then
  if coalesce(access_role(p_uid,bid),'') not in ('owner','manager') then raise exception 'دسترسی مدیریت لازم است';end if;
  select coalesce(jsonb_agg(x),'[]') into v from(select ss.id,p.label,ss.opened_at as "openedAt",ss.closed_at as "closedAt",ss.status,floor(extract(epoch from coalesce(ss.closed_at,now())-ss.opened_at)) as "durationSeconds",ss.source from service_sessions ss join service_points p on p.business_id=ss.business_id and p.id=ss.service_point_id where ss.business_id=bid order by ss.opened_at desc limit 100)x;
 elsif p_path like '/sessions/%/remind' and p_method='POST' then
  if coalesce(access_role(p_uid,bid),'') not in ('owner','manager','waiter') then raise exception 'دسترسی سالن لازم است';end if;sid=split_part(p_path,'/',3);
  perform 1 from service_sessions where business_id=bid and id=sid and status='open' for update;if not found then raise exception 'نشست باز پیدا نشد';end if;
  select id into rid from session_notices where business_id=bid and session_id=sid and created_at>now()-interval '10 minutes' order by created_at desc limit 1;
  if rid is null then rid=gen_random_uuid()::text;insert into session_notices values(bid,rid,sid,p_uid,'اگر میل دارید، می‌توانید سفارش تازه‌ای از منو ثبت کنید.',now());end if;v=jsonb_build_object('ok',true,'id',rid);
 elsif p_path='/orders/history' and p_method='GET' then
   if access_role(p_uid,bid) not in ('owner','manager') then raise exception 'دسترسی تاریخچه سفارش فقط برای مدیریت مجاز است';end if;
   if p_body ? 'before' and not p_body ? 'beforeId' then raise exception 'شناسه صفحه‌بندی لازم است';end if;
   select coalesce(jsonb_agg(order_dto(bid,x.id) order by x.created_at desc,x.id desc),'[]'::jsonb) into v
   from (
    select id,created_at from orders
    where business_id=bid and status in ('delivered','cancelled')
    and ((p_body->>'before') is null or (created_at,id)<((p_body->>'before')::timestamptz,p_body->>'beforeId'))
    order by created_at desc,id desc
    limit least(100,greatest(1,coalesce((p_body->>'limit')::integer,50)))
   ) x;
  elsif p_path='/orders' and p_method='POST' then return order_create(p_body);
 elsif p_path like '/orders/%/action' and p_method='POST' then return order_action(bid,split_part(p_path,'/',3),p_uid,p_body);
 elsif p_path='/order-status' then
  if jsonb_typeof(p_body->'grants') is distinct from 'array' or jsonb_array_length(p_body->'grants')>10 then raise exception 'درخواست پیگیری معتبر نیست';end if;v='[]';
  for grant_row in select value from jsonb_array_elements(p_body->'grants')loop
   select ord.* into o from orders ord join session_guests gg on gg.business_id=ord.business_id and gg.id=ord.guest_id where ord.business_id=grant_row->>'businessId' and ord.id=grant_row->>'id' and gg.token_hash=encode(sha256(convert_to(grant_row->>'token','UTF8')),'hex') and gg.revoked_at is null and gg.expires_at>now();
   if o.id is not null then v=v||jsonb_build_array(order_dto(o.business_id,o.id));end if;
  end loop;
 elsif p_path like '/sessions/%/close' and p_method='POST' then
  if coalesce(access_role(p_uid,bid),'') not in ('owner','manager','waiter') then raise exception 'دسترسی سالن لازم است';end if;sid=split_part(p_path,'/',3);
  select service_point_id into pid from service_sessions where business_id=bid and id=sid for update;if pid is null then raise exception 'نشست پیدا نشد';end if;
  if exists(select 1 from orders where business_id=bid and session_id=sid and status not in ('delivered','cancelled')) or exists(select 1 from service_requests where business_id=bid and session_id=sid and status in ('pending','accepted')) then raise exception 'ابتدا سفارش‌ها و درخواست‌های باز این میز را تعیین تکلیف کن';end if;
  update service_sessions set status='closed',closed_at=coalesce(closed_at,now()),closed_by=coalesce(closed_by,p_uid) where business_id=bid and id=sid;update service_points set is_occupied=false where business_id=bid and id=pid;v=jsonb_build_object('ok',true);
 elsif p_path='/calls' and p_method='POST' then
  bid=p_body->>'businessId';sid=p_body->>'sessionId';g=order_guest(bid,sid,p_body->>'guestToken');select service_point_id into pid from service_sessions where business_id=bid and id=sid and status='open' for update;if pid is null then raise exception 'SESSION_INVALID: نشست بسته شده است';end if;
  if p_body->>'type' is null or p_body->>'type' not in ('waiter','cashier','manager','utensils','custom') then raise exception 'نوع درخواست معتبر نیست';end if;
  if not menu_rate('guest-call-'||g.id,6) then return jsonb_build_object('status',429,'data',jsonb_build_object('error','درخواست قبلی ثبت شده؛ کمی صبر کن'));end if;
  select id into rid from service_requests where business_id=bid and guest_id=g.id and type=p_body->>'type' and status in ('pending','accepted') limit 1;
  if rid is null then rid='call-'||gen_random_uuid();insert into service_requests(business_id,id,session_id,service_point_id,guest_id,type,message) values(bid,rid,sid,pid,g.id,p_body->>'type',left(coalesce(p_body->>'message','درخواست گارسون'),500));end if;v=order_request_dto(bid,rid);
 elsif p_path like '/calls/%' and p_method in ('PATCH','POST') then
  if coalesce(access_role(p_uid,bid),'') not in ('owner','manager','waiter') then raise exception 'دسترسی سالن لازم است';end if;rid=split_part(p_path,'/',3);
  update service_requests set status='resolved',resolved_at=coalesce(resolved_at,now()),assigned_user_id=p_uid where business_id=bid and id=rid;if not found then raise exception 'درخواست پیدا نشد';end if;v=order_request_dto(bid,rid);
 else return null;end if;
 return jsonb_build_object('status',200,'data',v);
exception when others then return jsonb_build_object('status',case when sqlerrm like 'CONFLICT:%' then 409 when sqlerrm like 'SESSION_INVALID:%' then 401 else 400 end,'data',jsonb_build_object('error',case when sqlstate='P0001' then sqlerrm else 'اطلاعات سفارش معتبر نیست' end,'code',case when sqlerrm like 'CONFLICT:%' then 'CONFLICT' when sqlerrm like 'SESSION_INVALID:%' then 'SESSION_INVALID' else 'ORDER_INVALID' end));
end $function$;
create index if not exists mizato_order_items_by_order on public.order_items(business_id,order_id);
create index if not exists mizato_order_item_options_by_item on public.order_item_options(business_id,item_id);
create index if not exists mizato_service_requests_by_session_status on public.service_requests(business_id,session_id,status);
commit;
