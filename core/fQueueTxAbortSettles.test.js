/* TK-REL-SEC-04 — een IndexedDB-transactie die tijdens commit afbreekt (bv. QuotaExceededError)
 * vuurt alleen 'abort', niet 'error' of 'complete'. offlineQueueAdd()/offlineQueueRemove() moeten dan
 * eindigen met false (fail-closed), niet eeuwig hangen: een hangende remove blokkeert flushOfflineQueue()
 * (_flushBezig blijft true) en een hangende add laat het opslaan van een set nooit eindigen.
 * Onafhankelijk ook gereproduceerd tegen een spec-conforme IndexedDB (fake-indexeddb) in de review.
 * Draait de ONGEWIJZIGDE productiefuncties uit index.html. */
'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const i=html.indexOf('async function offlineQueueAdd(item'),j=html.indexOf('// sbPostQ/sbPatchQ: als sbPost/sbPatch',i);
assert(i>=0&&j>i,'brongrenzen niet gevonden');
// Een hangende promise laat Node met exit 0 stoppen zonder verdere asserties: dat telt als FAIL.
let klaar=false;process.on('exit',()=>{if(!klaar){console.error('FAIL niet alle scenario\'s afgerond (hangende promise)');process.exitCode=1;}});
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
  // Fail-closed lezers uit PR #555 die in de bestaande suites ongedekt bleven (mutatie-overlevers).
  const blk=(a,b)=>{const x=html.indexOf(a),y=html.indexOf(b,x+a.length);assert(x>=0&&y>x,'brongrenzen niet gevonden: '+a);return html.slice(x,y);};
  {
    const tx={objectStore:()=>({getAll:()=>({})})};
    const c={OFFLINE_STORE:'queue',offlineDb:async()=>({transaction:()=>{setTimeout(()=>{tx.onabort&&tx.onabort();},5);return tx;}})};
    vm.createContext(c);vm.runInContext(blk('async function tkLeesWachtrijStrikt(){','async function tkUpdateGereedheid(){'),c);
    const s=await within(c.tkLeesWachtrijStrikt(),500);
    check('tkLeesWachtrijStrikt: alleen-abort → reject (niet hangen, niet leeg)',s!=='HANG'&&s.e!==undefined);
  }
  {
    const c={TK_WACHTRIJ_OUDERS:{sessions:[['exercise_id','exercises']]},tkHuidigeUid:()=>'A',
      tkLeesWachtrijStrikt:async()=>{throw new Error('IDB abort');}};
    vm.createContext(c);vm.runInContext(blk('function tkOuderSleutels(t,body){','// Eigenaar van een write:')+blk('async function tkWachtrijHeeftOuder(t,body){','// Sprint 7 (Track D): een foutbericht'),c);
    check('tkWachtrijHeeftOuder: onleesbare wachtrij → ouder aangenomen (kind gaat de wachtrij in)',await c.tkWachtrijHeeftOuder('sessions',{exercise_id:'ex1'})===true);
  }
  {
    const el={textContent:'',style:{display:'none'}};
    const c={document:{getElementById:id=>id==='offline-badge'?el:null},tkTrainingenOnbevestigd:()=>[],
      tkLeesWachtrijStrikt:()=>Promise.reject(new Error('IDB abort'))};
    vm.createContext(c);vm.runInContext(blk('function updateOfflineBadge(){','// Korte, leesbare omschrijving'),c);
    c.updateOfflineBadge();await new Promise(r=>setTimeout(r,20));
    check('updateOfflineBadge: onleesbare wachtrij → zichtbaar "onbekend", niet verborgen',el.style.display==='block'&&/onbekend/i.test(el.textContent));
  }
  klaar=true;
  console.log('TK-REL-SEC-04: '+pass+'/'+pass);
})().catch(e=>{console.error('FAIL',e&&e.message||e);process.exitCode=1;});
