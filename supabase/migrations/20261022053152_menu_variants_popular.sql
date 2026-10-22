begin;
alter table public.products add column if not exists is_popular boolean not null default false;
create or replace function public.catalog_product(bid text,pid text) returns jsonb language sql stable set search_path=public,pg_temp as $$
 select jsonb_build_object('id',p.id,'businessId',p.business_id,'menuId',p.menu_id,'categoryId',p.category_id,'name',p.name,
 'description',p.description,'price',p.price_toman,'isAvailable',p.is_available,'prepTimeMinutes',p.prep_time_minutes,
 'rating',p.rating,'isPopular',p.is_popular,'version',p.version,'updatedAt',p.updated_at,'outOfStockReason',p.out_of_stock_reason,
 'imageUrl',coalesce((select a.url from product_media pm join media_assets a on a.business_id=pm.business_id and a.id=pm.media_id where pm.business_id=p.business_id and pm.product_id=p.id order by pm.sort_order,pm.media_id limit 1),''),
 'customImage',coalesce((select a.custom from product_media pm join media_assets a on a.business_id=pm.business_id and a.id=pm.media_id where pm.business_id=p.business_id and pm.product_id=p.id order by pm.sort_order,pm.media_id limit 1),false),
 'optionGroups',coalesce((select jsonb_agg(jsonb_build_object('id',g.id,'title',g.title,'required',g.min_select>0,'options',
 coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'name',o.name,'extraPrice',o.extra_price_toman) order by o.sort_order,o.id) from product_options o where o.business_id=g.business_id and o.product_id=g.product_id and o.group_id=g.id),'[]'::jsonb)) order by g.sort_order,g.id)
 from product_option_groups g where g.business_id=p.business_id and g.product_id=p.id),'[]'::jsonb))
 from products p where p.business_id=bid and p.id=pid and p.status='active'
$$;
create or replace function public.catalog_put_product(bid text,pid text,body jsonb) returns jsonb language plpgsql set search_path=public,pg_temp as $$
declare d jsonb; old jsonb; g jsonb; o jsonb; mid text; cid text; gid text; oid text; asset text; pos integer=0; op integer; lim integer;
begin
 perform 1 from businesses where id=bid for update;
 old=catalog_product(bid,pid);d=coalesce(old,'{}')||body;
 if body ? 'businessId' and body->>'businessId'<>bid then raise exception 'مالکیت محصول معتبر نیست';end if;
 if old is not null and body ? 'expectedVersion' and (body->>'expectedVersion')::bigint<>(old->>'version')::bigint then raise exception 'CONFLICT: محصول تغییر کرده؛ دوباره بارگذاری کن';end if;
 if length(trim(coalesce(d->>'name',''))) not between 1 and 100 or length(coalesce(d->>'description',''))>10000
 or jsonb_typeof(d->'price') is distinct from 'number' or (d->>'price')::numeric<0 or (d->>'price')::numeric<>trunc((d->>'price')::numeric) then raise exception 'نام یا قیمت محصول معتبر نیست';end if;
 if body ? 'isPopular' and jsonb_typeof(body->'isPopular') is distinct from 'boolean' then raise exception 'وضعیت پرطرفدار معتبر نیست';end if;
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
 if body ? 'isPopular' then update products set is_popular=(body->>'isPopular')::boolean where business_id=bid and id=pid;end if;
 return catalog_product(bid,pid);
end $$;

commit;
