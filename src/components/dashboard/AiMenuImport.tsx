import React,{useState} from 'react';
import {api} from '../../services/backend';
import './AiMenuImport.css';
type Opt={name:string;price:string};
type Item={name:string;description:string;price:string;needsReview:boolean;variants:Opt[]};
type Group={name:string;items:Item[]};
type Extract={categories:{name:string;items:{name:string;description:string;priceToman:number|null;needsReview:boolean;variants:{name:string;priceToman:number|null}[]}[]}[]};
const roman=(v:string)=>v.replace(/[۰-۹]/g,c=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c)));
function amount(v:string){const s=roman(v).replace(/[,٬،\s]/g,'');if(!/^\d+$/.test(s)||!Number.isSafeInteger(Number(s))||Number(s)>1000000000)throw Error('قیمت‌ها را با عدد معتبر به تومان تکمیل کن.');return Number(s);}
async function compress(file:File){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>12*1024*1024)throw Error('فرمت عکس یا حجم آن معتبر نیست.');
 const image=await createImageBitmap(file);
 try{
  const canvas=document.createElement('canvas'),ratio=Math.min(1,2200/Math.max(image.width,image.height));
  canvas.width=Math.round(image.width*ratio);canvas.height=Math.round(image.height*ratio);
  const ctx=canvas.getContext('2d');if(!ctx||!canvas.width||!canvas.height)throw Error('ابعاد عکس معتبر نیست.');
  ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
  for(const q of [.85,.75,.65,.55]){const data=canvas.toDataURL('image/jpeg',q);if(data.length<880000)return data;}
  throw Error('عکس خیلی سنگین است؛ آن را به بخش‌های کوچک‌تر تقسیم کن.');
 }finally{image.close();}
}
export function AiMenuImport({menuId,menuName,productLimit,onCancel,onSuccess}:{menuId:string;menuName:string;productLimit:number|null;onCancel:()=>void;onSuccess:()=>void}){
 const [files,setFiles]=useState<File[]>([]),[groups,setGroups]=useState<Group[]>([]),[name,setName]=useState(menuName||'منوی اصلی'),[review,setReview]=useState(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[requestId]=useState(()=>crypto.randomUUID());
 const count=groups.reduce((a,g)=>a+g.items.length,0);
 const update=(ci:number,pi:number,changes:Partial<Item>)=>setGroups(xs=>xs.map((g,i)=>i!==ci?g:{...g,items:g.items.map((p,j)=>j===pi?{...p,...changes}:p)}));
 async function analyze(){
  setBusy(true);setError('');
  try{
   if(files.length<1||files.length>4)throw Error('بین یک تا چهار عکس انتخاب کن.');
   const images=await Promise.all(files.map(compress));
   const result=await api<Extract>('/ai/menu/analyze',{images});
   if(!result.categories?.length)throw Error('آیتمی از عکس‌ها خوانده نشد.');
   setGroups(result.categories.map(g=>({name:g.name,items:g.items.map(p=>({name:p.name,description:p.description||'',price:p.priceToman===null?'':String(p.priceToman),needsReview:p.needsReview,variants:p.variants.map(v=>({name:v.name,price:v.priceToman===null?'':String(v.priceToman)}))}))})));
   setReview(true);
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 async function save(){
  setBusy(true);setError('');
  try{
   if(menuId!=='main'||!name.trim()||!count||count>200||groups.length>30||(productLimit!==null&&count>productLimit))throw Error('نام یا تعداد آیتم‌ها معتبر نیست یا سقف اشتراک پر شده است.');
   const categories=groups.map(g=>({name:g.name.trim(),items:g.items.map(p=>{
    if(!g.name.trim()||!p.name.trim())throw Error('نام دسته و تمام محصولات را تکمیل کن.');
    const base=amount(p.price),variants=p.variants.map(v=>{if(!v.name.trim())throw Error('نام گزینه خالی است.');return {name:v.name.trim(),price:amount(v.price)};});
    const price=variants.length?Math.min(base,...variants.map(v=>v.price)):base;
    return {name:p.name.trim(),description:p.description.trim(),price,isAvailable:price>0,prepTimeMinutes:15,...(variants.length?{optionGroups:[{title:'انتخاب نوع',required:true,options:variants.map(v=>({name:v.name,extraPrice:v.price-price}))}]}:{})};
   })}));
   if(new Set(categories.map(c=>c.name.toLocaleLowerCase('fa'))).size!==categories.length)throw Error('نام دسته‌ها تکراری است.');
   const saved=await api<{productsCreated:number}>('/ai/menu/commit',{menuId,name:name.trim(),requestId,categories});
   if(saved.productsCreated!==count)throw Error('تعداد محصولات ذخیره‌شده یکسان نیست؛ منو را بررسی کن.');
   window.dispatchEvent(new Event('workspace-auth'));onSuccess();
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 return <section className="ai-menu">
  <span className="wizard-kicker">ساخت منو از روی عکس · ویژه راه‌اندازی اولیه</span>
  <h1 id="menu-wizard-title">منوی کاغذی را به دیجیتال تبدیل کن</h1>
  {!review?<><p>یک تا چهار عکس واضح انتخاب کن. غذاها و قیمت‌ها قبل از ذخیره قابل ویرایش‌اند؛ تا تأیید نهایی هیچ اطلاعاتی تغییر نمی‌کند.</p>
   <label className="ai-upload">عکس‌های منو<input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={busy} onChange={e=>{setFiles(Array.from(e.target.files||[]));setError('');}}/></label>
   <p>{files.length} عکس انتخاب شده</p>
   <div className="wizard-actions"><button className="wizard-primary" disabled={busy||!files.length||files.length>4} onClick={analyze}>{busy?'در حال تحلیل تصاویر…':'تحلیل عکس‌ها'}</button><button className="wizard-secondary" disabled={busy} onClick={onCancel}>بازگشت</button></div>
  </>:<>
   <p>نام غذاها، قیمت‌ها و انواع هر محصول را بررسی کن. قیمت‌های نامشخص خالی هستند و باید دستی وارد شوند.</p>
   <label className="wizard-field">نام منو<input value={name} maxLength={60} onChange={e=>setName(e.target.value)}/></label>
   <strong className="ai-count">{groups.length} دسته · {count} آیتم {productLimit!==null?'· سقف '+productLimit+' آیتم':''}</strong>
   <div className="ai-groups">{groups.map((g,ci)=><section className="ai-group" key={ci}>
    <label className="ai-label">نام دسته<input value={g.name} maxLength={60} onChange={e=>setGroups(xs=>xs.map((a,i)=>i===ci?{...a,name:e.target.value}:a))}/></label>
    {g.items.map((p,pi)=><article className="ai-item" key={pi}>
     <div className="ai-head"><label className="ai-label">نام غذا<input value={p.name} maxLength={100} onChange={e=>update(ci,pi,{name:e.target.value})}/></label><button className="ai-remove" onClick={()=>setGroups(xs=>xs.map((a,i)=>i===ci?{...a,items:a.items.filter((_,j)=>j!==pi)}:a).filter(a=>a.items.length))}>حذف</button></div>
     <label className="ai-label">قیمت پایه (تومان)<input inputMode="numeric" value={p.price} className={!p.price?'ai-needs-review':''} onChange={e=>update(ci,pi,{price:e.target.value})}/></label>
     <label className="ai-label">توضیح / مواد اصلی<input maxLength={1000} value={p.description} onChange={e=>update(ci,pi,{description:e.target.value})}/></label>
     {p.needsReview&&<small className="ai-warning">مقدار استخراج‌شده را بررسی کن.</small>}
     {p.variants.length>0&&<div className="ai-options"><b>اندازه یا طعم (قیمت کامل به تومان)</b>{p.variants.map((v,vi)=><div className="ai-option" key={vi}><input aria-label="نام گزینه" value={v.name} maxLength={80} onChange={e=>update(ci,pi,{variants:p.variants.map((a,j)=>vi===j?{...a,name:e.target.value}:a)})}/><input aria-label="قیمت گزینه" inputMode="numeric" value={v.price} className={!v.price?'ai-needs-review':''} onChange={e=>update(ci,pi,{variants:p.variants.map((a,j)=>vi===j?{...a,price:e.target.value}:a)})}/></div>)}</div>}
    </article>)}
   </section>)}</div>
   <div className="wizard-actions"><button className="wizard-primary" disabled={busy||!count} onClick={save}>{busy?'در حال ذخیره…':'تأیید و ذخیره منو'}</button><button className="wizard-secondary" disabled={busy} onClick={()=>setReview(false)}>بازگشت به عکس‌ها</button></div>
  </>}
  {error&&<p role="alert" className="wizard-error">{error}</p>}
 </section>;
}
