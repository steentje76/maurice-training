'use strict';
// Execute the real app handlers against synthetic input, never a production account.
const fs=require('fs'), vm=require('vm'), assert=require('assert');
const html=fs.readFileSync(process.env.TK584_SOURCE||'index.html','utf8').replace(/\r/g,'');
function fn(name){const start=html.search(new RegExp('(?:async )?function '+name+'\\('));assert(start>=0,'missing '+name);const end=html.indexOf('\n}',start);return html.slice(start,end+2);}
function env(){
 const elements={}; const noop=()=>{};
 const c={console,Date,Set,Math,Number,parseFloat,parseInt,setTimeout:noop,clearTimeout:noop,
 execCompleteBusy:false,sessionLog:{},sessionExtra:[],resolvedWorkout:null,TRAIN_CFG:{},curT:'prog_fixture',execFocus:{prog_fixture:0},
 exercises:[],repPRCache:{},exerciseGoals:new Map(),sessionPrBase:{},BARBELL_EXERCISES:new Set(),lastSetDoneAt:{},
 document:{getElementById:id=>elements[id]||null,querySelectorAll:()=>[]},window:{},
 normNumStr:v=>v==null?'':String(v).replace(',','.'),numNL:v=>Number(String(v).replace(',','.')),
 getEffectiveKg:(id,i)=>Number(elements[`s-${id}-${i}-kg`]?.value?.replace(',','.'))||null,
 td:()=>"2026-11-01",prFor:()=>Infinity,nearestRepBucket:()=>10,updateProgress:noop,updateSummary:noop,scheduleAutosave:noop,
 persistTrainingDraft:()=>{c.draft=JSON.parse(JSON.stringify({sessionLog:c.sessionLog,sessionExtra:c.sessionExtra}));},
 refreshActiveSetBanner:noop,unlockAudio:noop,showPostSetAdvice:noop,showSetCompletionFeedback:noop,autoRestAfterSet:noop,
 applySessionRecovery:(t,x)=>x,applyExecutionFocus:noop,showSessionSummary:()=>{c.summaryOpened=true;},
 confirmModal:async()=>true,resolveCardioType:()=>null,toast:noop,
 // #603 production flag with no catalog live source: the real legacy-key path.
 TK504_TYPED_FK_SESSION_RELEASE:true,tk603LiveSource:Object.create(null),tkEigenaarUid:()=>'synthetic-A'};
 c.elements=elements;
 c.field=(id,value='')=>{const set=new Set();return elements[id]={value,classList:{contains:x=>set.has(x),toggle:x=>set.has(x)?set.delete(x):set.add(x),add:x=>set.add(x),remove:x=>set.delete(x)},querySelector:()=>null};};
 vm.createContext(c);
 ['tk603LiveSourceKey','logSet','toggleSetDone','getSessionExs','execFocusGo'].forEach(n=>vm.runInContext(fn(n),c));
 if(html.includes('function execCompleteExercise('))vm.runInContext(fn('execCompleteExercise'),c);
 return c;
}
function fields(c,id,kg,reps,n=3){for(let i=1;i<=n;i++){
 c.field(`s-${id}-${i}-kg`,String(kg));c.field(`s-${id}-${i}-reps`,String(reps));c.field(`s-${id}-${i}-rpe`,'');c.field(`sc-${id}-${i}`);c.field(`sr-${id}-${i}`);
}}
(async()=>{
 let c=env();fields(c,'bench','57,5',12);
 c.toggleSetDone('bench',1);
 assert.equal(c.sessionLog.bench.sets[0].kg,'57.5','confirmed prefill must be recorded, not only done:true');
 assert.equal(c.sessionLog.bench.sets[0].reps,'12');
 assert.equal(c.sessionLog.bench.sets[0].done,true);
 c.sessionLog.bench.sets[0].isAmrap=true;c.sessionLog.bench.sets[0].rest_sec=75;
 c.elements['s-bench-1-kg'].value='58';c.logSet('bench','work',1,true);
 assert.equal(c.sessionLog.bench.sets[0].done,true,'editing keeps completion');
 assert.equal(c.sessionLog.bench.sets[0].isAmrap,true);assert.equal(c.sessionLog.bench.sets[0].rest_sec,75);
 c=env();fields(c,'bench',57.5,12);c.sessionExtra=[{id:'bench',_t:c.curT,type:'strength',sets:3}];
 assert(c.execCompleteExercise,'exercise completion must register confirmed inputs');
 c.confirmModal=async()=>false;await c.execCompleteExercise(c.curT);assert.equal(Object.keys(c.sessionLog).length,0,'cancel records nothing');
 c.confirmModal=async()=>true;await c.execCompleteExercise(c.curT);
 assert.equal(c.sessionLog.bench.sets.length,3);assert(c.draft.sessionLog.bench,'confirmation immediately persists draft');
 // Eight exercise plan; five actually completed, including unchanged and replacement IDs.
 c=env();const fixture=[['row',65,12],['lateral',6,15],['bench',57.5,12],['squat',63.5,12],['ohp',41,12]];
 c.sessionExtra=fixture.concat([['unperformed1'],['unperformed2'],['unperformed3']]).map(([id])=>({id,_t:c.curT,type:'strength',sets:3}));
 for(let e=0;e<fixture.length;e++){const [id,kg,reps]=fixture[e];fields(c,id,kg,reps);c.execFocus[c.curT]=e;await c.execCompleteExercise(c.curT);}
 const sets=Object.values(c.sessionLog).flatMap(l=>l.sets);
 assert.equal(sets.length,15);assert.equal(sets.reduce((v,s)=>v+Number(s.kg)*Number(s.reps),0),8442);
 assert.equal(Object.keys(c.sessionLog).length,5,'unperformed prescribed exercises stay unlogged');
 // Repeated completion replaces the same set slots, never appends duplicate sets.
 c.execFocus[c.curT]=4;await c.execCompleteExercise(c.curT);
 assert.equal(Object.values(c.sessionLog).flatMap(l=>l.sets).length,15);

 // Actual draft serializer / restorer preserves execution definition, order, skips, extra sets.
 c=env();Object.assign(c,{saveState:'dirty',lastSaveTs:null,updateSaveIndicator:()=>{},currentWorkoutElapsedMs:()=>123,
   activeInstanceId:'fixture-instance',sessionProgramSnapshot:{items:[{exercise_id:'bench',sets:3}]},execSkipped:{prog_fixture:new Set(['skip'])},execSkipSet:t=>c.execSkipped[t]||new Set(),
   localStorage:{setItem:(k,v)=>{c.serialized=v;}}});
 c.resolvedWorkout={t:c.curT,items:[{id:'replacement',sets:4}]};c.sessionExtra=[{id:'extra',_t:c.curT}];c.sessionLog={replacement:{sets:[{kg:'1',reps:'1',done:true}]}};
 vm.runInContext(fn('persistTrainingDraft'),c);vm.runInContext(fn('restoreExecutionDraft'),c);
 c.persistTrainingDraft(true);const draft=JSON.parse(c.serialized);
 c.resolvedWorkout=null;c.sessionExtra=draft.sessionExtra;c.sessionLog=draft.sessionLog;c.restoreExecutionDraft(draft);
 assert.equal(c.resolvedWorkout.items[0].id,'replacement');assert(c.execSkipped[c.curT].has('skip'));
 assert.equal(c.getSessionExs(c.curT).map(x=>x.id).join(','),'replacement,extra');
 // Real swap handler keeps performed source sets under original identity.
 c=env();Object.assign(c,{swapCtx:{fromId:'original',t:c.curT},execExerciseHasData:id=>!!c.sessionLog[id]?.sets?.length,
  resolvePickerEx:id=>({id,name:id,type:'strength'}),canonicalNewExerciseItem:async()=>({suggestedWeight:null}),
  pctSelection:{},rpeManual:{},warmupState:{},closeModal:()=>{},renderTrainScreen:async()=>{}});
 c.sessionExtra=[{id:'original',_t:c.curT,sets:3}];c.sessionLog.original={sets:[{kg:'65',reps:'12'}]};
 ['tk504CatalogSourceRefFromCatalog','tk504CatalogSourceRefFromSelection','tk603CatalogRefFromPickerSelection','confirmSwapExercise'].forEach(n=>vm.runInContext(fn(n),c));await c.confirmSwapExercise('replacement');
 assert.equal(c.sessionLog.original.sets[0].kg,'65');assert(!c.sessionLog.replacement);
 assert.equal(c.getSessionExs(c.curT).length,2);assert(c.draft.sessionLog.original);
 // History distinguishes frozen plan, modifications, and actual records; no current definition read.
 c=env();c.escHtml=x=>String(x).replaceAll('<','&lt;');c.resolvePickerEx=id=>({name:id});
 vm.runInContext(fn('programHistoryHtml'),c);
 const instance={status:'completed',snapshot:{items:[{exercise_id:'planned',sets:3,reps:'12'}],execution:{items:[{id:'actual',sets:4,reps:'10',_replaces:'planned'}],skipped:['skipped']}}};
 const history=c.programHistoryHtml(instance,[{id:'row1',exercise_id:'actual',date:'2026-11-01',sets_detail:[{kg:'57.5',reps:'12',rpe:'7'}]}]);
 for(const label of ['Oorspronkelijk gepland','Tijdens training aangepast','Werkelijk uitgevoerd','Vervangen:','Overgeslagen:','690'])assert(history.includes(label),label);
 assert(c.programHistoryHtml(null,[]).includes('niet vastgelegd'));
 // Real historical loader handles successful and failed backend reads correctly.
 Object.assign(c,{curProgramBlockId:'42',sbGetOrFail:async()=>({failed:false,rows:[{training_instance_id:'i',exercise_id:'actual',sets:3}]}),getTrainingInstance:async()=>instance});
 vm.runInContext(fn('renderCompletedProgramBlock'),c);const el={};await c.renderCompletedProgramBlock('42',el);assert(el.innerHTML.includes('Werkelijk uitgevoerd'));
 c.sbGetOrFail=async()=>({failed:true,rows:[]});await c.renderCompletedProgramBlock('42',el);assert(el.textContent.includes('niet worden geladen'));
 // Mapping / calculation input provenance is exact-ID based and account-bound.
 c=env();Object.assign(c,{tkEigenaarUid:()=> 'synthetic-A',muscleNamesToSvgIds:x=>x,
  exercises:[{id:'bench',muscle_primary:['Borst'],muscle_secondary:['Triceps']},{id:'squat',muscle_primary:['Quadriceps'],muscle_secondary:['Billen']},{id:'ohp',muscle_primary:['Schouders'],muscle_secondary:['Triceps']}],
  sbGet:async()=>[{id:'r1',exercise_id:'bench',sets:3},{id:'r2',exercise_id:'squat',sets:3},{id:'r3',exercise_id:'ohp',sets:3}]});
 for(const n of ['getExerciseMuscles','tkRememberMuscleInputs','tkMuscleInputEvidence','muscleLoadBySvgId'])vm.runInContext(fn(n),c);
 const load=await c.muscleLoadBySvgId();assert.equal(load.setsByMuscle.Triceps,6);assert.equal(load.provenance.sourceRecords.length,3);
 assert(load.provenance.calculatedAt);assert.equal(c.tkMuscleInputEvidence('muscle_load').sourceRecords[1].exerciseId,'squat');
 c.tkEigenaarUid=()=> 'synthetic-B';assert.equal(c.tkMuscleInputEvidence('muscle_load'),null);

 // Adding an empty fourth set persists only row structure, never fabricates actuals.
 c=env();const rows=[1,2,3].map(i=>({id:'sr-bench-'+i}));
 c.elements['body-bench']={querySelectorAll:()=>rows,querySelector:()=>null,appendChild:r=>rows.push(r)};
 c.document.createElement=()=>({firstElementChild:{id:'sr-bench-4'}});c.buildWorkSetRow=()=>'<div></div>';
 vm.runInContext(fn('addWorkSet'),c);c.addWorkSet('bench','strength');
 assert.equal(rows.length,4);assert.equal(c.draft.sessionLog.bench._workSetCount,4);assert(!c.sessionLog.bench.sets);
 // Real finish handler + real row builder: partial failure, process restart, stable IDs, no duplicates.
 c=env();let seq=0,failThird=true;const server=new Map();
 Object.assign(c,{finishSessionBezig:false,trainStart:0,pausedAccumMs:0,activeInstanceId:'synthetic-instance',activePlannedAssignmentId:null,
  sessionProgramSnapshot:{items:[{exercise_id:'bench',sets:3}]},execSkipSet:()=>new Set(),
  ensureSessionExerciseRows:async()=>({}),tkSessieOptsVoor:()=>({status:'confirmed'}),tkSessieUitkomst:()=>{},
  getExerciseMuscles:()=>[],DecisionCore:{releaseRecord:()=>({isRecord:false})},
  newClientRowId:()=> 'row-'+(++seq),
  writeSessionRow:async row=>{if(row.exercise_id==='ohp'&&failThird)return false;server.set(row.id,JSON.parse(JSON.stringify(row)));return true;},
  completeTrainingInstance:async(id,snapshot)=>{c.completedSnapshot=snapshot;return true;},
  closeModal:()=>{},stopTrainTimer:()=>{},tkErgDisconnectAll:()=>{},clearTrainingDraft:()=>{c.cleared=true;},
  sbPatchQ:async()=>true,generateSessionSummaryAI:async()=>'',openModal:()=>{},refreshStats:()=>{}});
 c.field('ai-summary-body');c.sessionExtra=fixture.map(([id])=>({id,_t:c.curT,type:'strength',sets:3}));
 for(const [id,kg,reps] of fixture)c.sessionLog[id]={sets:Array.from({length:3},()=>({kg:String(kg),reps:String(reps),done:true}))};
 for(const n of ['tk603CanUpdatePersonalRecord','execExerciseHasData','buildStrengthSessionRow','finishSession'])vm.runInContext(fn(n),c);
 const warn=c.console.warn;c.console={...console,warn:()=>{}};
 c.activeInstanceId=null;c.createTrainingInstance=async()=>null;
 await c.finishSession();assert.equal(server.size,0,'failed instance persistence cannot silently lose the original plan');assert(!c.cleared);
 c.createTrainingInstance=async()=> 'synthetic-instance';
 await c.finishSession();assert(!c.cleared,'partial failure keeps draft');assert.equal(server.size,4);
 assert.equal(c.draft.sessionLog.ohp._sessionRowId,'row-5');
 // Simulate lost in-memory state restored from the autosaved draft.
 c.sessionLog=JSON.parse(JSON.stringify(c.draft.sessionLog));
 fields(c,'bench',57.5,12);c.logSet('bench','work',1,true);
 assert(!c.sessionLog.bench._sessionRowPersistedAt,'editing a previously saved partial result must invalidate the acknowledgement');
 assert(c.sessionLog.bench._sessionRowId,'edit preserves stable row identity');
 failThird=false;await c.finishSession();
 assert(c.cleared,'only full success clears draft');assert.equal(server.size,5);
 assert.equal([...server.values()].reduce((n,r)=>n+r.sets,0),15);
 assert.equal([...server.values()].flatMap(r=>r.sets_detail).reduce((v,d)=>v+Number(d.kg)*Number(d.reps),0),8442);
 // Integration #587 x #603: a lazily created program instance binds every row of this finish.
 assert([...server.values()].every(r=>r.training_instance_id==='synthetic-instance'),'all rows carry the lazily created instance');
 assert.equal(c.completedSnapshot.items[0].exercise_id,'bench','original plan stays immutable');
 assert.equal(c.completedSnapshot.execution.items.length,5,'execution stored separately');
 c.console.warn=warn;
 console.log('TK584: confirmed prefill, edits, cancellation, 8-exercise mixed plan, 15 sets / 8442 kg, draft, replacement retention, history, calculation provenance and repeated completion PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
