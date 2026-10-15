import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url),read=p=>readFile(new URL(p,root),'utf8'),literal=s=>"'"+s.replaceAll("'","''")+"'";
const manifest=JSON.parse(await read('review/domains-manifest.json'));
let sql="begin;\nlock table public.menu_workspaces,public.businesses,public.profiles,public.business_memberships in access exclusive mode;\ndo $$ begin\n";
// Compare typed records within the target database: avoids cross-version timestamp/JSON formatting drift.
// Guard all backed-up application rows; presence heartbeats are excluded by the manifest.
for(const t of manifest.tables)sql+=`if (select coalesce(jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text collate "C"),'[]') from public.${t.table} x) is distinct from (select coalesce(jsonb_agg(to_jsonb(x) order by to_jsonb(x)::text collate "C"),'[]') from jsonb_populate_recordset(null::public.${t.table},${literal(JSON.stringify(t.records))}::jsonb) x) then raise exception 'BACKUP_STALE: ${t.table}';end if;\n`;
for(const f of manifest.functions)sql+=`if (select md5(replace(pg_get_functiondef(p.oid),chr(13),'')) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=${literal(f.name)}) is distinct from ${literal(f.hash)} then raise exception 'SCHEMA_CHANGED: ${f.name}';end if;\n`;
sql+="end $$;\nset local menosaz.backup_verified='yes';\n";
for(const n of ['202610150005_points_schedule.sql','202610150006_orders.sql'])sql+=(await read('supabase/migrations/'+n)).replace(/^begin;\s*$/gm,'').replace(/^commit;\s*$/gm,'')+'\n';
sql+="commit;\nselect 'domains-v1-active' result,(select count(*) from public.service_points) points,(select count(*) from public.orders) orders,(select coalesce(sum(total_toman),0) from public.orders) total_toman;";
await writeFile(new URL('review/catalog-release.sql',root),sql);console.log('Guarded QR/session/order release prepared');
