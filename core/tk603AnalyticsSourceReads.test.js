'use strict';
// TK #603 analytics: ORIGINAL index.html functions (Rep-PR, show1RMChart,
// live PR/1RM, trend/AI-coach context) in a VM with synthetic accounts only.
// Personal TK- and typed catalog TKC- sessions are never combined; no prefix/
// name promotion; revoke, owner switch and RPC failure fail closed; flag OFF
// keeps the legacy contract. No real user data, network or release flag change.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const match=html.match(/^const EX_CATALOG = (\{.*\});?\s*$/m);
assert(match,'actual embedded exercise catalog required');
const catalog=JSON.parse(match[1]).catalog;
const C=catalog.find(x=>x.catalog_id==='TK-000038');
assert(C&&C.source&&C.source.provider_id);
const CATALOG_NAME=(C.identity&&((C.identity.nl&&C.identity.nl.trim())||C.identity.name))||'TK-000038';
assert.match(html,/const TK504_TYPED_FK_SESSION_RELEASE = true;/,'typed source-aware reads are activated');
let checked=0;
const ok=(x,why)=>{assert(x,why);checked++;};
function extract(name){
  const m=new RegExp('(?:async\\s+)?function\\s+'+name+'\\s*\\(').exec(html);
  assert(m,'original app function missing: '+name);
  let depth=0;
  for(let i=html.indexOf('{',m.index);i<html.length;i++){
    if(html[i]==='{')depth++;
    if(html[i]==='}'&&--depth===0)return html.slice(m.index,i+1);
  }
  throw Error('unclosed '+name);
}
const FUNCS=['tk603ReadContext','tk603ReadCurrent','tk603ReadRows','tk504CatalogSourceRefFromCatalog','tk504CatalogSourceRefFromSelection',
  'tk504ValidateCatalogSourceRef','tk504VerifySessionBinding','tk504HistoricalSourceForSession',
  'tk603OwnRows','tk603ReadExerciseSessions','tk603SetLiveSource','tk603LiveSourceKey','tk603CatalogDisplayName',
  'tk603ActiveCatalogForTypedFk','nearestRepBucket','computeRepPRsFromSessions','loadRepPRs',
  'computeExerciseTrends','tkProgressionTrendContext','tkCoachSessionStr',
  'tk603CatalogCoachSessions','show1RMChart','estimatedOneRM','logSet',
  // owner isolation (part 1)
  'tk603PickerSourceKey','tk603RecentPickerSourceKeys','loadStrengthBasis',
  // live 1RM (part 2)
  'oneRMFor','getOneRM','tk603LiveOneRM','tk603LiveIsCatalog','buildRmPanel',
  // visible stats (part 3)
  'tk603CatalogPerformanceSources','tk603CatalogProgressEntries','tk603ProgCatalogRowsHtml',
  'tk603ShowCatalogChart','refreshRepPRs','computePrTimelineFromSessions','tkPrTimeline',
  // coach execution provenance (part 4)
  'tk603CoachExecutionItems'];
// Fails if a live call site regresses to a personal-first 1RM shortcut.
function liveSrc(name){return extract(name).replace(/\/\/[^\n]*/g,'');}

// Synthetic rows. Personal TK-000038 has a heavy 1-rep record that must
// never appear as a catalog PR; catalog TKC-000038 is lighter.
const personal=[
  {exercise_id:'TK-000038',date:'2026-09-01',weight:200,reps:1,sets:1},
  {exercise_id:'TK-000038',date:'2026-09-08',weight:150,reps:5,sets:3},
  {exercise_id:'TK-000038',date:'2026-09-15',weight:140,reps:5,sets:3}];
const typed=[
  {exercise_id:'TKC-000038',date:'2026-11-01',weight:72,reps:8,sets:3},
  {exercise_id:'TKC-000038',date:'2026-11-03',weight:80,reps:5,sets:3},
  {exercise_id:'TKC-000038',date:'2026-11-05',weight:76,reps:5,sets:3}];
const unknownTyped=[
  {exercise_id:'TKC-000019',date:'2026-11-02',weight:300,reps:1,sets:1},
  {exercise_id:'TKC-000019',date:'2026-11-03',weight:300,reps:1,sets:1},
  {exercise_id:'TKC-000019',date:'2026-11-04',weight:300,reps:1,sets:1}];

function env(){
  const st={owner:'A',online:true,release:true,mode:'ok',rpcs:[],queries:[],
    switchOnRpc:0,switchOnQuery:0,toasts:[],modals:[],dom:{}};
  const elements=new Proxy({},{get:(t,id)=>{
    if(!t[id])t[id]={value:'',innerHTML:'',querySelector(sel){return this.innerHTML.includes('pr-badge')&&sel==='.pr-badge'?{}:null;}};
    return t[id];
  }});
  st.dom=elements;
  const ctx={
    get TK504_TYPED_FK_SESSION_RELEASE(){return st.release;},
    navigator:{get onLine(){return st.online;}},
    tkEigenaarUid:()=>st.owner,
    ExerciseCatalogService:{byId:id=>catalog.find(x=>x.catalog_id===id)||null},
    sbRpc:async(fn,args)=>{
      st.rpcs.push({fn,args});
      if(st.switchOnRpc&&st.rpcs.length===st.switchOnRpc)st.owner='B';
      if(st.mode==='throw')throw Error('rpc down');
      if(fn==='tk504_resolve_catalog_fk'){
        if(st.mode==='revoked')return null; // active binding withdrawn
        return args.p_catalog_id==='TK-000038'&&args.p_provider_id===C.source.provider_id?'TKC-000038':null;
      }
      if(fn==='tk504_historical_catalog_id')
        return args.p_exercise_id==='TKC-000038'?'TK-000038':null; // own history survives revoke
      throw Error('unexpected RPC '+fn);
    },
    sbGet:async(table,q)=>{
      assert.equal(table,'sessions');
      st.queries.push(q);
      if(st.switchOnQuery&&st.queries.length===st.switchOnQuery)st.owner='B';
      // Hostile server echo: cross-FK rows in a typed response must be filtered.
      if(q.includes('exercise_id=eq.TKC-000038'))
        return [...typed,personal[0],unknownTyped[0],
          ...(st.mode==='foreign'?[{exercise_id:'TKC-000038',user_id:'B',date:'2026-11-06',weight:999,reps:1}]:[])];
      if(q.includes('exercise_id=eq.TK-000038'))
        return [...personal,...(st.mode==='foreign'
          ?[{exercise_id:'TK-000038',user_id:'B',date:'2026-11-06',weight:999,reps:1},
            {exercise_id:'TK-000038',user_id:'A',date:'2026-09-20',weight:120,reps:5}]:[])];
      // stats discovery of own typed FKs (RLS-owned; a foreign row is dropped)
      if(q.includes('exercise_id=like.TKC-*'))
        return [...typed,...unknownTyped,{exercise_id:'TKC-000040',user_id:'B',weight:1,reps:1,date:'2026-11-01'}];
      if(q.includes('exercise_id=not.is.null'))
        return [{exercise_id:'TK-000038',user_id:'A'},{exercise_id:'TK-000099',user_id:'B'}];
      return [];
    },
    repPRCache:{},strengthBasisCache:{},estOneRMCache:{},
    // part 1-4 dependencies
    localStorage:{getItem:k=>k==='tk_1rm_TK-000038'?'300':null},
    pctSelection:{},checkColdStart(){},escHtml:x=>String(x),
    progCatalogData:[],progExTrends:{},
    resolvedWorkout:null,sessionExtra:[],TRAIN_CFG:{},
    tk603LiveSource:Object.create(null),
    REP_PR_BUCKETS:[1,3,5,10],
    // computeExerciseTrends dependencies (protected cores stubbed, trendBy deterministic)
    AthleteCore:{},CalcCore:{oneRMRaw:(w,r)=>w*(1+r/30),
      // deterministic stand-in for CALC-STR-006: recent = first row, peak = max e1RM
      selectStrengthBasis:(rows)=>{
        const e=(rows||[]).filter(x=>x&&x.weight&&x.reps).map(x=>({e1rm:Math.round(x.weight*(1+x.reps/30)),date:x.date}));
        return {recent:e[0]||null,peak:e.length?e.reduce((m,x)=>x.e1rm>m.e1rm?x:m):null,prev:e[0]||null};
      }},
    ProgressionCore:{trendBy:(hist,key)=>({status:'trend',improving:false,key,n:hist.length})},
    tkRelData:async()=>{},_tkRelSessies:[...personal,...typed,...unknownTyped],
    E:()=>({byId:id=>id==='TK-000038'?{naam:'Eigen bankdrukken'}:null}),
    // show1RMChart UI dependencies
    toast:m=>st.toasts.push(m),epley1RMRaw:(w,r)=>w*(1+r/30),v48FmtDatum:d=>d,
    peakGoalFor:id=>id==='TK-000038'?250:null,drawChart:()=>{},setTimeout:()=>{},
    document:{
      createElement:()=>({className:'',style:{},innerHTML:'',remove(){}}),
      getElementById:id=>id==='app'?{appendChild:m=>st.modals.push(m)}:elements[id]
    },
    // logSet dependencies
    sessionLog:{},normNumStr:x=>x==null?x:String(x).replace(',','.'),
    numNL:x=>parseFloat(x),getEffectiveKg:(exId,n)=>parseFloat(elements['s-'+exId+'-'+n+'-kg'].value),
    exercises:[{id:'TK-000038',name:'Eigen bankdrukken'}],
    prFor:id=>ctx.exerciseGoals.has(id)?ctx.exerciseGoals.get(id).pr:null,
    sessionPrBase:{},exerciseGoals:new Map([['TK-000038',{pr:150}]]),
    BARBELL_EXERCISES:new Set(),showEpleyHint(){},updateSetE1RM(){},tkLiveCoachUpdate(){},
    updateProgress(){},updateSummary(){},scheduleAutosave(){},curT:'A',td:()=>'2026-11-06',
    Object,Array,Set,Map,Math,Number,String,JSON,Promise,parseFloat,parseInt,isFinite,console
  };
  const s=vm.createContext(ctx);
  vm.runInContext(FUNCS.map(extract).join('\n'),s,{timeout:6000});
  const ref=s.tk504CatalogSourceRefFromSelection('TK-000038');
  assert(ref&&ref.provider_id===C.source.provider_id);
  return {s,st,ref};
}
function reset(a){a.st.owner='A';a.st.mode='ok';a.st.rpcs=[];a.st.queries=[];
  a.st.switchOnRpc=0;a.st.switchOnQuery=0;a.st.toasts=[];a.st.modals=[];a.st.release=true;}
function setInputs(a,exId,n,kg,reps){
  a.st.dom['s-'+exId+'-'+n+'-kg'].value=String(kg);
  a.st.dom['s-'+exId+'-'+n+'-reps'].value=String(reps);
  a.st.dom['s-'+exId+'-'+n+'-rpe'].value='8';
  a.st.dom['sc-'+exId+'-'+n].innerHTML='';
}

(async()=>{
  const a=env();
  // ── Rep-PR (loadRepPRs) ────────────────────────────────────────────────
  const pPR=await a.s.loadRepPRs('TK-000038');
  const cPR=await a.s.loadRepPRs('TK-000038',a.ref);
  ok(pPR[1]&&pPR[1].weight===200&&pPR[5].weight===150,'personal Rep-PR keeps personal TK- data');
  ok(cPR[1]===null&&cPR[5].weight===80&&cPR[10].weight===72,
    'catalog Rep-PR uses ONLY verified TKC- rows (200 kg personal / 300 kg other FK filtered)');
  ok(a.s.repPRCache['TK-000038']===pPR&&a.s.repPRCache['catalog:A:TK-000038']===cPR,
    'personal and owner-keyed catalog Rep-PR caches are separate');
  ok(a.st.queries.filter(q=>q.includes('exercise_id=eq.TK-000038')).length===1&&
     a.st.queries.some(q=>q.includes('exercise_id=eq.TKC-000038')&&q.includes('limit=300')),
    'catalog Rep-PR never issues a personal TK- query; same 300-row PR window');

  reset(a);a.st.mode='revoked';
  const rPR=await a.s.loadRepPRs('TK-000038',a.ref);
  ok(Object.values(rPR).every(v=>v===null)&&!('catalog:A:TK-000038' in a.s.repPRCache)&&
     a.st.queries.length===0,'revoked binding → empty PR, cached catalog PR dropped, no personal fallback');
  ok(a.s.repPRCache['TK-000038']===pPR,'revoke does not touch personal Rep-PR');

  reset(a);a.st.mode='throw';
  ok(Object.values(await a.s.loadRepPRs('TK-000038',a.ref)).every(v=>v===null)&&a.st.queries.length===0,
    'RPC failure → empty PR, no personal fallback');

  reset(a);a.st.switchOnQuery=1;
  const swPR=await a.s.loadRepPRs('TK-000038',a.ref);
  ok(Object.values(swPR).every(v=>v===null)&&!('catalog:B:TK-000038' in a.s.repPRCache)&&
     !('catalog:A:TK-000038' in a.s.repPRCache),'owner switch during session read → no cache for A or B');

  reset(a);
  ok(Object.values(await a.s.loadRepPRs('TK-000038',{...a.ref,provider_id:'spoof'})).every(v=>v===null)&&
     a.st.rpcs.length===0&&a.st.queries.length===0,'forged provider ref fails closed before any RPC/read');
  ok(Object.values(await a.s.loadRepPRs('TK-000038',{kind:'movekit-catalog-v1',catalog_id:'TK-000099',provider_id:C.source.provider_id})).every(v=>v===null),
    'ref for a different catalog id is not promoted to this id');

  reset(a);a.st.release=false;
  const offPR=await a.s.loadRepPRs('TK-000038',a.ref);
  ok(offPR[1].weight===200&&a.st.rpcs.length===0&&a.st.queries.every(q=>q.includes('exercise_id=eq.TK-000038')),
    'flag OFF: ref ignored, original personal Rep-PR query and cache');

  // ── show1RMChart ───────────────────────────────────────────────────────
  reset(a);
  await a.s.show1RMChart('TK-000038','Bankdrukken',a.ref);
  ok(a.st.modals.length===1,'catalog chart rendered with verified source');
  let h=a.st.modals[0].innerHTML;
  ok(h.includes('80 kg')&&h.includes('72×8')&&!h.includes('200 kg')&&!h.includes('200×1')&&!h.includes('300'),
    'catalog chart/PR cells contain only typed TKC- performance');
  ok(!h.includes('Doel:'),'personal peak goal is not applied to catalog chart');
  ok(h.includes('Dalend')&&h.includes('Gebaseerd op 3 geregistreerde'),
    'trend looked up by verified TKC- FK; 3 typed points (foreign echoes filtered)');
  ok(!a.st.queries.some(q=>q.includes('exercise_id=eq.TK-000038')),'catalog chart issues no personal query');

  reset(a);
  await a.s.show1RMChart('TK-000038','Bankdrukken');
  h=a.st.modals[0].innerHTML;
  ok(h.includes('200 kg')&&h.includes('Doel:')&&!h.includes('72×8')&&a.st.rpcs.length===0,
    'personal chart unchanged: personal rows, personal goal, no catalog RPC');

  reset(a);a.st.mode='revoked';
  await a.s.show1RMChart('TK-000038','Bankdrukken',a.ref);
  ok(a.st.modals.length===0&&a.st.toasts[0].startsWith('Geen geverifieerde catalogusdata')&&a.st.queries.length===0,
    'revoked catalog chart: no modal, no personal fallback');

  reset(a);a.st.switchOnRpc=1;
  await a.s.show1RMChart('TK-000038','Bankdrukken',a.ref);
  ok(a.st.modals.length===0&&a.st.queries.length===0,'owner switch during binding RPC → nothing rendered');

  reset(a);a.st.switchOnRpc=2; // 1st binding passes, owner changes during the Rep-PR binding
  await a.s.show1RMChart('TK-000038','Bankdrukken',a.ref);
  ok(a.st.modals.length===0,'owner switch during later async Rep-PR read → nothing rendered');

  reset(a);a.st.online=false;
  await a.s.show1RMChart('TK-000038','Bankdrukken',a.ref);
  ok(a.st.modals.length===0&&a.st.rpcs.length===0,'offline catalog chart fails closed');
  a.st.online=true;

  reset(a);a.st.release=false;
  await a.s.show1RMChart('TK-000038','Bankdrukken',a.ref);
  h=a.st.modals[0].innerHTML;
  ok(h.includes('200 kg')&&h.includes('Doel:')&&a.st.rpcs.length===0,'flag OFF: chart keeps legacy personal behaviour');

  // ── live PR badge / personal goal / live 1RM (logSet, estimatedOneRM) ──
  reset(a);
  a.s.repPRCache['TK-000038']={1:{weight:200},3:null,5:{weight:150},10:null};
  a.s.tk603SetLiveSource('TK-000038','TK-000038',a.ref);
  await a.s.loadRepPRs('TK-000038',a.ref);
  setInputs(a,'TK-000038',1,170,1);
  a.s.logSet('TK-000038','s',1,true);
  ok(a.st.dom['sc-TK-000038-1'].innerHTML.includes('PR@1'),'catalog live set compared with catalog PR only');
  ok(a.s.repPRCache['TK-000038'][1].weight===200&&a.s.repPRCache['catalog:A:TK-000038'][1].weight===170,
    'catalog live PR updates ONLY the owner-keyed catalog cache');
  ok(a.s.exerciseGoals.get('TK-000038').pr===150&&!('TK-000038' in a.s.sessionPrBase),
    'catalog set never updates personal exercise_goals PR');
  a.s.strengthBasisCache['catalog:A:TK-000038']={recent:{e1rm:95}};
  a.s.estOneRMCache['TK-000038']=210;
  ok(['manual-first','est-first','est-only'].every(o=>a.s.tk603LiveOneRM('TK-000038',o)===95),
    'live 1RM for catalog item = its own CALC-STR-006 basis (manual personal 300 kg ignored)');
  ok(a.s.estimatedOneRM('TK-000038')===210&&a.s.getOneRM('TK-000038')===300,
    'non-live readers (Preview/stats) of the same id are NOT globally suppressed');
  ok(a.s.tk603LiveIsCatalog('TK-000038')===true&&a.s.buildRmPanel({id:'TK-000038'},true)==='',
    'manual-1RM panel (personal read+write) is not offered for a catalog-bound live item');
  delete a.s.strengthBasisCache['catalog:A:TK-000038'];
  ok(['manual-first','est-first','est-only'].every(o=>a.s.tk603LiveOneRM('TK-000038',o)===null),
    'no catalog basis → null, never personal manual 1RM/PR fallback');

  reset(a);a.st.mode='revoked';
  a.s.tk603SetLiveSource('TK-000038','TK-000038',a.ref);
  await a.s.loadRepPRs('TK-000038',a.ref);
  setInputs(a,'TK-000038',2,500,1);
  a.s.logSet('TK-000038','s',2,true);
  ok(!a.st.dom['sc-TK-000038-2'].innerHTML.includes('PR@')&&!('catalog:A:TK-000038' in a.s.repPRCache)&&
     a.s.exerciseGoals.get('TK-000038').pr===150,'unverified catalog live item: no PR claim of any kind');

  reset(a);
  a.s.tk603SetLiveSource('TK-000038','TK-000038',a.ref);
  await a.s.loadRepPRs('TK-000038',a.ref);
  a.st.owner='B';
  setInputs(a,'TK-000038',3,500,1);
  a.s.logSet('TK-000038','s',3,true);
  ok(!a.st.dom['sc-TK-000038-3'].innerHTML.includes('PR@')&&a.s.tk603LiveOneRM('TK-000038','manual-first')===null&&
     a.s.tk603LiveIsCatalog('TK-000038')===true&&
     a.s.exerciseGoals.get('TK-000038').pr===150,'owner change after source claim → no PR, no 1RM');

  reset(a);
  a.s.tk603SetLiveSource('TK-000038','TK-000038',null); // personal item with same id
  setInputs(a,'TK-000038',4,170,1);
  a.s.logSet('TK-000038','s',4,true);
  ok(!a.st.dom['sc-TK-000038-4'].innerHTML.includes('PR@')&&a.s.exerciseGoals.get('TK-000038').pr===170,
    'personal same-ID item keeps legacy personal PR semantics (170<200 rep-PR, goal PR 150→170)');
  ok(a.s.estimatedOneRM('TK-000038')===210&&a.s.tk603LiveOneRM('TK-000038','manual-first')===300&&
     a.s.tk603LiveOneRM('TK-000038','est-first')===210&&a.s.tk603LiveIsCatalog('TK-000038')===false&&
     a.s.buildRmPanel({id:'TK-000038'},false).includes('value="300"'),
    'personal same-ID live item keeps legacy precedence and manual 1RM panel');

  reset(a);a.st.release=false;
  a.s.exerciseGoals.get('TK-000038').pr=150;
  a.s.tk603LiveSource['TK-000038']=Object.freeze({exId:'TK-000038',owner:'A',key:'catalog:A:TK-000038'});
  setInputs(a,'TK-000038',5,170,1);
  a.s.logSet('TK-000038','s',5,true);
  ok(a.s.exerciseGoals.get('TK-000038').pr===170&&a.s.estimatedOneRM('TK-000038')===210&&
     a.s.tk603LiveOneRM('TK-000038','manual-first')===300&&a.s.tk603LiveIsCatalog('TK-000038')===false,
    'flag OFF: stale source map is ignored, legacy logSet/1RM precedence unchanged');
  a.s.tk603SetLiveSource('X','X',a.ref);
  ok(!('X' in a.s.tk603LiveSource),'flag OFF: no source claim is recorded');

  // ── AI coach: trend names ──────────────────────────────────────────────
  reset(a);
  let t=await a.s.tkProgressionTrendContext();
  ok(t.aantalDalend===2&&t.tekst.includes('Eigen bankdrukken')&&
     t.tekst.includes(CATALOG_NAME+' (Movekit-catalogus)')&&!t.tekst.includes('TKC-000019'),
    'coach trends: personal and verified catalog listed separately; unverifiable TKC omitted');
  reset(a);a.st.mode='revoked';
  t=await a.s.tkProgressionTrendContext();
  ok(t.aantalDalend===1&&!t.tekst.includes('Movekit')&&!t.tekst.includes('TKC-'),
    'revoked active binding: catalog trend removed from coach context');
  reset(a);a.st.switchOnRpc=1;
  t=await a.s.tkProgressionTrendContext();
  ok(t.tekst===''&&t.aantalDalend===0,'owner switch during coach trend verification → empty context');
  reset(a);a.st.release=false;
  t=await a.s.tkProgressionTrendContext();
  ok(t.aantalDalend===3&&t.tekst.includes('TKC-000038')&&a.st.rpcs.length===0,
    'flag OFF: legacy trend context unchanged (no RPC)');

  // ── AI coach: recent sessions block ───────────────────────────────────
  reset(a);
  let c=await a.s.tk603CatalogCoachSessions([{id:'TK-000038',tk504_catalog_ref:a.ref}],null);
  ok(c.includes(CATALOG_NAME+' (Movekit-catalogus) [catalogus-id:TK-000038]')&&c.includes('80kg')&&
     !c.includes('200kg')&&!c.includes('300kg'),'active-training catalog item: only typed sessions in coach context');
  ok(!a.st.queries.some(q=>q.includes('exercise_id=eq.TK-000038')),'no personal query for catalog coach item');
  reset(a);
  c=await a.s.tk603CatalogCoachSessions([],[...personal,...typed,...unknownTyped]);
  ok(c.includes('[catalogus-id:TK-000038]')&&!c.includes('300kg')&&!c.includes('200kg'),
    '30-day window: verified TKC kept as catalog, unknown TKC and personal rows not added');
  reset(a);a.st.mode='revoked';
  ok((await a.s.tk603CatalogCoachSessions([{id:'TK-000038',tk504_catalog_ref:a.ref}],typed))==='',
    'revoked: no catalog coach lines');
  reset(a);a.st.switchOnQuery=1;
  ok((await a.s.tk603CatalogCoachSessions([{id:'TK-000038',tk504_catalog_ref:a.ref}],null))==='',
    'owner switch during coach session read → empty');
  reset(a);
  ok((await a.s.tk603CatalogCoachSessions([{id:'TK-000038',tk504_catalog_ref:{...a.ref,provider_id:'x'}}],null))===''&&
     a.st.rpcs.length===0,'forged coach ref → no RPC, no line');
  reset(a);a.st.release=false;
  ok((await a.s.tk603CatalogCoachSessions([{id:'TK-000038',tk504_catalog_ref:a.ref}],typed))===''&&
     a.st.rpcs.length===0&&a.st.queries.length===0,'flag OFF: catalog coach helper inert');
  ok(a.s.tkCoachSessionStr([personal[1],personal[0]])==='2026-09-08 3×5 @ 150kg | vorige: 2026-09-01 200kg',
    'shared coach line format equals the former inline format');

  // ── part 1: owner captured before async; foreign rows; no stale cache writes ──
  reset(a);a.st.release=false;a.st.switchOnQuery=1;
  ok((await a.s.tk603ReadExerciseSessions('TK-000038')).length===0,'legacy read: owner switch during query → []');
  reset(a);a.st.mode='foreign';
  let rows=await a.s.tk603ReadExerciseSessions('TK-000038');
  ok(rows.length===4&&!rows.some(r=>r.user_id==='B')&&rows.filter(r=>r.user_id==='A').length===1&&
     rows.filter(r=>r.user_id==null).length===3,'legacy read: explicit foreign user_id dropped; own + select-omitted rows kept');
  reset(a);a.st.mode='foreign';
  const m1={};rows=await a.s.tk603ReadExerciseSessions('TK-000038',a.ref,undefined,m1);
  ok(rows.length===3&&rows.every(r=>r.exercise_id==='TKC-000038'&&r.user_id!=='B')&&m1.verified===true&&m1.owner_uid==='A',
    'typed read: foreign 999 kg row dropped; meta verified only after all checks');
  reset(a);a.st.switchOnQuery=1;const m2={};
  await a.s.tk603ReadExerciseSessions('TK-000038',a.ref,undefined,m2);
  ok(m2.verified!==true,'typed read: owner switch → meta never verified');
  reset(a);a.st.switchOnQuery=1;
  ok((await a.s.tk603RecentPickerSourceKeys()).length===0,'recents: owner switch during the FIRST sbGet → []');
  reset(a);a.st.owner=null;
  ok((await a.s.tk603RecentPickerSourceKeys()).length===0&&a.st.queries.length===0,'recents: no owner → no request at all');
  reset(a);
  ok(JSON.stringify(Array.from(await a.s.tk603RecentPickerSourceKeys()))==='["legacy:TK-000038"]',
    'recents: explicit foreign user_id row dropped');
  reset(a);a.s.repPRCache={};a.st.switchOnQuery=1;
  const lp=await a.s.loadRepPRs('TK-000038');
  ok(Object.values(lp).every(v=>v===null)&&Object.keys(a.s.repPRCache).length===0,
    'legacy Rep-PR: response arriving after B login writes no cache');
  reset(a);a.st.switchOnQuery=1;a.s.estOneRMCache['TK-000038']=210;
  const sbBefore=JSON.stringify(a.s.strengthBasisCache);
  const lb=await a.s.loadStrengthBasis('TK-000038');
  ok(lb.recent===null&&JSON.stringify(a.s.strengthBasisCache)===sbBefore&&a.s.estOneRMCache['TK-000038']===210,
    'legacy basis: response arriving after B login writes no basis/e1RM cache');
  reset(a);a.st.mode='foreign';
  const lb2=await a.s.loadStrengthBasis('TK-000038');
  ok(lb2.peak&&lb2.peak.e1rm===Math.round(200*(1+1/30)),'legacy basis: foreign 999 kg row never reaches the calculator');
  a.s.estOneRMCache['TK-000038']=210;

  // ── part 3: visible stats (progress list, chart onclick, Rep-PR card, PR timeline) ──
  reset(a);a.s.progExTrends=await a.s.computeExerciseTrends();
  const srcs=await a.s.tk603CatalogPerformanceSources();
  ok(srcs.length===1&&srcs[0].id==='TK-000038'&&srcs[0].fk_id==='TKC-000038'&&srcs[0].sourceKey==='catalog:TK-000038'&&
     srcs[0].sourceRef.provider_id===C.source.provider_id,
    'stats adapter: only owner-history + active-binding TKC (unknown TKC-000019 and foreign TKC-000040 dropped)');
  ok(!a.st.rpcs.some(r=>r.args&&(r.args.p_exercise_id==='TKC-000040')),'foreign discovered FK is never even checked');
  reset(a);a.s.progCatalogData=await a.s.tk603CatalogProgressEntries();
  ok(a.s.progCatalogData.length===1&&a.s.progCatalogData[0].disp===Math.round(80*(1+5/30))&&a.s.progCatalogData[0].tgt===null,
    'progress entry: catalog peak from TKC rows only (93), never personal 207 or peak goal');
  const rowsHtml=a.s.tk603ProgCatalogRowsHtml();
  ok(rowsHtml.includes('data-tk603-source="catalog:TK-000038"')&&rowsHtml.includes('onclick="tk603ShowCatalogChart(0)"')&&
     rowsHtml.includes(CATALOG_NAME+' (Movekit-catalogus)')&&rowsHtml.includes('93 kg')&&rowsHtml.includes('Dalend'),
    'visible progress row: distinct catalog source key + label, chart caller, TKC-keyed trend');
  reset(a);await a.s.tk603ShowCatalogChart(0);
  ok(a.st.modals.length===1&&a.st.rpcs.some(r=>r.fn==='tk504_resolve_catalog_fk')&&
     a.st.modals[0].innerHTML.includes('72×8')&&!a.st.modals[0].innerHTML.includes('200 kg'),
    'the visible onclick opens the chart WITH the explicit catalog ref');
  reset(a);a.st.owner='B';
  ok(a.s.tk603ProgCatalogRowsHtml()===''&&(await a.s.tk603ShowCatalogChart(0))===null&&a.st.modals.length===0,
    "owner A's catalog entries are neither rendered nor clickable for B");
  reset(a);a.st.mode='revoked';
  ok((await a.s.tk603CatalogProgressEntries()).length===0,'revoked: no catalog progress entry');
  reset(a);a.st.switchOnRpc=1;
  ok((await a.s.tk603CatalogProgressEntries()).length===0,'owner switch during discovery → no entries');
  reset(a);a.st.release=false;
  ok((await a.s.tk603CatalogPerformanceSources()).length===0&&(await a.s.tk603CatalogProgressEntries()).length===0&&
     a.st.queries.length===0&&a.st.rpcs.length===0,'flag OFF: stats adapter inert (no request)');

  reset(a);await a.s.refreshRepPRs();
  let card=a.st.dom['stats-reppr-content'].innerHTML;
  ok(card.includes('Eigen bankdrukken')&&card.includes('200 kg')&&card.includes('data-tk603-source="catalog:TK-000038"')&&
     card.includes(CATALOG_NAME+' (Movekit-catalogus)'),'Rep-PR card: same-ID personal and catalog rows both visible, distinguishable');
  const catPart=card.slice(card.indexOf('data-tk603-source'));
  ok(catPart.includes('80 kg')&&catPart.includes('72 kg')&&!catPart.includes('200 kg'),'catalog Rep-PR row holds only typed PRs');
  reset(a);a.st.release=false;a.st.dom['stats-reppr-content'].innerHTML='';
  await a.s.refreshRepPRs();
  card=a.st.dom['stats-reppr-content'].innerHTML;
  ok(card.includes('200 kg')&&!card.includes('Movekit')&&a.st.rpcs.length===0,'flag OFF: Rep-PR card legacy only');

  reset(a);
  let ev=await a.s.tkPrTimeline();
  const catEv=ev.filter(e=>e.exerciseId==='catalog:TK-000038'), perEv=ev.filter(e=>e.exerciseId==='TK-000038');
  ok(catEv.length>0&&perEv.length>0&&catEv.every(e=>e.weight<100&&e.exerciseNaam.includes('Movekit-catalogus'))&&
     perEv.some(e=>e.weight===200)&&perEv.every(e=>e.weight>=140),'PR timeline: separate catalog and personal event streams, never unioned');
  reset(a);a.st.switchOnQuery=2;
  ev=await a.s.tkPrTimeline();
  ok(!ev.some(e=>String(e.exerciseId).startsWith('catalog:')),'PR timeline: owner switch during discovery → no catalog events');
  reset(a);a.st.release=false;
  ev=await a.s.tkPrTimeline();
  ok(!ev.some(e=>String(e.exerciseId).startsWith('catalog:'))&&a.st.rpcs.length===0,'flag OFF: PR timeline legacy only');

  // ── part 4: coach provenance from the ACTUAL execution items ──
  reset(a);
  a.s.TRAIN_CFG={A:[{id:'TK-000038'},{id:'TK-000050'}]};
  a.s.resolvedWorkout={t:'A',items:[{id:'TK-000038',tk504_catalog_ref:a.ref},{id:'TK-000050'}]};
  a.s.sessionExtra=[{id:'TK-000060',_t:'A'},{id:'TK-000070',_t:'B'}];
  const items=a.s.tk603CoachExecutionItems('A');
  ok(items.length===3&&items[0].tk504_catalog_ref===a.ref&&items.some(e=>e.id==='TK-000060')&&!items.some(e=>e.id==='TK-000070'),
    "coach items = resolvedWorkout (with its refs) + this training's sessionExtra, not the bare TRAIN_CFG");
  a.s.resolvedWorkout=null;
  ok(a.s.tk603CoachExecutionItems('A').map(e=>e.id).join()==='TK-000038,TK-000050,TK-000060'&&
     a.s.tk603CoachExecutionItems('A').every(e=>e.tk504_catalog_ref==null),
    'without resolvedWorkout: TRAIN_CFG + sessionExtra; bare ids never get a guessed ref');

  // ── wiring in the real callers (static, original source) ──────────────
  ok(html.includes("const tk603CtxItems=(tk603Typed&&curT)?tk603CoachExecutionItems(curT):[];")&&
     html.includes("new Set(tk603CtxItems.filter(e=>e&&e.id&&e.tk504_catalog_ref==null&&!tk603CtxCatalogIds.has(e.id)).map(e=>e.id))")&&
     html.includes(": new Set((TRAIN_CFG[curT]||[]).map(e=>e.id))) : null;")&&
     html.includes('exCtx+=await tk603CatalogCoachSessions(tk603CtxCatalog,relevantExIds?null:recentSessions);'),
    'buildCtx: actual execution refs override/omit ambiguous personal ids; flag OFF keeps TRAIN_CFG query');
  ok(/tk603LiveOneRM\(exId,'est-first'\)/.test(liveSrc('autoGenerateWarmup'))&&!/getOneRM/.test(liveSrc('autoGenerateWarmup')),
    'warm-up uses the live source helper (no direct manual 1RM)');
  ok(/tk603LiveOneRM\(exId,'est-first'\)/.test(liveSrc('suggestTopset'))&&!/getOneRM/.test(liveSrc('suggestTopset')),
    'topset suggestion uses the live source helper');
  ok(/tk603LiveOneRM\(exId,'est-only'\)/.test(liveSrc('getEffectiveKg'))&&!/estimatedOneRM\(exId\)/.test(liveSrc('getEffectiveKg')),
    '%1RM set mode uses the live source helper');
  ok(html.includes("const oneRM=tk603LiveIsCatalog(ex.id)?tk603LiveOneRM(ex.id,'manual-first'):(getOneRM(ex.id)||estimatedOneRM(ex.id));"),
    'program prefill: catalog-bound → no manual fallback; personal → original expression');
  ok(html.includes("buildRmPanel(ex,tk603LiveIsCatalog(ex.id))")&&html.includes("buildRmPanel(ex,tk603LiveIsCatalog(LOS_DOMID))")&&
     !/buildRmPanel\(ex\)/.test(html),'both manual-1RM panel callers pass the explicit live source');
  ok(/out\.strengthBasis=opts\.sourceBound===true\?null:/.test(extract('resolveWorkingWeight')),
    'strengthBasisProvenance (manual-1RM provenance) is never consulted for a source-bound resolve');
  ok(html.includes('const nextCatalog=await tk603CatalogProgressEntries();')&&html.includes('progExData=nextProg;progCatalogData=nextCatalog;')&&html.includes('h+=tk603ProgCatalogRowsHtml();'),
    'refreshStatsScreen/renderProgList render the catalog entries in the existing list');
  ok(html.includes("if(TK504_TYPED_FK_SESSION_RELEASE===true)tk603SetLiveSource(ex.id,ex.id,_tkRef);")&&
     /await loadRepPRs\(ex.id,_tkRef\);[\s\S]*?await loadStrengthBasis\(ex.id,_tkRef\);/.test(extract('renderTrainScreen')),
    'training prefetch propagates the actual item ref to Rep-PR/basis');
  ok(html.includes("const _losRef=(TK504_TYPED_FK_SESSION_RELEASE===true&&ex._catalog===true)?tk603CatalogRefFromPickerSelection(ex):null;"),
    'loose exercise derives source only from the actual canonical picker object');
  ok(html.includes("tk603LiveSource=Object.create(null); // #603"),'logout clears live source claims');

  // ── part 1: account switch clears every source-scoped cache (real reset function) ──
  reset(a);
  let invalidated=0;
  const ls={tk_cache_owner_uid:'A'};
  a.s.invalidateExPickerPool=()=>{invalidated++;};
  a.s.wipePersonalCache=()=>{};a.s.CACHE_OWNER_KEY='tk_cache_owner_uid';
  a.s.localStorage={getItem:k=>(k in ls?ls[k]:null),setItem:(k,v)=>{ls[k]=v;}};
  vm.runInContext(extract('resetPersonalCacheIfNewDeviceOwner'),a.s);
  const sbc=a.s.strengthBasisCache;
  sbc['TK-000038']={recent:{e1rm:1}};sbc['catalog:A:TK-000038']={recent:{e1rm:2}};
  a.s.tk603LiveSource['TK-000038']={owner:'A'};a.s.progCatalogData=[{owner_uid:'A'}];
  a.s.repPRCache={'TK-000038':{1:{weight:200}}};
  a.s.resetPersonalCacheIfNewDeviceOwner('B');
  ok(a.s.strengthBasisCache===sbc&&Object.keys(sbc).length===0&&invalidated===1&&
     Object.keys(a.s.tk603LiveSource).length===0&&a.s.progCatalogData.length===0&&
     Object.keys(a.s.repPRCache).length===0&&ls.tk_cache_owner_uid==='B',
    'owner change clears basis cache (personal+catalog), live map, catalog stats, Rep-PR and the picker pool');
  sbc.keep={recent:null};
  a.s.resetPersonalCacheIfNewDeviceOwner('B');
  ok('keep' in sbc&&invalidated===1,'same owner: reset is a no-op (unchanged legacy behaviour)');

  console.log('TK603 analytics source reads (Rep-PR, 1RM chart, live PR/1RM, coach context): '+checked+
    ' original-code assertions PASS; synthetic accounts only, release flag OFF in source');
})().catch(e=>{console.error(e);process.exitCode=1;});
