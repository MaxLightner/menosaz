type AlertOrder={id:string;status:string;tableNumber?:number};
type AlertCall={id:string;status:string;tableNumber?:number};
type AlertPoint={label:string;activeSession?:{id:string;durationSeconds:number}};
export type AlertSnapshot={orders?:AlertOrder[];serviceCalls?:AlertCall[];servicePoints?:AlertPoint[];notices?:{id:string;message:string}[]};
export function orderAlerts(view:string,previous:AlertSnapshot|null,current:AlertSnapshot){
 const alerts:{id:string;message:string}[]=[];if(!previous)return alerts;
 const orders=new Map((previous.orders||[]).map(o=>[o.id,o.status]));
 if(view==='waiter'){
  for(const o of current.orders||[])if(o.status==='pending_waiter'&&!orders.has(o.id))alerts.push({id:o.id,message:'سفارش جدید برای میز '+o.tableNumber});
  const calls=new Set((previous.serviceCalls||[]).map(c=>c.id));for(const c of current.serviceCalls||[])if(c.status==='pending'&&!calls.has(c.id))alerts.push({id:c.id,message:'درخواست جدید از میز '+c.tableNumber});
 }
 if(view==='kitchen')for(const o of current.orders||[])if(o.status==='cooking'&&orders.get(o.id)!=='cooking')alerts.push({id:o.id,message:'سفارش تازه به آشپزخانه رسید'});
 if(view==='customer'){
  for(const o of current.orders||[])if(['ready','delivered'].includes(o.status)&&!['ready','delivered'].includes(orders.get(o.id)||''))alerts.push({id:o.id+'-ready',message:o.status==='ready'?'غذای شما آماده است؛ گارسون برای تحویل اقدام می‌کند.':'تحویل سفارش شما ثبت شد.'});
  const seen=new Set((previous.notices||[]).map(n=>n.id));for(const notice of current.notices||[])if(!seen.has(notice.id))alerts.push({id:notice.id,message:notice.message});
 }
 if(['waiter','dashboard-desktop','dashboard-mobile'].includes(view)){
  const long=new Set((previous.servicePoints||[]).filter(p=>(p.activeSession?.durationSeconds||0)>=3600).map(p=>p.activeSession!.id));
  for(const p of current.servicePoints||[])if(p.activeSession&&p.activeSession.durationSeconds>=3600&&!long.has(p.activeSession.id))alerts.push({id:p.activeSession.id+'-long',message:'حضور مهمانان '+p.label+' از ۶۰ دقیقه گذشته است.'});
 }
 return alerts;
}
