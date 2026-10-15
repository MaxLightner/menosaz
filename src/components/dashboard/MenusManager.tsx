import React,{useState} from 'react';
import {useApp} from '../../context/AppContext';
import {OrderDialog} from '../common/OrderDialog';
import {usePresentation} from '../../context/PresentationContext';
import {MenuCategories} from './MenuCategories';

export function MenusManager(){
  const {menus,activeMenuId,setActiveMenuId,createMenu}=useApp(),{openSample}=usePresentation();
  const [open,setOpen]=useState(false),[name,setName]=useState(''),[kind,setKind]=useState('restaurant'),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function add(){setBusy(true);setError('');try{await createMenu(name,kind);setOpen(false);setName('');}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <section className="manager-menu-picker"><label>منوی در حال ویرایش<select aria-label="انتخاب منوی مجموعه" value={activeMenuId} onChange={e=>setActiveMenuId(e.target.value)}>{menus.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label><div className="manager-menu-actions"><button onClick={()=>{setError('');setOpen(true);}}>＋ ساخت منوی جدید</button><button onClick={()=>openSample(null)}>مشاهده همین منو ↗</button></div><p>هر منو دسته‌بندی، آیتم و ظاهر مستقل دارد.</p>{open&&<OrderDialog title="ساخت منوی جدید" onClose={()=>!busy&&setOpen(false)}><form className="phone-login" onSubmit={e=>{e.preventDefault();add();}}><label>نام منو<input aria-label="نام منوی جدید" value={name} maxLength={60} onChange={e=>setName(e.target.value)} placeholder="مثلاً کافی‌شاپ مجموعه" autoFocus/></label><label>نوع منو<select value={kind} onChange={e=>setKind(e.target.value)}><option value="restaurant">رستوران</option><option value="cafe">کافه</option><option value="juice">آبمیوه و بستنی</option><option value="hotel">هتل و روم‌سرویس</option><option value="wholesaler">عمده‌فروش</option></select></label>{error&&<p role="alert" className="login-error">{error}</p>}<button className="staff-primary" disabled={busy||!name.trim()}>{busy?'در حال ساخت…':'ساخت و رفتن به منوی جدید'}</button></form></OrderDialog>}<MenuCategories key={activeMenuId}/></section>;
}
