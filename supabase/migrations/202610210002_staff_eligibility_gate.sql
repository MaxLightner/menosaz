-- Preserve active-business gate for both waiter and kitchen phone eligibility.
begin;
create or replace function public.mizato_staff_allowed(bid text,raw_phone text) returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
 select (
  exists(select 1 from mizato_staff where business_id=bid and phone=mizato_phone(raw_phone) and role='waiter' and status='active')
  or exists(select 1 from business_memberships m join auth.users u on u.id=m.user_id
    where m.business_id=bid and m.role='kitchen' and m.status='active'
    and u.phone_confirmed_at is not null
    and replace(u.phone,'+','')=mizato_phone(raw_phone))
 ) and exists(select 1 from businesses where id=bid and status='active');
$$;
commit;
