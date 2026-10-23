-- AI menu extraction budget: atomic fixed 24-hour window, reusing the existing rate-counter table.
-- Only the server's service_role may call this; browser/anonymous roles have no EXECUTE.
create or replace function public.ai_menu_daily_limit(p_key text,p_max integer)
returns boolean language plpgsql security definer
set search_path = 'public', 'pg_temp'
as $$
declare current_hits integer;
begin
  if p_key is null or length(p_key)>200 or p_key !~ '^ai-menu-day:[a-zA-Z0-9._:-]+$'
     or p_max is null or p_max not between 1 and 5 then
    raise exception 'Invalid AI menu budget request';
  end if;
  insert into public.menu_limits(id,hits,expires)
  values(p_key,1,now()+interval '24 hours')
  on conflict(id) do update set
    hits=case when menu_limits.expires <= now() then 1 else menu_limits.hits+1 end,
    expires=case when menu_limits.expires <= now() then now()+interval '24 hours' else menu_limits.expires end
  returning hits into current_hits;
  return current_hits<=p_max;
end
$$;
revoke all on function public.ai_menu_daily_limit(text,integer) from PUBLIC, anon, authenticated;
grant execute on function public.ai_menu_daily_limit(text,integer) to service_role;
