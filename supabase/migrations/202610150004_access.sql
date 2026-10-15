-- Package 4: one access model; menu_accounts becomes a read-only compatibility view.
begin;
lock table public.menu_accounts, public.businesses in access exclusive mode;
do $$ begin
 if current_setting('menosaz.backup_verified',true) is distinct from 'yes' then raise exception 'BACKUP_REQUIRED';end if;
end $$;
create table public.profiles (
 user_id uuid primary key references auth.users(id), display_name text not null default '',
 status text not null default 'active' check(status in ('active','blocked')),
 profile_completed boolean not null default false, active_business_id text references public.businesses(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.platform_roles (
 user_id uuid not null references public.profiles(user_id), role text not null check(role='admin'),
 granted_by uuid references auth.users(id), created_at timestamptz not null default now(),primary key(user_id,role)
);
create table public.business_memberships (
 business_id text not null references public.businesses(id),user_id uuid not null references public.profiles(user_id),
 role text not null check(role in ('owner','manager','waiter','kitchen')),
 status text not null default 'active' check(status in ('active','disabled')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),primary key(business_id,user_id)
);
create table public.terms_acceptances (
 user_id uuid not null references public.profiles(user_id),terms_version text not null,accepted_at timestamptz not null,
 primary key(user_id,terms_version)
);
create table public.access_events (
 id bigint generated always as identity primary key,actor_id uuid references auth.users(id),
 business_id text references public.businesses(id),target_id uuid references auth.users(id),
 action text not null,details jsonb not null default '{}',created_at timestamptz not null default now()
);
alter table public.businesses add column status text not null default 'active' check(status in ('active','suspended'));
insert into profiles(user_id,status,profile_completed,active_business_id)
 select user_id,case when is_banned then 'blocked' else 'active' end,profile_completed,business_id from menu_accounts;
insert into platform_roles(user_id,role) select user_id,'admin' from menu_accounts where role='admin';
insert into business_memberships(business_id,user_id,role) select business_id,user_id,'owner' from menu_accounts;
insert into terms_acceptances select user_id,terms_version,accepted_at from menu_accounts where terms_version is not null and accepted_at is not null;
do $$ begin
 if (select count(*) from profiles)<>(select count(*) from menu_accounts) then raise exception 'ACCESS_COUNT_MISMATCH';end if;
 if exists(select 1 from businesses b where not exists(select 1 from business_memberships m where m.business_id=b.id and m.role='owner' and m.status='active')) then raise exception 'BUSINESS_WITHOUT_OWNER';end if;
end $$;
-- No CASCADE: unexpected dependencies abort the entire migration rather than being deleted.
drop table public.menu_accounts;
create view public.menu_accounts as
 select p.user_id,coalesce(m.business_id,p.active_business_id) as business_id,
 case when r.user_id is not null then 'admin' when m.role in ('owner','manager') then 'manager' else m.role end as role,
 t.terms_version,t.accepted_at,p.profile_completed,p.status='blocked' as is_banned
 from profiles p left join platform_roles r on r.user_id=p.user_id and r.role='admin'
 left join lateral(select bm.business_id,bm.role from business_memberships bm
   where bm.user_id=p.user_id and bm.status='active' and bm.business_id=p.active_business_id limit 1)m on true
 left join lateral(select ta.terms_version,ta.accepted_at from terms_acceptances ta where ta.user_id=p.user_id order by ta.accepted_at desc limit 1)t on true;
revoke all on public.menu_accounts from public,anon,authenticated,service_role;
grant select on public.menu_accounts to service_role;
do $$ declare t text;begin
 foreach t in array array['profiles','platform_roles','business_memberships','terms_acceptances','access_events'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;

create function public.access_owner_guard() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform 1 from businesses where id=old.business_id for update;
 if old.role='owner' and old.status='active' and (tg_op='DELETE' or new.role<>'owner' or new.status<>'active' or new.business_id<>old.business_id) then
  if not exists(select 1 from business_memberships where business_id=old.business_id and user_id<>old.user_id and role='owner' and status='active') then raise exception 'آخرین مالک فعال مجموعه را نمی‌توان حذف یا غیرفعال کرد';end if;
 end if;
 if tg_op='DELETE' then return old;end if;return new;
end $$;
create trigger access_keep_owner before update or delete on public.business_memberships for each row execute function public.access_owner_guard();

create function public.access_role(uid uuid,bid text) returns text language sql stable security definer set search_path=public,pg_temp as $$
 select m.role from business_memberships m join profiles p on p.user_id=m.user_id join businesses b on b.id=m.business_id
 where m.user_id=uid and m.business_id=bid and m.status='active' and p.status='active' and b.status='active';
$$;
create function public.access_account(uid uuid) returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select jsonb_build_object('id',p.user_id,'name',coalesce(nullif(p.display_name,''),case when r.user_id is not null then 'ادمین منوساز' else 'حساب مجموعه' end),
 'phone',u.phone,'role',case when r.user_id is not null then 'admin' when m.role in ('owner','manager') then 'manager' else m.role end,
 'businessRole',m.role,'businessId',p.active_business_id,'demo',false,'needsProfile',r.user_id is null and m.role='owner' and not p.profile_completed,
 'memberships',coalesce((select jsonb_agg(jsonb_build_object('businessId',bm.business_id,'name',b.name,'role',bm.role) order by b.name)
 from business_memberships bm join businesses b on b.id=bm.business_id where bm.user_id=uid and bm.status='active' and b.status='active'),'[]'))
 from profiles p join auth.users u on u.id=p.user_id left join platform_roles r on r.user_id=p.user_id and r.role='admin'
 left join business_memberships m on m.user_id=p.user_id and m.business_id=p.active_business_id and m.status='active' where p.user_id=uid;
$$;
create function public.access_authorize(p_path text,p_method text,p_body jsonb,p_uid uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare p profiles; bid text; r text; admin boolean;
begin
 if p_path='/auth/logout' then return jsonb_build_object('allowed',true);end if;
 if p_uid is not null then
  select * into p from profiles where user_id=p_uid;
  if p.status='blocked' then return jsonb_build_object('allowed',false,'status',403,'error','حساب شما مسدود شده است؛ با پشتیبانی تماس بگیر','code','ACCOUNT_BANNED');end if;
 end if;
 if p_path in ('/health','/public/menu','/public/feed','/order-status','/presence') or (p_path in ('/orders','/calls') and p_method='POST') then
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
  return jsonb_build_object('allowed',case when p_body->>'action'='confirm' then r='kitchen' when p_body->>'action' in ('send','deliver','remove','note') then r='waiter' else false end,'status',403,'error','این عملیات فقط برای نقش مسئول آن مجاز است');
 end if;
 if p_path='/workspace' and p_method='GET' then return jsonb_build_object('allowed',true);end if;
 if p_path like '/calls/%' or p_path like '/tables/%' then return jsonb_build_object('allowed',r in ('owner','manager','waiter'),'status',403,'error','دسترسی سالن لازم است');end if;
 return jsonb_build_object('allowed',r in ('owner','manager'),'status',403,'error','دسترسی مدیریت مجموعه لازم است');
end $$;

create function public.access_api(p_path text,p_method text,p_body jsonb,p_uid uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare p profiles; bid text; ph text; target uuid; r text; s jsonb; v jsonb; n integer;
begin
 select * into p from profiles where user_id=p_uid;
 if p_path in ('/account','/register') then
  if p_uid is null then return jsonb_build_object('status',401,'data',jsonb_build_object('error','ابتدا شماره موبایل را تأیید کن'));end if;
  select phone into ph from auth.users where id=p_uid and phone_confirmed_at is not null;
  if ph is null then raise exception 'شماره موبایل تأیید نشده است';end if;
  perform pg_advisory_xact_lock(hashtextextended(p_uid::text,0));
  select * into p from profiles where user_id=p_uid;
  if p.user_id is null then
   if p_path<>'/register' or p_body->'acceptTerms' is distinct from 'true'::jsonb or length(trim(coalesce(p_body->>'businessName',''))) not between 2 and 80 then return jsonb_build_object('status',403,'data',jsonb_build_object('error','ثبت‌نام و پذیرش قوانین لازم است','code','REGISTRATION_REQUIRED'));end if;
   bid='venue-'||replace(p_uid::text,'-','');
   s=jsonb_build_object('business',jsonb_build_object('id',bid,'name',trim(p_body->>'businessName'),'phone',ph,'kind','restaurant','orderAcceptanceActive',true),
    'menus',jsonb_build_array(jsonb_build_object('id','main','name','منوی اصلی','kind','restaurant','published',true)),'products','[]'::jsonb,'categories','[]'::jsonb,
    'orders','[]'::jsonb,'serviceCalls','[]'::jsonb,'servicePoints',(select jsonb_agg(jsonb_build_object('id','point-'||gen_random_uuid(),'businessId',bid,'tableNumber',i,'label','میز '||i,'isOccupied',false,'section','main')) from generate_series(1,5)i));
   insert into menu_workspaces(id,payload) values(bid,s);
   insert into profiles(user_id,active_business_id) values(p_uid,bid);
   insert into business_memberships(business_id,user_id,role) values(bid,p_uid,'owner');
   insert into terms_acceptances values(p_uid,'2026-10-13',now());
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
  select coalesce(jsonb_agg(jsonb_build_object('id',b.id,'name',b.name,'phone',b.settings->>'phone','menus',(select count(*) from menus where business_id=b.id and status<>'archived'),'products',(select count(*) from products where business_id=b.id and status='active'),'orders',jsonb_array_length(w.payload->'orders'),'pending',(select count(*) from jsonb_array_elements(w.payload->'orders')o where o->>'status' not in ('delivered','cancelled')))),'[]') into v from businesses b join menu_workspaces w on w.id=b.id;
  v=jsonb_build_object('venues',v,'totals',jsonb_build_object('venues',jsonb_array_length(v),'orders',(select coalesce(sum(jsonb_array_length(payload->'orders')),0) from menu_workspaces)),
   'accounts',(select coalesce(jsonb_agg(jsonb_build_object('id',a.user_id,'phone',u.phone,'business',a.business_id,'role',a.role,'banned',a.is_banned,'terms',a.terms_version)),'[]') from menu_accounts a join auth.users u on u.id=a.user_id),
   'online',jsonb_build_object('visitors',(select count(*) from menu_presence where last_seen>now()-interval '5 minutes'),'accounts',(select count(distinct user_id) from menu_presence where last_seen>now()-interval '5 minutes')),
   'messages',(select coalesce(jsonb_agg(x),'[]') from(select id,business_id,title,body,created_at,read_at from menu_messages order by created_at desc limit 40)x));
 elsif p_path='/admin/messages' and p_method='POST' then
  if length(trim(coalesce(p_body->>'title',''))) not between 1 and 100 or length(trim(coalesce(p_body->>'body',''))) not between 1 and 2000 then raise exception 'عنوان و متن پیام را کامل کن';end if;
  insert into menu_messages(sender,business_id,title,body) select p_uid,b.id,trim(p_body->>'title'),trim(p_body->>'body') from businesses b
   where (p_body->>'business'='all' or b.id=p_body->>'business') and exists(select 1 from business_memberships m where m.business_id=b.id and m.role in ('owner','manager') and m.status='active');
  get diagnostics n=row_count;if n=0 then raise exception 'مجموعه‌ای پیدا نشد';end if;
  insert into access_events(actor_id,action,details) values(p_uid,'admin_message',jsonb_build_object('recipient',p_body->>'business','count',n));v=jsonb_build_object('sent',n);
 else return null;end if;
 return jsonb_build_object('status',200,'data',v);
exception when others then return jsonb_build_object('status',400,'data',jsonb_build_object('error',case when sqlstate='P0001' then sqlerrm else 'اطلاعات حساب معتبر نیست' end));
end $$;

create or replace function public.menu_profile(p_uid uuid,p_body jsonb default null) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare p profiles;bid text;
begin
 select * into p from profiles where user_id=p_uid;bid=p.active_business_id;
 if p.status is distinct from 'active' or access_role(p_uid,bid) not in ('owner','manager') or access_role(p_uid,bid) is null then raise exception 'دسترسی مدیریت مجموعه لازم است';end if;
 if p_body is not null then
  if length(trim(coalesce(p_body->>'name','')))<2 or length(p_body->>'name')>80 or p_body->>'kind' is null or p_body->>'kind' not in ('restaurant','cafe','hotel','juice','wholesaler') then raise exception 'نام و نوع مجموعه را کامل کن';end if;
  update businesses set name=trim(p_body->>'name'),kind_code=p_body->>'kind',settings=settings||jsonb_build_object('address',left(coalesce(p_body->>'address',''),300),'branchName',left(coalesce(p_body->>'branchName',''),80)),version=version+1,updated_at=now() where id=bid;
  update profiles set profile_completed=true,updated_at=now() where user_id=p_uid;p.profile_completed=true;
 end if;
 return jsonb_build_object('business',catalog_workspace_snapshot(bid)->'business','needsProfile',not p.profile_completed and not exists(select 1 from platform_roles where user_id=p_uid));
end $$;

-- Recompile row-type consumers against the view, invalidating old compiled table plans.
do $$ declare f record;begin
 for f in select pg_get_functiondef(p.oid) ddl from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosrc like '%menu_accounts%' loop execute f.ddl;end loop;
end $$;
-- Legacy account/admin writes must never remain reachable or assign roles by phone.
do $$ declare ddl text;begin
 select pg_get_functiondef('public.menu_api_legacy_catalog(text,text,jsonb,uuid)'::regprocedure) into ddl;
 ddl=regexp_replace(ddl,' if p_path in \(''/account'',''/register''\).*?(?= if p_path=''/public/feed'')','','ns');
 ddl=regexp_replace(ddl,' if p_path=''/admin/overview''.*?(?= if p_path=''/public/menu'')','','ns');
 if ddl like '%989152061541%' then raise exception 'LEGACY_PHONE_ROLE_REMAINS';end if;execute ddl;
end $$;
create function public.access_kitchen_order(o jsonb) returns jsonb language sql immutable set search_path=public,pg_temp as $$
 select jsonb_build_object('id',o->>'id','businessId',o->>'businessId','tableNumber',o->'tableNumber','orderNumber',o->>'orderNumber','customerNotes',o->>'customerNotes','status',o->>'status','deliveryStatus',o->>'deliveryStatus','restaurantConfirmed',o->'restaurantConfirmed','createdAt',o->>'createdAt','updatedAt',o->>'updatedAt','items',(select jsonb_agg(jsonb_build_object('id',i->>'id','productId',i->>'productId','productName',i->>'productName','quantity',i->'quantity','selectedOptions',(select coalesce(jsonb_agg(x-'extraPrice'),'[]') from jsonb_array_elements(coalesce(i->'selectedOptions','[]'))x),'notes',i->>'notes','waiterNotes',i->>'waiterNotes','deliveryStatus',i->>'deliveryStatus')) from jsonb_array_elements(o->'items')i));
$$;
create or replace function public.menu_api_v2(p_path text,p_method text,p_body jsonb default '{}',p_uid uuid default null) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare guard jsonb;answer jsonb;bid text;r text;s jsonb;v jsonb;plan text;expires timestamptz;n integer;
begin
 guard=access_authorize(p_path,p_method,p_body,p_uid);
 if guard->'allowed' is distinct from 'true'::jsonb then return jsonb_build_object('status',(guard->>'status')::integer,'data',guard-'allowed'-'status');end if;
 answer=access_api(p_path,p_method,p_body,p_uid);if answer is not null then return answer;end if;
 select active_business_id into bid from profiles where user_id=p_uid;r=access_role(p_uid,bid);
 if p_path='/presence' and p_method='POST' then
  insert into menu_presence(visitor,user_id) values((p_body->>'visitor')::uuid,p_uid) on conflict(visitor) do update set user_id=excluded.user_id,last_seen=now();return jsonb_build_object('status',200,'data',jsonb_build_object('ok',true));
 elsif p_path='/subscription' and p_method='GET' then
  select ms.plan,ms.expires_at into plan,expires from menu_subscriptions ms where business_id=bid and expires_at>now();plan=coalesce(plan,'free');
  return jsonb_build_object('status',200,'data',jsonb_build_object('plan',plan,'expiresAt',expires,'sandbox',true,'products',(select count(*) from products where business_id=bid and status='active'),'points',jsonb_array_length(catalog_workspace_snapshot(bid)->'servicePoints'),'productLimit',case when plan='free' then 20 else null end,'pointLimit',case when plan='free' then 5 else null end));
 elsif p_path='/messages' and p_method='GET' then
  return jsonb_build_object('status',200,'data',(select coalesce(jsonb_agg(x),'[]') from(select id,title,body,created_at,read_at from menu_messages where business_id=bid order by created_at desc limit 100)x));
 elsif p_path='/messages/read' and p_method='POST' then
  update menu_messages set read_at=coalesce(read_at,now()) where id=(p_body->>'id')::uuid and business_id=bid;return jsonb_build_object('status',200,'data',jsonb_build_object('ok',true));
 elsif p_path='/service-points' and p_method='POST' then
  select catalog_workspace_snapshot(id) into s from menu_workspaces where id=bid for update;n=(p_body->>'tableNumber')::integer;
  if catalog_limit(bid) is not null and jsonb_array_length(s->'servicePoints')>=5 then return jsonb_build_object('status',409,'data',jsonb_build_object('error','به سقف طرح شروع رسیده‌ای','code','PLAN_LIMIT'));end if;
  if n is null or n not between 1 and 9999 or exists(select 1 from jsonb_array_elements(s->'servicePoints')x where (x->>'tableNumber')::integer=n) then raise exception 'شماره سرویس‌پوینت تکراری یا نامعتبر است';end if;
  v=jsonb_build_object('id','point-'||gen_random_uuid(),'businessId',bid,'tableNumber',n,'section','main','label',left(coalesce(nullif(trim(p_body->>'label'),''),'میز '||n),60),'isOccupied',false);
  update menu_workspaces set payload=jsonb_set(payload,'{servicePoints}',(s->'servicePoints')||jsonb_build_array(v)),updated_at=now() where id=bid;return jsonb_build_object('status',200,'data',v);
 end if;
 answer=menu_api(p_path,p_method,p_body,p_uid);
 if p_path='/workspace' and answer->>'status'='200' and r='kitchen' then
  -- Explicit kitchen projection: no money, guest grants, payment data or account details.
  select coalesce(jsonb_agg(access_kitchen_order(o)),'[]') into v from jsonb_array_elements(answer#>'{data,orders}')o where o->>'status' in ('cooking','ready','delivered');
  answer=jsonb_build_object('status',200,'data',jsonb_build_object('business',jsonb_build_object('id',bid,'name',answer#>>'{data,business,name}'),'menus','[]'::jsonb,'products','[]'::jsonb,'categories','[]'::jsonb,'servicePoints','[]'::jsonb,'serviceCalls','[]'::jsonb,'orders',v));
 elsif p_path like '/orders/%/action' and answer->>'status'='200' and r='kitchen' then
  answer=jsonb_set(answer,'{data}',access_kitchen_order(answer->'data'));
 end if;
 return answer;
exception when others then return jsonb_build_object('status',400,'data',jsonb_build_object('error',case when sqlstate='P0001' then sqlerrm else 'درخواست معتبر نیست' end));
end $$;
-- Internal billing still uses the same canonical access view until package 9.
do $$ declare ddl text;begin
 select pg_get_functiondef('public.menu_billing(text,uuid,jsonb)'::regprocedure) into ddl;
 ddl=replace(ddl,'if a.user_id is null or a.is_banned then','if a.user_id is null or a.is_banned or coalesce(access_role(p_uid,a.business_id),'''') not in (''owner'',''manager'') then');execute ddl;
end $$;
do $$ declare f record;begin
 for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and (p.proname like 'access_%' or p.proname in ('menu_profile','menu_api_v2','menu_api_legacy_catalog','menu_billing')) loop
  execute format('revoke all on function %s from public,anon,authenticated',f.signature);execute format('grant execute on function %s to service_role',f.signature);
 end loop;
end $$;
commit;
