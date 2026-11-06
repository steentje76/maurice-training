'use strict';
// #603 typed session write: a post-verification network failure must NEVER
// silently enqueue a reserved FK for another owner, revoked binding or later replay.
// Real sbPostQ() and actual writeSessionRow() extracted from index.html.
// No DB, no user data; synthetic HTTP and accounts only.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function take(name){
 const m=new RegExp('(?:async\\s+)?function\\s+'+name+'\\s*\\(').exec(html);
 assert(m,'function '+name+' not found');
 let d=0;
 for(let i=html.indexOf('{',m.index);i<html.length;i++){
  if(html[i]==='{')d++;
  if(html[i]==='}'&&--d===0)return html.slice(m.index,i+1);
 }
 throw Error(name+' unclosed');
}
let n=0;
const ok=(condition,msg)=>{assert(condition,msg);n++;};
function sandbox({online=true,owner='synthetic-A',mode='ok',dependent=false}={}){
 const state={online,owner,mode,dependent,queue:[],calls:[],result:null,seq:0};
 const s=vm.createContext({
  TK504_TYPED_FK_SESSION_RELEASE:true,
  tkEigenaarUid:()=>state.owner,
  navigator:{get onLine(){return state.online;}},
  tkNormalizeSessionsRow:x=>x,
  IDEMPOTENT_TABELLEN_MET_CLIENT_ID:{sessions:true},
  TK_IDEMPOTENT_ZONDER_UPDATE:{},
  newClientRowId:()=>('00000000-0000-4000-8000-'+String(++state.seq).padStart(12,'0')),
  TK_WACHTRIJ_OUDERS:{sessions:[['exercise_id','exercises']]},
  TK_WACHTRIJ_OUDERS:{sessions:[['exercise_id','exercises']]},
  tkWachtrijHeeftOuder:async()=>state.dependent,
  offlineQueueAdd:async x=>{state.queue.push(x);return true;},
  updateOfflineBadge:()=>{},
  tkLogSchrijf:()=>{},sbRetryable:status=>status===500||status===503,
  tkFoutcode:()=>null,tkMetTimeout:async p=>await p,
  TK_SCHRIJF_TIMEOUT_MS:10000,SB_URL:'http://synthetic.invalid',
  sbFetch:async(url,arg)=>{
    state.calls.push({url,arg});
    if(state.mode==='throw')throw Error('synthetic network broken');
    if(state.mode==='switch'){state.owner='synthetic-B';return {ok:true,status:201};}
    if(state.mode==='500')return {ok:false,status:500,text:async()=>''};
    if(state.mode==='403')return {ok:false,status:403,text:async()=>''};
    return {ok:true,status:201};
  },
  tk504RewriteVerifiedSessionRow:(row,binding)=>{
    if(binding.owner_uid!==state.owner)throw Error('owner mismatch');
    return {...row,exercise_id:binding.fk_id};
  },
  console
 });
 vm.runInContext(['tkSchrijfUitkomst','sbPostQ','writeSessionRow'].map(take).join('\n'),s);
 const binding={kind:'movekit-catalog-v1',catalog_id:'TK-000038',
  provider_id:'synthetic-slug',fk_id:'TKC-000038',owner_uid:'synthetic-A'};
 const row={id:'00000000-0000-4000-8000-000000000038',exercise_id:'TK-000038',
  sets_detail:[{kg:42,reps:8}],note:'my existing note'};
 return {s,state,row,binding};
}
async function write(w,typed=true){
 const opts=typed?{tk504_binding:w.binding}:{};
 const result=await w.s.writeSessionRow(w.row,opts);
 return {result,opts};
}
(async()=>{
 let w=sandbox(),o=await write(w);
 ok(o.result===true&&o.opts.status==='confirmed','verified ONLINE typed row is confirmed by server');
 ok(w.state.queue.length===0,'normal confirmed request does not enqueue');
 ok(w.state.calls[0].arg.body.exercise_id==='TKC-000038','only FK is rewritten on network');
 ok(w.row.exercise_id==='TK-000038'&&w.row.note==='my existing note',
   'original UI row and note remain untouched');
 w=sandbox({online:false});o=await write(w);
 ok(o.result===false&&o.opts.status==='failed','OFFLINE typed row is NOT a successful save');
 ok(w.state.queue.length===0&&w.state.calls.length===0,
   'OFFLINE typed row cannot be queued or sent');
 w=sandbox({online:false});o=await write(w,false);
 ok(o.result===true&&o.opts.status==='queued'&&w.state.queue.length===1,
   'legacy loose session still uses old offline queue');
 w=sandbox({dependent:true});o=await write(w);
 ok(o.result===false&&o.opts.status==='failed'&&w.state.queue.length===0,
   'dependent legacy exercise in offline FIFO does not allow typed FK replay');
 w=sandbox({mode:'throw'});o=await write(w);
 ok(o.result===false&&o.opts.status==='failed'&&w.state.queue.length===0,
   'lost HTTP response cannot queue typed alias');
 w=sandbox({mode:'500'});o=await write(w);
 ok(o.result===false&&o.opts.status==='failed'&&w.state.queue.length===0,
   '500 does not queue typed alias for future replay');
 w=sandbox({mode:'403'});o=await write(w);
 ok(o.result===false&&o.opts.status==='rejected'&&w.state.queue.length===0,
   '403 is denied and cannot queue');
 w=sandbox({owner:'synthetic-B'});await assert.rejects(write(w),/owner mismatch/);n++;
 ok(w.state.calls.length===0&&w.state.queue.length===0,
   'owner mismatch rejected before HTTP request');
 w=sandbox({mode:'switch'});o=await write(w);
 ok(o.result===false&&o.opts.status==='failed'&&w.state.queue.length===0,
   'account switch while awaiting response does not report successful save');
 console.log('TK603 confirmed-only typed FK session writer: '+n+' original-code assertions PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
