import React,{useState} from 'react';
import {useApp} from '../../context/AppContext';
import {type BillingFee,type BillingSettings,defaultBilling,invoicePreview,percentText,toman} from '../../lib/invoice';

const faNumber=(value:number)=>String(value/100);
function isFeeValid(f:BillingFee){
 return /^[a-zA-Z0-9_-]{1,40}$/.test(f.id)&&f.label.trim().length>=2&&f.label.trim().length<=40
  &&(f.kind==='fixed'||f.kind==='percent')&&Number.isSafeInteger(f.value)&&f.value>=0
  &&f.value<=(f.kind==='fixed'?1000000:3000);
}
export function BillingSettingsEditor(){
 const {business,updateBusinessSettings,showToast}=useApp();
 const [tax,setTax]=useState(()=>faNumber(business.billing?.taxBps||0));
 const [fees,setFees]=useState<BillingFee[]>(()=>business.billing?.fees||[]);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const update=(id:string,patch:Partial<BillingFee>)=>setFees(list=>list.map(f=>f.id===id?{...f,...patch}:f));
 const taxBps=Math.round(Number(tax)*100);
 const preview=invoicePreview(100000,{taxBps:Number.isSafeInteger(taxBps)?taxBps:0,fees});
 function addFee(){
  if(fees.length>=5){setError('حداکثر پنج ردیف هزینه خدمات مجاز است.');return;}
  setFees(list=>[...list,{id:'fee-'+crypto.randomUUID().slice(0,12),label:'',kind:'fixed',value:0}]);
 }
 async function save(){
  setError('');
  if(!Number.isFinite(Number(tax))||!Number.isInteger(taxBps)||taxBps<0||taxBps>3000)return setError('مالیات باید بین صفر تا ۳۰ درصد با حداکثر دو رقم اعشار باشد.');
  if(fees.some(f=>!isFeeValid(f)))return setError('نام و مبلغ هزینه‌ها را بررسی کن (سقف مبلغ ثابت یک میلیون تومان یا ۳۰ درصد).');
  if(new Set(fees.map(f=>f.id)).size!==fees.length)return setError('شناسه هزینه تکراری است.');
  const billing:BillingSettings={taxBps,fees:fees.map(f=>({...f,label:f.label.trim()}))};
  setBusy(true);try{await updateBusinessSettings({billing});showToast('مالیات و خدمات برای سفارش‌های جدید ذخیره شد');}
  catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 return <section dir="rtl" className="mizato-billing-settings">
  <h3>مالیات و هزینه‌های خدمات</h3>
  <p>تمام مبالغ روی فاکتور مشتری پیش از تأیید نمایش داده می‌شوند. این تنظیمات فقط روی سفارش‌های جدید اثر دارند؛ فاکتورهای قدیمی تغییر نمی‌کنند.</p>
  <label>مالیات (درصد از مبلغ غذاها)<input type="number" min="0" max="30" step="0.01" value={tax} onChange={e=>setTax(e.target.value)} aria-label="درصد مالیات"/></label>
  <p className="mizato-billing-hint">نرخ پیش‌فرض صفر است؛ نرخ قانونی و شرایط اعمال مالیات را مدیر رستوران تعیین می‌کند.</p>
  <div className="mizato-billing-fees">
   <div className="mizato-billing-header"><b>هزینه‌های جانبی (برای هر سفارش)</b><button type="button" disabled={busy||fees.length>=5} onClick={addFee}>+ افزودن هزینه</button></div>
   {fees.length===0&&<p className="mizato-billing-hint">هزینه جانبی فعالی وجود ندارد. می‌توانی «هزینه میز»، «هزینه سرویس» یا هر عنوان دیگری تعریف کنی.</p>}
   {fees.map(f=><div key={f.id} className="mizato-billing-fee">
    <label>عنوان<input maxLength={40} value={f.label} placeholder="مثلاً هزینه سرویس" onChange={e=>update(f.id,{label:e.target.value})}/></label>
    <label>نوع<select value={f.kind} onChange={e=>update(f.id,{kind:e.target.value as BillingFee['kind'],value:0})}><option value="fixed">مبلغ ثابت</option><option value="percent">درصد از غذاها</option></select></label>
    <label>{f.kind==='fixed'?'مبلغ (تومان)':'درصد'}<input type="number" min="0" max={f.kind==='fixed'?1000000:30} step={f.kind==='fixed'?1:0.01} value={f.kind==='fixed'?f.value:f.value/100} onChange={e=>update(f.id,{value:f.kind==='fixed'?Math.round(Number(e.target.value)):Math.round(Number(e.target.value)*100)})}/></label>
    <button type="button" className="mizato-billing-remove" onClick={()=>setFees(rows=>rows.filter(x=>x.id!==f.id))}>حذف</button>
   </div>)}
  </div>
  <div className="mizato-billing-example">
   <b>نمونه فاکتور برای ۱۰۰٬۰۰۰ تومان غذا</b>
   <div><span>جمع غذاها</span><strong>{toman(preview.subtotalAmount)}</strong></div>
   <div><span>مالیات ({percentText(taxBps||0)})</span><strong>{toman(preview.taxAmount)}</strong></div>
   {preview.charges.map(f=><div key={f.id}><span>{f.label||'خدمات'}</span><strong>{toman(f.amount)}</strong></div>)}
   <div className="mizato-billing-final"><span>مبلغ قابل پرداخت</span><strong>{toman(preview.totalAmount)}</strong></div>
  </div>
  {error&&<p role="alert" className="wizard-error">{error}</p>}
  <button type="button" className="staff-primary" disabled={busy} onClick={save}>{busy?'در حال ذخیره…':'ذخیره مالیات و خدمات'}</button>
 </section>;
}
