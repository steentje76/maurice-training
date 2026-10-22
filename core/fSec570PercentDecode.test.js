/* SEC-570-03A — onafhankelijke regressies van dubbele / geneste URL-codering. Synthetische waarden. */
'use strict';
const assert=require('node:assert/strict');
const B=require('./localBackup.js'),I=require('./localInventory.js');
const A='user_aaaaaaaa', SECRET='INERT-PERCENT-CANARY-ONLY';
const pack=(queue=[],local={})=>B.prepare({owner:A,cacheOwner:A,manifest:I.BRONNEN,queue,local});
const queue=(note,filter)=>[{id:1,owner_uid:A,table:'sessions',method:filter?'PATCH':'POST',body:{id:'s1',user_id:A,note},...(filter?{filter}:{})}];
const layers=(str,n)=>{for(let k=0;k<n;k++)str=encodeURIComponent(str);return str;};
let passed=0;
function check(label,fn){assert(fn(),label);passed++;console.log('PASS '+label);}
for(const n of [1,2,3,4]){
 const encoded=layers(JSON.stringify({refresh_token:SECRET}),n);
 const original=queue(encoded), before=JSON.stringify(original), d=pack(original);
 check('Q'+n+' queue with '+n+' encoded layers excluded',()=>d.entries.every(x=>x.storage!=='offline_queue')&&!JSON.stringify(d.entries).includes(SECRET));
 check('Q'+n+' queue not mutated',()=>before===JSON.stringify(original));
}
for(const n of [2,3]){
 const encoded=layers('refresh_token='+SECRET,n);
 const d=pack(queue('safe note','id=eq.s1&note=eq.'+encoded));
 check('F'+n+' multi-encoded credential in filter excluded',()=>d.entries.every(x=>x.storage!=='offline_queue'));
}
const local=pack([],{sel_rowing:'memo '+layers(JSON.stringify({refresh_token:SECRET}),2)});
check('L2 twice encoded secret in localStorage excluded',()=>local.entries.every(e=>e.key!=='sel_rowing')&&local.omissions.some(o=>o.reason==='credential_in_text'));
const six=pack(queue(layers(JSON.stringify({refresh_token:SECRET}),6)));
check('D6 above decode limit fails closed',()=>six.entries.every(x=>x.storage!=='offline_queue')&&six.omissions.some(o=>o.reason==='payload_unverifiable'));
const deepLocal=pack([],{sel_rowing:'memo '+layers(JSON.stringify({refresh_token:SECRET}),6)});
check('L6 >4 encoding layers in localStorage fail closed',()=>deepLocal.entries.every(x=>x.key!=='sel_rowing')&&deepLocal.omissions.some(o=>o.reason==='payload_unverifiable'));
const normal=pack(queue('100% ready; workout done'));
check('P positive harmless percent text survives',()=>normal.entries.some(x=>x.storage==='offline_queue'));
const valid=pack(queue(layers(JSON.stringify({sets:3,reps:8}),2)));
check('P valid nested encoded JSON without secrets survives',()=>valid.entries.some(x=>x.storage==='offline_queue'));
console.log('SEC-570-03A: '+passed+'/'+passed);
