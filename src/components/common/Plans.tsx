import React,{useEffect,useState} from 'react';
import {api} from '../../services/backend';
import {usePresentation} from '../../context/PresentationContext';
import {useApp} from '../../context/AppContext';
import {OrderDialog} from './OrderDialog';
import {PhoneLogin} from './PhoneLogin';

export const PLANS=[
  {id:'free',name:'شروع',price:0,label:'برای شروع و آزمودن منوساز',features:['تا ۵ میز، اتاق یا نقطه سرویس','تا ۲۰ آیتم در مجموع منوها','منوی مشتری، گارسون و رستوران','رنگ، زمینه و QR اختصاصی']},
  {id:'growth',name:'رونق',price:200000,label:'برای مجموعه‌های فعال',features:['میز و نقطه سرویس نامحدود','آیتم‌های منو نامحدود','چند منوی مستقل برای یک مجموعه','تمام امکانات طرح شروع']},
  {id:'special',name:'تجربه ویژه',price:500000,label:'برای تجربه متفاوت مشتری',features:['تمام امکانات طرح رونق','چت صوتی هوشمند داخل منو — به‌زودی','نمایش سه‌بعدی غذا روی میز — به‌زودی']},
];

function PlanCards({activePlan,onChanged}:{activePlan?:string;onChanged?:()=>void}){
  const {account}=usePresentation();
  const [busy,setBusy]=useState(''),[error,setError]=useState('');
  async function choose(id:string){
    if(!account)return;
    if(account.needsProfile){setError('ابتدا مشخصات مجموعه را تکمیل کن.');return;}
    if(id==='free'||id===activePlan)return;
    setBusy(id);setError('');
    try{
      let requestId=sessionStorage.getItem('checkout-request-'+account.id+'-'+account.businessId+'-'+id);
      if(!requestId){requestId=crypto.randomUUID();sessionStorage.setItem('checkout-request-'+account.id+'-'+account.businessId+'-'+id,requestId);}
      const r=await api('/billing/create',{plan:id,requestId});
      if(r.paid){sessionStorage.removeItem('checkout-request-'+account.id+'-'+account.businessId+'-'+id);onChanged?.();return;}
      const url=new URL(r.url);
      if(url.origin!=='https://sandbox.zarinpal.com')throw Error('آدرس درگاه معتبر نیست');
      window.location.assign(url.href);
    }catch(e){if((e as any).status===409)sessionStorage.removeItem('checkout-request-'+account.id+'-'+account.businessId+'-'+id);setError((e as Error).message);}finally{setBusy('');}
  }
  return <section className="membership-plans" aria-labelledby="plans-title"><div className="membership-section-title"><div><span>انتخاب طرح</span><h2 id="plans-title">اشتراک مناسب مجموعه</h2></div><p>پرداخت فعلاً آزمایشی است و مبلغی از کارت کم نمی‌شود.</p></div>{error&&<p role="alert" className="login-error">{error}</p>}<div className="plans-grid">{PLANS.map(p=>{const active=p.id===activePlan;return <article key={p.id} className={'plan-card '+(p.id==='growth'?'featured ':'')+(active?'active-plan':'')}><div className="plan-card-head"><span className="plan-label">{p.label}</span>{active&&<b>طرح فعلی</b>}</div><h3>{p.name}</h3><div className="plan-price">{p.price?new Intl.NumberFormat('fa-IR').format(p.price):'رایگان'}{p.price>0&&<small> تومان <em>/ ماه</em></small>}</div><ul>{p.features.map(f=><li key={f}><span className="material-symbols-outlined">check_circle</span>{f}</li>)}</ul>{p.id==='special'&&<p className="plan-future">امکانات صوتی و سه‌بعدی هنوز فعال نیستند؛ این طرح اکنون برای آزمایش پرداخت آماده است.</p>}<button className="plan-pay-button" disabled={!!busy||active||p.id==='free'} onClick={()=>choose(p.id)}>{active?'طرح فعال':p.id==='free'?'طرح پایه رایگان':busy===p.id?'انتقال به درگاه…':`پرداخت آزمایشی ${new Intl.NumberFormat('fa-IR').format(p.price)} تومان`}</button></article>})}</div></section>;
}

function ServicePoints(){
  const {servicePoints}=useApp();
  const [number,setNumber]=useState(''),[label,setLabel]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  return <details className="point-manager"><summary><span><b>میزها، اتاق‌ها و نقاط سرویس</b><small>{new Intl.NumberFormat('fa-IR').format(servicePoints.length)} مورد ثبت شده</small></span><span className="material-symbols-outlined">expand_more</span></summary><div className="point-manager-body"><p>برای هر محل دریافت سفارش یک شماره مستقل تعریف کن.</p><form onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{await api('/service-points',{tableNumber:Number(number),label});setNumber('');setLabel('');window.dispatchEvent(new Event('workspace-auth'));}catch(err){setError((err as Error).message);}finally{setBusy(false);}}}><label>شماره<input type="number" min="1" max="9999" value={number} onChange={e=>setNumber(e.target.value)} required/></label><label>نام (اختیاری)<input value={label} maxLength={60} onChange={e=>setLabel(e.target.value)} placeholder="مثلاً میز کنار پنجره"/></label><button disabled={busy}>{busy?'در حال افزودن…':'افزودن'}</button></form>{error&&<p role="alert" className="login-error">{error}</p>}<div className="point-list">{servicePoints.map(p=><span key={p.id}>{p.tableNumber} · {p.label}</span>)}</div></div></details>;
}

export function Membership(){
  const {account}=usePresentation(),{setCurrentView}=useApp();
  const [data,setData]=useState<any>(null),[error,setError]=useState(''),[revision,setRevision]=useState(0);
  useEffect(()=>{if(account)api('/subscription').then(setData).catch(e=>setError(e.message));},[account,revision]);
  return <main className="membership-page"><header><div><span className="membership-kicker">حساب مجموعه</span><h1>اشتراک</h1><p>طرح، ظرفیت منو و پرداخت‌های مجموعه را از اینجا مدیریت کن.</p></div><button onClick={()=>setCurrentView('dashboard-desktop')}><span className="material-symbols-outlined">arrow_forward</span>بازگشت به مدیریت</button></header>{error&&<p role="alert" className="login-error">{error}</p>}{data&&<section className="membership-status"><div className="membership-status-icon"><span className="material-symbols-outlined">workspace_premium</span></div><div><span>طرح فعال مجموعه</span><h2>{PLANS.find(p=>p.id===data.plan)?.name}</h2>{data.expiresAt&&<small>اعتبار آزمایشی تا {new Date(data.expiresAt).toLocaleDateString('fa-IR')}</small>}</div><div className="membership-usage"><span><b>{new Intl.NumberFormat('fa-IR').format(data.products)}</b> از {data.productLimit??'∞'} آیتم</span><span><b>{new Intl.NumberFormat('fa-IR').format(data.points)}</b> از {data.pointLimit??'∞'} نقطه سرویس</span></div></section>}<PlanCards activePlan={data?.plan} onChanged={()=>setRevision(x=>x+1)}/><ServicePoints/>{data?.payments?.length>0&&<section className="membership-payments"><h2>سابقه پرداخت‌های اشتراک</h2><div>{data.payments.map((p:any)=><article key={p.id}><b>{PLANS.find(plan=>plan.id===p.plan)?.name}</b><span>{new Intl.NumberFormat('fa-IR').format(p.amountToman)} تومان</span><span>{p.status==='paid'?'تأیید شده':p.status==='cancelled'?'لغو شده':'در انتظار پرداخت'}</span><small>{new Date(p.createdAt).toLocaleDateString('fa-IR')}</small>{p.refId&&<small>پیگیری: {p.refId}</small>}</article>)}</div></section>}</main>;
}

export function Checkout(){const {account}=usePresentation(),{setCurrentView}=useApp();const [data,setData]=useState<any>(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0),[login,setLogin]=useState(false);useEffect(()=>{if(!account)return;let live=true;const q=new URLSearchParams(location.search);api('/billing/verify',{id:q.get('payment'),authority:q.get('Authority'),status:q.get('Status')}).then(r=>{if(live){setData(r);['growth','special'].forEach(p=>sessionStorage.removeItem('checkout-request-'+account.id+'-'+account.businessId+'-'+p));}}).catch(e=>live&&setError(e.message));return()=>{live=false;};},[account,attempt]);const go=(view:string)=>{history.replaceState({},'',`${import.meta.env.BASE_URL}?view=${view}`);setCurrentView(view as any);};return <main className="checkout-page"><h1>نتیجه پرداخت آزمایشی</h1><p>هیچ پول واقعی از حساب شما برداشت نمی‌شود.</p>{!account?<><p>برای مشاهده نتیجه با همان شماره خریدار وارد شو.</p><button className="public-primary" onClick={()=>setLogin(true)}>ورود / ثبت‌نام</button></>:error?<><p role="alert">{error}</p><button onClick={()=>{setError('');setAttempt(a=>a+1);}}>بررسی دوباره</button></>:!data?<p role="status">در حال بررسی نتیجه درگاه…</p>:<><h2>{data.paid?'پرداخت آزمایشی تأیید و اشتراک فعال شد.':'پرداخت لغو شد؛ اشتراک تغییر نکرد.'}</h2>{data.refId&&<p>کد پیگیری: {data.refId}</p>}<button className="public-primary" onClick={()=>go('membership')}>مشاهده اشتراک</button></>}<button onClick={()=>go('website')}>صفحه اول سایت</button>{login&&<OrderDialog title="ورود / ثبت‌نام" onClose={()=>setLogin(false)}><PhoneLogin onDone={()=>{setLogin(false);setCurrentView('checkout');}}/></OrderDialog>}</main>;}
