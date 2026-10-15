import React,{useState} from 'react';
import {api} from '../../services/backend';
import {useApp} from '../../context/AppContext';

export function MenuCategories(){
 const {categories,activeMenuId,showToast}=useApp();
 const [name,setName]=useState(''),[editing,setEditing]=useState<string|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function save(e:React.FormEvent){e.preventDefault();if(busy||!name.trim())return;setBusy(true);setError('');try{
  await api(editing?'/categories/'+editing:'/categories',{menuId:activeMenuId,name:name.trim()},editing?'PATCH':'POST');
  setName('');setEditing(null);window.dispatchEvent(new Event('workspace-auth'));showToast('دسته‌بندی ذخیره شد');
 }catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <details className="manager-categories"><summary>دسته‌بندی‌های همین منو ({categories.length})</summary>
  <div>{categories.map(c=><button type="button" key={c.id} disabled={busy} onClick={()=>{setEditing(c.id);setName(c.name);setError('');}}>{c.name} · ویرایش</button>)}</div>
  <form onSubmit={save}><label>{editing?'نام تازه دسته':'دسته جدید'}<input aria-label="نام دسته‌بندی" value={name} maxLength={80} onChange={e=>setName(e.target.value)}/></label>
   <button disabled={busy||!name.trim()}>{busy?'در حال ذخیره…':editing?'ذخیره نام':'افزودن دسته'}</button>
   {editing&&<button type="button" disabled={busy} onClick={()=>{setEditing(null);setName('');}}>انصراف</button>}
  </form>{error&&<p role="alert">{error}</p>}
 </details>;
}
