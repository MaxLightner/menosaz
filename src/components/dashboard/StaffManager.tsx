import React,{useEffect,useState} from 'react';
import QRCode from 'qrcode';
import {api} from '../../services/backend';
import {usePresentation} from '../../context/PresentationContext';
type Staff={phone:string;name:string;status:'active'|'disabled';days:number[];start:string|null;end:string|null;workMinutes:number;overtimeMinutes:number;deliveries:number;actions:number;serviceRating:number;ratingCount:number;onShift:boolean;userId:string|null};
const WEEK=['شنبه','یکشنبه','دوشنبه','سه‌شنبه','چهارشنبه','پنجشنبه','جمعه'];
const toEnglish=(value:string)=>value.replace(/[۰-۹]/g,c=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c)));
const format=(n:number)=>new Intl.NumberFormat('fa-IR').format(n);
export function StaffManager(){
 const {account}=usePresentation();
 const [rows,setRows]=useState<Staff[]>([]),[name,setName]=useState(''),[phone,setPhone]=useState(''),[days,setDays]=useState<number[]>([]),[start,setStart]=useState(''),[end,setEnd]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[qr,setQr]=useState('');
 const businessId=account?.businessId||'';
 const url=new URL(window.location.href);url.search='';url.hash='';url.searchParams.set('view','waiter');url.searchParams.set('business',businessId);
 const staffUrl=url.toString();
 async function load(){try{setRows(await api<Staff[]>('/staff/list'));setError('');}catch(e){setError((e as Error).message);}}
 useEffect(()=>{load();},[businessId]);
 useEffect(()=>{if(businessId)QRCode.toDataURL(staffUrl,{width:640,margin:4,errorCorrectionLevel:'L'}).then(setQr).catch(()=>setQr(''));},[staffUrl]);
 async function save(payload:{phone:string;name:string;days:number[];start:string|null;end:string|null;status:'active'|'disabled'}){
  setBusy(true);setError('');setNotice('');
  try{await api('/staff/save',payload);await load();setPhone('');setName('');setDays([]);setStart('');setEnd('');setNotice('مشخصات گارسون ذخیره شد.');}
  catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 function edit(row:Staff){setName(row.name);setPhone('0'+row.phone.slice(2));setDays(row.days||[]);setStart(row.start||'');setEnd(row.end||'');}
 return <section className="mizato-staff-manager">
  <h3>مدیریت گارسون‌ها</h3>
  <p>هر رستوران یک QR مشترک دارد. مدیر شماره گارسون را ثبت می‌کند؛ سپس گارسون با همان شماره و کد پیامک وارد صفحه خودش می‌شود.</p>
  <div className="mizato-staff-qr">{qr&&<img src={qr} alt="QR مشترک ورود گارسون‌های مجموعه"/>}<div><b>QR ورود گارسون‌ها</b><p>این QR برای تمام گارسون‌های این مجموعه یکسان است.</p><a href={staffUrl} target="_blank" rel="noreferrer">باز کردن صفحه ورود</a><button type="button" onClick={()=>navigator.clipboard.writeText(staffUrl).then(()=>setNotice('لینک ورود کپی شد')).catch(()=>setError('کپی انجام نشد'))}>کپی لینک</button></div></div>
  <form className="mizato-staff-form" onSubmit={e=>{e.preventDefault();save({phone:toEnglish(phone),name:name.trim(),days,start:start||null,end:end||null,status:'active'});}}>
   <label>نام گارسون<input required minLength={2} maxLength={100} value={name} onChange={e=>setName(e.target.value)}/></label>
   <label>شماره موبایل<input required type="tel" inputMode="tel" dir="ltr" pattern="09[0-9]{9}" placeholder="09123456789" value={toEnglish(phone)} onChange={e=>setPhone(toEnglish(e.target.value))}/></label>
   <fieldset><legend>روزهای کاری (اختیاری)</legend><div className="mizato-staff-days">{WEEK.map((day,i)=><label key={day}><input type="checkbox" checked={days.includes(i+1)} onChange={e=>setDays(prev=>e.target.checked?[...prev,i+1]:prev.filter(x=>x!==i+1))}/>{day}</label>)}</div></fieldset>
   <div className="mizato-staff-times"><label>شروع شیفت (اختیاری)<input type="time" value={start} onChange={e=>setStart(e.target.value)}/></label><label>پایان شیفت (اختیاری)<input type="time" value={end} onChange={e=>setEnd(e.target.value)}/></label></div>
   <button className="staff-primary" disabled={busy||!businessId}>{busy?'در حال ثبت…':'ذخیره گارسون'}</button>
  </form>
  {error&&<p role="alert" className="login-error">{error}</p>}{notice&&<p role="status">{notice}</p>}
  <h3>گارسون‌ها و گزارش عملکرد</h3>
  {!rows.length&&<p>گارسونی ثبت نشده است.</p>}
  <div className="mizato-staff-list">{rows.map(row=><article key={row.phone}>
   <div><strong>{row.name}</strong><small dir="ltr">{'0'+row.phone.slice(2)}</small><small>{row.onShift?'در شیفت':'خارج از شیفت'} · {row.status==='active'?'فعال':'غیرفعال'} · {row.start&&row.end?`ساعت برنامه: ${row.start} تا ${row.end}`:'شیفت اختیاری'}</small></div>
   <div className="mizato-staff-stats"><span>حضور: {format(Math.floor(row.workMinutes/60))} ساعت و {format(row.workMinutes%60)} دقیقه</span><span>اضافه‌کاری محاسبه‌شده: {format(row.overtimeMinutes)} دقیقه</span><span>تحویل: {format(row.deliveries)}</span><span>عملیات: {format(row.actions)}</span><span>امتیاز خدمات: {row.ratingCount?format(row.serviceRating):'—'}</span></div>
   <div className="mizato-staff-actions"><button disabled={busy} onClick={()=>edit(row)}>ویرایش</button><button disabled={busy} onClick={()=>save({...row,start:row.start||null,end:row.end||null,status:row.status==='active'?'disabled':'active'})}>{row.status==='active'?'غیرفعال کردن':'فعال کردن'}</button></div>
  </article>)}</div>
 </section>;
}
