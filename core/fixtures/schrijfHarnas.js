/* Gedeelde testharnas (19-10-2026): laadt de ECHTE schrijflaag uit index.html (sbFetch, sbPost/sbPostReturning/
 * sbPatch/sbRpc/sbDel/sbUpsert en sbPostQ/sbPatchQ/sbDelQ/sbRpcQ met hun hulpfuncties) in een vm-context met een
 * nep-netwerk dat per verzoek vastlegt met WELK token het werd verstuurd. Extra productiefuncties kunnen worden
 * meegeladen; alle andere globale afhankelijkheden worden door de test zelf gestubd.
 *
 * Geen productiecode, geen netwerk: het nep-netwerk antwoordt standaard 201/200/204 en kan per verzoek worden
 * overschreven via net.antwoord(req) of net.voor(req) (hook vóór het antwoord, bv. een accountwissel). */
'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const HTML=fs.readFileSync(path.join(__dirname,'..','..','index.html'),'utf8').replace(/\r\n/g,'\n');
function grab(a,b){const i=HTML.indexOf(a),j=HTML.indexOf(b,i+a.length);assert(i>=0&&j>i,'brongrenzen niet gevonden: '+a);return HTML.slice(i,j);}
function fn(decl){
  const s=HTML.indexOf(decl);assert(s>=0,'functie niet gevonden: '+decl);
  let d=0;for(let k=HTML.indexOf('{',s);k<HTML.length;k++){if(HTML[k]==='{')d++;else if(HTML[k]==='}'){d--;if(!d)return HTML.slice(s,k+1);}}
  throw new Error('geen einde: '+decl);
}
const LAAG=[
  grab('const SB_RETRY_STATUS=','async function sbGet('),
  fn('async function sbGet('),fn('async function sbPost('),fn('async function sbPostReturning('),fn('async function sbPatch('),fn('async function sbRpc('),
  fn('async function sbDel('),fn('async function sbUpsert('),
  grab('const IDEMPOTENT_TABELLEN_MET_CLIENT_ID','// UX-EXEC-01 — het scherm van een lopende training'),
  fn('function newClientRowId('),fn('function tkNormalizeSessionsRow('),
  grab('function tkSchrijfUitkomst(status, http, reden){','// Speelt de queue in volgorde af;')
].join('\n');

/* opties: extraSrc (string), ctx (extra globale stubs), login ('A'|'B'|null), cacheOwner, online, queueResult */
function maak(opties){
  opties=opties||{};
  const st={req:[],queue:[],toasts:[],refreshes:0};
  let teller=0;
  const net={antwoord:null,voor:null};
  const sessies={A:{user:{id:'A'},access_token:'tA',refresh_token:'rA'},B:{user:{id:'B'},access_token:'tB',refresh_token:'rB'}};
  const store={};
  if(opties.cacheOwner)store.tk_cache_owner_uid=opties.cacheOwner;
  const ctx=Object.assign({
    console:{log(){},warn(){},error(){}},
    navigator:{onLine:opties.online!==false},
    SB_URL:'https://sb.invalid',SB_KEY:'anon',
    SB_H:{apikey:'anon',Authorization:'Bearer anon','Content-Type':'application/json'},
    authSession:null,
    localStorage:{getItem:k=>(k in store?store[k]:null),setItem:(k,v)=>{store[k]=String(v);},removeItem:k=>{delete store[k];}},
    document:{querySelectorAll:()=>[],getElementById:()=>null,querySelector:()=>null},
    toast:t=>st.toasts.push(t),
    clearAuthSession(){ctx.authSession=null;ctx.SB_H.Authorization='Bearer anon';},
    refreshAuthToken:async()=>{st.refreshes++;const s=ctx.authSession;if(!s)return false;ctx.authSession=Object.assign({},s,{access_token:s.access_token+'2'});ctx.SB_H.Authorization='Bearer '+ctx.authSession.access_token;return true;},
    updateOfflineBadge(){},
    offlineQueueAdd:async(item,eigenaar)=>{ if(opties.queueResult===false)return false; st.queue.push({id:++teller,item,eigenaar}); return true; },
    offlineQueueRemove:async(id)=>{ const i=st.queue.findIndex(q=>q.id===id); if(i>=0)st.queue.splice(i,1); return true; },
    tkLeesWachtrijStrikt:async()=>st.queue.map(q=>Object.assign({},q.item,{id:q.id,owner_uid:q.eigenaar})),
    crypto:{randomUUID:()=>'uuid-'+(++teller)},
    setTimeout,clearTimeout,Promise,
    fetch:async(url,init)=>{
      init=init||{};
      const req={url:String(url),method:init.method||'GET',token:(init.headers&&init.headers.Authorization)||null,
        prefer:(init.headers&&init.headers.Prefer)||null,body:init.body!==undefined?JSON.parse(init.body):undefined,
        uidBijVerzoek:ctx.authSession&&ctx.authSession.user?ctx.authSession.user.id:null};
      st.req.push(req);
      if(net.voor)await net.voor(req,ctx);
      const a=net.antwoord?await net.antwoord(req,ctx):undefined;
      if(a)return a;
      if(req.method==='GET')return resp(200,[]);
      if(req.method==='DELETE')return resp(204,null);
      if(req.method==='PATCH')return resp(200,[{id:1}]);
      return resp(201,Array.isArray(req.body)?req.body:[Object.assign({id:'srv-'+st.req.length},req.body)]);
    }
  },opties.ctx||{});
  ctx.window=ctx;
  vm.createContext(ctx);
  vm.runInContext(LAAG+'\n'+(opties.extraSrc||''),ctx);
  const login=function(uid){
    if(!uid){ctx.authSession=null;ctx.SB_H.Authorization='Bearer anon';return;}
    ctx.authSession=JSON.parse(JSON.stringify(sessies[uid]));ctx.SB_H.Authorization='Bearer '+ctx.authSession.access_token;
  };
  login(opties.login===undefined?'A':opties.login);
  // Writes die met het token van gebruiker X de server bereikten.
  const writesMet=uid=>st.req.filter(r=>r.method!=='GET'&&r.token&&r.token.indexOf('Bearer t'+uid)===0&&r.url.indexOf('/.netlify/')<0);
  // run(code): code in dezelfde context uitvoeren, bv. om een script-level let (TK_SCHRIJF_TIMEOUT_MS) te zetten.
  const run=code=>vm.runInContext(code,ctx);
  return {ctx,st,net,login,writesMet,run};
}
function resp(status,body){
  return {ok:status>=200&&status<300,status,headers:{get:()=>null},text:async()=>JSON.stringify(body),json:async()=>body};
}
module.exports={maak,resp,grab,fn,HTML};
