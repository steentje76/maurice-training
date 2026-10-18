/* Negative acceptance of Google Health refresh token rotation and Vault persistence.
 * A rotated refresh token must never be acknowledged as securely stored if Vault write failed.
 * All data and HTTP responses are synthetic; no external calls. */
'use strict';
const assert=require('assert');
const {vernieuwGoogleHealthToken}=require('../netlify/functions/_wearableAuthLib.js');
let passed=0;
const J=(data,status=200)=>({ok:status>=200&&status<300,status,json:async()=>data,text:async()=>JSON.stringify(data)});
async function caseRun(label,{rotate=true,failRefresh=false,missingRefreshId=false}={}){
  const previousFetch=global.fetch;
  let updated=[],expiryWrites=0;
  const conn={access_token_secret_id:'access-ref',refresh_token_secret_id:missingRefreshId?null:'refresh-ref'};
  global.fetch=async(url,options={})=>{
    if(url==='https://oauth2.googleapis.com/token')
      return J(Object.assign({access_token:'synthetic-new-access',expires_in:3600},
          rotate?{refresh_token:'synthetic-new-refresh'}:{}));
    if(url.includes('/rpc/update_wearable_token_secret')){
      const payload=JSON.parse(options.body);
      updated.push(payload.p_secret_id);
      return J({},failRefresh&&payload.p_secret_id==='refresh-ref'?500:200);
    }
    if(url.includes('/wearable_connections')&&options.method==='PATCH'){
      expiryWrites++;return J({},204);
    }
    throw new Error('Unexpected request '+url);
  };
  try{
    const result=await vernieuwGoogleHealthToken({
      supabaseUrl:'https://example.invalid',serviceKey:'synthetic-service',
      sbHeaders:{},userId:'11111111-1111-4111-8111-111111111111',
      conn,refreshTokenValue:'synthetic-old-refresh',clientId:'synthetic-client',clientSecret:'synthetic-secret'
    });
    if(rotate&&(failRefresh||missingRefreshId)){
      assert.strictEqual(result.ok,false,label+': rotation persistence failed but was reported success');
      assert.strictEqual(expiryWrites,0,label+': expiry cannot advance after failed rotation');
    }else{
      assert.strictEqual(result.ok,true,label+': expected refresh success');
      assert.strictEqual(expiryWrites,1,label+': expiry not advanced after successful refresh');
    }
    passed++;
  }finally{global.fetch=previousFetch;}
}
(async()=>{
  await caseRun('failed-refresh-vault-update',{failRefresh:true});
  await caseRun('missing-refresh-vault-id',{missingRefreshId:true});
  await caseRun('successful-rotation',{});
  await caseRun('access-only-refresh',{rotate:false});
  console.log('fWearableRefreshRotationPersistence: '+passed+' geslaagd, 0 mislukt');
  console.log('Resultaat: '+passed+' geslaagd, 0 mislukt');
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
