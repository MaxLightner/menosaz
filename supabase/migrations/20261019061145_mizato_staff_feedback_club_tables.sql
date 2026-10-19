begin;

-- Employee approval is independent of the employee's first OTP login.
create table public.mizato_staff (
 business_id text not null references public.businesses(id),
 phone text not null check(phone ~ '^989[0-9]{9}$'),
 name text not null check(length(trim(name)) between 2 and 100),
 role text not null default 'waiter' check(role in ('waiter','kitchen')),
 status text not null default 'active' check(status in ('active','disabled')),
 shift_days integer[] not null default '{}' check(shift_days <@ array[1,2,3,4,5,6,7]),
 shift_start time, shift_end time,
 user_id uuid references auth.users(id),
 approved_by uuid references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key(business_id,phone)
);
-- Preserve waiters added through the previous account-membership screen.
insert into public.mizato_staff(business_id,phone,name,role,status,user_id)
 select bm.business_id,
        regexp_replace(u.phone,'[^0-9]','','g'),
        coalesce(nullif(trim(p.display_name),''),'گارسون'),
        'waiter',bm.status,bm.user_id
 from public.business_memberships bm
 join auth.users u on u.id=bm.user_id
 join public.profiles p on p.user_id=bm.user_id
 where bm.role='waiter' and u.phone_confirmed_at is not null
   and regexp_replace(u.phone,'[^0-9]','','g') ~ '^989[0-9]{9}$'
on conflict (business_id,phone) do nothing;
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


commit;
