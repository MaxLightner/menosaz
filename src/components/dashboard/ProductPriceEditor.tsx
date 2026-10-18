import React,{useEffect,useRef,useState} from 'react';
import type {Product} from '../../types';
import {useApp} from '../../context/AppContext';

export function ProductPriceEditor({product}:{product:Product}){
 const {updateProductPrice,showToast}=useApp();
 const [draft,setDraft]=useState(String(product.price)),[busy,setBusy]=useState(false);
 const saving=useRef(false),editing=useRef(false);
 useEffect(()=>{if(!editing.current&&!saving.current)setDraft(String(product.price));},[product.id,product.price]);
 async function save(){
  editing.current=false;if(saving.current)return;
  const price=Number(draft);
  if(!draft.trim()||!Number.isSafeInteger(price)||price<0){showToast('قیمت را به تومان و به صورت عدد صحیح صفر یا بیشتر وارد کن.');setDraft(String(product.price));return;}
  if(price===product.price)return;
  saving.current=true;setBusy(true);
  try{await updateProductPrice(product.id,price);}catch(e){showToast((e as Error).message||'قیمت ذخیره نشد');setDraft(String(product.price));}
  finally{saving.current=false;setBusy(false);}
 }
 return <input aria-label={'قیمت '+product.name+' به تومان'} type="number" min="0" step="1" value={draft} disabled={busy} onFocus={()=>{editing.current=true;}} onChange={e=>setDraft(e.target.value)} onBlur={save} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();e.currentTarget.blur();}if(e.key==='Escape'){setDraft(String(product.price));editing.current=false;}}} className="w-28 h-8 text-center font-bold border border-[#DBE2D5] rounded-lg bg-white text-[#29372E] text-xs font-mono shadow-xs"/>;
}
