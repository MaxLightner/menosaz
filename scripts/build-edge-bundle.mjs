import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url),read=p=>readFile(new URL(p,root),'utf8');
let source=await read('supabase/functions/menu-api/index.ts');
for(const name of ['otpy','billing']){
 const line=source.split('\n').find(l=>l.includes(`from './${name}.ts'`));
 source=source.replace(line,(await read(`supabase/functions/menu-api/${name}.ts`)).replaceAll('export async function','async function'));
}
const image=(await read('src/lib/productImage.ts')).split('export async function readProductImage')[0].replaceAll('export const','const').replaceAll('export function','function');
source=source.replace("import {productImageData} from '../../../src/lib/productImage.ts';",image);
await writeFile(new URL('review/menu-api-deploy.ts',root),source);
console.log('Edge bundle ready');
