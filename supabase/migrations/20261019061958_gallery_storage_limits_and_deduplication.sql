begin;
create or replace function public.catalog_media_register(bid text,asset_id text,asset_url text,storage_path text,info jsonb) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare existing media_assets;
begin
 perform 1 from businesses where id=bid for update;
 if not found or storage_path not like bid||'/%' or info->>'purpose' not in ('product','background') then raise exception 'مسیر رسانه معتبر نیست';end if;
 if (info->>'bytes')::integer not between 1 and 1048576 or (info->>'width')::integer not between 1 and 4096 or (info->>'height')::integer not between 1 and 4096 or info->>'mime' not in ('image/png','image/jpeg','image/webp') then raise exception 'فایل تصویر معتبر نیست';end if;
 if info->>'purpose'='product' and info->>'width'<>info->>'height' then raise exception 'عکس محصول باید مربعی باشد';end if;
 select a.* into existing from media_assets a where a.business_id=bid and a.storage_path=catalog_media_register.storage_path and a.purpose=info->>'purpose' limit 1;
 if existing.id is not null then return jsonb_build_object('imageUrl',existing.url,'mediaId',existing.id);end if;
 if (select coalesce(sum(bytes),0) from media_assets where business_id=bid and custom)+(info->>'bytes')::integer>104857600 then raise exception 'فضای تصاویر این مجموعه پر شده است؛ با پشتیبانی تماس بگیر';end if;
 insert into media_assets(business_id,id,url,storage_path,mime,bytes,width,height,purpose,custom)
 values(bid,asset_id,asset_url,storage_path,info->>'mime',(info->>'bytes')::integer,(info->>'width')::integer,(info->>'height')::integer,info->>'purpose',true);
 return jsonb_build_object('imageUrl',asset_url,'mediaId',asset_id);
end $$;
revoke all on function public.catalog_media_register(text,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.catalog_media_register(text,text,text,text,jsonb) to service_role;
commit;
