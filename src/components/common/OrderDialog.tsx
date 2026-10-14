import React, {useEffect,useRef} from 'react';
export function OrderDialog({title,children,onClose}:{title:string;children:React.ReactNode;onClose:()=>void}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const previous=document.activeElement as HTMLElement;ref.current?.showModal();const original=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=original;previous?.focus();};},[]);
 return <dialog ref={ref} className="restored-dialog" onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)onClose();}}}><div className="restored-dialog-heading"><h2>{title}</h2><button aria-label="بستن پنجره" className="restored-close" onClick={onClose}>×</button></div>{children}</dialog>;
}
