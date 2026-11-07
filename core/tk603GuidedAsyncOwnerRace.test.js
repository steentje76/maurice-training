'use strict';
// Actual shipped Guided module; synthetic async callbacks/JSON store, not browser/device proof.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function fn(name){const m=new RegExp('(?:async\\s+)?function\\s+'+name+'\\s*\\(').exec(html);assert(m,name);let d=0;for(let i=html.indexOf('{',m.index);i<html.length;i++){if(html[i]==='{')d++;if(html[i]==='}'&&--d===0)return html.slice(m.index,i+1);}throw Error(name);}
function deferred(){let resolve;const promise=new Promise(r=>{resolve=r;});return{promise,resolve};}
function setup(){
 const map=new Map([['tk_cache_owner_uid','A']]),state={owner:'A',writes:[],goals:[],completions:[],clears:[],binding:null,ensure:null,write:null,complete:null,seq:0};
 const storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,String(v)),removeItem:k=>{if(k==='tk_gw_active')state.clears.push(state.owner);map.delete(k);}};
 const s=vm.createContext({console,localStorage:storage,TK504_TYPED_FK_SESSION_RELEASE:true,
  tkEigenaarUid:()=>state.owner,tk504ValidateCatalogSourceRef:(id,r)=>r?.catalog_id===id?r:null,
  window:{ExerciseCatalogService:{byId:()=>({identity:{primary:[]},intelligence:{fatigue:'low',recovery:'24_hours'}})}},
  td:()=> '2026-11-07',newClientRowId:()=> '00000000-0000-4000-8000-'+String(++state.seq).padStart(12,'0'),
  tk504VerifySessionBinding:async it=>state.binding?state.binding(it):({owner_uid:state.owner,fk_id:'TKC-'+it.id.slice(3)}),
  ensureExerciseRowStatus:async id=>state.ensure?state.ensure(id):'exists',
  buildStrengthSessionRow:(id,sets,opts)=>({row:{exercise_id:id,weight:sets[0].kg,...opts}}),
  writeSessionRow:async(row,opts)=>{state.writes.push({owner:state.owner,row:JSON.parse(JSON.stringify(row))});return state.write?state.write(row,opts):{status:'confirmed'};},
  completeTrainingInstance:async id=>{state.completions.push({owner:state.owner,id});if(state.complete)return state.complete(id);},
  upsertExerciseGoalField:async(id,key,value)=>{state.goals.push({owner:state.owner,id,key,value});},
  DecisionCore:{releaseRecord:w=>({isRecord:true,waarde:w})},prFor:()=>0,Date,JSON,Math
 });
 vm.runInContext(fn('tk603DraftOwnerMatches')+'\n'+fn('tk603CanUpdatePersonalRecord'),s);
 const start=html.indexOf('var GW=(function(){'),end=html.indexOf('\n})();',start);assert(start>0&&end>start);vm.runInContext(html.slice(start,end+6),s);
 const ref={kind:'movekit-catalog-v1',catalog_id:'TK-000038',provider_id:'synthetic'};
 function startTraining(owner,instance='instance-'+owner,typed=false){state.owner=owner;storage.setItem('tk_cache_owner_uid',owner);s.GW.st.active=null;s.GW.start({items:[{id:'TK-000038',sets:1,pick:'compound',...(typed?{tk504_catalog_ref:ref}:{})}]},{goal:'kracht'},{instanceId:instance});s.GW.setWeight(32);s.GW.rateSet('goed',8);return s.GW.active();}
 return {s,state,storage,startTraining,gw:s.GW};
}
const tests=[];function test(name,run){tests.push({name,run});}
test('old completion callback never clears new account Guided snapshot',async()=>{
 const a=setup();a.startTraining('A');let b;
 a.state.complete=async()=>{b=a.startTraining('B');assert(a.storage.getItem('tk_gw_active'));};
 await a.gw.finish();assert.equal(a.gw.st.active,b);assert.equal(JSON.parse(a.storage.getItem('tk_gw_active')).owner_uid,'B');
});
test('same-owner replacement active object also survives an older completion callback',async()=>{
 const a=setup();a.startTraining('A','first-A');let next;
 a.state.complete=async()=>{next=a.startTraining('A','second-A');};
 await a.gw.finish();assert.equal(a.gw.st.active,next);assert.equal(JSON.parse(a.storage.getItem('tk_gw_active')).instanceId,'second-A');
});
test('account switch during legacy FK await prevents session and personal goal write',async()=>{
 const a=setup();a.startTraining('A');a.state.ensure=async()=>{a.startTraining('B');return 'exists';};
 await a.gw.finish();assert.equal(a.state.writes.length,0);assert.equal(a.state.goals.length,0);assert.equal(JSON.parse(a.storage.getItem('tk_gw_active')).owner_uid,'B');
});
test('account switch during binding await never posts the old catalog session',async()=>{
 const a=setup();a.startTraining('A','A',true);a.state.binding=async()=>{a.startTraining('B');return {owner_uid:'A',fk_id:'TKC-000038'};};
 await a.gw.finish();assert.equal(a.state.writes.length,0);assert.equal(JSON.parse(a.storage.getItem('tk_gw_active')).owner_uid,'B');
});
test('old write acknowledgement cannot update next account goals or clear its draft',async()=>{
 const a=setup();a.startTraining('A');a.state.write=async()=>{a.startTraining('B');return {status:'confirmed'};};
 await a.gw.finish();assert.equal(a.state.goals.length,0);assert.equal(a.state.completions.length,0);assert.equal(JSON.parse(a.storage.getItem('tk_gw_active')).owner_uid,'B');
});
test('new active save has independent lock; stale promise cannot clear its pending save',async()=>{
 const a=setup(),first=deferred(),second=deferred(),firstStarted=deferred(),secondStarted=deferred();
 a.startTraining('A');a.state.write=async()=>{if(a.state.owner==='A'){firstStarted.resolve();return first.promise;}secondStarted.resolve();return second.promise;};
 const old=a.gw.finish();await firstStarted.promise;
 a.startTraining('B');const current=a.gw.finish();
 assert.notEqual(current,old,'B must not reuse A save promise');
 await Promise.race([secondStarted.promise,new Promise((_,reject)=>setTimeout(()=>reject(Error('B save blocked by old A lock')),1000))]);
 first.resolve({status:'confirmed'});await old;assert.equal(a.gw.pendingSave(),current,'old promise must not clear B lock');
 second.resolve({status:'confirmed'});await current;assert.equal(a.gw.pendingSave(),null);assert.equal(a.state.writes.length,2);
 assert(a.state.goals.every(g=>g.owner==='B'),'stale A callback makes no personal goal claims under B');
});
test('Guided same owner happy path writes once, clears own snapshot once and releases own lock',async()=>{
 const a=setup();a.startTraining('A');const out=await a.gw.finish();
 assert.equal(out.status,'confirmed');assert.equal(out.written,1);assert.equal(a.state.writes.length,1);assert.equal(a.state.writes[0].owner,'A');
 assert.deepEqual(a.state.completions,[{owner:'A',id:'instance-A'}]);assert.deepEqual(a.state.clears,['A']);assert.equal(a.storage.getItem('tk_gw_active'),null);assert.equal(a.gw.pendingSave(),null);
 assert.equal(a.gw.active().sessionsLogged,true);assert.equal(JSON.parse(a.storage.getItem('tk_gw_log')).length,1);
 await a.gw.finish();assert.equal(a.state.writes.length,1);assert.deepEqual(a.state.clears,['A']);assert.equal(JSON.parse(a.storage.getItem('tk_gw_log')).length,1);
});
(async()=>{let failed=0;for(const t of tests){try{await t.run();console.log('PASS '+t.name);}catch(e){failed++;console.error('FAIL '+t.name+': '+e.message);}}console.log('TK603 real Guided async owner/active races: '+(tests.length-failed)+'/'+tests.length+' PASS; synthetic VM only');if(failed)process.exitCode=1;})();
