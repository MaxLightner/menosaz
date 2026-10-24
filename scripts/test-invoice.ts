import assert from 'node:assert/strict';
import {defaultBilling,invoicePreview,invoiceFromOrder} from '../src/lib/invoice';
const config={taxBps:900,fees:[
 {id:'table',label:'هزینه میز',kind:'fixed' as const,value:15000},
 {id:'service',label:'هزینه سرویس',kind:'percent' as const,value:500}
]};
const q=invoicePreview(100000,config);
assert.deepEqual(q,{subtotalAmount:100000,taxAmount:9000,serviceAmount:20000,
 charges:[{...config.fees[0],amount:15000},{...config.fees[1],amount:5000}],totalAmount:129000});
assert.deepEqual(invoicePreview(0,config),{subtotalAmount:0,taxAmount:0,serviceAmount:0,charges:[],totalAmount:0});
assert.equal(invoicePreview(50000,defaultBilling).totalAmount,50000);
assert.equal(invoicePreview(1,{taxBps:5000,fees:[]}).totalAmount,1);
assert.equal(invoicePreview(101,{taxBps:500,fees:[]}).taxAmount,5);
assert.equal(invoiceFromOrder({totalAmount:129000,invoice:q}).subtotalAmount,100000);
assert.equal(invoiceFromOrder({totalAmount:89000}).subtotalAmount,89000);
assert.throws(()=>invoicePreview(-1,config));
assert.throws(()=>invoicePreview(1.2,config));
console.log('Invoice fee/tax/legacy regression tests passed');
