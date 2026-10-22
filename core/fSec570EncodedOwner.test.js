/* SEC-570-03B: independent account-isolation probes for multiply-percent-encoded owner information. */
'use strict';
const assert=require('node:assert/strict');
const B=require('./localBackup.js'),I=require('./localInventory.js');
const A='user_aaaaaaaa',Z='user_bbbbbbbb';
const percent=(s,n)=>{for(let i=0;i<n;i++)s=encodeURIComponent(s);return s;};
const pack=(q)=>B.prepare({owner:A,cacheOwner:A,manifest:I.BRONNEN,local:{},queue:[q]});
const q=(body,filter)=>({id:1,owner_uid:A,table:'sessions',method:filter?'PATCH':'POST',body,...(filter?{filter}:{})});
let pass=0;
const check=(label,value)=>{assert(value,label);pass++;console.log('PASS '+label);};
for(const n of [2,3,4]){
 const original=q({id:'x',note:percent(JSON.stringify({user_id:Z}),n)});
 const before=JSON.stringify(original);const d=pack(original);
 check('foreign embedded owner in '+n+' encoded layers excluded',d.entries.length===0&&d.omissions.length>0);
 check('original owner payload preserved '+n,before===JSON.stringify(original));
}
for(const n of [2,3,4]){
 const original=q({id:'x'},percent('user_id=eq.'+Z,n));
 const d=pack(original);
 check('foreign owner in '+n+' encoded filter layers excluded',d.entries.length===0&&d.omissions.length>0);
}
const maskedKey=Array.from('user_id',c=>'%'+c.charCodeAt(0).toString(16).padStart(2,'0')) .join('');
const maskedFilter=encodeURIComponent(maskedKey)+'=eq.'+Z;
const m=pack(q({id:'x'},maskedFilter));
check('foreign owner with every key letter escaped through two percent levels excluded',m.entries.length===0&&m.omissions.length>0);
check('valid own owner in 2 encoded JSON layers retained',pack(q({id:'x',note:percent(JSON.stringify({user_id:A}),2)})).entries.length===1);
check('valid own owner in raw filter retained',pack(q({id:'x'},'user_id=eq.'+A)).entries.length===1);
const exceeded=pack(q({id:'x',note:percent(JSON.stringify({user_id:Z}),6)}));
check('more than 4 layers fail closed',exceeded.entries.length===0&&exceeded.omissions.some(o=>o.reason==='payload_unverifiable'));
console.log('SEC-570-03B: '+pass+'/'+pass);
