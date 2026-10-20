import React,{useState} from 'react';
import {usePresentation} from '../../context/PresentationContext';
import {BACKEND} from '../../services/backend';
import {useApp} from '../../context/AppContext';
import type {Order} from '../../types';
import {canStartKitchen,canConfirmKitchen} from '../../lib/orderRules';

const clock=(date:string)=>new Date(date).toLocaleTimeString('fa-IR',{hour:'2-digit',minute:'2-digit'});
type Group='waiting'|'preparing'|'ready';
function stage(order:Order):Group{
 if(order.status==='ready')return 'ready';
 return order.restaurantConfirmed?'preparing':'waiting';
}
const sections:{id:Group;title:string;description:string}[]=[
 {id:'waiting',title:'در انتظار تأیید آشپزخانه',description:'تأیید سفارش و شروع آماده‌سازی'},
 {id:'preparing',title:'در حال آماده‌سازی',description:'پس از آماده‌شدن، گارسون را مطلع کن'},
 {id:'ready',title:'آماده تحویل',description:'در انتظار دریافت و تحویل توسط گارسون'}
];

export const RestoredKitchenApp:React.FC=()=>{
 const {account}=usePresentation();
 const {syncError,isServerConnected,refreshWorkspace,orders,business,startKitchen,confirmKitchen,showToast}=useApp();
 const [busyId,setBusyId]=useState<string|null>(null);
 const canAct=(!BACKEND||account?.businessRole==='kitchen')&&isServerConnected;
 // Closed/delivered orders leave the operational queue immediately.
 const active=orders.filter(o=>o.businessId===business.id&&o.paymentStatus!=='unpaid'
   &&(o.status==='cooking'||o.status==='ready')&&o.deliveryStatus!=='delivered')
   .sort((a,b)=>new Date(a.kitchenReceivedAt||a.createdAt).getTime()-new Date(b.kitchenReceivedAt||b.createdAt).getTime());
 const groups=sections.map(section=>({...section,items:active.filter(o=>stage(o)===section.id)}));
 async function advance(order:Order,action:'start'|'ready'){
   if(busyId)return;
   const latest=orders.find(o=>o.id===order.id);
   if(!latest||latest.version!==order.version){showToast('سفارش تغییر کرده؛ دوباره بررسی کن');refreshWorkspace();return;}
   setBusyId(order.id);
   try{
    if(action==='start')await startKitchen(order.id);
    else await confirmKitchen(order.id);
    showToast(action==='start'?'آماده‌سازی سفارش آغاز شد':'سفارش آماده است؛ به گارسون اطلاع داده شد');
   }catch(error){showToast((error as Error).message);}
   finally{setBusyId(null);}
 }
 return <main className="restored-staff restored-kitchen kds-board" dir="rtl">
  <header className="kds-header">
   <div className="staff-identity"><span>{business.name}</span><span>آشپزخانه</span></div>
   <h1>سفارش‌های آشپزخانه</h1>
   <div className="kds-counters" aria-live="polite">
    <span>منتظر تأیید <b>{groups[0].items.length.toLocaleString('fa-IR')}</b></span>
    <span>در حال آماده‌سازی <b>{groups[1].items.length.toLocaleString('fa-IR')}</b></span>
    <span>آماده تحویل <b>{groups[2].items.length.toLocaleString('fa-IR')}</b></span>
   </div>
  </header>
  <div className={'staff-sync '+(isServerConnected?'':'disconnected')} role="status">
   <span>{isServerConnected?'● متصل · به‌روزرسانی خودکار':syncError||'در حال اتصال به سرور…'}</span>
   <button onClick={refreshWorkspace}>تازه‌سازی</button>
  </div>
  {groups.map(section=><section key={section.id} className={'kds-section kds-'+section.id}>
   <div className="kds-section-heading"><h2>{section.title} <small>{section.items.length.toLocaleString('fa-IR')}</small></h2><p>{section.description}</p></div>
   <div className="kds-grid">
   {section.items.map(o=><article className={'staff-order kds-order kds-'+section.id} key={o.id}>
    <div className="staff-order-top"><h3>میز {o.tableNumber}</h3><div className="kds-order-times">
     <time dateTime={o.createdAt}>ثبت {clock(o.createdAt)}</time>
     <time dateTime={o.kitchenReceivedAt||o.createdAt}>دریافت آشپزخانه {clock(o.kitchenReceivedAt||o.createdAt)}</time>
    </div></div>
    {o.customerNotes&&<p className="staff-note">مشتری: {o.customerNotes}</p>}
    <ul className="kds-items">{o.items.map(item=><li className="kitchen-food" key={item.id}>
     <strong>{item.quantity} ×</strong><span>{item.productName}</span>
     {item.selectedOptions?.map((option,i)=><small key={i}>{option.groupTitle}: {option.optionName}</small>)}
     {item.notes&&<p>مشتری: {item.notes}</p>}
     {item.waiterNotes&&<p>گارسون: {item.waiterNotes}</p>}
    </li>)}</ul>
    {section.id==='waiting'&&<button className="staff-primary kds-action" type="button"
     disabled={!canAct||!!busyId||!canStartKitchen(o)}
     onClick={()=>advance(o,'start')}>{busyId===o.id?'در حال ثبت…':'تأیید سفارش و شروع آماده‌سازی'}</button>}
    {section.id==='preparing'&&<button className="staff-primary kds-action" type="button"
     disabled={!canAct||!!busyId||!canConfirmKitchen(o)}
     onClick={()=>advance(o,'ready')}>{busyId===o.id?'در حال ثبت…':'سفارش آماده تحویل و اطلاع به گارسون'}</button>}
    {section.id==='ready'&&<p className="kds-ready-message" role="status">آماده است؛ در انتظار دریافت گارسون</p>}
   </article>)}
   {!section.items.length&&<p className="staff-empty kds-empty">{section.id==='waiting'?'سفارش تازه‌ای در انتظار نیست.':section.id==='preparing'?'فعلاً سفارش در حال آماده‌سازی نیست.':'سفارش آماده‌ای در صف نیست.'}</p>}
   </div>
  </section>)}
 </main>;
};
