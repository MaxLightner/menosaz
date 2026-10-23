-- Repair Vault privilege error (42501) caused by SELECT FOR UPDATE.
-- Serialized by advisory transaction lock; neither keys nor ciphertext are logged.
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
  -- Vault protects its own rows and does not grant row-locking privileges to postgres.
  -- Serialize key rotation with a transaction advisory lock instead.
  perform pg_advisory_xact_lock(hashtextextended('mizato_openai_api_key',0));
  select id into sid from vault.secrets where name='mizato_openai_api_key';
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
