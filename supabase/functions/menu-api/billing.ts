// @ts-nocheck
const MERCHANT='24810652-1c44-4df8-9761-072685063809';
export function publicSiteUrl(){
 const site=String((globalThis as any).Deno?.env?.get('PUBLIC_SITE_URL')||'https://maxlightner.github.io/menosaz').replace(/\/$/,'');
 if(!['https://maxlightner.github.io/menosaz','https://mizato.ir','https://www.mizato.ir'].includes(site))throw Error('PUBLIC_SITE_URL is not an approved deployment URL');
 return site;
}
export async function sandboxGateway(method,body){
 const r=await fetch('https://sandbox.zarinpal.com/pg/v4/payment/'+method+'.json',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({merchant_id:MERCHANT,...body}),signal:AbortSignal.timeout(20000)});
 const data=await r.json();if(!r.ok||!data.data||![100,101].includes(data.data.code))throw Object.assign(Error('درگاه آزمایشی پاسخ موفق نداد؛ دوباره تلاش کن'),{status:502});return data.data;
}
export async function billingRequest(db,uid,path,body,gateway=sandboxGateway){
 const rpc=async(op,input)=>{const r=await db.rpc('menu_billing',{p_op:op,p_uid:uid,p_body:input});if(r.error)throw Object.assign(Error('اطلاعات پرداخت یا حساب معتبر نیست'),{status:400});return r.data;};
 if(path==='/billing/create'){
  let payment=await rpc('create',body);
  if(payment.status==='paid')return {paid:true,id:payment.id,sandbox:true};
  if(payment.status!=='pending')throw Object.assign(Error('این پرداخت بسته شده است؛ دوباره انتخاب کن'),{status:409});
  if(!payment.authority){
   const data=await gateway('request',{amount:payment.amount,callback_url:publicSiteUrl()+'/?view=checkout&payment='+payment.id,description:'آزمایش اشتراک منوساز؛ '+payment.plan});
   if(!/^S[0-9A-Za-z]{10,100}$/.test(data.authority))throw Object.assign(Error('پاسخ درگاه آزمایشی معتبر نیست'),{status:502});
   payment=await rpc('attach',{id:payment.id,authority:data.authority});
  }
  if(!/^S[0-9A-Za-z]{10,100}$/.test(payment.authority))throw Object.assign(Error('پرداخت آماده نیست'),{status:502});
  return {id:payment.id,url:'https://sandbox.zarinpal.com/pg/StartPay/'+payment.authority,sandbox:true};
 }
 let payment=await rpc('get',{id:body.id});
 if(payment.status==='paid')return {paid:true,id:payment.id,refId:payment.ref_id,sandbox:true};
 if(payment.status!=='pending')return {paid:false,cancelled:true,sandbox:true};
 if(body.status!=='OK'){await rpc('cancel',{id:payment.id});return {paid:false,cancelled:true,sandbox:true};}
 if(!payment.authority||body.authority!==payment.authority)throw Object.assign(Error('شناسه بازگشت پرداخت معتبر نیست'),{status:400});
 const verified=await gateway('verify',{authority:payment.authority,amount:payment.amount});
 if(![100,101].includes(verified.code)||!verified.ref_id)throw Object.assign(Error('پرداخت تأیید نشد'),{status:400});
 payment=await rpc('paid',{id:payment.id,authority:payment.authority,refId:String(verified.ref_id)});
 return {paid:payment.status==='paid',id:payment.id,refId:payment.ref_id,sandbox:true};
}
