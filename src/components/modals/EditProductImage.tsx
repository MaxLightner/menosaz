import React,{useState} from 'react';
import {OrderDialog} from '../common/OrderDialog';
import {readProductImage} from '../../lib/productImage';
import {useApp} from '../../context/AppContext';
import type {Product} from '../../types';
import {localProductImage} from '../../services/menuPresentation';
import {IMAGE_CHOICES,sourcePhotoForItem} from '../../services/menuImages';
import {displayImagePath} from '../../lib/imagePath';

export function EditProductImage({product,onClose}:{product:Product;onClose:()=>void}){
  const {updateProductImage}=useApp();
  const [image,setImage]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const recommended=sourcePhotoForItem(product.name);
  const preview=image.startsWith('data:')?image:image?displayImagePath('/menu-tiles/'+image.split('/').at(-1)):localProductImage(product);
  async function select(file:File){setError('');setImage('');try{setImage(await readProductImage(file));}catch(e){setError((e as Error).message);}}
  async function save(){setBusy(true);setError('');try{await updateProductImage(product.id,image);onClose();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <OrderDialog title={'عکس '+product.name} onClose={()=>!busy&&onClose()}>
    <div className="product-image-editor">
      <img src={preview} alt={product.name} className="mizato-preview-image"/>
      <p>یک تصویر متناسب از گالری انتخاب کن یا عکس اختصاصی مربع (حداکثر یک مگابایت) بارگذاری کن. عکس‌های گالری برای سرعت بارگذاری به تایل‌های فشرده تبدیل شده‌اند.</p>
      <label className="manager-upload">بارگذاری عکس دلخواه<input aria-label="انتخاب عکس آیتم" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e=>e.target.files?.[0]&&select(e.target.files[0])}/></label>
      {recommended&&<button type="button" className="staff-secondary" disabled={busy} onClick={()=>setImage(recommended)}>پیشنهاد تصویر مناسب «{product.name}»</button>}
      <div className="mizato-image-gallery">
        {IMAGE_CHOICES.map(([label,file])=>{
          const url=/^(iran|food)-\d+$/.test(file)?'/media/'+file+'.webp':'/menu-assets/'+file+'.webp';
          return <button type="button" key={file} disabled={busy} aria-label={'انتخاب '+label} className={url===image?'selected':''} onClick={()=>setImage(url)}>
            <img src={displayImagePath('/menu-tiles/'+file+'.webp')} alt={label} loading="lazy"/><span>{label}</span>
          </button>;
        })}
      </div>
      {error&&<p role="alert" className="login-error">{error}</p>}
      <button className="staff-primary" disabled={!image||busy} onClick={save}>{busy?'در حال ذخیره…':'ذخیره تصویر آیتم'}</button>
    </div>
  </OrderDialog>;
}
