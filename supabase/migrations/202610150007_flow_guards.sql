-- Packages 7/8: closing a seat is a session command, never a competing occupancy writer.
begin;
do $$ declare ddl text;begin
 select pg_get_functiondef('public.point_api(text,text,jsonb,uuid)'::regprocedure) into ddl;
 ddl=replace(ddl,$txt$if p.id is null then raise exception 'سرویس‌پوینت پیدا نشد';end if;pid=p.id;$txt$,
 $txt$if p.id is null then raise exception 'سرویس‌پوینت پیدا نشد';end if;pid=p.id;
 if p_body->'isOccupied'='false'::jsonb and exists(select 1 from service_sessions where business_id=bid and service_point_id=pid and status='open') then raise exception 'برای خالی‌کردن این نقطه، تخلیه سرویس‌پوینت را ثبت کن تا زمان پایان نشست هم ذخیره شود';end if;$txt$);execute ddl;
 select pg_get_functiondef('public.point_dto(text,text)'::regprocedure) into ddl;
 ddl=replace(ddl,$txt$'isOccupied',p.is_occupied,$txt$,$txt$'isOccupied',p.is_occupied or exists(select 1 from service_sessions where business_id=bid and service_point_id=pid and status='open'),$txt$);execute ddl;
end $$;
commit;
