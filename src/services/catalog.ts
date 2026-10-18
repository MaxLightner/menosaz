import {catalogImagePath} from '../lib/imagePath';
import {api} from './backend';
import type {MenuDefinition} from '../types';

export type CatalogCapabilities={catalogVersion:number;productLimit:number|null;products:number;menuLimit:number};
export type MenuDraft={menuId?:string;name:string;kind:string;categories:{id?:string;name:string;items:{name:string;price:number;description?:string;isAvailable?:boolean;imageUrl?:string;prepTimeMinutes?:number;optionGroups?:unknown[]}[]}[]};
export type PendingCommand={signature:string;requestId:string}|null;
export function commandBody<T extends object>(body:T,pending:{current:PendingCommand}):T&{requestId:string}{
 const signature=JSON.stringify(body);
 if(pending.current?.signature!==signature)pending.current={signature,requestId:crypto.randomUUID()};
 return {...body,requestId:pending.current.requestId};
}
export async function buildMenu(body:MenuDraft,pending:{current:PendingCommand}){
 const result=await api<{menu:MenuDefinition;productsCreated:number}>('/menus/build',commandBody({...body,categories:body.categories.map(c=>({...c,items:c.items.map(p=>({...p,...(p.imageUrl?{imageUrl:catalogImagePath(p.imageUrl)}:{})}))}))},pending));
 pending.current=null;
 window.dispatchEvent(new Event('workspace-auth'));
 return result;
}
