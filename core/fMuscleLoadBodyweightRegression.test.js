'use strict';
// A bodyweight exercise has sets/reps but no external weight. Muscle-load should count its sets.
// Test calls the real existing muscleLoadBySvgId() implementation extracted from index.html.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const m=/async function muscleLoadBySvgId\(\)\s*\{/.exec(html);
assert(m,'muscleLoadBySvgId is present');let count=0,end=-1;
for(let i=html.indexOf('{',m.index);i<html.length;i++){
 if(html[i]==='{')count++;else if(html[i]==='}'&&!--count){end=i+1;break;}
}
assert(end>0);
const rows=[
 {id:'load-1',exercise_id:'barbell',weight:80,sets:2,reps:8,date:new Date().toISOString()},
 {id:'load-2',exercise_id:'pushup',weight:null,sets:3,reps:12,date:new Date().toISOString()},
 {id:'load-3',exercise_id:'pushup',weight:null,sets:0,reps:12,date:new Date().toISOString()},
 {id:'load-4',exercise_id:'pushup',weight:null,sets:-2,reps:12,date:new Date().toISOString()}
];
let query=null,remembered=null;
const c=vm.createContext({Date,console,window:{},tkEigenaarUid:()=> 'owner-1',
 getExerciseMuscles:id=>id==='pushup'?['Borst']:['Quadriceps'],
 muscleNamesToSvgIds:xs=>xs,
 sbGet:async(t,q)=>{assert.equal(t,'sessions');query=q;return rows.filter(r=>{
   if(q.includes('&weight=not.is.null')&&r.weight==null)return false;
   if(q.includes('&sets=not.is.null')&&r.sets==null)return false;
   if(q.includes('&reps=not.is.null')&&r.reps==null)return false;
   return true;
 });},
 tkRememberMuscleInputs:(_id,ss)=>{remembered=ss;return {records:ss.length};}
});
vm.runInContext(html.slice(m.index,end),c);
(async()=>{const r=await c.muscleLoadBySvgId();
 assert.equal(r.setsByMuscle.Quadriceps,2,'weighted sets intact');
 assert.equal(r.setsByMuscle.Borst,3,'bodyweight count excludes nonpositive sets');
 assert.equal(r.setsBySvgId.Borst,3,'heatmap and list share source');
 assert(!query.includes('&weight=not.is.null'),'query must not require external load');
 assert(remembered.some(x=>x.id==='load-2'),'bodyweight input remains part of evidence');
 console.log('Bodyweight muscle-load source completeness: PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
