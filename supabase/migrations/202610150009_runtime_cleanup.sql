-- Package 10: remove migration facades from the running system, not the migration history.
begin;
do $$ declare ddl text;begin
 select pg_get_functiondef('access_api(text,text,jsonb,uuid)'::regprocedure) into ddl;
 ddl=regexp_replace(ddl,$rx$   s=jsonb_build_object\('business'.*?   insert into menu_workspaces\(id,payload\) values\(bid,s\);$rx$,$new$
   insert into businesses(id,name,kind_code,settings) values(bid,trim(p_body->>'businessName'),'restaurant',jsonb_build_object('phone',ph,'orderAcceptanceActive',true));
   insert into menus(business_id,id,title,kind_code,status) values(bid,'main','منوی اصلی','restaurant','published');
   insert into menu_appearance(business_id,menu_id) values(bid,'main');
   insert into service_points(business_id,id,code,label,section,table_number) select bid,'point-'||gen_random_uuid(),i::text,'میز '||i,'main',i from generate_series(1,5)i;
   insert into qr_links(business_id,service_point_id) select business_id,id from service_points where business_id=bid;
 $new$,'ns');
 ddl=replace(ddl,$x$from businesses b join menu_workspaces w on w.id=b.id$x$,$x$from businesses b$x$);
 ddl=replace(ddl,$x$jsonb_array_length(w.payload->'orders')$x$,$x$(select count(*) from orders where business_id=b.id)$x$);
 ddl=replace(ddl,$x$(select count(*) from jsonb_array_elements(w.payload->'orders')o where o->>'status' not in ('delivered','cancelled'))$x$,$x$(select count(*) from orders where business_id=b.id and status not in ('delivered','cancelled'))$x$);
 ddl=replace(ddl,$x$(select coalesce(sum(jsonb_array_length(payload->'orders')),0) from menu_workspaces)$x$,$x$(select count(*) from orders)$x$);
 ddl=replace(ddl,$x$from menu_accounts a join auth.users u on u.id=a.user_id$x$,$x$from (select prf.user_id,prf.active_business_id business_id,case when exists(select 1 from platform_roles where user_id=prf.user_id) then 'admin' else coalesce((select case when role in ('owner','manager') then 'manager' else role end from business_memberships where user_id=prf.user_id and business_id=prf.active_business_id and status='active'),'manager') end role,prf.status='blocked' is_banned,(select terms_version from terms_acceptances where user_id=prf.user_id order by accepted_at desc limit 1) terms_version from profiles prf) a join auth.users u on u.id=a.user_id$x$);
 -- Messaging is handled exclusively by platform_api before access_api.
 ddl=regexp_replace(ddl,$rx$ elsif p_path='/admin/messages' and p_method='POST' then.*?(?= else return null;end if;)$rx$,'','ns');
 if ddl like '%menu_workspaces%' or ddl like '%menu_accounts%' or ddl like '%menu_messages%' then raise exception 'ACCESS_LEGACY_REMAINS: %',(select string_agg(line,E'\n') from regexp_split_to_table(ddl,E'\n') line where line like '%menu_workspaces%' or line like '%menu_accounts%' or line like '%menu_messages%');end if;execute ddl;
 select pg_get_functiondef('catalog_api(text,text,jsonb,uuid)'::regprocedure) into ddl;
 ddl=replace(ddl,'a menu_accounts;','a record;');
 ddl=replace(ddl,'select * into a from menu_accounts where user_id=p_uid;','select user_id,active_business_id business_id,status=''blocked'' is_banned into a from profiles where user_id=p_uid;');
 -- Public content has its own route and cannot be written as a business setting.
 ddl=replace(ddl,$x$if p_path='/workspace' and p_method='GET' then$x$,$x$if p_path='/business' and p_body ? 'websiteContent' then raise exception 'محتوای سایت را از پنل ادمین تنظیم کن';end if;
 if p_path='/workspace' and p_method='GET' then$x$);execute ddl;
 select pg_get_functiondef('catalog_workspace_snapshot(text)'::regprocedure) into ddl;
 ddl=replace(ddl,'select w.payload||jsonb_build_object','select jsonb_build_object');
 ddl=replace(ddl,'from menu_workspaces w join businesses b on b.id=w.id where w.id=bid','from businesses b where b.id=bid');execute ddl;
end $$;
create or replace function public.menu_api_v2(p_path text,p_method text,p_body jsonb default '{}',p_uid uuid default null) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare guard jsonb;answer jsonb;bid text;r text;v jsonb;begin
 guard=access_authorize(p_path,p_method,p_body,p_uid);
 if guard->'allowed' is distinct from 'true'::jsonb then return jsonb_build_object('status',(guard->>'status')::integer,'data',guard-'allowed'-'status');end if;
 if p_path='/health' then return jsonb_build_object('status',200,'data',jsonb_build_object('ok',true,'provider','supabase','demo',false,'catalogVersion',1,'accessVersion',1,'pointVersion',1,'orderVersion',1,'platformVersion',1,'runtimeVersion',2));end if;
 answer=platform_api(p_path,p_method,p_body,p_uid);if answer is not null then return answer;end if;
 answer=order_api(p_path,p_method,p_body,p_uid);if answer is not null then return answer;end if;
 answer=point_api(p_path,p_method,p_body,p_uid);if answer is not null then return answer;end if;
 answer=access_api(p_path,p_method,p_body,p_uid);if answer is not null then return answer;end if;
 if p_path='/public/feed' and p_method='GET' then
  select coalesce(jsonb_agg(q.data),'[]') into v from(select jsonb_build_object('id',o.id,'name',b.name,'items',(select string_agg(quantity::text||' '||name_snapshot,' · ' order by sort_order) from order_items where business_id=o.business_id and order_id=o.id),'image',(select catalog_product(o.business_id,product_id)->>'imageUrl' from order_items where business_id=o.business_id and order_id=o.id order by sort_order limit 1),'createdAt',o.created_at) data from orders o join businesses b on b.id=o.business_id where o.status not in ('delivered','cancelled') and b.status='active' order by o.created_at desc limit 15)q;return jsonb_build_object('status',200,'data',v);
 end if;
 answer=catalog_api(p_path,p_method,p_body,p_uid);
 select active_business_id into bid from profiles where user_id=p_uid;r=access_role(p_uid,bid);
 if p_path='/workspace' and answer->>'status'='200' and r='kitchen' then
  select coalesce(jsonb_agg(access_kitchen_order(o)),'[]') into v from jsonb_array_elements(answer#>'{data,orders}')o where o->>'status' in ('cooking','ready','delivered');
  return jsonb_build_object('status',200,'data',jsonb_build_object('business',jsonb_build_object('id',bid,'name',answer#>>'{data,business,name}'),'menus','[]'::jsonb,'products','[]'::jsonb,'categories','[]'::jsonb,'servicePoints','[]'::jsonb,'serviceCalls','[]'::jsonb,'orders',v));
 end if;return answer;
exception when others then return jsonb_build_object('status',400,'data',jsonb_build_object('error',case when sqlstate='P0001' then sqlerrm else 'درخواست معتبر نیست' end));end $$;
drop function public.menu_api(text,text,jsonb,uuid);
drop view public.menu_accounts;
drop trigger catalog_workspace_strip on public.menu_workspaces;
drop trigger catalog_workspace_import on public.menu_workspaces;
drop trigger point_workspace_import on public.menu_workspaces;
drop function public.catalog_workspace_write();
drop function public.catalog_new_workspace();
drop function public.point_new_workspace();
drop function public.catalog_import(text);
alter table businesses drop constraint businesses_id_fkey;
-- Unknown legacy fields are retained as a locked migration archive, never a runtime writer.
alter table public.menu_workspaces rename to migration_workspace_archive;
revoke all on public.migration_workspace_archive from public,anon,authenticated,service_role;
do $$ declare f record;begin
 if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and (p.prosrc like '%menu_workspaces%' or p.prosrc like '%menu_accounts%' or p.prosrc like '%menu_subscriptions%' or p.prosrc like '%menu_payments%' or p.prosrc like '%menu_messages%' or p.prosrc like '%menu_presence%')) then raise exception 'RUNTIME_LEGACY_REFERENCE';end if;
 for f in select p.oid::regprocedure sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('menu_api_v2','catalog_api','catalog_workspace_snapshot','access_api')loop execute format('revoke all on function %s from public,anon,authenticated',f.sig);execute format('grant execute on function %s to service_role',f.sig);end loop;
end $$;
commit;
