// Read-only production checks, using the public browser key; never sends OTP or creates orders.
import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../src/services/cloudConfig.ts',import.meta.url),'utf8'),base=source.match(/CLOUD_API="([^"]+)"/)[1],key=source.match(/CLOUD_PUBLIC_KEY="([^"]+)"/)[1];
const get=async path=>{const r=await fetch(base+path,{headers:{apikey:key,Authorization:'Bearer '+key},signal:AbortSignal.timeout(20000)});return {status:r.status,data:await r.json()};};
const health=await get('/health');assert.equal(health.status,200);assert.equal(health.data.orderVersion,1);
assert.equal(health.data.platformVersion,1);assert.equal(health.data.runtimeVersion,2);
const content=await get('/public/content');assert.equal(content.status,200);assert.ok(content.data.version>=1);
const privateContent=await get('/admin/content');assert.equal(privateContent.status,401);
const legacy=await get('/public/resolve?business=pich-shemroon&table=1&menu=ignored-old-menu');assert.equal(legacy.status,200);assert.equal(legacy.data.business.id,'pich-shemroon');assert.equal(legacy.data.servicePoint.tableNumber,1);assert.equal(legacy.data.orders.length,0);assert.equal(legacy.data.servicePoint.activeSession,undefined);
for(const key of ['qrToken','qrCodeUrl','activeSession','menuIds','version','isOccupied'])assert.equal(Object.hasOwn(legacy.data.servicePoint,key),false,key);
const publicMenu=await get('/public/menu?business=pich-shemroon&menu=main');assert.equal(publicMenu.status,200);
for(const point of publicMenu.data.servicePoints||[])for(const key of ['qrToken','qrCodeUrl','activeSession','menuIds','version','isOccupied'])assert.equal(Object.hasOwn(point,key),false,key);
const deniedSession=await fetch(base+'/sessions/open',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({business:'pich-shemroon',table:1,guestToken:'00000000-0000-4000-a000-000000000099'}),signal:AbortSignal.timeout(20000)});
assert.equal(deniedSession.status,403);assert.equal((await deniedSession.json()).code,'QR_REQUIRED');
const denied=await get('/workspace');assert.equal(denied.status,401);
const invalid=await get('/public/resolve?q=invalid');assert.equal(invalid.status,404);
console.log(JSON.stringify({health:health.data,publicContent:true,privateContentDenied:true,anonymousQR:true,legacyLink:true,privateWorkspaceDenied:true,invalidQRDenied:true,products:qr.data.products.length}));
if(process.argv.includes('--site')){
 const r=await fetch('https://maxlightner.github.io/menosaz/?release=platform-v1',{signal:AbortSignal.timeout(20000)});assert.equal(r.status,200);const html=await r.text(),script=html.match(/src="([^"]*\/assets\/[^"]+\.js)"/)[1];
 const asset=await fetch(new URL(script,'https://maxlightner.github.io/menosaz/'),{signal:AbortSignal.timeout(20000)}),js=await asset.text();console.log(JSON.stringify({asset:script,status:asset.status,bytes:js.length,hasQR:js.includes('/public/resolve'),hasSessions:js.includes('تخلیه سرویس‌پوینت')}));assert.equal(asset.status,200);assert.ok(js.includes('/public/resolve'));assert.ok(js.includes('تخلیه سرویس‌پوینت'));assert.ok(js.includes('/public/content'));assert.ok(js.includes('/admin/content-images'));assert.ok(!js.includes('firestore.googleapis.com'));console.log('PASS: GitHub Pages serves the QR/session/notification release');
}
