-- Package 9: canonical platform data. Existing identifiers and financial records survive.
begin;
lock table public.menu_subscriptions,public.menu_payments,public.menu_messages in access exclusive mode;
do $$ begin if current_setting('menosaz.backup_verified',true) is distinct from 'yes' then raise exception 'BACKUP_REQUIRED';end if;end $$;
create table public.plans(id text primary key,title text not null,price_toman bigint not null check(price_toman>=0),days integer not null check(days>0));
insert into plans values('free','شروع',0,30),('growth','رونق',200000,30),('special','تجربه ویژه',500000,30);
create table public.plan_entitlements(plan_id text references plans(id),feature text,limit_value integer check(limit_value>=0),enabled boolean not null default true,primary key(plan_id,feature));
insert into plan_entitlements values('free','products',20,true),('free','points',5,true),('growth','products',null,true),('growth','points',null,true),('special','products',null,true),('special','points',null,true),('special','voice_ai',null,false),('special','table_ar',null,false);
alter table menu_subscriptions rename to business_subscriptions;
alter table business_subscriptions drop constraint menu_subscriptions_business_id_fkey;
alter table business_subscriptions add foreign key(business_id) references businesses(id),add foreign key(plan) references plans(id);
alter table business_subscriptions add column status text not null default 'active' check(status in ('active','cancelled'));
alter table menu_payments rename to platform_payments;
alter table platform_payments rename column amount to gateway_amount_rial;
do $$ begin if exists(select 1 from platform_payments where gateway_amount_rial<0 or gateway_amount_rial%10<>0) then raise exception 'NON_INTEGRAL_TOMAN';end if;end $$;
alter table platform_payments add column amount_toman bigint generated always as (gateway_amount_rial/10) stored,add column service_code text not null default 'subscription',add column sandbox boolean not null default true,add column updated_at timestamptz not null default now();
alter table platform_payments add foreign key(user_id) references auth.users(id),add foreign key(business_id) references businesses(id),add foreign key(plan) references plans(id),add check(gateway_amount_rial>=0),add check(status in ('pending','paid','cancelled'));
create table public.platform_payment_events(id bigint generated always as identity primary key,payment_id uuid not null references platform_payments(id),action text not null,data jsonb not null default '{}',created_at timestamptz not null default now());
insert into platform_payment_events(payment_id,action,data) select id,'legacy_import',jsonb_build_object('status',status,'amountToman',amount_toman,'source','menu_payments') from platform_payments;
alter table menu_messages rename to business_messages;
alter table business_messages drop constraint menu_messages_business_id_fkey;
alter table business_messages add foreign key(business_id) references businesses(id);
create table public.message_receipts(message_id uuid references business_messages(id),user_id uuid references profiles(user_id),read_at timestamptz,primary key(message_id,user_id));
insert into message_receipts select x.id,m.user_id,x.read_at from business_messages x join business_memberships m on m.business_id=x.business_id where m.status='active' and m.role in ('owner','manager');
alter table business_messages drop column read_at;
alter table menu_presence rename to presence;
create table public.platform_content(id text primary key check(id='website'),payload jsonb not null default '{}',version bigint not null default 1,updated_by uuid references auth.users(id),updated_at timestamptz not null default now());
insert into platform_content(id,payload) values('website',coalesce((select settings->'websiteContent' from businesses where id='pich-shemroon'),'{}'));
create table public.platform_media(id uuid primary key,storage_path text unique not null,url text not null,mime text not null,bytes integer not null check(bytes between 1 and 1048576),width integer not null,height integer not null,created_by uuid references auth.users(id),created_at timestamptz not null default now());
update businesses set settings=settings-'websiteContent';
create function public.platform_plan(bid text) returns text language sql stable set search_path=public,pg_temp as $$select coalesce((select plan from business_subscriptions where business_id=bid and expires_at>now() and status='active'),'free')$$;
create or replace function public.catalog_limit(bid text) returns integer language sql stable set search_path=public,pg_temp as $$select limit_value from plan_entitlements where plan_id=platform_plan(bid) and feature='products' and enabled$$;
create function public.platform_image_allowed(value text) returns boolean language sql stable set search_path=public,pg_temp as $$select value ~ '^/(media|menu-assets)/[a-zA-Z0-9._-]+$' or exists(select 1 from platform_media where url=value) or exists(select 1 from platform_content where payload::text like '%'||replace(value,'%','\%')||'%')$$;
create function public.platform_content_valid(v jsonb) returns boolean language plpgsql set search_path=public,pg_temp as $$
declare k text;t jsonb;seen text[]='{}';begin
 if jsonb_typeof(v)<>'object' or (v-array['heroDish','heroDrink','heroCoffee','templates'])<>'{}'::jsonb then return false;end if;
 foreach k in array array['heroDish','heroDrink','heroCoffee']loop if jsonb_typeof(v->k) is distinct from 'string' or not platform_image_allowed(v->>k) then return false;end if;end loop;
 if jsonb_typeof(v->'templates') is distinct from 'array' or jsonb_array_length(v->'templates')>30 then return false;end if;
 for t in select value from jsonb_array_elements(v->'templates')loop
  if coalesce(t->>'id','') !~ '^[a-zA-Z0-9_-]{1,60}$' or t->>'id'=any(seen) or length(trim(coalesce(t->>'name',''))) not between 1 and 60 or length(coalesce(t->>'type',''))>40 or length(coalesce(t->>'text',''))>160 or not platform_image_allowed(coalesce(t->>'image','')) or jsonb_typeof(t->'visible') is distinct from 'boolean' then return false;end if;seen=array_append(seen,t->>'id');
 end loop;return true;end $$;
create function public.platform_api(p_path text,p_method text,p_body jsonb,p_uid uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare bid text;v jsonb;n integer;active_plan text;content platform_content;target uuid;begin
 select active_business_id into bid from profiles where user_id=p_uid;
 if p_path='/public/content' and p_method='GET' then select payload||jsonb_build_object('version',version) into v from platform_content where id='website';
 elsif p_path='/admin/content' and p_method='PATCH' then
  if not exists(select 1 from platform_roles r join profiles p on p.user_id=r.user_id where r.user_id=p_uid and p.status='active') then raise exception 'دسترسی ادمین لازم است';end if;
  select * into content from platform_content where id='website' for update;
  if (p_body->>'expectedVersion')::bigint is distinct from content.version then return jsonb_build_object('status',409,'data',jsonb_build_object('error','محتوا تغییر کرده؛ صفحه را دوباره بارگذاری کن','code','CONFLICT'));end if;
  if not platform_content_valid(p_body->'content') then raise exception 'تصاویر یا اطلاعات محتوای سایت معتبر نیست';end if;
  update platform_content set payload=p_body->'content',version=version+1,updated_at=now(),updated_by=p_uid where id='website' returning payload||jsonb_build_object('version',version) into v;
  insert into access_events(actor_id,action) values(p_uid,'platform_content_published');
 elsif p_path='/presence' and p_method='POST' then
  delete from presence where last_seen<now()-interval '1 day';insert into presence(visitor,user_id) values((p_body->>'visitor')::uuid,p_uid) on conflict(visitor) do update set user_id=excluded.user_id,last_seen=now();v=jsonb_build_object('ok',true);
 elsif p_path='/subscription' and p_method='GET' then
  if coalesce(access_role(p_uid,bid),'') not in ('owner','manager') then raise exception 'دسترسی مدیریت لازم است';end if;active_plan=platform_plan(bid);
  v=jsonb_build_object('plan',active_plan,'expiresAt',(select expires_at from business_subscriptions where business_id=bid and expires_at>now() and status='active'),'sandbox',true,'products',(select count(*) from products where business_id=bid and status='active'),'points',(select count(*) from service_points where business_id=bid),'productLimit',catalog_limit(bid),'pointLimit',(select limit_value from plan_entitlements where plan_id=active_plan and feature='points'),
   'payments',(select coalesce(jsonb_agg(x),'[]') from(select id,plan,amount_toman as "amountToman",status,ref_id as "refId",created_at as "createdAt",sandbox from platform_payments where business_id=bid order by created_at desc limit 50)x));
 elsif p_path='/messages' and p_method='GET' then
  select coalesce(jsonb_agg(x),'[]') into v from(select b.id,b.title,b.body,b.created_at,r.read_at from business_messages b join message_receipts r on r.message_id=b.id and r.user_id=p_uid where b.business_id=bid order by b.created_at desc limit 100)x;
 elsif p_path='/messages/read' and p_method='POST' then
  update message_receipts set read_at=coalesce(read_at,now()) where user_id=p_uid and message_id=(p_body->>'id')::uuid and exists(select 1 from business_messages b where b.id=message_id and b.business_id=bid);v=jsonb_build_object('ok',true);
 elsif p_path='/admin/messages' and p_method='POST' then
  if not exists(select 1 from platform_roles where user_id=p_uid) then raise exception 'دسترسی ادمین لازم است';end if;
  if length(trim(coalesce(p_body->>'title',''))) not between 1 and 100 or length(trim(coalesce(p_body->>'body',''))) not between 1 and 2000 then raise exception 'عنوان و متن پیام را کامل کن';end if;
  with inserted as(insert into business_messages(sender,business_id,title,body) select p_uid,b.id,trim(p_body->>'title'),trim(p_body->>'body') from businesses b where (p_body->>'business'='all' or b.id=p_body->>'business') and exists(select 1 from business_memberships m where m.business_id=b.id and m.status='active' and m.role in ('owner','manager')) returning id,business_id)
  insert into message_receipts(message_id,user_id) select i.id,m.user_id from inserted i join business_memberships m on m.business_id=i.business_id where m.status='active' and m.role in ('owner','manager');get diagnostics n=row_count;
  if n=0 then raise exception 'گیرنده‌ای پیدا نشد';end if;v=jsonb_build_object('sent',n);insert into access_events(actor_id,action,details) values(p_uid,'admin_message',jsonb_build_object('recipient',p_body->>'business','count',n));
 else return null;end if;return jsonb_build_object('status',200,'data',v);
 exception when others then return jsonb_build_object('status',400,'data',jsonb_build_object('error',case when sqlstate='P0001' then sqlerrm else 'اطلاعات پلتفرم معتبر نیست' end));end $$;
create or replace function public.menu_billing(p_op text,p_uid uuid,p_body jsonb default '{}') returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare bid text;p platform_payments;until_at timestamptz;selected plans;begin
 select active_business_id into bid from profiles where user_id=p_uid;
 if coalesce(access_role(p_uid,bid),'') not in ('owner','manager') then raise exception 'حساب مدیریت فعال لازم است';end if;
 perform 1 from businesses where id=bid for update;
 if p_op='create' then
  select * into selected from plans where id=p_body->>'plan' and price_toman>0;if selected.id is null or p_body->>'requestId' is null then raise exception 'طرح یا شناسه درخواست معتبر نیست';end if;
  select * into p from platform_payments where user_id=p_uid and request_id=(p_body->>'requestId')::uuid;
  if p.id is not null then if p.business_id<>bid or p.plan<>selected.id then raise exception 'CONFLICT: درخواست پرداخت تغییر کرده است';end if;
  else
   if platform_plan(bid)='special' and selected.id='growth' then raise exception 'تا پایان اعتبار طرح ویژه، کاهش طرح ممکن نیست';end if;
   insert into platform_payments(user_id,business_id,plan,gateway_amount_rial,request_id) values(p_uid,bid,selected.id,selected.price_toman*10,(p_body->>'requestId')::uuid) returning * into p;
   insert into platform_payment_events(payment_id,action) values(p.id,'created');
  end if;
 else
  select * into p from platform_payments where id=(p_body->>'id')::uuid and user_id=p_uid and business_id=bid for update;if p.id is null then raise exception 'پرداخت پیدا نشد؛ مجموعه خریدار را انتخاب کن';end if;
  if p_op='attach' then
   if p.status='pending' and p.authority is null then
    if coalesce(p_body->>'authority','') !~ '^S[0-9A-Za-z]{10,100}$' then raise exception 'شناسه درگاه معتبر نیست';end if;
    update platform_payments set authority=p_body->>'authority',updated_at=now() where id=p.id returning * into p;insert into platform_payment_events(payment_id,action) values(p.id,'gateway_attached');
   end if;
  elsif p_op='paid' then
   if p.authority is null or p.authority is distinct from p_body->>'authority' or p.status not in ('pending','paid') or length(coalesce(p_body->>'refId','')) not between 1 and 100 then raise exception 'اطلاعات پرداخت معتبر نیست';end if;
   if p.status='pending' then
    if platform_plan(bid)='special' and p.plan='growth' then raise exception 'طرح فعال تغییر کرده است؛ بررسی پشتیبانی لازم است';end if;
    select greatest(now(),expires_at) into until_at from business_subscriptions where business_id=bid and status='active';until_at=coalesce(until_at,now())+make_interval(days=>(select days from plans where id=p.plan));
    insert into business_subscriptions(business_id,plan,expires_at,payment_id) values(bid,p.plan,until_at,p.id) on conflict(business_id) do update set plan=excluded.plan,expires_at=excluded.expires_at,payment_id=excluded.payment_id,status='active';
    update platform_payments set status='paid',ref_id=p_body->>'refId',updated_at=now() where id=p.id returning * into p;
    insert into platform_payment_events(payment_id,action,data) values(p.id,'verified',jsonb_build_object('refId',p.ref_id,'expiresAt',until_at));
   end if;
  elsif p_op='cancel' then if p.status='pending' then update platform_payments set status='cancelled',updated_at=now() where id=p.id returning * into p;insert into platform_payment_events(payment_id,action) values(p.id,'cancelled');end if;
  elsif p_op<>'get' then raise exception 'عملیات معتبر نیست';end if;
 end if;return (to_jsonb(p)-'user_id'-'request_id')||jsonb_build_object('amount',p.gateway_amount_rial);
end $$;
create trigger platform_payment_events_immutable before update or delete on platform_payment_events for each row execute function order_append_only();
-- Replace live references, retaining migration files as history only.
do $$ declare ddl text;f record;begin
 for f in select p.oid::regprocedure sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('access_api','menu_api_v2')loop
  select pg_get_functiondef(f.sig) into ddl;
  ddl=replace(ddl,'menu_presence','presence');
  if f.sig::text like '%access_api%' then
   ddl=replace(ddl,$x$select id,business_id,title,body,created_at,read_at from menu_messages order by created_at desc limit 40$x$,$x$select b.id,b.business_id,b.title,b.body,b.created_at,(select max(read_at) from message_receipts where message_id=b.id) read_at from business_messages b order by b.created_at desc limit 40$x$);
  end if;execute ddl;
 end loop;
 select pg_get_functiondef('access_authorize(text,text,jsonb,uuid)'::regprocedure) into ddl;ddl=replace(ddl,$x$'/health','/public/menu'$x$,$x$'/public/content','/health','/public/menu'$x$);execute ddl;
 select pg_get_functiondef('menu_api_v2(text,text,jsonb,uuid)'::regprocedure) into ddl;ddl=replace(ddl,'answer=order_api(', 'answer=platform_api(p_path,p_method,p_body,p_uid);if answer is not null then return answer;end if;answer=order_api(');execute ddl;
end $$;
do $$ declare t text;f record;begin
 foreach t in array array['plans','plan_entitlements','business_subscriptions','platform_payments','platform_payment_events','business_messages','message_receipts','presence','platform_content','platform_media']loop execute format('alter table public.%I enable row level security',t);execute format('revoke all on public.%I from public,anon,authenticated',t);execute format('grant all on public.%I to service_role',t);end loop;
 for f in select p.oid::regprocedure sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'platform_%' loop execute format('revoke all on function %s from public,anon,authenticated',f.sig);execute format('grant execute on function %s to service_role',f.sig);end loop;
end $$;
commit;
