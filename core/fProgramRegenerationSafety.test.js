/* TK-REL-SEC-14 — "Weken opnieuw genereren" mag een trainingsschema nooit laten verdwijnen (heracceptatie 19-10-2026).
 * heergenereerResterendeWeken() verwijderde de nog niet uitgevoerde blokken VÓÓR de AI-generatie; bij een AI-fout of
 * onleesbaar antwoord bleef de sporter zonder schema. Mislukte inserts telden toch als "her-gegenereerd".
 *  R1 AI-fout halverwege: bestaand schema ongewijzigd (geen enkele delete), eerlijke melding;
 *  R2 alle weken gegenereerd: pas dan oude blokken weg en nieuwe erin;
 *  R3 mislukte delete: niets nieuws toegevoegd;
 *  R4 mislukte insert: niet als her-gegenereerd geteld;
 *  R5 accountwissel tijdens de (lange) AI-generatie: niets verwijderd of geschreven onder het nieuwe account.
 * Draait de ONGEWIJZIGDE productiefunctie uit index.html. */
'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const i=html.indexOf('async function heergenereerResterendeWeken(progId,btnEl){'),j=html.indexOf('// Uitklappen: toont oefeningen',i);
assert(i>0&&j>i,'brongrenzen niet gevonden');
const SRC=html.slice(i,j);
let klaar=false,n=0;
process.on('exit',()=>{if(!klaar){console.error('FAIL niet alle scenario\'s afgerond (hangende promise)');process.exitCode=1;}});
const check=(ok,label)=>{assert(ok,label);n++;console.log('PASS',label);};
const BLOKKEN=[{id:'b1',week_nr:1,completed_at:'x'},{id:'b2',week_nr:2,completed_at:null},{id:'b3',week_nr:3,completed_at:null}];
function maak({aiFoutWeek=null,delFaalt=false,insertFaalt=false,exFaalt=false,wisselBijWeek=null}={}){
  const st={dels:[],posts:[],returning:[],toasts:[]};
  const ctx={console:{log(){},warn(){},error(){}},heergenererenBezig:false,authSession:{user:{id:'A'}},SB_H:{Authorization:'Bearer A'},
    tkHuidigeUid:()=>(ctx.authSession&&ctx.authSession.user)?ctx.authSession.user.id:null,
    sbGet:async(t)=>t==='programs'?[{id:'p1',sport:'kracht',schema_type:'vast',weekdagen:[],duur_minuten:60}]:(t==='program_blocks'?BLOKKEN.slice():[]),
    computeProgramProgress:async()=>({adherencePct:80,avgRpeDelta:null}),confirmModal:async()=>true,toast:t=>st.toasts.push(t),
    ensureExercisesLoaded:async()=>{},exercises:[{id:'ex1',name:'Squat',active:true}],getOneRM:()=>null,atleet:{},atleetProfielTekst:()=>'',buildPRTekst:()=>'',
    SPORT_FOCUS_LABELS:{},SPORT_BLOCKS:{},resolveSportBlock:()=>'',buildDagDuren:()=>[],getRecentPainSummary:async()=>'',getRecentExerciseIds:async()=>[],
    phaseForWeek:()=>'opbouw',buildVarietyTekst:()=>'',buildWeekPrompt:()=>'sys',tkApiUrl:p=>p,td:()=>'2026-10-19',
    computeBlockPlannedDates:(d,k)=>Array.from({length:k},()=>'2026-10-20'),
    fetch:async(url,init)=>{const wk=Number(JSON.parse(init.body).messages[0].content.match(/\d+/)[0]);
      if(wisselBijWeek===wk)ctx.authSession={user:{id:'B'}};
      if(aiFoutWeek===wk)return {json:async()=>({error:{message:'overbelast'}})};
      return {json:async()=>({content:[{text:'{"w":'+wk+'}'}]})};},
    parseProgrammaJSON:(txt)=>({blocks:[{oefeningen:[{exercise_id:'ex1',sets:3,reps:5}]}]}),
    sbPost:async(t,d)=>{st.posts.push({t,uid:ctx.tkHuidigeUid()});return !(insertFaalt||(exFaalt&&t==='program_block_exercises'));},
    sbPostReturning:async(t,d)=>{st.returning.push({t,uid:ctx.tkHuidigeUid()});return insertFaalt?null:[{id:'nb'+st.returning.length}];},
    sbDel:async(t,f)=>{st.dels.push({t,f,uid:ctx.tkHuidigeUid()});return !delFaalt;},
    renderProgrammaList(){},refreshHome(){}};
  vm.createContext(ctx);vm.runInContext(SRC,ctx);return {ctx,st};
}
const audit=st=>st.posts.filter(p=>p.t!=='program_regeneration_log');
async function main(){
  { const {ctx,st}=maak({aiFoutWeek:3}); await ctx.heergenereerResterendeWeken('p1',null);
    check(st.dels.length===0&&st.returning.length===0,'R1 AI-fout in week 3: geen enkele delete of insert, bestaand schema ongewijzigd');
    check(st.toasts.some(t=>/ongewijzigd/i.test(t)),'R1 melding dat het schema ongewijzigd is'); }
  { const {ctx,st}=maak(); await ctx.heergenereerResterendeWeken('p1',null);
    check(st.dels.length===4&&st.returning.length===2,'R2 alle weken gegenereerd: oude blokken weg (2×2 deletes), 2 nieuwe blokken');
    check(st.toasts.some(t=>/^2 trainingen her-gegenereerd/.test(t)),'R2 succesmelding telt de opgeslagen trainingen'); }
  { const {ctx,st}=maak({delFaalt:true}); await ctx.heergenereerResterendeWeken('p1',null);
    check(st.returning.length===0&&st.toasts.some(t=>/niets nieuws/i.test(t)),'R3 mislukte delete: niets nieuws toegevoegd'); }
  { const {ctx,st}=maak({insertFaalt:true}); await ctx.heergenereerResterendeWeken('p1',null);
    check(!st.toasts.some(t=>/^[1-9]\d* trainingen her-gegenereerd/.test(t))&&st.toasts.some(t=>/niet \(volledig\) opgeslagen/i.test(t)),'R4 mislukte inserts worden niet als her-gegenereerd gemeld'); }
  { const {ctx,st}=maak({wisselBijWeek:3}); await ctx.heergenereerResterendeWeken('p1',null);
    check(st.dels.filter(d=>d.uid==='B').length===0&&st.returning.filter(r=>r.uid==='B').length===0&&audit(st).filter(p=>p.uid==='B').length===0,'R5 accountwissel tijdens AI-generatie: niets verwijderd of geschreven onder B');
    check(st.toasts.some(t=>/account gewisseld/i.test(t)),'R5 melding noemt de accountwissel'); }
  { const {ctx,st}=maak({exFaalt:true}); await ctx.heergenereerResterendeWeken('p1',null);
    check(st.toasts.some(t=>/^0 trainingen her-gegenereerd — 2 niet \(volledig\) opgeslagen/.test(t)),'R6 blok opgeslagen maar oefeningen niet: niet als her-gegenereerd geteld'); }
  klaar=true;console.log('TK-REL-SEC-14: '+n+'/'+n);
}
main().catch(e=>{console.error('FAIL',e&&e.message||e);process.exitCode=1;});
