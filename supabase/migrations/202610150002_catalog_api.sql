begin;
create function public.catalog_limit(bid text) returns integer language sql stable set search_path=public,pg_temp as $$
 select case when exists(select 1 from menu_subscriptions where business_id=bid and expires_at>now()) then null else 20 end
$$;

create function public.catalog_put_product(bid text,pid text,body jsonb) returns jsonb language plpgsql set search_path=public,pg_temp as $$
declare d jsonb; old jsonb; g jsonb; o jsonb; mid text; cid text; gid text; oid text; asset text; pos integer=0; op integer; lim integer;
begin
 perform 1 from businesses where id=bid for update;
 old=catalog_product(bid,pid);d=coalesce(old,'{}')||body;
 if body ? 'businessId' and body->>'businessId'<>bid then raise exception 'مالکیت محصول معتبر نیست';end if;
 if old is not null and body ? 'expectedVersion' and (body->>'expectedVersion')::bigint<>(old->>'version')::bigint then raise exception 'CONFLICT: محصول تغییر کرده؛ دوباره بارگذاری کن';end if;
 if length(trim(coalesce(d->>'name',''))) not between 1 and 100 or length(coalesce(d->>'description',''))>10000
 or jsonb_typeof(d->'price') is distinct from 'number' or (d->>'price')::numeric<0 or (d->>'price')::numeric<>trunc((d->>'price')::numeric) then raise exception 'نام یا قیمت محصول معتبر نیست';end if;
 mid=d->>'menuId';cid=d->>'categoryId';
 if not exists(select 1 from menus where business_id=bid and id=mid and status<>'archived') then raise exception 'منوی مقصد معتبر نیست';end if;
 if old is not null and old->>'menuId'<>mid and not exists(select 1 from categories where business_id=bid and menu_id=mid and id=cid) then
  insert into categories select bid,mid,c.id,c.title,c.sort_order from categories c where c.business_id=bid and c.menu_id=old->>'menuId' and c.id=cid;
 end if;
 if not exists(select 1 from categories where business_id=bid and menu_id=mid and id=cid) then raise exception 'دسته‌بندی این منو را انتخاب کن';end if;
 lim=catalog_limit(bid);
 if old is null and lim is not null and (select count(*) from products where business_id=bid and status='active')>=lim then raise exception 'PLAN_LIMIT: به سقف آیتم‌های اشتراک رسیده‌ای';end if;
 insert into products(business_id,id,menu_id,category_id,name,description,price_toman,is_available,prep_time_minutes,rating,out_of_stock_reason,sort_order)
 values(bid,pid,mid,cid,trim(d->>'name'),coalesce(d->>'description',''),(d->>'price')::bigint,coalesce((d->>'isAvailable')::boolean,false),coalesce((d->>'prepTimeMinutes')::integer,15),(d->>'rating')::numeric,d->>'outOfStockReason',(select count(*) from products where business_id=bid))
 on conflict(business_id,id) do update set menu_id=excluded.menu_id,category_id=excluded.category_id,name=excluded.name,description=excluded.description,
 price_toman=excluded.price_toman,is_available=excluded.is_available,prep_time_minutes=excluded.prep_time_minutes,rating=excluded.rating,
 out_of_stock_reason=excluded.out_of_stock_reason,version=products.version+1,updated_at=now();
 if body ? 'imageUrl' then
  if coalesce(body->>'imageUrl','')<>'' then
   select id into asset from media_assets where business_id=bid and url=body->>'imageUrl' limit 1;
   if asset is null then
    if body->>'imageUrl' !~ '^/(media|menu-assets)/[a-zA-Z0-9._-]+$' then raise exception 'عکس را از مسیر بارگذاری مجموعه انتخاب کن';end if;
    asset='asset-'||gen_random_uuid();insert into media_assets(business_id,id,url,purpose,custom) values(bid,asset,body->>'imageUrl','product',false);
   end if;
  end if;
  delete from product_media where business_id=bid and product_id=pid;
  if asset is not null then insert into product_media values(bid,pid,asset,0);end if;
 end if;
 if body ? 'optionGroups' then
  if jsonb_typeof(body->'optionGroups')<>'array' or jsonb_array_length(body->'optionGroups')>20 then raise exception 'گزینه‌های محصول معتبر نیست';end if;
  delete from product_options where business_id=bid and product_id=pid;
  delete from product_option_groups where business_id=bid and product_id=pid;
  for g in select value from jsonb_array_elements(body->'optionGroups') loop
   gid=coalesce(nullif(g->>'id',''),'group-'||gen_random_uuid());
   if length(trim(coalesce(g->>'title',''))) not between 1 and 80 or jsonb_typeof(g->'options') is distinct from 'array' or jsonb_array_length(g->'options') not between 1 and 50 then raise exception 'گروه گزینه معتبر نیست';end if;
   insert into product_option_groups values(bid,pid,gid,g->>'title',case when g->'required'='true' then 1 else 0 end,case when g->'required'='true' then 1 else jsonb_array_length(g->'options') end,pos);op=0;
   for o in select value from jsonb_array_elements(g->'options') loop
    if length(trim(coalesce(o->>'name',''))) not between 1 and 80 or jsonb_typeof(o->'extraPrice') is distinct from 'number' or (o->>'extraPrice')::numeric<>trunc((o->>'extraPrice')::numeric) then raise exception 'گزینه یا قیمت آن معتبر نیست';end if;
    oid=coalesce(nullif(o->>'id',''),'option-'||gen_random_uuid());insert into product_options values(bid,pid,gid,oid,o->>'name',(o->>'extraPrice')::bigint,op);op=op+1;
   end loop;pos=pos+1;
  end loop;
 end if;
 return catalog_product(bid,pid);
end $$;

-- Only called by the Edge after server-side image parsing and successful Storage upload.
create function public.catalog_media_register(bid text,asset_id text,asset_url text,storage_path text,info jsonb) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if storage_path not like bid||'/%' or info->>'purpose' not in ('product','background') then raise exception 'مسیر رسانه معتبر نیست';end if;
 insert into media_assets(business_id,id,url,storage_path,mime,bytes,width,height,purpose,custom)
 values(bid,asset_id,asset_url,storage_path,info->>'mime',(info->>'bytes')::integer,(info->>'width')::integer,(info->>'height')::integer,info->>'purpose',true);
 return jsonb_build_object('imageUrl',asset_url,'mediaId',asset_id);
end $$;

create function public.catalog_api(p_path text,p_method text,p_body jsonb default '{}',p_uid uuid default null) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare a menu_accounts; bid text; mid text; rid text; v jsonb; s jsonb; c jsonb; p jsonb; ap jsonb; old menus; existing catalog_commands;
 key uuid; fingerprint text; idx integer=0; count_items integer=0; lim integer; cid text;
begin
 select * into a from menu_accounts where user_id=p_uid;
 if coalesce(a.is_banned,false) then return jsonb_build_object('status',403,'data',jsonb_build_object('error','حساب مسدود است','code','ACCOUNT_BANNED'));end if;
 if p_path='/public/menu' and p_method='GET' then
  bid=coalesce(p_body->>'business','pich-shemroon');mid=coalesce(p_body->>'menu','main');s=catalog_workspace_snapshot(bid);
  if not exists(select 1 from menus where business_id=bid and id=mid and status='published') then return jsonb_build_object('status',404,'data',jsonb_build_object('error','منو منتشر نشده است'));end if;
  s=jsonb_build_object('business',(s->'business')||(catalog_menu(bid,mid)->'appearance'),'menus',(select coalesce(jsonb_agg(catalog_menu(bid,id) order by sort_order,id),'[]') from menus where business_id=bid and status='published'),
   'categories',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'menuId',menu_id,'name',title,'sortOrder',sort_order) order by sort_order,id),'[]') from categories where business_id=bid and menu_id=mid),
   'products',(select coalesce(jsonb_agg(catalog_product(bid,id) order by sort_order,id),'[]') from products where business_id=bid and menu_id=mid and status='active'),
   'servicePoints',s->'servicePoints','orders','[]'::jsonb,'serviceCalls','[]'::jsonb,'catalogVersion',1);
  return jsonb_build_object('status',200,'data',s);
 end if;
 if a.user_id is null then return jsonb_build_object('status',401,'data',jsonb_build_object('error','ابتدا وارد حساب شو'));end if;
 bid=a.business_id;
 perform 1 from businesses where id=bid for update;
 if not found then raise exception 'کاتالوگ مجموعه منتقل نشده است';end if;
 if p_path='/workspace' and p_method='GET' then v=catalog_workspace_snapshot(bid);
 elsif p_path='/catalog/capabilities' and p_method='GET' then
  lim=catalog_limit(bid);v=jsonb_build_object('catalogVersion',1,'productLimit',lim,'products',(select count(*) from products where business_id=bid and status='active'),'menuLimit',30);
 elsif p_path='/menus/build' and p_method='POST' then
  key=(p_body->>'requestId')::uuid;if key is null then raise exception 'شناسه درخواست لازم است';end if;
  fingerprint=md5((p_body-'requestId')::text);select * into existing from catalog_commands where business_id=bid and request_id=key;
  if found then
   if existing.request_hash<>fingerprint then raise exception 'CONFLICT: درخواست با همان شناسه تغییر کرده است';end if;
   return jsonb_build_object('status',200,'data',existing.result);
  end if;
  if jsonb_typeof(p_body->'categories') is distinct from 'array' or jsonb_array_length(p_body->'categories') not between 1 and 100 then raise exception 'دسته‌ها را کامل کن';end if;
  mid=coalesce(nullif(p_body->>'menuId',''),'menu-'||gen_random_uuid());
  if p_body ? 'menuId' then
   if not exists(select 1 from menus where business_id=bid and id=mid and status<>'archived') or exists(select 1 from products where business_id=bid and menu_id=mid) or exists(select 1 from categories where business_id=bid and menu_id=mid) then raise exception 'این منو خالی نیست؛ دوباره بارگذاری کن';end if;
   update menus set title=trim(p_body->>'name'),kind_code=p_body->>'kind',version=version+1,updated_at=now() where business_id=bid and id=mid;
  else
   if (select count(*) from menus where business_id=bid and status<>'archived')>=30 then raise exception 'سقف تعداد منو رسیده است';end if;
   insert into menus(business_id,id,title,kind_code,sort_order) values(bid,mid,trim(p_body->>'name'),p_body->>'kind',(select count(*) from menus where business_id=bid));
   insert into menu_appearance(business_id,menu_id) values(bid,mid);
  end if;
  for c in select value from jsonb_array_elements(p_body->'categories') loop
   cid=coalesce(nullif(c->>'id',''),'cat-'||gen_random_uuid());
   if jsonb_typeof(c->'items') is distinct from 'array' or jsonb_array_length(c->'items')>200 then raise exception 'آیتم‌های دسته معتبر نیست';end if;
   insert into categories values(bid,mid,cid,trim(c->>'name'),idx);idx=idx+1;
   for p in select value from jsonb_array_elements(c->'items') loop
    perform catalog_put_product(bid,'prod-'||gen_random_uuid(),p||jsonb_build_object('menuId',mid,'categoryId',cid));count_items=count_items+1;
   end loop;
  end loop;
  v=jsonb_build_object('menu',catalog_menu(bid,mid),'productsCreated',count_items);
  insert into catalog_commands values(bid,key,fingerprint,v,now());
 elsif p_path='/menus' and p_method='POST' then
  if (select count(*) from menus where business_id=bid and status<>'archived')>=30 then raise exception 'سقف تعداد منو رسیده است';end if;
  if p_body ? 'requestId' then
   key=(p_body->>'requestId')::uuid;fingerprint=md5((p_body-'requestId')::text);select * into existing from catalog_commands where business_id=bid and request_id=key;
   if found then if existing.request_hash<>fingerprint then raise exception 'CONFLICT: شناسه درخواست تکراری است';end if;return jsonb_build_object('status',200,'data',existing.result);end if;
  end if;
  mid='menu-'||gen_random_uuid();insert into menus(business_id,id,title,kind_code,sort_order) values(bid,mid,trim(p_body->>'name'),coalesce(p_body->>'kind','restaurant'),(select count(*) from menus where business_id=bid));
  insert into menu_appearance(business_id,menu_id) values(bid,mid);v=catalog_menu(bid,mid);
  if key is not null then insert into catalog_commands values(bid,key,fingerprint,v,now());end if;
 elsif p_path like '/menus/%' and p_method='PATCH' then
  mid=split_part(p_path,'/',3);select * into old from menus where business_id=bid and id=mid;if not found then raise exception 'منو پیدا نشد';end if;
  if p_body ? 'expectedVersion' and (p_body->>'expectedVersion')::bigint<>old.version then raise exception 'CONFLICT: منو تغییر کرده است';end if;
  if p_body ? 'appearance' then
   ap=p_body->'appearance';
   if coalesce(ap->>'menuBackgroundImage','')<>'' and not exists(select 1 from media_assets where business_id=bid and url=ap->>'menuBackgroundImage') then raise exception 'تصویر پس‌زمینه متعلق به مجموعه نیست';end if;
   update menu_appearance set palette_key=coalesce(ap->>'menuPalette',palette_key),paper_key=coalesce((ap->>'menuPaper')::integer,paper_key),background_url=coalesce(ap->>'menuBackgroundImage',background_url),version=version+1 where business_id=bid and menu_id=mid;
  end if;
  update menus set title=coalesce(trim(p_body->>'name'),title),kind_code=coalesce(p_body->>'kind',kind_code),status=case when p_body ? 'published' then case when p_body->'published'='true' then 'published' else 'draft' end else status end,version=version+1,updated_at=now() where business_id=bid and id=mid;
  v=catalog_menu(bid,mid);
 elsif p_path='/categories' and p_method='POST' then
  mid=p_body->>'menuId';cid='cat-'||gen_random_uuid();insert into categories values(bid,mid,cid,trim(p_body->>'name'),(select count(*) from categories where business_id=bid and menu_id=mid));
  v=jsonb_build_object('id',cid,'menuId',mid,'name',trim(p_body->>'name'));
 elsif p_path like '/categories/%' and p_method='PATCH' then
  cid=split_part(p_path,'/',3);mid=p_body->>'menuId';update categories set title=trim(p_body->>'name') where business_id=bid and menu_id=mid and id=cid;
  if not found then raise exception 'دسته پیدا نشد';end if;v=jsonb_build_object('id',cid,'menuId',mid,'name',trim(p_body->>'name'));
 elsif p_path='/products' and p_method='POST' then v=catalog_put_product(bid,'prod-'||gen_random_uuid(),p_body);
 elsif p_path like '/products/%' and p_method='PATCH' then
  rid=split_part(p_path,'/',3);if catalog_product(bid,rid) is null then raise exception 'محصول پیدا نشد';end if;v=catalog_put_product(bid,rid,p_body);
 elsif p_path='/business' and p_method='PATCH' then
  if p_body ? 'name' then update businesses set name=trim(p_body->>'name') where id=bid;end if;
  update businesses set settings=settings||(p_body-array['id','name','slug','menuPalette','menuPaper','menuBackgroundImage','role','businessId']),version=version+1,updated_at=now() where id=bid;
  v=catalog_workspace_snapshot(bid)->'business';
 else return jsonb_build_object('status',404,'data',jsonb_build_object('error','مسیر کاتالوگ معتبر نیست'));end if;
 return jsonb_build_object('status',200,'data',v);
exception when others then
 return jsonb_build_object('status',case when sqlerrm like 'CONFLICT:%' or sqlerrm like 'PLAN_LIMIT:%' then 409 else 400 end,'data',jsonb_build_object('error',case when sqlstate='P0001' then sqlerrm else 'داده نامعتبر است؛ نام، دسته و قیمت را بررسی کن' end,'code',case when sqlerrm like 'CONFLICT:%' then 'CONFLICT' when sqlerrm like 'PLAN_LIMIT:%' then 'PLAN_LIMIT' else 'CATALOG_INVALID' end));
end $$;

do $$ declare f record; begin
 for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'catalog_%' loop
  execute format('revoke all on function %s from public,anon,authenticated',f.signature);
  execute format('grant execute on function %s to service_role',f.signature);
 end loop;
end $$;
commit;
