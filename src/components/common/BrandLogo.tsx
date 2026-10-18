import React from 'react';

/** Artwork extracted from the supplied Mizato brand sheet; no replacement lettering. */
export function BrandLogo({compact=false,dark=false,className=''}:{compact?:boolean;dark?:boolean;className?:string}){
 const root=import.meta.env.BASE_URL+'brand/';
 return <span role="img" aria-label="میزاتو" className={`mizato-brand ${compact?'mizato-brand-compact':''} ${className}`}>
  <img className="mizato-brand-mark" src={root+'mizato-mark.png'} width="145" height="130" alt="" aria-hidden="true"/>
  <img className="mizato-brand-word" src={root+(dark?'mizato-wordmark-white.png':'mizato-wordmark.png')} width="157" height="67" alt="" aria-hidden="true"/>
 </span>;
}
