create table if not exists public.menu_otp_requests(phone_hash text primary key,nonce uuid,expires timestamptz,next_send timestamptz,window_start timestamptz default now(),send_count integer default 0,day_start date default current_date,day_count integer default 0,attempts integer default 0,busy_until timestamptz,used boolean default false);
alter table public.menu_otp_requests enable row level security;
revoke all on public.menu_otp_requests from public,anon,authenticated;
grant all on public.menu_otp_requests to service_role;
create or replace function public.menu_otp_guard(p_phone text,p_op text,p_nonce uuid default null) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare k text=encode(sha256(convert_to(p_phone,'UTF8')),'hex');r public.menu_otp_requests;
begin
 insert into menu_otp_requests(phone_hash) values(k) on conflict do nothing;select * into r from menu_otp_requests where phone_hash=k for update;
 if p_op='send' then
  if r.next_send>now() then return jsonb_build_object('allowed',false,'retryAfter',greatest(1,ceil(extract(epoch from r.next_send-now()))::integer));end if;
  if r.window_start<now()-interval '1 hour' then r.window_start=now();r.send_count=0;end if;if r.day_start<>current_date then r.day_start=current_date;r.day_count=0;end if;
  if r.send_count>=3 or r.day_count>=10 then return jsonb_build_object('allowed',false,'retryAfter',3600);end if;
  r.nonce=gen_random_uuid();update menu_otp_requests set nonce=r.nonce,expires=now()+interval '2 minutes',next_send=now()+interval '60 seconds',window_start=r.window_start,send_count=r.send_count+1,day_start=r.day_start,day_count=r.day_count+1,attempts=0,busy_until=null,used=false where phone_hash=k;
  return jsonb_build_object('allowed',true,'challenge',r.nonce,'expiresIn',120,'resendIn',60);
 elsif p_op='verify' then
  if r.nonce is distinct from p_nonce or r.expires<now() or r.used or r.attempts>=5 or r.busy_until>now() then return jsonb_build_object('allowed',false);end if;
  update menu_otp_requests set attempts=attempts+1,busy_until=now()+interval '20 seconds' where phone_hash=k;return jsonb_build_object('allowed',true);
 elsif p_op in ('verified','release') then
  if r.nonce=p_nonce then update menu_otp_requests set used=case when p_op='verified' then true else used end,busy_until=null where phone_hash=k;end if;return jsonb_build_object('allowed',true);
 end if;return jsonb_build_object('allowed',false);
end $$;
revoke all on function public.menu_otp_guard(text,text,uuid) from public,anon,authenticated;
grant execute on function public.menu_otp_guard(text,text,uuid) to service_role;
create or replace function public.menu_phone_identity(p_phone text) returns uuid language sql security definer set search_path=public,pg_temp as $$select id from auth.users where replace(phone,'+','')=replace(p_phone,'+','') limit 1$$;
revoke all on function public.menu_phone_identity(text) from public,anon,authenticated;
grant execute on function public.menu_phone_identity(text) to service_role;
alter table public.menu_accounts add column if not exists profile_completed boolean not null default false;
create or replace function public.menu_profile(p_uid uuid,p_body jsonb default null) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare a public.menu_accounts;s jsonb;
begin
 select * into a from menu_accounts where user_id=p_uid;if a.user_id is null then raise exception 'حساب پیدا نشد';end if;select payload into s from menu_workspaces where id=a.business_id for update;
 if p_body is not null then
  if length(trim(coalesce(p_body->>'name','')))<2 or length(p_body->>'name')>80 or p_body->>'kind' not in ('restaurant','cafe','hotel','juice') then raise exception 'نام و نوع مجموعه را کامل کن';end if;
  s=jsonb_set(s,'{business}',(s->'business')||jsonb_build_object('name',trim(p_body->>'name'),'kind',p_body->>'kind','address',left(coalesce(p_body->>'address',''),300),'branchName',left(coalesce(p_body->>'branchName',''),80),'updatedAt',now()));update menu_workspaces set payload=s,updated_at=now() where id=a.business_id;update menu_accounts set profile_completed=true where user_id=p_uid;a.profile_completed=true;
 end if;
 return jsonb_build_object('business',s->'business','needsProfile',a.role<>'admin' and not a.profile_completed);
end $$;
revoke all on function public.menu_profile(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.menu_profile(uuid,jsonb) to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('menu-images','menu-images',true,1048576,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
