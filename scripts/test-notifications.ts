import assert from 'node:assert/strict';import {orderAlerts,type AlertSnapshot} from '../src/lib/orderAlerts';
const pending={id:'o1',tableNumber:4,status:'pending_waiter'},cooking={...pending,status:'cooking'},ready={...pending,status:'ready'},delivered={...pending,status:'delivered'};
assert.deepEqual(orderAlerts('waiter',null,{orders:[pending]}),[]);
assert.equal(orderAlerts('waiter',{}, {orders:[pending]}).length,1);
assert.equal(orderAlerts('waiter',{orders:[pending]},{orders:[pending]}).length,0);
assert.equal(orderAlerts('kitchen',{orders:[pending]},{orders:[cooking]}).length,1);
assert.equal(orderAlerts('kitchen',{orders:[cooking]},{orders:[ready]}).length,0);
assert.equal(orderAlerts('customer',{orders:[pending]},{orders:[ready]}).length,1);
assert.equal(orderAlerts('customer',{orders:[pending]},{orders:[delivered]}).length,1); // ready and delivery can occur between two polls
assert.equal(orderAlerts('customer',{orders:[ready]},{orders:[delivered]}).length,0);
assert.equal(orderAlerts('customer',null,{orders:[ready]}).length,0);
const notice={id:'reminder',message:'پیشنهاد سفارش تازه'};
assert.equal(orderAlerts('customer',{}, {notices:[notice]}).length,1);
assert.equal(orderAlerts('customer',{notices:[notice]},{notices:[notice]}).length,0);
const point={label:'میز چهار',activeSession:{id:'s1',durationSeconds:3600}};
assert.equal(orderAlerts('waiter',{servicePoints:[{...point,activeSession:{...point.activeSession,durationSeconds:3599}}]},{servicePoints:[point]}).length,1);
assert.equal(orderAlerts('waiter',{servicePoints:[point]},{servicePoints:[point]}).length,0);
assert.equal(orderAlerts('customer',{}, {servicePoints:[point]}).length,0);
console.log('PASS: 14 role/ready/delivery/reminder/sound-trigger checks');
