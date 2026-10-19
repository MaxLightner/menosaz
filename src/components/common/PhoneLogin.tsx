import {OrderDialog} from './OrderDialog';
import {InfoContent} from '../website/InfoContent';
import {BrandLogo} from './BrandLogo';
import React,{useEffect,useState} from 'react';
import {usePresentation} from '../../context/PresentationContext';
import {api,ApiError} from '../../services/backend';
const KEY='menosaz-auth-pending';
const digits=(value:string)=>value.replace(/[۰-۹]/g,c=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c)));
function cached(key=KEY){try{const value=JSON.parse(sessionStorage.getItem(key)||'null');return value&&value.expiresAt>Date.now()?value:null;}catch{return null;}}
const fa=new Intl.NumberFormat('fa-IR',{minimumIntegerDigits:2});
function clock(seconds:number){return fa.format(Math.floor(seconds/60))+':'+fa.format(seconds%60);}
export function PhoneLogin({onDone,staffBusinessId}:{onDone:()=>void;staffBusinessId?:string}){
 const {verifyPhone}=usePresentation();
 const cacheKey=staffBusinessId?'menosaz-auth-pending:staff:'+staffBusinessId:KEY;
 const [initial]=useState(()=>cached(cacheKey)),[phone,setPhone]=useState(initial?.phone||''),[remember,setRemember]=useState(initial?.remember!==false),[code,setCode]=useState(''),[pending,setPending]=useState<any>(initial),[now,setNow]=useState(Date.now()),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [acceptTerms,setAcceptTerms]=useState(initial?.acceptTerms===true),[termsOpen,setTermsOpen]=useState(false);
 const wait=Math.max(0,Math.ceil(((pending?.nextSendAt||0)-now)/1000)),expired=!!pending?.challenge&&pending.expiresAt<=now;
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),500);return()=>clearInterval(timer);},[]);
 function keep(value:any){setPending(value);try{value?sessionStorage.setItem(cacheKey,JSON.stringify(value)):sessionStorage.removeItem(cacheKey);}catch{}}
 async function send(){if(busy||wait)return;if(!acceptTerms){setError('برای ادامه، قوانین استفاده را بپذیر.');return;}const normalized=digits(phone).replace(/\D/g,'');if(!/^09\d{9}$/.test(normalized)){setError('شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود.');return;}setBusy(true);setError('');try{
  if(staffBusinessId){const eligibility=await api<{allowed:boolean;error?:string}>('/staff/check',{businessId:staffBusinessId,phone:normalized});if(!eligibility.allowed)throw Error(eligibility.error||'شماره شما در فهرست گارسون‌های این رستوران ثبت نشده است');}
  const data=await api('/auth/request',{phone:normalized,acceptTerms,termsVersion:'2026-10-19',...(staffBusinessId?{staffBusinessId}:{})});const sentAt=Date.now();const delay=typeof data.resendAt==='number'&&typeof data.serverNow==='number'?Math.max(0,data.resendAt-data.serverNow):(data.resendIn||60)*1000;
  setPhone(data.phone);setCode('');keep({phone:data.phone,challenge:data.challenge||'',demoCode:data.demoCode||'',nextSendAt:sentAt+delay,expiresAt:sentAt+(data.expiresIn||120)*1000,remember,acceptTerms});setNow(sentAt);
 }catch(e){setError((e as Error).message);if(e instanceof ApiError&&e.retryAfter){keep({...pending,phone,expiresAt:Date.now()+Math.max(e.retryAfter,120)*1000,nextSendAt:Date.now()+e.retryAfter*1000});}}
 finally{setBusy(false);}}
 async function verify(){if(busy||expired)return;setBusy(true);setError('');try{await verifyPhone(phone,digits(code),{remember,acceptTerms,termsVersion:'2026-10-19',mode:'auto',challenge:pending.challenge,...(staffBusinessId?{staffBusinessId}:{})});keep(null);onDone();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 const sent=!!pending?.challenge||!!pending?.demoCode;
 return <><form className="phone-login" onSubmit={e=>{e.preventDefault();sent?verify():send();}}>
  <div className="phone-login-brand"><BrandLogo/></div>
  <p>{sent?'کد پیامک‌شده به '+phone+' را وارد کن.':staffBusinessId?'شماره‌ای را وارد کن که مدیر رستوران قبلاً برای گارسون ثبت کرده است.':'شماره موبایل را وارد کن؛ ورود و ساخت حساب از همین‌جا انجام می‌شود.'}</p>
  {sent?<label>کد ورود<input aria-label="کد ورود" inputMode="numeric" autoComplete="one-time-code" value={code} maxLength={6} onChange={e=>setCode(digits(e.target.value).replace(/\D/g,''))} autoFocus/></label>:<><label>شماره موبایل<input aria-label="شماره موبایل" type="tel" inputMode="tel" autoComplete="tel" dir="ltr" placeholder="09123456789" value={phone} onChange={e=>setPhone(digits(e.target.value))} autoFocus/></label></>}
  <label className="auth-checkbox"><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)}/> مرا به خاطر بسپار</label><label className="auth-checkbox"><input type="checkbox" checked={acceptTerms} onChange={e=>setAcceptTerms(e.target.checked)}/><span><button type="button" className="staff-text-button" onClick={()=>setTermsOpen(true)}>قوانین استفاده</button> را می‌پذیرم.</span></label>
  {sent&&pending.demoCode&&<p className="demo-code">آزمایش محلی؛ پیامک ارسال نمی‌شود. کد: <b>{pending.demoCode}</b></p>}
  {(sent||wait>0)&&<div className="otp-countdown" role="timer" aria-live="off"><span>{wait?'تا ارسال دوباره کد':'امکان ارسال دوباره کد'}</span><strong>{wait?clock(wait):'آماده'}</strong></div>}
  {expired&&<p className="login-error">اعتبار کد تمام شده؛ کد تازه دریافت کن.</p>}
  {error&&<p role="alert" className="login-error">{error}</p>}
  <button className="staff-primary" disabled={busy||!acceptTerms||(sent?(code.length!==6||expired):(!phone||wait>0))}>{busy?'در حال بررسی…':sent?'تأیید و ادامه':'دریافت کد ورود'}</button>
  {sent&&<div className="phone-login-actions"><button type="button" disabled={busy} onClick={()=>{keep(null);setCode('');setError('');}}>ویرایش شماره</button><button type="button" disabled={busy||wait>0} onClick={send}>ارسال دوباره کد</button></div>}
 </form>{termsOpen&&<OrderDialog title="قوانین استفاده" onClose={()=>setTermsOpen(false)}><div className="registration-terms-scroll"><InfoContent page="terms" embedded/><button type="button" className="staff-primary terms-accept" onClick={()=>{setAcceptTerms(true);setTermsOpen(false);}}>قوانین را می‌پذیرم و ادامه می‌دهم</button></div></OrderDialog>}</>;
}
