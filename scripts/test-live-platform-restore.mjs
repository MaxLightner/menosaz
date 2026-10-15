// Receives the private, locally decrypted backup over stdin. Never prints records.
import assert from 'node:assert/strict';import {PGlite} from '@electric-sql/pglite';import {readFile,readdir,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
process.on('uncaughtException',e=>{console.error(JSON.stringify({message:e.message,code:e.code}));process.exit(1);});
process.stdin.setEncoding('utf8');let text='';for await(const c of process.stdin)text+=c;const backup=JSON.parse(text);text='';assert.equal(backup.format,'menosaz-before-platform-v1');
const root=new URL('../',import.meta.url),db=new PGlite();await db.exec("create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,phone text,email text,phone_confirmed_at timestamptz);create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);");
await db.exec("set menosaz.backup_verified='yes'");
for(const name of (await readdir(new URL('supabase/migrations/',root))).filter(n=>n<'202610150008').sort()){
 if(name==='202610150004_access.sql')await db.exec('truncate businesses,menu_workspaces cascade');
 await db.exec(await readFile(new URL('supabase/migrations/'+name,root),'utf8'));
}
const tables=['menu_workspaces','businesses','profiles','platform_roles','business_memberships','terms_acceptances','access_events','menus','categories','products','product_option_groups','product_options','media_assets','product_media','menu_appearance','catalog_commands','catalog_migrations','menu_subscriptions','menu_payments','menu_messages','menu_presence','service_points','qr_links','service_point_menus','menu_time_windows','service_sessions','session_guests','business_order_counters','orders','order_items','order_item_options','order_events','order_payment_entries','order_commands','service_requests','session_notices'];
await db.exec('truncate '+tables.map(t=>'public.'+t).join(',')+',auth.users restart identity cascade');
await db.exec('alter table menu_workspaces disable trigger user');
for(const u of backup.users)await db.query('insert into auth.users values($1,$2,$3,$4)',[u.id,u.phone,u.email,u.phone_confirmed_at]);
for(const t of tables)if(backup.tables[t]?.length)await db.query(`insert into ${t} overriding system value select * from jsonb_populate_recordset(null::${t},$1::jsonb)`,[JSON.stringify(backup.tables[t])]);
await db.exec('alter table menu_workspaces enable trigger user');
for(const f of backup.functions)await db.exec(f.ddl);
if(process.env.WRITE_PRIVATE_MANIFEST==='yes')await writeFile(new URL('review/platform-manifest.json',root),JSON.stringify({tables:tables.filter(t=>t!=='menu_presence').map(t=>({table:t,records:backup.tables[t]})),functions:backup.functions.map(f=>({name:f.name,hash:createHash('md5').update(f.ddl.split(String.fromCharCode(13)).join('')).digest('hex')}))}));
for(const name of ['202610150008_platform.sql','202610150009_runtime_cleanup.sql'])await db.exec(await readFile(new URL('supabase/migrations/'+name,root),'utf8'));
for(const [old,current]of [['menu_payments','platform_payments'],['menu_subscriptions','business_subscriptions'],['menu_messages','business_messages'],['orders','orders'],['products','products'],['service_points','service_points'],['profiles','profiles']])assert.equal((await db.query('select count(*)::int n from '+current)).rows[0].n,backup.tables[old].length);
for(const p of backup.tables.menu_payments){const value=(await db.query('select * from platform_payments where id=$1',[p.id])).rows[0];for(const k of ['status','ref_id','authority','user_id','business_id'])assert.equal(value[k],p[k]);assert.equal(value.gateway_amount_rial,p.amount);assert.equal(Number(value.amount_toman)*10,p.amount);}
for(const p of backup.tables.menu_subscriptions){const value=(await db.query('select * from business_subscriptions where business_id=$1',[p.business_id])).rows[0];assert.equal(value.plan,p.plan);assert.equal(new Date(value.expires_at).getTime(),new Date(p.expires_at).getTime());}
for(const a of backup.tables.profiles){const r=(await db.query("select menu_api_v2('/workspace','GET','{}',$1) r",[a.user_id])).rows[0].r;assert.equal(r.status,200);assert.equal(r.data.business.id,a.active_business_id);}
console.log(JSON.stringify({restorePassed:true,businesses:backup.tables.businesses.length,products:backup.tables.products.length,points:backup.tables.service_points.length,orders:backup.tables.orders.length,payments:backup.tables.menu_payments.length,subscriptions:backup.tables.menu_subscriptions.length,identitiesAndMoneyPreserved:true}));await db.close();
