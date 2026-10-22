/* TK-REL-SEC-11 — één flush tegelijk over tabs/vensters heen (heracceptatie 19-10-2026).
 * _flushBezig geldt per JavaScript-context. Twee tabs (of PWA + browsertab) delen dezelfde IndexedDB-wachtrij
 * en konden hetzelfde item gelijktijdig versturen: voor tabellen zonder client-id een dubbele rij.
 *  L1 met Web Locks: de tweede tab verstuurt niets terwijl de eerste flusht; elk item precies één keer;
 *  L2 zonder Web Locks (oude WebView): ongewijzigd gedrag, flush werkt;
 *  L3 na afloop van de eerste flush kan een volgende flush weer (lock wordt vrijgegeven, ook bij een fout).
 * Draait de ONGEWIJZIGDE flushOfflineQueue() uit index.html in twee aparte contexten. */
'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const i=html.indexOf('let _flushBezig=false;'),j=html.indexOf('// DEV-UPDATE-01',i);
const a=html.indexOf('async function flushOfflineQueue(){'),b=html.indexOf('function updateOfflineBadge(){',a);
assert(i>0&&j>i&&a>0&&b>a,'brongrenzen niet gevonden');
const SRC=html.slice(i,j)+'\n'+html.slice(a,b);
let klaar=false,n=0;
process.on('exit',()=>{if(!klaar){console.error('FAIL niet alle scenario\'s afgerond (hangende promise)');process.exitCode=1;}});
const check=(ok,label)=>{assert(ok,label);n++;console.log('PASS',label);};
const tick=()=>new Promise(r=>setImmediate(r));

// Minimale, spec-getrouwe Web Locks (exclusive + ifAvailable) gedeeld door beide "tabs".
function maakLocks(){
  const bezet=new Set();
  return {request:async(naam,opts,cb)=>{
    if(typeof opts==='function'){cb=opts;opts={};}
    if(bezet.has(naam)){ if(opts.ifAvailable) return cb(null); throw new Error('niet ondersteund in test'); }
    bezet.add(naam);try{return await cb({name:naam});}finally{bezet.delete(naam);}
  }};
}
function tab(gedeeld,locks){
  const ctx={console:{log(){},warn(){},error(){}},navigator:locks?{onLine:true,locks}:{onLine:true},
    authSession:{user:{id:'A'}},SB_URL:'https://sb.invalid',IDEMPOTENT_TABELLEN_MET_CLIENT_ID:{},
    tkHuidigeUid:()=>'A',tkOuderSleutels:()=>[],tkLogRpcOffline(){},tkFoutcode:()=>'',toast(){},updateOfflineBadge(){},
    renderOfflineQueueModal(){},document:{getElementById:()=>null},syncCustomTrainingsFromSupabase:async()=>{},
    tkLeesWachtrijStrikt:async()=>gedeeld.queue.slice(),
    offlineQueueRemove:async id=>{gedeeld.queue=gedeeld.queue.filter(x=>x.id!==id);return true;},
    sbFetch:(url,o)=>new Promise(res=>{gedeeld.sent.push(o.body&&o.body.naam);gedeeld.wacht.push(()=>res({ok:true,status:201,text:async()=>''}));})};
  vm.createContext(ctx);vm.runInContext(SRC,ctx);return ctx;
}
function nieuw(){return {queue:[{id:1,owner_uid:'A',table:'goals',method:'POST',body:{naam:'doel-1'}},{id:2,owner_uid:'A',table:'goals',method:'POST',body:{naam:'doel-2'}}],sent:[],wacht:[]};}
async function draai(locks,g){
  g=g||nieuw();
  const t1=g.t1||tab(g,locks),t2=tab(g,locks);g.t1=t1;
  const p1=t1.flushOfflineQueue(),p2=t2.flushOfflineQueue();
  for(let k=0;k<200&&(g.queue.length||g.wacht.length);k++){await tick();const w=g.wacht.shift();if(w)w();}
  await Promise.all([p1,p2]);return g;
}
async function main(){
  const locks=maakLocks();
  const g=await draai(locks);
  check(g.sent.length===2&&g.sent.filter(x=>x==='doel-1').length===1,'L1 met Web Locks: elk item precies één keer verstuurd over twee tabs');
  const g3=await draai(locks);
  check(g3.sent.length===2&&g3.queue.length===0,'L3 lock vrijgegeven: een volgende flush verwerkt de wachtrij weer');
  // L4 — dezelfde tab flusht opnieuw (vlag moet vrij zijn), terwijl een tweede tab tegelijk flusht.
  const herhaal=nieuw();await draai(locks,herhaal);
  herhaal.queue=[{id:5,owner_uid:'A',table:'goals',method:'POST',body:{naam:'doel-5'}}];herhaal.sent=[];
  await draai(locks,herhaal);
  check(herhaal.sent.length===1,'L4 na een eerdere flush blijft dezelfde tab tab-overstijgend exclusief');
  const g2=await draai(null);
  check(g2.queue.length===0,'L2 zonder Web Locks: flush werkt zoals voorheen');
  klaar=true;console.log('TK-REL-SEC-11: '+n+'/'+n);
}
main().catch(e=>{console.error('FAIL',e&&e.message||e);process.exitCode=1;});
