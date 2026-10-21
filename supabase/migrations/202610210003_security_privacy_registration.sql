-- Mizato security hardening, non-destructive migration.
begin;

-- catalog_workspace_snapshot
CREATE OR REPLACE FUNCTION public.catalog_workspace_snapshot(bid text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
 select jsonb_build_object('business',b.settings||jsonb_build_object('id',b.id,'name',b.name,'kind',b.kind_code,'timezone',b.timezone,'version',b.version,'updatedAt',b.updated_at),
 'menus',coalesce((select jsonb_agg(catalog_menu(bid,m.id) order by m.sort_order,m.id) from menus m where m.business_id=bid and m.status<>'archived'),'[]'::jsonb),
 'categories',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'menuId',c.menu_id,'name',c.title,'sortOrder',c.sort_order) order by c.sort_order,c.id) from categories c where c.business_id=bid),'[]'::jsonb),
 'products',coalesce((select jsonb_agg(catalog_product(bid,p.id) order by p.sort_order,p.id) from products p where p.business_id=bid and p.status='active'),'[]'::jsonb),'catalogVersion',1,'orders',coalesce((select jsonb_agg(order_dto(bid,id) order by created_at,id) from (select id,created_at from orders where business_id=bid and status not in ('delivered','cancelled') union all select id,created_at from (select id,created_at from orders where business_id=bid and status in ('delivered','cancelled') order by created_at desc,id desc limit 200) history) recent),'[]'::jsonb),'serviceCalls',coalesce((select jsonb_agg(order_request_dto(bid,id) order by created_at,id) from service_requests where business_id=bid),'[]'::jsonb),'servicePoints',coalesce((select jsonb_agg(point_dto(bid,id) order by table_number) from service_points where business_id=bid),'[]'::jsonb))
 from businesses b where b.id=bid
$function$;

-- catalog_api
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
   'servicePoints',(select coalesce(jsonb_agg(point_dto(bid,id)-array['activeSession','menuIds','qrToken','qrCodeUrl','version'] order by table_number),'[]'::jsonb) from service_points where business_id=bid and status='active'),'orders','[]'::jsonb,'serviceCalls','[]'::jsonb,'catalogVersion',1);
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

-- point_resolve
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
 return jsonb_build_object('status',200,'data',jsonb_build_object('business',(s->'business')||chosen,'menus',available,'activeMenuId',mid,'servicePoint',point_dto(bid,pid)-array['activeSession','menuIds','qrToken','qrCodeUrl','version'],'servicePoints',jsonb_build_array(point_dto(bid,pid)-array['activeSession','menuIds','qrToken','qrCodeUrl','version']),
 'products',coalesce((select jsonb_agg(catalog_product(bid,id) order by sort_order,id) from products where business_id=bid and menu_id=mid and status='active'),'[]'),
 'categories',coalesce((select jsonb_agg(jsonb_build_object('id',id,'menuId',menu_id,'name',title) order by sort_order,id) from categories where business_id=bid and menu_id=mid),'[]'),
 'orders','[]'::jsonb,'serviceCalls','[]'::jsonb,'message',case when mid is null then 'در این ساعت منویی برای این بخش فعال نیست؛ با مسئول مجموعه تماس بگیر.' end));
end $function$;

-- order_open_session
CREATE OR REPLACE FUNCTION public.order_open_session(body jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare resolved jsonb;bid text;pid text;s service_sessions;g session_guests;token text=body->>'guestToken';hash text;
begin
 if coalesce(body->>'q','') !~ '^[0-9a-f]{32}$' then return jsonb_build_object('status',403,'data',jsonb_build_object('error','برای سفارش، QR معتبر میز را اسکن کنید','code','QR_REQUIRED'));end if;
 if length(coalesce(token,'')) not between 32 and 100 then raise exception 'توکن مهمان معتبر نیست';end if;hash=encode(sha256(convert_to(token,'UTF8')),'hex');
 resolved=point_resolve(body);if resolved->>'status'<>'200' then return resolved;end if;bid=resolved#>>'{data,business,id}';pid=resolved#>>'{data,servicePoint,id}';
 perform 1 from service_points where business_id=bid and id=pid for update;
 select x.* into g from session_guests x join service_sessions ss on ss.business_id=x.business_id and ss.id=x.session_id where x.business_id=bid and ss.service_point_id=pid and x.token_hash=hash limit 1;
 if g.id is not null then
  select * into s from service_sessions where business_id=bid and id=g.session_id;
  if s.status<>'open' or g.expires_at<=now() or g.revoked_at is not null then return jsonb_build_object('status',409,'data',jsonb_build_object('error','نشست قبلی پایان یافته؛ برای سفارش تازه دوباره شروع کن','code','SESSION_CLOSED'));end if;
 else
  select * into s from service_sessions where business_id=bid and service_point_id=pid and status='open';
  if s.id is not null and s.expires_at<=now() and not exists(select 1 from orders where business_id=bid and session_id=s.id and status not in ('delivered','cancelled')) and not exists(select 1 from service_requests where business_id=bid and session_id=s.id and status in ('pending','accepted')) then update service_sessions set status='closed',closed_at=now() where business_id=bid and id=s.id;s.id=null;end if;
  if s.id is null then insert into service_sessions(business_id,id,service_point_id) values(bid,'session-'||gen_random_uuid(),pid) returning * into s;end if;
  insert into session_guests(business_id,id,session_id,token_hash) values(bid,'guest-'||gen_random_uuid(),s.id,hash) returning * into g;
 end if;
 update service_points set is_occupied=true where business_id=bid and id=pid;
 return jsonb_build_object('status',200,'data',jsonb_build_object('businessId',bid,'sessionId',s.id,'guestId',g.id,'servicePointId',pid,'expiresAt',g.expires_at));
end $function$;

-- access_api
CREATE OR REPLACE FUNCTION public.access_api(p_path text, p_method text, p_body jsonb, p_uid uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare p profiles; bid text; ph text; target uuid; r text; s jsonb; v jsonb; n integer;
begin
 select * into p from profiles where user_id=p_uid;
 if p_path in ('/account','/register') then
  if p_uid is null then return jsonb_build_object('status',401,'data',jsonb_build_object('error','ابتدا شماره موبایل را تأیید کن'));end if;
  select phone into ph from auth.users where id=p_uid and phone_confirmed_at is not null;
  if ph is null then raise exception 'شماره موبایل تأیید نشده است';end if;
  perform pg_advisory_xact_lock(hashtextextended(p_uid::text,0));
  select * into p from profiles where user_id=p_uid;
  if not exists(select 1 from business_memberships bm where bm.user_id=p_uid and bm.status='active')
   and not exists(select 1 from platform_roles pr where pr.user_id=p_uid) then
   if exists(select 1 from business_memberships bm where bm.user_id=p_uid) then
    return jsonb_build_object('status',403,'data',jsonb_build_object('error','دسترسی این حساب غیرفعال شده است؛ با مدیر مجموعه تماس بگیر','code','MEMBERSHIP_DISABLED'));
   end if;
   if p_path<>'/register' or p_body->'acceptTerms' is distinct from 'true'::jsonb or length(trim(coalesce(p_body->>'businessName',''))) not between 2 and 80 then return jsonb_build_object('status',403,'data',jsonb_build_object('error','ثبت‌نام و پذیرش قوانین لازم است','code','REGISTRATION_REQUIRED'));end if;
   bid='venue-'||replace(p_uid::text,'-','');

   insert into businesses(id,name,kind_code,settings) values(bid,trim(p_body->>'businessName'),'restaurant',jsonb_build_object('phone',ph,'orderAcceptanceActive',true));
   insert into menus(business_id,id,title,kind_code,status) values(bid,'main','منوی اصلی','restaurant','published');
   insert into menu_appearance(business_id,menu_id) values(bid,'main');
   insert into service_points(business_id,id,code,label,section,table_number) select bid,'point-'||gen_random_uuid(),i::text,'میز '||i,'main',i from generate_series(1,5)i;
   insert into qr_links(business_id,service_point_id) select business_id,id from service_points where business_id=bid;
 
   insert into profiles(user_id,active_business_id) values(p_uid,bid) on conflict(user_id) do update set active_business_id=excluded.active_business_id,updated_at=now();
   insert into business_memberships(business_id,user_id,role) values(bid,p_uid,'owner');
   insert into terms_acceptances(user_id,terms_version,accepted_at) values(p_uid,'2026-10-19',now()) on conflict(user_id,terms_version) do nothing;
   insert into access_events(actor_id,business_id,target_id,action) values(p_uid,bid,p_uid,'register');
  end if;
  return jsonb_build_object('status',200,'data',jsonb_build_object('account',access_account(p_uid)));
 end if;
 if p_path='/access/business' and p_method='POST' then
  bid=p_body->>'businessId';if access_role(p_uid,bid) is null then raise exception 'عضویت فعال در این مجموعه لازم است';end if;
  update profiles set active_business_id=bid,updated_at=now() where user_id=p_uid;
  insert into access_events(actor_id,business_id,action) values(p_uid,bid,'select_business');
  return jsonb_build_object('status',200,'data',jsonb_build_object('account',access_account(p_uid)));
 end if;
 bid=p.active_business_id;
 if p_path='/access/members' and p_method='GET' then
  select coalesce(jsonb_agg(jsonb_build_object('userId',m.user_id,'phone',u.phone,'name',pr.display_name,'role',m.role,'status',m.status) order by m.created_at),'[]') into v from business_memberships m join profiles pr on pr.user_id=m.user_id join auth.users u on u.id=m.user_id where m.business_id=bid;
 elsif p_path='/access/members' and p_method='POST' then
  ph=regexp_replace(coalesce(p_body->>'phone',''),'[^0-9]','','g');if ph ~ '^09[0-9]{9}$' then ph='98'||substring(ph from 2);end if;
  if ph !~ '^989[0-9]{9}$' then raise exception 'شماره موبایل معتبر وارد کن';end if;
  select id into target from auth.users where ltrim(phone,'+')=ph and phone_confirmed_at is not null;
  if target is null then raise exception 'این همکار ابتدا یک بار شماره خود را در سایت تأیید کند؛ ثبت مجموعه لازم نیست';end if;
  if p_body->>'role' is null or p_body->>'role' not in ('owner','manager','waiter','kitchen') then raise exception 'نقش معتبر انتخاب کن';end if;
  if p_body ? 'status' and p_body->>'status' not in ('active','disabled') then raise exception 'وضعیت معتبر نیست';end if;
  perform 1 from businesses where id=bid for update;
  insert into profiles(user_id,active_business_id,profile_completed) values(target,bid,true) on conflict(user_id) do nothing;
  insert into business_memberships(business_id,user_id,role,status) values(bid,target,p_body->>'role',coalesce(p_body->>'status','active'))
   on conflict(business_id,user_id) do update set role=excluded.role,status=excluded.status,updated_at=now();
  insert into access_events(actor_id,business_id,target_id,action,details) values(p_uid,bid,target,'membership_changed',jsonb_build_object('role',p_body->>'role','status',coalesce(p_body->>'status','active')));
  v=jsonb_build_object('ok',true);
 elsif p_path='/admin/ban' and p_method='POST' then
  target=(p_body->>'userId')::uuid;
  if target=p_uid or exists(select 1 from platform_roles where user_id=target and role='admin') then raise exception 'حساب ادمین را نمی‌توان مسدود کرد';end if;
  if jsonb_typeof(p_body->'banned') is distinct from 'boolean' then raise exception 'وضعیت معتبر نیست';end if;
  update profiles set status=case when p_body->'banned'='true' then 'blocked' else 'active' end,updated_at=now() where user_id=target;
  if not found then raise exception 'حساب پیدا نشد';end if;
  insert into access_events(actor_id,target_id,action,details) values(p_uid,target,'account_status',jsonb_build_object('banned',p_body->'banned'));v=jsonb_build_object('ok',true);
 elsif p_path='/admin/overview' and p_method='GET' then
  select coalesce(jsonb_agg(jsonb_build_object('id',b.id,'name',b.name,'phone',b.settings->>'phone','menus',(select count(*) from menus where business_id=b.id and status<>'archived'),'products',(select count(*) from products where business_id=b.id and status='active'),'orders',(select count(*) from orders where business_id=b.id),'pending',(select count(*) from orders where business_id=b.id and status not in ('delivered','cancelled')))),'[]') into v from businesses b;
  v=jsonb_build_object('venues',v,'totals',jsonb_build_object('venues',jsonb_array_length(v),'orders',(select count(*) from orders)),
   'accounts',(select coalesce(jsonb_agg(jsonb_build_object('id',a.user_id,'phone',u.phone,'business',a.business_id,'role',a.role,'banned',a.is_banned,'terms',a.terms_version)),'[]') from (select prf.user_id,prf.active_business_id business_id,case when exists(select 1 from platform_roles where user_id=prf.user_id) then 'admin' else coalesce((select case when role in ('owner','manager') then 'manager' else role end from business_memberships where user_id=prf.user_id and business_id=prf.active_business_id and status='active'),'manager') end role,prf.status='blocked' is_banned,(select terms_version from terms_acceptances where user_id=prf.user_id order by accepted_at desc limit 1) terms_version from profiles prf) a join auth.users u on u.id=a.user_id),
   'online',jsonb_build_object('visitors',(select count(*) from presence where last_seen>now()-interval '5 minutes'),'accounts',(select count(distinct user_id) from presence where last_seen>now()-interval '5 minutes')),
   'messages',(select coalesce(jsonb_agg(x),'[]') from(select b.id,b.business_id,b.title,b.body,b.created_at,(select max(read_at) from message_receipts where message_id=b.id) read_at from business_messages b order by b.created_at desc limit 40)x));
 else return null;end if;
 return jsonb_build_object('status',200,'data',v);
exception when others then return jsonb_build_object('status',400,'data',jsonb_build_object('error',case when sqlstate='P0001' then sqlerrm else 'اطلاعات حساب معتبر نیست' end));
end $function$;

-- menu_api_v2
CREATE OR REPLACE FUNCTION public.menu_api_v2(p_path text, p_method text, p_body jsonb DEFAULT '{}'::jsonb, p_uid uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare guard jsonb;answer jsonb;bid text;r text;v jsonb;begin
 guard=access_authorize(p_path,p_method,p_body,p_uid);
 if guard->'allowed' is distinct from 'true'::jsonb then return jsonb_build_object('status',(guard->>'status')::integer,'data',guard-'allowed'-'status');end if;
 if p_path='/health' then return jsonb_build_object('status',200,'data',jsonb_build_object('ok',true,'provider','supabase','demo',false,'catalogVersion',1,'accessVersion',1,'pointVersion',1,'orderVersion',1,'platformVersion',1,'runtimeVersion',2));end if;
 answer=platform_api(p_path,p_method,p_body,p_uid);if answer is not null then return answer;end if;
 answer=order_api(p_path,p_method,p_body,p_uid);if answer is not null then return answer;end if;
 answer=point_api(p_path,p_method,p_body,p_uid);if answer is not null then return answer;end if;
 answer=access_api(p_path,p_method,p_body,p_uid);if answer is not null then return answer;end if;
 if p_path='/public/feed' and p_method='GET' then
  -- Public marketing feeds must never expose real customers' live order contents.
  return jsonb_build_object('status',200,'data','[]'::jsonb);
 end if;
 answer=catalog_api(p_path,p_method,p_body,p_uid);
 select active_business_id into bid from profiles where user_id=p_uid;r=access_role(p_uid,bid);
 if p_path='/workspace' and answer->>'status'='200' and r='kitchen' then
  select coalesce(jsonb_agg(access_kitchen_order(o)),'[]') into v from jsonb_array_elements(answer#>'{data,orders}')o where o->>'status' in ('cooking','ready','delivered');
  return jsonb_build_object('status',200,'data',jsonb_build_object('business',jsonb_build_object('id',bid,'name',answer#>>'{data,business,name}'),'menus','[]'::jsonb,'products','[]'::jsonb,'categories','[]'::jsonb,'servicePoints','[]'::jsonb,'serviceCalls','[]'::jsonb,'orders',v));
 end if;return answer;
exception when others then return jsonb_build_object('status',400,'data',jsonb_build_object('error',case when sqlstate='P0001' then sqlerrm else 'درخواست معتبر نیست' end));end $function$;

create index if not exists mizato_orders_business_status_created_idx on public.orders(business_id,status,created_at desc,id desc);
create index if not exists mizato_orders_business_created_idx on public.orders(business_id,created_at desc,id desc);
create index if not exists mizato_order_events_business_order_action_created_idx on public.order_events(business_id,order_id,action,created_at);
commit;
