-- Package 6: canonical sessions, guests, orders and food payment ledger.
begin;
lock table public.menu_workspaces, public.service_points in access exclusive mode;
do $$ begin if current_setting('menosaz.backup_verified',true) is distinct from 'yes' then raise exception 'BACKUP_REQUIRED';end if;end $$;
create table public.service_sessions(
 business_id text not null,id text not null,service_point_id text not null,status text not null default 'open' check(status in ('open','closed')),
 opened_at timestamptz not null default now(),closed_at timestamptz,closed_by uuid references auth.users(id),expires_at timestamptz not null default now()+interval '12 hours',source text not null default 'onsite',
 primary key(business_id,id),unique(business_id,id,service_point_id),foreign key(business_id,service_point_id) references public.service_points(business_id,id)
);
create unique index one_open_point_session on public.service_sessions(business_id,service_point_id) where status='open';
create table public.session_guests(
 business_id text not null,id text not null,session_id text not null,token_hash text not null,expires_at timestamptz not null default now()+interval '72 hours',revoked_at timestamptz,created_at timestamptz not null default now(),
 primary key(business_id,id),unique(business_id,id,session_id),unique(business_id,session_id,token_hash),foreign key(business_id,session_id) references public.service_sessions(business_id,id)
);
create table public.business_order_counters(business_id text primary key references public.businesses(id),next_number bigint not null default 1001);
create table public.orders(
 business_id text not null,id text not null,session_id text not null,service_point_id text not null,guest_id text not null,
 source text not null default 'onsite',status text not null default 'pending_waiter' check(status in ('pending_waiter','cooking','ready','delivered','cancelled')),
 number text not null,menu_id_snapshot text,version bigint not null default 1,total_toman bigint not null check(total_toman>=0),
 customer_name text not null default '',customer_note text not null default '',restaurant_confirmed boolean not null default false,
 idempotency_key text not null,request_hash text not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 primary key(business_id,id),unique(business_id,guest_id,idempotency_key),unique(business_id,number),
 foreign key(business_id,session_id,service_point_id) references public.service_sessions(business_id,id,service_point_id),
 foreign key(business_id,guest_id,session_id) references public.session_guests(business_id,id,session_id)
);
create table public.order_items(
 business_id text not null,id text not null,order_id text not null,product_id text,product_id_snapshot text not null,menu_id_snapshot text,
 name_snapshot text not null,unit_price_toman bigint not null check(unit_price_toman>=0),quantity numeric(12,3) not null check(quantity>0),unit_snapshot text not null default 'each',
 note text not null default '',waiter_note text not null default '',line_total_toman bigint not null check(line_total_toman>=0),sort_order integer not null,
 kitchen_status text not null default 'pending' check(kitchen_status in ('pending','ready','delivered')),delivered_quantity numeric(12,3) not null default 0 check(delivered_quantity between 0 and quantity),
 primary key(business_id,id),foreign key(business_id,order_id) references public.orders(business_id,id),foreign key(business_id,product_id) references public.products(business_id,id)
);
create table public.order_item_options(
 business_id text not null,id text not null,item_id text not null,option_id text,group_id text,
 group_snapshot text not null,name_snapshot text not null,extra_price_toman bigint not null check(extra_price_toman>=0),sort_order integer not null,
 primary key(business_id,id),foreign key(business_id,item_id) references public.order_items(business_id,id)
);
create table public.order_events(
 business_id text not null,id text not null,order_id text not null,sequence bigint not null,actor_type text not null check(actor_type in ('guest','staff','import')),
 actor_id text,action text not null,before_version bigint,after_version bigint not null,data jsonb not null default '{}',created_at timestamptz not null default now(),
 primary key(business_id,id),unique(business_id,order_id,sequence),foreign key(business_id,order_id) references public.orders(business_id,id)
);
create table public.order_payment_entries(
 business_id text not null,id text not null,order_id text not null,kind text not null check(kind in ('receipt','refund')),method text not null default 'cash',
 amount_toman bigint not null check(amount_toman>=0),actor_id uuid references auth.users(id),idempotency_key text not null,created_at timestamptz not null default now(),
 primary key(business_id,id),unique(business_id,order_id,idempotency_key),foreign key(business_id,order_id) references public.orders(business_id,id)
);
create table public.order_commands(
 business_id text not null,order_id text not null,key text not null,request_hash text not null,result jsonb not null,created_at timestamptz not null default now(),
 primary key(business_id,order_id,key),foreign key(business_id,order_id) references public.orders(business_id,id)
);
create table public.service_requests(
 business_id text not null,id text not null,session_id text not null,service_point_id text not null,guest_id text not null,type text not null,
 message text not null default '',status text not null default 'pending' check(status in ('pending','accepted','resolved','cancelled')),assigned_user_id uuid references auth.users(id),
 created_at timestamptz not null default now(),resolved_at timestamptz,
 primary key(business_id,id),foreign key(business_id,session_id,service_point_id) references public.service_sessions(business_id,id,service_point_id),
 foreign key(business_id,guest_id,session_id) references public.session_guests(business_id,id,session_id)
);
create index orders_by_business_status on public.orders(business_id,status,created_at);
create index guests_by_hash on public.session_guests(business_id,token_hash);
create table public.session_notices(
 business_id text not null,id text not null,session_id text not null,actor_id uuid not null references auth.users(id),message text not null check(length(message) between 1 and 300),created_at timestamptz not null default now(),
 primary key(business_id,id),foreign key(business_id,session_id) references public.service_sessions(business_id,id)
);
create function public.order_ledger_total(bid text,oid text) returns bigint language sql stable set search_path=public,pg_temp as $$
 select coalesce(sum(case when kind='receipt' then amount_toman else -amount_toman end),0)::bigint from order_payment_entries where business_id=bid and order_id=oid;
$$;
create function public.order_dto(bid text,oid text) returns jsonb language sql stable set search_path=public,pg_temp as $$
 select jsonb_build_object('id',o.id,'businessId',o.business_id,'menuId',o.menu_id_snapshot,'sessionId',o.session_id,'servicePointId',o.service_point_id,'version',o.version,'tableNumber',p.table_number,'orderNumber',o.number,
 'customerName',o.customer_name,'customerNotes',o.customer_note,'totalAmount',o.total_toman,'status',o.status,'restaurantConfirmed',o.restaurant_confirmed,
 'paymentStatus',case when exists(select 1 from order_payment_entries where business_id=bid and order_id=oid) and order_ledger_total(bid,oid)>=o.total_toman then 'paid_cash' else 'unpaid' end,
 'deliveryStatus',case when o.status='delivered' then 'delivered' else 'pending' end,'createdAt',o.created_at,'updatedAt',o.updated_at,
 'items',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'productId',i.product_id_snapshot,'productName',i.name_snapshot,'menuId',i.menu_id_snapshot,'unitPriceSnapshot',i.unit_price_toman,'quantity',i.quantity,'notes',i.note,'waiterNotes',i.waiter_note,'itemTotal',i.line_total_toman,'deliveryStatus',case when i.delivered_quantity=i.quantity then 'delivered' else 'pending' end,
 'selectedOptions',coalesce((select jsonb_agg(jsonb_build_object('groupId',x.group_id,'optionId',x.option_id,'groupTitle',x.group_snapshot,'optionName',x.name_snapshot,'extraPrice',x.extra_price_toman) order by x.sort_order) from order_item_options x where x.business_id=bid and x.item_id=i.id),'[]')) order by i.sort_order,i.id) from order_items i where i.business_id=bid and i.order_id=oid),'[]'))
 from orders o join service_points p on p.business_id=o.business_id and p.id=o.service_point_id where o.business_id=bid and o.id=oid;
$$;
create function public.order_request_dto(bid text,rid text) returns jsonb language sql stable set search_path=public,pg_temp as $$
 select jsonb_build_object('id',r.id,'sessionId',r.session_id,'tableNumber',p.table_number,'type',r.type,'message',r.message,'status',r.status,'createdAt',r.created_at) from service_requests r join service_points p on p.business_id=r.business_id and p.id=r.service_point_id where r.business_id=bid and r.id=rid;
$$;
-- Strict import: retain old IDs, totals and guest hashes, including missing historical products.
do $$ declare w record;o jsonb;i jsonb;x jsonb;c jsonb;pid text;sid text;gid text;itemid text;oi integer;xi integer;total bigint;closed boolean;begin
 for w in select id,payload from menu_workspaces loop
  for o in select value from jsonb_array_elements(coalesce(w.payload->'orders','[]'))loop
   select id into pid from service_points where business_id=w.id and table_number=(o->>'tableNumber')::int;
   if pid is null then raise exception 'ORDER_IMPORT_POINT_MISSING';end if;
   closed=o->>'status' in ('delivered','cancelled');sid=null;
   if not closed then select id into sid from service_sessions where business_id=w.id and service_point_id=pid and status='open';end if;
   if sid is null then sid='legacy-session-'||(o->>'id');insert into service_sessions(business_id,id,service_point_id,status,opened_at,closed_at,source) values(w.id,sid,pid,case when closed then 'closed' else 'open' end,(o->>'createdAt')::timestamptz,case when closed then (o->>'updatedAt')::timestamptz end,'legacy_import');end if;
   gid='legacy-guest-'||(o->>'id');insert into session_guests(business_id,id,session_id,token_hash,expires_at) values(w.id,gid,sid,coalesce(o->>'guestTokenHash',encode(sha256(convert_to(gen_random_uuid()::text,'UTF8')),'hex')),now()+interval '90 days');
   if (o->>'totalAmount')::numeric<>(o->>'totalAmount')::bigint then raise exception 'ORDER_IMPORT_FRACTIONAL_AMOUNT';end if;
   insert into orders(business_id,id,session_id,service_point_id,guest_id,source,status,number,menu_id_snapshot,total_toman,customer_name,customer_note,restaurant_confirmed,idempotency_key,request_hash,created_at,updated_at)
    values(w.id,o->>'id',sid,pid,gid,'legacy_import',o->>'status',o->>'orderNumber',o->>'menuId',(o->>'totalAmount')::bigint,coalesce(o->>'customerName',''),coalesce(o->>'customerNotes',''),coalesce((o->>'restaurantConfirmed')::boolean,o->>'status' in ('ready','delivered')),coalesce(o->>'idempotencyKey',o->>'id'),md5(o::text),(o->>'createdAt')::timestamptz,(o->>'updatedAt')::timestamptz);
   oi=0;total=0;
   for i in select value from jsonb_array_elements(o->'items')loop
    itemid=i->>'id';insert into order_items(business_id,id,order_id,product_id,product_id_snapshot,menu_id_snapshot,name_snapshot,unit_price_toman,quantity,note,waiter_note,line_total_toman,sort_order,kitchen_status,delivered_quantity)
    values(w.id,itemid,o->>'id',(select id from products where business_id=w.id and id=i->>'productId'),i->>'productId',coalesce((select menu_id from products where business_id=w.id and id=i->>'productId'),o->>'menuId'),i->>'productName',(i->>'unitPriceSnapshot')::bigint,(i->>'quantity')::numeric,coalesce(i->>'notes',''),coalesce(i->>'waiterNotes',''),(i->>'itemTotal')::bigint,oi,case when o->>'status'='delivered' then 'delivered' when o->>'status'='ready' then 'ready' else 'pending' end,case when o->>'status'='delivered' then (i->>'quantity')::numeric else 0 end);
    total=total+(i->>'itemTotal')::bigint;oi=oi+1;xi=0;
    for x in select value from jsonb_array_elements(coalesce(i->'selectedOptions','[]'))loop insert into order_item_options(business_id,id,item_id,group_snapshot,name_snapshot,extra_price_toman,sort_order) values(w.id,itemid||'-option-'||xi,itemid,x->>'groupTitle',x->>'optionName',(x->>'extraPrice')::bigint,xi);xi=xi+1;end loop;
   end loop;
   if total<>(o->>'totalAmount')::bigint then raise exception 'ORDER_IMPORT_TOTAL_MISMATCH';end if;
   if o->>'paymentStatus'<>'unpaid' then insert into order_payment_entries(business_id,id,order_id,kind,method,amount_toman,idempotency_key,created_at) values(w.id,'legacy-receipt-'||(o->>'id'),o->>'id','receipt',coalesce(o->>'paymentStatus','cash'),total,'legacy-import',(o->>'updatedAt')::timestamptz);end if;
   if o->>'status' in ('cooking','ready','delivered') and order_ledger_total(w.id,o->>'id')<total then raise exception 'ORDER_IMPORT_UNPAID_ACTIVE';end if;
   insert into order_events(business_id,id,order_id,sequence,actor_type,action,after_version,created_at) values(w.id,'import-'||(o->>'id'),o->>'id',1,'import','legacy_import',1,(o->>'createdAt')::timestamptz);
  end loop;
  for c in select value from jsonb_array_elements(coalesce(w.payload->'serviceCalls','[]'))loop
   select id into pid from service_points where business_id=w.id and table_number=(c->>'tableNumber')::int;if pid is null then raise exception 'CALL_IMPORT_POINT_MISSING';end if;
   sid='legacy-call-session-'||(c->>'id');gid='legacy-call-guest-'||(c->>'id');
   insert into service_sessions(business_id,id,service_point_id,status,source,opened_at,closed_at) values(w.id,sid,pid,'closed','legacy_import',(c->>'createdAt')::timestamptz,now());
   insert into session_guests(business_id,id,session_id,token_hash) values(w.id,gid,sid,encode(sha256(convert_to(gen_random_uuid()::text,'UTF8')),'hex'));
   insert into service_requests(business_id,id,session_id,service_point_id,guest_id,type,message,status,created_at,resolved_at) values(w.id,c->>'id',sid,pid,gid,c->>'type',coalesce(c->>'message',''),c->>'status',(c->>'createdAt')::timestamptz,case when c->>'status'='resolved' then now() end);
  end loop;
  insert into business_order_counters select w.id,greatest(1001,coalesce(max(nullif(regexp_replace(number,'[^0-9]','','g'),'')::bigint)+1,1001)) from orders where business_id=w.id;
 end loop;
end $$;
create function public.order_guest(bid text,sid text,token text,require_open boolean default true) returns public.session_guests language plpgsql stable security definer set search_path=public,pg_temp as $$
declare g session_guests;begin
 select x.* into g from session_guests x join service_sessions s on s.business_id=x.business_id and s.id=x.session_id where x.business_id=bid and x.session_id=sid and x.token_hash=encode(sha256(convert_to(token,'UTF8')),'hex') and x.revoked_at is null and x.expires_at>now() and (not require_open or s.status='open');
 if g.id is null then raise exception 'SESSION_INVALID: نشست سفارش منقضی یا بسته شده است؛ دوباره منو را باز کن';end if;return g;
end $$;
create function public.order_open_session(body jsonb) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare resolved jsonb;bid text;pid text;s service_sessions;g session_guests;token text=body->>'guestToken';hash text;
begin
 if length(coalesce(token,'')) not between 32 and 100 then raise exception 'توکن مهمان معتبر نیست';end if;hash=encode(sha256(convert_to(token,'UTF8')),'hex');
 resolved=point_resolve(body);if resolved->>'status'<>'200' then return resolved;end if;bid=resolved#>>'{data,business,id}';pid=resolved#>>'{data,servicePoint,id}';
 perform 1 from service_points where business_id=bid and id=pid for update;
 select x.* into g from session_guests x join service_sessions ss on ss.business_id=x.business_id and ss.id=x.session_id where x.business_id=bid and ss.service_point_id=pid and x.token_hash=hash limit 1;
 if g.id is not null then
  select * into s from service_sessions where business_id=bid and id=g.session_id;
  if s.status<>'open' or g.expires_at<=now() or g.revoked_at is not null then return jsonb_build_object('status',409,'data',jsonb_build_object('error','نشست قبلی پایان یافته؛ برای سفارش تازه دوباره شروع کن','code','SESSION_CLOSED'));end if;
 else
  select * into s from service_sessions where business_id=bid and service_point_id=pid and status='open';
  if s.id is not null and s.expires_at<=now() and not exists(select 1 from orders where business_id=bid and session_id=s.id and status not in ('delivered','cancelled')) and not exists(select 1 from service_requests where business_id=bid and session_id=s.id and status in ('pending','accepted')) then update service_sessions set status='closed',closed_at=now() where business_id=bid and id=s.id;s.id=null;end if;
  if s.id is null then insert into service_sessions(business_id,id,service_point_id) values(bid,'session-'||gen_random_uuid(),pid) returning * into s;end if;
  insert into session_guests(business_id,id,session_id,token_hash) values(bid,'guest-'||gen_random_uuid(),s.id,hash) returning * into g;
 end if;
 update service_points set is_occupied=true where business_id=bid and id=pid;
 return jsonb_build_object('status',200,'data',jsonb_build_object('businessId',bid,'sessionId',s.id,'guestId',g.id,'servicePointId',pid,'expiresAt',g.expires_at));
end $$;
create function public.order_create(body jsonb) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare bid text=body->>'businessId';sid text=body->>'sessionId';key text=body->>'idempotencyKey';g session_guests;ss service_sessions;o orders;p products;group_row product_option_groups;option_row product_options;item jsonb;choice jsonb;chosen text[];qty int;extra bigint;line bigint;total bigint=0;idx int=0;xi int;itemid text;oid text;fingerprint text;n bigint;expected integer;
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
 update orders set total_toman=total where business_id=bid and id=oid;
 insert into order_events(business_id,id,order_id,sequence,actor_type,actor_id,action,after_version) values(bid,gen_random_uuid()::text,oid,1,'guest',g.id,'created',1);
 return jsonb_build_object('status',200,'data',order_dto(bid,oid));
end $$;
create function public.order_action(bid text,oid text,uid uuid,body jsonb) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare o orders;command_key text=body->>'idempotencyKey';fingerprint text=md5(body::text);cmd order_commands;act text=body->>'action';actor_role text=access_role(uid,bid);amount bigint;v jsonb;
begin
 if (act='confirm' and actor_role is distinct from 'kitchen') or (act in ('send','deliver','remove','note') and actor_role is distinct from 'waiter') then raise exception 'مجوز این عملیات را ندارید';end if;
 select * into o from orders where business_id=bid and id=oid for update;if o.id is null then raise exception 'سفارش پیدا نشد';end if;
 if length(coalesce(command_key,'')) not between 10 and 100 or body->>'expectedVersion' is null then raise exception 'شناسه درخواست و نسخه سفارش لازم است؛ صفحه را تازه کن';end if;
 select * into cmd from order_commands where business_id=bid and order_id=oid and order_commands.key=command_key;
 if cmd.key is not null then if cmd.request_hash<>fingerprint then raise exception 'CONFLICT: محتوای فرمان تغییر کرده است';end if;return jsonb_build_object('status',200,'data',cmd.result);end if;
 if o.version<>(body->>'expectedVersion')::bigint then raise exception 'CONFLICT: سفارش تغییر کرده است؛ دوباره بررسی کن';end if;
 if o.status in ('delivered','cancelled') then raise exception 'سفارش بسته شده است';end if;amount=order_ledger_total(bid,oid);
 if act='send' then
  if o.status<>'pending_waiter' or not exists(select 1 from order_items where business_id=bid and order_id=oid) then raise exception 'سفارش قابل ارسال نیست';end if;
  insert into order_payment_entries(business_id,id,order_id,kind,amount_toman,actor_id,idempotency_key) values(bid,gen_random_uuid()::text,oid,'receipt',greatest(0,o.total_toman-amount),uid,command_key);
  update orders set status='cooking',restaurant_confirmed=false where business_id=bid and id=oid;
 elsif act='confirm' then
  if o.status<>'cooking' or amount<o.total_toman then raise exception 'ابتدا پرداخت و ارسال لازم است';end if;
  update order_items set kitchen_status='ready' where business_id=bid and order_id=oid;update orders set status='ready',restaurant_confirmed=true where business_id=bid and id=oid;
 elsif act='deliver' then
  if o.status<>'ready' or not o.restaurant_confirmed or amount<o.total_toman or exists(select 1 from order_items where business_id=bid and order_id=oid and kitchen_status<>'ready') then raise exception 'ابتدا تأیید آشپزخانه و تسویه لازم است';end if;
  update order_items set delivered_quantity=quantity,kitchen_status='delivered' where business_id=bid and order_id=oid;update orders set status='delivered' where business_id=bid and id=oid;
 elsif act in ('remove','note') then
  if o.status<>'pending_waiter' or exists(select 1 from order_payment_entries where business_id=bid and order_id=oid) then raise exception 'ویرایش عادی فقط قبل از دریافت وجه مجاز است';end if;
  perform 1 from order_items where business_id=bid and order_id=oid and id=body->>'itemId';if not found then raise exception 'آیتم پیدا نشد';end if;
  if act='remove' then delete from order_item_options where business_id=bid and item_id=body->>'itemId';delete from order_items where business_id=bid and order_id=oid and id=body->>'itemId';
   update orders set total_toman=(select coalesce(sum(line_total_toman),0) from order_items where business_id=bid and order_id=oid),status=case when exists(select 1 from order_items where business_id=bid and order_id=oid) then 'pending_waiter' else 'cancelled' end where business_id=bid and id=oid;
  else update order_items set waiter_note=left(coalesce(body->>'note',''),500) where business_id=bid and order_id=oid and id=body->>'itemId';end if;
 else raise exception 'عملیات معتبر نیست';end if;
 update orders set version=version+1,updated_at=now() where business_id=bid and id=oid;
 insert into order_events(business_id,id,order_id,sequence,actor_type,actor_id,action,before_version,after_version,data) values(bid,gen_random_uuid()::text,oid,o.version+1,'staff',uid::text,act,o.version,o.version+1,jsonb_build_object('itemId',body->>'itemId'));
 v=order_dto(bid,oid);if actor_role='kitchen' then v=access_kitchen_order(v);end if;
 insert into order_commands(business_id,order_id,key,request_hash,result) values(bid,oid,command_key,fingerprint,v);
 return jsonb_build_object('status',200,'data',v);
end $$;
create function public.order_api(p_path text,p_method text,p_body jsonb,p_uid uuid) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare bid text;sid text;pid text;rid text;g session_guests;v jsonb;grant_row jsonb;o orders;
begin
 select active_business_id into bid from profiles where user_id=p_uid;
 if p_path='/sessions/open' and p_method='POST' then return order_open_session(p_body);
 elsif p_path='/sessions/status' and p_method='POST' then
  bid=p_body->>'businessId';sid=p_body->>'sessionId';g=order_guest(bid,sid,p_body->>'guestToken',false);
  v=jsonb_build_object('status',(select status from service_sessions where business_id=bid and id=sid),'orders',(select coalesce(jsonb_agg(order_dto(bid,id) order by created_at),'[]') from orders where business_id=bid and guest_id=g.id),
   'notices',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'message',message,'createdAt',created_at) order by created_at),'[]') from session_notices where business_id=bid and session_id=sid and created_at>=g.created_at));
 elsif p_path='/sessions/report' and p_method='GET' then
  if coalesce(access_role(p_uid,bid),'') not in ('owner','manager') then raise exception 'دسترسی مدیریت لازم است';end if;
  select coalesce(jsonb_agg(x),'[]') into v from(select ss.id,p.label,ss.opened_at as "openedAt",ss.closed_at as "closedAt",ss.status,floor(extract(epoch from coalesce(ss.closed_at,now())-ss.opened_at)) as "durationSeconds",ss.source from service_sessions ss join service_points p on p.business_id=ss.business_id and p.id=ss.service_point_id where ss.business_id=bid order by ss.opened_at desc limit 100)x;
 elsif p_path like '/sessions/%/remind' and p_method='POST' then
  if coalesce(access_role(p_uid,bid),'') not in ('owner','manager','waiter') then raise exception 'دسترسی سالن لازم است';end if;sid=split_part(p_path,'/',3);
  perform 1 from service_sessions where business_id=bid and id=sid and status='open' for update;if not found then raise exception 'نشست باز پیدا نشد';end if;
  select id into rid from session_notices where business_id=bid and session_id=sid and created_at>now()-interval '10 minutes' order by created_at desc limit 1;
  if rid is null then rid=gen_random_uuid()::text;insert into session_notices values(bid,rid,sid,p_uid,'اگر میل دارید، می‌توانید سفارش تازه‌ای از منو ثبت کنید.',now());end if;v=jsonb_build_object('ok',true,'id',rid);
 elsif p_path='/orders' and p_method='POST' then return order_create(p_body);
 elsif p_path like '/orders/%/action' and p_method='POST' then return order_action(bid,split_part(p_path,'/',3),p_uid,p_body);
 elsif p_path='/order-status' then
  if jsonb_typeof(p_body->'grants') is distinct from 'array' or jsonb_array_length(p_body->'grants')>10 then raise exception 'درخواست پیگیری معتبر نیست';end if;v='[]';
  for grant_row in select value from jsonb_array_elements(p_body->'grants')loop
   select ord.* into o from orders ord join session_guests gg on gg.business_id=ord.business_id and gg.id=ord.guest_id where ord.business_id=grant_row->>'businessId' and ord.id=grant_row->>'id' and gg.token_hash=encode(sha256(convert_to(grant_row->>'token','UTF8')),'hex') and gg.revoked_at is null and gg.expires_at>now();
   if o.id is not null then v=v||jsonb_build_array(order_dto(o.business_id,o.id));end if;
  end loop;
 elsif p_path like '/sessions/%/close' and p_method='POST' then
  if coalesce(access_role(p_uid,bid),'') not in ('owner','manager','waiter') then raise exception 'دسترسی سالن لازم است';end if;sid=split_part(p_path,'/',3);
  select service_point_id into pid from service_sessions where business_id=bid and id=sid for update;if pid is null then raise exception 'نشست پیدا نشد';end if;
  if exists(select 1 from orders where business_id=bid and session_id=sid and status not in ('delivered','cancelled')) or exists(select 1 from service_requests where business_id=bid and session_id=sid and status in ('pending','accepted')) then raise exception 'ابتدا سفارش‌ها و درخواست‌های باز این میز را تعیین تکلیف کن';end if;
  update service_sessions set status='closed',closed_at=coalesce(closed_at,now()),closed_by=coalesce(closed_by,p_uid) where business_id=bid and id=sid;update service_points set is_occupied=false where business_id=bid and id=pid;v=jsonb_build_object('ok',true);
 elsif p_path='/calls' and p_method='POST' then
  bid=p_body->>'businessId';sid=p_body->>'sessionId';g=order_guest(bid,sid,p_body->>'guestToken');select service_point_id into pid from service_sessions where business_id=bid and id=sid and status='open' for update;if pid is null then raise exception 'SESSION_INVALID: نشست بسته شده است';end if;
  if p_body->>'type' is null or p_body->>'type' not in ('waiter','cashier','manager','utensils','custom') then raise exception 'نوع درخواست معتبر نیست';end if;
  if not menu_rate('guest-call-'||g.id,6) then return jsonb_build_object('status',429,'data',jsonb_build_object('error','درخواست قبلی ثبت شده؛ کمی صبر کن'));end if;
  select id into rid from service_requests where business_id=bid and guest_id=g.id and type=p_body->>'type' and status in ('pending','accepted') limit 1;
  if rid is null then rid='call-'||gen_random_uuid();insert into service_requests(business_id,id,session_id,service_point_id,guest_id,type,message) values(bid,rid,sid,pid,g.id,p_body->>'type',left(coalesce(p_body->>'message','درخواست گارسون'),500));end if;v=order_request_dto(bid,rid);
 elsif p_path like '/calls/%' and p_method in ('PATCH','POST') then
  if coalesce(access_role(p_uid,bid),'') not in ('owner','manager','waiter') then raise exception 'دسترسی سالن لازم است';end if;rid=split_part(p_path,'/',3);
  update service_requests set status='resolved',resolved_at=coalesce(resolved_at,now()),assigned_user_id=p_uid where business_id=bid and id=rid;if not found then raise exception 'درخواست پیدا نشد';end if;v=order_request_dto(bid,rid);
 else return null;end if;
 return jsonb_build_object('status',200,'data',v);
exception when others then return jsonb_build_object('status',case when sqlerrm like 'CONFLICT:%' then 409 when sqlerrm like 'SESSION_INVALID:%' then 401 else 400 end,'data',jsonb_build_object('error',case when sqlstate='P0001' then sqlerrm else 'اطلاعات سفارش معتبر نیست' end,'code',case when sqlerrm like 'CONFLICT:%' then 'CONFLICT' when sqlerrm like 'SESSION_INVALID:%' then 'SESSION_INVALID' else 'ORDER_INVALID' end));
end $$;
do $$ declare ddl text;begin
 select pg_get_functiondef('public.catalog_workspace_snapshot(text)'::regprocedure) into ddl;
 ddl=replace(ddl,$txt$'catalogVersion',1,$txt$,$txt$'catalogVersion',1,'orders',coalesce((select jsonb_agg(order_dto(bid,id) order by created_at,id) from orders where business_id=bid),'[]'::jsonb),'serviceCalls',coalesce((select jsonb_agg(order_request_dto(bid,id) order by created_at,id) from service_requests where business_id=bid),'[]'::jsonb),$txt$);execute ddl;
 select pg_get_functiondef('public.menu_api_v2(text,text,jsonb,uuid)'::regprocedure) into ddl;
 ddl=replace(ddl,'answer=point_api(p_path,p_method,p_body,p_uid);','answer=order_api(p_path,p_method,p_body,p_uid);if answer is not null then return answer;end if;answer=point_api(p_path,p_method,p_body,p_uid);');execute ddl;
 select pg_get_functiondef('public.access_authorize(text,text,jsonb,uuid)'::regprocedure) into ddl;
 ddl=replace(ddl,$txt$'/public/resolve','/order-status'$txt$,$txt$'/public/resolve','/sessions/open','/sessions/status','/order-status'$txt$);
 ddl=replace(ddl,$txt$if p_path like '/calls/%'$txt$,$txt$if p_path like '/sessions/%/close' or p_path like '/sessions/%/remind' then return jsonb_build_object('allowed',r in ('owner','manager','waiter'),'status',403,'error','دسترسی سالن لازم است');end if;if p_path like '/calls/%'$txt$);execute ddl;
 select pg_get_functiondef('public.access_kitchen_order(jsonb)'::regprocedure) into ddl;
 ddl=replace(ddl,$txt$'id',o->>'id',$txt$,$txt$'id',o->>'id','version',o->'version',$txt$);execute ddl;
 select pg_get_functiondef('public.point_dto(text,text)'::regprocedure) into ddl;
 ddl=replace(ddl,$txt$'version',p.version,$txt$,$txt$'version',p.version,'activeSession',(select jsonb_build_object('id',id,'openedAt',opened_at,'durationSeconds',floor(extract(epoch from now()-opened_at))) from service_sessions where business_id=bid and service_point_id=pid and status='open'),$txt$);execute ddl;
 select pg_get_functiondef('public.catalog_workspace_write()'::regprocedure) into ddl;
 ddl=replace(ddl,$txt$'categories','servicePoints'$txt$,$txt$'categories','servicePoints','orders','serviceCalls'$txt$);execute ddl;
end $$;
create or replace function public.menu_api(p_path text,p_method text,p_body jsonb default '{}',p_uid uuid default null) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v jsonb;begin
 if p_path='/health' then return jsonb_build_object('status',200,'data',jsonb_build_object('ok',true,'provider','supabase','demo',false,'catalogVersion',1,'accessVersion',1,'pointVersion',1,'orderVersion',1));end if;
 if p_path='/public/feed' then
  select coalesce(jsonb_agg(q.data),'[]') into v from(select jsonb_build_object('id',o.id,'name',b.name,'items',(select string_agg(quantity::text||' '||name_snapshot,' · ' order by sort_order) from order_items where business_id=o.business_id and order_id=o.id),'image',(select catalog_product(o.business_id,product_id)->>'imageUrl' from order_items where business_id=o.business_id and order_id=o.id order by sort_order limit 1),'createdAt',o.created_at) data from orders o join businesses b on b.id=o.business_id where o.status not in ('delivered','cancelled') and b.status='active' order by o.created_at desc limit 15)q;
  return jsonb_build_object('status',200,'data',v);
 end if;
 if p_path in ('/workspace','/public/menu','/business','/menus','/menus/build','/products','/categories','/catalog/capabilities') or p_path like '/menus/%' or p_path like '/products/%' or p_path like '/categories/%' then return catalog_api(p_path,p_method,p_body,p_uid);end if;
 return jsonb_build_object('status',404,'data',jsonb_build_object('error','مسیر پیدا نشد'));
end $$;
drop function public.menu_api_legacy_catalog(text,text,jsonb,uuid);
update menu_workspaces set payload=payload-array['orders','serviceCalls'];
create function public.order_append_only() returns trigger language plpgsql set search_path=public,pg_temp as $$begin raise exception 'سابقه سفارش و دفتر وجه فقط قابل افزودن است';end $$;
create trigger order_events_append_only before update or delete on public.order_events for each row execute function public.order_append_only();
create trigger order_ledger_append_only before update or delete on public.order_payment_entries for each row execute function public.order_append_only();
do $$ declare t text;f record;begin
 foreach t in array array['service_sessions','session_guests','business_order_counters','orders','order_items','order_item_options','order_events','order_payment_entries','order_commands','service_requests','session_notices']loop execute format('alter table public.%I enable row level security',t);execute format('revoke all on public.%I from public,anon,authenticated',t);execute format('grant all on public.%I to service_role',t);end loop;
 for f in select p.oid::regprocedure signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'order_%' loop execute format('revoke all on function %s from public,anon,authenticated',f.signature);execute format('grant execute on function %s to service_role',f.signature);end loop;
end $$;
commit;
