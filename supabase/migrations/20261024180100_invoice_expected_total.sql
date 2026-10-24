-- Stop stale customer confirmations from silently accepting changed tax, fee or prices.
CREATE OR REPLACE FUNCTION public.order_create(body jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare bid text=body->>'businessId';sid text=body->>'sessionId';key text=body->>'idempotencyKey';g session_guests;ss service_sessions;o orders;p products;group_row product_option_groups;option_row product_options;item jsonb;choice jsonb;chosen text[];qty int;extra bigint;line bigint;total bigint=0;idx int=0;xi int;itemid text;oid text;fingerprint text;n bigint;expected integer;bill jsonb;quote jsonb;
begin
 g=order_guest(bid,sid,body->>'guestToken');select * into ss from service_sessions where business_id=bid and id=sid for update;
 if ss.status<>'open' then raise exception 'SESSION_INVALID: نشست بسته شده است';end if;
 if length(coalesce(key,'')) not between 10 and 100 then raise exception 'شناسه درخواست معتبر نیست';end if;
 fingerprint=md5((body-'guestToken')::text);select * into o from orders where business_id=bid and guest_id=g.id and idempotency_key=key;
 if o.id is not null then if o.request_hash<>fingerprint then raise exception 'CONFLICT: شناسه درخواست با محتوای دیگری استفاده شده است';end if;return jsonb_build_object('status',200,'data',order_dto(bid,o.id));end if;
 if jsonb_typeof(body->'items') is distinct from 'array' or jsonb_array_length(body->'items') not between 1 and 50 then raise exception 'آیتم‌های سفارش معتبر نیست';end if;
 if not menu_rate('guest-order-'||g.id,20) then return jsonb_build_object('status',429,'data',jsonb_build_object('error','تعداد درخواست‌ها زیاد است؛ کمی صبر کن'));end if;
 if not exists(select 1 from businesses where id=bid and status='active' and coalesce((settings->>'orderAcceptanceActive')::boolean,true)) then raise exception 'این مجموعه فعلاً سفارش نمی‌پذیرد';end if;
 insert into business_order_counters values(bid,1001) on conflict do nothing;
 update business_order_counters set next_number=next_number+1 where business_id=bid returning next_number-1 into n;
 oid='order-'||gen_random_uuid();insert into orders(business_id,id,session_id,service_point_id,guest_id,number,total_toman,customer_name,customer_note,idempotency_key,request_hash) values(bid,oid,sid,ss.service_point_id,g.id,'#'||n,0,left(coalesce(body->>'customerName','مهمان'),80),left(coalesce(body->>'customerNotes',''),500),key,fingerprint);
 for item in select value from jsonb_array_elements(body->'items')loop
  select * into p from products where business_id=bid and id=item->>'productId' and status='active' and is_available for share;
  if p.id is null or not point_menu_allowed(bid,ss.service_point_id,p.menu_id) then raise exception 'MENU_UNAVAILABLE: یکی از غذاها در این بخش یا ساعت قابل سفارش نیست';end if;
  qty=(item->>'quantity')::int;if qty is null or qty not between 1 and 30 or (item->>'quantity')::numeric<>qty then raise exception 'تعداد معتبر نیست';end if;
  extra=0;chosen=array[]::text[];itemid=oid||'-'||idx;xi=0;
  insert into order_items(business_id,id,order_id,product_id,product_id_snapshot,menu_id_snapshot,name_snapshot,unit_price_toman,quantity,note,line_total_toman,sort_order) values(bid,itemid,oid,p.id,p.id,p.menu_id,p.name,p.price_toman,qty,left(coalesce(item->>'notes',''),500),0,idx);
  if jsonb_typeof(coalesce(item->'selectedOptions','[]'))<>'array' or jsonb_array_length(coalesce(item->'selectedOptions','[]'))>30 then raise exception 'گزینه‌ها معتبر نیست';end if;
  for choice in select value from jsonb_array_elements(coalesce(item->'selectedOptions','[]'))loop
   select * into group_row from product_option_groups where business_id=bid and product_id=p.id and (case when coalesce(choice->>'groupId','')<>'' then id=choice->>'groupId' else title=choice->>'groupTitle' end);
   select * into option_row from product_options where business_id=bid and product_id=p.id and group_id=group_row.id and (case when coalesce(choice->>'optionId','')<>'' then id=choice->>'optionId' else name=choice->>'optionName' end);
   if group_row.id is null or option_row.id is null or (group_row.id||':'||option_row.id)=any(chosen) then raise exception 'گزینه معتبر نیست یا تکراری است';end if;
   chosen=array_append(chosen,group_row.id||':'||option_row.id);extra=extra+option_row.extra_price_toman;
   insert into order_item_options values(bid,itemid||'-option-'||xi,itemid,option_row.id,group_row.id,group_row.title,option_row.name,option_row.extra_price_toman,xi);xi=xi+1;
  end loop;
  for group_row in select * from product_option_groups where business_id=bid and product_id=p.id loop
   select count(*) into expected from order_item_options where business_id=bid and item_id=itemid and group_id=group_row.id;
   if expected not between group_row.min_select and group_row.max_select then raise exception 'گزینه‌های لازم غذا را کامل کن';end if;
  end loop;
  line=(p.price_toman+extra)*qty;total=total+line;update order_items set line_total_toman=line where business_id=bid and id=itemid;
  if idx=0 then update orders set menu_id_snapshot=p.menu_id where business_id=bid and id=oid;end if;idx=idx+1;
 end loop;
 select settings->'billing' into bill from businesses where id=bid;
 quote=public.mizato_invoice_quote(bill,total);
 if body ? 'expectedTotalToman' then
  if jsonb_typeof(body->'expectedTotalToman') is distinct from 'number' or
   (body->>'expectedTotalToman')::numeric<>(quote->>'totalAmount')::numeric then
   raise exception 'CONFLICT: جمع فاکتور تغییر کرده است؛ سفارش را تازه‌سازی و دوباره تأیید کن';
  end if;
 end if;
 update orders set total_toman=(quote->>'totalAmount')::bigint,subtotal_toman=total,
 tax_toman=(quote->>'taxAmount')::bigint,service_toman=(quote->>'serviceAmount')::bigint,
 charge_lines_snapshot=quote->'charges',
 billing_rules_snapshot=coalesce(bill,'{"taxBps":0,"fees":[]}'::jsonb)
 where business_id=bid and id=oid;
 insert into order_events(business_id,id,order_id,sequence,actor_type,actor_id,action,after_version) values(bid,gen_random_uuid()::text,oid,1,'guest',g.id,'created',1);
 return jsonb_build_object('status',200,'data',order_dto(bid,oid));
end $function$
;
