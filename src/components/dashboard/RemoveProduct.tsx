import React,{useState} from 'react';
import {useApp} from '../../context/AppContext';
import {api} from '../../services/backend';
import type {Product} from '../../types';
import {OrderDialog} from '../common/OrderDialog';
export function RemoveProduct({product}:{product:Product}){
 const {refreshWorkspace,showToast}=useApp();const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 return <><button className="manager-delete-product" aria-label={'حذف '+product.name+' از منو'} onClick={()=>{setError('');setOpen(true);}}>حذف</button>{open&&<OrderDialog title="حذف آیتم از منو" onClose={()=>!busy&&setOpen(false)}><p>«{product.name}» از منوی مشتری حذف شود؟ سفارش‌های قبلی حفظ می‌شوند.</p>{error&&<p role="alert">{error}</p>}<button className="staff-primary" disabled={busy} onClick={async()=>{setBusy(true);try{await api('/products/'+product.id,{expectedVersion:product.version},'DELETE');setOpen(false);refreshWorkspace();showToast('آیتم از منو حذف شد');window.dispatchEvent(new CustomEvent('product-archived',{detail:product}));}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}>{busy?'در حال حذف…':'تأیید حذف از منو'}</button><button className="staff-secondary" disabled={busy} onClick={()=>setOpen(false)}>انصراف</button></OrderDialog>}</>;
}
