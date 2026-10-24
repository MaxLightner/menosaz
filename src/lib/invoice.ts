/**
 * Customer preview of invoice charges. The database independently calculates
 * the authoritative amounts from catalogue prices and snapshots the bill.
 * All amounts are integer toman; rates are stored in basis points.
 */
export type FeeKind='fixed'|'percent';
export type BillingFee={id:string;label:string;kind:FeeKind;value:number};
export type BillingSettings={taxBps:number;fees:BillingFee[]};
export type InvoiceCharge=BillingFee&{amount:number};
export type InvoiceBreakdown={subtotalAmount:number;taxAmount:number;serviceAmount:number;charges:InvoiceCharge[];totalAmount:number};
export const defaultBilling:BillingSettings={taxBps:0,fees:[]};
export const toman=(amount:number)=>new Intl.NumberFormat('fa-IR').format(amount)+' تومان';
export function normalizedBilling(value:BillingSettings|undefined|null):BillingSettings{
 if(!value||!Number.isInteger(value.taxBps)||value.taxBps<0||value.taxBps>3000||!Array.isArray(value.fees))return defaultBilling;
 return {taxBps:value.taxBps,fees:value.fees};
}
export function invoicePreview(subtotal:number,settings:BillingSettings|undefined|null):InvoiceBreakdown{
 if(!Number.isSafeInteger(subtotal)||subtotal<0)throw new Error('جمع سفارش معتبر نیست.');
 const billing=normalizedBilling(settings);
 if(subtotal===0)return {subtotalAmount:0,taxAmount:0,serviceAmount:0,charges:[],totalAmount:0};
 const charges=billing.fees.filter(f=>f&&Number.isSafeInteger(f.value)&&f.value>0).map(f=>({
  ...f,amount:f.kind==='percent'?Math.round(subtotal*f.value/10000):f.value
 })).filter(f=>f.amount>0);
 const taxAmount=Math.round(subtotal*billing.taxBps/10000);
 const serviceAmount=charges.reduce((total,fee)=>total+fee.amount,0);
 return {subtotalAmount:subtotal,taxAmount,serviceAmount,charges,totalAmount:subtotal+taxAmount+serviceAmount};
}
export function invoiceFromOrder(order:{totalAmount:number;invoice?:InvoiceBreakdown|null}):InvoiceBreakdown{
 const value=order.invoice;
 if(value&&typeof value.subtotalAmount==='number'&&typeof value.taxAmount==='number'&&Array.isArray(value.charges))return value;
 return {subtotalAmount:order.totalAmount,taxAmount:0,serviceAmount:0,charges:[],totalAmount:order.totalAmount};
}
export function percentText(bps:number){return new Intl.NumberFormat('fa-IR',{maximumFractionDigits:2}).format(bps/100)+'٪';}
