import React,{useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import QRCode from 'qrcode';
import {useApp} from '../../context/AppContext';
import {SITE_URL} from '../../services/cloudConfig';
import {OrderDialog} from '../common/OrderDialog';
import type {ServicePoint} from '../../types';
type Tab='tables'|'waiter'|'kitchen';
export const pointUrl=(p:ServicePoint,businessId:string)=>p.qrCodeUrl||`${SITE_URL}/?view=customer&business=${encodeURIComponent(businessId)}&table=${p.tableNumber}`;
const image=(url:string)=>QRCode.toDataURL(url,{width:640,margin:4,errorCorrectionLevel:'L',color:{dark:'#111111',light:'#ffffff'}});
export function AllQRAccessModal({isOpen,onClose,defaultTab='tables',initialTable}:{isOpen:boolean;onClose:()=>void;defaultTab?:Tab;initialTable?:number}){
 const {business,servicePoints,showToast}=useApp();const [tab,setTab]=useState<Tab>(defaultTab),[number,setNumber]=useState(initialTable),[qr,setQr]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [printRows,setPrintRows]=useState<{label:string;image:string}[]>([]);
 const point=servicePoints.find(p=>p.tableNumber===number)||servicePoints[0];
 const url=tab==='tables'?(point?pointUrl(point,business.id):''):`${SITE_URL}/?view=${tab}`;
 useEffect(()=>{if(isOpen){setTab(defaultTab);setNumber(initialTable);setError('');setPrintRows([]);}},[isOpen,defaultTab,initialTable]);
 useEffect(()=>{if(!isOpen||!url)return;let cancelled=false;setQr('');image(url).then(value=>{if(!cancelled)setQr(value);}).catch(()=>{if(!cancelled)setError('ساخت QR انجام نشد؛ دوباره تلاش کن.');});return()=>{cancelled=true;};},[url,isOpen]);
 useEffect(()=>{if(!printRows.length)return;let cancelled=false;const run=async()=>{await Promise.all(Array.from(document.querySelectorAll<HTMLImageElement>('.qr-print-sheet img')).map(img=>img.decode().catch(()=>{})));if(!cancelled)window.print();};const timer=setTimeout(run,100);return()=>{cancelled=true;clearTimeout(timer);};},[printRows]);
 async function print(all=false){setBusy(true);setError('');try{const rows=all?await Promise.all(servicePoints.map(async p=>({label:p.label,image:await image(pointUrl(p,business.id))}))):[{label:tab==='tables'?point!.label:tab==='waiter'?'اپ گارسون':'اپ آشپزخانه',image:qr}];setPrintRows(rows);}catch{setError('آماده‌سازی چاپ انجام نشد.');}finally{setBusy(false);}}
 if(!isOpen)return null;
 return <><OrderDialog title="دریافت و چاپ QR" onClose={onClose}><div className="qr-access-tabs">{(['tables','waiter','kitchen'] as Tab[]).map(t=><button key={t} aria-pressed={tab===t} onClick={()=>{setTab(t);setPrintRows([]);}}>{t==='tables'?'میزها':t==='waiter'?'گارسون':'آشپزخانه'}</button>)}</div>
 {tab==='tables'&&<label className="qr-point-picker">میز / سرویس‌پوینت<select value={point?.tableNumber||''} onChange={e=>{setNumber(Number(e.target.value));setPrintRows([]);}}>{servicePoints.map(p=><option key={p.id} value={p.tableNumber}>{p.label}</option>)}</select></label>}
 {error&&<p role="alert">{error}</p>}{url?<><div className="qr-preview"><b>{business.name}</b><span>{tab==='tables'?point?.label:tab==='waiter'?'اپ گارسون':'اپ آشپزخانه'}</span>{qr?<img src={qr} alt="کیوآر کد" width={280} height={280}/>:<p>در حال آماده‌سازی…</p>}</div>
 <div className="qr-actions"><button disabled={!qr||busy} onClick={()=>print()}>چاپ همین QR</button>{tab==='tables'&&<button disabled={busy} onClick={()=>print(true)}>چاپ همه میزها</button>}{qr&&<a download={`mizato-${tab}-${point?.tableNumber||''}.png`} href={qr}>دانلود تصویر</a>}<button onClick={async()=>{try{await navigator.clipboard.writeText(url);showToast('لینک کپی شد');}catch{setError('کپی خودکار ممکن نشد؛ لینک را از کادر زیر بردار.');}}}>کپی لینک</button></div><input className="qr-link" readOnly dir="ltr" aria-label="لینک QR" value={url}/>
 <p className="qr-help">{tab==='tables'?'این QR به مجموعه و میز مربوط است و با ویرایش منو عوض نمی‌شود.':'کارکنان با حساب مجاز همین مجموعه وارد شوند. این QR مجوز ورود به حساب نیست.'}</p></>:<p>ابتدا یک سرویس‌پوینت بساز.</p>}</OrderDialog>
 {printRows.length>0&&createPortal(<section className="qr-print-sheet" dir="rtl">{printRows.map((row,i)=><article key={i}><h2>{business.name}</h2><h3>{row.label}</h3><img src={row.image} alt={row.label}/><p>برای دیدن منو اسکن کنید</p></article>)}</section>,document.body)}</>;
}
