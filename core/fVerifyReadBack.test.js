/* TK-REL-SEC-23 — teruglezen met de server en ouder-kindvolledigheid (read-after-write fase 2, 19-10-2026).
 * tkVerifieerMetServer() leest elke geregistreerde rij terug met het token van de eigenaar (binding in sbFetch) en
 * oordeelt met de kern serververify.v1. Een HTTP 2xx is geen bewijs; een leesfout of accountwissel is nooit VERIFIED.
 *  L1 alles gelijk → SERVER_VERIFIED per tabel; de poort blijft dicht (historie niet geïnventariseerd);
 *  L2 inhoud wijkt af op de server → MISMATCH;
 *  L3 GET faalt (HTTP 500) → UNKNOWN, nooit MISSING of VERIFIED;
 *  L4 RLS verbergt de rij → MISSING (niet definitief);
 *  L5 accountwissel tijdens het teruglezen → stop, niets als VERIFIED opgeslagen; geen verzoek met het token van B;
 *  L6 lokale wijziging tijdens de controle (nieuwe revisie) → resultaat niet opgeslagen;
 *  L7 training_instances + sessions: ontbrekend kind → MISSING; onverwacht kind → ouder MISMATCH;
 *  L8 nutrition_meals + items (geen eigen eigenaarsveld): items alleen VERIFIED als de maaltijd VERIFIED is;
 *  L9 activities + laps met samengestelde sleutel → VERIFIED; extra lap → MISMATCH;
 *  L10 custom_trainings + oefeningen: na "alle kinderen verwijderen + opnieuw invoegen" alleen de nieuwe set verwacht;
 *  L11 item nog in de offline-wachtrij → QUEUED (wacht), niet VERIFIED;
 *  L12 lokale gegevens van vóór het register (eigen trainingen in localStorage) → telt als historisch; poort dicht;
 *  L13 logging bevat alleen aantallen, geen record-id's of inhoud;
 *  L14 het scherm toont aantallen en begrijpelijke statussen; "Veilig om te verwijderen" blijft uitgeschakeld;
 *  L15 verwijderde rij: afwezig op de server → bevestigd; nog aanwezig → MISMATCH;
 *  L16 sbFetch-GET gebonden aan A terwijl B is ingelogd → lokaal geweigerd, geen verzoek;
 *  L17 kind zonder eigenaarsveld waarvan de ouder niet in het register staat → niet VERIFIED. */
'use strict';
const assert=require('assert');
const {maak,resp,fn,grab,db,koppel,HTML}=require('./fixtures/schrijfHarnas');
const {maakIndexedDb}=require('./fixtures/miniIndexedDb');
let klaar=false,n=0;
process.on('exit',()=>{if(!klaar){console.error('FAIL niet alle scenario\'s afgerond (hangende promise)');process.exitCode=1;}});
const check=(ok,label)=>{assert(ok,label);n++;console.log('PASS',label);};
const BLOK=grab('// SERVER READ-AFTER-WRITE, FASE 2','function updateOfflineBadge(){');
const FLUSH=grab('let _flushBezig=false;','// DEV-UPDATE-01')+'\n'+fn('async function flushOfflineQueue(');
const wacht=ms=>new Promise(r=>setTimeout(r,ms));
function opzet(o){
  o=o||{};
  const logs=[];
  const h=maak({extraSrc:FLUSH+'\n'+BLOK,login:o.login,online:o.online,ctx:Object.assign({indexedDB:maakIndexedDb(),ServerVerificationCore:require('./serverVerification.js'),
    renderOfflineQueueModal(){},escHtml:x=>String(x),ObservabilityCore:{tkLog:function(){logs.push(JSON.stringify([].slice.call(arguments)));}}},o.ctx||{})});
  const d=db();koppel(h,d);
  return {h,d,logs};
}
const telStatus=(u,t)=>(u.perTabel&&u.perTabel[t])||{};
const status=async(h,t,id)=>{ await wacht(40); const r=(await h.ctx.tkVerifyLeesRegister()).find(x=>x.soort==='record'&&x.tabel===t&&x.record_id===id); return r&&r.status_revisie===r.revisie?r.status:null; };

async function main(){
  // L1
  { const {h}=opzet();
    await h.ctx.sbPostQ('training_instances',{id:'ti1',user_id:'A',status:'gestart',started_at:'2026-10-19T08:00:00.000Z'});
    await h.ctx.sbPostQ('sessions',{id:'s1',user_id:'A',exercise_id:'squat',reps:8,weight:60,training_instance_id:'ti1',sets_detail:[{kg:'60',reps:8}]});
    await wacht(40);
    const u=await h.ctx.tkVerifieerMetServer();
    check(u.ok&&telStatus(u,'sessions').SERVER_VERIFIED===1&&telStatus(u,'training_instances').SERVER_VERIFIED===1,'L1 alles gelijk → SERVER_VERIFIED voor ouder en kind');
    check(u.poort.toegestaan===false&&u.poort.redenen.indexOf('historie_niet_geinventariseerd')>=0,'L1 poort blijft dicht: historie niet geïnventariseerd');
    check(await status(h,'sessions','s1')==='SERVER_VERIFIED','L1 resultaat in het register bij exact deze revisie'); }
  // L2
  { const {h,d}=opzet();
    await h.ctx.sbPostQ('sessions',{id:'s1',exercise_id:'squat',reps:8});await wacht(40);
    d.tabel('sessions')[0].reps=6;
    const u=await h.ctx.tkVerifieerMetServer();
    check(telStatus(u,'sessions').MISMATCH===1,'L2 inhoud wijkt af → MISMATCH'); }
  // L3
  { const {h,d}=opzet();
    await h.ctx.sbPostQ('sessions',{id:'s1',exercise_id:'squat',reps:8});await wacht(40);
    const basis=h.net.antwoord;h.net.antwoord=async req=>req.method==='GET'?resp(500,{}):basis(req);
    const u=await h.ctx.tkVerifieerMetServer();
    check(telStatus(u,'sessions').UNKNOWN===1&&!telStatus(u,'sessions').MISSING&&!telStatus(u,'sessions').SERVER_VERIFIED,'L3 GET faalt → UNKNOWN'); }
  // L4
  { const {h,d}=opzet();
    await h.ctx.sbPostQ('sessions',{id:'s1',exercise_id:'squat',reps:8});await wacht(40);
    d.zichtbaar=(t,r,uid)=>t!=='sessions'; // RLS verbergt de rij (bv. eigenaar door een trigger gewijzigd)
    const u=await h.ctx.tkVerifieerMetServer();
    check(telStatus(u,'sessions').MISSING===1,'L4 RLS verbergt de rij → MISSING');
    const rij=(await h.ctx.tkVerifyLeesRegister()).find(x=>x.record_id==='s1');
    check(rij.afwijkingen.indexOf('niet_zichtbaar_voor_eigenaar')>=0,'L4 vastgelegd als "niet zichtbaar voor eigenaar" (niet definitief)'); }
  // L5
  { const {h}=opzet();
    await h.ctx.sbPostQ('sessions',{id:'s1',exercise_id:'squat',reps:8});await wacht(40);
    h.net.voor=req=>{ if(req.method==='GET')h.login('B'); };
    const u=await h.ctx.tkVerifieerMetServer();
    h.net.voor=null;
    check(u.ok===false&&u.reden==='account_gewisseld','L5 accountwissel tijdens teruglezen → gestopt');
    check(h.st.req.filter(r=>r.method==='GET'&&r.token==='Bearer tB').length===0,'L5 geen leesverzoek met het token van B');
    h.login('A');check(await status(h,'sessions','s1')===null,'L5 niets als geverifieerd opgeslagen'); }
  // L6
  { const {h}=opzet();
    await h.ctx.sbPostQ('sessions',{id:'s1',exercise_id:'squat',reps:8});await wacht(40);
    let gedaan=false;h.net.voor=async req=>{ if(req.method==='GET'&&!gedaan){ gedaan=true; await h.ctx.sbPatchQ('sessions','id=eq.s1',{reps:9}); await wacht(40); } };
    await h.ctx.tkVerifieerMetServer();h.net.voor=null;
    check(await status(h,'sessions','s1')===null,'L6 lokale wijziging tijdens de controle → resultaat voor de oude revisie niet opgeslagen');
    const e6=(await h.ctx.tkVerifyLeesRegister()).find(x=>x.record_id==='s1');
    check(e6.revisie===2&&e6.status==='SERVER_ACCEPTED'&&!e6.laatste_verificatie,'L6 registeritem van de nieuwe revisie niet overschreven door het oude resultaat'); }
  // L7
  { const {h,d}=opzet();
    await h.ctx.sbPostQ('training_instances',{id:'ti1',user_id:'A',status:'gestart'});
    await h.ctx.sbPostQ('sessions',{id:'s1',exercise_id:'squat',reps:8,training_instance_id:'ti1'});
    await h.ctx.sbPostQ('sessions',{id:'s2',exercise_id:'bench',reps:5,training_instance_id:'ti1'});await wacht(40);
    d.T.sessions=d.tabel('sessions').filter(r=>r.id!=='s2');
    let u=await h.ctx.tkVerifieerMetServer();
    check(telStatus(u,'sessions').MISSING===1,'L7 ontbrekend kind → MISSING');
    d.tabel('sessions').push({id:'s2',user_id:'A',exercise_id:'bench',reps:5,training_instance_id:'ti1'},{id:'sX',user_id:'A',exercise_id:'row',training_instance_id:'ti1'});
    u=await h.ctx.tkVerifieerMetServer();
    check(telStatus(u,'training_instances').MISMATCH===1&&telStatus(u,'sessions').SERVER_VERIFIED===2,'L7 onverwacht kind op de server → ouder MISMATCH'); }
  // L8
  { const {h,d}=opzet();
    await h.ctx.sbPostQ('nutrition_meals',{id:'m1',user_id:'A',meal_type:'ontbijt',occurred_at:'2026-10-19T07:30:00.000Z'});
    await h.ctx.sbPostQ('nutrition_meal_items',{id:'i1',meal_id:'m1',quantity:100,quantity_unit:'g'});await wacht(40);
    let u=await h.ctx.tkVerifieerMetServer();
    check(telStatus(u,'nutrition_meal_items').SERVER_VERIFIED===1&&telStatus(u,'nutrition_meals').SERVER_VERIFIED===1,'L8 maaltijd en regel → VERIFIED (eigenaar via de maaltijd)');
    d.tabel('nutrition_meals')[0].user_id='B';
    u=await h.ctx.tkVerifieerMetServer();
    check(telStatus(u,'nutrition_meals').MISMATCH===1&&!telStatus(u,'nutrition_meal_items').SERVER_VERIFIED,'L8 maaltijd van een andere eigenaar → regels niet VERIFIED'); }
  // L9
  { const {h,d}=opzet();
    await h.ctx.sbPostQ('activities',{id:'a1',user_id:'A',sport:'running',recorded_at:'2026-10-19T06:00:00.000Z',distance_meters:5000});
    await h.ctx.sbPostQ('activity_laps',{activity_id:'a1',lap_index:0,duration_seconds:300});
    await h.ctx.sbPostQ('activity_laps',{activity_id:'a1',lap_index:1,duration_seconds:290});await wacht(40);
    d.tabel('activities')[0].recorded_at='2026-10-19T06:00:00+00:00';
    let u=await h.ctx.tkVerifieerMetServer();
    check(telStatus(u,'activities').SERVER_VERIFIED===1&&telStatus(u,'activity_laps').SERVER_VERIFIED===2,'L9 activiteit (tijdstempel +00:00) en laps met samengestelde sleutel → VERIFIED');
    d.tabel('activity_laps').push({id:'x',activity_id:'a1',lap_index:2,duration_seconds:5});
    u=await h.ctx.tkVerifieerMetServer();
    check(telStatus(u,'activities').MISMATCH===1,'L9 extra lap op de server → activiteit MISMATCH'); }
  // L10
  { const {h}=opzet();
    await h.ctx.sbPostQ('custom_trainings',{id:'ct1',user_id:'A',naam:'Push'});
    await h.ctx.sbPostQ('custom_training_exercises',{id:'e1',custom_training_id:'ct1',exercise_id:'squat'});
    await h.ctx.sbDelQ('custom_training_exercises','custom_training_id=eq.ct1');
    await h.ctx.sbPostQ('custom_training_exercises',{id:'e2',custom_training_id:'ct1',exercise_id:'bench'});await wacht(40);
    const u=await h.ctx.tkVerifieerMetServer();
    check(telStatus(u,'custom_trainings').SERVER_VERIFIED===1&&telStatus(u,'custom_training_exercises').SERVER_VERIFIED===2,'L10 kinderen vervangen: oude oefening bevestigd afwezig, nieuwe aanwezig, ouder VERIFIED'); }
  // L11
  { const {h}=opzet({online:false});
    await h.ctx.sbPostQ('sessions',{id:'s1',exercise_id:'squat',reps:8});await wacht(40);
    h.ctx.navigator.onLine=true;
    const basis=h.net.antwoord;h.net.antwoord=async req=>req.method==='POST'?resp(503,{}):basis(req); // flush lukt niet
    const u=await h.ctx.tkVerifieerMetServer();
    check(telStatus(u,'sessions').QUEUED===1&&!telStatus(u,'sessions').SERVER_VERIFIED,'L11 nog in de wachtrij → QUEUED, niet VERIFIED'); }
  // L12
  { const {h}=opzet();
    h.ctx.localStorage.setItem('tk_trainings',JSON.stringify([{id:'oud1',name:'Van vroeger'}]));
    await h.ctx.sbPostQ('sessions',{id:'s1',exercise_id:'squat',reps:8});await wacht(40);
    const u=await h.ctx.tkVerifieerMetServer();
    check(u.historisch>=1&&u.poort.toegestaan===false&&u.poort.redenen.indexOf('historische_gegevens_buiten_register')>=0,'L12 eigen training van vóór het register → historisch, poort dicht'); }
  // L13
  { const {h,logs}=opzet();
    await h.ctx.sbPostQ('sessions',{id:'geheim-id-123',exercise_id:'squat',reps:8,note:'privé notitie'});await wacht(40);
    await h.ctx.tkVerifieerMetServer();
    const v=logs.filter(l=>/verify_run/.test(l));
    check(v.length===1&&!/geheim-id-123|privé|squat/.test(v[0])&&/SERVER_VERIFIED/.test(v[0]),'L13 logging alleen aantallen, geen id\'s of inhoud'); }
  // L14
  { const el={textContent:'',innerHTML:''};
    const {h}=opzet({ctx:{document:{getElementById:id=>id==='help-update-verify-body'?el:null,querySelectorAll:()=>[],querySelector:()=>null}}});
    await h.ctx.sbPostQ('sessions',{id:'s1',exercise_id:'squat',reps:8});await wacht(40);
    await h.ctx.tkVerifieerMetServerToon();
    check(/1 van 1/.test(el.innerHTML)&&/Sets en oefeningen: 1 bevestigd op de server/.test(el.innerHTML)&&/geen toestemming om de app te verwijderen/.test(el.innerHTML),'L14 scherm toont aantallen en begrijpelijke status, en geen toestemming');
    check(/id="help-update-safe" disabled aria-disabled="true"/.test(HTML)&&/id="help-update-verify" onclick="tkVerifieerMetServerToon\(\)"/.test(HTML),'L14 knop "Controleren met de server" aanwezig; "Veilig om te verwijderen" uitgeschakeld');
    const off=opzet({ctx:{document:{getElementById:id=>id==='help-update-verify-body'?el:null,querySelectorAll:()=>[],querySelector:()=>null}}});off.h.login(null);
    await off.h.ctx.tkVerifieerMetServerToon();
    check(/Niet gecontroleerd/.test(el.innerHTML)&&/Log eerst in/.test(el.innerHTML),'L14 niet ingelogd → "Niet gecontroleerd" met reden'); }
  // L15
  { const {h,d}=opzet();
    await h.ctx.sbPostQ('sessions',{id:'s1',exercise_id:'squat',reps:8});
    await h.ctx.sbDelQ('sessions','id=eq.s1');await wacht(40);
    let u=await h.ctx.tkVerifieerMetServer();
    check(telStatus(u,'sessions').SERVER_VERIFIED===1,'L15 verwijderd en afwezig op de server → bevestigd');
    await h.ctx.sbPostQ('sessions',{id:'s2',exercise_id:'squat',reps:8});
    const basis=h.net.antwoord;h.net.antwoord=async req=>req.method==='DELETE'?resp(204,null):basis(req); // server verwijdert niet echt
    await h.ctx.sbDelQ('sessions','id=eq.s2');await wacht(40);h.net.antwoord=basis;
    u=await h.ctx.tkVerifieerMetServer();
    check(telStatus(u,'sessions').MISMATCH===1,'L15 verwijderd maar nog aanwezig → MISMATCH'); }
  // L16
  { const {h}=opzet(); h.login('B'); const voor=h.st.req.length;
    const r=await h.ctx.sbFetch('https://x.supabase.co/rest/v1/sessions?select=*',{uid:'A'});
    check(r.ok===false&&r.tkIdentiteit==='binding'&&h.st.req.length===voor,'L16 GET gebonden aan A terwijl B is ingelogd → lokaal geweigerd, geen verzoek'); }
  // L17
  { const {h}=opzet();
    await h.ctx.sbPostQ('nutrition_meal_items',{id:'i9',meal_id:'m9',quantity:50});await wacht(40);
    const u=await h.ctx.tkVerifieerMetServer();
    check(!telStatus(u,'nutrition_meal_items').SERVER_VERIFIED&&telStatus(u,'nutrition_meal_items').UNKNOWN===1,'L17 maaltijdregel zonder geregistreerde maaltijd → eigenaar onbewezen, UNKNOWN'); }
  klaar=true;console.log('TK-REL-SEC-23: '+n+'/'+n);
}
main().catch(e=>{console.error('FAIL',e&&e.stack||e);process.exitCode=1;});
