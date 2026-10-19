/* TK-REL-SEC-02 — accountisolatie in de auth-/retrylaag (onafhankelijke review, 19-10-2026).
 * Bewijst met de ONGEWIJZIGDE productiefuncties uit index.html dat:
 *  T1  een wachtrij-item van gebruiker A nooit met het token van gebruiker B wordt verzonden,
 *      ook niet als A's eerste poging 401 geeft en B inlogt terwijl dat verzoek onderweg is
 *      (sbFetch-refresh-retry ná de laatste identiteitscheck in flushOfflineQueue);
 *  T2  een refresh die voor A is gestart, na een wissel naar B nooit A's sessie terugzet;
 *  T3  het normale 401 → refresh → retry-pad voor dezelfde gebruiker blijft werken;
 *  T4  een 401 van A's verzoek na een wissel B niet uitlogt.
 * Achtergrond: in productie zet de BEFORE INSERT-trigger set_user_id_from_auth() user_id := auth.uid()
 * op o.a. sessions/custom_trainings/race_segments/program_blocks. RLS (user_id = auth.uid()) houdt een
 * met B's token verzonden A-rij daarom NIET tegen: de rij wordt stil eigendom van B.
 * Geen database- of productiecontact. */
'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const block=(a,b)=>{const i=html.indexOf(a),j=html.indexOf(b,i+a.length);assert(i>=0&&j>i,'brongrenzen niet gevonden: '+a);return html.slice(i,j);};
const SRC=[
  block('function loadAuthSession(){','function scheduleAuthRefresh(){'),
  block('async function refreshAuthToken(){','function toggleAuthPassVisibility(){'),
  block('const SB_RETRY_STATUS=','async function sbGet('),
  block('async function offlineQueueAdd(item,eigenaar){','async function offlineQueueAll(){'),
  block('const IDEMPOTENT_TABELLEN_MET_CLIENT_ID','// Sprint 6 (DEC-QUEUE-001): voor aanroepers'),
  block('async function flushOfflineQueue(){','function updateOfflineBadge(){')
].join('\n');
// Een hangende promise laat Node met exit 0 stoppen zonder verdere asserties: dat telt als FAIL.
let klaar=false;process.on('exit',()=>{if(!klaar){console.error('FAIL niet alle scenario\'s afgerond (hangende promise)');process.exitCode=1;}});
let pass=0;const check=(label,ok)=>{assert(ok,label);pass++;console.log('PASS',label);};
const tick=()=>new Promise(r=>setImmediate(r));

function deferred(){let res;const p=new Promise(r=>{res=r;});return{p,res};}
function resp(status,json){return{ok:status>=200&&status<300,status,text:async()=>JSON.stringify(json||{}),json:async()=>json||{}};}
function sess(uid,n){return{access_token:'at-'+uid+'-'+n,refresh_token:'rt-'+uid+'-'+n,expires_at:Date.now()+3600e3,user:{id:uid,email:uid+'@x'}};}

function maakCtx(start){
  const log=[];const pending=[];const store={};
  const ctx={
    console:{log(){},warn(){},error(){}},SB_URL:'https://sb.invalid',SB_KEY:'anon',AUTH_SESSION_KEY:'tk_auth_session',
    SB_H:{apikey:'anon',Authorization:'Bearer anon','Content-Type':'application/json'},
    authSession:null,authRefreshTimer:null,navigator:{onLine:true},_flushBezig:false,
    localStorage:{setItem:(k,v)=>{store[k]=v;},removeItem:k=>{delete store[k];},getItem:k=>store[k]||null},
    clearTimeout(){},setTimeout(){return 0;},scheduleAuthRefresh(){},
    toast(){},document:{getElementById:()=>null,querySelectorAll:()=>[]},
    tkOuderSleutels:()=>[],tkLogRpcOffline(){},tkFoutcode:()=>'',updateOfflineBadge(){},renderOfflineQueueModal(){},
    IDEMPOTENT_TABELLEN_MET_CLIENT_ID:{sessions:true},syncCustomTrainingsFromSupabase:async()=>{},
    tkHuidigeUid:()=>(ctx.authSession&&ctx.authSession.user)?ctx.authSession.user.id:null,
    fetch:(url,init)=>{const d=deferred();pending.push({url,init,d});log.push({url,auth:init&&init.headers&&init.headers.Authorization,body:init&&init.body});return d.p;}
  };
  ctx.queue=[];ctx.removed=[];let seq=100;
  ctx.OFFLINE_STORE='queue';ctx.handleFederatedAuthCallback=async()=>false;
  // Nep-IndexedDB voor de ECHTE offlineQueueAdd(): bewaart het record zoals productie het stempelt.
  ctx.offlineDb=async()=>({transaction:()=>{const tx={objectStore:()=>({add:rec=>{ctx.queue.push(Object.assign({},rec,{id:++seq}));Promise.resolve().then(()=>tx.oncomplete&&tx.oncomplete());}})};return tx;}});
  ctx.tkLeesWachtrijStrikt=async()=>ctx.queue.slice();
  ctx.offlineQueueAll=ctx.tkLeesWachtrijStrikt;
  ctx.offlineQueueRemove=async id=>{ctx.removed.push(id);ctx.queue=ctx.queue.filter(i=>i.id!==id);return true;};
  vm.createContext(ctx);vm.runInContext(SRC,ctx);
  if(start)ctx.saveAuthSession(start);
  return{ctx,log,pending};
}
const isRest=u=>u.indexOf('/rest/v1/')>=0;
const isRefresh=u=>u.indexOf('grant_type=refresh_token')>=0;
async function volgende(pending,pred){for(let i=0;i<200;i++){const k=pending.findIndex(x=>pred(x.url));if(k>=0)return pending.splice(k,1)[0];await tick();}throw new Error('verwacht verzoek kwam niet');}

(async()=>{
  // T1 — A's item, A-token verlopen (401), B logt in terwijl het eerste verzoek onderweg is.
  {
    const {ctx,log,pending}=maakCtx(sess('A',1));
    ctx.queue=[{id:1,owner_uid:'A',table:'sessions',method:'POST',body:{id:'set-A-1',reps:10}}];
    const run=ctx.flushOfflineQueue();
    const eerste=await volgende(pending,isRest);
    ctx.clearAuthSession();ctx.saveAuthSession(sess('B',1)); // A logt uit, B logt in
    eerste.d.res(resp(401,{code:'PGRST301'}));
    for(let i=0;i<50;i++){const k=pending.findIndex(x=>isRefresh(x.url));
      if(k>=0){const r=pending.splice(k,1)[0];const rt=JSON.parse(r.init.body).refresh_token;const uid=rt.split('-')[1];
        r.d.res(resp(200,{access_token:'at-'+uid+'-2',refresh_token:'rt-'+uid+'-2',expires_in:3600,user:{id:uid,email:uid+'@x'}}));}
      const j=pending.findIndex(x=>isRest(x.url));if(j>=0)pending.splice(j,1)[0].d.res(resp(201,[]));
      await tick();}
    await run;
    const restMetB=log.filter(x=>isRest(x.url)&&/at-B-/.test(x.auth||''));
    check('T1 A-item wordt nooit met B-token naar Supabase verzonden',restMetB.length===0);
    check('T1 A-item blijft in de wachtrij (geen bevestiging onder ambigue identiteit)',ctx.removed.length===0&&ctx.queue.length===1);
    check('T1 B blijft ingelogd',ctx.authSession&&ctx.authSession.user.id==='B');
    check('T1 A-verzoek start geen refresh van B\'s token',log.filter(x=>isRefresh(x.url)&&/rt-B-/.test(x.body||'')).length===0);
  }
  // T5 — verdediging in de diepte: ook als een (toekomstige) refresh "ok" meldt terwijl de identiteit
  // tijdens die refresh wisselde, mag er geen retry met het token van de nieuwe gebruiker volgen.
  {
    const {ctx,log,pending}=maakCtx(sess('A',1));
    ctx.sbRefreshOnce=async()=>{ ctx.clearAuthSession(); ctx.saveAuthSession(sess('B',1)); return true; };
    const p=ctx.sbFetch('https://sb.invalid/rest/v1/sessions',{method:'POST',body:{id:'set-A-9'}});
    (await volgende(pending,isRest)).d.res(resp(401,{}));
    for(let i=0;i<30;i++){const j=pending.findIndex(x=>isRest(x.url));if(j>=0)pending.splice(j,1)[0].d.res(resp(201,[]));await tick();}
    const r=await p;
    check('T5 geen retry met B-token na een refresh waarin de identiteit wisselde',log.filter(x=>isRest(x.url)&&/at-B-/.test(x.auth||'')).length===0&&r.status===401);
  }
  // T6 — wissel tijdens de lokale queue-delete van item 1: item 2 mag niet met B's token vertrekken
  // (dekt de identiteitscheck aan het begin van elke flush-iteratie).
  {
    const {ctx,log,pending}=maakCtx(sess('A',1));
    ctx.queue=[{id:1,owner_uid:'A',table:'sessions',method:'POST',body:{id:'set-A-1'}},{id:2,owner_uid:'A',table:'sessions',method:'POST',body:{id:'set-A-2'}}];
    const orig=ctx.offlineQueueRemove;
    ctx.offlineQueueRemove=async id=>{ const ok=await orig(id); if(id===1){ ctx.clearAuthSession(); ctx.saveAuthSession(sess('B',1)); } return ok; };
    const run=ctx.flushOfflineQueue();
    for(let i=0;i<60;i++){const j=pending.findIndex(x=>isRest(x.url));if(j>=0)pending.splice(j,1)[0].d.res(resp(201,[]));await tick();}
    await run;
    check('T6 item 2 van A vertrekt niet met B-token na wissel tijdens lokale delete',log.filter(x=>isRest(x.url)&&/at-B-/.test(x.auth||'')).length===0);
    check('T6 item 2 blijft bewaard',ctx.queue.length===1&&ctx.queue[0].id===2);
  }
  // T2 — refresh voor A loopt; B logt in; A's refresh-antwoord mag B niet overschrijven.
  {
    const {ctx,pending}=maakCtx(sess('A',1));
    const r=ctx.refreshAuthToken();
    const rf=await volgende(pending,isRefresh);
    ctx.clearAuthSession();ctx.saveAuthSession(sess('B',1));
    rf.d.res(resp(200,{access_token:'at-A-2',refresh_token:'rt-A-2',expires_in:3600,user:{id:'A',email:'A@x'}}));
    const ok2=await r;
    check('T2 refresh voor A meldt geen succes zodra B is ingelogd',ok2===false);
    check('T2 verlate refresh van A zet A niet terug over sessie B',ctx.authSession.user.id==='B'&&ctx.SB_H.Authorization==='Bearer at-B-1');
  }
  // T3 — regressie: zelfde gebruiker, 401 → refresh → retry → bevestigd en uit de wachtrij.
  {
    const {ctx,log,pending}=maakCtx(sess('A',1));
    ctx.queue=[{id:7,owner_uid:'A',table:'sessions',method:'POST',body:{id:'set-A-7'}}];
    const run=ctx.flushOfflineQueue();
    (await volgende(pending,isRest)).d.res(resp(401,{}));
    (await volgende(pending,isRefresh)).d.res(resp(200,{access_token:'at-A-2',refresh_token:'rt-A-2',expires_in:3600,user:{id:'A',email:'A@x'}}));
    const retry=await volgende(pending,isRest);
    check('T3 retry gebruikt het ververste token van dezelfde gebruiker',retry.init.headers.Authorization==='Bearer at-A-2');
    retry.d.res(resp(201,[]));await run;
    check('T3 bevestigd item wordt normaal uit de wachtrij gehaald',ctx.removed.length===1&&ctx.removed[0]===7);
    check('T3 precies twee REST-pogingen',log.filter(x=>isRest(x.url)).length===2);
  }
  // T4 — A's verzoek krijgt 401 na wissel; B's sessie mag niet als "verlopen" worden gewist.
  {
    const {ctx,pending}=maakCtx(sess('A',1));
    const p=ctx.sbFetch('https://sb.invalid/rest/v1/sessions',{method:'POST',body:{}});
    const eerste=await volgende(pending,isRest);
    ctx.clearAuthSession();ctx.saveAuthSession(sess('B',1));
    eerste.d.res(resp(401,{}));
    for(let i=0;i<30;i++){const k=pending.findIndex(x=>isRefresh(x.url));if(k>=0)pending.splice(k,1)[0].d.res(resp(400,{}));const j=pending.findIndex(x=>isRest(x.url));if(j>=0)pending.splice(j,1)[0].d.res(resp(201,[]));await tick();}
    const r=await p;
    check('T4 401 op A-verzoek na wissel logt B niet uit',ctx.authSession&&ctx.authSession.user.id==='B');
    check('T4 A-verzoek wordt niet stil als geslaagd gerapporteerd',r.status===401);
  }
  // T7 — queue-pad: sbPostQ van A krijgt na een wissel naar B een 401 en wordt gequeued. Het item moet
  // A als eigenaar houden; B's flush mag het nooit versturen (anders alsnog A-data met B-token).
  {
    const {ctx,log,pending}=maakCtx(sess('A',1));
    const p=ctx.sbPostQ('sessions',{id:'set-A-7',reps:8},{detail:true});
    const eerste=await volgende(pending,isRest);
    ctx.clearAuthSession();ctx.saveAuthSession(sess('B',1));
    eerste.d.res(resp(401,{}));
    const u=await p;
    check('T7 write van A na wissel wordt gequeued met eigenaar A (niet B)',u.status==='queued'&&ctx.queue.length===1&&ctx.queue[0].owner_uid==='A');
    const run=ctx.flushOfflineQueue();
    for(let i=0;i<30;i++){const j=pending.findIndex(x=>isRest(x.url));if(j>=0)pending.splice(j,1)[0].d.res(resp(201,[]));await tick();}
    await run;
    check('T7 B\'s flush verstuurt A\'s gequeuede write niet',log.filter(x=>isRest(x.url)&&/at-B-/.test(x.auth||'')).length===0&&ctx.queue.length===1);
  }
  // T8 — hervatten: tijdens een refresh vervangt ensureValidSession() het sessieobject door een kopie met
  // dezelfde tokens. Dat is dezelfde sessie: het geroteerde token moet worden bewaard en de retry gebeuren.
  {
    const {ctx,pending}=maakCtx(sess('A',1));
    const p=ctx.sbFetch('https://sb.invalid/rest/v1/sessions',{method:'GET'});
    (await volgende(pending,isRest)).d.res(resp(401,{}));
    const rf=await volgende(pending,isRefresh);
    ctx.authSession=JSON.parse(JSON.stringify(ctx.authSession));
    rf.d.res(resp(200,{access_token:'at-A-2',refresh_token:'rt-A-2',expires_in:3600,user:{id:'A',email:'A@x'}}));
    const retry=await volgende(pending,isRest);
    check('T8 refresh na objectvervanging (zelfde sessie) wordt bewaard en gebruikt',retry.init.headers.Authorization==='Bearer at-A-2'&&ctx.authSession.refresh_token==='rt-A-2');
    retry.d.res(resp(200,[{id:1}]));const r=await p;
    check('T8 verzoek slaagt na retry (geen leeg scherm/valse fout)',r.status===200);
  }
  // T9 — gelijktijdige refresh (timer) voor dezelfde gebruiker wint eerst: de 401-retry gebruikt het
  // nieuwere token en overschrijft de nieuwere sessie niet.
  {
    const {ctx,pending}=maakCtx(sess('A',1));
    const p=ctx.sbFetch('https://sb.invalid/rest/v1/sessions',{method:'GET'});
    (await volgende(pending,isRest)).d.res(resp(401,{}));
    const rf=await volgende(pending,isRefresh);
    ctx.saveAuthSession(sess('A',3));
    rf.d.res(resp(200,{access_token:'at-A-2',refresh_token:'rt-A-2',expires_in:3600,user:{id:'A',email:'A@x'}}));
    const retry=await volgende(pending,isRest);
    check('T9 retry met het nieuwste token van dezelfde gebruiker',retry.init.headers.Authorization==='Bearer at-A-3');
    check('T9 nieuwere sessie niet overschreven door verlate refresh',ctx.authSession.refresh_token==='rt-A-3');
    retry.d.res(resp(200,[]));await p;
  }
  // T10 — zelfde gebruiker logt opnieuw in terwijl de refresh met het oude token faalt: niet uitloggen.
  {
    const {ctx,pending}=maakCtx(sess('A',1));
    const p=ctx.sbFetch('https://sb.invalid/rest/v1/sessions',{method:'GET'});
    (await volgende(pending,isRest)).d.res(resp(401,{}));
    const rf=await volgende(pending,isRefresh);
    ctx.clearAuthSession();ctx.saveAuthSession(sess('A',5));
    rf.d.res(resp(400,{}));
    await p;
    check('T10 mislukte refresh met oud token logt de nieuwe login niet uit',ctx.authSession&&ctx.authSession.refresh_token==='rt-A-5');
  }
  // T11 — ensureValidSession(): alleen de sessie wissen waarvoor de refresh liep.
  {
    const {ctx,pending}=maakCtx(null);
    const s0=sess('A',1);s0.expires_at=Date.now()+1000;ctx.localStorage.setItem('tk_auth_session',JSON.stringify(s0));
    const p=ctx.ensureValidSession();
    const rf=await volgende(pending,isRefresh);
    ctx.clearAuthSession();ctx.saveAuthSession(sess('B',1));
    rf.d.res(resp(200,{access_token:'at-A-2',refresh_token:'rt-A-2',expires_in:3600,user:{id:'A',email:'A@x'}}));
    const ok=await p;
    check('T11 nieuwere sessie van B blijft staan na verlate opstart-refresh van A',ok===true&&ctx.authSession.user.id==='B');
    const c2=maakCtx(null);const s1=sess('A',1);s1.expires_at=Date.now()+1000;c2.ctx.localStorage.setItem('tk_auth_session',JSON.stringify(s1));
    const p2=c2.ctx.ensureValidSession();(await volgende(c2.pending,isRefresh)).d.res(resp(400,{}));
    check('T11 mislukte refresh van de eigen sessie wist die sessie (ongewijzigd gedrag)',(await p2)===false&&c2.ctx.authSession===null);
  }
  // T12 — wissel tijdens de await in sbPostQ (ouder-check in de wachtrij), vóór het eerste verzoek:
  // niet versturen met B's token; queuen onder A.
  {
    const {ctx,log,pending}=maakCtx(sess('A',1));
    ctx.tkLeesWachtrijStrikt=async()=>{ ctx.clearAuthSession(); ctx.saveAuthSession(sess('B',1)); return []; };
    const pu=ctx.sbPostQ('sessions',{id:'set-A-12',exercise_id:'ex-1'},{detail:true});
    for(let i=0;i<20;i++){const j=pending.findIndex(x=>isRest(x.url));if(j>=0)pending.splice(j,1)[0].d.res(resp(201,[]));await tick();}
    const u=await pu;
    check('T12 geen REST-write met B-token na wissel vóór verzenden',log.filter(x=>isRest(x.url)).length===0);
    check('T12 write blijft bewaard onder eigenaar A',u.status==='queued'&&ctx.queue.length===1&&ctx.queue[0].owner_uid==='A');
  }
  klaar=true;
  console.log('TK-REL-SEC-02: '+pass+'/'+pass);
})().catch(e=>{console.error('FAIL',e&&e.message||e);process.exitCode=1;});
