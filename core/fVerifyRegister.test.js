/* TK-REL-SEC-22 — lokaal verificatieregister (read-after-write fase 2, 19-10-2026).
 * Elke ondersteunde write (sbPostQ, sbPatchQ, sbDelQ en de detailvarianten) legt in een APARTE IndexedDB-database
 * (tk_verificatie/register) vast: eigenaar, tabel, record-id, verwachte inhoud, revisie, ouder, status. De offline-
 * wachtrij (maurice_offline/queue) wordt niet aangeraakt. Een opslagfout is zichtbaar en fail-closed (defect).
 *  G1 bevestigde insert → revisie 1, SERVER_ACCEPTED, verwachte velden zonder id/eigenaar, ouderrelatie;
 *  G2 PATCH op id → revisie 2, verwachting aangevuld; een eerdere verificatie vervalt (status_revisie leeg);
 *  G3 DELETE op id → revisie 3, verwijderd;
 *  G4 offline gequeued → status QUEUED, onder de eigenaar van de write;
 *  G5 DELETE van alle kinderen van één ouder → elk geregistreerd kind verwijderd;
 *  G6 write die niet aan één record te koppelen is → teller "niet verifieerbaar";
 *  G7 ignore-duplicates op een bekende rij overschrijft de verwachting niet;
 *  G8 samengestelde sleutel (activity_laps: activity_id + lap_index) zonder client-id;
 *  G9 opslagfout (database niet te openen, transactie breekt af) → defect-markering; de write zelf blijft bevestigd;
 *  G10 de offline-wachtrijdatabase wordt niet aangemaakt of gewijzigd door het register;
 *  G11 tabel buiten de ondersteunde set → geen registeritem;
 *  G12 compare-and-set PATCH die 0 rijen raakte → geen registeritem;
 *  G13 een registerfout maakt de updategereedheid onbekend (niet veilig);
 *  G14 fout binnen een transactiehandler (put gooit) → transactie afgebroken, defect-markering, niets half opgeslagen.
 * Draait de ECHTE schrijflaag en het ECHTE registerblok uit index.html. */
'use strict';
const assert=require('assert');
const {maak,grab,db,koppel}=require('./fixtures/schrijfHarnas');
const {maakIndexedDb}=require('./fixtures/miniIndexedDb');
let klaar=false,n=0;
process.on('exit',()=>{if(!klaar){console.error('FAIL niet alle scenario\'s afgerond (hangende promise)');process.exitCode=1;}});
const check=(ok,label)=>{assert(ok,label);n++;console.log('PASS',label);};
const BLOK=grab('// SERVER READ-AFTER-WRITE, FASE 2','function updateOfflineBadge(){');
const wacht=ms=>new Promise(r=>setTimeout(r,ms));
// Wacht tot een voorwaarde waar is (max. 2 s): de registerhaak loopt asynchroon na de write, ook onder CI-belasting.
const tot=async(fn)=>{ for(let i=0;i<100&&!fn();i++)await wacht(20); return fn(); };
function opzet(o){
  o=o||{};
  const idb=maakIndexedDb(o.fouten);
  const h=maak({extraSrc:BLOK,login:o.login,online:o.online,ctx:Object.assign({indexedDB:idb,ServerVerificationCore:require('./serverVerification.js')},o.ctx||{})});
  const d=db();koppel(h,d);
  const lees=async()=>{ await wacht(40); try{ return await h.ctx.tkVerifyLeesRegister(); }catch(e){ return null; } };
  return {h,d,idb,lees};
}
const rec=(rows,t,id)=>(rows||[]).find(x=>x.soort==='record'&&x.tabel===t&&x.record_id===id);

async function main(){
  // G1–G3
  { const {h,lees}=opzet();
    await h.ctx.sbPostQ('sessions',{id:'s1',user_id:'A',exercise_id:'squat',reps:8,weight:60,training_instance_id:'ti1'});
    let rows=await lees(); let e=rec(rows,'sessions','s1');
    check(e&&e.revisie===1&&e.status==='SERVER_ACCEPTED'&&e.eigenaar==='A'&&e.verwacht.reps===8&&!('id' in e.verwacht)&&!('user_id' in e.verwacht)&&e.ouder&&e.ouder.tabel==='training_instances'&&e.ouder.record_id==='ti1','G1 bevestigde insert → revisie 1, verwachte inhoud zonder id/eigenaar, ouderrelatie');
    check(!!rows.find(x=>x.key==='__meta__'&&x.sinds),'G1 register krijgt een meta-record met het moment van invoering');
    await h.ctx.sbPatchQ('sessions','id=eq.s1',{reps:10});
    rows=await lees(); e=rec(rows,'sessions','s1');
    check(e.revisie===2&&e.verwacht.reps===10&&e.verwacht.weight===60&&e.status_revisie===null,'G2 PATCH → revisie 2, verwachting aangevuld, eerdere verificatie vervalt');
    await h.ctx.sbDelQ('sessions','id=eq.s1');
    rows=await lees(); e=rec(rows,'sessions','s1');
    check(e.revisie===3&&e.verwijderd===true,'G3 DELETE → revisie 3, verwijderd'); }
  // G4
  { const {h,lees}=opzet({online:false});
    await h.ctx.sbPostQ('nutrition_meals',{id:'m1',user_id:'A',meal_type:'ontbijt'});
    const e=rec(await lees(),'nutrition_meals','m1');
    check(e&&e.status==='QUEUED'&&e.eigenaar==='A'&&h.st.queue.length===1,'G4 offline gequeued → QUEUED onder de eigenaar'); }
  // G5
  { const {h,lees}=opzet();
    await h.ctx.sbPostQ('custom_training_exercises',{id:'e1',custom_training_id:'ct1',exercise_id:'squat'});
    await h.ctx.sbPostQ('custom_training_exercises',{id:'e2',custom_training_id:'ct1',exercise_id:'bench'});
    await h.ctx.sbPostQ('custom_training_exercises',{id:'e3',custom_training_id:'ct2',exercise_id:'row'});
    await h.ctx.sbDelQ('custom_training_exercises','custom_training_id=eq.ct1');
    const rows=await lees();
    check(rec(rows,'custom_training_exercises','e1').verwijderd&&rec(rows,'custom_training_exercises','e2').verwijderd&&!rec(rows,'custom_training_exercises','e3').verwijderd,'G5 DELETE van alle kinderen van ct1 → alleen die kinderen verwijderd'); }
  // G6
  { const {h,lees}=opzet();
    await h.ctx.sbPatchQ('sessions','training_type=eq.prog_1',{note:'x'});
    const o=(await lees()).find(x=>x.soort==='onverifieerbaar'&&x.tabel==='sessions');
    check(o&&o.aantal===1&&o.eigenaar==='A','G6 PATCH zonder record-id → teller niet verifieerbaar'); }
  // G7
  { const {h,lees}=opzet();
    await h.ctx.sbPostQ('custom_trainings',{id:'ct1',naam:'Push'});
    await h.ctx.sbPostQ('custom_trainings',{id:'ct1',naam:'Anders'},{ignoreDuplicates:true});
    const e=rec(await lees(),'custom_trainings','ct1');
    check(e.verwacht.naam==='Push'&&e.revisie===1,'G7 ignore-duplicates op een bekende rij overschrijft de verwachting niet');
    check(!('scope' in e.verwacht),'G7 scope/gym_id (server-trigger) horen niet bij de verwachting'); }
  // G8
  { const {h,lees}=opzet();
    await h.ctx.sbPostQ('activity_laps',{activity_id:'act1',lap_index:2,duration_seconds:300});
    const e=rec(await lees(),'activity_laps','act1:2');
    check(e&&e.sleutelWaarden.lap_index===2&&e.ouder.record_id==='act1'&&e.verwacht.duration_seconds===300,'G8 samengestelde sleutel activity_id + lap_index'); }
  // G9
  for(const [label,fouten] of [['database niet te openen',{open:true}],['transactie breekt af',{abortBijSchrijven:true}]]){
    const {h}=opzet({fouten});
    const u=await h.ctx.sbPostQ('sessions',{id:'s9',exercise_id:'squat'},{detail:true});
    await tot(()=>h.ctx.tkVerifyDefect()===true);
    check(u.status==='confirmed'&&h.ctx.tkVerifyDefect()===true&&/noteer/.test(h.ctx.localStorage.getItem('tk_verify_register_defect')),'G9 '+label+' → defect-markering, write blijft bevestigd'); }
  // G10
  { const {h,idb}=opzet();
    await h.ctx.sbPostQ('sessions',{id:'s1',exercise_id:'squat'});await wacht(40);
    check(Object.keys(idb._dbs).join()==='tk_verificatie','G10 alleen de registerdatabase bestaat; maurice_offline is niet aangeraakt'); }
  // G11
  { const {h,lees}=opzet();
    await h.ctx.sbPostQ('goals',{user_id:'A',type:'kracht'});
    const rows=await lees();
    check(!(rows||[]).some(x=>x.tabel==='goals'),'G11 tabel buiten de ondersteunde set → geen registeritem'); }
  // G12
  { const {h,lees,d}=opzet();
    d.tabel('sessions').push({id:'s1',user_id:'A',edit_revision:5});
    const u=await h.ctx.sbPatchQ('sessions','id=eq.s1&edit_revision=lt.3',{reps:4},{returnRows:true});
    const rows=await lees();
    check(u.superseded===true&&!rec(rows,'sessions','s1'),'G12 compare-and-set zonder geraakte rij → geen registeritem'); }
  // G13 — de updategereedheid toont een registerfout als onbekend (fail-closed)
  { const {h}=opzet({ctx:{tkLeesWachtrijStrikt:async()=>[],curT:null,GW:undefined,TK_TRAININGEN_ONBEVESTIGD:'tk_trainings_onbevestigd',APP_VER:'t'},});
    const {fn}=require('./fixtures/schrijfHarnas');
    h.run(fn('async function tkUpdateGereedheid(){'));
    let u=await h.ctx.tkUpdateGereedheid();
    const schoon=u.veilig===true;
    h.ctx.tkVerifyMarkeerDefect('test');
    u=await h.ctx.tkUpdateGereedheid();
    check(schoon&&u.veilig===false&&u.onbekend.some(x=>/controleregister/.test(x)),'G13 registerfout → updategereedheid niet veilig, met reden'); }
  // G14
  { const {h,idb}=opzet({fouten:{gooitBijPut:true}});
    const u=await h.ctx.sbPostQ('sessions',{id:'s14',exercise_id:'squat'},{detail:true});
    await tot(()=>h.ctx.tkVerifyDefect()===true);
    const st=idb._dbs.tk_verificatie&&idb._dbs.tk_verificatie.stores.register;
    check(u.status==='confirmed'&&h.ctx.tkVerifyDefect()===true&&(!st||st.rijen.size===0),'G14 put gooit binnen de transactie → afgebroken, defect-markering, register leeg'); }
  klaar=true;console.log('TK-REL-SEC-22: '+n+'/'+n);
}
main().catch(e=>{console.error('FAIL',e&&e.stack||e);process.exitCode=1;});
