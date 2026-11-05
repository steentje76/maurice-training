/* TK-REL-SEC-09 — accountwissel tijdens een langdurige import (heracceptatie 19-10-2026).
 * Productie (read-only geverifieerd): BEFORE INSERT-trigger set_user_id_from_auth() zet user_id := auth.uid()
 * op sessions, weight_log en body_comp; RLS houdt een write met het token van B dus niet tegen.
 * upsert_daily_health() weigert zelf als p_user_id <> auth.uid().
 * Scenario: A start een import met meerdere records; tijdens een await logt A uit en B in.
 *  I1 JSON-import (importFromFile): na de wissel geen enkel REST-verzoek meer met B's token; gedeeltelijk
 *     resultaat wordt eerlijk gemeld;
 *  I2 Concept2-import: geen sessierij meer geschreven onder B;
 *  I3 HRV-import: geen RPC meer na de wissel (die zou server-side toch falen);
 *  I4 zonder wissel blijft de import volledig werken.
 * Draait de ONGEWIJZIGDE productiefuncties uit index.html. */
'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const block=(a,b)=>{const i=html.indexOf(a),j=html.indexOf(b,i+a.length);assert(i>=0&&j>i,'brongrenzen niet gevonden: '+a);return html.slice(i,j);};
const SRC=[
  block('function tkHuidigeUid(){','// Eigenaar van een write:'),
  block('const TK_HEALTH_SOURCES=','// Eén canoniek gewichtsrecord per dag'),
  block('function _tkImportMsg(txt){','// Fitbit "Sync":'),
  block('async function importFromFile(input){','// ATLEET PROFIEL')
].join('\n');
let klaar=false,n=0;
process.on('exit',()=>{if(!klaar){console.error('FAIL niet alle scenario\'s afgerond (hangende promise)');process.exitCode=1;}});
const check=(ok,label)=>{assert(ok,label);n++;console.log('PASS',label);};

function maak(){
  const st={toasts:[],status:{textContent:''},msg:'',writes:[],rpcs:[],fetches:[]};
  const ctx={console:{log(){},warn(){},error(){}},SB_URL:'https://sb.invalid',
    SB_H:{apikey:'anon',Authorization:'Bearer at-A','Content-Type':'application/json'},
    authSession:{user:{id:'A'}},toast:t=>st.toasts.push(t),refreshHome(){},renderLichaam(){},
    document:{getElementById:id=>id==='import-status'?st.status:(id==='lich-import-msg'?{set textContent(v){st.msg=v;}}:null)},
    tkSyncMessage:(p,r,k)=>'sync '+(r&&r.status)+' '+(k||0)};
  ctx.wissel=()=>{ctx.authSession={user:{id:'B'}};ctx.SB_H.Authorization='Bearer at-B';};
  vm.createContext(ctx);vm.runInContext(SRC,ctx);return {ctx,st};
}
async function main(){
  // I1 — JSON-import
  for(const metWissel of [true,false]){
    const {ctx,st}=maak();
    ctx.fetch=async(url,init)=>{st.fetches.push({url,auth:init.headers.Authorization});if(metWissel&&st.fetches.length===1)ctx.wissel();return {ok:true,status:201,text:async()=>''};};
    ctx.sbRpc=async(fn,a)=>{st.rpcs.push(a);return {};};
    const bestand={sessions:[{id:'s1'},{id:'s2'}],weight_log:[{id:'w1'}],body_comp:[{id:'b1'}],hrv_log:[{date:'2026-10-01',hrv:40}]};
    await ctx.importFromFile({files:[{text:async()=>JSON.stringify(bestand)}],value:'x'});
    if(metWissel){
      check(st.fetches.filter(f=>/at-B/.test(f.auth)).length===0,'I1 JSON-import: na accountwissel geen verzoek met B-token');
      check(st.fetches.length===1&&/gestopt/i.test(st.status.textContent)&&st.toasts.some(t=>/gestopt/i.test(t)),'I1 JSON-import: gedeeltelijk resultaat eerlijk gemeld (gestopt)');
      check(st.rpcs.length===0,'I1 JSON-import: HRV-rijen van A worden na de wissel niet als B weggeschreven');
    }else{
      check(st.fetches.length===4&&st.fetches.every(f=>f.auth==='Bearer at-A')&&st.rpcs.length===1&&st.rpcs[0].p_user_id==='A','I4 JSON-import zonder wissel: alle records (incl. HRV) onder A');
    }
  }
  // I2 — Concept2-import
  {
    const {ctx,st}=maak();
    ctx.DeviceCore={isSyncOk:()=>true,normalizeWorkout:x=>x,CONCEPT2_MAP:{},importConcept2Workouts:()=>({toInsert:[{id:'c1'},{id:'c2'},{id:'c3'}]})};
    ctx.tkProviderRequest=async()=>({status:'success',data:[{metrics:[]}]});
    ctx.sbGet=async()=>[];
    ctx.writeSessionRow=async row=>{st.writes.push({row,uid:ctx.tkHuidigeUid()});if(st.writes.length===1)ctx.wissel();return true;};
    await ctx.tkConcept2Import();
    check(st.writes.length===1&&st.writes.every(w=>w.uid==='A'),'I2 Concept2-import: geen sessierij meer onder B na de wissel');
  }
  // I5 — Concept2: een door de schrijflaag geweigerde rij telt niet als opgeslagen.
  {
    const {ctx,st}=maak();
    ctx.DeviceCore={isSyncOk:()=>true,normalizeWorkout:x=>x,CONCEPT2_MAP:{},importConcept2Workouts:()=>({toInsert:[{id:'c1'},{id:'c2'}]})};
    ctx.tkProviderRequest=async()=>({status:'success',data:[]});ctx.sbGet=async()=>[];
    ctx.writeSessionRow=async()=>false;
    await ctx.tkConcept2Import();
    check(/ 0$/.test(st.msg),'I5 Concept2: geweigerde rijen worden niet als opgeslagen geteld');
  }
  // I3 — HRV-import
  {
    const {ctx,st}=maak();
    ctx.sbRpc=async(fn,a)=>{st.rpcs.push({fn,uid:ctx.tkHuidigeUid(),p:a.p_user_id});if(st.rpcs.length===1)ctx.wissel();return {};};
    const res=await ctx.tkImportHrvRows([{date:'2026-10-01',hrv:40},{date:'2026-10-02',hrv:41},{date:'2026-10-03',hrv:42}]);
    check(st.rpcs.length===1&&st.rpcs[0].uid==='A','I3 HRV-import: geen RPC meer na de wissel');
    check(res.ok===1&&res.fail+(res.gestopt||0)===2,'I3 HRV-import: resterende rijen niet als geslaagd geteld');
  }
  klaar=true;console.log('TK-REL-SEC-09: '+n+'/'+n);
}
main().catch(e=>{console.error('FAIL',e&&e.message||e);process.exitCode=1;});
