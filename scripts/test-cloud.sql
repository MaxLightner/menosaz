begin;
do $$
declare uid uuid=gen_random_uuid(); adm uuid; bid text; r jsonb; payment jsonb; expiration timestamptz; k integer;
begin
 if has_function_privilege('anon','public.menu_billing(text,uuid,jsonb)','execute') or has_function_privilege('authenticated','public.menu_api_v2(text,text,jsonb,uuid)','execute') then raise exception 'FAIL RPC isolation';end if;
 r=menu_api_v2('/admin/overview','GET','{}',null);if r->>'status'<>'403' then raise exception 'FAIL admin guard';end if;
 insert into auth.users(id,phone,phone_confirmed_at,aud,role) values(uid,'989000000099',now(),'authenticated','authenticated');
 r=menu_api_v2('/account','POST','{}',uid);if r#>>'{data,code}'<>'REGISTRATION_REQUIRED' then raise exception 'FAIL unified new identity';end if;
 r=menu_api_v2('/register','POST','{"businessName":"QA transient"}',uid);if r#>>'{data,code}'<>'REGISTRATION_REQUIRED' then raise exception 'FAIL missing terms';end if;
 r=menu_api_v2('/register','POST','{"businessName":"QA transient","acceptTerms":true}',uid);if r->>'status'<>'200' then raise exception 'FAIL registration: %',r;end if;
 select business_id into bid from menu_accounts where user_id=uid;
 r=menu_api_v2('/subscription','GET','{}',uid);if r#>>'{data,points}'<>'5' or r#>>'{data,plan}'<>'free' then raise exception 'FAIL free defaults: %',r;end if;
 r=menu_api_v2('/service-points','POST','{"tableNumber":91}',uid);if r#>>'{data,code}'<>'PLAN_LIMIT' then raise exception 'FAIL point limit';end if;
 for k in 1..20 loop
  r=menu_api_v2('/products','POST',jsonb_build_object('name','QA item','menuId','main','price',100,'isAvailable',true),uid);if r->>'status'<>'200' then raise exception 'FAIL product creation: %',r;end if;
 end loop;
 r=menu_api_v2('/products','POST','{"name":"excess","menuId":"main","price":100}',uid);if r#>>'{data,code}'<>'PLAN_LIMIT' then raise exception 'FAIL item limit';end if;
 payment=menu_billing('create',uid,jsonb_build_object('plan','growth','requestId',gen_random_uuid()));if payment->>'amount'<>'2000000' then raise exception 'FAIL server amount';end if;
 perform menu_billing('attach',uid,jsonb_build_object('id',payment->>'id','authority','S000000000000000000000000000000001'));
 perform menu_billing('paid',uid,jsonb_build_object('id',payment->>'id','authority','S000000000000000000000000000000001','refId','QA'));
 select expires_at into expiration from menu_subscriptions where business_id=bid;
 perform menu_billing('paid',uid,jsonb_build_object('id',payment->>'id','authority','S000000000000000000000000000000001','refId','QA'));
 if expiration is distinct from(select expires_at from menu_subscriptions where business_id=bid) then raise exception 'FAIL double activation';end if;
 r=menu_api_v2('/service-points','POST','{"tableNumber":91}',uid);if r->>'status'<>'200' then raise exception 'FAIL paid point';end if;
 select user_id into adm from menu_accounts where role='admin' limit 1;
 if adm is not null then
  r=menu_api_v2('/admin/messages','POST',jsonb_build_object('business',bid,'title','QA','body','Transient rollback test'),adm);if r#>>'{data,sent}'<>'1' then raise exception 'FAIL message';end if;
  r=menu_api_v2('/messages','GET','{}',uid);if jsonb_array_length(r->'data')<>1 then raise exception 'FAIL inbox';end if;
  r=menu_api_v2('/admin/ban','POST',jsonb_build_object('userId',uid,'banned',true),adm);if r->>'status'<>'200' then raise exception 'FAIL ban';end if;
  r=menu_api_v2('/workspace','GET','{}',uid);if r#>>'{data,code}'<>'ACCOUNT_BANNED' then raise exception 'FAIL banned access';end if;
  r=menu_api_v2('/admin/ban','POST',jsonb_build_object('userId',adm,'banned',true),adm);if r->>'status'<>'400' then raise exception 'FAIL admin protection';end if;
 end if;
end $$;
rollback;
select 'PASS: registration, terms, caps, paid activation, idempotence, messages, ban, RPC isolation; test data rolled back' as result;
