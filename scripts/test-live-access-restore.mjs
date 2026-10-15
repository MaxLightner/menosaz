// Receives decrypted private backup through stdin; prints counts only.
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile,readdir,writeFile} from 'node:fs/promises';
process.on('uncaughtException',e=>{console.error(JSON.stringify({message:e.message,code:e.code}));process.exit(1);});
let input='';for await(const c of process.stdin)input+=c;const backup=JSON.parse(input);input='';
assert.equal(backup.format,'menosaz-before-access-v1');
const db=new PGlite(),root=new URL('../',import.meta.url);
await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,phone text,email text,phone_confirmed_at timestamptz);create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`);
for(const n of (await readdir(new URL('supabase/migrations/',root))).filter(n=>n<'202610150004').sort()){
 if(n==='202610150003_catalog_cutover.sql')await db.exec("set menosaz.backup_verified='yes'");
 await db.exec(await readFile(new URL('supabase/migrations/'+n,root),'utf8'));
}
for(const u of backup.users)await db.query('insert into auth.users values($1,$2,$3,$4)',[u.id,u.phone,u.email,u.phone_confirmed_at]);
await db.exec('alter table menu_workspaces disable trigger catalog_workspace_import');
await db.exec('delete from product_options;delete from product_option_groups;delete from product_media;delete from menu_appearance;delete from products;delete from categories;delete from menus;delete from media_assets;delete from catalog_commands;delete from catalog_migrations;delete from businesses;delete from menu_workspaces');
const tables=['menu_workspaces','businesses','menu_accounts','menus','categories','products','product_option_groups','product_options','media_assets','product_media','menu_appearance','catalog_commands','catalog_migrations','menu_subscriptions','menu_payments','menu_messages','menu_presence'];
for(const t of tables)if(backup.tables[t]?.length)await db.query(`insert into ${t} select * from jsonb_populate_recordset(null::${t},$1::jsonb)`,[JSON.stringify(backup.tables[t])]);
await db.exec('alter table menu_workspaces enable trigger catalog_workspace_import');
for(const f of backup.functions)await db.exec(f.ddl);
await db.exec(await readFile(new URL('supabase/migrations/202610150004_access.sql',root),'utf8'));
for(const a of backup.tables.menu_accounts){
 const account=(await db.query("select menu_api_v2('/account','GET','{}',$1) r",[a.user_id])).rows[0].r;assert.equal(account.status,200);assert.equal(account.data.account.businessId,a.business_id);assert.equal(account.data.account.role,a.role);
 const ws=(await db.query("select menu_api_v2('/workspace','GET','{}',$1) r",[a.user_id])).rows[0].r;assert.equal(ws.status,200);assert.equal(ws.data.business.id,a.business_id);
}
assert.equal((await db.query('select count(*)::int n from profiles')).rows[0].n,backup.tables.menu_accounts.length);
assert.equal((await db.query('select count(*)::int n from products')).rows[0].n,backup.tables.products.length);
if(process.env.WRITE_PRIVATE_MANIFEST==='yes'){
 const manifest=(await db.query("select 'ready' result")).rows;
 const pre={tables:Object.fromEntries(tables.map(t=>[t,{count:backup.tables[t]?.length||0}])),accounts:backup.tables.menu_accounts.map(a=>({uid:a.user_id,bid:a.business_id,role:a.role}))};
 await writeFile(new URL('review/access-manifest.json',root),JSON.stringify(pre));
}
console.log(JSON.stringify({restorePassed:true,accounts:backup.tables.menu_accounts.length,businesses:backup.tables.businesses.length,products:backup.tables.products.length,adminUIDPreserved:true}));await db.close();
