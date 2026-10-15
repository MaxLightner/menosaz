create or replace function public.menu_api(p_path text,p_method text,p_body jsonb default '{}',p_uid uuid default null) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if p_path='/health' then return jsonb_build_object('status',200,'data',jsonb_build_object('ok',true,'provider','supabase','demo',false,'catalogVersion',1));end if;
 if p_path in ('/workspace','/public/menu','/business','/menus','/menus/build','/products','/categories','/catalog/capabilities') or p_path like '/menus/%' or p_path like '/products/%' or p_path like '/categories/%' then
  return catalog_api(p_path,p_method,p_body,p_uid);
 end if;
 return menu_api_legacy_catalog(p_path,p_method,p_body,p_uid);
end $$;
revoke all on function public.menu_api(text,text,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.menu_api(text,text,jsonb,uuid) to service_role;

create or replace function public.menu_profile(p_uid uuid,p_body jsonb default null) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare a menu_accounts; b businesses;
begin
 select * into a from menu_accounts where user_id=p_uid;
 if a.user_id is null or a.is_banned then raise exception 'حساب فعال لازم است';end if;
 select * into b from businesses where id=a.business_id for update;
 if p_body is not null then
  if length(trim(coalesce(p_body->>'name','')))<2 or length(p_body->>'name')>80 or p_body->>'kind' not in ('restaurant','cafe','hotel','juice','wholesaler') then raise exception 'نام و نوع مجموعه را کامل کن';end if;
  update businesses set name=trim(p_body->>'name'),kind_code=p_body->>'kind',settings=settings||jsonb_build_object('address',left(coalesce(p_body->>'address',''),300),'branchName',left(coalesce(p_body->>'branchName',''),80)),version=version+1,updated_at=now() where id=a.business_id;
  update menu_accounts set profile_completed=true where user_id=p_uid;a.profile_completed=true;
 end if;
 return jsonb_build_object('business',catalog_workspace_snapshot(a.business_id)->'business','needsProfile',a.role<>'admin' and not a.profile_completed);
end $$;
revoke all on function public.menu_profile(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.menu_profile(uuid,jsonb) to service_role;

create trigger catalog_workspace_strip before update on public.menu_workspaces for each row execute function public.catalog_workspace_write();
create trigger catalog_workspace_import after insert on public.menu_workspaces for each row execute function public.catalog_new_workspace();
update public.menu_workspaces set payload=payload-array['business','menus','products','categories'];
commit;
