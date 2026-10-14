from pathlib import Path
root=Path(__file__).resolve().parent.parent
p=root/'src/components/common/PhoneLogin.tsx'
p.write_text(r'''import React,{useEffect,useState} from 'react';
import {usePresentation} from '../../context/PresentationContext';
import {api,ApiError} from '../../services/backend';
const KEY='menosaz-auth-pending';
const digits=(value:string)=>value.replace(/[۰-۹]/g,c=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c)));
function cached(){try{const value=JSON.parse(sessionStorage.getItem(KEY)||'null');return value&&value.expiresAt>Date.now()?value:null;}catch{return null;}}
const fa=new Intl.NumberFormat('fa-IR',{minimumIntegerDigits:2});
function clock(seconds:number){return fa.format(Math.floor(seconds/60))+':'+fa.format(seconds%60);}
export function PhoneLogin({onDone}:{onDone:()=>void}){
 const {verifyPhone}=usePresentation();
 const [initial]=useState(cached),[phone,setPhone]=useState(initial?.phone||''),[remember,setRemember]=useState(initial?.remember!==false),[code,setCode]=useState(''),[pending,setPending]=useState<any>(initial),[now,setNow]=useState(Date.now()),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const wait=Math.max(0,Math.ceil(((pending?.nextSendAt||0)-now)/1000)),expired=!!pending?.challenge&&pending.expiresAt<=now;
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),500);return()=>clearInterval(timer);},[]);
 function keep(value:any){setPending(value);try{value?sessionStorage.setItem(KEY,JSON.stringify(value)):sessionStorage.removeItem(KEY);}catch{}}
 async function send(){if(busy||wait)return;setBusy(true);setError('');try{
  const data=await api('/auth/request',{phone});const sentAt=Date.now();const delay=typeof data.resendAt==='number'&&typeof data.serverNow==='number'?Math.max(0,data.resendAt-data.serverNow):(data.resendIn||60)*1000;
  setPhone(data.phone);setCode('');keep({phone:data.phone,challenge:data.challenge||'',demoCode:data.demoCode||'',nextSendAt:sentAt+delay,expiresAt:sentAt+(data.expiresIn||120)*1000,remember});setNow(sentAt);
 }catch(e){setError((e as Error).message);if(e instanceof ApiError&&e.retryAfter){keep({...pending,phone,nextSendAt:Date.now()+e.retryAfter*1000});}}
 finally{setBusy(false);}}
 async function verify(){if(busy||expired)return;setBusy(true);setError('');try{await verifyPhone(phone,digits(code),{remember,mode:'auto',challenge:pending.challenge});keep(null);onDone();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 const sent=!!pending?.challenge||!!pending?.demoCode;
 return <form className="phone-login" onSubmit={e=>{e.preventDefault();sent?verify():send();}}>
  <p>{sent?'کد پیامک‌شده به '+phone+' را وارد کن.':'شماره موبایل را وارد کن؛ ورود و ساخت حساب از همین‌جا انجام می‌شود.'}</p>
  {sent?<label>کد ورود<input aria-label="کد ورود" inputMode="numeric" autoComplete="one-time-code" value={code} maxLength={6} onChange={e=>setCode(digits(e.target.value).replace(/\D/g,''))} autoFocus/></label>:<><label>شماره موبایل<input aria-label="شماره موبایل" type="tel" inputMode="tel" autoComplete="tel" dir="ltr" placeholder="09123456789" value={phone} onChange={e=>setPhone(digits(e.target.value))} autoFocus/></label><label className="auth-checkbox"><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)}/> مرا به خاطر بسپار</label></>}
  {sent&&pending.demoCode&&<p className="demo-code">آزمایش محلی؛ پیامک ارسال نمی‌شود. کد: <b>{pending.demoCode}</b></p>}
  {(sent||wait>0)&&<div className="otp-countdown" role="timer" aria-live="off"><span>{wait?'تا ارسال دوباره کد':'امکان ارسال دوباره کد'}</span><strong>{wait?clock(wait):'آماده'}</strong></div>}
  {expired&&<p className="login-error">اعتبار کد تمام شده؛ کد تازه دریافت کن.</p>}
  {error&&<p role="alert" className="login-error">{error}</p>}
  <button className="staff-primary" disabled={busy||(sent?(code.length!==6||expired):(!phone||wait>0))}>{busy?'در حال بررسی…':sent?'تأیید و ادامه':'دریافت کد ورود'}</button>
  {sent&&<div className="phone-login-actions"><button type="button" disabled={busy} onClick={()=>{keep(null);setCode('');setError('');}}>ویرایش شماره</button><button type="button" disabled={busy||wait>0} onClick={send}>ارسال دوباره کد</button></div>}
 </form>;
}
''',encoding='utf-8')
p=root/'src/services/backend.ts';s=p.read_text(encoding='utf-8')
if 'export class ApiError' not in s:s=s.replace('let refreshing:',"export class ApiError extends Error{constructor(message:string,public status:number,public retryAfter?:number,public code?:string){super(message);}}\nlet refreshing:")
s=s.replace("if(!r.ok)throw new Error(data.error||'ارتباط با سرور انجام نشد');", "if(!r.ok)throw new ApiError(data.error||'ارتباط با سرور انجام نشد',r.status,data.retryAfter,data.code);")
p.write_text(s,encoding='utf-8')
p=root/'src/components/website/PublicWebsite.tsx';s=p.read_text(encoding='utf-8')
s=s.replace("const [authMode,setAuthMode]=useState<'login'|'register'>('login');",'')
s=s.replace("onClick={()=>{setAuthMode('login');setLoginOpen(true);}}", "onClick={()=>setLoginOpen(true)}")
s=s.replace('<User size={18}/> ورود</button>}{!account&&<button className="public-signup" onClick={()=>{setAuthMode(\'register\');setLoginOpen(true);}}>ثبت‌نام</button>}', '<User size={18}/> ورود / ثبت‌نام</button>}')
s=s.replace("title={authMode==='register'?'ثبت‌نام مجموعه':'ورود با شماره موبایل'}",'title="ورود / ثبت‌نام"').replace('<PhoneLogin key={authMode} mode={authMode} onDone=', '<PhoneLogin onDone=')
s=s.replace('<div className="public-site">',r'''<div className="public-site" onClick={e=>{if(e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;const a=(e.target as HTMLElement).closest('a');if(!a||a.target==='_blank')return;const url=new URL(a.href),view=url.searchParams.get('view');if(url.origin===window.location.origin&&['website','how','terms'].includes(view||'')){e.preventDefault();setMobileNav(false);setCurrentView(view as any);window.history.pushState({},'',url.href);requestAnimationFrame(()=>requestAnimationFrame(()=>{if(url.hash)document.getElementById(url.hash.slice(1))?.scrollIntoView();else window.scrollTo(0,0);}));}}} >''')
s=s.replace('href="#home"','href="?view=website#home"')
s=s.replace('<a href="#sample-menus">نمونه منوها</a>','<a href={page?\'?view=website#sample-menus\':\'#sample-menus\'}>نمونه منوها</a>').replace('<a href="#menu-templates">قالب‌ها</a>','<a href={page?\'?view=website#menu-templates\':\'#menu-templates\'}>قالب‌ها</a>')
p.write_text(s,encoding='utf-8')
p=root/'src/context/AppContext.tsx';s=p.read_text(encoding='utf-8')
if 'onSitePop' not in s:
 idx=s.index('  const [selectedTableNumber')
 s=s[:idx]+"  useEffect(()=>{const onSitePop=()=>{const v=new URLSearchParams(window.location.search).get('view') as AppView;if(['website','how','terms','admin','dashboard-desktop','dashboard-mobile','customer','waiter','kitchen'].includes(v))setCurrentView(v);};window.addEventListener('popstate',onSitePop);return()=>window.removeEventListener('popstate',onSitePop);},[]);\n"+s[idx:]
p.write_text(s,encoding='utf-8')
css=root/'src/index.css';s=css.read_text(encoding='utf-8')
if '.otp-countdown{' not in s:s+='\n.otp-countdown{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:#f0f4ed;border:1px solid #ccd8c4;border-radius:14px;margin:14px 0;color:#3d573a;gap:12px}.otp-countdown strong{font-size:25px;font-variant-numeric:tabular-nums;direction:ltr;min-width:75px;text-align:center}.otp-countdown span{font-size:16px}.phone-login input:not([type=checkbox]){font-size:20px}.phone-login-actions button:disabled{opacity:.45;cursor:not-allowed}\n'
css.write_text(s,encoding='utf-8')
