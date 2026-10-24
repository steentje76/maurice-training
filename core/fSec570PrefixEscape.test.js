/* SEC-570-05: regression for review G1 (prefixed JSON) and G2 (malformed Unicode JSON).
 * Synthetic canary only; original records and the actual offline queue are never modified. */
'use strict';
const assert=require('node:assert/strict');
const B=require('./localBackup.js'),I=require('./localInventory.js');
const A='user_aaaaaaaa',CANARY='INERT-SEC57005-CANARY';
const encode=(s,n)=>{while(n--)s=encodeURIComponent(s);return s;};
let checks=0;
function run(note,local=false){
 const queue=[{id:1,owner_uid:A,table:'sessions',method:'POST',body:{user_id:A,note}}];
 const before=JSON.stringify(queue);
 const d=B.prepare({owner:A,cacheOwner:A,manifest:I.BRONNEN,local:local?{sel_rowing:note}:{},queue:local?[]:queue});
 assert.equal(JSON.stringify(queue),before,'source queue unchanged');
 return d;
}
for(const prefix of ['x=','note: ','prefix before JSON ']){
 for(const layers of [0,1,2,3,4]){
  for(const local of [false,true]){
   const note=encode(prefix+'{"pass\\u0077ord":"'+CANARY+'"}',layers),d=run(note,local);
   assert.equal(d.entries.length,0,'G1 prefixed escaped secret must be omitted');
   assert(d.omissions.some(x=>x.reason==='payload_unverifiable'||x.reason==='credential_in_text'));
   assert(!JSON.stringify(d.entries).includes(CANARY));checks++;
  }
 }
}
for(const layers of [0,1,2,3,4]){
 const d=run(encode('{"pass\\u0077ord":"'+CANARY+'",}',layers));
 assert.equal(d.entries.length,0,'G2 malformed Unicode JSON must fail closed');
 assert(d.omissions.some(x=>x.reason==='payload_unverifiable'));checks++;
}
for(const note of ['x={"sets":3}','Vrije tekst: 100% inzet','{"name":"Caf\\u00e9","sets":3}']){
 const d=run(note);assert.equal(d.entries.length,1,'legitimate plain/prefixed/Unicode training kept');
 assert.equal(d.omissions.length,0);checks++;
}
console.log('SEC-570-05 '+checks+'/'+checks);
