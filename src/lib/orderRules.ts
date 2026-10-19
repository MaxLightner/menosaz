import type {Order} from '../types';
export const isKitchenConfirmed=(o:Order)=>o.restaurantConfirmed??(['ready','delivered'].includes(o.status));
export const canDeliver=(o:Order)=>o.paymentStatus!=='unpaid'&&isKitchenConfirmed(o)&&o.status!=='pending_waiter'&&o.status!=='cancelled'&&o.deliveryStatus!=='delivered';
export const canConfirmKitchen=(o:Order)=>o.paymentStatus!=='unpaid'&&o.status==='cooking'&&!isKitchenConfirmed(o);
export const pendingFoodCount=(orders:Order[])=>orders.filter(o=>o.paymentStatus!=='unpaid'&&['cooking','ready'].includes(o.status)&&o.deliveryStatus!=='delivered').reduce((sum,o)=>sum+o.items.reduce((n,i)=>n+i.quantity,0),0);

export function customerOrderStatus(o:Pick<Order,'status'|'deliveryStatus'>){
 if(o.status==='cancelled')return 'لغو شد';
 if(o.status==='delivered'||o.deliveryStatus==='delivered')return 'تحویل داده شد';
 if(o.status==='pending_waiter')return 'در انتظار گارسون';
 if(o.status==='ready')return 'رستوران تأیید کرد';
 return 'برای رستوران ارسال شد';
}
