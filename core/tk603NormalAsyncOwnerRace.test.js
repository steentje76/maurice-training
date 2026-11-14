'use strict';
// The actual finishSession function; synthetic async API boundaries, not device proof.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function fn(name){const m=new RegExp('(?:async\\s+)?function\\s+'+name+'\\s*\\(').exec(html);assert(m,name);let d=0;for(let i=html.indexOf('{',m.index);i<html.length;i++){if(html[i]==='{')d++;if(html[i]==='}'&&--d===0)return html.slice(m.index,i+1);}throw Error(name);}
function deferred(){let resolve;const promise=new Promise(r=>{resolve=r;});return{promise,resolve};}
function setup(){
 const state={rowSeq:0,owner:'A',items:[],writes:[],goals:[],completions:[],patches:[],clears:[],summary:[],ensure:null,write:null,complete:null,patch:null,weather:null,goal:null};
 const el={disabled:false,textContent:'',innerHTML:'',classList:{remove(){},add(){}}};
 const s=vm.createContext({console,Date,Math,JSON,Set,finishSessionBezig:false,_finishSessionContext:null,
  TK504_TYPED_FK_SESSION_RELEASE:true,tkEigenaarUid:()=>state.owner,
  curT:null,sessionLog:{},sessionExtra:[],activeInstanceId:null,activePlannedAssignmentId:null,sessionProgramSnapshot:null,trainStart:null,pausedAccumMs:0,
  pctSelection:{},rpeManual:{},warmupState:{},cardioSplitMode:{},cardioSplits:{},manualKgSets:{},sessionRxAdj:{},sessionPrBase:{},resolvedWorkout:null,
  getSessionExs:()=>state.items,td:()=> '2026-11-07',getExerciseMuscles:()=>[],
  document:{getElementById:()=>el,querySelectorAll:()=>[]},window:{},
  TKWeather:{isEnabled:()=>!!state.weather,OUTDOOR_CAPABLE:{},forContext:async()=>state.weather()},tkWeatherCtx:()=>({}),resolveCardioType:()=>null,
  ensureSessionExerciseRows:async()=>state.ensure?state.ensure():{},tkSessieOptsVoor:()=>({}),tkSessieUitkomst(){},
  writeSessionRow:async(row,opts)=>{state.writes.push({owner:state.owner,row});return state.write?state.write(row,opts):true;},
  upsertExerciseGoalField:async(id,k,v)=>{state.goals.push({owner:state.owner,id,k,v});if(state.goal)return state.goal();},
  DecisionCore:{releaseRecord:w=>({isRecord:true,waarde:w})},prFor:()=>0,
  completeTrainingInstance:async id=>{state.completions.push({owner:state.owner,id});return state.complete?state.complete(id):true;}, // #587: completion must be confirmed (true)
  sbPatchQ:async(t,f,row)=>{state.patches.push({owner:state.owner,t,f,row});if(state.patch)return state.patch(t);return true;},
  clearTrainingDraft:()=>state.clears.push(state.owner),closeModal(){},stopTrainTimer(){},tkErgDisconnectAll(){},toast(){},go(){},refreshStats(){},openModal(){},
  generateSessionSummaryAI:async(t,data)=>{state.summary.push({owner:state.owner,t,data});return 'synthetic summary';},
  // #587 execution-draft boundaries (synthetic): checkpoints and skipped-set lookup.
  persistTrainingDraft(){},execSkipSet:()=>new Set(),crypto:{randomUUID:()=> 'row-'+(++state.rowSeq)}
 });
 for(const n of ['newClientRowId','execExerciseHasData','buildStrengthSessionRow','tk603CanUpdatePersonalRecord','finishSession'])vm.runInContext(fn(n),s);
 function start(owner,t='custom_'+owner){state.owner=owner;s.curT=t;s.sessionLog={exercise:{sets:[{kg:32,reps:8,rpe:8}]}};s.sessionExtra=[];s.activeInstanceId='instance-'+owner;s.activePlannedAssignmentId='assignment-'+owner;state.items=[{id:'exercise',naam:'synthetic',sets:1,reps:'8',rpe:'8'}];return s.sessionLog;}
 return {s,state,start};
}
const tests=[];function test(name,run){tests.push({name,run});}
test('normal FK await owner switch cannot send old workout under new account',async()=>{const a=setup();a.start('A');const bLog={};a.state.ensure=async()=>{Object.assign(bLog,a.start('B'));return {};};await a.s.finishSession();assert.equal(a.state.writes.length,0);assert.equal(a.state.goals.length,0);assert.equal(a.s.curT,'custom_B');});
test('normal write acknowledgement does not mutate next owner personal goal or log',async()=>{const a=setup();a.start('A');let b;a.state.write=async()=>{b=a.start('B');return true;};await a.s.finishSession();assert.equal(a.state.goals.length,0);assert.equal(a.state.completions.length,0);assert.equal(a.s.sessionLog,b);assert(!a.state.clears.includes('B'));});
test('normal completion callback cannot erase next owner log/instance',async()=>{const a=setup();a.start('A');let b;a.state.complete=async()=>{b=a.start('B');};await a.s.finishSession();assert.equal(a.s.sessionLog,b);assert.equal(a.s.activeInstanceId,'instance-B');assert.equal(a.state.patches.length,0);assert(!a.state.clears.includes('B'));});
test('same-owner new normal session survives old completion continuation',async()=>{const a=setup();a.start('A','first');let next;a.state.complete=async()=>{next=a.start('A','second');};await a.s.finishSession();assert.equal(a.s.curT,'second');assert.equal(a.s.sessionLog,next);assert.equal(a.state.patches.length,0);});
test('owner switch after program completion does not complete old assignment under B',async()=>{const a=setup();a.start('A','prog_synthetic');let b;a.state.patch=async table=>{if(table==='program_blocks')b=a.start('B');};await a.s.finishSession();assert.equal(a.state.patches.length,1);assert.equal(a.s.sessionLog,b);assert.equal(a.state.summary.length,0);});
test('new normal save lock independent from old request and old finally cannot unlock B',async()=>{
 const a=setup(),first=deferred(),second=deferred(),readyA=deferred(),readyB=deferred();a.start('A');a.state.write=async()=>{if(a.state.owner==='A'){readyA.resolve();return first.promise;}readyB.resolve();return second.promise;};
 const old=a.s.finishSession();await readyA.promise;a.start('B');const current=a.s.finishSession();
 await Promise.race([readyB.promise,new Promise((_,reject)=>setTimeout(()=>reject(Error('B blocked by stale normal lock')),1000))]);
 first.resolve(true);await old;assert.equal(a.s.finishSessionBezig,true,'old finally must not release B lock');second.resolve(true);await current;assert.equal(a.s.finishSessionBezig,false);assert(a.state.goals.every(x=>x.owner==='B'));assert.equal(a.state.writes.length,2);
});
test('normal same owner happy path completes own instance/assignment, clears own draft and reaches summary',async()=>{
 const a=setup();a.start('A');await a.s.finishSession();
 assert.equal(a.state.writes.length,1);assert.equal(a.state.writes[0].owner,'A');assert.equal(a.state.goals.length,1);
 assert.deepEqual(a.state.completions,[{owner:'A',id:'instance-A'}]);assert.equal(a.state.patches.length,1);assert.equal(a.state.patches[0].t,'planned_training_assignments');
 assert.deepEqual(a.state.clears,['A']);assert.equal(a.s.curT,null);assert.equal(Object.keys(a.s.sessionLog).length,0);assert.equal(a.s.activeInstanceId,null);
 assert.equal(a.state.summary.length,1);assert.equal(a.state.summary[0].owner,'A');assert.equal(a.s.finishSessionBezig,false);assert.equal(a.s._finishSessionContext,null);
});
test('normal same active context double tap still produces one write and one summary',async()=>{
 const a=setup(),wait=deferred(),started=deferred();a.start('A');a.state.write=async()=>{started.resolve();return wait.promise;};
 const first=a.s.finishSession();await started.promise;await a.s.finishSession();assert.equal(a.state.writes.length,1);
 wait.resolve(true);await first;assert.equal(a.state.writes.length,1);assert.equal(a.state.summary.length,1);assert.equal(a.s.finishSessionBezig,false);
});
let finished=false;process.on('exit',()=>{if(!finished){console.error('FAIL runner: not all tests settled (pending promise)');process.exitCode=1;}});
(async()=>{let fail=0;for(const t of tests){try{await t.run();console.log('PASS '+t.name);}catch(e){fail++;console.error('FAIL '+t.name+': '+e.message);}}console.log('TK603 normal async ownership: '+(tests.length-fail)+'/'+tests.length+' PASS; synthetic actual-function VM');finished=true;if(fail)process.exitCode=1;})();
