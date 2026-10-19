/* TK-REL-SEC-20 — vervolg op een onafhankelijke review van TK-REL-SEC-16..19 (19-10-2026).
 * Elk scenario is een door de review nagespeeld defect in de eerste versie van deze ronde.
 *  V1 cycle_symptom_logs: een leesfout vóór het opslaan mag de andere symptomen van die dag nooit stil overschrijven;
 *  V2 replay van een insert (client-id) mag een latere wijziging (intrekken van de agenda-link) nooit terugdraaien;
 *  V3 een latere write op DEZELFDE rij haalt een eerdere, nog wachtende write niet in (PATCH na PATCH, PATCH na insert);
 *  V4 programma opslaan: leesfout bij de terugleescontrole na een verloren antwoord → geen tweede programma;
 *  V5 programma opslaan: een bestaand programma met dezelfde naam en startdatum krijgt nooit de nieuwe blokken;
 *  V6 programma opslaan: accountwissel tijdens de terugleescontrole → geen koppeling aan een programma van B;
 *  V7 extra oefeningen aan een programmablok: leesfout → niets toegevoegd (geen dedupe op een lege lijst);
 *  V8 exercises 409: een gedeactiveerde oefening met dezelfde naam telt niet als "al opgeslagen";
 *  V9 HTTP 502/504 bij een insert zonder idempotente sleutel = onzeker (geen automatische tweede write), en de sporter
 *     kan zo'n vastgehouden item na controle bewust toch laten versturen;
 *  V10 extra oefeningen aan een eigen training: accountwissel tijdens het laden → niets geschreven of gequeued voor B;
 *  (V2b, V3c, V3d en V4b zijn aanvullende varianten op V2, V3 en V4.)
 *  V11 intake zonder actieve sessie maar met bekende toesteleigenaar: doel wordt gewoon gequeued.
 * Draait de ECHTE productiefuncties via core/fixtures/schrijfHarnas.js. */
'use strict';
const assert=require('assert');
const {maak,resp,fn,grab,db,koppel,HTML}=require('./fixtures/schrijfHarnas');
const fnAls=decl=>HTML.indexOf(decl)>=0?fn(decl):''; // nog niet bestaande functie → leeg (RED i.p.v. crash)
let klaar=false,n=0;
process.on('exit',()=>{if(!klaar){console.error('FAIL niet alle scenario\'s afgerond (hangende promise)');process.exitCode=1;}});
const check=(ok,label)=>{assert(ok,label);n++;console.log('PASS',label);};
const FLUSH=grab('let _flushBezig=false;','// DEV-UPDATE-01')+'\n'+fn('async function flushOfflineQueue(');
const UI={closeModal(){},renderProgrammaList(){},refreshHome(){},finishSessionNoSave(){},renderSessionSummaryContent(){},renderCyclusScreen(){},td:()=>'2026-10-19',renderOfflineQueueModal(){}};
const wacht=ms=>new Promise(r=>setTimeout(r,ms));
function concept(naam){ return {naam:naam||'Programma',doel:'kracht',sport:'kracht',schemaType:'vast',weekdagen:[],dagenPerWeek:2,duur:60,
  blocks:[{week_nr:1,fase_naam:'opbouw',oefeningen:[{exercise_id:'squat',sets:3,reps:5,rpe:7}]},{week_nr:1,fase_naam:'opbouw',oefeningen:[{exercise_id:'row',sets:3,reps:8,rpe:7}]}]}; }
function programma(d,regel){
  const h=maak({extraSrc:'let programmaOpslaanBezig=false;\n'+fn('async function opslaanProgramma(){'),ctx:Object.assign({},UI,{computeBlockPlannedDates:(s,k)=>Array.from({length:k},(_,i)=>'2026-10-2'+i)})});
  h.ctx._progConcept=concept();koppel(h,d,regel);return h;
}

async function main(){
  // V1
  { const d=db({cycle_symptom_logs:[['user_id','log_date']]});
    d.tabel('cycle_symptom_logs').push({id:'c1',user_id:'A',log_date:'2026-10-19',symptoms:{hoofdpijn:2,stemming:1}});
    const h=maak({extraSrc:fn('async function cyclusSlaSymptoomOp('),ctx:UI});
    koppel(h,d,(req)=>req.method==='GET'?'faal':undefined);
    await h.ctx.cyclusSlaSymptoomOp('energie',3);
    const rij=d.tabel('cycle_symptom_logs')[0];
    check(d.tabel('cycle_symptom_logs').length===1&&rij.symptoms.hoofdpijn===2&&rij.symptoms.stemming===1&&h.st.toasts.some(t=>/Kon niet opslaan/.test(t)),'V1 leesfout + nieuw symptoom: bestaande symptomen blijven staan en de sporter krijgt een foutmelding'); }
  // V2
  { const d=db();
    const h=maak({extraSrc:FLUSH,ctx:UI});h.run('TK_SCHRIJF_TIMEOUT_MS=30');
    let hang=true;h.net.antwoord=async req=>{ const a=d.afhandelen(req); if(hang&&req.method==='POST')return new Promise(()=>{}); return a; };
    const u=await h.ctx.sbPostQ('calendar_feed_tokens',{user_id:'A',token_hash:'h',active:true},{detail:true});
    hang=false;
    const id=d.tabel('calendar_feed_tokens')[0].id;
    // intrekken via de wachtrij-helper; kan direct of via de wachtrij gaan — beide moeten eindigen op active=false
    await h.ctx.sbPatchQ('calendar_feed_tokens','id=eq.'+id,{active:false,revoked_at:'2026-10-19T10:00:00Z'});
    await h.ctx.flushOfflineQueue();await wacht(20);await h.ctx.flushOfflineQueue();
    check(u.status==='queued'&&d.tabel('calendar_feed_tokens').length===1&&d.tabel('calendar_feed_tokens')[0].active===false,'V2 replay van de token-insert draait het intrekken niet terug (active blijft false)'); }
  // V3a — PATCH na een getimede PATCH op dezelfde rij
  { const d=db();d.tabel('exercise_goals').push({id:1,user_id:'A',exercise_id:'squat',one_rm:100});
    const h=maak({extraSrc:FLUSH,ctx:UI});h.run('TK_SCHRIJF_TIMEOUT_MS=30');
    let k=0;h.net.antwoord=async req=>{ if(req.method==='PATCH'&&++k===1)return new Promise(()=>{}); return d.afhandelen(req); };
    await h.ctx.sbPatchQ('exercise_goals','exercise_id=eq.squat',{one_rm:110});
    await h.ctx.sbPatchQ('exercise_goals','exercise_id=eq.squat',{one_rm:120});
    await h.ctx.flushOfflineQueue();await wacht(20);await h.ctx.flushOfflineQueue();
    check(d.tabel('exercise_goals')[0].one_rm===120&&h.st.queue.length===0,'V3 PATCH na een getimede PATCH op dezelfde rij: eindwaarde is de laatste invoer (120)'); }
  // V3b — PATCH na een getimede insert van dezelfde doelrij
  { const d=db();
    const h=maak({extraSrc:FLUSH,ctx:UI});h.run('TK_SCHRIJF_TIMEOUT_MS=30');
    let k=0;h.net.antwoord=async req=>{ if(req.method==='POST'&&++k===1){ d.afhandelen(req); return new Promise(()=>{}); } return d.afhandelen(req); };
    await h.ctx.sbPostQ('exercise_goals',{user_id:'A',exercise_id:'bench',one_rm:80});
    await h.ctx.sbPatchQ('exercise_goals','exercise_id=eq.bench',{one_rm:85});
    await h.ctx.flushOfflineQueue();await wacht(20);await h.ctx.flushOfflineQueue();
    check(d.tabel('exercise_goals').length===1&&d.tabel('exercise_goals')[0].one_rm===85,'V3 PATCH na een getimede insert van dezelfde doelrij: eindwaarde 85, de replay draait hem niet terug'); }
  // V2b — intrekking via een ander toestel (niet via deze wachtrij): de replay van de insert blijft een no-op
  { const d=db();
    const h=maak({extraSrc:FLUSH,ctx:UI});h.run('TK_SCHRIJF_TIMEOUT_MS=30');
    let hang=true;h.net.antwoord=async req=>{ const a=d.afhandelen(req); if(hang&&req.method==='POST')return new Promise(()=>{}); return a; };
    await h.ctx.sbPostQ('availability_periods',{start_date:'2026-11-01',end_date:'2026-11-07'},{detail:true});
    hang=false;d.tabel('availability_periods')[0].end_date='2026-11-03'; // elders aangepast
    await h.ctx.flushOfflineQueue();
    check(d.tabel('availability_periods').length===1&&d.tabel('availability_periods')[0].end_date==='2026-11-03','V2 replay van een insert (client-id) is een no-op: een wijziging van elders blijft staan'); }
  // V3c — tweede opslag van dezelfde eigen training (zelfde client-id) na een getimede eerste
  { const d=db();
    const h=maak({extraSrc:FLUSH,ctx:UI});h.run('TK_SCHRIJF_TIMEOUT_MS=30');
    let k=0;h.net.antwoord=async req=>{ if(req.method==='POST'&&++k===1){ d.afhandelen(req); return new Promise(()=>{}); } return d.afhandelen(req); };
    await h.ctx.sbPostQ('custom_trainings',{id:'ct1',naam:'Push v1'});
    await h.ctx.sbPostQ('custom_trainings',{id:'ct1',naam:'Push v2'});
    await h.ctx.flushOfflineQueue();await wacht(20);await h.ctx.flushOfflineQueue();
    check(d.tabel('custom_trainings').length===1&&d.tabel('custom_trainings')[0].naam==='Push v2','V3 tweede opslag met dezelfde client-id na een getimede eerste: eindstand is de laatste (v2)'); }
  // V3d — in de wachtrij: mislukt de oudere write op een rij, dan wacht de nieuwere ook
  { const d=db();d.tabel('exercise_goals').push({id:1,user_id:'A',exercise_id:'squat',one_rm:100});
    const h=maak({extraSrc:FLUSH,ctx:UI,online:false});
    await h.ctx.sbPatchQ('exercise_goals','exercise_id=eq.squat',{one_rm:110});
    await h.ctx.sbPatchQ('exercise_goals','exercise_id=eq.squat',{one_rm:120});
    h.ctx.navigator.onLine=true;let k=0;
    h.net.antwoord=async req=>{ if(req.method==='PATCH'&&++k===1)return resp(503,{}); return d.afhandelen(req); };
    await h.ctx.flushOfflineQueue();
    const tussen=d.tabel('exercise_goals')[0].one_rm;
    await h.ctx.flushOfflineQueue();
    check(tussen===100&&d.tabel('exercise_goals')[0].one_rm===120&&h.st.queue.length===0,'V3 flush: mislukt de oudere write op een rij, dan wacht de nieuwere ook; eindstand 120'); }
  // V4
  { const d=db();let verloren=false,gefaald=false;
    const h=programma(d,(req)=>{ const p=new URL(req.url).pathname;
      if(req.method==='POST'&&/\/programs$/.test(p)&&!verloren){verloren=true;return 'verloren';}
      if(req.method==='GET'&&/\/programs$/.test(p)&&verloren&&!gefaald){gefaald=true;return 'faal';} });
    await h.ctx.opslaanProgramma();
    if(h.ctx._progConcept)await h.ctx.opslaanProgramma();
    const na2=d.tabel('programs').length;
    if(h.ctx._progConcept)await h.ctx.opslaanProgramma();
    check(gefaald&&na2===1&&d.tabel('programs').length===1&&d.tabel('program_blocks').length===2,'V4 leesfout bij de terugleescontrole: geen tweede programma; een latere poging maakt het af'); }
  // V4b — verloren antwoord bij een blok-insert, daarna leesfout bij de controle → geen dubbel blok
  { const d=db();let verloren=false,gefaald=false;
    const h=programma(d,(req)=>{ const p=new URL(req.url).pathname;
      if(req.method==='POST'&&/\/program_blocks$/.test(p)&&!verloren){verloren=true;return 'verloren';}
      if(req.method==='GET'&&/\/program_blocks$/.test(p)&&verloren&&!gefaald){gefaald=true;return 'faal';} });
    await h.ctx.opslaanProgramma();
    if(h.ctx._progConcept)await h.ctx.opslaanProgramma();
    const na2=d.tabel('program_blocks').length;
    if(h.ctx._progConcept)await h.ctx.opslaanProgramma();
    check(gefaald&&na2<=2&&d.tabel('program_blocks').length===2&&d.tabel('program_block_exercises').length===2,'V4 leesfout bij de blokcontrole: geen dubbel blok; een latere poging maakt het af'); }
  // V5
  { const d=db();d.tabel('programs').push({id:50,user_id:'A',naam:'Programma',start_date:'2026-10-19'});
    const h=programma(d,(req,k)=>req.method==='POST'&&/\/programs$/.test(new URL(req.url).pathname)&&k===1?'faal':undefined);
    await h.ctx.opslaanProgramma();
    if(h.ctx._progConcept)await h.ctx.opslaanProgramma();
    check(d.tabel('program_blocks').every(b=>String(b.program_id)!=='50')&&d.tabel('programs').length===2,'V5 bestaand programma met dezelfde naam krijgt nooit de blokken van het nieuwe voorstel'); }
  // V6
  { const d=db();
    d.tabel('programs').push({id:77,user_id:'B',naam:'Programma',start_date:'2026-10-19'});
    const h=programma(d,(req,k)=>{ const p=new URL(req.url).pathname; if(req.method==='POST'&&/\/programs$/.test(p)&&k===1)return 'verloren'; });
    const basis=h.net.antwoord;
    // RLS: programma's zijn alleen zichtbaar voor de eigen gebruiker
    h.net.antwoord=async req=>{ if(req.method==='GET'&&req.url.indexOf('/programs?')>0){ const a=await basis(req); const rows=await a.json(); return resp(200,rows.filter(p=>p.user_id===req.uidBijVerzoek)); } return basis(req); };
    await h.ctx.opslaanProgramma();
    h.net.voor=req=>{ if(req.method==='GET'&&req.url.indexOf('/programs?')>0)h.login('B'); };
    if(h.ctx._progConcept)await h.ctx.opslaanProgramma();
    h.net.voor=null;h.login('A');
    if(h.ctx._progConcept)await h.ctx.opslaanProgramma();
    check(d.tabel('program_blocks').length>0&&d.tabel('program_blocks').every(b=>String(b.program_id)!=='77'),'V6 accountwissel tijdens de terugleescontrole: nooit blokken aan het programma van B'); }
  // V7
  { const d=db();d.tabel('program_block_exercises').push({id:'x0',program_block_id:'7',exercise_id:'e1',sort_order:0});
    const h=maak({extraSrc:fn('async function permanentlyAddExtras(){'),ctx:Object.assign({},UI,{curT:'prog_7',sessionExtra:[{_t:'prog_7',id:'e1'},{_t:'prog_7',id:'e2'}],
      ensureVasteTrainingenLoaded:async()=>[],vasteTrainingen:[],TRAIN_CFG:{},programBlockExCache:{}})});
    koppel(h,d,(req)=>req.method==='GET'?'faal':undefined);
    await h.ctx.permanentlyAddExtras();
    check(d.tabel('program_block_exercises').length===1&&!h.st.toasts.includes('Permanent toegevoegd aan training'),'V7 leesfout bij het controleren van het blok: niets toegevoegd en geen succesmelding'); }
  // V8
  { const d=db();d.tabel('exercises').push({id:'mijn_oefening',name:'Mijn oefening',type:'strength',scope:'personal',active:false});
    const h=maak({});koppel(h,d);
    const u=await h.ctx.sbPostQ('exercises',{id:'mijn_oefening',name:'Mijn oefening',type:'strength',scope:'personal',active:true},{detail:true});
    check(u.status==='rejected','V8 409 op een gedeactiveerde oefening met dezelfde naam: niet als opgeslagen bevestigd'); }
  // V9
  { const d=db();
    const SRC=FLUSH+'\n'+fnAls('async function vrijgevenOfflineQueueItem(')+'\n'+fn('function tkIsEigenWachtrijItem(');
    const h=maak({extraSrc:SRC,ctx:Object.assign({},UI,{confirmModal:async()=>true})});
    let eerste=true;h.net.antwoord=async req=>{ if(req.method==='POST'&&eerste){ eerste=false; d.afhandelen(req); return resp(504,{}); } return d.afhandelen(req); };
    const g=await h.ctx.sbPostQ('goals',{user_id:'A',type:'kracht',naam:'Squat 140'},{detail:true});
    await h.ctx.flushOfflineQueue();
    check(g.onzeker===true&&d.tabel('goals').length===1&&h.st.queue.length===1,'V9 504 bij een doel: onzeker, niet automatisch opnieuw verstuurd');
    d.T.goals=[]; // de sporter controleert: het doel staat er toch niet
    // offlineQueueVrijgeven werkt op IndexedDB; in dit harnas op de nep-wachtrij
    h.ctx.offlineQueueVrijgeven=async id=>{ const q=h.st.queue.find(x=>x.id===id); if(!q||!q.item.onzeker)return false; q.item=Object.assign({},q.item,{onzeker:false,vrijgegeven:true}); return true; };
    if(typeof h.ctx.vrijgevenOfflineQueueItem==='function'&&h.st.queue[0])await h.ctx.vrijgevenOfflineQueueItem(h.st.queue[0].id);
    await wacht(10);
    check(d.tabel('goals').length===1&&h.st.queue.length===0,'V9 bewust vrijgegeven na controle: precies één keer verstuurd');
    const VRIJ=fnAls('async function offlineQueueVrijgeven(');
    check(/st\.put\(/.test(VRIJ)&&/onzeker:false/.test(VRIJ)&&/tx\.onabort/.test(VRIJ),'V9 vrijgeven werkt het bestaande wachtrij-item bij (put, zelfde id, geen tweede item) en faalt gesloten'); }
  // V10
  { const ct={id:'ct1',name:'X',exercises:[],exercise_targets:[]};
    let h;h=maak({extraSrc:fn('async function permanentlyAddExtras(){'),ctx:Object.assign({},UI,{curT:'custom_ct1',sessionExtra:[{_t:'custom_ct1',id:'e1'}],
      customTrainings:[ct],vasteTrainingen:[],TRAIN_CFG:{},programBlockExCache:{},
      ensureVasteTrainingenLoaded:async()=>{ h.login('B'); return []; },
      tkCustomTrainingPatch:(id,v)=>h.ctx.sbPatchQ('custom_trainings','id=eq.'+id,v),
      pushCustomTrainingExercises:async t=>h.ctx.sbPostQ('custom_training_exercises',{custom_training_id:t.id,exercise_id:'e1'},{detail:true})})});
    await h.ctx.permanentlyAddExtras();await wacht(5);
    check(h.writesMet('B').length===0&&h.st.queue.every(q=>q.eigenaar!=='B'),'V10 eigen training: accountwissel tijdens het laden → niets geschreven of gequeued voor B'); }
  // V11
  { const ocore={toAtleet:(c,a)=>a,toTrainingContextRow:()=>({}),toCoachPrefs:()=>({coach_style:'x',coach_voice:'y',coach_detail:'z'}),
      toSecondaryGoals:()=>[{type:'kracht',naam:'Squat'}],toConditions:()=>[],GOAL_LABEL:{}};
    const h=maak({login:null,cacheOwner:'A',online:false,extraSrc:fn('async function intakeConfirm(btn){'),ctx:Object.assign({},UI,{intakeState:{cand:{}},atleet:{},ocore:()=>ocore,intakeValueCTA(){}})});
    await h.ctx.intakeConfirm(null);
    check(h.st.queue.length===1&&h.st.queue[0].item.table==='goals'&&h.st.queue[0].eigenaar==='A','V11 intake zonder actieve sessie: doel gequeued onder de bekende toesteleigenaar'); }
  klaar=true;console.log('TK-REL-SEC-20: '+n+'/'+n);
}
main().catch(e=>{console.error('FAIL',e&&e.stack||e);process.exitCode=1;});
