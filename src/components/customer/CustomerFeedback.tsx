import React,{useState} from 'react';
import {api} from '../../services/backend';
import {savedGuestSession} from '../../services/guestSession';
import type {Order,ServicePoint} from '../../types';
const valid=(s:string)=>/^09[0-9]{9}$/.test(s);
const ascii=(value:string)=>value.replace(/[۰-۹]/g,c=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c)));
export function CustomerFeedback({order,businessId,points,onSubmitted}:{order:Order;businessId:string;points:ServicePoint[];onSubmitted:()=>void}){
 const [food,setFood]=useState(0),[service,setService]=useState(0),[comment,setComment]=useState(''),[anonymous,setAnonymous]=useState(false),[phone,setPhone]=useState(''),[marketingConsent,setMarketingConsent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const point=points.find(p=>p.tableNumber===order.tableNumber);
 async function submit(e:React.FormEvent){
  e.preventDefault();setError('');
  if(!point){setError('میز سفارش پیدا نشد');return;}
  const guest=savedGuestSession(businessId,point.id);
  if(!guest?.guestToken||!guest.sessionId){setError('نشست سفارش در این مرورگر موجود نیست؛ از همان گوشی سفارش‌دهنده استفاده کنید.');return;}
  if(!food||!service||(!anonymous&&!valid(ascii(phone)))){setError('امتیازها و شماره معتبر یا گزینه نظر ناشناس لازم است.');return;}
  setBusy(true);
  try{const response=await api<{ok:boolean;unsubscribeToken?:string}>('/feedback/submit',{businessId,orderId:order.id,sessionId:guest.sessionId,guestToken:guest.guestToken,foodRating:food,serviceRating:service,comment,anonymous,phone:anonymous?undefined:ascii(phone),marketingConsent:!anonymous&&marketingConsent});
   if(response.unsubscribeToken)try{localStorage.setItem('mizato-club-optout:'+businessId,response.unsubscribeToken);}catch{}
   onSubmitted();}
  catch(err){setError((err as Error).message);}
  finally{setBusy(false);}
 }
 return <form className="mizato-feedback-form" onSubmit={submit}>
   <p>تجربه خودت از غذا و خدمات این مجموعه را ثبت کن. اطلاعات فقط برای بررسی کیفیت استفاده می‌شود.</p>
   <fieldset><legend>کیفیت غذا</legend><div className="mizato-stars">{[1,2,3,4,5].map(n=><button key={n} type="button" aria-label={n+' ستاره برای غذا'} aria-pressed={food===n} onClick={()=>setFood(n)} className={n<=food?'selected':''}>★</button>)}</div></fieldset>
   <fieldset><legend>کیفیت خدمات و برخورد کارکنان</legend><div className="mizato-stars">{[1,2,3,4,5].map(n=><button key={n} type="button" aria-label={n+' ستاره برای خدمات'} aria-pressed={service===n} onClick={()=>setService(n)} className={n<=service?'selected':''}>★</button>)}</div></fieldset>
   <label>توضیحات (اختیاری)<textarea rows={3} maxLength={1000} value={comment} onChange={e=>setComment(e.target.value)} placeholder="نظرت را بنویس…"/></label>
   <label className="mizato-feedback-check"><input type="checkbox" checked={anonymous} onChange={e=>{setAnonymous(e.target.checked);if(e.target.checked)setMarketingConsent(false);}}/>ثبت نظر ناشناس، بدون شماره موبایل</label>
   {!anonymous&&<><label>شماره موبایل<input required type="tel" dir="ltr" inputMode="numeric" placeholder="09123456789" value={phone} maxLength={11} onChange={e=>setPhone(ascii(e.target.value).replace(/\D/g,''))}/></label><label className="mizato-feedback-check"><input type="checkbox" checked={marketingConsent} onChange={e=>setMarketingConsent(e.target.checked)}/>مایلم پیامک تخفیف‌ها و پیشنهادهای این رستوران را دریافت کنم (اختیاری).</label></>}
   <p className="mizato-feedback-privacy">شماره برای ثبت نظر اختیاری است؛ رضایت پیامک تبلیغاتی جداگانه ثبت می‌شود.</p>
   {error&&<p role="alert" className="login-error">{error}</p>}
   <button type="submit" className="staff-primary" disabled={busy||!food||!service||(!anonymous&&!valid(ascii(phone)))}>{busy?'در حال ثبت…':'ثبت نظر'}</button>
 </form>;
}
