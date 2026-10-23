import assert from 'node:assert/strict';
import {aiCommitBody,reviewAiMenu} from '../supabase/functions/menu-api/aiMenu.ts';
const extracted=reviewAiMenu({categories:[{name:'پیتزا',items:[
 {name:'مخصوص',description:'پنیر، قارچ',priceToman:null,needsReview:false,variants:[{name:'یک نفره',priceToman:240000},{name:'دو نفره',priceToman:null}]}
]}]});
assert.equal(extracted.categories.length,1);
assert.equal(extracted.categories[0].items[0].needsReview,true);
assert.equal(extracted.categories[0].items[0].variants.length,2);
assert.equal(extracted.categories[0].items[0].variants[1].priceToman,null);
const valid={menuId:'main',name:'منوی اولیه',requestId:'eb058a95-8e0e-4f11-b35b-bceaa1e0828f',categories:[
 {name:'پیتزا',items:[{name:'مخصوص',price:240000,description:'',optionGroups:[{title:'نوع',options:[{name:'یک نفره',extraPrice:0},{name:'دو نفره',extraPrice:180000}]}]}]}
]};
const result=aiCommitBody(valid);
assert.equal(result.count,1);
assert.equal(result.categories[0].items[0].optionGroups[0].options[1].extraPrice,180000);
assert.equal(result.menuId,'main');
assert.throws(()=>aiCommitBody({...valid,menuId:'menu-other'}));
assert.throws(()=>aiCommitBody({...valid,categories:[{name:'پیتزا',items:[{name:'test',price:null}]}]}));
assert.throws(()=>aiCommitBody({...valid,categories:[{name:'پیتزا',items:[{name:'test',price:-1}]}]}));
assert.throws(()=>aiCommitBody({...valid,categories:[{name:'پیتزا',items:[{name:'test',price:200,optionGroups:[{title:'نوع',options:[{name:'خراب',extraPrice:-3}]}]}]}]}));
assert.throws(()=>aiCommitBody({...valid,categories:[{name:'پیتزا',items:Array.from({length:101},()=>({name:'تست',price:1000}))}]}));
console.log('AI menu import validation checks passed');
