-- All access passes through the verified Edge session; no direct browser writes.
alter table public.menu_accounts add column if not exists is_banned boolean not null default false;
create table if not exists public.menu_subscriptions(business_id text primary key references public.menu_workspaces(id),plan text not null check(plan in ('growth','special')),expires_at timestamptz not null,payment_id uuid);
create table if not exists public.menu_payments(id uuid primary key default gen_random_uuid(),user_id uuid not null,business_id text not null,plan text not null check(plan in ('growth','special')),amount integer not null,request_id uuid not null,authority text unique,status text not null default 'pending',ref_id text,created_at timestamptz not null default now(),unique(user_id,request_id));
create table if not exists public.menu_messages(id uuid primary key default gen_random_uuid(),sender uuid not null,business_id text not null references public.menu_workspaces(id),title text not null,body text not null,created_at timestamptz not null default now(),read_at timestamptz);
create table if not exists public.menu_presence(visitor uuid primary key,user_id uuid,last_seen timestamptz not null default now());
alter table public.menu_subscriptions enable row level security;
alter table public.menu_payments enable row level security;
alter table public.menu_messages enable row level security;
alter table public.menu_presence enable row level security;
revoke all on public.menu_subscriptions,public.menu_payments,public.menu_messages,public.menu_presence from public,anon,authenticated;
grant all on public.menu_subscriptions,public.menu_payments,public.menu_messages,public.menu_presence to service_role;

create or replace function public.menu_api_v2(p_path text,p_method text,p_body jsonb default '{}',p_uid uuid default null) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare a public.menu_accounts; s jsonb; r jsonb; v jsonb; bid text; active_plan text='free'; expires timestamptz; n integer; target uuid;
begin
 select * into a from menu_accounts where user_id=p_uid;
 if coalesce(a.is_banned,false) then return jsonb_build_object('status',403,'data',jsonb_build_object('error','حساب شما مسدود شده است؛ با پشتیبانی تماس بگیر','code','ACCOUNT_BANNED'));end if;
 if p_path='/presence' and p_method='POST' then
  insert into menu_presence(visitor,user_id) values((p_body->>'visitor')::uuid,p_uid) on conflict(visitor) do update set user_id=excluded.user_id,last_seen=now();
  return jsonb_build_object('status',200,'data',jsonb_build_object('ok',true));
 end if;
 if p_path in ('/orders','/calls') and p_method='POST' and exists(select 1 from menu_accounts where business_id=p_body->>'businessId' and is_banned) then return jsonb_build_object('status',403,'data',jsonb_build_object('error','این مجموعه فعلاً سفارش نمی‌پذیرد'));end if;
 if p_path like '/admin/%' then
  if a.role is distinct from 'admin' then return jsonb_build_object('status',403,'data',jsonb_build_object('error','دسترسی ادمین لازم است'));end if;
  if p_path='/admin/overview' and p_method='GET' then
   r=public.menu_api(p_path,p_method,p_body,p_uid);
   select coalesce(jsonb_agg(jsonb_build_object('id',c.user_id,'phone',u.phone,'business',c.business_id,'role',c.role,'banned',c.is_banned,'terms',c.terms_version)),'[]') into v from menu_accounts c join auth.users u on u.id=c.user_id;
   return jsonb_set(r,'{data}',(r->'data')||jsonb_build_object('accounts',v,'online',jsonb_build_object('visitors',(select count(*) from menu_presence where last_seen>now()-interval '5 minutes'),'accounts',(select count(distinct user_id) from menu_presence where last_seen>now()-interval '5 minutes')),'messages',(select coalesce(jsonb_agg(x),'[]') from(select id,business_id,title,body,created_at,read_at from menu_messages order by created_at desc limit 40)x)));
  elsif p_path='/admin/ban' and p_method='POST' then
   target=(p_body->>'userId')::uuid;
   if target=p_uid or exists(select 1 from menu_accounts where user_id=target and role='admin') then raise exception 'حساب ادمین را نمی‌توان مسدود کرد';end if;
   if jsonb_typeof(p_body->'banned') is distinct from 'boolean' then raise exception 'وضعیت معتبر نیست';end if;
   update menu_accounts set is_banned=(p_body->>'banned')::boolean where user_id=target;
   if not found then raise exception 'حساب پیدا نشد';end if;
   return jsonb_build_object('status',200,'data',jsonb_build_object('ok',true));
  elsif p_path='/admin/messages' and p_method='POST' then
   if length(trim(coalesce(p_body->>'title',''))) not between 1 and 100 or length(trim(coalesce(p_body->>'body',''))) not between 1 and 2000 then raise exception 'عنوان و متن پیام را کامل کن';end if;
   if p_body->>'business'='all' then
    insert into menu_messages(sender,business_id,title,body) select p_uid,id,trim(p_body->>'title'),trim(p_body->>'body') from menu_workspaces where id in(select business_id from menu_accounts where role<>'admin');
   else
    if not exists(select 1 from menu_accounts where business_id=p_body->>'business') then raise exception 'مجموعه پیدا نشد';end if;
    insert into menu_messages(sender,business_id,title,body) values(p_uid,p_body->>'business',trim(p_body->>'title'),trim(p_body->>'body'));
   end if;
   get diagnostics n=row_count;
   return jsonb_build_object('status',200,'data',jsonb_build_object('sent',n));
  end if;
 end if;
 if p_path in ('/account','/register') then
  r=public.menu_api(p_path,p_method,p_body,p_uid);
  -- A new collection starts with five service points, without altering existing collections.
  if a.user_id is null and r->>'status'='200' then
   select business_id into bid from menu_accounts where user_id=p_uid;
   if bid<>'pich-shemroon' then update menu_workspaces set payload=jsonb_set(payload,'{servicePoints}',(select coalesce(jsonb_agg(x),'[]') from(select x||jsonb_build_object('businessId',bid,'isOccupied',false) x from jsonb_array_elements(payload->'servicePoints') x limit 5)q)) where id=bid;end if;
  end if;
  return r;
 end if;
 if a.user_id is not null then
  bid=a.business_id;
  select plan,expires_at into active_plan,expires from menu_subscriptions where business_id=bid and expires_at>now();active_plan=coalesce(active_plan,'free');
  if p_path='/subscription' and p_method='GET' then
   select payload into s from menu_workspaces where id=bid;
   return jsonb_build_object('status',200,'data',jsonb_build_object('plan',active_plan,'expiresAt',expires,'sandbox',true,'products',jsonb_array_length(s->'products'),'points',jsonb_array_length(s->'servicePoints'),'productLimit',case when active_plan='free' then 20 else null end,'pointLimit',case when active_plan='free' then 5 else null end));
  elsif p_path='/messages' and p_method='GET' then
   return jsonb_build_object('status',200,'data',(select coalesce(jsonb_agg(x),'[]') from(select id,title,body,created_at,read_at from menu_messages where business_id=bid order by created_at desc limit 100)x));
  elsif p_path='/messages/read' and p_method='POST' then
   update menu_messages set read_at=coalesce(read_at,now()) where id=(p_body->>'id')::uuid and business_id=bid;
   return jsonb_build_object('status',200,'data',jsonb_build_object('ok',true));
  end if;
  if (p_path='/products' or p_path='/service-points') and p_method='POST' then
   select payload into s from menu_workspaces where id=bid for update;
   if active_plan='free' and ((p_path='/products' and jsonb_array_length(s->'products')>=20) or(p_path='/service-points' and jsonb_array_length(s->'servicePoints')>=5)) then return jsonb_build_object('status',409,'data',jsonb_build_object('error','به سقف طرح شروع رسیده‌ای؛ طرح مجموعه را ارتقا بده','code','PLAN_LIMIT'));end if;
   if p_path='/service-points' then
    n=(p_body->>'tableNumber')::integer;
    if n is null or n not between 1 and 9999 or exists(select 1 from jsonb_array_elements(s->'servicePoints')x where (x->>'tableNumber')::integer=n) then raise exception 'شماره سرویس‌پوینت تکراری یا نامعتبر است';end if;
    v=jsonb_build_object('id','point-'||gen_random_uuid(),'businessId',bid,'tableNumber',n,'section','main','label',left(coalesce(nullif(trim(p_body->>'label'),''),'میز '||n),60),'isOccupied',false);
    update menu_workspaces set payload=jsonb_set(s,'{servicePoints}',(s->'servicePoints')||jsonb_build_array(v)),updated_at=now() where id=bid;
    return jsonb_build_object('status',200,'data',v);
   end if;
  end if;
 end if;
 return public.menu_api(p_path,p_method,p_body,p_uid);
exception when others then return jsonb_build_object('status',400,'data',jsonb_build_object('error',case when sqlstate='P0001' then sqlerrm else 'درخواست معتبر نیست' end));end $$;
revoke all on function public.menu_api_v2(text,text,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.menu_api_v2(text,text,jsonb,uuid) to service_role;

-- Internal billing RPC: never mapped to a generic public route.
create or replace function public.menu_billing(p_op text,p_uid uuid,p_body jsonb default '{}') returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare a public.menu_accounts; p public.menu_payments; until_at timestamptz;
begin
 select * into a from menu_accounts where user_id=p_uid;
 if a.user_id is null or a.is_banned then raise exception 'حساب فعال لازم است';end if;
 if p_op='create' then
  if p_body->>'plan' not in ('growth','special') or p_body->>'plan' is null then raise exception 'طرح معتبر نیست';end if;
  insert into menu_payments(user_id,business_id,plan,amount,request_id) values(p_uid,a.business_id,p_body->>'plan',case when p_body->>'plan'='growth' then 2000000 else 5000000 end,(p_body->>'requestId')::uuid) on conflict(user_id,request_id) do nothing;
  select * into p from menu_payments where user_id=p_uid and request_id=(p_body->>'requestId')::uuid;
 else
  select * into p from menu_payments where id=(p_body->>'id')::uuid and user_id=p_uid for update;
  if p.id is null then raise exception 'پرداخت پیدا نشد';end if;
  if p_op='attach' then
   if p.status='pending' and p.authority is null and p_body->>'authority' ~ '^S[0-9A-Za-z]{10,100}$' then update menu_payments set authority=p_body->>'authority' where id=p.id returning * into p;end if;
  elsif p_op='paid' then
   if p.authority is distinct from p_body->>'authority' or p.status not in ('pending','paid') then raise exception 'اطلاعات پرداخت معتبر نیست';end if;
   if p.status<>'paid' then
    perform 1 from menu_workspaces where id=p.business_id for update;
    select greatest(now(),expires_at) into until_at from menu_subscriptions where business_id=p.business_id;
    until_at=coalesce(until_at,now())+interval '30 days';
    insert into menu_subscriptions(business_id,plan,expires_at,payment_id) values(p.business_id,p.plan,until_at,p.id) on conflict(business_id) do update set plan=excluded.plan,expires_at=excluded.expires_at,payment_id=excluded.payment_id;
    update menu_payments set status='paid',ref_id=left(p_body->>'refId',100) where id=p.id returning * into p;
   end if;
  elsif p_op='cancel' then
   update menu_payments set status='cancelled' where id=p.id and status='pending' returning * into p;
  elsif p_op<>'get' then raise exception 'عملیات معتبر نیست';end if;
 end if;
 return to_jsonb(p)-'user_id'-'request_id';
end $$;
revoke all on function public.menu_billing(text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.menu_billing(text,uuid,jsonb) to service_role;
