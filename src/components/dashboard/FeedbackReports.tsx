import React,{useEffect,useState} from 'react';
import {api} from '../../services/backend';
type Feedback={id:string;orderId:string;foodRating:number;serviceRating:number;comment:string;anonymous:boolean;phone:string|null;createdAt:string};
type Report={count:number;foodAverage:number|null;serviceAverage:number|null;reviews:Feedback[]};
type ClubMember={phone:string;marketingConsent:boolean;joinedAt:string;lastFeedbackAt:string|null;visits:number};
export function FeedbackReports({mode}:{mode:'feedback'|'club'}){
 const [reviews,setReviews]=useState<Report|null>(null),[members,setMembers]=useState<ClubMember[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 async function load(){setLoading(true);try{if(mode==='feedback')setReviews(await api<Report>('/feedback/report'));else setMembers(await api<ClubMember[]>('/club/list'));setError('');}catch(e){setError((e as Error).message);}finally{setLoading(false);}}
 useEffect(()=>{load();},[mode]);
 return <section className="mizato-report">
  <h3>{mode==='feedback'?'نظرسنجی غذا و خدمات':'باشگاه مشتریان'}</h3>
  <p>{mode==='feedback'?'نظرها فقط بعد از تحویل سفارش قابل ثبت هستند.':'شماره ثبت‌شده به معنی رضایت به دریافت تبلیغات نیست؛ فقط اعضای دارای رضایت پیامکی را برای کمپین انتخاب کن.'}</p>
  {loading&&<p>در حال بارگذاری…</p>}{error&&<p role="alert" className="login-error">{error}</p>}
  {mode==='feedback'&&reviews&&<>
   <div className="mizato-report-kpis"><strong>تعداد ارزیابی: {reviews.count.toLocaleString('fa-IR')}</strong><strong>میانگین غذا: {reviews.foodAverage??'—'} / ۵</strong><strong>میانگین خدمات: {reviews.serviceAverage??'—'} / ۵</strong></div>
   {!reviews.reviews.length&&<p>هنوز ارزیابی ثبت نشده است.</p>}
   {reviews.reviews.map(r=><article key={r.id}><strong>سفارش {r.orderId}</strong><span>غذا {r.foodRating} / ۵ · خدمات {r.serviceRating} / ۵</span><span>{r.anonymous?'ناشناس':r.phone?'0'+r.phone.slice(2):'بدون شماره'}</span><small>{new Date(r.createdAt).toLocaleString('fa-IR')}</small>{r.comment&&<p>{r.comment}</p>}</article>)}
  </>}
  {mode==='club'&&<>
   <div className="mizato-report-kpis"><strong>شماره‌های ثبت‌شده: {members.length.toLocaleString('fa-IR')}</strong><strong>رضایت پیامکی: {members.filter(m=>m.marketingConsent).length.toLocaleString('fa-IR')}</strong></div>
   {!members.length&&<p>هنوز شماره‌ای در باشگاه ثبت نشده است.</p>}
   {members.map(m=><article key={m.phone}><strong dir="ltr">{'0'+m.phone.slice(2)}</strong><span>{m.marketingConsent?'اجازه دریافت پیشنهادها: بله':'اجازه دریافت پیشنهادها: خیر'}</span><span>مراجعات شناسایی‌شده: {m.visits.toLocaleString('fa-IR')}</span><small>عضویت: {new Date(m.joinedAt).toLocaleString('fa-IR')}</small></article>)}
  </>}
  <button type="button" onClick={load}>به‌روزرسانی گزارش</button>
 </section>;
}
