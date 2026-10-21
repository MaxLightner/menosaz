import {api} from './backend';
type GuestSession={businessId:string;sessionId?:string;guestId?:string;servicePointId:string;guestToken:string;expiresAt?:string};
const pending=new Map<string,Promise<GuestSession>>(),key=(bid:string,pid:string)=>'menosaz-guest-session:'+bid+':'+pid;
export function savedGuestSession(bid:string,pid:string):GuestSession|null{try{return JSON.parse(sessionStorage.getItem(key(bid,pid))||'null');}catch{return null;}}
export function resetGuestSession(bid:string,pid:string){sessionStorage.removeItem(key(bid,pid));}
export function ensureGuestSession(bid:string,pid:string,table:number):Promise<GuestSession>{
 const q=new URLSearchParams(location.search).get('q');
 if(!q||!/^[0-9a-f]{32}$/.test(q))return Promise.reject(Object.assign(Error('برای ثبت سفارش، کد QR همین میز را اسکن کنید.'),{code:'QR_REQUIRED'}));
 const storageKey=key(bid,pid);if(pending.has(storageKey))return pending.get(storageKey)!;
 const value=savedGuestSession(bid,pid)||{businessId:bid,servicePointId:pid,guestToken:crypto.randomUUID()};sessionStorage.setItem(storageKey,JSON.stringify(value));
 const run=api('/sessions/open',{business:bid,table,q:new URLSearchParams(location.search).get('q')||undefined,guestToken:value.guestToken}).then(data=>{const next={...data,guestToken:value.guestToken};sessionStorage.setItem(storageKey,JSON.stringify(next));return next;}).finally(()=>pending.delete(storageKey));pending.set(storageKey,run);return run;
}
