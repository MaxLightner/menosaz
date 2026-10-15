-- Packages 2/3: additive schema. Import/cutover is an explicit, separately gated operation.
begin;
create table public.businesses (
 id text primary key references public.menu_workspaces(id), name text not null check(length(trim(name)) between 1 and 100),
 kind_code text not null default 'restaurant', timezone text not null default 'Asia/Tehran',
 settings jsonb not null default '{}', version bigint not null default 1,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.menus (
 business_id text not null references public.businesses(id), id text not null,
 title text not null check(length(trim(title)) between 1 and 60), kind_code text not null,
 status text not null default 'published' check(status in ('draft','published','archived')),
 sort_order integer not null default 0, version bigint not null default 1,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 primary key(business_id,id)
);
create table public.categories (
 business_id text not null, menu_id text not null, id text not null,
 title text not null check(length(trim(title)) between 1 and 80), sort_order integer not null default 0,
 primary key(business_id,menu_id,id), foreign key(business_id,menu_id) references public.menus(business_id,id)
);
create table public.products (
 business_id text not null, id text not null, menu_id text not null, category_id text not null,
 name text not null check(length(trim(name)) between 1 and 100), description text not null default '',
 price_toman bigint not null check(price_toman>=0), is_available boolean not null default false,
 prep_time_minutes integer not null default 15 check(prep_time_minutes between 0 and 1440),
 unit_code text not null default 'each', quantity_step numeric(12,3) not null default 1 check(quantity_step>0),
 status text not null default 'active' check(status in ('active','archived')), sort_order integer not null default 0,
 rating numeric, out_of_stock_reason text, version bigint not null default 1,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 primary key(business_id,id), foreign key(business_id,menu_id,category_id) references public.categories(business_id,menu_id,id)
);
create table public.product_option_groups (
 business_id text not null, product_id text not null, id text not null, title text not null,
 min_select integer not null default 0, max_select integer not null default 1, sort_order integer not null default 0,
 primary key(business_id,product_id,id), foreign key(business_id,product_id) references public.products(business_id,id),
 check(min_select>=0 and max_select>=min_select)
);
create table public.product_options (
 business_id text not null, product_id text not null, group_id text not null, id text not null, name text not null,
 extra_price_toman bigint not null check(extra_price_toman>=0), sort_order integer not null default 0,
 primary key(business_id,product_id,group_id,id),
 foreign key(business_id,product_id,group_id) references public.product_option_groups(business_id,product_id,id) on delete cascade
);
create table public.media_assets (
 business_id text not null references public.businesses(id), id text not null,
 url text not null, storage_path text, mime text, bytes integer, width integer, height integer,
 purpose text not null check(purpose in ('product','background','legacy')), custom boolean not null default false,
 created_at timestamptz not null default now(), primary key(business_id,id)
);
create table public.product_media (
 business_id text not null, product_id text not null, media_id text not null, sort_order integer not null default 0,
 primary key(business_id,product_id,media_id), foreign key(business_id,product_id) references public.products(business_id,id),
 foreign key(business_id,media_id) references public.media_assets(business_id,id)
);
create table public.menu_appearance (
 business_id text not null, menu_id text not null, palette_key text not null default 'original', paper_key integer not null default 1,
 background_url text not null default '', version bigint not null default 1,
 primary key(business_id,menu_id), foreign key(business_id,menu_id) references public.menus(business_id,id)
);
create table public.catalog_commands (
 business_id text not null references public.businesses(id), request_id uuid not null, request_hash text not null,
 result jsonb not null, created_at timestamptz not null default now(), primary key(business_id,request_id)
);
create table public.catalog_migrations (
 business_id text primary key references public.businesses(id), source_hash text not null,
 menu_count integer not null, product_count integer not null, price_sum numeric not null, migrated_at timestamptz not null default now()
);
do $$ declare t text; begin
 foreach t in array array['businesses','menus','categories','products','product_option_groups','product_options','media_assets','product_media','menu_appearance','catalog_commands','catalog_migrations'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant all on public.%I to service_role',t);
 end loop;
end $$;
create index products_by_menu on public.products(business_id,menu_id,sort_order,id);

create function public.catalog_menu(bid text,mid text) returns jsonb language sql stable set search_path=public,pg_temp as $$
 select jsonb_build_object('id',m.id,'businessId',m.business_id,'name',m.title,'kind',m.kind_code,'published',m.status='published','version',m.version,
 'appearance',jsonb_build_object('menuPalette',a.palette_key,'menuPaper',a.paper_key,'menuBackgroundImage',a.background_url))
 from menus m join menu_appearance a on a.business_id=m.business_id and a.menu_id=m.id where m.business_id=bid and m.id=mid
$$;
create function public.catalog_product(bid text,pid text) returns jsonb language sql stable set search_path=public,pg_temp as $$
 select jsonb_build_object('id',p.id,'businessId',p.business_id,'menuId',p.menu_id,'categoryId',p.category_id,'name',p.name,
 'description',p.description,'price',p.price_toman,'isAvailable',p.is_available,'prepTimeMinutes',p.prep_time_minutes,
 'rating',p.rating,'version',p.version,'updatedAt',p.updated_at,'outOfStockReason',p.out_of_stock_reason,
 'imageUrl',coalesce((select a.url from product_media pm join media_assets a on a.business_id=pm.business_id and a.id=pm.media_id where pm.business_id=p.business_id and pm.product_id=p.id order by pm.sort_order,pm.media_id limit 1),''),
 'customImage',coalesce((select a.custom from product_media pm join media_assets a on a.business_id=pm.business_id and a.id=pm.media_id where pm.business_id=p.business_id and pm.product_id=p.id order by pm.sort_order,pm.media_id limit 1),false),
 'optionGroups',coalesce((select jsonb_agg(jsonb_build_object('id',g.id,'title',g.title,'required',g.min_select>0,'options',
 coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'name',o.name,'extraPrice',o.extra_price_toman) order by o.sort_order,o.id) from product_options o where o.business_id=g.business_id and o.product_id=g.product_id and o.group_id=g.id),'[]'::jsonb)) order by g.sort_order,g.id)
 from product_option_groups g where g.business_id=p.business_id and g.product_id=p.id),'[]'::jsonb))
 from products p where p.business_id=bid and p.id=pid and p.status='active'
$$;
create function public.catalog_workspace_snapshot(bid text) returns jsonb language sql stable set search_path=public,pg_temp as $$
 select w.payload||jsonb_build_object('business',b.settings||jsonb_build_object('id',b.id,'name',b.name,'kind',b.kind_code,'timezone',b.timezone,'version',b.version,'updatedAt',b.updated_at),
 'menus',coalesce((select jsonb_agg(catalog_menu(bid,m.id) order by m.sort_order,m.id) from menus m where m.business_id=bid and m.status<>'archived'),'[]'::jsonb),
 'categories',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'menuId',c.menu_id,'name',c.title,'sortOrder',c.sort_order) order by c.sort_order,c.id) from categories c where c.business_id=bid),'[]'::jsonb),
 'products',coalesce((select jsonb_agg(catalog_product(bid,p.id) order by p.sort_order,p.id) from products p where p.business_id=bid and p.status='active'),'[]'::jsonb),'catalogVersion',1)
 from menu_workspaces w join businesses b on b.id=w.id where w.id=bid
$$;

-- Internal import: strict validation; no silent price rounding or cross-business repair.
create function public.catalog_import(bid text) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare s jsonb; b jsonb; m jsonb; p jsonb; g jsonb; o jsonb; ap jsonb; mid text; cid text; gid text; oid text; asset text;
 mi integer=0; pi integer=0; gi integer; oi integer; existing jsonb; fingerprint text;
begin
 select payload into s from menu_workspaces where id=bid for update;
 if s is null then raise exception 'مجموعه پیدا نشد';end if;
 if exists(select 1 from catalog_migrations where business_id=bid) then return jsonb_build_object('alreadyImported',true);end if;
 if exists(select 1 from businesses where id=bid) then raise exception 'کاتالوگ نیمه‌منتقل‌شده است';end if;
 b=s->'business'; fingerprint=md5(s::text);
 if b->>'id' is distinct from bid or jsonb_typeof(s->'menus') is distinct from 'array' or jsonb_typeof(s->'products') is distinct from 'array' then raise exception 'ساختار یا مالکیت مجموعه ناسازگار است';end if;
 insert into businesses(id,name,kind_code,timezone,settings) values(bid,b->>'name',coalesce(b->>'kind','restaurant'),coalesce(b->>'timezone','Asia/Tehran'),b-array['id','name','kind','timezone','menuPalette','menuPaper','menuBackgroundImage']);
 for m in select value from jsonb_array_elements(s->'menus') loop
  mid=m->>'id';
  insert into menus(business_id,id,title,kind_code,status,sort_order) values(bid,mid,m->>'name',coalesce(m->>'kind','restaurant'),case when m->'published'='true' then 'published' else 'draft' end,mi);
  ap=(jsonb_build_object('menuPalette',coalesce(b->>'menuPalette','original'),'menuPaper',coalesce((b->>'menuPaper')::integer,1),'menuBackgroundImage',coalesce(b->>'menuBackgroundImage','')))||coalesce(m->'appearance','{}');
  insert into menu_appearance values(bid,mid,coalesce(ap->>'menuPalette','original'),coalesce((ap->>'menuPaper')::integer,1),coalesce(ap->>'menuBackgroundImage',''),1);
  mi=mi+1;
 end loop;
 for p in select value from jsonb_array_elements(s->'products') loop
  if p->>'businessId' is distinct from bid then raise exception 'مالکیت محصول ناسازگار است';end if;
  if (p->>'price')::numeric<0 or (p->>'price')::numeric<>trunc((p->>'price')::numeric) then raise exception 'مبلغ محصول باید تومان صحیح باشد';end if;
  mid=coalesce(p->>'menuId','main');cid=p->>'categoryId';
  insert into categories(business_id,menu_id,id,title,sort_order) values(bid,mid,cid,
   case cid when 'cat-kebab' then 'کباب‌های شمرونی' when 'cat-traditional' then 'غذاهای اصیل ایرانی' when 'cat-fastfood' then 'پیتزا و برگر' when 'cat-appetizer' then 'پیش‌غذا و سالاد' when 'cat-drink' then 'نوشیدنی‌ها' when 'cat-cafe' then 'کافه و دسر' else cid end,pi) on conflict do nothing;
  insert into products(business_id,id,menu_id,category_id,name,description,price_toman,is_available,prep_time_minutes,sort_order,rating,out_of_stock_reason,updated_at)
   values(bid,p->>'id',mid,cid,p->>'name',coalesce(p->>'description',''),(p->>'price')::bigint,coalesce((p->>'isAvailable')::boolean,false),coalesce((p->>'prepTimeMinutes')::integer,15),pi,(p->>'rating')::numeric,p->>'outOfStockReason',coalesce((p->>'updatedAt')::timestamptz,now()));
  if coalesce(p->>'imageUrl','')<>'' then
   asset='legacy-'||(p->>'id');
   insert into media_assets(business_id,id,url,purpose,custom) values(bid,asset,p->>'imageUrl','legacy',coalesce((p->>'customImage')::boolean,false));
   insert into product_media(business_id,product_id,media_id) values(bid,p->>'id',asset);
  end if;
  gi=0;
  for g in select value from jsonb_array_elements(coalesce(p->'optionGroups','[]')) loop
   gid=coalesce(g->>'id','group-'||gi);
   insert into product_option_groups values(bid,p->>'id',gid,g->>'title',case when g->'required'='true' then 1 else 0 end,case when g->'required'='true' then 1 else greatest(jsonb_array_length(coalesce(g->'options','[]')),1) end,gi);
   oi=0;
   for o in select value from jsonb_array_elements(coalesce(g->'options','[]')) loop
    if (o->>'extraPrice')::numeric<>trunc((o->>'extraPrice')::numeric) then raise exception 'مبلغ گزینه باید صحیح باشد';end if;
    oid=coalesce(o->>'id','option-'||oi); insert into product_options values(bid,p->>'id',gid,oid,o->>'name',(o->>'extraPrice')::bigint,oi);oi=oi+1;
   end loop;gi=gi+1;
  end loop;pi=pi+1;
 end loop;
 insert into catalog_migrations(business_id,source_hash,menu_count,product_count,price_sum) values(bid,fingerprint,mi,pi,(select coalesce(sum(price_toman),0) from products where business_id=bid));
 return jsonb_build_object('menus',mi,'products',pi,'sourceHash',fingerprint);
end $$;

-- New registrations import once in the same transaction; transferred keys never persist again.
create function public.catalog_workspace_write() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if tg_op='UPDATE' and exists(select 1 from businesses where id=new.id) then new.payload=new.payload-array['business','menus','products','categories'];end if;
 return new;
end $$;
create function public.catalog_new_workspace() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform catalog_import(new.id);
 update menu_workspaces set payload=payload-array['business','menus','products','categories'] where id=new.id;
 return new;
end $$;

do $$ declare f record; begin
 for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'catalog_%' loop
  execute format('revoke all on function %s from public,anon,authenticated',f.signature);
  execute format('grant execute on function %s to service_role',f.signature);
 end loop;
end $$;
commit;
