/* PR #534: Vault must never delete secrets referenced by a committed upsert
 * when the HTTP acknowledgement is lost (unknown commit outcome). */
'use strict';
const assert=require('assert');
const vault=require('../netlify/functions/wearableTokenVault.js');
const UID='11111111-1111-4111-8111-111111111111';
let passed=0;
function J(x,status=200){return {ok:status>=200&&status<300,status,json:async()=>x};}
async function scenario(label,{upsert='ack-lost-commit',readbackFails=false}={}){
 const secrets=new Map([
  ['old-access','old-at'],['old-refresh','old-rt']
 ]);
 let seq=0,reads=0,deleted=[],pendingCommit=null;
 let conn={access_token_secret_id:'old-access',refresh_token_secret_id:'old-refresh'};
 const beforeFetch=global.fetch;
 global.fetch=async (url,opt={})=>{
  const method=opt.method||'GET';
  if(url.includes('/rpc/store_wearable_token_secret')){
   const b=JSON.parse(opt.body);const id='new-secret-'+(++seq);
   secrets.set(id,b.p_secret);return J(id);
  }
  if(url.includes('/rpc/delete_wearable_token_secret')){
   const id=JSON.parse(opt.body).p_secret_id;deleted.push(id);secrets.delete(id);
   return J(null);
  }
  if(url.includes('/rpc/cleanup_orphan_wearable_token_secrets'))return J(0);
  if(url.includes('/wearable_connections')&&method==='GET'){
   reads++;
   if(readbackFails&&reads>1)throw new Error('readback network down');
   return J(conn?[conn]:[]);
  }
  if(url.includes('/wearable_connections')&&method==='POST'){
   if(upsert==='reject')return J({code:'23505'},409);
   if(upsert==='server-500-commit'){conn=Object.assign({},JSON.parse(opt.body));return J({code:'XX000'},500);}
   if(upsert==='server-500-no-commit')return J({code:'XX000'},500);
   if(upsert==='ack-lost-commit') {conn=Object.assign({},JSON.parse(opt.body));throw new Error('lost HTTP acknowledgement after database COMMIT');}
   if(upsert==='ack-lost-no-commit')throw new Error('lost HTTP acknowledgement before database COMMIT');
   if(upsert==='delayed-commit'){pendingCommit=Object.assign({},JSON.parse(opt.body));throw new Error('HTTP disconnected while insert in flight');}
   conn=Object.assign({},JSON.parse(opt.body));return J(null,201);
  }
  throw new Error('unexpected request '+method+' '+url);
 };
 try{
  const result=await vault.vervangWearableTokens({
   supabaseUrl:'https://example.invalid',serviceKey:'test-service-key',
   userId:UID,provider:'google_health',prefix:'wearable',
   accessToken:'synthetic-access',refreshToken:'synthetic-refresh',velden:{scope:'fitness'}
  });
  if(pendingCommit)conn=pendingCommit; // Simuleer commit die PAS na mislukte readback plaatsvindt.
  assert(conn,'connection row must remain');
  assert(secrets.has(conn.access_token_secret_id),label+': active access-secret was deleted: '+JSON.stringify({result,deleted,conn}));
  assert(secrets.has(conn.refresh_token_secret_id),label+': active refresh-secret was deleted: '+JSON.stringify({result,deleted,conn}));
  if(upsert==='ack-lost-commit'||upsert==='server-500-commit'){
   if(readbackFails){
    assert.strictEqual(result.ok,false,label+': unknown status may not be reported as confirmed');
    assert.strictEqual(result.fase,'koppeling_onzeker',label+': uncertainty must be explicit');
   } else assert.strictEqual(result.ok,true,label+': committed new connection must be recognized');
  } else if(upsert==='ack-lost-no-commit'||upsert==='server-500-no-commit'){
   assert.strictEqual(result.fase,'koppeling_onzeker',label+': uncertainty must be explicit');
   assert.strictEqual(result.ok,false,label+': unconfirmed attempt must not be reported as a success');
   assert.strictEqual(conn.access_token_secret_id,'old-access',label+': original connection should remain active');
  } else if(upsert==='delayed-commit'){
   assert.strictEqual(result.ok,false,label+': delayed commit must not be reported confirmed');
   assert.strictEqual(result.fase,'koppeling_onzeker',label+': keep the outcome unknown');
  } else if(upsert==='reject'){
   assert.strictEqual(result.ok,false,label+': definitive error must return failure');
   assert.strictEqual(secrets.size,2,label+': definitive error should roll back new secrets');
  }
  passed++;
 }finally{global.fetch=beforeFetch;}
}
(async()=>{
 await scenario('committed-then-lost-response');
 await scenario('committed-then-readback-fails',{readbackFails:true});
 await scenario('uncommitted-lost-response',{upsert:'ack-lost-no-commit'});
 await scenario('server-500-after-commit',{upsert:'server-500-commit'});
 await scenario('server-500-before-commit',{upsert:'server-500-no-commit'});
 await scenario('in-flight-delayed-commit',{upsert:'delayed-commit'});
 await scenario('definitive-rejection',{upsert:'reject'});
 console.log('fWearableUnknownCommitOutcome: '+passed+' geslaagd, 0 mislukt');
 console.log('Resultaat: '+passed+' geslaagd, 0 mislukt');
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
