// @ts-nocheck
import {createClient} from 'npm:@supabase/supabase-js@2';
import {billingRequest,publicSiteUrl} from './billing.ts';
import {otpyRequest,nativePhoneSession} from './otpy.ts';
import {productImageData} from '../../../src/lib/productImage.ts';
const url=Deno.env.get('SUPABASE_URL')!,key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!;
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const origins=new Set([new URL(publicSiteUrl()).origin,'https://maxlightner.github.io','http://127.0.0.1:4180','http://localhost:4180',...(Deno.env.get('ALLOWED_ORIGINS')||'').split(',').filter(Boolean)]);
const normalize=(value:unknown)=>{let p=String(value||'').replace(/[۰-۹]/g,c=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c))).replace(/[\s()-]/g,'');p=p.replace(/^\+98|^0098|^98/,'0');if(!/^09\d{9}$/.test(p))throw Error('شماره موبایل معتبر وارد کن');return '+98'+p.slice(1);};
Deno.serve(async req=>{const origin=req.headers.get('origin')||'',headers={'Content-Type':'application/json','Access-Control-Allow-Origin':origins.has(origin)?origin:'https://maxlightner.github.io','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info,x-menu-session','Access-Control-Allow-Methods':'GET,POST,PATCH,OPTIONS','Vary':'Origin'};const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data,(field,value)=>{if(field==='qrCodeUrl'&&typeof value==='string'){const token=new URL(value).searchParams.get('q');if(token&&/^[0-9a-f]{32}$/.test(token))return publicSiteUrl()+'/?q='+token;}return value;}),{status,headers});if(origin&&!origins.has(origin))return reply({error:'مبدأ درخواست معتبر نیست'},403);if(req.method==='OPTIONS')return new Response(null,{status:204,headers});try{const u=new URL(req.url),path=u.pathname.replace(/^.*\/menu-api/,'')||'/health',body=req.method==='GET'?Object.fromEntries(u.searchParams):await req.json();if(JSON.stringify(body).length>4*1024*1024)return reply({error:'حجم درخواست زیاد است'},413);
const client=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});const token=req.headers.get('x-menu-session');let uid=null,userPhone='';if(token){const {data,error}=await client.auth.getUser(token);if(error||!data.user)return reply({error:'نشست منقضی شده؛ دوباره وارد شو'},401);uid=data.user.id;userPhone=data.user.phone||'';}
if(uid&&!['/auth/logout','/auth/request','/auth/verify'].includes(path)&&!path.startsWith('/staff/')&&!path.startsWith('/feedback/')&&!path.startsWith('/club/')){const checked=await db.rpc('access_authorize',{p_path:path,p_method:req.method,p_body:body,p_uid:uid});if(checked.error)return reply({error:'بررسی دسترسی انجام نشد'},503);if(checked.data?.allowed!==true){const {allowed,status,...data}=checked.data;return reply(data,status||403);}}
const ip=req.headers.get('x-forwarded-for')?.split(',')[0]||'unknown';const fingerprint=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ip)))).map(v=>v.toString(16).padStart(2,'0')).join('');const limit=await db.rpc('menu_rate',{p_key:fingerprint,p_max:120});if(limit.error||limit.data!==true)return reply({error:'تعداد درخواست‌ها زیاد است؛ کمی صبر کن'},429);// Staff/feedback operations have their own security-definer RPC authorization checks.
if(path==='/staff/check'&&req.method==='POST'){
 const bid=String(body.businessId||'').slice(0,120);
 let phone;try{phone=normalize(body.phone);}catch{return reply({error:'شماره معتبر نیست'},400);}
 const allowed=await db.rpc('mizato_staff_allowed',{bid,raw_phone:phone});
 if(allowed.error)return reply({error:'بررسی فهرست کارکنان در دسترس نیست'},503);
 return reply({allowed:allowed.data===true,error:allowed.data===true?null:'شماره شما در فهرست گارسون‌های فعال این رستوران ثبت نشده است'});
}
if(path.startsWith('/staff/')&&['/staff/save','/staff/list','/staff/report','/staff/mine','/staff/shift'].includes(path)){
 if(!uid)return reply({error:'ابتدا وارد حساب شو'},401);
 if(!((path==='/staff/save'||path==='/staff/shift')?req.method==='POST':req.method==='GET'))return reply({error:'روش درخواست معتبر نیست'},405);
 const r=await db.rpc('mizato_staff_api',{p_path:path,p_body:body,p_uid:uid});
 if(r.error)return reply({error:'سرویس کارکنان آماده نیست'},503);
 return reply(r.data.data,r.data.status);
}
if(path==='/feedback/submit'&&req.method==='POST'){
 const r=await db.rpc('mizato_feedback_submit',{p_body:body});
 if(r.error)return reply({error:'سرویس نظرسنجی آماده نیست'},503);
 return reply(r.data.data,r.data.status);
}
if(['/feedback/report','/club/list'].includes(path)&&req.method==='GET'){
 if(!uid)return reply({error:'ورود مدیر لازم است'},401);
 const r=await db.rpc('mizato_feedback_api',{p_path:path,p_body:body,p_uid:uid});
 if(r.error)return reply({error:'سرویس گزارش آماده نیست'},503);
 return reply(r.data.data,r.data.status);
}
if(path==='/club/unsubscribe'&&req.method==='POST'){
 if(!/^[0-9a-f-]{36}$/i.test(String(body.token||'')))return reply({error:'لینک معتبر نیست'},400);
 const r=await db.rpc('mizato_club_unsubscribe',{p_token:body.token});
 if(r.error)return reply({error:'لغو عضویت انجام نشد'},503);
 return reply(r.data);
}
if(['/auth/request','/auth/verify','/auth/register','/auth/logout'].includes(path)&&req.method!=='POST')return reply({error:'روش درخواست معتبر نیست'},405);if(path==='/auth/request'){
 const ph=normalize(body.phone);
 if(body.staffBusinessId){
   const check=await db.rpc('mizato_staff_allowed',{bid:String(body.staffBusinessId),raw_phone:ph});
   if(check.error)return reply({error:'بررسی کارکنان ممکن نیست'},503);
   if(check.data!==true)return reply({error:'این شماره در فهرست گارسون‌های فعال رستوران ثبت نشده است'},403);
 }
 const secret=Deno.env.get('OTPY_API_KEY');if(!secret)return reply({error:'سرویس پیامک آماده نیست'},503);
 const guard=await db.rpc('menu_otp_guard',{p_phone:ph,p_op:'send'});if(guard.error)return reply({error:'سرویس ورود آماده نیست'},503);if(!guard.data.allowed)return reply({error:'برای ارسال دوباره کمی صبر کن',retryAfter:guard.data.retryAfter},429);
 // Charge limits are reserved before contacting the provider, including failures.
 const sent=await otpyRequest(secret,'send',{phone:'0'+ph.slice(3)});const timing=await db.rpc('menu_otp_sent',{p_phone:ph,p_nonce:guard.data.challenge,p_ttl:Number.isInteger(sent?.ttl_seconds)?sent.ttl_seconds:120});if(timing.error)return reply({error:'دریافت وضعیت کد انجام نشد؛ کمی بعد دوباره تلاش کن'},503);return reply({phone:'0'+ph.slice(3),...guard.data,...timing.data});
}
if(path==='/auth/verify'){
 const phone=normalize(body.phone),code=String(body.code||'').replace(/[۰-۹]/g,c=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c)));
 if(!/^\d{6}$/.test(code)||! /^[0-9a-f-]{36}$/i.test(String(body.challenge||'')))return reply({error:'کد نامعتبر یا منقضی شده است'},400);
 const secret=Deno.env.get('OTPY_API_KEY');if(!secret)return reply({error:'سرویس پیامک آماده نیست'},503);
 const guard=await db.rpc('menu_otp_guard',{p_phone:phone,p_op:'verify',p_nonce:body.challenge});if(guard.error)return reply({error:'سرویس ورود آماده نیست'},503);if(!guard.data.allowed)return reply({error:'کد منقضی شده یا تعداد تلاش‌ها زیاد است؛ کد تازه دریافت کن'},429);
 let verified=false;try{verified=(await otpyRequest(secret,'verify',{phone:'0'+phone.slice(3),code}))?.verified===true;}finally{await db.rpc('menu_otp_guard',{p_phone:phone,p_op:verified?'verified':'release',p_nonce:body.challenge});}
 if(!verified)return reply({error:'کد نامعتبر یا منقضی شده است'},400);
const data=await nativePhoneSession(db,client,phone);
if(body.staffBusinessId){
 const claimed=await db.rpc('mizato_staff_claim',{p_uid:data.user.id,p_phone:phone,p_business:String(body.staffBusinessId)});
 if(claimed.error)return reply({error:claimed.error.message||'شماره گارسون ثبت نشده است'},403);
 const shift=await db.rpc('mizato_staff_api',{p_path:'/staff/shift',p_body:{action:'start'},p_uid:data.user.id});
 if(shift.error||shift.data?.status!==200)return reply({error:'شروع شیفت ثبت نشد؛ لطفاً دوباره تلاش کن'},503);
}
const result=await db.rpc('menu_api_v2',{p_path:body.staffBusinessId?'/account':body.mode==='register'?'/register':'/account',p_method:'POST',p_body:body,p_uid:data.user.id});if(result.error)return reply({error:'ثبت حساب انجام نشد'},500);if(result.data.data?.code==='REGISTRATION_REQUIRED')return reply({account:{name:'تکمیل حساب',phone,role:'manager',demo:false,needsProfile:true,registrationPending:true},session:data.session});if(result.data.status!==200)return reply(result.data.data,result.data.status);const profile=await db.rpc('menu_profile',{p_uid:data.user.id});return reply({...result.data.data,account:{...result.data.data.account,needsProfile:profile.data?.needsProfile===true},session:data.session});
}
if(path==='/auth/me'){if(!uid)return reply({account:null});const {data,error}=await db.rpc('menu_api_v2',{p_path:'/account',p_method:'GET',p_uid:uid});if(error)return reply({account:null});if(data.data?.code==='REGISTRATION_REQUIRED')return reply({account:{name:'تکمیل حساب',phone:userPhone,role:'manager',demo:false,needsProfile:true,registrationPending:true}});if(data.status!==200)return reply({account:null});const profile=await db.rpc('menu_profile',{p_uid:uid});return reply({...data.data,account:{...data.data.account,needsProfile:profile.data?.needsProfile===true}});}
if(path==='/auth/register'){if(!uid)return reply({error:'ابتدا شماره موبایل را تأیید کن'},401);const r=await db.rpc('menu_api_v2',{p_path:'/register',p_method:'POST',p_body:body,p_uid:uid});if(r.error)return reply({error:'ثبت حساب انجام نشد'},500);return reply(r.data.data,r.data.status);}
if(path==='/auth/logout'){if(token)await fetch(url+'/auth/v1/logout?scope=local',{method:'POST',headers:{apikey:anon,Authorization:'Bearer '+token}});return reply({ok:true});}
if(path==='/presence'&&req.method==='POST'){const r=await db.rpc('menu_api_v2',{p_path:path,p_method:req.method,p_body:body,p_uid:uid});return reply(r.data?.data||{error:'درخواست نامعتبر'},r.data?.status||400);}
if(path.startsWith('/billing/')){if(!uid)return reply({error:'ابتدا وارد حساب شو'},401);if(req.method!=='POST'||!['/billing/create','/billing/verify'].includes(path))return reply({error:'مسیر معتبر نیست'},404);const allowed=await db.rpc('menu_rate',{p_key:'billing-'+uid,p_max:12});if(allowed.data!==true)return reply({error:'کمی صبر کن و دوباره تلاش کن'},429);return reply(await billingRequest(db,uid,path,body));}
if(!uid&&!['/health','/public/content','/public/menu','/public/feed','/public/resolve','/sessions/open','/sessions/status','/orders','/order-status','/calls'].includes(path))return reply({error:'ابتدا وارد حساب شو'},401);
if(path==='/admin/content-images'&&req.method==='POST'&&uid){
 let image;try{image=productImageData(body.dataUrl,true);}catch(error){return reply({error:error.message},400);}
 const ext=image.mime==='image/jpeg'?'jpg':image.mime==='image/png'?'png':'webp',id=crypto.randomUUID(),filename='platform/'+id+'.'+ext;
 const uploaded=await db.storage.from('menu-images').upload(filename,image.bytes,{contentType:image.mime,upsert:false});if(uploaded.error)return reply({error:'ذخیره عکس انجام نشد'},500);
 const assetUrl=db.storage.from('menu-images').getPublicUrl(filename).data.publicUrl;
 const registered=await db.from('platform_media').insert({id,storage_path:filename,url:assetUrl,mime:image.mime,bytes:image.bytes.length,width:image.width,height:image.height,created_by:uid});
 if(registered.error){await db.storage.from('menu-images').remove([filename]);return reply({error:'ثبت رسانه انجام نشد'},500);}return reply({imageUrl:assetUrl});
}
if(path==='/profile'&&uid){const result=await db.rpc('menu_profile',{p_uid:uid,...(req.method==='POST'?{p_body:body}:{})});if(result.error)return reply({error:'نام و نوع مجموعه را کامل کن'},400);return reply(result.data);}
if(['/product-images','/background-images'].includes(path)&&req.method==='POST'&&uid){
 const workspace=await db.rpc('menu_api_v2',{p_path:'/workspace',p_method:'GET',p_body:{},p_uid:uid});if(workspace.error||workspace.data.status!==200)return reply({error:'دسترسی مجموعه لازم است'},403);
 let image;try{image=productImageData(body.dataUrl,path==='/product-images');}catch(error){return reply({error:error.message},400);}
 const bid=workspace.data.data.business.id,ext=image.mime==='image/jpeg'?'jpg':image.mime==='image/png'?'png':'webp',filename=bid+'/'+crypto.randomUUID()+'.'+ext;
 const uploaded=await db.storage.from('menu-images').upload(filename,image.bytes,{contentType:image.mime,upsert:false});if(uploaded.error)return reply({error:'ذخیره عکس انجام نشد'},500);
 const assetUrl=db.storage.from('menu-images').getPublicUrl(filename).data.publicUrl;
 const registered=await db.rpc('catalog_media_register',{bid,asset_id:crypto.randomUUID(),asset_url:assetUrl,storage_path:filename,info:{mime:image.mime,width:image.width,height:image.height,bytes:image.bytes.length,purpose:path==='/product-images'?'product':'background'}});
 if(registered.error){await db.storage.from('menu-images').remove([filename]);return reply({error:'ثبت رسانه انجام نشد؛ دوباره تلاش کن'},500);}return reply(registered.data);
}
const {data,error}=await db.rpc('menu_api_v2',{p_path:path,p_method:req.method,p_body:body,p_uid:uid});if(error)return reply({error:'خطای پایگاه داده؛ دوباره تلاش کن'},500);return reply(data.data,data.status);
}catch(error){return reply({error:error?.status?error.message:'درخواست معتبر نیست'},error?.status||400);}});
