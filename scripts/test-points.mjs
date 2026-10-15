import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
export async function runPointTests(db,users){
 await db.exec(await readFile(new URL('../supabase/migrations/202610150005_points_schedule.sql',import.meta.url),'utf8'));
 const call=async(path,method='GET',body={},uid=users[0])=>(await db.query('select menu_api_v2($1,$2,$3,$4) r',[path,method,body,uid])).rows[0].r;
 const ok=async(...args)=>{const r=await call(...args);assert.equal(r.status,200,JSON.stringify(r));return r.data;};
 let checks=0;const check=()=>checks++;
 const workspace=await ok('/workspace');assert.equal(workspace.servicePoints.length,1);const point=workspace.servicePoints[0];assert.match(point.qrToken,/^[a-f0-9]{32}$/);assert.ok(!point.qrCodeUrl.includes('menu='));check();
 const original=await ok('/public/resolve','GET',{q:point.qrToken},null);assert.equal(original.business.id,'pich-shemroon');assert.equal(original.servicePoint.tableNumber,1);check();
 assert.equal((await call('/public/resolve','GET',{q:'bad'},null)).status,404);check();
 const main=await ok('/public/resolve','GET',{business:'pich-shemroon',table:1,menu:'nonexistent'},null);assert.ok(main.activeMenuId);check();
 const ids=workspace.menus.map(m=>m.id);await ok('/service-points/'+point.id,'PATCH',{menuMode:'selected',menuIds:[ids[1]]});
 const scoped=await ok('/public/resolve','GET',{q:point.qrToken,tab:ids[0]},null);assert.equal(scoped.menus.length,1);assert.equal(scoped.activeMenuId,ids[1]);check();
 assert.equal((await call('/service-points/'+point.id,'PATCH',{menuMode:'selected',menuIds:['foreign-menu']})).status,400);check();
 assert.equal((await ok('/workspace')).servicePoints[0].qrToken,point.qrToken);check();
 const timed=ids[1];await ok('/menus/'+timed+'/schedule','POST',{mode:'scheduled',windows:[{weekday:5,startMinute:22*60,endMinute:2*60,endDayOffset:1}]});
 const open=async at=>(await db.query('select point_menu_open($1,$2,$3) r',['pich-shemroon',timed,at])).rows[0].r;
 assert.equal(await open('2026-10-16T22:00:00+03:30'),true);assert.equal(await open('2026-10-17T01:59:00+03:30'),true);assert.equal(await open('2026-10-17T02:00:00+03:30'),false);assert.equal(await open('2026-10-16T21:59:00+03:30'),false);check();
 assert.equal((await call('/menus/'+timed+'/schedule','POST',{mode:'scheduled',windows:[]})).status,400);check();
 const menu=(await ok('/workspace')).menus.find(m=>m.id===timed);assert.equal(menu.scheduleMode,'scheduled');assert.equal(menu.windows.length,1);check();
 await ok('/menus/'+timed+'/schedule','POST',{mode:'always'});check();
 assert.equal((await call('/tables/1','PATCH',{menuMode:'all'},'00000000-0000-4000-a000-000000000005')).status,403);check();
 assert.equal((await db.query("select count(*)::int n from menu_workspaces where payload ? 'servicePoints'")).rows[0].n,0);check();
 assert.equal((await db.query("select has_table_privilege('anon','qr_links','select')::int n")).rows[0].n,0);check();
 await ok('/service-points/'+point.id,'PATCH',{menuMode:'all'});
 console.log(`PASS: ${checks} QR/point mapping/schedule/legacy-link checks`);
 return {point};
}
