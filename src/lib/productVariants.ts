import type {Product,OptionGroup,ProductOption,OrderItemOption} from '../types';
// A required single-choice group is the product's size/flavour selector.
export const variantGroup=(p:Pick<Product,'optionGroups'>)=>p.optionGroups?.find(g=>g.required&&g.options.length>0);
export function variantChoice(group:OptionGroup,option:ProductOption):OrderItemOption{
 return {groupId:group.id,optionId:option.id,groupTitle:group.title,optionName:option.name,extraPrice:option.extraPrice};
}
export function productMinimumPrice(p:Product){const g=variantGroup(p);return p.price+(g?Math.min(...g.options.map(o=>o.extraPrice)):0);}
export type VariantDraft={id:string;name:string;price:string};
export function buildVariants(rows:VariantDraft[],basePrice:number,title:string,id?:string):OptionGroup|undefined{
 if(!rows.length)return undefined;
 if(!title.trim()||title.trim().length>80)throw Error('عنوان مدل را وارد کن (حداکثر ۸۰ حرف).');
 if(rows.length>50)throw Error('حداکثر ۵۰ مدل برای هر محصول مجاز است.');
 const names=new Set<string>();
 const options=rows.map(row=>{const name=row.name.trim(),price=Number(row.price);if(!name||name.length>80||names.has(name))throw Error('نام هر مدل باید مشخص و غیرتکراری باشد.');if(!row.price.trim()||!Number.isSafeInteger(price)||price<basePrice)throw Error('قیمت هر مدل باید عدد صحیح و حداقل برابر قیمت پایه باشد.');names.add(name);return {id:row.id,name,extraPrice:price-basePrice};});
 return {id:id||'variant-'+crypto.randomUUID(),title:title.trim(),required:true,options};
}
