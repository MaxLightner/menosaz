from pathlib import Path
root=Path(__file__).resolve().parent.parent
p=root/'src/context/PresentationContext.tsx';s=p.read_text(encoding='utf-8')
s=s.replace('needsProfile?:boolean;', 'needsProfile?:boolean;registrationPending?:boolean;')
s=s.replace('completeProfile:(body:Record<string,string>)', 'completeProfile:(body:Record<string,unknown>)')
s=s.replace("async function completeProfile(body:Record<string,string>){await api('/profile',body);", "async function completeProfile(body:Record<string,unknown>){if(account?.registrationPending){const result=await api('/auth/register',{businessName:body.name,acceptTerms:body.acceptTerms});setAccount(result.account);}await api('/profile',body);")
s=s.replace('needsProfile:false}:null)', 'needsProfile:false,registrationPending:false}:null)')
p.write_text(s,encoding='utf-8')
p=root/'src/components/common/CompleteProfile.tsx';s=p.read_text(encoding='utf-8')
s=s.replace('const {completeProfile,logout}', 'const {completeProfile,logout,account}')
s=s.replace("[name,setName]=useState('')", "[acceptTerms,setAcceptTerms]=useState(false),[name,setName]=useState('')")
s=s.replace("useEffect(()=>{api('/profile')", "useEffect(()=>{if(account?.registrationPending)return;api('/profile')")
s=s.replace('await completeProfile({name,kind,address})', 'await completeProfile({name,kind,address,acceptTerms})')
s=s.replace('{error&&<p role="alert"', '''{account?.registrationPending&&<label className="auth-checkbox"><input type="checkbox" checked={acceptTerms} onChange={e=>setAcceptTerms(e.target.checked)}/><span><a href="?view=terms" target="_blank" rel="noopener">قوانین استفاده</a> را می‌پذیرم.</span></label>}{error&&<p role="alert"''')
s=s.replace('disabled={busy}', 'disabled={busy||(account?.registrationPending&&!acceptTerms)}')
p.write_text(s,encoding='utf-8')
fn=(root/'supabase/migrations/202610130003_account_upgrade.sql').read_text(encoding='utf-8')
fn=fn.replace("p_body->'acceptTerms'<>'true'::jsonb", "p_body->'acceptTerms' is distinct from 'true'::jsonb")
fn=fn.replace("jsonb_build_object('error','ثبت‌نام و پذیرش قوانین لازم است')", "jsonb_build_object('error','ثبت‌نام و پذیرش قوانین لازم است','code','REGISTRATION_REQUIRED')")
guard="""create or replace function public.menu_otp_sent(p_phone text,p_nonce uuid,p_ttl integer) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare r public.menu_otp_requests; seconds integer=greatest(30,least(coalesce(p_ttl,120),900));
begin
 update menu_otp_requests set expires=now()+make_interval(secs=>seconds) where phone_hash=encode(sha256(convert_to(p_phone,'UTF8')),'hex') and nonce=p_nonce and not used returning * into r;
 if r.phone_hash is null then raise exception 'درخواست کد معتبر نیست';end if;
 return jsonb_build_object('expiresIn',seconds,'resendAt',floor(extract(epoch from r.next_send)*1000),'serverNow',floor(extract(epoch from now())*1000));
end $$;
revoke all on function public.menu_otp_sent(text,uuid,integer) from public,anon,authenticated;
grant execute on function public.menu_otp_sent(text,uuid,integer) to service_role;
"""
(root/'supabase/migrations/202610140001_unified_auth.sql').write_text(guard+'\n'+fn,encoding='utf-8')
p=root/'supabase/functions/menu-api/index.ts';s=p.read_text(encoding='utf-8')
s=s.replace("let uid=null;if(token)", "let uid=null,userPhone='';if(token)").replace('uid=data.user.id;}', "uid=data.user.id;userPhone=data.user.phone||'';}")
s=s.replace("if(path==='/auth/request'){", "if(['/auth/request','/auth/verify','/auth/register','/auth/logout'].includes(path)&&req.method!=='POST')return reply({error:'روش درخواست معتبر نیست'},405);if(path==='/auth/request'){")
s=s.replace("await otpyRequest(secret,'send',{phone:'0'+ph.slice(3)});return reply({phone:'0'+ph.slice(3),...guard.data});", "const sent=await otpyRequest(secret,'send',{phone:'0'+ph.slice(3)});const timing=await db.rpc('menu_otp_sent',{p_phone:ph,p_nonce:guard.data.challenge,p_ttl:Number.isInteger(sent?.ttl_seconds)?sent.ttl_seconds:120});if(timing.error)return reply({error:'دریافت وضعیت کد انجام نشد؛ کمی بعد دوباره تلاش کن'},503);return reply({phone:'0'+ph.slice(3),...guard.data,...timing.data});")
s=s.replace("if(result.data.status!==200)return reply(result.data.data,result.data.status);const profile=", "if(result.data.data?.code==='REGISTRATION_REQUIRED')return reply({account:{name:'تکمیل حساب',phone,role:'manager',demo:false,needsProfile:true,registrationPending:true},session:data.session});if(result.data.status!==200)return reply(result.data.data,result.data.status);const profile=")
s=s.replace("if(error||data.status!==200)return reply({account:null});", "if(error)return reply({account:null});if(data.data?.code==='REGISTRATION_REQUIRED')return reply({account:{name:'تکمیل حساب',phone:userPhone,role:'manager',demo:false,needsProfile:true,registrationPending:true}});if(data.status!==200)return reply({account:null});")
marker="if(path==='/auth/logout')"
s=s.replace(marker,"if(path==='/auth/register'){if(!uid)return reply({error:'ابتدا شماره موبایل را تأیید کن'},401);const r=await db.rpc('menu_api',{p_path:'/register',p_method:'POST',p_body:body,p_uid:uid});if(r.error)return reply({error:'ثبت حساب انجام نشد'},500);return reply(r.data.data,r.data.status);}\n"+marker)
s=s.replace("url+'/auth/v1/logout'", "url+'/auth/v1/logout?scope=local'")
p.write_text(s,encoding='utf-8')
(root/'review').mkdir(exist_ok=True)
bundle=s.replace("import {otpyRequest,nativePhoneSession} from './otpy.ts';",(root/'supabase/functions/menu-api/otpy.ts').read_text(encoding='utf-8').replace('export async function','async function')).replace("import {productImageData} from '../../../src/lib/productImage.ts';",(root/'src/lib/productImage.ts').read_text(encoding='utf-8').split('export async function readProductImage')[0].replace('export const','const').replace('export function','function'))
(root/'review/menu-api-deploy.ts').write_text(bundle,encoding='utf-8')
