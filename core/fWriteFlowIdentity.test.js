/* TK-REL-SEC-17 — accountwissel tijdens een schrijfflow met meerdere awaits (P1-rest, 19-10-2026).
 * Elke flow hieronder doet eerst een await (bevestiging, lezen, AI-antwoord of een eerdere write) en schrijft daarna
 * naar een tabel met de insert-trigger set_user_id_from_auth of met een filter dat ook rijen van een andere gebruiker
 * kan raken. Wisselt het account in die tussentijd, dan mocht er tot nu toe gewoon met het token van B worden
 * geschreven. Het nep-netwerk legt per verzoek vast met welk token het verstuurd werd.
 *  F1 permanentlyAddExtras (programmablok)  F2 permanentlyAddExtras (vaste training)  F3 upsertWeightLog
 *  F4 intakeConfirm                         F5 sendMsg (AI-antwoord van A)          F6 loadTrainCfg-seed
 *  F7 migreerABNaarVasteTrainingen          F8 deleteVasteTraining (filter training_ref=A raakt ook B)
 *  F9 deleteProgramma                       F10 saveVasteTrainingName               F11 heergenereerResterendeWeken
 * Elke flow wordt ook zonder wissel gedraaid: dan moet hij gewoon schrijven (geen regressie).
 * Draait de ECHTE flows en de ECHTE schrijflaag uit index.html via core/fixtures/schrijfHarnas.js. */
'use strict';
const assert=require('assert');
const {maak,resp,fn,grab}=require('./fixtures/schrijfHarnas');
let klaar=false,n=0;
process.on('exit',()=>{if(!klaar){console.error('FAIL niet alle scenario\'s afgerond (hangende promise)');process.exitCode=1;}});
const check=(ok,label)=>{assert(ok,label);n++;console.log('PASS',label);};
const el=(v)=>({value:v||'',textContent:'',style:{},disabled:false,classList:{add(){},remove(){}}});
const UI={closeModal(){},finishSessionNoSave(){},renderSessionSummaryContent(){},renderSchemaTrainingList:async()=>{},renderVasteTrainingBtns:async()=>{},
  renderProgrammaList(){},refreshHome(){},vtMetaSave(){},td:()=>'2026-10-19'};

// Draai een flow twee keer: met een wissel naar B op het gekozen moment, en zonder wissel.
async function beide(label,opzet,doe,minWritesZonderWissel){
  for(const wissel of [true,false]){
    const h=opzet(wissel);
    await doe(h);
    if(wissel) check(h.writesMet('B').length===0,label+': na de accountwissel geen enkele write met het token van B');
    else check(h.writesMet('A').length>=minWritesZonderWissel,label+': zonder wissel schrijft de flow gewoon ('+h.writesMet('A').length+' writes)');
  }
}
const naEerste=(h,pred)=>{let gedaan=false;h.net.voor=(req)=>{ if(!gedaan&&pred(req)){gedaan=true;h.login('B');} };};

async function main(){
  // F1/F2 — extra oefeningen permanent toevoegen
  const PAE=fn('async function permanentlyAddExtras(){');
  await beide('F1 permanentlyAddExtras (programmablok)',w=>{
    const h=maak({extraSrc:PAE,ctx:Object.assign({},UI,{curT:'prog_7',sessionExtra:[{_t:'prog_7',id:'e1'},{_t:'prog_7',id:'e2'},{_t:'prog_7',id:'e3'}],
      ensureVasteTrainingenLoaded:async()=>[],vasteTrainingen:[],TRAIN_CFG:{},programBlockExCache:{}})});
    if(w)naEerste(h,r=>r.method==='POST'&&r.url.indexOf('program_block_exercises')>0);return h;
  },h=>h.ctx.permanentlyAddExtras(),3);
  await beide('F2 permanentlyAddExtras (vaste training)',w=>{
    const h=maak({extraSrc:PAE,ctx:Object.assign({},UI,{curT:'vtA',sessionExtra:[{_t:'vtA',id:'e1'},{_t:'vtA',id:'e2'}],
      ensureVasteTrainingenLoaded:async()=>[],vasteTrainingen:[{id:'vtA'}],TRAIN_CFG:{vtA:[]},programBlockExCache:{}})});
    if(w)naEerste(h,r=>r.method==='POST'&&r.url.indexOf('training_exercises')>0);return h;
  },h=>h.ctx.permanentlyAddExtras(),2);
  // F3 — gewicht: lezen, dan schrijven
  await beide('F3 upsertWeightLog',w=>{
    const h=maak({extraSrc:fn('async function upsertWeightLog('),ctx:UI});
    if(w)naEerste(h,r=>r.method==='GET'&&r.url.indexOf('weight_log')>0);return h;
  },h=>h.ctx.upsertWeightLog(80,'x'),1);
  // F4 — intake
  await beide('F4 intakeConfirm',w=>{
    const ocore={toAtleet:(c,a)=>Object.assign({},a,{naam:'A'}),toTrainingContextRow:(c,uid)=>({user_id:uid,doel:'kracht'}),
      toCoachPrefs:()=>({coach_style:'x',coach_voice:'y',coach_detail:'z'}),toSecondaryGoals:(c,uid)=>[{user_id:uid,type:'kracht',naam:'Squat'}],
      toConditions:()=>[{naam:'knie'}],GOAL_LABEL:{}};
    const h=maak({extraSrc:fn('async function intakeConfirm(btn){'),ctx:Object.assign({},UI,{intakeState:{cand:{}},atleet:{},ocore:()=>ocore,intakeValueCTA(){}})});
    if(w)naEerste(h,r=>r.method==='POST'&&r.url.indexOf('atleet_profiel')>0);return h;
  },h=>h.ctx.intakeConfirm(null),4);
  // F5 — AI-coach: het antwoord voor A mag nooit in de chatgeschiedenis van B belanden
  await beide('F5 sendMsg',w=>{
    const h=maak({extraSrc:'let sending=false;\n'+fn('async function sendMsg(txt){'),ctx:Object.assign({},UI,{
      document:{getElementById:()=>el(''),querySelectorAll:()=>[],querySelector:()=>null},
      ensureAiConsent:async()=>true,addMsg:()=>'m1',removeMsg(){},chatHist:[],activeSessionId:null,activeSessionCtx:null,
      buildCtx:async()=>'sys',tkApiUrl:p=>p,renderCoachReply(){},commercialErrorMessage:()=>'fout',AIOutputContract:undefined})});
    h.net.antwoord=req=>req.url.indexOf('/.netlify/functions/coach')>=0?resp(200,{content:[{text:'Advies voor A'}]}):(req.method==='GET'?resp(200,Array.from({length:45},(_,i)=>({id:i}))):undefined);
    if(w)naEerste(h,r=>r.url.indexOf('/.netlify/functions/coach')>=0);return h;
  },h=>h.ctx.sendMsg('hoi'),2);
  // F6 — eenmalige seed van vaste trainingen
  await beide('F6 loadTrainCfg-seed',w=>{
    const seed={A:[{id:'squat',naam:'Squat',sets:3,reps:5,muscles:{p:['benen'],s:[]}},{id:'bench',naam:'Bench',sets:3,reps:5,muscles:{p:['borst'],s:[]}}],B:[{id:'row',naam:'Row',muscles:{p:['rug'],s:[]}}]};
    const h=maak({extraSrc:'let _trainCfgLoading=null;\n'+fn('async function loadTrainCfg(){'),ctx:{ensureExercisesLoaded:async()=>{},exercises:[],TRAIN_CFG_SEED:seed,TRAIN_CFG:{}}});
    if(w)naEerste(h,r=>r.method==='POST'&&r.url.indexOf('training_exercises')>0);return h;
  },h=>h.ctx.loadTrainCfg(),3);
  // F7 — eenmalige migratie A/B naar vaste trainingen
  await beide('F7 migreerABNaarVasteTrainingen',w=>{
    const h=maak({extraSrc:fn('async function migreerABNaarVasteTrainingen(){')});
    h.net.antwoord=req=>req.method==='GET'?resp(200,[{training_ref:'A'},{training_ref:'B'}]):undefined;
    if(w)naEerste(h,r=>r.method==='POST'&&r.url.indexOf('vaste_trainingen')>0);return h;
  },h=>h.ctx.migreerABNaarVasteTrainingen(),2);
  // F8/F9 — verwijderen na een bevestigingsvraag (andere tab logt in als B terwijl de vraag openstaat)
  await beide('F8 deleteVasteTraining',w=>{
    let h;h=maak({extraSrc:fn('async function deleteVasteTraining(id){'),ctx:Object.assign({},UI,{_vasteTrainingenLoaded:true,
      confirmModal:async()=>{ if(w)h.login('B'); return true; }})});return h;
  },h=>h.ctx.deleteVasteTraining('A'),2);
  await beide('F9 deleteProgramma',w=>{
    let h;h=maak({extraSrc:fn('async function deleteProgramma(progId){'),ctx:Object.assign({},UI,{programBlockExCache:{},
      confirmModal:async()=>{ if(w)h.login('B'); return true; }})});
    h.net.antwoord=req=>req.method==='GET'?resp(200,[{id:11},{id:12}]):undefined;return h;
  },h=>h.ctx.deleteProgramma(7),3);
  // F10 — nieuwe vaste training: eerst laden, dan schrijven
  await beide('F10 saveVasteTrainingName',w=>{
    let h;h=maak({extraSrc:fn('async function saveVasteTrainingName(btnEl){'),ctx:Object.assign({},UI,{vtEditId:null,vtMetaSel:{},vasteTrainingen:[],_vasteTrainingenLoaded:true,
      document:{getElementById:()=>el('Push'),querySelectorAll:()=>[],querySelector:()=>null},newVasteTrainingId:()=>'vt_x',
      ensureVasteTrainingenLoaded:async()=>{ if(w)h.login('B'); return []; }})});return h;
  },h=>h.ctx.saveVasteTrainingName(null),1);
  // F11 — her-genereren: wissel tijdens het opslaan van het eerste nieuwe blok
  await beide('F11 heergenereerResterendeWeken',w=>{
    const SRC=grab('async function heergenereerResterendeWeken(progId,btnEl){','// Uitklappen: toont oefeningen');
    const h=maak({extraSrc:'let heergenererenBezig=false;\n'+SRC,ctx:Object.assign({},UI,{computeProgramProgress:async()=>({adherencePct:80,avgRpeDelta:null}),confirmModal:async()=>true,
      ensureExercisesLoaded:async()=>{},exercises:[{id:'ex1',name:'Squat',active:true}],getOneRM:()=>null,atleet:{},atleetProfielTekst:()=>'',buildPRTekst:()=>'',
      SPORT_FOCUS_LABELS:{},SPORT_BLOCKS:{},resolveSportBlock:()=>'',buildDagDuren:()=>[],getRecentPainSummary:async()=>'',getRecentExerciseIds:async()=>[],
      phaseForWeek:()=>'opbouw',buildVarietyTekst:()=>'',buildWeekPrompt:()=>'sys',tkApiUrl:p=>p,computeBlockPlannedDates:(d,k)=>Array.from({length:k},()=>'2026-10-20'),
      parseProgrammaJSON:()=>({blocks:[{oefeningen:[{exercise_id:'ex1',sets:3,reps:5},{exercise_id:'ex1',sets:3,reps:5}]}]})})});
    h.net.antwoord=req=>{
      if(req.url.indexOf('/.netlify/functions/coach')>=0)return resp(200,{content:[{text:'{}'}]});
      if(req.method==='GET'&&req.url.indexOf('/programs?')>0)return resp(200,[{id:7,sport:'kracht',schema_type:'vast',weekdagen:[],duur_minuten:60}]);
      if(req.method==='GET'&&req.url.indexOf('/program_blocks?')>0)return resp(200,[{id:1,week_nr:1,completed_at:'x'},{id:2,week_nr:2,completed_at:null},{id:3,week_nr:3,completed_at:null}]);
      return undefined;};
    if(w)naEerste(h,r=>r.method==='POST'&&r.url.indexOf('/program_blocks')>0);return h;
  },h=>h.ctx.heergenereerResterendeWeken(7,null),6);
  klaar=true;console.log('TK-REL-SEC-17: '+n+'/'+n);
}
main().catch(e=>{console.error('FAIL',e&&e.stack||e);process.exitCode=1;});
