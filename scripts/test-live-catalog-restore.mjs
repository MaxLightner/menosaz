// Receive the private backup on stdin. Never log rows, Auth fields, tokens, or source SQL.
import assert from 'node:assert/strict';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
process.on('uncaughtException',e=>{console.error(JSON.stringify({message:e.message,code:e.code}));process.exit(1);});
let input='';for await(const chunk of process.stdin)input+=chunk;
const backup=JSON.parse(input);input='';assert.equal(backup.format,'menosaz-before-catalog-v1');
const {PGlite}=await import(pathToFileURL(process.env.PGLITE_MODULE));const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
create table auth.users(id uuid primary key,phone text,email text,phone_confirmed_at timestamptz);
create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`);
const root=new URL('../',import.meta.url);
for(const name of (await readdir(new URL('supabase/migrations/',root))).filter(n=>n.startsWith('20261013')||n.startsWith('20261014')).sort())await db.exec(await readFile(new URL('supabase/migrations/'+name,root),'utf8'));
const local=(await db.query("select proname,prosrc from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and proname like 'menu_%'")).rows;
for(const fn of backup.functions)await db.exec(fn.ddl);
const remote=(await db.query("select proname,prosrc from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and proname like 'menu_%'")).rows;
const normalize=s=>s.replace(/\s+/g,' ').trim();
const drift=remote.filter(r=>normalize(r.prosrc)!==normalize(local.find(l=>l.proname===r.proname)?.prosrc||'')).map(r=>r.proname);
console.log(JSON.stringify({functionDrift:drift}));
for(const u of backup.users||[])await db.query('insert into auth.users values($1,$2,$3,$4)',[u.id,u.phone,u.email,u.phone_confirmed_at]);
await db.exec('delete from menu_workspaces');
for(const [key,table] of [['workspaces','menu_workspaces'],['accounts','menu_accounts'],['subscriptions','menu_subscriptions'],['payments','menu_payments'],['messages','menu_messages']]){
 if(backup[key]?.length)await db.query(`insert into ${table} select * from jsonb_populate_recordset(null::${table},$1::jsonb)`,[JSON.stringify(backup[key])]);
}
const oldCounts=backup.workspaces.map(w=>({id:w.id,menus:w.payload.menus.length,products:w.payload.products.length,total:w.payload.products.reduce((n,p)=>n+p.price,0),orders:w.payload.orders.length,orderTotal:w.payload.orders.reduce((n,o)=>n+o.totalAmount,0)}));
const manifest=(await db.query('select id,md5(payload::text) as hash from menu_workspaces order by id')).rows;
if(process.env.WRITE_PRIVATE_MANIFEST==='yes')await writeFile(new URL('review/catalog-manifest.json',root),JSON.stringify({workspaces:manifest,functions:backup.functions.map(f=>({name:f.name,hash:createHash('md5').update(f.ddl).digest('hex')})),openOrders:backup.workspaces.reduce((n,w)=>n+w.payload.orders.filter(o=>!['delivered','cancelled'].includes(o.status)).length,0)}));
for(const name of ['202610150001_catalog_schema.sql','202610150002_catalog_api.sql'])await db.exec(await readFile(new URL('supabase/migrations/'+name,root),'utf8'));
await db.exec("set menosaz.backup_verified='yes'");await db.exec(await readFile(new URL('supabase/migrations/202610150003_catalog_cutover.sql',root),'utf8'));
for(const expected of oldCounts){
 const s=(await db.query('select catalog_workspace_snapshot($1) as data',[expected.id])).rows[0].data;
 assert.equal(s.menus.length,expected.menus);assert.equal(s.products.length,expected.products);
 assert.equal(s.products.reduce((n,p)=>n+p.price,0),expected.total);
 assert.equal(s.orders.length,expected.orders);assert.equal(s.orders.reduce((n,o)=>n+o.totalAmount,0),expected.orderTotal);
}
const remaining=(await db.query("select count(*)::int as n from menu_workspaces where payload ? 'products' or payload ? 'menus' or payload ? 'business'")).rows[0].n;assert.equal(remaining,0);
// Existing users still get their own catalog after the real SQL function restore.
for(const a of backup.accounts){const r=(await db.query("select menu_api_v2('/workspace','GET','{}',$1) as r",[a.user_id])).rows[0].r;assert.equal(r.status,200);assert.equal(r.data.business.id,a.business_id);}
console.log(JSON.stringify({restored:true,businesses:oldCounts.length,users:backup.users.length,products:oldCounts.reduce((n,w)=>n+w.products,0),orders:oldCounts.reduce((n,w)=>n+w.orders,0),allCountsAndAmountsMatch:true,sourceFunctionDrift:drift}));
await db.close();
if(drift.length)process.exitCode=2;
