'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function fn(name){const m=new RegExp('(?:async\\s+)?function\\s+'+name+'\\s*\\(').exec(html);assert(m,name);for(let e=html.indexOf('}',m.index);e>=0;e=html.indexOf('}',e+1)){const s=html.slice(m.index,e+1);try{new vm.Script(s);return s;}catch{}}throw Error(name);}
(async()=>{
 const calls=[],c=vm.createContext({TK504_TYPED_FK_SESSION_RELEASE:true,sbGet:async(t,q)=>{calls.push(q);return [{exercise_id:'personal'}];}});
 vm.runInContext(fn('tk603CoachRecentSessions'),c);
 assert.equal((await c.tk603CoachRecentSessions(new Set(),'2026-11-01')).length,0);
 assert.equal(calls.length,0,'all-catalog active workout must make no personal-history request');
 await c.tk603CoachRecentSessions(new Set(['personal']),'2026-11-01');
 assert.match(calls.pop(),/exercise_id=in.\(personal\)/,'mixed training stays limited to explicit personal items');
 await c.tk603CoachRecentSessions(null,'2026-11-01');assert.match(calls.pop(),/date=gte.2026-11-01/);
 c.TK504_TYPED_FK_SESSION_RELEASE=false;
 await c.tk603CoachRecentSessions(new Set(),'2026-11-01');assert.match(calls.pop(),/date=gte/,'flag-off empty legacy training retains legacy query');
 assert.match(fn('buildCtx'),/recentSessionsQuery=tk603CoachRecentSessions\(relevantExIds,sinceStr\)/,'actual coach uses checked query boundary');
 for(const stage of ['confirm','exercises','equipment']){
  let owner='A';const oldLog={private:'B untouched'},draft={t:'custom_test',ts:1,owner_uid:'A',sessionLog:{}};
  const x=vm.createContext({tkEigenaarUid:()=>owner,activeInstanceId:null,customTrainings:[{id:'test'}],
   restoreTrainingDraft:()=>draft,isSameLocalDay:()=>true,draftHasData:()=>true,consumeHomeResumeIntent:()=>false,
   confirmModal:async()=>{if(stage==='confirm')owner='B';return true;},
   tk603DraftOwnerMatches:d=>d.owner_uid===owner,guardExistingDraft:async()=>true,
   ensureExercisesLoaded:async()=>{if(stage==='exercises')owner='B';},
   ensureEquipmentTypesLoaded:async()=>{if(stage==='equipment')owner='B';},
   curT:'previous',sessionLog:oldLog,sessionExtra:[],Date});
  vm.runInContext(fn('startCustomTraining'),x);
  await x.startCustomTraining('test',[{id:'unused'}]);
  assert.equal(x.curT,'previous','owner change during '+stage+' must not reset active training');
  assert.equal(x.sessionLog,oldLog,'owner change during '+stage+' must preserve current log object');
 }
 console.log('TK603 coach empty-set and custom resume owner: 12 assertions PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
