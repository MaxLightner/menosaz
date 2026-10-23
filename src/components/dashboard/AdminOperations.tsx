import React,{useEffect,useState} from 'react';
import {api} from '../../services/backend';
import './AdminOperations.css';

type AiStatus={configured:boolean;source:'panel'|'server'|'none';updatedAt:string|null;message?:string};
type OperationalStats={activeVenues:number;emptyVenues:number;blockedAccounts:number;ordersToday:number;openOrders:number;activeSubscriptions:number;aiRequests24h:number};

export function AdminOperations(){
 const [status,setStatus]=useState<AiStatus|null>(null),[stats,setStats]=useState<OperationalStats|null>(null);
 const [secret,setSecret]=useState(''),[showSecret,setShowSecret]=useState(false);
 const [busy,setBusy]=useState<'save'|'test'|'refresh'|null>(null),[message,setMessage]=useState(''),[error,setError]=useState('');
 async function load(){
  const [settings,statistics]=await Promise.all([api<AiStatus>('/admin/ai-settings'),api<OperationalStats>('/admin/stats')]);
  setStatus(settings);setStats(statistics);
 }
 useEffect(()=>{let live=true;Promise.all([api<AiStatus>('/admin/ai-settings'),api<OperationalStats>('/admin/stats')]).then(([settings,statistics])=>{if(live){setStatus(settings);setStats(statistics);}}).catch(e=>{if(live)setError((e as Error).message);});return()=>{live=false;};},[]);
 async function save(event:React.FormEvent){
  event.preventDefault();if(!secret.trim())return;
  setError('');setMessage('');setBusy('save');
  try{
   const result=await api<AiStatus>('/admin/ai-settings',{apiKey:secret});
   setStatus(result);setSecret('');setShowSecret(false);
   setMessage('کلید ذخیره شد. اکنون «تست اتصال» را بزن تا معتبر بودن آن بررسی شود.');
  }catch(e){setError((e as Error).message);}finally{setBusy(null);}
 }
 async function test(){
  setError('');setMessage('');setBusy('test');
  try{
   const result=await api<{connected:boolean;model:string;message:string}>('/admin/ai-settings/test',{test:true});
   setMessage(result.message);
  }catch(e){setError((e as Error).message);}finally{setBusy(null);}
 }
 async function refresh(){
  setBusy('refresh');setError('');try{await load();}catch(e){setError((e as Error).message);}finally{setBusy(null);}
 }
 return <div className="platform-operations" dir="rtl">
  <section className="admin-operations-summary" aria-labelledby="operations-title">
   <div className="admin-section-heading"><h2 id="operations-title">وضعیت عملیاتی پلتفرم</h2><button type="button" disabled={!!busy} onClick={refresh}>به‌روزرسانی</button></div>
   {stats?<div className="admin-operations-grid">
    <div><b>{stats.activeVenues}</b><span>رستوران فعال</span></div>
    <div><b>{stats.emptyVenues}</b><span>رستوران بدون محصول</span></div>
    <div><b>{stats.activeSubscriptions}</b><span>اشتراک فعال</span></div>
    <div><b>{stats.ordersToday}</b><span>سفارش امروز (UTC)</span></div>
    <div><b>{stats.openOrders}</b><span>سفارش باز</span></div>
    <div><b>{stats.blockedAccounts}</b><span>حساب مسدود</span></div>
    <div><b>{stats.aiRequests24h}</b><span>درخواست تحلیل در سهمیه فعال</span></div>
   </div>:<p>در حال دریافت گزارش عملیاتی…</p>}
  </section>
  <section className="admin-ai-settings" aria-labelledby="openai-title">
   <div className="admin-section-heading"><h2 id="openai-title">اتصال هوش مصنوعی منوساز</h2><span className={status?.configured?'ai-configured':'ai-unconfigured'}>{status?.configured?'کلید ثبت شده':'کلید ثبت نشده'}</span></div>
   <p>کلید فقط برای میزاتو است؛ در حافظه مرورگر ذخیره نمی‌شود و پس از ثبت قابل مشاهده یا بازیابی نیست. واردکردن کلید جدید، کلید قبلی را جایگزین می‌کند.</p>
   {status?.source==='server'&&<p className="ai-admin-note">کلید فعلی از تنظیمات سرور خوانده می‌شود؛ با ذخیره کلید جدید در این پنل، اولویت با کلید پنل خواهد بود.</p>}
   {status?.updatedAt&&<p className="ai-admin-note">آخرین تغییر کلید پنل: {new Date(status.updatedAt).toLocaleString('fa-IR')}</p>}
   <form onSubmit={save}>
    <label htmlFor="platform-openai-key">OpenAI API Key</label>
    <div className="admin-secret-field">
     <input id="platform-openai-key" dir="ltr" type={showSecret?'text':'password'} autoComplete="new-password" autoCorrect="off" spellCheck={false} placeholder="sk-..." value={secret} onChange={e=>setSecret(e.target.value)} maxLength={512} aria-label="کلید محرمانه OpenAI"/>
     <button type="button" onClick={()=>setShowSecret(s=>!s)}>{showSecret?'پنهان':'نمایش'}</button>
    </div>
    <div className="admin-settings-actions">
     <button type="submit" disabled={!!busy||secret.trim().length<20}>{busy==='save'?'در حال ذخیره…':'ذخیره کلید در سرور'}</button>
     <button type="button" disabled={!!busy||!status?.configured} onClick={test}>{busy==='test'?'در حال تست…':'تست اتصال OpenAI'}</button>
    </div>
   </form>
   <small>تست اتصال یک درخواست بسیار کوچک به API می‌فرستد؛ اعتبار و دسترسی مدل را بررسی می‌کند، نه کیفیت خواندن عکس را. برای استفاده واقعی باید حساب API اعتبار مصرف داشته باشد.</small>
   {error&&<p className="login-error" role="alert">{error}</p>}
   {message&&<p className="admin-ai-success" role="status">{message}</p>}
  </section>
 </div>;
}
