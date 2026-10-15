import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url),read=p=>readFile(new URL(p,root),'utf8');
const m=JSON.parse(await read('review/access-manifest.json')),literal=s=>"'"+s.replaceAll("'","''")+"'";
let sql="begin;\nlock table public.menu_accounts,public.businesses in access exclusive mode;\ndo $$ begin\n";
for(const t of ['menu_accounts','businesses','products'])sql+=`if (select count(*) from public.${t})<>${m.tables[t].count} then raise exception 'BACKUP_STALE';end if;\n`;
for(const a of m.accounts)sql+=`if not exists(select 1 from public.menu_accounts where user_id=${literal(a.uid)} and business_id=${literal(a.bid)} and role=${literal(a.role)}) then raise exception 'ACCOUNT_CHANGED';end if;\n`;
sql+="end $$;\nset local menosaz.backup_verified='yes';\n"+(await read('supabase/migrations/202610150004_access.sql')).replace(/^begin;\s*$/gm,'').replace(/^commit;\s*$/gm,'')+"\ncommit;\nselect 'access-v1-active' result,(select count(*) from public.profiles) accounts,(select count(*) from public.business_memberships) memberships,(select count(*) from public.platform_roles) admins;";
await writeFile(new URL('review/catalog-release.sql',root),sql);
console.log('Guarded access release prepared');
