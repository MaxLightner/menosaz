import {readFile} from 'node:fs/promises';
let input='';for await(const chunk of process.stdin)input+=chunk;
const {token}=JSON.parse(input);
const source=await readFile(new URL('../review/menu-api-deploy.ts',import.meta.url),'utf8');
const form=new FormData();form.set('metadata',JSON.stringify({name:'menu-api',entrypoint_path:'index.ts',verify_jwt:true}));form.set('file',new File([source],'index.ts',{type:'application/typescript'}));
try{const response=await fetch('https://api.supabase.com/v1/projects/zeeztpblibcqtxompvxa/functions/deploy?slug=menu-api',{method:'POST',headers:{Authorization:'Bearer '+token},body:form,signal:AbortSignal.timeout(60000)});const data=await response.json();console.log(JSON.stringify({status:response.status,slug:data.slug,version:data.version,verify_jwt:data.verify_jwt,error:response.ok?undefined:data.message||data.error}));if(!response.ok)process.exitCode=1;}catch(error){console.log(JSON.stringify({error:error.cause?.code||error.name}));process.exitCode=1;}
