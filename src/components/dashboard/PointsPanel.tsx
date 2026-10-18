import React,{useState} from 'react';
import {useApp} from '../../context/AppContext';
import {AllQRAccessModal} from '../modals/AllQRAccessModal';
export function PointsPanel(){
 const {servicePoints}=useApp();const [selected,setSelected]=useState<number|null>(null);
 return <section className="points-panel"><header><div><h2>QR میزها و سرویس‌پوینت‌ها</h2><p>منوی مجموعه مشترک است؛ QR هر میز فقط محل سفارش را مشخص می‌کند.</p></div><button className="staff-primary" disabled={!servicePoints.length} onClick={()=>setSelected(servicePoints[0].tableNumber)}>دریافت و چاپ QR میزها</button></header>
 <div className="points-grid">{servicePoints.map(p=><article key={p.id}><strong>{p.label}</strong><small>{p.activeSession?'مهمان دارد':'آزاد'}</small><button onClick={()=>setSelected(p.tableNumber)}>QR و چاپ</button></article>)}</div>{!servicePoints.length&&<p>هنوز سرویس‌پوینتی تعریف نشده است.</p>}
 {selected!==null&&<AllQRAccessModal isOpen onClose={()=>setSelected(null)} initialTable={selected}/>}</section>;
}
