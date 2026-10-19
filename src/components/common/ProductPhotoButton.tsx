import React from 'react';
import type {Product} from '../../types';
import {localProductImage} from '../../services/menuPresentation';

export function ProductPhotoButton({product,onEdit,size='mobile'}:{
 product:Product;onEdit:()=>void;size?:'mobile'|'desktop'
}){
 return <button type="button" onClick={onEdit}
   title={'ویرایش عکس '+product.name}
   aria-label={'ویرایش عکس '+product.name}
   className={'mizato-photo-button '+(size==='desktop'?'mizato-photo-button--desktop':'')}>
   <img loading="lazy" src={localProductImage(product)} alt="" className="mizato-photo-button__image"/>
   <span className="mizato-photo-button__pencil material-symbols-outlined" aria-hidden="true">edit</span>
 </button>;
}
