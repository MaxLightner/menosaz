begin;

-- Employee approval is independent of the employee's first OTP login.
create table public.mizato_staff (
 business_id text not null references public.businesses(id),
 phone text not null check(phone ~ '^989[0-9]{9}$'),
 name text not null check(length(trim(name)) between 2 and 100),
 role text not null default 'waiter' check(role in ('waiter','kitchen')),
 status text not null default 'active' check(status in ('active','disabled')),
 shift_days integer[] not null default '{}' check(array_position(shift_days,0) is null),
 shift_start time, shift_end time,
 user_id uuid references auth.users(id),
 approved_by uuid references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key(business_id,phone)
);
create unique index mizato_staff_user_unique on public.mizato_staff(business_id,user_id) where user_id is not null;
create table public.mizato_staff_shifts(
 id uuid primary key default gen_random_uuid(),
 business_id text not null references public.businesses(id),
 user_id uuid not null references auth.users(id),
 clock_in timestamptz not null default now(),
 clock_out timestamptz,
 overtime_minutes integer,
 closed_reason text,
 created_at timestamptz not null default now(),
 check(clock_out is null or clock_out >= clock_in)
);
create unique index mizato_staff_one_open_shift on public.mizato_staff_shifts(business_id,user_id) where clock_out is null;
create index mizato_staff_shift_history on public.mizato_staff_shifts(business_id,user_id,clock_in desc);

create table public.mizato_feedback(
 id uuid primary key default gen_random_uuid(),
 business_id text not null,
 order_id text not null,
 guest_id text not null,
 food_rating smallint not null check(food_rating between 1 and 5),
 service_rating smallint not null check(service_rating between 1 and 5),
 comment text not null default '' check(length(comment)<=1000),
 anonymous boolean not null default false,
 phone text,
 marketing_consent boolean not null default false,
 created_at timestamptz not null default now(),
 unique(business_id,order_id,guest_id),
 foreign key(business_id,order_id) references public.orders(business_id,id),
 check((anonymous and phone is null and not marketing_consent) or (not anonymous and phone ~ '^989[0-9]{9}$'))
);
create index mizato_feedback_business_created on public.mizato_feedback(business_id,created_at desc);

create table public.mizato_customer_club(
 business_id text not null references public.businesses(id),
 phone text not null check(phone ~ '^989[0-9]{9}$'),
 marketing_consent boolean not null default false,
 consent_at timestamptz,
 consent_revoked_at timestamptz,
 unsubscribe_token uuid not null default gen_random_uuid(),
 joined_at timestamptz not null default now(),
 last_feedback_at timestamptz,
 primary key(business_id,phone),
 unique(unsubscribe_token)
);
create index mizato_club_consent on public.mizato_customer_club(business_id,marketing_consent);

do $$ declare table_name text;begin
 foreach table_name in array array['mizato_staff','mizato_staff_shifts','mizato_feedback','mizato_customer_club'] loop
  execute format('alter table public.%I enable row level security',table_name);
  execute format('revoke all on public.%I from public,anon,authenticated',table_name);
  execute format('grant all on public.%I to service_role',table_name);
 end loop;
end $$;

create function public.mizato_phone(raw text) returns text
language plpgsql immutable set search_path=public,pg_temp as $$
declare value text;
begin
 value=regexp_replace(coalesce(raw,''),'[^0-9]','','g');
 if value ~ '^09[0-9]{9}$' then value='98'||substr(value,2);end if;
 if value !~ '^989[0-9]{9}$' then raise exception 'شماره موبایل معتبر نیست';end if;
 return value;
end $$;

create function public.mizato_staff_allowed(bid text,raw_phone text) returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from mizato_staff where business_id=bid and phone=mizato_phone(raw_phone) and role='waiter' and status='active')
 and exists(select 1 from businesses where id=bid and status='active');
$$;

-- Called ONLY after Supabase Auth/OTPy has established the UID and verified phone.
create function public.mizato_staff_claim(p_uid uuid,p_phone text,p_business text) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare staff mizato_staff; existing_role text; real_phone text;
begin
 select replace(phone,'+','') into real_phone from auth.users where id=p_uid and phone_confirmed_at is not null;
 if real_phone is null or real_phone<>mizato_phone(p_phone) then raise exception 'شماره تأییدشده با حساب مطابقت ندارد';end if;
 select * into staff from mizato_staff where business_id=p_business and phone=real_phone and role='waiter' and status='active' for update;
 if not found then raise exception 'این شماره در فهرست گارسون‌های فعال رستوران ثبت نشده است';end if;
 existing_role=access_role(p_uid,p_business);
 if existing_role is not null and existing_role<>'waiter' then raise exception 'این حساب قبلاً با نقش دیگری تعریف شده است';end if;
 insert into profiles(user_id,display_name,active_business_id,profile_completed)
 values(p_uid,staff.name,p_business,true)
 on conflict(user_id) do update set
  active_business_id=excluded.active_business_id,
  display_name=case when profiles.display_name='' then excluded.display_name else profiles.display_name end;
 insert into business_memberships(business_id,user_id,role,status)
 values(p_business,p_uid,'waiter','active')
 on conflict(business_id,user_id) do update set role='waiter',status='active',updated_at=now();
 update mizato_staff set user_id=p_uid,updated_at=now() where business_id=p_business and phone=real_phone;
 return jsonb_build_object('ok',true,'name',staff.name);
end $$;

create function public.mizato_staff_api(p_path text,p_body jsonb,p_uid uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare bid text; role_name text; phone text; emp mizato_staff;
 action text; current_shift mizato_staff_shifts; elapsed int; scheduled int; result jsonb; day_no int;
begin
 if p_uid is null then return jsonb_build_object('status',401,'data',jsonb_build_object('error','ابتدا وارد حساب شو'));end if;
 select active_business_id into bid from profiles where user_id=p_uid;
 role_name=access_role(p_uid,bid);
 if role_name is null then return jsonb_build_object('status',403,'data',jsonb_build_object('error','عضویت فعال لازم است'));end if;

 if p_path='/staff/list' or p_path='/staff/save' or p_path='/staff/report' then
  if role_name not in ('owner','manager') then return jsonb_build_object('status',403,'data',jsonb_build_object('error','دسترسی مدیر لازم است'));end if;
 end if;

 if p_path='/staff/save' then
  phone=mizato_phone(p_body->>'phone');
  if length(trim(coalesce(p_body->>'name',''))) not between 2 and 100 then raise exception 'نام گارسون را وارد کن';end if;
  if p_body ? 'days' and jsonb_typeof(p_body->'days')<>'array' then raise exception 'روزهای کاری معتبر نیست';end if;
  if length(coalesce(p_body->>'start',''))>0 and coalesce(p_body->>'start','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then raise exception 'ساعت شروع معتبر نیست';end if;
  if length(coalesce(p_body->>'end',''))>0 and coalesce(p_body->>'end','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then raise exception 'ساعت پایان معتبر نیست';end if;
  if (p_body->>'status') not in ('active','disabled') then raise exception 'وضعیت گارسون معتبر نیست';end if;
  if (p_body->>'start') is null <> ((p_body->>'end') is null) then raise exception 'ساعت شروع و پایان باید هر دو وارد شوند';end if;
  insert into mizato_staff(business_id,phone,name,role,status,shift_days,shift_start,shift_end,approved_by)
  values(bid,phone,trim(p_body->>'name'),'waiter',p_body->>'status',
   coalesce((select array_agg(distinct d::int order by d::int) from jsonb_array_elements_text(coalesce(p_body->'days','[]')) d where d::int between 1 and 7),'{}'::int[]),
   nullif(p_body->>'start','')::time,nullif(p_body->>'end','')::time,p_uid)
  on conflict(business_id,phone) do update set
   name=excluded.name,status=excluded.status,shift_days=excluded.shift_days,
   shift_start=excluded.shift_start,shift_end=excluded.shift_end,updated_at=now();
  select * into emp from mizato_staff where business_id=bid and mizato_staff.phone=phone;
  if emp.user_id is not null then
   update business_memberships set status=emp.status,updated_at=now()
    where business_id=bid and user_id=emp.user_id and role='waiter';
  end if;
  return jsonb_build_object('status',200,'data',jsonb_build_object('ok',true));
 elsif p_path='/staff/list' or p_path='/staff/report' then
  select coalesce(jsonb_agg(jsonb_build_object(
   'phone',e.phone,'name',e.name,'role',e.role,'status',e.status,'days',to_jsonb(e.shift_days),
   'start',to_char(e.shift_start,'HH24:MI'),'end',to_char(e.shift_end,'HH24:MI'),
   'userId',e.user_id,'workMinutes',coalesce(stats.work_minutes,0),
   'overtimeMinutes',coalesce(stats.extra_minutes,0),'deliveries',coalesce(activity.deliveries,0),
   'actions',coalesce(activity.actions,0),'serviceRating',coalesce(ratings.score,0),
   'ratingCount',coalesce(ratings.total,0),'onShift',coalesce(stats.on_shift,false))
   order by e.name),'[]'::jsonb) into result
   from mizato_staff e
   left join lateral(select
    round(sum(extract(epoch from (coalesce(s.clock_out,now())-s.clock_in))/60))::int work_minutes,
    sum(coalesce(s.overtime_minutes,0))::int extra_minutes,
    bool_or(s.clock_out is null) on_shift
    from mizato_staff_shifts s where s.business_id=e.business_id and s.user_id=e.user_id)stats on true
   left join lateral(select count(*)::int actions,count(*)filter(where oe.action='deliver')::int deliveries
    from order_events oe where oe.business_id=e.business_id and oe.actor_id=e.user_id::text) activity on true
   left join lateral(select round(avg(f.service_rating)::numeric,2) score,count(*)::int total
    from mizato_feedback f join order_events oe on oe.business_id=f.business_id and oe.order_id=f.order_id
      and oe.action='deliver' and oe.actor_id=e.user_id::text
    where f.business_id=e.business_id)ratings on true
   where e.business_id=bid and e.role='waiter';
  return jsonb_build_object('status',200,'data',result);
 elsif p_path='/staff/mine' then
  if role_name<>'waiter' then return jsonb_build_object('status',403,'data',jsonb_build_object('error','فقط گارسون مجاز است'));end if;
  select * into emp from mizato_staff where business_id=bid and user_id=p_uid and status='active';
  if not found then return jsonb_build_object('status',403,'data',jsonb_build_object('error','گارسون ثبت نشده است'));end if;
  select * into current_shift from mizato_staff_shifts where business_id=bid and user_id=p_uid and clock_out is null;
  return jsonb_build_object('status',200,'data',jsonb_build_object(
    'name',emp.name,'phone',emp.phone,'onShift',current_shift.id is not null,
    'shiftStart',current_shift.clock_in,
    'recentShifts',coalesce((select jsonb_agg(jsonb_build_object('clockIn',s.clock_in,'clockOut',s.clock_out,'overtimeMinutes',s.overtime_minutes)
      order by s.clock_in desc) from (select * from mizato_staff_shifts where business_id=bid and user_id=p_uid order by clock_in desc limit 14)s),'[]'::jsonb),
    'actions',(select count(*) from order_events where business_id=bid and actor_id=p_uid::text),
    'deliveries',(select count(*) from order_events where business_id=bid and actor_id=p_uid::text and action='deliver')));
 elsif p_path='/staff/shift' then
  if role_name<>'waiter' or not exists(select 1 from mizato_staff where business_id=bid and user_id=p_uid and status='active')
   then return jsonb_build_object('status',403,'data',jsonb_build_object('error','دسترسی شیفت وجود ندارد'));end if;
  action=p_body->>'action';
  select * into current_shift from mizato_staff_shifts where business_id=bid and user_id=p_uid and clock_out is null for update;
  if action='start' then
    if current_shift.id is null then
     insert into mizato_staff_shifts(business_id,user_id) values(bid,p_uid) returning * into current_shift;
    end if;
    return jsonb_build_object('status',200,'data',jsonb_build_object('ok',true,'clockIn',current_shift.clock_in));
  elsif action='finish' then
    if current_shift.id is null then raise exception 'شیفت باز وجود ندارد';end if;
    select * into emp from mizato_staff where business_id=bid and user_id=p_uid;
    elapsed=greatest(0,round(extract(epoch from (now()-current_shift.clock_in))/60)::int);
    if emp.shift_start is not null and emp.shift_end is not null then
      scheduled=(extract(epoch from (emp.shift_end-emp.shift_start))/60)::int;
      if scheduled<=0 then scheduled=scheduled+1440;end if;
    else scheduled=null;end if;
    update mizato_staff_shifts set clock_out=now(),
      overtime_minutes=case when scheduled is null then null else greatest(0,elapsed-scheduled)end,
      closed_reason='employee' where id=current_shift.id;
    return jsonb_build_object('status',200,'data',jsonb_build_object('ok',true,'workedMinutes',elapsed,'overtimeMinutes',greatest(0,elapsed-coalesce(scheduled,elapsed))));
  end if;
  raise exception 'نوع عملیات شیفت معتبر نیست';
 end if;
 return jsonb_build_object('status',404,'data',jsonb_build_object('error','مسیر کارکنان وجود ندارد'));
exception when others then
 return jsonb_build_object('status',400,'data',jsonb_build_object('error',sqlerrm));
end $$;

create function public.mizato_feedback_submit(p_body jsonb) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare bid text=p_body->>'businessId';oid text=p_body->>'orderId'; sid text=p_body->>'sessionId';
 g session_guests; o orders; ph text; anon boolean=coalesce((p_body->>'anonymous')::boolean,false);
 consent boolean=coalesce((p_body->>'marketingConsent')::boolean,false); fid uuid;
begin
 if length(coalesce(bid,''))>100 or length(coalesce(oid,''))>120 or length(coalesce(sid,''))>120 then raise exception 'شناسه سفارش نامعتبر است';end if;
 if (p_body->>'foodRating')::int not between 1 and 5 or (p_body->>'serviceRating')::int not between 1 and 5 then raise exception 'امتیاز معتبر نیست';end if;
 if length(coalesce(p_body->>'comment',''))>1000 then raise exception 'نظر بیش از حد طولانی است';end if;
 g=order_guest(bid,sid,p_body->>'guestToken',false);
 select * into o from orders where business_id=bid and id=oid and session_id=sid and guest_id=g.id;
 if o.id is null then raise exception 'این سفارش متعلق به شما نیست';end if;
 if o.status<>'delivered' then raise exception 'امتیازدهی پس از تحویل سفارش فعال می‌شود';end if;
 if anon then
  if consent then raise exception 'نظر ناشناس نمی‌تواند عضو پیامک تبلیغاتی شود';end if;
  ph=null;
 else
  ph=mizato_phone(p_body->>'phone');
 end if;
 insert into mizato_feedback(business_id,order_id,guest_id,food_rating,service_rating,comment,anonymous,phone,marketing_consent)
 values(bid,oid,g.id,(p_body->>'foodRating')::int,(p_body->>'serviceRating')::int,
  left(coalesce(p_body->>'comment',''),1000),anon,ph,consent)
 on conflict(business_id,order_id,guest_id) do nothing returning id into fid;
 if fid is null then return jsonb_build_object('status',409,'data',jsonb_build_object('error','نظر این سفارش قبلاً ثبت شده است'));end if;
 if ph is not null then
  insert into mizato_customer_club(business_id,phone,marketing_consent,consent_at,last_feedback_at)
  values(bid,ph,consent,case when consent then now() end,now())
  on conflict(business_id,phone) do update set
   last_feedback_at=now(),
   marketing_consent=mizato_customer_club.marketing_consent or excluded.marketing_consent,
   consent_at=case when excluded.marketing_consent and not mizato_customer_club.marketing_consent then now() else mizato_customer_club.consent_at end,
   consent_revoked_at=case when excluded.marketing_consent then null else mizato_customer_club.consent_revoked_at end;
 end if;
 return jsonb_build_object('status',200,'data',jsonb_build_object('ok',true));
exception when others then
 return jsonb_build_object('status',400,'data',jsonb_build_object('error',sqlerrm));
end $$;

create function public.mizato_feedback_api(p_path text,p_body jsonb,p_uid uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare bid text;r text;data jsonb;
begin
 if p_uid is null then return jsonb_build_object('status',401,'data',jsonb_build_object('error','ورود مدیر لازم است'));end if;
 select active_business_id into bid from profiles where user_id=p_uid;
 r=access_role(p_uid,bid);
 if r not in ('owner','manager') then return jsonb_build_object('status',403,'data',jsonb_build_object('error','دسترسی مدیر لازم است'));end if;
 if p_path='/feedback/report' then
  select jsonb_build_object(
    'count',(select count(*) from mizato_feedback where business_id=bid),
    'foodAverage',(select round(avg(food_rating)::numeric,2) from mizato_feedback where business_id=bid),
    'serviceAverage',(select round(avg(service_rating)::numeric,2) from mizato_feedback where business_id=bid),
    'reviews',coalesce((select jsonb_agg(jsonb_build_object('id',f.id,'orderId',f.order_id,
      'foodRating',f.food_rating,'serviceRating',f.service_rating,'comment',f.comment,
      'anonymous',f.anonymous,'phone',case when f.anonymous then null else f.phone end,
      'createdAt',f.created_at) order by f.created_at desc)
      from (select * from mizato_feedback where business_id=bid order by created_at desc limit 100)f),'[]'::jsonb)) into data;
 elsif p_path='/club/list' then
  select coalesce(jsonb_agg(jsonb_build_object('phone',c.phone,'marketingConsent',c.marketing_consent,
   'joinedAt',c.joined_at,'lastFeedbackAt',c.last_feedback_at,
   'visits',(select count(distinct f.order_id) from mizato_feedback f where f.business_id=bid and f.phone=c.phone))
    order by c.joined_at desc),'[]'::jsonb) into data
  from mizato_customer_club c where c.business_id=bid;
 else return jsonb_build_object('status',404,'data',jsonb_build_object('error','مسیر بازخورد معتبر نیست'));end if;
 return jsonb_build_object('status',200,'data',data);
end $$;

-- Unsubscription uses an unguessable token, not a publicly writable phone field.
create function public.mizato_club_unsubscribe(p_token uuid) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 update mizato_customer_club set marketing_consent=false,consent_revoked_at=now()
 where unsubscribe_token=p_token;
 return jsonb_build_object('ok',true);
end $$;

do $$ declare function_name text;begin
 foreach function_name in array array[
  'mizato_phone(text)','mizato_staff_allowed(text,text)','mizato_staff_claim(uuid,text,text)',
  'mizato_staff_api(text,jsonb,uuid)','mizato_feedback_submit(jsonb)',
  'mizato_feedback_api(text,jsonb,uuid)','mizato_club_unsubscribe(uuid)'
 ] loop
  execute format('revoke all on function public.%s from public,anon,authenticated',function_name);
  execute format('grant execute on function public.%s to service_role',function_name);
 end loop;
end $$;
commit;
