import QRCode from 'qrcode';
import type {ServicePoint} from '../types';

// Create a dedicated, printable A4 sheet instead of sending managers to the QR preview.
export async function printQrStands(
  points:ServicePoint[],
  businessName:string,
  baseUrl:string,
  notify:(message:string)=>void
):Promise<void>{
  if(!points.length){notify('هنوز میزی برای چاپ QR تعریف نشده است.');return;}
  const tab=window.open('','_blank');
  if(!tab){notify('مرورگر پنجره چاپ را مسدود کرده است؛ اجازه باز شدن پنجره جدید را بده.');return;}
  tab.document.write('<html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>آماده‌سازی استندهای QR</title></head><body><p>در حال آماده‌سازی QR میزها…</p></body></html>');
  const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]||c));
  try{
    const rows=await Promise.all([...points].sort((a,b)=>a.tableNumber-b.tableNumber).map(async point=>{
      const link=point.qrCodeUrl||`${baseUrl.replace(/\/$/,'')}/?view=customer&business=${encodeURIComponent(point.businessId)}&table=${point.tableNumber}`;
      const qr=await QRCode.toDataURL(link,{width:400,margin:2,errorCorrectionLevel:'M'});
      return `<article class="stand"><h2>${escape(businessName)}</h2><strong>${escape(point.label||('میز '+point.tableNumber))}</strong><img src="${qr}" alt="QR میز ${point.tableNumber}"><p>برای مشاهده منو و سفارش اسکن کنید</p></article>`;
    }));
    tab.document.open();
    tab.document.write(`<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>چاپ استند QR میزها</title><style>
      @page{size:A4;margin:10mm}*{box-sizing:border-box}body{font-family:Tahoma,Arial,sans-serif;margin:0;color:#24382a}
      .stands{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8mm}
      .stand{min-height:83mm;border:1px dashed #879b88;border-radius:10px;text-align:center;display:flex;align-items:center;justify-content:center;flex-direction:column;break-inside:avoid;page-break-inside:avoid;padding:6mm}
      h2{font-size:19px;margin:0 0 3mm}strong{font-size:17px}img{width:45mm;height:45mm;object-fit:contain;margin:3mm}p{font-size:11px;margin:0}
      @media screen{body{background:#ecefea;padding:20px}.stands{max-width:210mm;margin:auto}.stand{background:white}}
      </style></head><body><main class="stands">${rows.join('')}</main>
      <script>window.addEventListener('load',function(){setTimeout(function(){window.print()},450)});<\/script>
      </body></html>`);
    tab.document.close();
  }catch(error){
    tab.close();
    notify('ساخت QR برای چاپ انجام نشد؛ دوباره تلاش کن.');
  }
}
