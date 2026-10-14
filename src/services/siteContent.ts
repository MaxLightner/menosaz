import {SAMPLES} from './menuPresentation';

export type SiteTemplate={id:string;name:string;type:string;text:string;image:string;visible:boolean};
export type SiteContent={heroDish:string;heroDrink:string;heroCoffee:string;templates:SiteTemplate[]};

export const DEFAULT_SITE_CONTENT:SiteContent={
  heroDish:'/media/iran-0.webp',heroDrink:'/menu-assets/orange-juice.webp',heroCoffee:'/menu-assets/cappuccino.webp',
  templates:SAMPLES.map(s=>({id:s.id,name:s.name,type:s.type,text:s.subline,image:s.image,visible:true}))
};

export function normalizeSiteContent(value:unknown):SiteContent{
  const source=(value&&typeof value==='object'?value:{}) as Partial<SiteContent>;
  const templates=Array.isArray(source.templates)?source.templates.map((x:any)=>({
    id:String(x.id||''),name:String(x.name||''),type:String(x.type||''),text:String(x.text||''),image:String(x.image||''),visible:x.visible!==false
  })).filter(x=>SAMPLES.some(s=>s.id===x.id)):DEFAULT_SITE_CONTENT.templates;
  return {heroDish:source.heroDish||DEFAULT_SITE_CONTENT.heroDish,heroDrink:source.heroDrink||DEFAULT_SITE_CONTENT.heroDrink,heroCoffee:source.heroCoffee||DEFAULT_SITE_CONTENT.heroCoffee,templates};
}
