/* SEC-570-04: F1 encoded JSON, F2 credential key variants, F4 valid filter compatibility. */
'use strict';
const assert=require('node:assert/strict');
const B=require('./localBackup.js'), I=require('./localInventory.js');
const A='user_aaaaaaaa', X='INERT-SEC57004-CANARY', table='sessions';
const prep=(queue=[],local={})=>B.prepare({owner:A,cacheOwner:A,manifest:I.BRONNEN,queue,local});
const record=(body,extra={})=>Object.assign({id:1,owner_uid:A,table,method:'POST',body:{id:'s1',user_id:A,...body}},extra);
const encode=(x,n=1)=>{let result=x;for(let i=0;i<n;i++)result=encodeURIComponent(result);return result;};
const contents=d=>JSON.stringify(d.entries);
let n=0;function check(cond,label){assert(cond,label);n++;console.log('PASS',label);}
const protects=(name,body,local)=>{const d=local?prep([],{sel_rowing:body}):prep([record({note:body})]);check(!contents(d).includes(X)&&d.entries.length===0&&d.omissions.length>0,name);};
const encJson=[
 ['F1 unicode escaped refresh_token', '{"refresh\\u005ftoken":"'+X+'"}'],
 ['F1 unicode escaped password', '{"pass\\u0077ord":"'+X+'"}'],
 ['F1 credential legacy table', '{"table":"wearable_connections","body":{"value":"'+X+'"}}'],
 ['F1 credential RPC function', '{"function":"store_oauth_state","args":{"value":"'+X+'"}}'],
 ['F1 credential key variant', '{"auth_token":"'+X+'"}']
];
for(const [label,str] of encJson)for(const times of [1,2,3]){
 protects(label+' URL layers='+times,encode(str,times));
}
protects('F1 localStorage encoded escaped credential',encode('{"refresh\\u005ftoken":"'+X+'"}',2),true);
protects('F1 nested encoded JSON string',JSON.stringify({metadata:encode('{"pass\\u0077ord":"'+X+'"}',2)}));
for(const key of ['auth_token','authToken','api_token','sessionToken','idToken','privateKey','tokenHash','x-api-key','bearer_token','password_hash','jwt']){
 const d=prep([record({[key]:X,reps:5})]);
 check(!contents(d).includes(X)&&d.entries.length===1&&d.entries[0].redacted===true&&d.entries[0].value.body.reps===5,'F2 redacted '+key);
}
const f4=prep([record({reps:5},{method:'PATCH',filter:'id=eq.s1&note=eq.100%25'})]);
check(f4.entries.length===1&&f4.omissions.length===0,'F4 valid encoded percent 100%25 kept');
const f4b=prep([record({reps:5},{method:'PATCH',filter:'id=eq.s1&note=eq.100%25&user_id=eq.'+A})]);
check(f4b.entries.length===1&&f4b.omissions.length===0,'F4 valid percent and own owner kept');
const foreign=prep([record({reps:5},{method:'PATCH',filter:'id=eq.s1&user_id=eq.user_bbbbbbbb&note=eq.100%25'})]);
check(foreign.entries.length===0,'F4 foreign owner still rejected');
const good=prep([record({name:'Training met 5 sets',reps:5,metadata:JSON.stringify({sets:3,rounds:4})})]);
check(good.entries.length===1&&good.omissions.length===0,'valid training preserved');
console.log('SEC-570-04 '+n+'/'+n);
