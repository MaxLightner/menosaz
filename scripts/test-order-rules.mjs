import assert from 'node:assert/strict';import {canDeliver,canStartKitchen,canConfirmKitchen,pendingFoodCount} from '../src/lib/orderRules.ts';
const order={status:'pending_waiter',paymentStatus:'unpaid',deliveryStatus:'pending',restaurantConfirmed:false,items:[{quantity:2}]};
assert.equal(canDeliver(order),false);assert.equal(canConfirmKitchen(order),false);
const sent={...order,status:'cooking',paymentStatus:'paid_cash'};assert.equal(canDeliver(sent),false);assert.equal(canStartKitchen(sent),true);assert.equal(canConfirmKitchen(sent),false);
const started={...sent,restaurantConfirmed:true};assert.equal(canStartKitchen(started),false);assert.equal(canConfirmKitchen(started),true);assert.equal(canDeliver(started),false);
const confirmed={...started,status:'ready'};assert.equal(canDeliver(confirmed),true);assert.equal(canConfirmKitchen(confirmed),false);
assert.equal(canDeliver({...confirmed,paymentStatus:'unpaid'}),false);assert.equal(canDeliver({...confirmed,deliveryStatus:'delivered'}),false);
assert.equal(pendingFoodCount([order,sent,confirmed,{...confirmed,status:'delivered',deliveryStatus:'delivered'}]),4);
console.log('Payment, restaurant confirmation, delivery dependency and food count checks passed.');
