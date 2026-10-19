import type {AppView} from '../types';
const views:AppView[]=['website','how','terms','membership','checkout','admin','dashboard-desktop','dashboard-mobile','customer','waiter','kitchen'];
export function viewFromSearch(search:string):AppView{
 const params=new URLSearchParams(search);
 if(params.has('q'))return 'customer';
 const view=params.get('view') as AppView;
 return views.includes(view)?view:'website';
}
