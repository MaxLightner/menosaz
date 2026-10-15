// Private backup enters via stdin. Never log rows, hashes of guest tokens or Auth fields.
import assert from 'node:assert/strict';import {PGlite} from '@electric-sql/pglite';import {readFile,readdir,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
process.on('uncaughtException',e=>{console.error(JSON.stringify({message:e.message,code:e.code}));process.exit(1);});
process.stdin.setEncoding('utf8');
let input='';for await(const c of process.stdin)input+=c;const backup=JSON.parse(input);input='';assert.equal(backup.format,'menosaz-before-domains-v1');
const db=new PGlite(),root=new URL('../',import.meta.url);
await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,phone text,email text,phone_confirmed_at timestamptz);create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`);
for(const name of (await readdir(new URL('supabase/migrations/',root))).filter(n=>n<'202610150004').sort()){
 if(name==='202610150003_catalog_cutover.sql')await db.exec("set menosaz.backup_verified='yes'");await db.exec(await readFile(new URL('supabase/migrations/'+name,root),'utf8'));
}
await db.exec('delete from product_options;delete from product_option_groups;delete from product_media;delete from menu_appearance;delete from products;delete from categories;delete from menus;delete from media_assets;delete from catalog_commands;delete from catalog_migrations;delete from businesses;delete from menu_workspaces');
await db.exec(await readFile(new URL('supabase/migrations/202610150004_access.sql',root),'utf8'));
for(const u of backup.users)await db.query('insert into auth.users values($1,$2,$3,$4)',[u.id,u.phone,u.email,u.phone_confirmed_at]);
await db.exec('alter table menu_workspaces disable trigger catalog_workspace_import');
const tables=['menu_workspaces','businesses','profiles','platform_roles','business_memberships','terms_acceptances','access_events','menus','categories','products','product_option_groups','product_options','media_assets','product_media','menu_appearance','catalog_commands','catalog_migrations','menu_subscriptions','menu_payments','menu_messages','menu_presence'];
for(const t of tables)if(backup.tables[t]?.length)await db.query(`insert into ${t} select * from jsonb_populate_recordset(null::${t},$1::jsonb)`,[JSON.stringify(backup.tables[t])]);
await db.exec('alter table menu_workspaces enable trigger catalog_workspace_import');
for(const f of backup.functions)await db.exec(f.ddl);
const guarded=tables.filter(t=>t!=='menu_presence'),manifest=[];
for(const t of guarded)manifest.push({table:t,...(await db.query(`select count(*)::int count,md5(coalesce(jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text),'[]')::text) hash from ${t} x`)).rows[0]});
if(process.env.WRITE_PRIVATE_MANIFEST==='yes')await writeFile(new URL('review/domains-manifest.json',root),JSON.stringify({tables:manifest.map(t=>({...t,records:backup.tables[t.table]})),functions:backup.functions.map(f=>({name:f.name,hash:createHash('md5').update(f.ddl.split(String.fromCharCode(13)).join('')).digest('hex')}))}));
const oldOrders=backup.tables.menu_workspaces.flatMap(w=>(w.payload.orders||[]).map(o=>({bid:w.id,...o}))),oldCalls=backup.tables.menu_workspaces.reduce((n,w)=>n+(w.payload.serviceCalls||[]).length,0),oldPoints=backup.tables.menu_workspaces.reduce((n,w)=>n+(w.payload.servicePoints||[]).length,0);
for(const n of ['202610150005_points_schedule.sql','202610150006_orders.sql','202610150007_flow_guards.sql'])await db.exec(await readFile(new URL('supabase/migrations/'+n,root),'utf8'));
for(const o of oldOrders){
 const value=(await db.query('select order_dto($1,$2) r',[o.bid,o.id])).rows[0].r;
 assert.equal(value.totalAmount,o.totalAmount);assert.equal(value.status,o.status);assert.equal(value.paymentStatus,o.paymentStatus);assert.equal(value.customerNotes,o.customerNotes);assert.equal(value.items.length,o.items.length);
 for(let i=0;i<o.items.length;i++){for(const field of ['id','productId','productName','unitPriceSnapshot','quantity','itemTotal'])assert.equal(value.items[i][field],o.items[i][field]);}
}
assert.equal((await db.query('select count(*)::int n from orders')).rows[0].n,oldOrders.length);assert.equal((await db.query('select count(*)::int n from service_points')).rows[0].n,oldPoints);assert.equal((await db.query('select count(*)::int n from service_requests')).rows[0].n,oldCalls);
for(const a of backup.tables.menu_accounts){const ws=(await db.query("select menu_api_v2('/workspace','GET','{}',$1) r",[a.user_id])).rows[0].r;assert.equal(ws.status,200);assert.equal(ws.data.business.id,a.business_id);}
console.log(JSON.stringify({restorePassed:true,accounts:backup.tables.profiles.length,products:backup.tables.products.length,points:oldPoints,orders:oldOrders.length,calls:oldCalls,amountsAndSnapshotsMatch:true}));await db.close();
