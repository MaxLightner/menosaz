export type BusinessRole='owner'|'manager'|'waiter'|'kitchen';
export type Account={id?:string;name:string;email?:string;demo:boolean;phone?:string;needsProfile?:boolean;registrationPending?:boolean;termsAccepted?:boolean;role?:'admin'|'manager'|'waiter'|'kitchen';businessRole?:BusinessRole;businessId?:string;memberships?:{businessId:string;name:string;role:BusinessRole}[]};
export const accountView=(account:Account|null)=>account?.role==='admin'?'admin':account?.role==='waiter'?'waiter':account?.role==='kitchen'?'kitchen':'dashboard-desktop';
