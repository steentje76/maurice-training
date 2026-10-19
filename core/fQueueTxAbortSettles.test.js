/* TK-REL-SEC-04 — een IndexedDB-transactie die tijdens commit afbreekt (bv. QuotaExceededError)
 * vuurt alleen 'abort', niet 'error' of 'complete'. offlineQueueAdd()/offlineQueueRemove() moeten dan
 * eindigen met false (fail-closed), niet eeuwig hangen: een hangende remove blokkeert flushOfflineQueue()
 * (_flushBezig blijft true) en een hangende add laat het opslaan van een set nooit eindigen.
 * Onafhankelijk ook gereproduceerd tegen een spec-conforme IndexedDB (fake-indexeddb) in de review.
 * Draait de ONGEWIJZIGDE productiefuncties uit index.html. */
'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const i=html.indexOf('async function offlineQueueAdd(item){'),j=html.indexOf('// sbPostQ/sbPatchQ: als sbPost/sbPatch',i);
assert(i>=0&&j>i,'brongrenzen niet gevonden');
let pass=0;const check=(l,ok)=>{assert(ok,l);pass++;console.log('PASS',l);};
const within=(p,ms)=>Promise.race([p.then(v=>({v}),e=>({e})),new Promise(r=>setTimeout(()=>r('HANG'),ms))]);
function ctx(){
  const tx={error:{name:'QuotaExceededError'},objectStore:()=>({add(){return {};},delete(){return {};}})};
  const c={console:{error(){},warn(){},log(){}},OFFLINE_STORE:'queue',tkEigenaarUid:()=>'A',
    offlineDb:async()=>({transaction:()=>{setTimeout(()=>{ if(typeof tx.onabort==='function')tx.onabort(); },5);return tx;}})};
  vm.createContext(c);vm.runInContext(html.slice(i,j),c);return c;
}
(async()=>{
  const a=await within(ctx().offlineQueueAdd({table:'sessions',method:'POST',body:{id:'x'}}),500);
  check('offlineQueueAdd eindigt bij commit-abort met false',a!=='HANG'&&a.v===false);
  const r=await within(ctx().offlineQueueRemove(1),500);
  check('offlineQueueRemove eindigt bij commit-abort met false (flush raakt niet geblokkeerd)',r!=='HANG'&&r.v===false);
  console.log('TK-REL-SEC-04: '+pass+'/'+pass);
})().catch(e=>{console.error('FAIL',e&&e.message||e);process.exitCode=1;});
