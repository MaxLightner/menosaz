import React from 'react';
import type {InvoiceBreakdown} from '../../lib/invoice';
import {percentText,toman} from '../../lib/invoice';
import './InvoiceBreakdownView.css';
export function InvoiceBreakdownView({invoice,taxBps=0,compact=false}:{invoice:InvoiceBreakdown;taxBps?:number;compact?:boolean}){
 return <section className={'mizato-invoice-breakdown '+(compact?'compact':'')} aria-label="ریز فاکتور" dir="rtl">
  <div><span>جمع غذاها</span><strong>{toman(invoice.subtotalAmount)}</strong></div>
  <div><span>مالیات{taxBps>0?' ('+percentText(taxBps)+')':''}</span><strong>{toman(invoice.taxAmount)}</strong></div>
  {invoice.charges.map((fee,i)=><div key={fee.id||i}><span>{fee.label}</span><strong>{toman(fee.amount)}</strong></div>)}
  <div className="mizato-invoice-final"><span>مبلغ نهایی قابل پرداخت</span><strong>{toman(invoice.totalAmount)}</strong></div>
 </section>;
}
