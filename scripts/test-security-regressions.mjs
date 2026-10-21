import assert from 'node:assert/strict';

// Executed against isolated PGlite fixtures after the platform and security migrations.
// Nothing here sends messages or modifies production orders.
export async function runSecurityRegressionTests(db) {
 const call=async(path,method='GET',body={},uid=null)=>
  (await db.query('select menu_api_v2($1,$2,$3,$4) as result',[path,method,body,uid])).rows[0].result;
 let checks=0;
 const menu=await call('/public/menu','GET',{business:'pich-shemroon',menu:'main'});
 assert.equal(menu.status,200);
 assert.ok(Array.isArray(menu.data.servicePoints));
 for(const point of menu.data.servicePoints)for(const secret of ['qrToken','qrCodeUrl','activeSession','menuIds','version'])assert.equal(Object.hasOwn(point,secret),false,secret);
 checks++;
 const legacy=await call('/public/resolve','GET',{business:'pich-shemroon',table:'1'});
 assert.equal(legacy.status,200);
 for(const field of ['qrToken','qrCodeUrl','activeSession','menuIds','version'])assert.equal(Object.hasOwn(legacy.data.servicePoint,field),false,field);
 checks++;
 const before=(await db.query("select count(*)::int n from service_sessions")).rows[0].n;
 const forged=await call('/sessions/open','POST',{business:'pich-shemroon',table:1,guestToken:crypto.randomUUID()});
 assert.equal(forged.status,403);assert.equal(forged.data.code,'QR_REQUIRED');
 assert.equal((await db.query("select count(*)::int n from service_sessions")).rows[0].n,before);
 checks++;
 const q=(await db.query("select token from qr_links where business_id='pich-shemroon' limit 1")).rows[0].token;
 const withQr=await call('/sessions/open','POST',{q,guestToken:crypto.randomUUID()});
 assert.equal(withQr.status,200,JSON.stringify(withQr));assert.ok(withQr.data.sessionId);
 checks++;
 const feed=await call('/public/feed');
 assert.equal(feed.status,200);assert.deepEqual(feed.data,[]);
 checks++;
 const user='00000000-0000-4000-a000-000000000120';
 await db.query("insert into auth.users values($1,'989117771120',null,now())",[user]);
 await db.query("insert into profiles(user_id) values ($1)",[user]); // OTP terms acceptance creates this before registration.
 const incomplete=await call('/account','GET',{},user);
 assert.equal(incomplete.status,403);assert.equal(incomplete.data.code,'REGISTRATION_REQUIRED');checks++;
 const countBefore=(await db.query("select count(*)::int n from businesses")).rows[0].n;
 const registration=await call('/register','POST',{acceptTerms:true,businessName:'آزمون ورود جدید'},user);
 assert.equal(registration.status,200,JSON.stringify(registration));
 assert.ok(registration.data.account.businessId);
 assert.equal((await db.query("select count(*)::int n from businesses")).rows[0].n,countBefore+1);
 assert.equal((await db.query("select active_business_id as id from profiles where user_id=$1",[user])).rows[0].id,registration.data.account.businessId);
 checks++;
 const again=await call('/register','POST',{acceptTerms:true,businessName:'دوباره'},user);
 assert.equal(again.status,200);
 assert.equal((await db.query("select count(*)::int n from businesses")).rows[0].n,countBefore+1);
 checks++;
 console.log('PASS: '+checks+' public QR secrecy, QR-only sessions, feed privacy and profile-first registration checks');
}
