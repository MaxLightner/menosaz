create or replace function public.menu_otp_sent(p_phone text,p_nonce uuid,p_ttl integer) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.menu_otp_requests; seconds integer=greatest(30,least(coalesce(p_ttl,120),900));
begin
 update menu_otp_requests set expires=now()+make_interval(secs=>seconds) where phone_hash=encode(sha256(convert_to(p_phone,'UTF8')),'hex') and nonce=p_nonce and not used returning * into r;
 if r.phone_hash is null then raise exception 'درخواست کد معتبر نیست';end if;
 return jsonb_build_object('expiresIn',seconds,'resendAt',floor(extract(epoch from r.next_send)*1000),'serverNow',floor(extract(epoch from now())*1000));
end $$;
revoke all on function public.menu_otp_sent(text,uuid,integer) from public,anon,authenticated;
grant execute on function public.menu_otp_sent(text,uuid,integer) to service_role;

create or replace function public.menu_api(p_path text,p_method text,p_body jsonb default '{}',p_uid uuid default null) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare a public.menu_accounts; s jsonb; m jsonb; v jsonb; o jsonb; items jsonb; i jsonb; pr jsonb; opt jsonb; g jsonb; chosen jsonb; picked jsonb; result jsonb; total numeric; extra numeric; bid text; mid text; rid text; action text; ph text; newid text; idx integer; n integer; qty integer; t text=to_char(now() at time zone 'utc','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
begin
 if p_uid is not null then select * into a from menu_accounts where user_id=p_uid; end if;
 if p_path='/health' then return jsonb_build_object('status',200,'data',jsonb_build_object('ok',true,'provider','supabase','demo',false)); end if;
 if p_path in ('/account','/register') and p_uid is not null then
  select phone into ph from auth.users where id=p_uid and phone_confirmed_at is not null;
  if ph is null then raise exception 'شماره موبایل تأیید نشده است'; end if;
  if a.user_id is null then
   if ph not in ('989152061541','+989152061541') and (p_path<>'/register' or p_body->'acceptTerms' is distinct from 'true'::jsonb or coalesce(trim(p_body->>'businessName'),'')='') then return jsonb_build_object('status',403,'data',jsonb_build_object('error','ثبت‌نام و پذیرش قوانین لازم است','code','REGISTRATION_REQUIRED')); end if;
   bid=case when ph in ('989152061541','+989152061541') then 'pich-shemroon' else 'venue-'||replace(p_uid::text,'-','') end;
   if not exists(select 1 from menu_workspaces where id=bid) then
    select payload into s from menu_workspaces where id='pich-shemroon';
    s=jsonb_set(s,'{business}',(s->'business')||jsonb_build_object('id',bid,'name',left(p_body->>'businessName',80),'phone',ph,'branchName','','address',''))||jsonb_build_object('menus',jsonb_build_array(jsonb_build_object('id','main','name','منوی اصلی','kind','restaurant','published',true)),'products','[]'::jsonb,'orders','[]'::jsonb,'serviceCalls','[]'::jsonb);
    insert into menu_workspaces(id,payload) values(bid,s);
   end if;
   insert into menu_accounts(user_id,business_id,role,terms_version,accepted_at) values(p_uid,bid,case when ph in ('989152061541','+989152061541') then 'admin' else 'manager' end,case when p_body->'acceptTerms'='true' then '2026-10-13' end,case when p_body->'acceptTerms'='true' then now() end) returning * into a;
  end if;
  return jsonb_build_object('status',200,'data',jsonb_build_object('account',jsonb_build_object('name',case when a.role='admin' then 'ادمین منوساز' else 'مدیر مجموعه' end,'phone',ph,'role',a.role,'demo',false)));
 end if;
 if p_path='/public/feed' then
  select coalesce(jsonb_agg(q.v),'[]') into result from (select jsonb_build_object('id',e->>'id','name',w.payload#>>'{business,name}','items',(select string_agg((x->>'quantity')||' '||(x->>'productName'),' · ') from jsonb_array_elements(e->'items') x),'image',(select x->>'imageUrl' from jsonb_array_elements(w.payload->'products') x where x->>'id'=e#>>'{items,0,productId}' limit 1),'createdAt',e->>'createdAt') v from menu_workspaces w cross join lateral jsonb_array_elements(w.payload->'orders') e where e->>'status' not in ('delivered','cancelled') order by e->>'createdAt' desc limit 15) q;
  return jsonb_build_object('status',200,'data',result);
 end if;
 if p_path='/admin/overview' then
  if a.role is distinct from 'admin' then return jsonb_build_object('status',403,'data',jsonb_build_object('error','دسترسی ادمین لازم است')); end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',payload#>>'{business,name}','phone',payload#>>'{business,phone}','menus',jsonb_array_length(payload->'menus'),'products',jsonb_array_length(payload->'products'),'orders',jsonb_array_length(payload->'orders'),'pending',(select count(*) from jsonb_array_elements(payload->'orders') x where x->>'status' not in ('delivered','cancelled')))),'[]') into result from menu_workspaces;
  return jsonb_build_object('status',200,'data',jsonb_build_object('venues',result,'accounts',(select coalesce(jsonb_agg(jsonb_build_object('phone',u.phone,'business',c.business_id,'terms',c.terms_version)),'[]') from menu_accounts c join auth.users u on u.id=c.user_id),'totals',jsonb_build_object('venues',jsonb_array_length(result),'orders',(select coalesce(sum((x->>'orders')::integer),0) from jsonb_array_elements(result) x))));
 end if;
 if p_path='/public/menu' then
  bid=coalesce(p_body->>'business','pich-shemroon');mid=coalesce(p_body->>'menu','main');select payload into s from menu_workspaces where id=bid;
  select x into m from jsonb_array_elements(s->'menus') x where x->>'id'=mid and x->'published'='true';
  if m is null then return jsonb_build_object('status',404,'data',jsonb_build_object('error','منو پیدا نشد یا منتشر نشده است')); end if;
  return jsonb_build_object('status',200,'data',jsonb_build_object('business',(s->'business')||coalesce(m->'appearance','{}'),'menus',(select jsonb_agg(x) from jsonb_array_elements(s->'menus') x where x->'published'='true'),'products',(select coalesce(jsonb_agg(x),'[]') from jsonb_array_elements(s->'products') x where coalesce(x->>'menuId','main')=mid),'servicePoints',s->'servicePoints','orders','[]'::jsonb,'serviceCalls','[]'::jsonb));
 end if;
 if p_path='/order-status' then
  if jsonb_array_length(p_body->'grants')>10 then raise exception 'درخواست معتبر نیست'; end if;result='[]';
  for g in select * from jsonb_array_elements(p_body->'grants') loop
   select x into o from menu_workspaces w cross join lateral jsonb_array_elements(w.payload->'orders') x where w.id=g->>'businessId' and x->>'id'=g->>'id' and x->>'guestTokenHash'=encode(sha256(convert_to(g->>'token','UTF8')),'hex');
   if o is not null then result=result||jsonb_build_array(o-'guestTokenHash'); end if;
  end loop;return jsonb_build_object('status',200,'data',result);
 end if;
 if p_path in ('/orders','/calls') and p_method='POST' then bid=p_body->>'businessId';else
  if a.user_id is null then return jsonb_build_object('status',401,'data',jsonb_build_object('error','ابتدا وارد حساب شو'));end if;bid=a.business_id;
 end if;
 select payload into s from menu_workspaces where id=bid for update;
 if s is null then raise exception 'مجموعه پیدا نشد'; end if;
 if p_path='/workspace' then return jsonb_build_object('status',200,'data',s);end if;
 if p_path='/menus' and p_method='POST' then
  if coalesce(trim(p_body->>'name'),'')='' or jsonb_array_length(s->'menus')>=30 then raise exception 'نام منو معتبر نیست یا سقف تعداد منو رسیده است';end if;
  v=jsonb_build_object('id','menu-'||gen_random_uuid(),'name',left(p_body->>'name',60),'kind',p_body->>'kind','published',true);s=jsonb_set(s,'{menus}',(s->'menus')||jsonb_build_array(v));
 elsif p_path like '/menus/%' and p_method='PATCH' then
  rid=split_part(p_path,'/',3);select x into m from jsonb_array_elements(s->'menus') x where x->>'id'=rid;if m is null then raise exception 'منو پیدا نشد';end if;
  v=m||(p_body-'id');s=jsonb_set(s,'{menus}',(select jsonb_agg(case when x->>'id'=rid then v else x end) from jsonb_array_elements(s->'menus') x));
 elsif p_path='/business' and p_method='PATCH' then
  v=(s->'business')||(p_body-'id'-'slug');s=jsonb_set(s,'{business}',v);
 elsif p_path='/products' and p_method='POST' then
  if coalesce(trim(p_body->>'name'),'')='' or coalesce((p_body->>'price')::numeric,-1)<0 or not exists(select 1 from jsonb_array_elements(s->'menus') x where x->>'id'=p_body->>'menuId') then raise exception 'غذا یا منو معتبر نیست';end if;
  v=p_body||jsonb_build_object('id','prod-'||gen_random_uuid(),'businessId',bid,'updatedAt',t);s=jsonb_set(s,'{products}',(s->'products')||jsonb_build_array(v));
 elsif p_path like '/products/%' and p_method='PATCH' then
  rid=split_part(p_path,'/',3);select x into pr from jsonb_array_elements(s->'products') x where x->>'id'=rid;if pr is null then raise exception 'غذا پیدا نشد';end if;
  v=pr||(p_body-'id'-'businessId')||jsonb_build_object('updatedAt',t);if (v->>'price')::numeric<0 or not exists(select 1 from jsonb_array_elements(s->'menus') x where x->>'id'=v->>'menuId') then raise exception 'قیمت یا منو معتبر نیست';end if;
  s=jsonb_set(s,'{products}',(select jsonb_agg(case when x->>'id'=rid then v else x end) from jsonb_array_elements(s->'products') x));
 elsif p_path='/orders' and p_method='POST' then
  mid=coalesce(p_body->>'menuId','main');
  if s#>'{business,orderAcceptanceActive}'<>'true' or not exists(select 1 from jsonb_array_elements(s->'menus') x where x->>'id'=mid and x->'published'='true') or not exists(select 1 from jsonb_array_elements(s->'servicePoints') x where (x->>'tableNumber')::integer=(p_body->>'tableNumber')::integer) or coalesce(jsonb_array_length(p_body->'items'),0) not between 1 and 50 or coalesce(length(p_body->>'guestToken'),0) not between 32 and 100 or coalesce(length(p_body->>'idempotencyKey'),0) not between 10 and 100 then raise exception 'سفارش معتبر نیست';end if;
  select x into o from jsonb_array_elements(s->'orders') x where x->>'idempotencyKey'=p_body->>'idempotencyKey';
  if o is not null then if o->>'guestTokenHash'<>encode(sha256(convert_to(p_body->>'guestToken','UTF8')),'hex') then raise exception 'شناسه پیگیری معتبر نیست';end if;return jsonb_build_object('status',200,'data',o-'guestTokenHash');end if;
  newid='order-'||gen_random_uuid();items='[]';total=0;idx=0;
  for i in select * from jsonb_array_elements(p_body->'items') loop
   select x into pr from jsonb_array_elements(s->'products') x where x->>'id'=i->>'productId' and coalesce(x->>'menuId','main')=mid and x->'isAvailable'='true';qty=(i->>'quantity')::integer;
   if pr is null or qty is null or qty not between 1 and 30 or (i->>'quantity')::numeric<>qty then raise exception 'آیتم یا تعداد معتبر نیست';end if;
   chosen='[]';extra=0;
   for opt in select * from jsonb_array_elements(coalesce(i->'selectedOptions','[]')) loop
    select x into g from jsonb_array_elements(coalesce(pr->'optionGroups','[]')) x where x->>'title'=opt->>'groupTitle';
    select x into picked from jsonb_array_elements(g->'options') x where x->>'name'=opt->>'optionName';if picked is null or exists(select 1 from jsonb_array_elements(chosen) x where x->>'groupTitle'=opt->>'groupTitle' and x->>'optionName'=opt->>'optionName') then raise exception 'گزینه معتبر نیست';end if;
    chosen=chosen||jsonb_build_array(jsonb_build_object('groupTitle',g->>'title','optionName',picked->>'name','extraPrice',picked->'extraPrice'));extra=extra+(picked->>'extraPrice')::numeric;
   end loop;
   for g in select * from jsonb_array_elements(coalesce(pr->'optionGroups','[]')) loop if g->'required'='true' and (select count(*) from jsonb_array_elements(chosen) x where x->>'groupTitle'=g->>'title')<>1 then raise exception 'گزینه لازم را انتخاب کن';end if;end loop;
   v=jsonb_build_object('id',newid||'-'||idx,'productId',pr->>'id','productName',pr->>'name','unitPriceSnapshot',pr->'price','quantity',qty,'selectedOptions',chosen,'notes',left(coalesce(i->>'notes',''),500),'itemTotal',((pr->>'price')::numeric+extra)*qty,'deliveryStatus','pending');items=items||jsonb_build_array(v);total=total+(v->>'itemTotal')::numeric;idx=idx+1;
  end loop;
  o=jsonb_build_object('id',newid,'businessId',bid,'menuId',mid,'tableNumber',p_body->'tableNumber','orderNumber','#'||(jsonb_array_length(s->'orders')+1001),'customerName',left(coalesce(p_body->>'customerName','مهمان'),80),'customerNotes',left(coalesce(p_body->>'customerNotes',''),500),'items',items,'totalAmount',total,'status','pending_waiter','deliveryStatus','pending','paymentStatus','unpaid','restaurantConfirmed',false,'createdAt',t,'updatedAt',t,'idempotencyKey',p_body->>'idempotencyKey','guestTokenHash',encode(sha256(convert_to(p_body->>'guestToken','UTF8')),'hex'));
  s=jsonb_set(s,'{orders}',jsonb_build_array(o)||(s->'orders'));v=o-'guestTokenHash';
 elsif p_path like '/orders/%/action' then
  rid=split_part(p_path,'/',3);select x into o from jsonb_array_elements(s->'orders') x where x->>'id'=rid;action=p_body->>'action';
  if o is null or o->>'status' in ('delivered','cancelled') then raise exception 'سفارش بسته شده یا پیدا نشد';end if;
  if action='send' then if o->>'status'<>'pending_waiter' or jsonb_array_length(o->'items')=0 then raise exception 'سفارش قابل ارسال نیست';end if;o=o||'{"status":"cooking","paymentStatus":"paid_cash","restaurantConfirmed":false}';
  elsif action='confirm' then if o->>'status'<>'cooking' or o->>'paymentStatus'='unpaid' then raise exception 'ابتدا پرداخت و ارسال لازم است';end if;o=o||'{"status":"ready","restaurantConfirmed":true}';
  elsif action='deliver' then if o->>'status'<>'ready' or o->>'paymentStatus'='unpaid' or o->'restaurantConfirmed'<>'true' then raise exception 'ابتدا تأیید رستوران لازم است';end if;o=o||'{"status":"delivered","deliveryStatus":"delivered"}';
  elsif action in ('remove','note') then
   if not exists(select 1 from jsonb_array_elements(o->'items') x where x->>'id'=p_body->>'itemId') then raise exception 'غذا پیدا نشد';end if;
   select coalesce(jsonb_agg(case when action='note' and x->>'id'=p_body->>'itemId' then x||jsonb_build_object('waiterNotes',left(coalesce(p_body->>'note',''),500)) else x end),'[]') into items from jsonb_array_elements(o->'items') x where action<>'remove' or x->>'id'<>p_body->>'itemId';
   o=o||jsonb_build_object('items',items,'totalAmount',(select coalesce(sum((x->>'itemTotal')::numeric),0) from jsonb_array_elements(items) x),'status',case when jsonb_array_length(items)=0 then 'cancelled' else 'pending_waiter' end,'restaurantConfirmed',false);
  else raise exception 'عملیات معتبر نیست';end if;
  o=o||jsonb_build_object('updatedAt',t);s=jsonb_set(s,'{orders}',(select jsonb_agg(case when x->>'id'=rid then o else x end) from jsonb_array_elements(s->'orders') x));v=o-'guestTokenHash';
 elsif p_path like '/tables/%' then
  n=split_part(p_path,'/',3)::integer;select x into v from jsonb_array_elements(s->'servicePoints') x where (x->>'tableNumber')::integer=n;if v is null then raise exception 'میز پیدا نشد';end if;v=v||jsonb_build_object('isOccupied',p_body->'isOccupied');s=jsonb_set(s,'{servicePoints}',(select jsonb_agg(case when (x->>'tableNumber')::integer=n then v else x end) from jsonb_array_elements(s->'servicePoints') x));
 elsif p_path='/calls' then
  if not exists(select 1 from jsonb_array_elements(s->'servicePoints') x where x->'tableNumber'=p_body->'tableNumber') then raise exception 'میز پیدا نشد';end if;v=jsonb_build_object('id','call-'||gen_random_uuid(),'tableNumber',p_body->'tableNumber','type',p_body->>'type','message',left(coalesce(p_body->>'message','درخواست گارسون'),500),'status','pending','createdAt',t);s=jsonb_set(s,'{serviceCalls}',jsonb_build_array(v)||(s->'serviceCalls'));
 elsif p_path like '/calls/%' then
  rid=split_part(p_path,'/',3);select x into v from jsonb_array_elements(s->'serviceCalls') x where x->>'id'=rid;if v is null then raise exception 'درخواست پیدا نشد';end if;v=v||'{"status":"resolved"}';s=jsonb_set(s,'{serviceCalls}',(select jsonb_agg(case when x->>'id'=rid then v else x end) from jsonb_array_elements(s->'serviceCalls') x));
 else return jsonb_build_object('status',404,'data',jsonb_build_object('error','مسیر پیدا نشد'));end if;
 update menu_workspaces set payload=s,updated_at=now() where id=bid;return jsonb_build_object('status',200,'data',v);
exception when others then return jsonb_build_object('status',400,'data',jsonb_build_object('error',case when sqlstate='P0001' then sqlerrm else 'اطلاعات درخواست معتبر نیست' end));end $$;
revoke all on function public.menu_api(text,text,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.menu_api(text,text,jsonb,uuid) to service_role;

