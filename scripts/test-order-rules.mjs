import assert from 'node:assert/strict';import {canDeliver,canConfirmKitchen,pendingFoodCount} from '../src/lib/orderRules.ts';
const order={status:'pending_waiter',paymentStatus:'unpaid',deliveryStatus:'pending',restaurantConfirmed:false,items:[{quantity:2}]};
assert.equal(canDeliver(order),false);assert.equal(canConfirmKitchen(order),false);
const sent={...order,status:'cooking',paymentStatus:'paid_cash'};assert.equal(canDeliver(sent),false);assert.equal(canConfirmKitchen(sent),true);
const confirmed={...sent,status:'ready',restaurantConfirmed:true};assert.equal(canDeliver(confirmed),true);assert.equal(canConfirmKitchen(confirmed),false);
assert.equal(canDeliver({...confirmed,paymentStatus:'unpaid'}),false);assert.equal(canDeliver({...confirmed,deliveryStatus:'delivered'}),false);
assert.equal(pendingFoodCount([order,sent,confirmed,{...confirmed,status:'delivered',deliveryStatus:'delivered'}]),4);
console.log('Payment, restaurant confirmation, delivery dependency and food count checks passed.');
