/* TK-REL-SEC-13 — eerste upload van eigen trainingen naar een lege server (heracceptatie 19-10-2026).
 * syncCustomTrainingsFromSupabase() uploadde niet-gemarkeerde (legacy) trainingen met een kale sbPost en negeerde
 * het resultaat. Slaagde een deel, dan behield de volgende sync alleen onbevestigde lokale trainingen die de server
 * mist: een mislukte legacy-training verdween lokaal (dataverlies).
 *  F1 mislukte eerste upload: de training blijft lokaal én staat gemarkeerd als "alleen op dit toestel";
 *  F2 de volgende sync (server heeft alleen de geslaagde) behoudt de mislukte training lokaal;
 *  F3 upload loopt via de idempotente wachtrijroute (client-id per oefening, ouder eerst) en behoudt de volgorde;
 *  F4 accountwissel tijdens de upload: niets meer geschreven onder het nieuwe account.
 * Draait de ONGEWIJZIGDE productiefuncties uit index.html. */
'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const block=(a,b)=>{const i=html.indexOf(a),j=html.indexOf(b,i+a.length);assert(i>=0&&j>i,'brongrenzen niet gevonden: '+a);return html.slice(i,j);};
const SRC=block("const TK_TRAININGEN_ONBEVESTIGD='tk_trainings_onbevestigd';",'// UX-EXEC-01 (B1/B3)')+'\n'+block('async function pushCustomTrainingExercisesRich(','async function migrateLegacyWbSaved(){');
let klaar=false,n=0;
process.on('exit',()=>{if(!klaar){console.error('FAIL niet alle scenario\'s afgerond (hangende promise)');process.exitCode=1;}});
const check=(ok,label)=>{assert(ok,label);n++;console.log('PASS',label);};

function maak({weiger=[],serverRows=[],wisselNa=null}={}){
  const store={},st={posts:[],raw:[]};
  const ctx={console:{log(){},warn(){},error(){}},navigator:{onLine:true},authSession:{user:{id:'A'}},
    localStorage:{getItem:k=>(k in store?store[k]:null),setItem:(k,v)=>{store[k]=String(v);},removeItem:k=>{delete store[k];}},
    toast(){},renderCustomTrainBtns(){},renderCustomTrainList(){},migrateLegacyWbSaved:async()=>{},
    tkLeesWachtrijStrikt:async()=>[],newClientRowId:(()=>{let k=0;return()=>'cid-'+(++k);})(),
    tkSchrijfUitkomst:(status,http,reden)=>({ok:status==='confirmed'||status==='queued',status,http:http||null,reden:reden||null}),
    tkHuidigeUid:()=>(ctx.authSession&&ctx.authSession.user)?ctx.authSession.user.id:null,
    sbGet:async(t)=>t==='custom_trainings'?serverRows.slice():[],
    sbPost:async(t,d)=>{st.raw.push([t,d]);return true;},
    sbDelQ:async()=>({ok:true,status:'confirmed'}),
    sbPostQ:async(t,d,o)=>{st.posts.push({t,d,uid:ctx.tkHuidigeUid()});
      if(wisselNa!==null&&st.posts.length===wisselNa)ctx.authSession={user:{id:'B'}};
      const geweigerd=t==='custom_trainings'&&weiger.indexOf(d.id)>=0;
      return {ok:!geweigerd,status:geweigerd?'rejected':'confirmed',http:geweigerd?400:201,reden:geweigerd?'validatie':null};}};
  vm.createContext(ctx);vm.runInContext(SRC,ctx);
  ctx.customTrainings=[{id:'t1',name:'Push',color:'#fff',exercises:['ex-a','ex-b']},{id:'t2',name:'Pull',color:'#000',exercises:['ex-c']}];
  return {ctx,st,store};
}
async function main(){
  { const {ctx,st}=maak({weiger:['t2']});
    await ctx.syncCustomTrainingsFromSupabase();
    check(ctx.customTrainings.some(t=>t.id==='t2')&&ctx.tkTrainingenOnbevestigd().indexOf('t2')>=0,'F1 mislukte eerste upload: training lokaal én gemarkeerd als alleen op dit toestel');
    check(st.raw.length===0,'F3 geen kale sbPost meer: upload via de wachtrijroute');
    const ex=st.posts.filter(p=>p.t==='custom_training_exercises');
    check(ex.length===2&&ex.every(p=>p.d.id&&p.d.custom_training_id==='t1'),'F3 elke oefeningrij met client-id; geen kindrijen onder een geweigerde ouder');
    const ouders=st.posts.filter(p=>p.t==='custom_trainings');
    check(ouders.find(p=>p.d.id==='t1').d.sort_order===0&&ouders.find(p=>p.d.id==='t2').d.sort_order===1,'F3 volgorde van de trainingen blijft behouden');
    // F2 — volgende sync: server bevat alleen t1
    ctx.sbGet=async(t)=>t==='custom_trainings'?[{id:'t1',naam:'Push',kleur:'#fff',sort_order:0}]:(t==='custom_training_exercises'?[]:[]);
    await ctx.syncCustomTrainingsFromSupabase();
    check(ctx.customTrainings.some(t=>t.id==='t2'),'F2 volgende sync behoudt de niet-geüploade training lokaal'); }
  // Kindrijen van een A-ouder onder B weigert RLS server-side (custom_training_exercises_write_v333: ouder van auth.uid());
  // het echte risico is de volgende training na de wissel.
  { const {ctx,st}=maak({wisselNa:3});
    await ctx.syncCustomTrainingsFromSupabase();
    check(st.posts.filter(p=>p.uid==='B').length===0&&!st.posts.some(p=>p.d.id==='t2'),'F4 accountwissel tijdens upload: volgende training niet meer onder B geschreven'); }
  klaar=true;console.log('TK-REL-SEC-13: '+n+'/'+n);
}
main().catch(e=>{console.error('FAIL',e&&e.message||e);process.exitCode=1;});
