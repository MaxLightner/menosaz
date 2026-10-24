import React,{useState} from 'react';
import {InvoiceBreakdownView} from '../common/InvoiceBreakdownView';
import {invoiceFromOrder} from '../../lib/invoice';
import type {Order} from '../../types';
import {api} from '../../services/backend';

const PAGE=30;
/** Management-only paginated history. Active orders remain in the live workspace. */
export function OrderHistory(){
 const [open,setOpen]=useState(false),[orders,setOrders]=useState<Order[]>([]);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[hasMore,setHasMore]=useState(true);
 async function fetchPage(reset=false){
  if(busy)return;
  setBusy(true);setError('');
  try{
   const cursor=reset?undefined:orders[orders.length-1];
   const query=new URLSearchParams({limit:String(PAGE)});
   if(cursor){query.set('before',cursor.createdAt);query.set('beforeId',cursor.id);}
   const page=await api<Order[]>('/orders/history?'+query.toString());
   setOrders(previous=>{
    if(reset)return page;
    const existing=new Set(previous.map(o=>o.id));
    return [...previous,...page.filter(o=>!existing.has(o.id))];
   });
   setHasMore(page.length===PAGE);
  }catch(e){setError((e as Error).message||'خواندن تاریخچه انجام نشد');}
  finally{setBusy(false);}
 }
 function toggle(){if(open){setOpen(false);return;}setOpen(true);if(!orders.length)void fetchPage(true);}
 return <section className="bg-white border border-[#DBE2D5] rounded-xl p-3 md:p-4 text-[#29372E]" dir="rtl">
  <div className="flex justify-between items-center gap-3 flex-wrap">
   <div><h3 className="text-sm font-bold">تاریخچه سفارش‌های بسته‌شده</h3><p className="text-xs text-[#64715E]">سفارش‌های تحویل‌شده و لغوشده؛ بارگذاری مرحله‌ای برای سرعت بیشتر</p></div>
   <button type="button" className="px-3 py-2 rounded-lg border border-[#B9C8B6] text-xs font-bold" aria-expanded={open} onClick={toggle}>{open?'بستن تاریخچه':'مشاهده تاریخچه'}</button>
  </div>
  {open&&<div className="mt-3 space-y-2">
   {orders.map(o=><article className="rounded-lg border border-[#E1E8DD] p-3 flex items-center justify-between gap-3 flex-wrap" key={o.id}>
    <div><b className="text-sm">میز {o.tableNumber} · سفارش {o.orderNumber}</b><div className="text-xs text-[#64715E]">{new Date(o.createdAt).toLocaleString('fa-IR')} · {o.status==='cancelled'?'لغوشده':'تحویل‌شده'}</div><div className="text-xs mt-1">{o.items.map(i=>i.quantity+' × '+i.productName).join('، ')}</div></div>
    <div><strong className="text-xs">{new Intl.NumberFormat('fa-IR').format(o.totalAmount)} تومان</strong><details><summary className="text-xs cursor-pointer">ریز فاکتور</summary><InvoiceBreakdownView invoice={invoiceFromOrder(o)} compact/></details></div>
   </article>)}
   {error&&<p role="alert" className="text-red-700 text-xs">{error}</p>}
   {!orders.length&&!busy&&!error&&<p className="text-xs text-[#64715E]">هنوز سفارش بسته‌شده‌ای ثبت نشده است.</p>}
   {hasMore&&<button type="button" className="w-full border border-[#B9C8B6] rounded-lg p-3 font-bold text-xs" disabled={busy} onClick={()=>void fetchPage(!orders.length)}>{busy?'در حال دریافت…':'نمایش سفارش‌های قدیمی‌تر'}</button>}
  </div>}
 </section>;
}
