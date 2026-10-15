-- Package 5: QR identifies a business/service point, never a menu.
begin;
lock table public.menu_workspaces in access exclusive mode;
do $$ begin if current_setting('menosaz.backup_verified',true) is distinct from 'yes' then raise exception 'BACKUP_REQUIRED';end if;end $$;
create table public.service_points(
 business_id text not null references public.businesses(id),id text not null,code text not null,label text not null,
 kind text not null default 'table' check(kind in ('table','room','counter')),section text not null default 'main',
 table_number integer not null check(table_number between 1 and 9999),status text not null default 'active' check(status in ('active','disabled')),
 menu_mode text not null default 'all' check(menu_mode in ('all','selected')),is_occupied boolean not null default false,version bigint not null default 1,
 primary key(business_id,id),unique(business_id,code),unique(business_id,table_number)
);
create table public.service_point_menus(
 business_id text not null,service_point_id text not null,menu_id text not null,sort_order integer not null default 0,
 primary key(business_id,service_point_id,menu_id),foreign key(business_id,service_point_id) references public.service_points(business_id,id),
 foreign key(business_id,menu_id) references public.menus(business_id,id)
);
create table public.qr_links(
 token text primary key default replace(gen_random_uuid()::text,'-','') check(token ~ '^[a-f0-9]{32}$'),business_id text not null,service_point_id text not null,
 enabled boolean not null default true,created_at timestamptz not null default now(),unique(business_id,service_point_id),
 foreign key(business_id,service_point_id) references public.service_points(business_id,id)
);
alter table public.menus add column schedule_mode text not null default 'always' check(schedule_mode in ('always','scheduled'));
alter table public.menus add column timezone text not null default 'Asia/Tehran';
create table public.menu_time_windows(
 business_id text not null,menu_id text not null,weekday integer not null check(weekday between 1 and 7),
 start_minute integer not null check(start_minute between 0 and 1439),end_minute integer not null check(end_minute between 0 and 1440),
 end_day_offset integer not null default 0 check(end_day_offset in (0,1)),
 check(end_minute+end_day_offset*1440-start_minute between 1 and 1440),
 primary key(business_id,menu_id,weekday,start_minute),foreign key(business_id,menu_id) references public.menus(business_id,id)
);
insert into service_points(business_id,id,code,label,kind,section,table_number,is_occupied)
 select w.id,x->>'id',x->>'tableNumber',coalesce(x->>'label','میز '||(x->>'tableNumber')),case when x->>'kind' in ('table','room','counter') then x->>'kind' else 'table' end,coalesce(x->>'section','main'),(x->>'tableNumber')::integer,coalesce((x->>'isOccupied')::boolean,false)
 from menu_workspaces w cross join lateral jsonb_array_elements(coalesce(w.payload->'servicePoints','[]'))x;
insert into qr_links(business_id,service_point_id) select business_id,id from service_points;
do $$ declare t text;begin
 foreach t in array array['service_points','service_point_menus','qr_links','menu_time_windows'] loop
  execute format('alter table public.%I enable row level security',t);execute format('revoke all on public.%I from public,anon,authenticated',t);execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;
create function public.point_dto(bid text,pid text) returns jsonb language sql stable set search_path=public,pg_temp as $$
 select jsonb_build_object('id',p.id,'businessId',p.business_id,'tableNumber',p.table_number,'label',p.label,'kind',p.kind,'section',p.section,'isOccupied',p.is_occupied,'status',p.status,'menuMode',p.menu_mode,'version',p.version,
 'menuIds',(select coalesce(jsonb_agg(menu_id order by sort_order),'[]') from service_point_menus where business_id=bid and service_point_id=pid),
 'qrToken',q.token,'qrCodeUrl','https://maxlightner.github.io/menosaz/?q='||q.token)
 from service_points p join qr_links q on q.business_id=p.business_id and q.service_point_id=p.id where p.business_id=bid and p.id=pid;
$$;
create function public.point_menu_open(bid text,mid text,at_time timestamptz default now()) returns boolean language sql stable set search_path=public,pg_temp as $$
 select coalesce((select m.status='published' and (m.schedule_mode='always' or exists(
 select 1 from menu_time_windows w cross join lateral(select at_time at time zone m.timezone local_time)t
 where w.business_id=bid and w.menu_id=mid and
 ((extract(isodow from t.local_time)::int=w.weekday and extract(hour from t.local_time)::int*60+extract(minute from t.local_time)::int>=w.start_minute and (w.end_day_offset=1 or extract(hour from t.local_time)::int*60+extract(minute from t.local_time)::int<w.end_minute))
 or (w.end_day_offset=1 and extract(isodow from t.local_time-interval '1 day')::int=w.weekday and extract(hour from t.local_time)::int*60+extract(minute from t.local_time)::int<w.end_minute))
 )) from menus m where m.business_id=bid and m.id=mid),false);
$$;
create function public.point_menu_allowed(bid text,pid text,mid text,at_time timestamptz default now()) returns boolean language sql stable set search_path=public,pg_temp as $$
 select exists(select 1 from service_points p join businesses b on b.id=p.business_id where p.business_id=bid and p.id=pid and p.status='active' and b.status='active'
 and (p.menu_mode='all' or exists(select 1 from service_point_menus x where x.business_id=bid and x.service_point_id=pid and x.menu_id=mid)) and point_menu_open(bid,mid,at_time));
$$;
create function public.point_resolve(body jsonb) returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare bid text;pid text;mid text;available jsonb;s jsonb;chosen jsonb;
begin
 if coalesce(body->>'q','')<>'' then select q.business_id,q.service_point_id into bid,pid from qr_links q where token=body->>'q' and enabled;
 else bid=body->>'business';select id into pid from service_points where business_id=bid and table_number=(body->>'table')::integer;end if;
 if pid is null or not exists(select 1 from service_points p join businesses b on b.id=p.business_id where p.business_id=bid and p.id=pid and p.status='active' and b.status='active') then return jsonb_build_object('status',404,'data',jsonb_build_object('error','این کد یا سرویس‌پوینت فعال نیست','code','POINT_UNAVAILABLE'));end if;
 select coalesce(jsonb_agg(catalog_menu(bid,m.id) order by m.sort_order,m.id),'[]') into available from menus m where m.business_id=bid and point_menu_allowed(bid,pid,m.id);
 -- Legacy menu query is deliberately ignored. New requests may select only an allowed tab.
 mid=coalesce((select x->>'id' from jsonb_array_elements(available)x where x->>'id'=body->>'tab'),available#>>'{0,id}');
 s=catalog_workspace_snapshot(bid);chosen=case when mid is null then '{}'::jsonb else catalog_menu(bid,mid)->'appearance' end;
 return jsonb_build_object('status',200,'data',jsonb_build_object('business',(s->'business')||chosen,'menus',available,'activeMenuId',mid,'servicePoint',point_dto(bid,pid)-array['activeSession','menuIds','qrToken','version'],'servicePoints',jsonb_build_array(point_dto(bid,pid)-array['activeSession','menuIds','qrToken','version']),
 'products',coalesce((select jsonb_agg(catalog_product(bid,id) order by sort_order,id) from products where business_id=bid and menu_id=mid and status='active'),'[]'),
 'categories',coalesce((select jsonb_agg(jsonb_build_object('id',id,'menuId',menu_id,'name',title) order by sort_order,id) from categories where business_id=bid and menu_id=mid),'[]'),
 'orders','[]'::jsonb,'serviceCalls','[]'::jsonb,'message',case when mid is null then 'در این ساعت منویی برای این بخش فعال نیست؛ با مسئول مجموعه تماس بگیر.' end));
end $$;
create function public.point_api(p_path text,p_method text,p_body jsonb,p_uid uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare bid text;pid text;mid text;p service_points;v jsonb;w jsonb;idx integer=0;lim integer;n integer;
begin
 if p_path='/public/resolve' then return point_resolve(p_body);end if;
 select active_business_id into bid from profiles where user_id=p_uid;
 if p_path like '/menus/%/schedule' and p_method='POST' then
  mid=split_part(p_path,'/',3);perform 1 from menus where business_id=bid and id=mid for update;if not found then raise exception 'منو پیدا نشد';end if;
  if p_body->>'mode' is null or p_body->>'mode' not in ('always','scheduled') then raise exception 'زمان‌بندی معتبر انتخاب کن';end if;
  if p_body->>'mode'='scheduled' and (jsonb_typeof(p_body->'windows') is distinct from 'array' or jsonb_array_length(p_body->'windows') not between 1 and 28) then raise exception 'روز و ساعت را کامل کن';end if;
  if coalesce(p_body->>'timezone','Asia/Tehran') not in (select name from pg_timezone_names) then raise exception 'منطقه زمانی معتبر نیست';end if;
  delete from menu_time_windows where business_id=bid and menu_id=mid;
  if p_body->>'mode'='scheduled' then for w in select value from jsonb_array_elements(p_body->'windows')loop
   insert into menu_time_windows values(bid,mid,(w->>'weekday')::int,(w->>'startMinute')::int,(w->>'endMinute')::int,coalesce((w->>'endDayOffset')::int,0));
  end loop;end if;
  update menus set schedule_mode=p_body->>'mode',timezone=coalesce(p_body->>'timezone','Asia/Tehran'),version=version+1 where business_id=bid and id=mid;v=catalog_menu(bid,mid);
 elsif p_path='/service-points' and p_method='POST' then
  perform 1 from businesses where id=bid for update;lim=catalog_limit(bid);
  if lim is not null and (select count(*) from service_points where business_id=bid and status='active')>=5 then raise exception 'PLAN_LIMIT: سقف سرویس‌پوینت طرح شروع پنج مورد است';end if;
  n=(p_body->>'tableNumber')::int;pid='point-'||gen_random_uuid();
  insert into service_points(business_id,id,code,label,kind,table_number) values(bid,pid,n::text,left(coalesce(nullif(trim(p_body->>'label'),''),'میز '||n),80),coalesce(p_body->>'kind','table'),n);
  insert into qr_links(business_id,service_point_id) values(bid,pid);v=point_dto(bid,pid);
 elsif (p_path like '/service-points/%' or p_path like '/tables/%') and p_method in ('PATCH','POST') then
  if p_path like '/tables/%' then select * into p from service_points where business_id=bid and table_number=split_part(p_path,'/',3)::int for update;else select * into p from service_points where business_id=bid and id=split_part(p_path,'/',3) for update;end if;
  if p.id is null then raise exception 'سرویس‌پوینت پیدا نشد';end if;pid=p.id;
  if (p_body-array['isOccupied'])<>'{}'::jsonb and coalesce(access_role(p_uid,bid),'') not in ('owner','manager') then raise exception 'دسترسی مدیریت مجموعه لازم است';end if;
  if p_body ? 'expectedVersion' and (p_body->>'expectedVersion')::bigint<>p.version then raise exception 'CONFLICT: تنظیمات نقطه تغییر کرده است';end if;
  if p_body ? 'menuMode' then
   if p_body->>'menuMode' not in ('all','selected') then raise exception 'نوع نمایش معتبر نیست';end if;
   delete from service_point_menus where business_id=bid and service_point_id=pid;
   if p_body->>'menuMode'='selected' then
    if jsonb_typeof(p_body->'menuIds') is distinct from 'array' or jsonb_array_length(p_body->'menuIds')=0 then raise exception 'حداقل یک منو انتخاب کن';end if;
    for mid in select jsonb_array_elements_text(p_body->'menuIds') loop insert into service_point_menus values(bid,pid,mid,idx);idx=idx+1;end loop;
   end if;
  end if;
  update service_points set label=coalesce(nullif(trim(p_body->>'label'),''),label),menu_mode=coalesce(p_body->>'menuMode',menu_mode),is_occupied=coalesce((p_body->>'isOccupied')::boolean,is_occupied),version=version+1 where business_id=bid and id=pid;v=point_dto(bid,pid);
 else return null;end if;
 return jsonb_build_object('status',200,'data',v);
exception when others then return jsonb_build_object('status',case when sqlerrm like 'CONFLICT:%' or sqlerrm like 'PLAN_LIMIT:%' then 409 else 400 end,'data',jsonb_build_object('error',case when sqlstate='P0001' then sqlerrm else 'اطلاعات سرویس‌پوینت یا ساعت معتبر نیست' end));
end $$;
-- Extend DTOs without storing a second copy of point/menu state in workspace JSON.
do $$ declare ddl text;begin
 select pg_get_functiondef('public.catalog_workspace_snapshot(text)'::regprocedure) into ddl;
 ddl=replace(ddl,$txt$'catalogVersion',1)$txt$,$txt$'catalogVersion',1,'servicePoints',coalesce((select jsonb_agg(point_dto(bid,id) order by table_number) from service_points where business_id=bid),'[]'::jsonb))$txt$);execute ddl;
 select pg_get_functiondef('public.catalog_menu(text,text)'::regprocedure) into ddl;
 ddl=replace(ddl,$txt$'version',m.version,$txt$,$txt$'version',m.version,'scheduleMode',m.schedule_mode,'timezone',m.timezone,'windows',coalesce((select jsonb_agg(jsonb_build_object('weekday',weekday,'startMinute',start_minute,'endMinute',end_minute,'endDayOffset',end_day_offset)) from menu_time_windows where business_id=bid and menu_id=mid),'[]'::jsonb),$txt$);execute ddl;
 select pg_get_functiondef('public.menu_api_v2(text,text,jsonb,uuid)'::regprocedure) into ddl;
 ddl=replace(ddl,'answer=access_api(p_path,p_method,p_body,p_uid);', 'answer=point_api(p_path,p_method,p_body,p_uid);if answer is not null then return answer;end if;answer=access_api(p_path,p_method,p_body,p_uid);');execute ddl;
 select pg_get_functiondef('public.access_authorize(text,text,jsonb,uuid)'::regprocedure) into ddl;
 ddl=replace(ddl,$txt$'/public/feed','/order-status'$txt$,$txt$'/public/feed','/public/resolve','/order-status'$txt$);execute ddl;
 select pg_get_functiondef('public.catalog_workspace_write()'::regprocedure) into ddl;
 ddl=replace(ddl,$txt$'business','menus','products','categories'$txt$,$txt$'business','menus','products','categories','servicePoints'$txt$);execute ddl;
end $$;
create function public.point_new_workspace() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 insert into service_points(business_id,id,code,label,section,table_number,is_occupied) select new.id,x->>'id',x->>'tableNumber',coalesce(x->>'label','میز '||(x->>'tableNumber')),coalesce(x->>'section','main'),(x->>'tableNumber')::int,false from jsonb_array_elements(coalesce(new.payload->'servicePoints','[]'))x;
 insert into qr_links(business_id,service_point_id) select business_id,id from service_points where business_id=new.id;
 update menu_workspaces set payload=payload-'servicePoints' where id=new.id;return new;
end $$;
create trigger point_workspace_import after insert on public.menu_workspaces for each row execute function public.point_new_workspace();
update menu_workspaces set payload=payload-'servicePoints';
do $$ declare f record;begin
 for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'point_%' loop execute format('revoke all on function %s from public,anon,authenticated',f.signature);execute format('grant execute on function %s to service_role',f.signature);end loop;
end $$;
commit;
