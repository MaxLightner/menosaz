// @ts-nocheck
export async function otpyRequest(apiKey:string,path:'send'|'verify',body:Record<string,string>){const response=await fetch('https://api.otpy.ir/v1/otp/'+path,{method:'POST',headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});const data=await response.json().catch(()=>null);if(!response.ok){const error=new Error(response.status===429?'ارسال کد محدود شده؛ کمی بعد تلاش کن.':'سرویس پیامک پاسخ موفق نداد؛ بعداً تلاش کن.');(error as any).status=response.status===429?429:502;throw error;}return data;}
export async function nativePhoneSession(db:any,client:any,phone:string){const lookup=await db.rpc('menu_phone_identity',{p_phone:phone});if(lookup.error)throw Error('پایگاه احراز هویت آماده نیست.');let id=lookup.data,user;
 if(!id){const created=await db.auth.admin.createUser({phone,phone_confirm:true});if(created.error){const again=await db.rpc('menu_phone_identity',{p_phone:phone});if(!again.data)throw Error('ساخت حساب انجام نشد.');id=again.data;}else{id=created.data.user.id;user=created.data.user;}}
 if(!user){const found=await db.auth.admin.getUserById(id);if(found.error)throw Error('حساب پیدا نشد.');user=found.data.user;}
 if(String(user.phone).replace(/^\+/,'')!==phone.replace(/^\+/,''))throw Error('هویت حساب مطابقت ندارد.');
 // OTPy has already verified ownership. Use a server-only native Auth exchange;
 // no password or access token is invented, and the account keeps the same UID.
 if(!user.email||!user.phone_confirmed_at){const email=user.email||`phone-${id}@auth.menosaz.invalid`;const updated=await db.auth.admin.updateUserById(id,{email,email_confirm:true,phone_confirm:true});if(updated.error)throw Error('آماده‌سازی نشست انجام نشد.');user=updated.data.user;}
 const link=await db.auth.admin.generateLink({type:'magiclink',email:user.email});if(link.error||link.data.user?.id!==id||!link.data.properties?.hashed_token)throw Error('ساخت نشست امن انجام نشد.');
 const verified=await client.auth.verifyOtp({token_hash:link.data.properties.hashed_token,type:'magiclink'});if(verified.error||verified.data.user?.id!==id||!verified.data.session)throw Error('ورود انجام نشد.');return verified.data;
}
