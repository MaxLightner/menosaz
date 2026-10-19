// Read-only/invalid-request checks. Never sends OTP, creates orders or changes real records.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const config=await readFile(new URL('../src/services/cloudConfig.ts',import.meta.url),'utf8');
const base=config.match(/CLOUD_API="([^"]+)"/)[1],key=config.match(/CLOUD_PUBLIC_KEY="([^"]+)"/)[1];
async function request(path,body,expected){const response=await fetch(base+path,{method:body?'POST':'GET',headers:{apikey:key,Authorization:'Bearer '+key,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)});assert.equal(response.status,expected,path);return response.json();}
for(const path of ['/staff/list','/staff/mine','/feedback/report','/club/list','/product-gallery'])await request(path,undefined,401);
await request('/auth/request',{phone:'invalid'},400);
await request('/auth/request',{phone:'invalid',acceptTerms:true,termsVersion:'2026-10-19'},400);
await request('/auth/verify',{phone:'invalid',code:'000000',challenge:'invalid',acceptTerms:true,termsVersion:'2026-10-19'},400);
await request('/feedback/submit',{businessId:'not-a-real-business',orderId:'invalid',sessionId:'invalid',guestToken:'forged',foodRating:5,serviceRating:5,anonymous:true},400);
const options=await fetch(base+'/products/invalid',{method:'OPTIONS',headers:{Origin:'https://maxlightner.github.io','Access-Control-Request-Method':'DELETE','Access-Control-Request-Headers':'content-type,x-menu-session'},signal:AbortSignal.timeout(20000)});
assert.equal(options.status,204);assert.ok(options.headers.get('access-control-allow-methods').includes('DELETE'));
console.log('PASS: 10 live staff/feedback/club/login/QR-gallery permission and CORS checks; no SMS or orders created');
