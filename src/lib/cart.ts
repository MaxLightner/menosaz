import type {OrderItemOption,Product} from '../types';

export interface CartItem {
 id:string;
 product:Product;
 quantity:number;
 selectedOptions?:OrderItemOption[];
 notes?:string;
 itemTotal:number;
}

function lineIdentity(product:Product,options:OrderItemOption[]=[],notes=''){
 const choices=options.map(o=>[o.groupId||o.groupTitle,o.optionId||o.optionName,o.extraPrice]);
 choices.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
 return JSON.stringify([product.id,product.price,choices,notes.trim().slice(0,500)]);
}

export function addCartItem(cart:CartItem[],product:Product,options:OrderItemOption[]=[],notes=''):CartItem[]{
 const cleanNotes=notes.trim().slice(0,500);
 const identity=lineIdentity(product,options,cleanNotes);
 const existing=cart.find(item=>lineIdentity(item.product,item.selectedOptions,item.notes)===identity);
 const unitPrice=product.price+options.reduce((sum,o)=>sum+o.extraPrice,0);
 if(existing)return cart.map(item=>item.id===existing.id?{...item,quantity:item.quantity+1,itemTotal:(item.quantity+1)*unitPrice}:item);
 return [...cart,{id:crypto.randomUUID(),product,quantity:1,selectedOptions:options.map(o=>({...o})),notes:cleanNotes,itemTotal:unitPrice}];
}
