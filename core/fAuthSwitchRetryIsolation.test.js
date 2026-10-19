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
  block('function saveAuthSession(s){','function scheduleAuthRefresh(){'),
  block('async function refreshAuthToken(){','// Bij app-start'),
  block('let _sbRefreshInFlight=null;','async function sbGet('),
  block('async function flushOfflineQueue(){','function updateOfflineBadge(){')
].join('\n');
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
  ctx.queue=[];ctx.removed=[];
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
  }
  // T2 — refresh voor A loopt; B logt in; A's refresh-antwoord mag B niet overschrijven.
  {
    const {ctx,pending}=maakCtx(sess('A',1));
    const r=ctx.refreshAuthToken();
    const rf=await volgende(pending,isRefresh);
    ctx.clearAuthSession();ctx.saveAuthSession(sess('B',1));
    rf.d.res(resp(200,{access_token:'at-A-2',refresh_token:'rt-A-2',expires_in:3600,user:{id:'A',email:'A@x'}}));
    await r;
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
  console.log('TK-REL-SEC-02: '+pass+'/'+pass);
})().catch(e=>{console.error('FAIL',e&&e.message||e);process.exitCode=1;});
