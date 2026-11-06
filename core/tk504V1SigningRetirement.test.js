'use strict';
// Real legacy broker, synthetic network only. No server flag is configured.
const assert=require('node:assert/strict');
const api=require('../netlify/functions/exercise-media-url')._internal;
const uid='12345678-1234-4234-8234-123456789abc';
const base='https://example.supabase.co';
const env={SUPABASE_URL:base,SUPABASE_ANON_KEY:'synthetic-public',SUPABASE_SERVICE_ROLE_KEY:'synthetic-service'};
function event(method='POST',body={catalog_id:'TK-000206',type:'video'}){
 return {httpMethod:method,headers:{authorization:'Bearer synthetic-valid-account-token',origin:'https://localhost'},body:JSON.stringify(body)};
}
async function invoke(serverEnv,ev=event()){
 const calls=[];
 const fetch=async(url,opts)=>{
  calls.push({url,opts});
  if(url===base+'/auth/v1/user')return {ok:true,json:async()=>({id:uid})};
  if(url===base+'/storage/v1/object/sign/exercise-media/movekit/v1/video/wall-sit.mp4')
   return {ok:true,json:async()=>({signedURL:'/object/sign/exercise-media/movekit/v1/video/wall-sit.mp4?token=synthetic-token'})};
  throw Error('Unexpected network request');
 };
 api._resetRate();
 const response=await api.handle(ev,{env:serverEnv,fetch,now:()=>1});
 return {response,calls,data:response.body?JSON.parse(response.body):null};
}
let count=0;function ok(value,label){assert(value,label);count++;}
(async()=>{
 let r=await invoke({...env,MOVEKIT_V1_SIGNING_DISABLED:'true'});
 ok(r.response.statusCode===410&&r.data.error==='V1_SIGNING_RETIRED','retired broker rejects a valid-auth known-asset request');
 ok(!r.data.url&&r.calls.length===0,'retirement prevents Auth and Storage calls; no signed URL issued');
 ok(r.response.headers['Cache-Control'].includes('no-store'),'retired response is not cacheable');
 r=await invoke({MOVEKIT_V1_SIGNING_DISABLED:'true'});
 ok(r.response.statusCode===410&&r.calls.length===0,'retirement fails closed even without backend configuration');
 r=await invoke(env);
 ok(r.response.statusCode===200&&r.data.expires_in===300&&r.calls.length===2,'absent server switch preserves existing V1 auth/sign behavior');
 r=await invoke({...env,MOVEKIT_V1_SIGNING_DISABLED:'false'});
 ok(r.response.statusCode===200&&r.calls.filter(x=>x.url.includes('/object/sign/')).length===1,'explicit OFF preserves existing signing');
 r=await invoke(env,event('POST',{catalog_id:'TK-000206',type:'video',MOVEKIT_V1_SIGNING_DISABLED:'true'}));
 ok(r.response.statusCode===200,'client body cannot configure server retirement switch');
 r=await invoke({...env,MOVEKIT_V1_SIGNING_DISABLED:'true'},event('OPTIONS'));
 ok(r.response.statusCode===204&&r.calls.length===0&&r.response.headers['Access-Control-Allow-Origin']==='https://localhost','retirement preserves Android preflight without issuing media');
 r=await invoke({...env,MOVEKIT_V1_SIGNING_DISABLED:'true'},event('GET'));
 ok(r.response.statusCode===405&&r.calls.length===0,'method guard preserved');
 console.log('TK504 V1 signing retirement: '+count+' real-handler synthetic assertions PASS; switch remains unconfigured/default OFF');
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
