/* TK-REL-SEC-15 — geen onterechte succesmelding na een mislukte write (P1 uit de schrijfaanroep-matrix, 19-10-2026).
 * Draait de ECHTE productiehandlers uit index.html met een schrijflaag die faalt of slaagt.
 *  W1 agenda-koppeling intrekken      W2 vaste training opslaan       W3 vaste training verwijderen
 *  W4 programma-oefening opslaan       W5 programma-oefening verwijderen W6 programma verwijderen
 *  W7 Builder-training verwijderen     W8 1RM/startkracht opslaan      W9 programma opslaan (AI-concept)
 *  W10 extra oefeningen permanent toevoegen */
'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').replace(/\r\n/g,'\n');
function fn(decl){ // volledige functie vanaf decl, op haakjes gematcht
  const s=html.indexOf(decl);assert(s>=0,'functie niet gevonden: '+decl);
  let d=0;for(let k=html.indexOf('{',s);k<html.length;k++){if(html[k]==='{')d++;else if(html[k]==='}'){d--;if(!d)return html.slice(s,k+1);}}
  throw new Error('geen einde: '+decl);
}
let klaar=false,n=0;
process.on('exit',()=>{if(!klaar){console.error('FAIL niet alle scenario\'s afgerond (hangende promise)');process.exitCode=1;}});
const check=(ok,label)=>{assert(ok,label);n++;console.log('PASS',label);};

function ctx(src,extra){
  const st={toasts:[],closed:[],calls:[]};
  const el=id=>({value:{'vt-naam-input':'Push','bex-sets':'3','bex-reps':'5','bex-rpe':'8','bex-pct':'','bex-notes':''}[id]||'',textContent:'',style:{},disabled:false});
  const c=Object.assign({console:{log(){},warn(){},error(){}},toast:t=>st.toasts.push(t),closeModal:m=>st.closed.push(m),
    confirmModal:async()=>true,document:{getElementById:el,querySelector:()=>null},authSession:{user:{id:'A'}},
    renderSchemaTrainingList:async()=>{},renderVasteTrainingBtns:async()=>{},renderProgramBlockDetail:async()=>{},renderProgrammaList(){},refreshHome(){},
    renderCalendarFeedCard(){},renderSessionSummaryContent(){},finishSessionNoSave(){},vtMetaSave(){st.calls.push('meta');},
    ensureVasteTrainingenLoaded:async()=>{},newVasteTrainingId:()=>'vt-1',vasteTrainingen:[],vtMetaSel:{},vtEditId:null,_vasteTrainingenLoaded:true,
    programBlockExCache:{b1:[1]},curProgramBlockId:'b1',curBlockExRow:{id:'bex-1'},calendarFeedPlaintextCache:'geheim'},extra);
  c.window=c;vm.createContext(c);vm.runInContext(src,c);return {c,st};
}
const ok=s=>!!s;
async function main(){
  for(const gelukt of [false,true]){
    const T=gelukt?'(slaagt)':'(faalt)';
    // W1
    { const {c,st}=ctx(fn('async function calendarFeedRevoke(){'),{sbPatchQ:async()=>gelukt});
      await c.calendarFeedRevoke();
      check(st.toasts.includes('Agenda-koppeling ingetrokken')===gelukt&&(c.calendarFeedPlaintextCache===null)===gelukt,'W1 intrekken alleen gemeld als het lukte '+T); }
    // W2
    { const {c,st}=ctx(fn('async function saveVasteTrainingName(btnEl){'),{sbPost:async()=>gelukt,sbPatch:async()=>gelukt});
      await c.saveVasteTrainingName(null);
      check(st.toasts.includes('Opgeslagen')===gelukt&&st.closed.includes('m-vt-naam')===gelukt,'W2 vaste training: modal blijft open en geen "Opgeslagen" bij falen '+T); }
    // W3
    { const dels=[];const {c,st}=ctx(fn('async function deleteVasteTraining(id){'),{sbDel:async t=>{dels.push(t);return gelukt;}});
      await c.deleteVasteTraining('vt-1');
      check(st.toasts.includes('Verwijderd')===gelukt&&(gelukt?dels.length===2:dels.length===1),'W3 vaste training: geen "Verwijderd" en ouder blijft bij mislukte kindverwijdering '+T); }
    // W4
    { const {c,st}=ctx(fn('async function saveBlockExercise(btnEl){'),{sbPatch:async()=>gelukt});
      await c.saveBlockExercise(null);
      check(st.toasts.includes('Opgeslagen')===gelukt&&st.closed.includes('m-block-ex-edit')===gelukt,'W4 programma-oefening opslaan: invoer blijft staan bij falen '+T); }
    // W5
    { const {c,st}=ctx(fn('async function deleteBlockExercise(){'),{sbDel:async()=>gelukt});
      await c.deleteBlockExercise();
      check(st.toasts.includes('Oefening verwijderd')===gelukt&&st.closed.includes('m-block-ex-edit')===gelukt,'W5 programma-oefening verwijderen eerlijk '+T); }
    // W6
    { const dels=[];const {c,st}=ctx(fn('async function deleteProgramma(progId){'),{sbGet:async()=>[{id:'b1'},{id:'b2'}],sbDel:async t=>{dels.push(t);return gelukt;}});
      await c.deleteProgramma('p1');
      check(st.toasts.includes('Programma verwijderd')===gelukt&&(gelukt||dels.indexOf('programs')<0),'W6 programma: geen "verwijderd" en programma blijft bij een mislukte deelverwijdering '+T); }
    // W7
    { const src=fn('function deleteWorkout(wid){')+'\n'+fn('function del(wid){');
      const {c,st}=ctx(src,{customTrainings:[{id:'w1'},{id:'w2'}],lsSet(){},tkMarkeerTrainingOnbevestigd(){},tkTrainingenOnbevestigd:()=>[],render(){},
        sbDelQ:async()=>({ok:gelukt,status:gelukt?'confirmed':'failed'})});
      c.WB={deleteWorkout:c.deleteWorkout};
      await c.del('w1');await new Promise(r=>setTimeout(r,5));
      check(st.toasts.some(t=>/^Verwijderd/.test(t))===gelukt&&c.customTrainings.some(t=>t.id==='w1')===!gelukt,'W7 Builder-training: bij falen terug in de lijst en geen "Verwijderd" '+T); }
    // W8
    { const src=fn('async function upsertExerciseGoalField(exId,field,value){')+'\n'+fn('async function saveStartingStrength(btnEl){');
      const goals=new Map([['ex1',{one_rm:100}]]);
      const {c,st}=ctx(src,{exerciseGoals:goals,sbPatchQ:async()=>gelukt,sbPostQ:async()=>gelukt,resolvePickerEx:()=>true,
        computeStartingStrength:()=>({provided:[{storeIds:['ex1'],est1RM:120}]}),ssReadEntries:()=>[]});
      const r=await c.upsertExerciseGoalField('ex1','one_rm',110);
      check(r===gelukt&&(goals.get('ex1').one_rm===110)===gelukt,'W8 upsertExerciseGoalField geeft het echte resultaat; geheugen alleen bij succes bijgewerkt '+T);
      st.toasts.length=0;await c.saveStartingStrength(null);
      check(st.toasts.some(t=>/opgeslagen/.test(t)&&!/niet/.test(t))===gelukt&&st.closed.includes('m-starting-strength')===gelukt,'W8 startkracht: geen "opgeslagen" en modal open als niets is opgeslagen '+T); }
    // W8b — nog geen doelrij: insert-pad geeft ook het echte resultaat
    { const goals=new Map();
      const {c}=ctx(fn('async function upsertExerciseGoalField(exId,field,value){'),{exerciseGoals:goals,sbPatchQ:async()=>gelukt,sbPostQ:async()=>gelukt});
      check((await c.upsertExerciseGoalField('ex9','one_rm',90))===gelukt&&goals.get('ex9')._alleenGeheugen===!gelukt,'W8b nieuw doel: resultaat en markering kloppen '+T); }
    // W11 — 1RM: lokaal bewaard, eerlijke melding als de server faalt
    { const store={};const {c,st}=ctx(fn('async function saveOneRM(exId,val){'),{localStorage:{setItem:(k,v)=>{store[k]=v;},removeItem(){}},
        upsertExerciseGoalField:async()=>gelukt,pctSelection:{},applyPct(){}});
      await c.saveOneRM('ex1','105');
      check(store.tk_1rm_ex1==105&&st.toasts.some(t=>/server is mislukt/.test(t))===!gelukt,'W11 1RM lokaal bewaard; melding alleen als de server faalt '+T); }
    // W10b/W10c — vaste training en eigen training
    { const {c,st}=ctx(fn('async function permanentlyAddExtras(){'),{curT:'vtA',vasteTrainingen:[{id:'vtA'}],sessionExtra:[{_t:'vtA',id:'e1'}],
        sbUpsert:async()=>gelukt,TRAIN_CFG:{vtA:[]}});
      await c.permanentlyAddExtras();
      check(st.toasts.includes('Permanent toegevoegd aan training')===gelukt,'W10b vaste training: eerlijke melding '+T); }
    { const {c,st}=ctx(fn('async function permanentlyAddExtras(){'),{curT:'custom_ct1',customTrainings:[{id:'ct1',name:'X',exercises:[]}],sessionExtra:[{_t:'custom_ct1',id:'e1'}],
        localStorage:{setItem(){}},tkCustomTrainingPatch(){},pushCustomTrainingExercises:async()=>({ok:gelukt}),TRAIN_CFG:{}});
      await c.permanentlyAddExtras();
      check(st.toasts.includes('Permanent toegevoegd aan training')===gelukt,'W10c eigen training: eerlijke melding '+T); }
    // W9
    { const concept={naam:'P',blocks:[]};
      const {c,st}=ctx(fn('async function opslaanProgramma(){'),{programmaOpslaanBezig:false,_progConcept:concept,td:()=>'2026-10-19',sbGetOrFail:async()=>({failed:false,rows:[]}),
        sbPostReturning:async()=>gelukt?[{id:'p1'}]:null,sbPost:async()=>true,computeBlockPlannedDates:()=>[]});
      await c.opslaanProgramma();
      check(gelukt||c._progConcept===concept,'W9 programma opslaan mislukt: AI-concept blijft bewaard '+T); }
    // W10
    { const {c,st}=ctx(fn('async function permanentlyAddExtras(){'),{curT:'prog_b1',sessionExtra:[{_t:'prog_b1',id:'e1'},{_t:'prog_b1',id:'e2'}],
        sbGet:async()=>[],sbGetOrFail:async()=>({failed:false,rows:[]}),sbPost:async()=>gelukt,TRAIN_CFG:{}});
      await c.permanentlyAddExtras();
      check(st.toasts.includes('Permanent toegevoegd aan training')===gelukt&&(gelukt||st.toasts.some(t=>/niet opgeslagen/.test(t))),'W10 extra oefeningen: eerlijke telling bij falen '+T); }
  }
  klaar=true;console.log('TK-REL-SEC-15: '+n+'/'+n);
}
main().catch(e=>{console.error('FAIL',e&&e.message||e);process.exitCode=1;});
