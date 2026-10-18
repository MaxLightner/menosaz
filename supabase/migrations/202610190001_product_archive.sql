-- Recoverable menu removal. Order snapshots and product references remain intact.
begin;
do $$ declare ddl text; marker text=$m$elsif p_path='/business' and p_method='PATCH' then$m$;begin
 select pg_get_functiondef('public.catalog_api(text,text,jsonb,uuid)'::regprocedure) into ddl;
 if strpos(ddl,'PRODUCT_ARCHIVE_V1')=0 then
  if strpos(ddl,marker)=0 then raise exception 'CATALOG_PATCH_TARGET_MISSING';end if;
  ddl=replace(ddl,marker,$m$elsif p_path like '/products/%' and p_method='DELETE' then
  -- PRODUCT_ARCHIVE_V1
  rid=split_part(p_path,'/',3);
  if p_body ? 'expectedVersion' and exists(select 1 from products where business_id=bid and id=rid and status='active' and version<>(p_body->>'expectedVersion')::bigint) then raise exception 'CONFLICT: آیتم تغییر کرده؛ دوباره بررسی کن';end if;
  update products set status='archived',is_available=false,version=version+1,updated_at=now() where business_id=bid and id=rid;
  if not found then raise exception 'آیتم پیدا نشد';end if;
  v=jsonb_build_object('id',rid,'archived',true);
 elsif p_path like '/products/%/restore' and p_method='POST' then
  rid=split_part(p_path,'/',3);lim=catalog_limit(bid);
  if lim is not null and (select count(*) from products where business_id=bid and status='active')>=lim then raise exception 'PLAN_LIMIT: به سقف آیتم‌های اشتراک رسیده‌ای';end if;
  update products set status='active',version=version+1,updated_at=now() where business_id=bid and id=rid and status='archived';
  if not found then raise exception 'آیتم حذف‌شده پیدا نشد';end if;
  v=catalog_product(bid,rid);
 $m$||marker);execute ddl;
 end if;
end $$;
commit;
