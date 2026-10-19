import {MenuSchedule} from './MenuSchedule';
import React,{useEffect,useRef,useState} from 'react';
import {useApp} from '../../context/AppContext';
import {api} from '../../services/backend';
import {OrderDialog} from '../common/OrderDialog';
import {usePresentation} from '../../context/PresentationContext';
import {MenuCategories} from './MenuCategories';
import {MENU_KINDS,defaultMenuName,effectiveMenuName,menuKindLabel,menuIdentityLabel,type MenuKind} from '../../services/menuTemplates';

const isLegacy=(name:string)=>['منوی اصلی','منو اصلی'].includes(name.trim());

export function MenusManager(){
  const {menus,activeMenuId,setActiveMenuId,createMenu,categories,hasAnyProducts,showToast}=useApp();
  const {openSample}=usePresentation();
  const active=menus.find(m=>m.id===activeMenuId);
  const [mode,setMode]=useState<'create'|'rename'|null>(null);
  const [name,setName]=useState(''),[kind,setKind]=useState<MenuKind>('restaurant');
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const repairAttempted=useRef(false);

  const labels=menus.map(m=>effectiveMenuName(m.name,m.kind));
  function uniqueName(base:string,exceptId?:string){
    const existing=new Set(menus.filter(m=>m.id!==exceptId).map(m=>effectiveMenuName(m.name,m.kind)));
    if(!existing.has(base))return base;
    let i=2;
    while(existing.has(base+' '+i))i++;
    return base+' '+i;
  }
  useEffect(()=>{
    if(repairAttempted.current||!menus.some(m=>isLegacy(m.name)))return;
    repairAttempted.current=true;
    // Repair old ambiguous database titles once. IDs and menu items are untouched.
    const repair=async()=>{
      const used=new Set(menus.filter(m=>!isLegacy(m.name)).map(m=>effectiveMenuName(m.name,m.kind)));
      let updated=0;
      for(const m of menus.filter(m=>isLegacy(m.name))){
        const base=defaultMenuName(m.kind);
        let title=base,i=2;
        while(used.has(title))title=base+' '+i++;
        try{await api('/menus/'+m.id,{name:title,...(m.version?{expectedVersion:m.version}:{})},'PATCH');updated++;used.add(title);}
        catch(error){setError('بعضی نام‌های قدیمی ذخیره نشدند: '+(error as Error).message);}
      }
      if(updated){window.dispatchEvent(new Event('workspace-auth'));setNotice(`نام ${updated} منوی قدیمی متناسب با نوع فعالیت اصلاح شد.`);}
    };
    void repair();
  },[menus]);

  function chooseKind(next:MenuKind){
    if(mode==='create'&&(name===defaultMenuName(kind)||!name.trim()))setName(uniqueName(defaultMenuName(next)));
    setKind(next);
  }
  function openCreate(){
    setError('');setMode('create');setKind('restaurant');
    setName(uniqueName(defaultMenuName('restaurant')));
  }
  function openRename(){
    if(!active)return;
    setError('');setMode('rename');setKind(MENU_KINDS.some(k=>k.id===active.kind)?active.kind as MenuKind:'restaurant');
    setName(effectiveMenuName(active.name,active.kind));
  }
  async function save(){
    const clean=name.trim();
    if(!clean)return setError('نام منو را وارد کن.');
    if(menus.some(m=>m.id!==(mode==='rename'?activeMenuId:'')&&effectiveMenuName(m.name,m.kind)===clean))
      return setError('منویی با همین نام وجود دارد؛ نام دیگری انتخاب کن.');
    setBusy(true);setError('');
    try{
      if(mode==='create')await createMenu(clean,kind);
      else if(mode==='rename'&&active){
        await api('/menus/'+active.id,{name:clean,kind,...(active.version?{expectedVersion:active.version}:{})},'PATCH');
        window.dispatchEvent(new Event('workspace-auth'));showToast('نام و نوع منو ذخیره شد.');
      }
      setMode(null);setName('');
    }catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  return <section className="manager-menu-picker">
    <div className="mizato-menu-selector-header">
      <label>منوی در حال ویرایش
        <select aria-label="انتخاب منوی مجموعه" value={activeMenuId} onChange={e=>setActiveMenuId(e.target.value)}>
          {menus.map((m,i)=><option key={m.id} value={m.id}>{menuIdentityLabel(m.name,m.kind,i,labels)} · {menuKindLabel(m.kind)}{!m.published?' (پیش‌نویس)':''}</option>)}
        </select>
      </label>
      {active&&<p><b>نوع منو:</b> {menuKindLabel(active.kind)} · <b>نام:</b> {effectiveMenuName(active.name,active.kind)}</p>}
    </div>
    <div className="manager-menu-actions">
      <button type="button" onClick={openCreate}>＋ ساخت منوی جدید</button>
      <button type="button" onClick={openRename}>ویرایش نام و نوع منو</button>
      <button type="button" onClick={()=>openSample(null)}>مشاهده همین منو ↗</button>
    </div>
    <p>رستوران، کافه، قلیان، روم‌سرویس هتل، آبمیوه و سایر بخش‌ها می‌توانند منوهای جداگانه با نام و دسته‌های مستقل داشته باشند.</p>
    {notice&&<p role="status" className="mizato-menu-repair-status">{notice}</p>}
    {error&&!mode&&<p role="alert" className="login-error">{error}</p>}
    {mode&&<OrderDialog title={mode==='create'?'ساخت منوی جدید':'ویرایش مشخصات این منو'} onClose={()=>!busy&&setMode(null)}>
      <form className="phone-login" onSubmit={e=>{e.preventDefault();void save();}}>
        <label>نوع کسب‌وکار یا منو
          <select aria-label="نوع منو" value={kind} onChange={e=>chooseKind(e.target.value as MenuKind)}>
            {MENU_KINDS.map(k=><option value={k.id} key={k.id}>{k.title}</option>)}
          </select>
        </label>
        <label>نام اختصاصی منو
          <input aria-label="نام منو" value={name} maxLength={60} onChange={e=>setName(e.target.value)} placeholder={defaultMenuName(kind)} autoFocus/>
        </label>
        <p>نمونه: منوی رستوران، منوی کافه، قلیان، آبمیوه یا روم‌سرویس اتاق‌ها.</p>
        {error&&<p role="alert" className="login-error">{error}</p>}
        <button className="staff-primary" disabled={busy||!name.trim()}>{busy?'در حال ذخیره…':mode==='create'?'ساخت منو و رفتن به آن':'ذخیره تغییرات'}</button>
      </form>
    </OrderDialog>}
    {!hasAnyProducts&&categories.length>0&&<p role="status">دسته‌های این منو آماده‌اند؛ با «افزودن آیتم» غذا، نوشیدنی یا خدمات را به همین منو اضافه کن.</p>}
    <MenuCategories key={activeMenuId}/>
    <MenuSchedule key={activeMenuId+'-schedule'}/>
  </section>;
}
