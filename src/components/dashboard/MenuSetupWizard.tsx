import React,{useMemo,useState,useEffect,useRef} from 'react';
import {api} from '../../services/backend';
import {useApp} from '../../context/AppContext';
import {buildMenu,type CatalogCapabilities,type PendingCommand} from '../../services/catalog';
import {MENU_KINDS,MENU_PRESETS,defaultMenuName,effectiveMenuName,type MenuKind} from '../../services/menuTemplates';
import {sourcePhotoForItem,suggestedMenuImage} from '../../services/menuImages';
import {displayImagePath} from '../../lib/imagePath';

type CategoryDraft={id:string;name:string;count:number;items:string[]};
type Step='welcome'|'catalog'|'categories'|'items';
const selectionKey=(c:string,n:string)=>c+'::'+n;
const emptyCategory=():CategoryDraft=>({id:crypto.randomUUID(),name:'',count:3,items:['','','']});
const maxStarter=12;
function initialKind(value:string):MenuKind{
 return MENU_KINDS.some(k=>k.id===value)?value as MenuKind:'restaurant';
}

export function MenuSetupWizard(){
  const {activeMenuId,menus,showToast}=useApp();
  const current=menus.find(m=>m.id===activeMenuId);
  const [open,setOpen]=useState(true),[step,setStep]=useState<Step>('welcome');
  const [kind,setKind]=useState<MenuKind>(()=>initialKind(current?.kind||'restaurant'));
  const [menuName,setMenuName]=useState(()=>effectiveMenuName(current?.name||'',current?.kind||'restaurant'));
  const [categories,setCategories]=useState<CategoryDraft[]>([emptyCategory()]);
  const [selected,setSelected]=useState<string[]>([]);
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const pending=useRef<PendingCommand>(null);
  const [capabilities,setCapabilities]=useState<CatalogCapabilities|null>(null);
  const [loadingCapabilities,setLoadingCapabilities]=useState(false);
  async function loadCapabilities(){
    setLoadingCapabilities(true);setError('');
    try{setCapabilities(await api<CatalogCapabilities>('/catalog/capabilities'));}
    catch(e){setError((e as Error).message);}
    finally{setLoadingCapabilities(false);}
  }
  useEffect(()=>{loadCapabilities();},[]);
  const remaining=capabilities?.productLimit==null?null:Math.max(0,capabilities.productLimit-capabilities.products);
  const templates=MENU_PRESETS[kind];
  const totalAvailable=useMemo(()=>templates.reduce((n,c)=>n+c.items.length,0),[templates]);
  const defaultKeys=useMemo(()=>{
    const limit=Math.min(maxStarter,remaining??maxStarter);
    // Take initial items from different categories; don't silently create hundreds.
    const keys:string[]=[];
    for(let slot=0;keys.length<limit&&slot<6;slot++)
      for(const group of templates){
        if(keys.length>=limit)break;
        if(group.items[slot])keys.push(selectionKey(group.name,group.items[slot]));
      }
    return keys;
  },[templates,remaining]);
  useEffect(()=>{setSelected(defaultKeys);},[defaultKeys]);
  const selectedGroups=templates.map(g=>({category:g.name,items:g.items.filter(n=>selected.includes(selectionKey(g.name,n)))})).filter(g=>g.items.length);
  const chosenCount=selectedGroups.reduce((a,g)=>a+g.items.length,0);
  const totalManual=useMemo(()=>categories.reduce((sum,c)=>sum+c.count,0),[categories]);
  function chooseKind(next:MenuKind){
    if(menuName===effectiveMenuName(current?.name||'',kind)||menuName===defaultMenuName(kind)||menuName==='منوی اصلی')
      setMenuName(defaultMenuName(next));
    setKind(next);
  }
  function updateCategory(id:string,patch:Partial<CategoryDraft>){
    setCategories(list=>list.map(c=>c.id===id?{
      ...c,...patch,items:patch.count!==undefined?Array.from({length:patch.count},(_,i)=>c.items[i]||''):c.items
    }:c));
  }
  function addCategory(){setCategories(list=>[...list,emptyCategory()]);}
  function toggleItem(key:string){setError('');setSelected(list=>list.includes(key)?list.filter(x=>x!==key):[...list,key]);}
  function toggleGroup(name:string,items:readonly string[]){
    setError('');
    const keys=items.map(n=>selectionKey(name,n));
    setSelected(list=>keys.every(k=>list.includes(k))?list.filter(k=>!keys.includes(k)):[...new Set([...list,...keys])]);
  }

  async function build(groups:{category:string;items:string[]}[]){
    const clean=groups.map(g=>({category:g.category.trim(),items:g.items.map(n=>n.trim()).filter(Boolean)})).filter(g=>g.category&&g.items.length);
    const total=clean.reduce((n,g)=>n+g.items.length,0);
    if(!menuName.trim())throw Error('نام منو را وارد کن.');
    if(!total)throw Error('حداقل یک آیتم انتخاب یا وارد کن.');
    if(!capabilities)throw Error('ظرفیت اشتراک دریافت نشد؛ دوباره تلاش کن.');
    if(remaining!==null&&total>remaining)throw Error(`فقط ${remaining} جای خالی داری؛ تعداد آیتم‌های انتخابی را کم کن.`);
    if(new Set(clean.map(g=>g.category.toLocaleLowerCase('fa-IR'))).size!==clean.length)
      throw Error('دسته‌بندی تکراری است.');
    const body={
      menuId:activeMenuId,
      name:menuName.trim(),kind,
      categories:clean.map(g=>({
        name:g.category,
        items:g.items.map(name=>{
          const image=sourcePhotoForItem(name,g.category,kind);
          return {name,price:0,description:'قیمت، توضیحات و وضعیت موجودی این آیتم را از مدیریت منو تکمیل کنید.',
            isAvailable:false,prepTimeMinutes:15,...(image?{imageUrl:image}:{})};
        })
      }))
    };
    const result=await buildMenu(body,pending);
    if(result.productsCreated!==total)throw Error('تعداد آیتم‌های ذخیره‌شده با درخواست مطابقت ندارد؛ منو را بررسی کن.');
  }
  async function finish(groups:{category:string;items:string[]}[]){
    setBusy(true);setError('');
    try{await build(groups);showToast(`«${menuName.trim()}» با دسته‌ها و آیتم‌های انتخابی ساخته شد؛ قیمت‌ها را تکمیل کن.`);setOpen(false);}
    catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  function goToItems(){
    if(!menuName.trim())return setError('نام منو را وارد کن.');
    if(categories.some(c=>!c.name.trim()))return setError('نام همه دسته‌ها را وارد کن.');
    if(new Set(categories.map(c=>c.name.trim().toLocaleLowerCase('fa-IR'))).size!==categories.length)
      return setError('نام دسته‌ها نباید تکراری باشد.');
    if(totalManual<1||(remaining!==null&&totalManual>remaining))
      return setError('تعداد آیتم‌ها بیشتر از ظرفیت اشتراک است.');
    setError('');setStep('items');
  }
  if(!open)return <button className="empty-menu-launcher" onClick={()=>setOpen(true)}><span className="material-symbols-outlined">auto_awesome</span><b>منوی انتخاب‌شده خالی است</b><small>راهنمای ساخت منو را باز کن</small></button>;

  return <div className="menu-wizard-backdrop" role="dialog" aria-modal="true" aria-labelledby="menu-wizard-title">
    <section className="menu-wizard">
      <button type="button" className="menu-wizard-close" aria-label="بستن" onClick={()=>setOpen(false)}>×</button>
      {step==='welcome'&&<>
        <div className="wizard-mark"><span className="material-symbols-outlined">restaurant_menu</span></div>
        <span className="wizard-kicker">منوساز میزاتو · مناسب کسب‌وکارهای گوناگون</span>
        <h1 id="menu-wizard-title">این منو برای چه بخشی است؟</h1>
        <p>هر کسب‌وکار می‌تواند چند منوی مستقل با نام متفاوت داشته باشد؛ مثل منوی رستوران، کافه، قلیان یا روم‌سرویس هتل.</p>
        <div className="wizard-kind-grid">{MENU_KINDS.map(k=><button type="button" key={k.id} className={kind===k.id?'selected':''} onClick={()=>chooseKind(k.id)}><span className="material-symbols-outlined">{k.icon}</span><b>{k.title}</b><small>{k.hint}</small></button>)}</div>
        <label className="wizard-field">نام همین منو<input aria-label="نام منو" value={menuName} maxLength={60} onChange={e=>setMenuName(e.target.value)} placeholder={defaultMenuName(kind)}/></label>
        <p className="wizard-catalog-info">{templates.length} دسته · {totalAvailable} آیتم پیشنهادی قابل انتخاب. فقط آیتم‌هایی که انتخاب می‌کنی ساخته می‌شوند.</p>
        <div className="wizard-actions">
          <button type="button" className="wizard-primary" disabled={busy||!capabilities||remaining===0} onClick={()=>finish(templates.map(g=>({category:g.name,items:g.items.filter(n=>defaultKeys.includes(selectionKey(g.name,n)))})))}>{busy?'در حال ساخت…':`ساخت نمونه پیشنهادی (${defaultKeys.length} آیتم)`}</button>
          <button type="button" className="wizard-secondary" onClick={()=>{setError('');setStep('catalog');}}>انتخاب از فهرست کامل غذاها و خدمات</button>
          <button type="button" className="wizard-secondary" onClick={()=>{setError('');setStep('categories');}}>ساخت کاملاً دستی</button>
        </div>
      </>}
      {step==='catalog'&&<>
        <span className="wizard-kicker">فهرست کامل · {MENU_KINDS.find(k=>k.id===kind)?.title}</span>
        <h1 id="menu-wizard-title">چه آیتم‌هایی در «{menuName}» باشند؟</h1>
        <p>هر دسته را باز و آیتم‌های دلخواه را انتخاب کن. قیمت‌ها صفر و آیتم‌ها تا تکمیل اطلاعات، ناموجود هستند.</p>
        <div className="wizard-catalog-controls"><strong>{chosenCount} انتخاب شده {remaining===null?'':`· ظرفیت خالی: ${remaining}`}</strong><button type="button" onClick={()=>setSelected(defaultKeys)}>بازگشت به انتخاب پیشنهادی</button><button type="button" onClick={()=>setSelected([])}>لغو همه</button></div>
        <div className="wizard-catalog-list">
          {templates.map((group,i)=>{
            const groupKeys=group.items.map(n=>selectionKey(group.name,n));
            const groupCount=groupKeys.filter(k=>selected.includes(k)).length;
            return <details key={group.name} open={i===0?true:undefined}>
              <summary><b>{group.name}</b><small>{groupCount} از {group.items.length} انتخاب شده</small></summary>
              <button type="button" className="wizard-select-category" onClick={()=>toggleGroup(group.name,group.items)}>{groupCount===group.items.length?'برداشتن انتخاب همه':'انتخاب همه این دسته'}</button>
              <div className="wizard-catalog-items">{group.items.map(name=>{
                const key=selectionKey(group.name,name);
                return <label key={key} className="wizard-catalog-item">
                  <input type="checkbox" checked={selected.includes(key)} onChange={()=>toggleItem(key)}/>
                  <img loading="lazy" src={displayImagePath(suggestedMenuImage(name,group.name,kind))} alt="" />
                  <span>{name}</span>
                </label>;
              })}</div>
            </details>;
          })}
        </div>
        <div className="wizard-actions">
          <button type="button" className="wizard-primary" disabled={busy||chosenCount===0||!capabilities||(remaining!==null&&chosenCount>remaining)} onClick={()=>finish(selectedGroups)}>{busy?'در حال ذخیره…':`ساخت و ذخیره ${chosenCount} آیتم`}</button>
          <button type="button" className="wizard-secondary" onClick={()=>setStep('welcome')}>بازگشت</button>
        </div>
      </>}
      {step==='categories'&&<>
        <span className="wizard-kicker">ساخت دستی · مرحله ۱ از ۲</span>
        <h1 id="menu-wizard-title">دسته‌های اختصاصی منو</h1>
        <label className="wizard-field">نام منو<input value={menuName} maxLength={60} onChange={e=>setMenuName(e.target.value)}/></label>
        <label className="wizard-field">نوع منو<select value={kind} onChange={e=>chooseKind(e.target.value as MenuKind)}>{MENU_KINDS.map(k=><option value={k.id} key={k.id}>{k.title}</option>)}</select></label>
        <div className="wizard-category-list">{categories.map((c,i)=><div key={c.id}>
          <label>نام دسته<input value={c.name} maxLength={40} placeholder={i===0?'مثلاً غذای اصلی':'مثلاً نوشیدنی'} onChange={e=>updateCategory(c.id,{name:e.target.value})}/></label>
          <label>تعداد آیتم<input type="number" min="1" max="20" value={c.count} onChange={e=>updateCategory(c.id,{count:Math.max(1,Math.min(20,Number(e.target.value)||1))})}/></label>
          {categories.length>1&&<button type="button" aria-label="حذف دسته" onClick={()=>setCategories(x=>x.filter(y=>y.id!==c.id))}>×</button>}
        </div>)}</div>
        <div className="wizard-total"><span>{totalManual} آیتم {remaining===null?'· ظرفیت نامحدود':`از ${remaining} جای خالی`}</span><button type="button" onClick={addCategory} disabled={categories.length>=100||(remaining!==null&&totalManual>=remaining)}>＋ افزودن دسته</button></div>
        <div className="wizard-actions"><button type="button" className="wizard-primary" onClick={goToItems}>مرحله بعد: نام آیتم‌ها</button><button type="button" className="wizard-secondary" onClick={()=>setStep('welcome')}>بازگشت</button></div>
      </>}
      {step==='items'&&<>
        <span className="wizard-kicker">ساخت دستی · مرحله ۲ از ۲</span>
        <h1 id="menu-wizard-title">نام آیتم‌های «{menuName}»</h1>
        <p>فیلدهای خالی وارد منو نمی‌شوند. بعداً قیمت، توضیح و عکس را از مدیریت منو تکمیل کن.</p>
        <div className="wizard-items">{categories.map(c=><fieldset key={c.id}><legend>{c.name}</legend>{c.items.map((name,i)=><input key={i} value={name} maxLength={60} placeholder={`${c.name} ${i+1}`} onChange={e=>updateCategory(c.id,{items:c.items.map((v,j)=>j===i?e.target.value:v)})}/>)}</fieldset>)}</div>
        <div className="wizard-actions"><button type="button" className="wizard-primary" disabled={busy||!capabilities||categories.every(c=>c.items.every(x=>!x.trim()))} onClick={()=>finish(categories.map(c=>({category:c.name,items:c.items})))}>{busy?'در حال ذخیره…':'ساخت و ذخیره منو'}</button><button type="button" className="wizard-secondary" onClick={()=>setStep('categories')}>بازگشت</button></div>
      </>}
      {error&&<p className="wizard-error" role="alert">{error}</p>}
      {!capabilities&&<button type="button" className="wizard-secondary" disabled={loadingCapabilities} onClick={loadCapabilities}>{loadingCapabilities?'در حال دریافت ظرفیت…':'تلاش مجدد برای دریافت ظرفیت اشتراک'}</button>}
    </section>
  </div>;
}
