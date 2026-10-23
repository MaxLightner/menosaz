-- Server-only secret storage for Mizato platform AI integration.
-- Browser sessions NEVER call these RPCs: Edge Function authenticates the account
-- and uses its service-role client. Secret is encrypted at rest in Supabase Vault.
create or replace function public.mizato_admin_ai_config(
 p_uid uuid,p_action text,p_value text default null)
returns jsonb language plpgsql security definer
set search_path = 'public','vault','pg_temp'
as $$
declare sid uuid; modified timestamptz;
begin
 if p_uid is null or not exists (
   select 1 from public.platform_roles r
   join public.profiles p on p.user_id=r.user_id
   where r.user_id=p_uid and r.role='admin' and p.status='active'
 ) then raise exception 'Admin access required';end if;
 if p_action not in ('status','save') then raise exception 'Unsupported action';end if;
 if p_action='save' then
  if p_value is null or length(p_value) not between 20 and 512
     or left(p_value,3)<>'sk-' or p_value ~ '[[:space:][:cntrl:]]' then
   raise exception 'Invalid API key format';
  end if;
  select id into sid from vault.secrets where name='mizato_openai_api_key' for update;
  if sid is null then
    perform vault.create_secret(p_value,'mizato_openai_api_key','Mizato OpenAI API credential');
  else
    perform vault.update_secret(sid,p_value);
  end if;
  insert into public.access_events(actor_id,action,details)
   values(p_uid,'platform_ai_key_changed',jsonb_build_object('provider','openai'));
 end if;
 select updated_at into modified from vault.secrets where name='mizato_openai_api_key';
 return jsonb_build_object('configured',modified is not null,'updatedAt',modified);
end
$$;
revoke all on function public.mizato_admin_ai_config(uuid,text,text) from public,anon,authenticated;
grant execute on function public.mizato_admin_ai_config(uuid,text,text) to service_role;

create or replace function public.mizato_ai_key_runtime()
returns text language sql security definer
set search_path = 'public','vault','pg_temp'
as $$
 select decrypted_secret from vault.decrypted_secrets
 where name='mizato_openai_api_key'
 limit 1
$$;
revoke all on function public.mizato_ai_key_runtime() from public,anon,authenticated;
grant execute on function public.mizato_ai_key_runtime() to service_role;

create or replace function public.mizato_platform_admin_stats(p_uid uuid)
returns jsonb language plpgsql security definer
set search_path='public','pg_temp'
as $$
begin
 if p_uid is null or not exists (
  select 1 from public.platform_roles r join public.profiles p on p.user_id=r.user_id
  where r.user_id=p_uid and r.role='admin' and p.status='active'
 ) then raise exception 'Admin access required';end if;
 return jsonb_build_object(
 'activeVenues',(select count(*) from public.businesses where status='active'),
 'emptyVenues',(select count(*) from public.businesses b
  where b.status='active' and not exists(select 1 from public.products p where p.business_id=b.id and p.status='active')),
 'blockedAccounts',(select count(*) from public.profiles where status='blocked'),
 'ordersToday',(select count(*) from public.orders where created_at>=date_trunc('day',now())),
 'openOrders',(select count(*) from public.orders where status not in ('delivered','cancelled')),
 'activeSubscriptions',(select count(distinct business_id) from public.business_subscriptions where status='active' and expires_at>now()),
 'aiRequests24h',(select coalesce(sum(hits),0) from public.menu_limits where id like 'ai-menu-day:%' and expires>now())
 );
end
$$;
revoke all on function public.mizato_platform_admin_stats(uuid) from public,anon,authenticated;
grant execute on function public.mizato_platform_admin_stats(uuid) to service_role;
