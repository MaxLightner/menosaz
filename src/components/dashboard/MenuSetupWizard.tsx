import React,{useMemo,useState,useEffect,useRef} from 'react';
import {api} from '../../services/backend';
import {useApp} from '../../context/AppContext';
import {buildMenu,type CatalogCapabilities,type PendingCommand} from '../../services/catalog';

type Kind='restaurant'|'cafe'|'hotel'|'juice';
type CategoryDraft={id:string;name:string;count:number;items:string[]};

const KINDS:{id:Kind;title:string;hint:string;icon:string}[]=[
  {id:'restaurant',title:'رستوران',hint:'غذاهای اصلی، پیش‌غذا و نوشیدنی',icon:'restaurant'},
  {id:'cafe',title:'کافه',hint:'قهوه، نوشیدنی سرد و دسر',icon:'coffee'},
  {id:'hotel',title:'هتل و روم‌سرویس',hint:'صبحانه، روم‌سرویس و میان‌وعده',icon:'hotel'},
  {id:'juice',title:'آبمیوه و بستنی',hint:'آبمیوه، شیک، بستنی و معجون',icon:'local_bar'},
];

const DEFAULTS:Record<Kind,{category:string;items:string[]}[]>={
  restaurant:[{category:'کباب‌ها',items:['چلوکباب کوبیده','جوجه کباب زعفرانی','کباب برگ']},{category:'غذاهای ایرانی',items:['زرشک‌پلو با مرغ','باقالی‌پلو با گوشت']},{category:'نوشیدنی‌ها',items:['دوغ محلی','نوشابه']},{category:'دسر و مخلفات',items:['سالاد فصل','ماست موسیر','بستنی سنتی']}],
  cafe:[{category:'قهوه گرم',items:['اسپرسو','آمریکانو','کاپوچینو','لاته']},{category:'نوشیدنی سرد',items:['آیس لاته','موهیتو']},{category:'کیک و دسر',items:['چیزکیک','کیک شکلاتی']},{category:'صبحانه',items:['صبحانه ایرانی','املت مخصوص']}],
  hotel:[{category:'صبحانه',items:['صبحانه ایرانی','صبحانه انگلیسی']},{category:'روم‌سرویس',items:['کلاب ساندویچ','چلو جوجه کباب','پاستا آلفردو']},{category:'نوشیدنی',items:['چای ایرانی','قهوه','آبمیوه طبیعی']},{category:'میان‌وعده',items:['بشقاب میوه','کیک روز']}],
  juice:[{category:'آبمیوه طبیعی',items:['آب پرتقال','آب هویج','آب انار']},{category:'بستنی',items:['بستنی سنتی','بستنی شکلاتی']},{category:'شیک',items:['شیک موز','شیک شکلات']},{category:'معجون',items:['معجون مخصوص','شیرموز گردو']}],
};

const IMAGE:Record<Kind,string>={restaurant:'/media/iran-0.webp',cafe:'/menu-assets/cappuccino.webp',hotel:'/menu-assets/espresso.webp',juice:'/menu-assets/orange-juice.webp'};

export function MenuSetupWizard(){
  const {activeMenuId,showToast}=useApp();
  const [open,setOpen]=useState(true),[step,setStep]=useState<'welcome'|'categories'|'items'>('welcome');
  const [kind,setKind]=useState<Kind>('restaurant'),[menuName,setMenuName]=useState('منوی اصلی');
  const [categories,setCategories]=useState<CategoryDraft[]>([{id:crypto.randomUUID(),name:'',count:3,items:['','','']}]);
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const pending=useRef<PendingCommand>(null);
  const [capabilities,setCapabilities]=useState<CatalogCapabilities|null>(null);
  useEffect(()=>{let live=true;api<CatalogCapabilities>('/catalog/capabilities').then(v=>{if(live)setCapabilities(v);}).catch(e=>live&&setError(e.message));return()=>{live=false;};},[]);
  const remaining=capabilities?.productLimit==null?null:Math.max(0,capabilities.productLimit-capabilities.products);
  const total=useMemo(()=>categories.reduce((sum,c)=>sum+c.count,0),[categories]);

  function updateCategory(id:string,patch:Partial<CategoryDraft>){setCategories(list=>list.map(c=>c.id===id?{...c,...patch,items:patch.count!==undefined?Array.from({length:patch.count},(_,i)=>c.items[i]||''):c.items}:c));}
  function addCategory(){setCategories(list=>[...list,{id:crypto.randomUUID(),name:'',count:2,items:['','']}]);}
  async function build(groups:{category:string;items:string[]}[]){
    const items=groups.flatMap(g=>g.items.map(name=>({name:name.trim(),categoryId:g.category.trim()}))).filter(x=>x.name&&x.categoryId);
    if(!items.length)throw Error('حداقل یک آیتم برای منو وارد کن.');
    if(!capabilities)throw Error('ظرفیت اشتراک هنوز دریافت نشده؛ دوباره تلاش کن.');
    if(remaining!==null&&items.length>remaining)throw Error(`اشتراک شما ظرفیت ${remaining} آیتم تازه دارد.`);
    await buildMenu({menuId:activeMenuId,name:menuName.trim()||'منوی اصلی',kind,categories:groups.map(g=>({name:g.category.trim(),items:g.items.map(name=>({name:name.trim(),price:0,description:'قیمت، توضیحات و عکس این آیتم را از مدیریت منو کامل کنید.',isAvailable:false,prepTimeMinutes:15,imageUrl:IMAGE[kind]}))}))},pending);
  }
  async function finish(groups:{category:string;items:string[]}[]){setBusy(true);setError('');try{await build(groups);showToast('منوی اولیه ساخته شد؛ حالا قیمت و عکس‌ها را کامل کن.');setOpen(false);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  function goToItems(){if(!menuName.trim())return setError('نام منو را وارد کن.');if(categories.some(c=>!c.name.trim()))return setError('نام همه دسته‌ها را وارد کن.');if(new Set(categories.map(c=>c.name.trim().toLocaleLowerCase('fa-IR'))).size!==categories.length)return setError('نام دسته‌ها نباید تکراری باشد.');if(total<1||(remaining!==null&&total>remaining))return setError('تعداد آیتم‌ها بیشتر از ظرفیت اشتراک است.');setError('');setStep('items');}
  if(!open)return <button className="empty-menu-launcher" onClick={()=>setOpen(true)}><span className="material-symbols-outlined">auto_awesome</span><b>منوی شما هنوز خالی است</b><small>با راهنمای ساخت منو شروع کن</small></button>;
  return <div className="menu-wizard-backdrop" role="dialog" aria-modal="true" aria-labelledby="menu-wizard-title"><section className="menu-wizard">
    <button className="menu-wizard-close" aria-label="بستن" onClick={()=>setOpen(false)}>×</button>
    {step==='welcome'&&<><div className="wizard-mark"><span className="material-symbols-outlined">auto_awesome</span></div><span className="wizard-kicker">خوش آمدی</span><h1 id="menu-wizard-title">اولین منوی مجموعه‌ات را بسازیم</h1><p>نوع فعالیت را انتخاب کن. میزاتو می‌تواند همین حالا دسته‌ها و چند آیتم مناسب را آماده کند؛ بعداً قیمت، عکس و توضیحات را ویرایش می‌کنی.</p><div className="wizard-kind-grid">{KINDS.map(k=><button key={k.id} className={kind===k.id?'selected':''} onClick={()=>setKind(k.id)}><span className="material-symbols-outlined">{k.icon}</span><b>{k.title}</b><small>{k.hint}</small></button>)}</div><div className="wizard-actions"><button className="wizard-primary" disabled={busy||!capabilities} onClick={()=>finish(DEFAULTS[kind])}>{busy?'در حال ساخت…':'ساخت منوی پیش‌فرض'}</button><button className="wizard-secondary" onClick={()=>setStep('categories')}>دسته‌ها را خودم می‌سازم</button></div></>}
    {step==='categories'&&<><span className="wizard-kicker">ساخت دستی · مرحله ۱ از ۲</span><h1 id="menu-wizard-title">دسته‌های منو را مشخص کن</h1><label className="wizard-field">نام منو<input value={menuName} maxLength={60} onChange={e=>setMenuName(e.target.value)}/></label><label className="wizard-field">نوع منو<select value={kind} onChange={e=>setKind(e.target.value as Kind)}>{KINDS.map(k=><option value={k.id} key={k.id}>{k.title}</option>)}</select></label><div className="wizard-category-list">{categories.map((c,i)=><div key={c.id}><label>نام دسته<input value={c.name} maxLength={40} placeholder={i===0?'مثلاً غذای اصلی':'مثلاً نوشیدنی'} onChange={e=>updateCategory(c.id,{name:e.target.value})}/></label><label>تعداد آیتم<input type="number" min="1" max="10" value={c.count} onChange={e=>updateCategory(c.id,{count:Math.max(1,Math.min(10,Number(e.target.value)||1))})}/></label>{categories.length>1&&<button aria-label="حذف دسته" onClick={()=>setCategories(x=>x.filter(y=>y.id!==c.id))}>×</button>}</div>)}</div><div className="wizard-total"><span>{new Intl.NumberFormat('fa-IR').format(total)} آیتم {remaining===null?'· ظرفیت نامحدود':`از ${new Intl.NumberFormat('fa-IR').format(remaining)} جای خالی`}</span><button onClick={addCategory} disabled={categories.length>=100||(remaining!==null&&total>=remaining)}>＋ اضافه کردن دسته جدید</button></div><div className="wizard-actions"><button className="wizard-primary" onClick={goToItems}>مرحله بعد: نام آیتم‌ها</button><button className="wizard-secondary" onClick={()=>setStep('welcome')}>بازگشت</button></div></>}
    {step==='items'&&<><span className="wizard-kicker">ساخت دستی · مرحله ۲ از ۲</span><h1 id="menu-wizard-title">نام آیتم‌ها را وارد کن</h1><p>قیمت و عکس را بعد از ساخت منو از همان داشبورد کامل می‌کنی.</p><div className="wizard-items">{categories.map(c=><fieldset key={c.id}><legend>{c.name}</legend>{c.items.map((name,i)=><input key={i} value={name} maxLength={60} placeholder={`${c.name} ${new Intl.NumberFormat('fa-IR').format(i+1)}`} onChange={e=>updateCategory(c.id,{items:c.items.map((v,j)=>j===i?e.target.value:v)})}/>)}</fieldset>)}</div>{error&&<p className="wizard-error" role="alert">{error}</p>}<div className="wizard-actions"><button className="wizard-primary" disabled={busy||!capabilities||categories.some(c=>c.items.some(x=>!x.trim()))} onClick={()=>finish(categories.map(c=>({category:c.name,items:c.items})))}>{busy?'در حال ساخت منو…':'ساخت و ذخیره منو'}</button><button className="wizard-secondary" disabled={busy} onClick={()=>setStep('categories')}>بازگشت</button></div></>}
    {error&&step!=='items'&&<p className="wizard-error" role="alert">{error}</p>}
  </section></div>;
}
