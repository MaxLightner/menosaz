// Server-side management of platform OpenAI settings.
// All functions are called only after verifying Supabase Auth session and admin status.
declare const Deno:{env:{get:(name:string)=>string|undefined}};
type AiSettingsReply={status:number;data:Record<string,unknown>};
const respond=(status:number,data:Record<string,unknown>):AiSettingsReply=>({status,data});

export async function adminAiSettings(db:any,uid:string,path:string,method:string,body:Record<string,any>):Promise<AiSettingsReply>{
 if(path==='/admin/stats'&&method==='GET'){
  const r=await db.rpc('mizato_platform_admin_stats',{p_uid:uid});
  if(r.error)return respond(403,{error:'گزارش مدیریت قابل دریافت نیست.'});
  return respond(200,r.data);
 }
 if(!['/admin/ai-settings','/admin/ai-settings/test'].includes(path))
  return respond(404,{error:'مسیر یافت نشد.'});
 if(!((path==='/admin/ai-settings'&&['GET','POST'].includes(method))||(path==='/admin/ai-settings/test'&&method==='POST')))
  return respond(405,{error:'روش درخواست معتبر نیست.'});
 const action=path==='/admin/ai-settings'&&method==='POST'?'save':'status';
 const submittedKey=typeof body.apiKey==='string'?body.apiKey.trim():'';
 if(action==='save'){
  if(submittedKey.length<20||submittedKey.length>512||!submittedKey.startsWith('sk-')||/\s/.test(submittedKey))
   return respond(400,{error:'کلید API معتبر نیست؛ کلید کامل OpenAI را بدون فاصله اضافی وارد کن.'});
  const limiter=await db.rpc('menu_rate',{p_key:'admin-ai-key-update:'+uid,p_max:4});
  if(limiter.error||limiter.data!==true)return respond(429,{error:'تعداد تلاش زیاد است؛ کمی بعد دوباره امتحان کن.'});
 }
 // This RPC checks platform_roles + the account's active status, in addition to
 // access_authorize at the API boundary. No secret is ever returned here.
 const result=await db.rpc('mizato_admin_ai_config',{p_uid:uid,p_action:action,p_value:action==='save'?submittedKey:null});
 if(result.error)return respond(action==='save'?503:403,{error:action==='save'?'ذخیره امن کلید در سرور انجام نشد؛ این خطا الزاماً مربوط به قالب کلید نیست. دوباره تلاش کن.':'اجازه مشاهده تنظیمات وجود ندارد.'});
 const stored=result.data;
 const source=stored?.configured?'panel':Deno.env.get('OPENAI_API_KEY')?'server':'none';
 if(path==='/admin/ai-settings/test'){
  const limited=await db.rpc('menu_rate',{p_key:'admin-ai-key-test:'+uid,p_max:5});
  if(limited.error||limited.data!==true)return respond(429,{error:'تعداد تست‌ها بیش از حد مجاز است.'});
  const runtime=await db.rpc('mizato_ai_key_runtime');
  if(runtime.error)return respond(503,{error:'خواندن امن تنظیمات انجام نشد.'});
  const key=runtime.data||Deno.env.get('OPENAI_API_KEY');
  if(!key)return respond(409,{error:'هنوز کلید OpenAI ثبت نشده است.'});
  let answer:Response;
  const timeout=new AbortController();
  const timer=setTimeout(()=>timeout.abort(),20000);
  try{
   answer=await fetch('https://api.openai.com/v1/responses',{method:'POST',signal:timeout.signal,headers:{
    Authorization:'Bearer '+key,'Content-Type':'application/json'
   },body:JSON.stringify({
    model:Deno.env.get('OPENAI_MENU_MODEL')||'gpt-4.1-mini',store:false,max_output_tokens:100,
    input:'Return {"status":"ok"} as valid JSON. This is a Mizato API connection test.',
    text:{format:{type:'json_schema',name:'connection_test',strict:true,
     schema:{type:'object',additionalProperties:false,required:['status'],properties:{status:{type:'string',enum:['ok']}}}
    }}
   })});
  }catch{return respond(502,{error:'ارتباط با OpenAI برقرار نشد.'});}
  finally{clearTimeout(timer);}
  if(answer.status===401)return respond(400,{error:'کلید API توسط OpenAI پذیرفته نشد.'});
  if(answer.status===429)return respond(429,{error:'OpenAI به‌دلیل محدودیت نرخ یا اعتبار حساب پاسخ نداد؛ اعتبار API را بررسی کن.'});
  if(!answer.ok)return respond(502,{error:'تست OpenAI موفق نبود. وضعیت اعتبار حساب و دسترسی مدل را بررسی کن.'});
  const data=await answer.json().catch(()=>null);
  if(data?.status!=='completed')return respond(502,{error:'پاسخ تست OpenAI کامل نبود.'});
  return respond(200,{connected:true,model:Deno.env.get('OPENAI_MENU_MODEL')||'gpt-4.1-mini',
   message:'اتصال API و دسترسی به مدل با موفقیت بررسی شد. مرحله بعد آزمایش یک عکس منو است.'});
 }
 return respond(200,{configured:source!=='none',source,updatedAt:stored?.updatedAt||null,
  ...(method==='POST'?{message:'کلید در مخزن رمزنگاری‌شده ذخیره شد.'}:{})});
}
