create or replace function public.mizato_staff_claim(p_uid uuid,p_phone text,p_business text) returns jsonb
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
  active_business_id=excluded.active_business_id,profile_completed=true,
  display_name=case when profiles.display_name='' then excluded.display_name else profiles.display_name end;
 insert into business_memberships(business_id,user_id,role,status)
 values(p_business,p_uid,'waiter','active')
 on conflict(business_id,user_id) do update set role='waiter',status='active',updated_at=now();
 update mizato_staff set user_id=p_uid,updated_at=now() where business_id=p_business and phone=real_phone;
 return jsonb_build_object('ok',true,'name',staff.name);
end $$;

create or replace function public.mizato_staff_api(p_path text,p_body jsonb,p_uid uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare bid text; role_name text; normalized_phone text; emp mizato_staff;
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
  normalized_phone=mizato_phone(p_body->>'phone');
  if length(trim(coalesce(p_body->>'name',''))) not between 2 and 100 then raise exception 'نام گارسون را وارد کن';end if;
  if p_body ? 'days' and jsonb_typeof(p_body->'days')<>'array' then raise exception 'روزهای کاری معتبر نیست';end if;
  if length(coalesce(p_body->>'start',''))>0 and coalesce(p_body->>'start','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then raise exception 'ساعت شروع معتبر نیست';end if;
  if length(coalesce(p_body->>'end',''))>0 and coalesce(p_body->>'end','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then raise exception 'ساعت پایان معتبر نیست';end if;
  if (p_body->>'status') not in ('active','disabled') then raise exception 'وضعیت گارسون معتبر نیست';end if;
  if ((nullif(p_body->>'start','') is null) <> (nullif(p_body->>'end','') is null)) then raise exception 'ساعت شروع و پایان باید هر دو وارد شوند';end if;
  insert into mizato_staff(business_id,phone,name,role,status,shift_days,shift_start,shift_end,approved_by)
  values(bid,normalized_phone,trim(p_body->>'name'),'waiter',p_body->>'status',
   coalesce((select array_agg(distinct d::int order by d::int) from jsonb_array_elements_text(coalesce(p_body->'days','[]')) d where d::int between 1 and 7),'{}'::int[]),
   nullif(p_body->>'start','')::time,nullif(p_body->>'end','')::time,p_uid)
  on conflict(business_id,phone) do update set
   name=excluded.name,status=excluded.status,shift_days=excluded.shift_days,
   shift_start=excluded.shift_start,shift_end=excluded.shift_end,updated_at=now();
  select * into emp from mizato_staff where business_id=bid and mizato_staff.phone=normalized_phone;
  if emp.status='disabled' then update mizato_staff_shifts set clock_out=now(),closed_reason='disabled_by_manager' where business_id=bid and user_id=emp.user_id and clock_out is null;end if;
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
  perform 1 from mizato_staff where business_id=bid and user_id=p_uid for update;
  select * into current_shift from mizato_staff_shifts where business_id=bid and user_id=p_uid and clock_out is null for update;
  if action='start' then
    if current_shift.id is null then
     insert into mizato_staff_shifts(business_id,user_id) values(bid,p_uid) returning * into current_shift;
    end if;
    return jsonb_build_object('status',200,'data',jsonb_build_object('ok',true,'clockIn',current_shift.clock_in));
  elsif action='finish' then
    if current_shift.id is null then raise exception 'شیفت باز وجود ندارد';end if;
    select * into emp from mizato_staff where business_id=bid and user_id=p_uid;
    elapsed=greatest(0,floor(extract(epoch from (now()-current_shift.clock_in))/60)::int);
    -- ISO-style display for Iranian working week: Saturday=1, Friday=7.
    day_no=((extract(dow from (current_shift.clock_in at time zone (select timezone from businesses where id=bid)))::int+1)%7)+1;
    if emp.shift_start is not null and emp.shift_end is not null then
      scheduled=(extract(epoch from (emp.shift_end-emp.shift_start))/60)::int;
      if scheduled<=0 then scheduled=scheduled+1440;end if;
      if array_length(emp.shift_days,1)>0 and not (day_no=any(emp.shift_days)) then scheduled=0;end if;
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
