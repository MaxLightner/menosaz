import React,{useCallback,useEffect,useRef,useState} from 'react';
import {OrderDialog} from '../common/OrderDialog';
import {useApp} from '../../context/AppContext';
import type {Product} from '../../types';
import {localProductImage} from '../../services/menuPresentation';
import {IMAGE_CHOICES,sourcePhotoForItem} from '../../services/menuImages';
import {displayImagePath} from '../../lib/imagePath';
import {api} from '../../services/backend';
import {cropGeometry,clampUnit} from '../../lib/imageCrop';

type BusinessImage={id:string;url:string;createdAt:string;width:number|null;height:number|null};
type GalleryResult={items:BusinessImage[]};
type Source='current'|'restaurant'|'shared'|'device';
type Selection={url:string;saveUrl:string;source:Source};
const MAX_INPUT_BYTES=16*1024*1024;
const OUTPUT_SIZE=512;

export function EditProductImage({product,onClose}:{product:Product;onClose:()=>void}){
 const {updateProductImage}=useApp();
 const [source,setSource]=useState<Source>('current');
 const [selection,setSelection]=useState<Selection>(()=>({url:localProductImage(product),saveUrl:product.imageUrl||'',source:'current'}));
 const [gallery,setGallery]=useState<BusinessImage[]>([]);
 const [galleryLoading,setGalleryLoading]=useState(true),[galleryError,setGalleryError]=useState('');
 const [image,setImage]=useState<HTMLImageElement|null>(null),[loadError,setLoadError]=useState('');
 const [zoom,setZoom]=useState(1),[panX,setPanX]=useState(0),[panY,setPanY]=useState(0),[touched,setTouched]=useState(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const canvasRef=useRef<HTMLCanvasElement>(null);
 const pointer=useRef<{x:number;y:number}|null>(null);
 const objectUrl=useRef<string|null>(null);
 const latestImage=useRef<HTMLImageElement|null>(null);
 const recommended=sourcePhotoForItem(product.name);

 const loadGallery=useCallback(async()=>{
  setGalleryLoading(true);setGalleryError('');
  try{const data=await api<GalleryResult>('/product-gallery');setGallery(data.items||[]);}
  catch(err){setGalleryError((err as Error).message||'گالری اختصاصی بارگذاری نشد.');}
  finally{setGalleryLoading(false);}
 },[]);
 useEffect(()=>{void loadGallery();},[loadGallery]);
 useEffect(()=>()=>{if(objectUrl.current)URL.revokeObjectURL(objectUrl.current);},[]);
 useEffect(()=>{
  let cancelled=false;setImage(null);setLoadError('');
  const img=new Image();img.crossOrigin='anonymous';img.decoding='async';
  img.onload=()=>{if(!cancelled){latestImage.current=img;setImage(img);}};
  img.onerror=()=>{if(!cancelled)setLoadError('بارگذاری عکس ممکن نشد. عکس دیگری انتخاب کن یا آن را از دستگاه بارگذاری کن.');};
  img.src=selection.url;
  return()=>{cancelled=true;img.onload=null;img.onerror=null;};
 },[selection.url]);
 useEffect(()=>{
  const canvas=canvasRef.current;if(!canvas||!image)return;
  const ctx=canvas.getContext('2d');if(!ctx)return;
  const geometry=cropGeometry({sourceWidth:image.naturalWidth,sourceHeight:image.naturalHeight,zoom,panX,panY,size:OUTPUT_SIZE});
  ctx.clearRect(0,0,OUTPUT_SIZE,OUTPUT_SIZE);
  ctx.fillStyle='#f4f4f0';ctx.fillRect(0,0,OUTPUT_SIZE,OUTPUT_SIZE);
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  try{ctx.drawImage(image,geometry.x,geometry.y,geometry.width,geometry.height);}
  catch{setLoadError('این تصویر قابل برش نیست.');}
 },[image,zoom,panX,panY]);
 function pick(url:string,saveUrl:string,selectedSource:Source){
  setSource(selectedSource);setSelection({url,saveUrl,source:selectedSource});
  setZoom(1);setPanX(0);setPanY(0);setTouched(false);setError('');
 }
 async function pickFile(file:File){
  setError('');
  if(!file.type.startsWith('image/')||file.type==='image/svg+xml')return setError('فایل باید عکس JPG، PNG، HEIC یا WebP قابل نمایش باشد.');
  if(file.size>MAX_INPUT_BYTES)return setError('حجم عکس اولیه حداکثر ۱۶ مگابایت است.');
  if(objectUrl.current)URL.revokeObjectURL(objectUrl.current);
  objectUrl.current=URL.createObjectURL(file);
  pick(objectUrl.current,'','device');
  setTouched(true);
 }
 function movePointer(e:React.PointerEvent<HTMLCanvasElement>){
  if(!pointer.current||!image)return;
  const canvas=canvasRef.current;if(!canvas)return;
  const rect=canvas.getBoundingClientRect();
  const {maxX,maxY}=cropGeometry({sourceWidth:image.naturalWidth,sourceHeight:image.naturalHeight,zoom,panX,panY,size:OUTPUT_SIZE});
  const factor=OUTPUT_SIZE/Math.max(1,rect.width);
  const diffX=(e.clientX-pointer.current.x)*factor,diffY=(e.clientY-pointer.current.y)*factor;
  if(maxX>0)setPanX(v=>clampUnit(v+diffX/maxX));
  if(maxY>0)setPanY(v=>clampUnit(v+diffY/maxY));
  pointer.current={x:e.clientX,y:e.clientY};
  setTouched(true);
 }
 function exportCrop():string{
  const canvas=canvasRef.current;if(!canvas||!image)throw Error('پیش‌نمایش تصویر آماده نیست.');
  let url=canvas.toDataURL('image/webp',.78);
  if(!url.startsWith('data:image/webp;base64,'))throw Error('این مرورگر امکان خروجی WebP ندارد.');
  // 1 MiB is the server-side hard limit. Lower quality if required.
  for(const quality of [.67,.54,.42]){if(url.length*3/4<=990000)break;url=canvas.toDataURL('image/webp',quality);}
  if(url.length*3/4>990000)throw Error('عکس فشرده نشد؛ یک تصویر کم‌جزئیات‌تر انتخاب کن.');
  return url;
 }
 async function save(){
  if(busy||!image)return;
  setBusy(true);setError('');
  try{
   const result=(selection.source==='device'||touched||!selection.saveUrl)?exportCrop():selection.saveUrl;
   await updateProductImage(product.id,result);
   onClose();
  }catch(err){setError((err as Error).message||'ذخیره تصویر انجام نشد.');}
  finally{setBusy(false);}
 }
 function sharedImage(file:string){
  return /^(iran|food)-\d+$/.test(file)?'/media/'+file+'.webp':'/menu-assets/'+file+'.webp';
 }
 return <OrderDialog title={'ویرایش عکس «'+product.name+'»'} onClose={()=>!busy&&onClose()}>
  <div className="mizato-image-editor">
   <p className="mizato-image-editor-hint">عکس را بکش تا کادر آن جابه‌جا شود؛ با بزرگ‌نمایی می‌توانی محدوده تصویر را دقیق تنظیم کنی.</p>
   <div className="mizato-image-editor-preview">
    <canvas ref={canvasRef} width={OUTPUT_SIZE} height={OUTPUT_SIZE} role="img" aria-label="پیش‌نمایش مربعی قابل جابه‌جایی و برش"
      onPointerDown={e=>{if(!image)return;pointer.current={x:e.clientX,y:e.clientY};e.currentTarget.setPointerCapture(e.pointerId);}}
      onPointerMove={movePointer}
      onPointerUp={e=>{pointer.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}}
      onPointerCancel={()=>{pointer.current=null;}}/>
    {!image&&<div className="mizato-image-editor-loading">{loadError||'در حال بارگذاری تصویر…'}</div>}
   </div>
   <div className="mizato-image-editor-adjust">
     <label htmlFor="mizato-zoom">بزرگ‌نمایی</label>
     <input id="mizato-zoom" type="range" min="1" max="3" step=".05" value={zoom} disabled={!image||busy}
      onChange={e=>{setZoom(Number(e.target.value));setTouched(true);}}/>
     <strong>{Math.round(zoom*100)}٪</strong>
     <button type="button" onClick={()=>{setZoom(1);setPanX(0);setPanY(0);setTouched(true);}} disabled={!image||busy}>تنظیم مجدد</button>
   </div>
   <nav className="mizato-image-editor-tabs" aria-label="منبع تصویر">
    <button type="button" className={source==='restaurant'?'active':''} onClick={()=>setSource('restaurant')}>گالری رستوران</button>
    <button type="button" className={source==='shared'?'active':''} onClick={()=>setSource('shared')}>گالری مشترک</button>
    <button type="button" className={source==='device'?'active':''} onClick={()=>setSource('device')}>آپلود عکس</button>
   </nav>
   {source==='restaurant'&&<section className="mizato-image-editor-gallery" aria-label="گالری اختصاصی همین رستوران">
    <div className="mizato-image-editor-gallery-top"><b>تصاویر همین رستوران</b><button type="button" onClick={()=>void loadGallery()}>بازخوانی</button></div>
    {galleryLoading?<p>در حال دریافت تصاویر…</p>:galleryError?<p role="alert">{galleryError}</p>:!gallery.length?<p>هنوز تصویری در گالری اختصاصی ذخیره نشده است. با آپلود عکس، تصویر در همین گالری باقی می‌ماند.</p>:null}
    <div className="mizato-image-editor-thumbs">{gallery.map(asset=><button type="button" key={asset.id} className={selection.url===asset.url?'selected':''} onClick={()=>pick(asset.url,asset.url,'restaurant')} disabled={busy}>
      <img src={asset.url} alt="تصویر اختصاصی رستوران" loading="lazy"/>
    </button>)}</div>
   </section>}
   {source==='shared'&&<section className="mizato-image-editor-gallery" aria-label="گالری عمومی میزاتو">
    <b>تصاویر آماده میزاتو (برای همه رستوران‌ها)</b>
    {recommended&&<button className="mizato-image-editor-recommended" type="button" onClick={()=>pick(displayImagePath(recommended),recommended,'shared')}>تصویر پیشنهادی این غذا</button>}
    <div className="mizato-image-editor-thumbs">{IMAGE_CHOICES.map(([label,file])=><button key={file} type="button"
      disabled={busy} aria-label={'انتخاب تصویر '+label} title={label}
      className={selection.saveUrl===sharedImage(file)?'selected':''}
      onClick={()=>pick(displayImagePath(sharedImage(file)),sharedImage(file),'shared')}>
      <img src={displayImagePath('/menu-tiles/'+file+'.webp')} loading="lazy" alt={label}/>
      <span>{label}</span>
    </button>)}</div>
   </section>}
   {source==='device'&&<section className="mizato-image-editor-gallery">
     <label className="mizato-image-editor-upload">انتخاب عکس از گوشی یا کامپیوتر
       <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
         disabled={busy} onChange={e=>{const file=e.target.files?.[0];if(file)void pickFile(file);e.currentTarget.value='';}}/>
     </label>
     <p>عکس اولیه حداکثر ۱۶ مگابایت؛ هنگام ذخیره به WebP مربعی ۵۱۲ پیکسل و کم‌حجم تبدیل می‌شود. تصویر ذخیره‌شده به گالری همین رستوران اضافه می‌شود.</p>
   </section>}
   {(error||loadError)&&<p role="alert" className="login-error">{error||loadError}</p>}
   <div className="mizato-image-editor-actions">
    <button type="button" onClick={onClose} disabled={busy}>انصراف</button>
    <button type="button" className="staff-primary" onClick={()=>void save()} disabled={busy||!image||!!loadError}>
      {busy?'در حال ذخیره…':'اعمال تصویر و ذخیره'}
    </button>
   </div>
  </div>
 </OrderDialog>;
}
