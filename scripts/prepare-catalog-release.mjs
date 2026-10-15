import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url),read=p=>readFile(new URL(p,root),'utf8');
const manifest=JSON.parse(await read('review/catalog-manifest.json'));
const literal=s=>"'"+s.replaceAll("'","''")+"'";
let sql=`begin;\nlock table public.menu_workspaces in access exclusive mode;\ndo $$ begin\nif (select count(*) from public.menu_workspaces)<>${manifest.workspaces.length} then raise exception 'BACKUP_STALE';end if;\n`;
for(const w of manifest.workspaces)sql+=`if (select md5(payload::text) from public.menu_workspaces where id=${literal(w.id)}) is distinct from ${literal(w.hash)} then raise exception 'BACKUP_STALE';end if;\n`;
for(const f of manifest.functions)sql+=`if (select md5(pg_get_functiondef(p.oid)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=${literal(f.name)}) is distinct from ${literal(f.hash)} then raise exception 'SCHEMA_CHANGED';end if;\n`;
sql+="end $$;\nset local menosaz.backup_verified='yes';\n";
for(const name of ['202610150001_catalog_schema.sql','202610150002_catalog_api.sql','202610150003_catalog_cutover.sql'])sql+=(await read('supabase/migrations/'+name)).replace(/^begin;\s*$/gm,'').replace(/^commit;\s*$/gm,'')+'\n';
sql+="commit;\nselect 'catalog-v1-active' as result, (select count(*) from public.businesses) as businesses, (select count(*) from public.products) as products;\n";
await writeFile(new URL('review/catalog-release.sql',root),sql);
let source=await read('supabase/functions/menu-api/index.ts');
for(const name of ['otpy','billing']){
 const line=source.split('\n').find(l=>l.includes(`from './${name}.ts'`));
 source=source.replace(line,(await read(`supabase/functions/menu-api/${name}.ts`)).replaceAll('export async function','async function'));
}
const image=(await read('src/lib/productImage.ts')).split('export async function readProductImage')[0].replaceAll('export const','const').replaceAll('export function','function');
source=source.replace("import {productImageData} from '../../../src/lib/productImage.ts';",image);
await writeFile(new URL('review/menu-api-deploy.ts',root),source);
console.log('Private guarded SQL release and Edge bundle prepared');
