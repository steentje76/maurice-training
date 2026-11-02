'use strict';
// Synthetic account-switch race: data fetched for A must never appear as B's muscle metrics.
// Source-derived functions only; no live account or database access.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
function extract(name){
 const re=new RegExp('(?:async\\s+)?function\\s+'+name+'\\('),match=re.exec(html);
 assert(match,name+' missing');const start=match.index;let pos=html.indexOf('{',start),depth=0;
 for(let i=pos;i<html.length;i++){if(html[i]==='{')depth++;else if(html[i]==='}'&&!--depth)return html.slice(start,i+1);}
 throw Error('Unclosed '+name);
}
let owner='A', pending=null, remember=0;
const recoveryElement={innerHTML:'B-OWNED-CONTENT'};
const row={id:'A-ROW',date:new Date().toISOString(),exercise_id:'sq',sets:3,weight:100,reps:5,rpe:8};
const ctx=vm.createContext({
 Date,console,window:{},document:{getElementById:()=>recoveryElement},tkEigenaarUid:()=>owner,
 sbGet:()=>new Promise(resolve=>{pending=resolve;}),
 v43SafeGet:()=>new Promise(resolve=>{pending=resolve;}),
 getExerciseMuscles:()=>['Quadriceps'],muscleNamesToSvgIds:x=>x,
 tkRememberMuscleInputs:()=>{remember++;return {owner};},
 MUSCLE_RECOVERY_HOURS:{Quadriceps:72},SVG_ID_RECOVERY_HOURS:{Quadriceps:72},
 computeMuscleRecoveryPct:()=>55
});
for(const f of ['muscleLoadBySvgId','getRelevantMuscleRecovery','v43OverallRecovery','refreshMuscleRecovery'])vm.runInContext(extract(f),ctx);
async function test(name,check,startOwner='A'){
 owner=startOwner;pending=null;remember=0;
 const result=ctx[name]===ctx.getRelevantMuscleRecovery?ctx[name](['Quadriceps']):ctx[name]();
 assert.equal(typeof pending,'function','fetch should have started');
 owner='B';pending([row]);const data=await result;check(data);
 assert.equal(remember,0,name+' must not record A provenance under B');
}
(async()=>{
 await test('muscleLoadBySvgId',r=>{assert.deepEqual(Object.keys(r.setsByMuscle),[]);});
 await test('getRelevantMuscleRecovery',r=>{assert.equal(r.length,0);});
 await test('v43OverallRecovery',r=>{assert.equal(r.hasData,false);assert.equal(r.rows.length,0);});
 recoveryElement.innerHTML='B-OWNED-CONTENT';
 await test('refreshMuscleRecovery',()=>{assert.equal(recoveryElement.innerHTML,'B-OWNED-CONTENT');});
 // An anonymous/expired owner must also never hand its response to a new login.
 await test('muscleLoadBySvgId',r=>{assert.deepEqual(Object.keys(r.setsByMuscle),[]);},null);
 await test('v43OverallRecovery',r=>{assert.equal(r.hasData,false);},null);
 // Same-owner positive check must still use the real deterministic muscle calculation.
 owner='A';remember=0;pending=null;
 const p=ctx.muscleLoadBySvgId();pending([row]);const normal=await p;
 assert.equal(normal.setsByMuscle.Quadriceps,3);assert.equal(remember,1);
 console.log('Muscle data account-switch read guard: PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
