import type {Order} from '../types';
export const isKitchenConfirmed=(o:Order)=>o.restaurantConfirmed??(['ready','delivered'].includes(o.status));
export const canDeliver=(o:Order)=>o.paymentStatus!=='unpaid'&&isKitchenConfirmed(o)&&o.status!=='pending_waiter'&&o.status!=='cancelled'&&o.deliveryStatus!=='delivered';
export const canConfirmKitchen=(o:Order)=>o.paymentStatus!=='unpaid'&&o.status==='cooking'&&!isKitchenConfirmed(o);
export const pendingFoodCount=(orders:Order[])=>orders.filter(o=>o.paymentStatus!=='unpaid'&&['cooking','ready'].includes(o.status)&&o.deliveryStatus!=='delivered').reduce((sum,o)=>sum+o.items.reduce((n,i)=>n+i.quantity,0),0);
