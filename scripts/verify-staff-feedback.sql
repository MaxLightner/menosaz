-- Run on Supabase inside the caller's transaction; always ROLLBACK afterwards.
-- Generated fixtures never touch a real account or send SMS.
do $qa$
declare owner_id uuid=gen_random_uuid(); waiter_id uuid=gen_random_uuid(); other_id uuid=gen_random_uuid();
 bid text='qa-'||gen_random_uuid(); other_bid text='qa-'||gen_random_uuid();
 ph text='989'||lpad(floor(random()*1000000000)::text,9,'0');
 result jsonb; body jsonb; guest_token text=gen_random_uuid()::text; unsubscribe uuid; count_before int;
begin
 insert into auth.users(id,phone,phone_confirmed_at) values(waiter_id,ph,now());
 insert into auth.users(id) values(owner_id),(other_id);
 insert into businesses(id,name) values(bid,'آزمون موقت'),(other_bid,'آزمون دوم');
 insert into profiles(user_id,active_business_id) values(owner_id,bid),(other_id,other_bid);
 insert into business_memberships(business_id,user_id,role) values(bid,owner_id,'owner'),(other_bid,other_id,'owner');
 result=mizato_staff_api('/staff/save',jsonb_build_object('name','گارسون آزمون','phone',ph,'status','active','days','[]'::jsonb),owner_id);
 if result->>'status'<>'200' then raise exception 'staff save: %',result;end if;
 if not mizato_staff_allowed(bid,ph) or mizato_staff_allowed(other_bid,ph) then raise exception 'staff allowlist scope';end if;
 perform mizato_staff_claim(waiter_id,ph,bid);
 if access_role(waiter_id,bid)<>'waiter' then raise exception 'staff claim';end if;
 result=mizato_staff_api('/staff/shift','{"action":"start"}',waiter_id);
 if result->>'status'<>'200' then raise exception 'shift start: %',result;end if;
 perform mizato_staff_api('/staff/shift','{"action":"start"}',waiter_id);
 if (select count(*) from mizato_staff_shifts where business_id=bid and clock_out is null)<>1 then raise exception 'duplicate shift';end if;
 result=mizato_staff_api('/staff/shift','{"action":"finish"}',waiter_id);
 if result->>'status'<>'200' then raise exception 'shift finish: %',result;end if;
 if mizato_staff_api('/staff/list','{}',waiter_id)->>'status'<>'403' then raise exception 'staff can list private manager data';end if;
 if jsonb_array_length(mizato_staff_api('/staff/list','{}',other_id)->'data')<>0 then raise exception 'cross business staff data';end if;
 perform mizato_accept_terms(waiter_id,'2026-10-19');
 if not exists(select 1 from terms_acceptances where user_id=waiter_id and terms_version='2026-10-19') then raise exception 'terms not persisted';end if;
 insert into service_points(business_id,id,code,label,table_number) values(bid,'p','p','میز آزمون',1);
 insert into service_sessions(business_id,id,service_point_id) values(bid,'s','p');
 insert into session_guests(business_id,id,session_id,token_hash) values(bid,'g','s',encode(sha256(convert_to(guest_token,'UTF8')),'hex'));
 insert into orders(business_id,id,session_id,service_point_id,guest_id,status,number,total_toman,idempotency_key,request_hash)
 values(bid,'o','s','p','g','pending_waiter','1',100,'qa1','qa1');
 body=jsonb_build_object('businessId',bid,'orderId','o','sessionId','s','guestToken',guest_token,'foodRating',5,'serviceRating',4,'anonymous',true);
 if mizato_feedback_submit(body)->>'status'<>'400' then raise exception 'feedback before delivery';end if;
 update orders set status='delivered' where business_id=bid;
 result=mizato_feedback_submit(body);
 if result->>'status'<>'200' then raise exception 'anonymous feedback: %',result;end if;
 if mizato_feedback_submit(body)->>'status'<>'409' then raise exception 'duplicate feedback';end if;
 if mizato_feedback_submit(body||jsonb_build_object('guestToken','forged'))->>'status'<>'400' then raise exception 'forged guest';end if;
 if exists(select 1 from mizato_feedback where business_id=bid and (phone is not null or marketing_consent)) then raise exception 'anonymous privacy';end if;
 insert into orders(business_id,id,session_id,service_point_id,guest_id,status,number,total_toman,idempotency_key,request_hash)
 values(bid,'o2','s','p','g','delivered','2',100,'qa2','qa2');
 result=mizato_feedback_submit(body||jsonb_build_object('orderId','o2','anonymous',false,'phone',ph,'marketingConsent',true));
 if result->>'status'<>'200' then raise exception 'club feedback: %',result;end if;
 unsubscribe=(result#>>'{data,unsubscribeToken}')::uuid;
 if unsubscribe is null then raise exception 'missing unsubscribe token';end if;
 perform mizato_club_unsubscribe(unsubscribe);
 if (select marketing_consent from mizato_customer_club where business_id=bid and phone=ph) then raise exception 'unsubscribe failed';end if;
 if mizato_feedback_api('/feedback/report','{}',waiter_id)->>'status'<>'403' then raise exception 'feedback manager access';end if;
 if (mizato_feedback_api('/feedback/report','{}',other_id)#>>'{data,count}')::int<>0 then raise exception 'cross business feedback';end if;
 result=mizato_staff_api('/staff/save',jsonb_build_object('name','گارسون آزمون','phone',ph,'status','disabled'),owner_id);
 if result->>'status'<>'200' or access_role(waiter_id,bid) is not null or mizato_staff_allowed(bid,ph) then raise exception 'disabled staff still authorized';end if;
 if has_function_privilege('anon','mizato_staff_claim(uuid,text,text)','EXECUTE') or has_function_privilege('authenticated','mizato_feedback_api(text,jsonb,uuid)','EXECUTE') then raise exception 'private RPC exposed';end if;
end $qa$;
