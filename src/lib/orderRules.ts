import type {Order} from '../types';
export const isKitchenConfirmed=(o:Order)=>o.restaurantConfirmed??(['ready','delivered'].includes(o.status));
export const canDeliver=(o:Order)=>o.paymentStatus!=='unpaid'&&isKitchenConfirmed(o)&&o.status==='ready'&&o.deliveryStatus!=='delivered';
export const canStartKitchen=(o:Order)=>o.paymentStatus!=='unpaid'&&o.status==='cooking'&&!isKitchenConfirmed(o);
export const canConfirmKitchen=(o:Order)=>o.paymentStatus!=='unpaid'&&o.status==='cooking'&&isKitchenConfirmed(o);
export const pendingFoodCount=(orders:Order[])=>orders.filter(o=>o.paymentStatus!=='unpaid'&&['cooking','ready'].includes(o.status)&&o.deliveryStatus!=='delivered').reduce((sum,o)=>sum+o.items.reduce((n,i)=>n+i.quantity,0),0);

export function customerOrderStatus(o:Pick<Order,'status'|'deliveryStatus'>){
 if(o.status==='cancelled')return 'لغو شد';
 if(o.status==='delivered'||o.deliveryStatus==='delivered')return 'تحویل داده شد';
 if(o.status==='pending_waiter')return 'در انتظار گارسون';
 if(o.status==='ready')return 'آماده تحویل به گارسون';
 if(o.status==='cooking')return isKitchenConfirmed(o as Order)?'در حال آماده‌سازی':'در انتظار تأیید آشپزخانه';
 return 'برای رستوران ارسال شد';
}

export function staffOrderStatus(o:Order):string{
 if(o.status==='cancelled')return 'سفارش لغو شد';
 if(o.status==='delivered'||o.deliveryStatus==='delivered')return 'سفارش تحویل داده شد';
 if(o.status==='pending_waiter')return 'در انتظار تأیید و دریافت وجه گارسون';
 if(o.status==='ready')return 'سفارش آماده شده؛ در انتظار دریافت گارسون';
 return isKitchenConfirmed(o)?'در حال آماده‌سازی آشپزخانه':'در انتظار تأیید آشپزخانه';
}
