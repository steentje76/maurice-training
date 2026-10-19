/* TK-REL-SEC-03 — accountisolatie in de zichtbare wachtrij (onafhankelijke review, 19-10-2026).
 * flushOfflineQueue() verstuurt sinds PR #555 alleen items met owner_uid === ingelogde gebruiker.
 * De UI-paden rond dezelfde IndexedDB-wachtrij moeten dezelfde grens respecteren:
 *  U1 Home/Logboek toont alleen eigen wachtende sets (geen sets van een vorig of onbekend account);
 *  U2 het wachtrijscherm toont geen inhoud van andermans/eigenaarloze items en biedt daar geen verwijderknop;
 *  U3 removeOfflineQueueItem() verwijdert nooit een item van een ander of onbekend account;
 *  U4 deleteSessionDirect('pending_…') verwijdert nooit een item van een ander account;
 *  U5 een onleesbare wachtrij wordt niet als "geen items" getoond.
 * Draait de ONGEWIJZIGDE productiefuncties uit index.html. Geen database- of productiecontact. */
'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const block=(a,b)=>{const i=html.indexOf(a),j=html.indexOf(b,i+a.length);assert(i>=0&&j>i,'brongrenzen niet gevonden: '+a);return html.slice(i,j);};
const SRC=[
  block('function tkIsEigenWachtrijItem(item){','// ══'),
  block('async function getPendingSessionRows(){',"window.addEventListener('online',flushOfflineQueue);"),
  block('async function deleteSessionDirect(id){','function addSetToDate(')
].join('\n');
let pass=0;const check=(l,ok)=>{assert(ok,l);pass++;console.log('PASS',l);};

function maak(uid,items,opts={}){
  const el={innerHTML:''};const removed=[];const toasts=[];
  const ctx={
    console:{log(){},warn(){},error(){}},authSession:uid?{user:{id:uid}}:null,
    tkHuidigeUid:()=>(ctx.authSession&&ctx.authSession.user)?ctx.authSession.user.id:null,
    offlineQueueAll:async()=>opts.readFails?[]:items.slice(),
    tkLeesWachtrijStrikt:async()=>{if(opts.readFails)throw new Error('IDB abort');return items.slice();},
    offlineQueueRemove:async id=>{removed.push(id);return true;},
    confirmModal:async()=>true,updateOfflineBadge(){},refreshHome(){},loadHistory(){},toast:m=>toasts.push(m),
    document:{getElementById:id=>id==='offline-queue-list'?el:null},
    tkTrainingenOnbevestigd:()=>[],customTrainings:[],exercises:[],
    escHtml:s=>String(s),describeOfflineQueueItem:i=>'item:'+i.table+':'+(i.body&&i.body.exercise_id||i.function||''),
    Date
  };
  vm.createContext(ctx);vm.runInContext(SRC,ctx);
  return {ctx,el,removed,toasts};
}
const it=(id,owner,ex)=>({id,owner_uid:owner,ts:0,table:'sessions',method:'POST',body:{id:'s'+id,exercise_id:ex,date:'2026-10-19'}});
const ITEMS=[it(1,'A','ex-van-A'),it(2,undefined,'ex-legacy'),it(3,'B','ex-van-B')];

(async()=>{
  {const {ctx}=maak('B',ITEMS);const rows=await ctx.getPendingSessionRows();
   check('U1 pending-rijen bevatten alleen eigen items',rows.length===1&&rows[0].exercise_id==='ex-van-B');}
  {const {ctx,el}=maak('B',ITEMS);await ctx.renderOfflineQueueModal();
   check('U2 wachtrijscherm toont geen inhoud van ander/eigenaarloos item',el.innerHTML.indexOf('ex-van-A')<0&&el.innerHTML.indexOf('ex-legacy')<0&&el.innerHTML.indexOf('ex-van-B')>=0);
   check('U2 alleen eigen item heeft een verwijderknop',(el.innerHTML.match(/removeOfflineQueueItem\(/g)||[]).length===1);
   check('U2 aanwezigheid van niet-eigen items blijft zichtbaar (geen stille verberging)',/2 item/.test(el.innerHTML));}
  {const {ctx,removed}=maak('B',ITEMS);await ctx.removeOfflineQueueItem(1);await ctx.removeOfflineQueueItem(2);
   check('U3 verwijderen van item van A of eigenaarloos item als B wordt geweigerd',removed.length===0);
   await ctx.removeOfflineQueueItem(3);check('U3 eigen item mag wel worden verwijderd',removed.length===1&&removed[0]===3);}
  {const {ctx,removed}=maak('B',ITEMS);await ctx.deleteSessionDirect('pending_1');
   check('U4 pending-sessie van A kan door B niet worden verwijderd',removed.length===0);
   await ctx.deleteSessionDirect('pending_3');check('U4 eigen pending-sessie wel',removed.length===1&&removed[0]===3);}
  {const {ctx,el}=maak('B',ITEMS,{readFails:true});await ctx.renderOfflineQueueModal();
   check('U5 onleesbare wachtrij wordt niet als leeg getoond',el.innerHTML.indexOf('Geen items wachtend op sync')<0&&/niet leesbaar/i.test(el.innerHTML));}
  console.log('TK-REL-SEC-03: '+pass+'/'+pass);
})().catch(e=>{console.error('FAIL',e&&e.message||e);process.exitCode=1;});
