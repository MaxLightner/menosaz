import assert from 'node:assert/strict';
import {adminAiSettings} from '../supabase/functions/menu-api/adminAi.ts';
const uid='00000000-0000-4000-8000-000000000001';
async function main(){
 const calls:string[]=[];
 const db={rpc:async(name:string,args:any)=>{calls.push(name);if(name==='mizato_platform_admin_stats')return {error:{message:'Access denied'}};if(name==='mizato_admin_ai_config')return {error:{message:'Admin access required'}};throw Error('Unexpected RPC')}};
 const denied=await adminAiSettings(db,uid,'/admin/ai-settings','GET',{});
 assert.equal(denied.status,403);
 assert(!JSON.stringify(denied).includes('sk-'));
 const deniedStats=await adminAiSettings(db,uid,'/admin/stats','GET',{});
 assert.equal(deniedStats.status,403);
 const before=calls.length;
 const rejected=await adminAiSettings(db,uid,'/admin/ai-settings','POST',{apiKey:'not-a-valid-secret'});
 assert.equal(rejected.status,400);
 assert.equal(calls.length,before);
 const disallowed=await adminAiSettings(db,uid,'/admin/ai-settings','DELETE',{});
 assert.equal(disallowed.status,405);
 const configured={rpc:async(name:string)=>{if(name==='mizato_admin_ai_config')return {data:{configured:true,updatedAt:null}};throw Error('Unexpected RPC')}};
 const status=await adminAiSettings(configured,uid,'/admin/ai-settings','GET',{});
 assert.equal(status.status,200);
 assert.equal(status.data.configured,true);
 assert.equal(status.data.source,'panel');
 assert(!('apiKey' in status.data));
 console.log('Admin AI integration boundary tests passed');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
