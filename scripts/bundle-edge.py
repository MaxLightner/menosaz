from pathlib import Path
root=Path(__file__).resolve().parent.parent
s=(root/'supabase/functions/menu-api/index.ts').read_text(encoding='utf-8')
for name in ['otpy','billing']:
    import_line=next(x for x in s.splitlines() if "from './"+name+".ts'" in x)
    module=(root/f'supabase/functions/menu-api/{name}.ts').read_text(encoding='utf-8').replace('export async function','async function')
    s=s.replace(import_line,module)
module=(root/'src/lib/productImage.ts').read_text(encoding='utf-8').split('export async function readProductImage')[0].replace('export const','const').replace('export function','function')
s=s.replace("import {productImageData} from '../../../src/lib/productImage.ts';",module)
(root/'review').mkdir(exist_ok=True)
(root/'review/menu-api-deploy.ts').write_text(s,encoding='utf-8')
print('Edge bundle prepared')
