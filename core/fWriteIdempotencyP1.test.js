/* TK-REL-SEC-18 — idempotente schrijfketen voor de resterende P1's (19-10-2026).
 * Een verloren serverantwoord, een herhaalde poging of dubbel tikken mag nooit een tweede record of een eeuwig
 * vastlopend wachtrij-item opleveren.
 *  D1 eigen oefening (exercises, id = naam): 409 omdat de rij al bestaat → alleen 'bevestigd' als dezelfde, zichtbare
 *     rij teruggelezen wordt; andere naam of niet zichtbaar → eerlijk geweigerd;
 *  D2 wachtrij: de replay van zo'n oefening gaf 409 en blokkeerde de sessie erachter voorgoed;
 *  D3 exercise_goals: idempotent via de unieke sleutel (user_id, exercise_id) — online, bij replay en na een time-out;
 *  D4 programma opslaan: gedeeltelijke fout → voorstel blijft bewaard, nieuwe poging slaat alleen de rest op;
 *  D5 programma opslaan: verloren antwoord na een geslaagde blok-insert → geen dubbel blok;
 *  D6 programma opslaan: verloren antwoord na de programma-insert → geen tweede programma;
 *  D7 dubbel tikken op programma opslaan → één programma;
 *  D8 extra oefeningen permanent aan een programmablok: herhaling na een gedeeltelijke fout → geen dubbele oefeningen;
 *  D9 hardlopen/fietsen/zwemmen afronden: verloren antwoord na de activity-insert → teruggelezen via dedupe_key,
 *     laps opgeslagen; dubbel tikken → één verzoek;
 *  D10 programmavoorstel van A terwijl intussen B is ingelogd → niets opgeslagen;
 *  D11 programma opslaan: verloren antwoord na een geslaagde oefening-upsert → geen dubbele oefeningrij.
 * Draait de ECHTE productiefuncties en schrijflaag uit index.html via core/fixtures/schrijfHarnas.js, met een kleine
 * in-memory PostgREST-nabootsing (alleen eq/is.null/not.in-filters, PK- en on_conflict-gedrag). */
'use strict';
const assert=require('assert');
const {maak,resp,fn,grab}=require('./fixtures/schrijfHarnas');
let klaar=false,n=0;
process.on('exit',()=>{if(!klaar){console.error('FAIL niet alle scenario\'s afgerond (hangende promise)');process.exitCode=1;}});
const check=(ok,label)=>{assert(ok,label);n++;console.log('PASS',label);};

// ── mini-database ─────────────────────────────────────────────────────────────
function db(){
  const T={},seq={};
  const tabel=t=>(T[t]=T[t]||[]);
  const filters=(q)=>q.split('&').filter(x=>x&&x.indexOf('select=')<0&&x.indexOf('order=')<0&&x.indexOf('limit=')<0&&x.indexOf('on_conflict=')<0).map(x=>{const i=x.indexOf('=');return [x.slice(0,i),decodeURIComponent(x.slice(i+1))];});
  const past=(rij,fs)=>fs.every(([k,v])=>{
    if(v==='is.null')return rij[k]==null;
    if(v.indexOf('eq.')===0)return String(rij[k])===v.slice(3);
    if(v.indexOf('not.in.(')===0)return v.slice(8,-1).split(',').indexOf(String(rij[k]))<0;
    return true;});
  return {T,tabel,
    afhandelen(req){
      const u=new URL(req.url);const t=u.pathname.split('/').pop();const q=u.search.slice(1);
      if(req.method==='GET')return resp(200,tabel(t).filter(r=>past(r,filters(q))));
      if(req.method==='POST'){
        const oc=(q.match(/on_conflict=([^&]+)/)||[])[1];
        const sleutel=oc?decodeURIComponent(oc).split(','):['id'];
        const merge=(req.prefer||'').indexOf('merge-duplicates')>=0, negeer=(req.prefer||'').indexOf('ignore-duplicates')>=0;
        const uit=[];
        for(const b of (Array.isArray(req.body)?req.body:[req.body])){
          const rij=Object.assign({},b);
          if(rij.user_id===undefined&&t!=='exercises')rij.user_id=req.uidBijVerzoek;
          if(rij.id==null){seq[t]=(seq[t]||0)+1;rij.id=seq[t];}
          const bestaand=tabel(t).find(x=>sleutel.every(k=>String(x[k])===String(rij[k])));
          if(bestaand){ if(merge){Object.assign(bestaand,b);uit.push(bestaand);continue;} if(negeer)continue; return resp(409,{code:'23505'}); }
          tabel(t).push(rij);uit.push(rij);
        }
        return resp(201,uit);
      }
      if(req.method==='DELETE'){const fs=filters(q);T[t]=tabel(t).filter(r=>!past(r,fs));return resp(204,null);}
      if(req.method==='PATCH'){const fs=filters(q);const rs=tabel(t).filter(r=>past(r,fs));rs.forEach(r=>Object.assign(r,req.body));return resp(200,rs);}
    }};
}
// Fout-injectie: regel(req, keer) → 'faal' (500, niets opgeslagen) | 'verloren' (opgeslagen, antwoord kwijt) | undefined
function koppel(h,d,regel){
  const keer={};
  h.net.antwoord=async req=>{
    const sl=req.method+' '+new URL(req.url).pathname.split('/').pop();keer[sl]=(keer[sl]||0)+1;
    const r=regel?regel(req,keer[sl]):undefined;
    if(r==='faal')return resp(500,{code:'XX000'});
    const a=d.afhandelen(req);
    if(r==='verloren'){const e=new TypeError('Failed to fetch');throw e;}
    return a;
  };
}

const UI={closeModal(){},renderProgrammaList(){},refreshHome(){},finishSessionNoSave(){},renderSessionSummaryContent(){},td:()=>'2026-10-19'};
function concept(){ return {naam:'Kracht 8 wk',doel:'kracht',sport:'kracht',schemaType:'vast',weekdagen:[],dagenPerWeek:2,duur:60,
  blocks:[{week_nr:1,fase_naam:'opbouw',oefeningen:[{exercise_id:'squat',sets:3,reps:5,rpe:7},{exercise_id:'bench',sets:3,reps:5,rpe:7}]},
          {week_nr:1,fase_naam:'opbouw',oefeningen:[{exercise_id:'row',sets:3,reps:8,rpe:7},{exercise_id:'dl',sets:2,reps:5,rpe:8}]}]}; }
function programmaHarnas(regel){
  const d=db();
  const h=maak({extraSrc:'let programmaOpslaanBezig=false;\n'+fn('async function opslaanProgramma(){'),ctx:Object.assign({},UI,{
    computeBlockPlannedDates:(s,k)=>Array.from({length:k},(_,i)=>'2026-10-2'+i)})});
  h.ctx._progConcept=concept();
  koppel(h,d,regel);
  return {h,d};
}

async function main(){
  // D1 — sbPostQ('exercises') bij 409
  for(const [label,zichtbaar,verwacht] of [['dezelfde zichtbare rij','Mijn oefening','confirmed'],['andere naam','Iets anders','rejected'],['niet zichtbaar',null,'rejected']]){
    const d=db();const h=maak({});
    if(zichtbaar)d.tabel('exercises').push({id:'mijn_oefening',name:zichtbaar,scope:'personal'});
    koppel(h,d,(req)=>req.method==='GET'&&!zichtbaar?undefined:undefined);
    if(!zichtbaar){ // de rij bestaat wel (andere gebruiker), maar is via RLS niet zichtbaar
      h.net.antwoord=async req=>req.method==='POST'?resp(409,{code:'23505'}):resp(200,[]); }
    const u=await h.ctx.sbPostQ('exercises',{id:'mijn_oefening',name:'Mijn oefening',scope:'personal'},{detail:true});
    check(u.status===verwacht&&h.st.queue.length===0,'D1 exercises 409, '+label+' → '+verwacht+' (niet gequeued)');
  }
  // D2 — wachtrij: oefening + sessie erachter
  { const d=db();
    const SRC=grab('let _flushBezig=false;','// DEV-UPDATE-01')+'\n'+fn('async function flushOfflineQueue(');
    const h=maak({extraSrc:SRC,ctx:{renderOfflineQueueModal(){},syncCustomTrainingsFromSupabase:undefined}});
    h.ctx.navigator.onLine=false;
    await h.ctx.sbPostQ('exercises',{id:'mijn_oefening',name:'Mijn oefening',scope:'personal'});
    await h.ctx.sbPostQ('sessions',{exercise_id:'mijn_oefening',date:'2026-10-19',sets:3});
    d.tabel('exercises').push({id:'mijn_oefening',name:'Mijn oefening',scope:'personal'}); // eerste poging kwam wél aan
    h.ctx.navigator.onLine=true;koppel(h,d);
    await h.ctx.flushOfflineQueue();
    check(h.st.queue.length===0&&d.tabel('sessions').length===1&&d.tabel('exercises').length===1,'D2 replay van een al opgeslagen oefening: uit de wachtrij, sessie erachter verstuurd, niets dubbel'); }
  // D3 — exercise_goals idempotent via (user_id, exercise_id)
  { const d=db();const h=maak({});koppel(h,d);
    d.tabel('exercise_goals').push({id:1,user_id:'A',exercise_id:'squat',one_rm:100});
    const u=await h.ctx.sbPostQ('exercise_goals',{user_id:'A',exercise_id:'squat',one_rm:110},{detail:true});
    check(u.status==='confirmed'&&d.tabel('exercise_goals').length===1&&d.tabel('exercise_goals')[0].one_rm===110,'D3 exercise_goals: bestaande doelrij → bijgewerkt, geen tweede rij en geen 409');
    const SRC=grab('let _flushBezig=false;','// DEV-UPDATE-01')+'\n'+fn('async function flushOfflineQueue(');
    const h2=maak({extraSrc:SRC,ctx:{renderOfflineQueueModal(){}}});const d2=db();
    h2.run('TK_SCHRIJF_TIMEOUT_MS=30');
    let hang=true;h2.net.antwoord=async req=>{ if(hang&&req.method==='POST'){ d2.afhandelen(req); return new Promise(()=>{}); } return d2.afhandelen(req); };
    // Zonder time-out zou deze aanroep eeuwig blijven wachten; na 500 ms telt hij als 'hangt'.
    const u2=await Promise.race([h2.ctx.sbPostQ('exercise_goals',{user_id:'A',exercise_id:'bench',one_rm:80},{detail:true}),new Promise(r=>setTimeout(()=>r({status:'hangt'}),500))]);
    hang=false;await h2.ctx.flushOfflineQueue();
    check(u2.status==='queued'&&u2.reden==='timeout'&&h2.st.queue.length===0&&d2.tabel('exercise_goals').length===1,'D3 exercise_goals: time-out na een geslaagde insert → gequeued, replay maakt geen tweede rij'); }
  // D4 — programma opslaan: gedeeltelijke fout, daarna herhalen
  { const {h,d}=programmaHarnas((req,k)=>req.method==='POST'&&req.url.indexOf('program_block_exercises')>0&&k===3?'faal':undefined);
    await h.ctx.opslaanProgramma();
    const bewaard=!!h.ctx._progConcept;
    check(bewaard&&h.st.toasts.some(t=>/deels/i.test(t)),'D4 gedeeltelijke fout: voorstel blijft bewaard en de melding zegt dat het deels is opgeslagen');
    const voor=h.st.req.length;
    await h.ctx.opslaanProgramma();
    const tweede=h.st.req.slice(voor).filter(r=>r.method!=='GET');
    check(d.tabel('programs').length===1&&d.tabel('program_blocks').length===2&&d.tabel('program_block_exercises').length===4&&!h.ctx._progConcept&&h.st.toasts.includes('Programma opgeslagen'),
      'D4 herhaling: 1 programma, 2 blokken, 4 oefeningen');
    check(tweede.length===1&&tweede[0].url.indexOf('program_block_exercises')>0,'D4 herhaling verstuurt alleen de ene mislukte oefening opnieuw ('+tweede.length+' write)'); }
  // D10 — voorstel gemaakt voor A, intussen is B ingelogd: niets opslaan
  { const {h,d}=programmaHarnas((req,k)=>req.method==='POST'&&req.url.indexOf('program_block_exercises')>0&&k===3?'faal':undefined);
    await h.ctx.opslaanProgramma();
    h.login('B');
    await h.ctx.opslaanProgramma();
    check(h.writesMet('B').length===0&&!h.ctx._progConcept&&h.st.toasts.some(t=>/ander account/.test(t)),'D10 voorstel van A na wissel naar B: niets geschreven, voorstel vervalt met melding'); }
  // D5 — verloren antwoord na blok-insert
  { const {h,d}=programmaHarnas((req,k)=>req.method==='POST'&&/\/program_blocks$/.test(new URL(req.url).pathname)&&k===2?'verloren':undefined);
    await h.ctx.opslaanProgramma();
    if(h.ctx._progConcept)await h.ctx.opslaanProgramma();
    check(d.tabel('program_blocks').length===2&&d.tabel('program_block_exercises').length===4,'D5 verloren antwoord na blok-insert: na herhaling 2 blokken en 4 oefeningen, niets dubbel'); }
  // D6 — verloren antwoord na programma-insert
  { const {h,d}=programmaHarnas((req,k)=>req.method==='POST'&&/\/programs$/.test(new URL(req.url).pathname)&&k===1?'verloren':undefined);
    await h.ctx.opslaanProgramma();
    if(h.ctx._progConcept)await h.ctx.opslaanProgramma();
    check(d.tabel('programs').length===1&&d.tabel('program_blocks').length===2,'D6 verloren antwoord na programma-insert: na herhaling precies 1 programma'); }
  // D11 — verloren antwoord na een geslaagde oefening-upsert: de herhaling gebruikt hetzelfde client-id
  { const {h,d}=programmaHarnas((req,k)=>req.method==='POST'&&req.url.indexOf('program_block_exercises')>0&&k===2?'verloren':undefined);
    await h.ctx.opslaanProgramma();
    const kanHerhalen=!!h.ctx._progConcept;
    if(kanHerhalen)await h.ctx.opslaanProgramma();
    check(kanHerhalen&&d.tabel('program_block_exercises').length===4&&!h.ctx._progConcept,'D11 verloren antwoord na oefening-upsert: herhalen kan, en daarna 4 oefeningen zonder dubbele rij'); }
  // D7 — dubbel tikken
  { const {h,d}=programmaHarnas();
    await Promise.all([h.ctx.opslaanProgramma(),h.ctx.opslaanProgramma()]);
    check(d.tabel('programs').length===1&&d.tabel('program_blocks').length===2,'D7 dubbel tikken: één programma'); }
  // D8 — extra oefeningen aan een programmablok, herhaling na gedeeltelijke fout
  { const d=db();
    const h=maak({extraSrc:fn('async function permanentlyAddExtras(){'),ctx:Object.assign({},UI,{curT:'prog_7',
      sessionExtra:[{_t:'prog_7',id:'e1'},{_t:'prog_7',id:'e2'},{_t:'prog_7',id:'e3'}],ensureVasteTrainingenLoaded:async()=>[],vasteTrainingen:[],TRAIN_CFG:{},programBlockExCache:{}})});
    d.tabel('program_block_exercises').push({id:'x0',program_block_id:'7',exercise_id:'squat',sort_order:0});
    koppel(h,d,(req,k)=>req.method==='POST'&&k===2?'faal':undefined);
    await h.ctx.permanentlyAddExtras();
    koppel(h,d);
    await h.ctx.permanentlyAddExtras();
    const ids=d.tabel('program_block_exercises').map(r=>r.exercise_id).sort().join(',');
    check(ids==='e1,e2,e3,squat','D8 herhaling na gedeeltelijke fout: elke extra oefening precies één keer in het blok ('+ids+')'); }
  // D9 — duurtraining afronden (hardlopen, fietsen, zwemmen): verloren antwoord en dubbel tikken
  const SPORTEN=[
    {naam:'hardlopen',src:grab('let _runningOpslagBezig=false;','// ── Run Detail'),f:'runningConfirmFinish',state:'_runningExecState',
      ctx:{RunningExecutionCore:{confirmFinish:(st,nu)=>({ok:true,state:Object.assign({},st,{finishedAt:nu})}),elapsedActiveMs:()=>1800000},_runningPreviewConfig:null,
        runningExecLocalStorageKey:()=>'tk_run',renderRunDetail(){}}},
    {naam:'fietsen',src:grab('let _cyclingOpslagBezig=false;','// Ride Detail'),f:'cyclingConfirmFinish',state:'_cyclingExecState',
      ctx:{cyclingExecLocalStorageKey:()=>'tk_ride',renderRideDetail(){},cadencePairSessionAverage:()=>null,cadencePairResetForNewSession(){},powerPairSessionAverage:()=>null,powerPairResetForNewSession(){},_cyclingPreviewConfig:null}},
    {naam:'zwemmen',src:grab('let _swimmingOpslagBezig=false;','// Swim Detail'),f:'swimmingConfirmFinish',state:'_swimmingExecState',
      ctx:{swimmingExecLocalStorageKey:()=>'tk_swim',renderSwimDetail(){},_swimmingPreviewConfig:null,CardioCore:{splitFromDistTime:()=>null}}}];
  for(const sp of SPORTEN){
    for(const scenario of ['verloren','dubbel']){
      const d=db();
      const basis={EnduranceExecutionCore:{confirmFinish:(st,nu)=>({ok:true,state:Object.assign({},st,{finishedAt:nu})}),elapsedActiveMs:()=>1800000},
        hrPairSessionAverage:()=>150,hrPairResetForNewSession(){},document:{getElementById:()=>null,querySelectorAll:()=>[],querySelector:()=>null}};
      const h=maak({extraSrc:sp.src,ctx:Object.assign({},UI,basis,sp.ctx,{[sp.state]:{startedAt:1760860800000,laps:[{lap_index:0,duration_seconds:300,distance_meters:1000},{lap_index:1,duration_seconds:300,distance_meters:1000}]}})});
      koppel(h,d,(req,k)=>scenario==='verloren'&&req.method==='POST'&&/\/activities$/.test(new URL(req.url).pathname)&&k===1?'verloren':undefined);
      if(scenario==='verloren'){
        let fout=null;try{await h.ctx[sp.f]();}catch(e){fout=e;}
        check(!fout&&d.tabel('activities').length===1&&d.tabel('activity_laps').length===2&&h.st.toasts.includes('Training opgeslagen'),'D9 '+sp.naam+': verloren antwoord na activity-insert → teruggelezen via dedupe_key, laps opgeslagen, geen fout');
      }else{
        await Promise.all([h.ctx[sp.f](),h.ctx[sp.f]()]);
        check(h.st.req.filter(r=>r.method==='POST'&&/\/activities$/.test(new URL(r.url).pathname)).length===1&&d.tabel('activities').length===1,'D9 '+sp.naam+': dubbel tikken op afronden → één verzoek, één activiteit');
      }
    }
  }
  klaar=true;console.log('TK-REL-SEC-18: '+n+'/'+n);
}
main().catch(e=>{console.error('FAIL',e&&e.stack||e);process.exitCode=1;});
