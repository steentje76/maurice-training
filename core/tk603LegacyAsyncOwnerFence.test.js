'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function extract(name){const m=new RegExp('(?:async\\s+)?function\\s+'+name+'\\s*\\(').exec(html);assert(m,name);let d=0;for(let i=html.indexOf('{',m.index);i<html.length;i++){if(html[i]==='{')d++;if(html[i]==='}'&&--d===0)return html.slice(m.index,i+1);}throw Error(name);}
(async()=>{
 let owner='A',release;
 const oldMap=new Map(),newMap=new Map();
 const c=vm.createContext({console,Date,Object,Map,TK504_TYPED_FK_SESSION_RELEASE:false,
 tkEigenaarUid:()=>owner,exerciseGoals:oldMap,authSession:{user:{id:'A'}},
 sbPostQ:async()=>{await new Promise(r=>release=r);return true;},
 sbPatchQ:async()=>{await new Promise(r=>release=r);return true;}});
 vm.runInContext(extract('upsertExerciseGoalField'),c);
 let p=c.upsertExerciseGoalField('same','pr',100);owner='B';c.exerciseGoals=newMap;release();await p;
 assert.equal(newMap.size,0,'pending A insert must not populate B goals');
 owner='A';c.exerciseGoals=oldMap;const existing={pr:50};oldMap.set('same',existing);
 p=c.upsertExerciseGoalField('same','pr',100);owner='B';c.exerciseGoals=newMap;release();await p;
 assert.equal(existing.pr,50,'stale PATCH must not mutate retained goal object');
 owner='A';c.exerciseGoals=oldMap;p=c.upsertExerciseGoalField('same','pr',120);release();await p;
 assert.equal(existing.pr,120,'same-owner PATCH still updates cache');

 let queries=0,rendered=0;
 const chart=vm.createContext({console,TK504_TYPED_FK_SESSION_RELEASE:false,
 tkEigenaarUid:()=>owner,sbGet:async()=>{queries++;await new Promise(r=>release=r);return [{weight:999,reps:1,date:'2026-11-01'}];},
 epley1RMRaw:()=>{rendered++;return 999;},toast:()=>{rendered++;}});
 vm.runInContext(extract('show1RMChart'),chart);
 owner='A';p=chart.show1RMChart('same','A private');owner='B';release();await p;
 assert.equal(rendered,0,'legacy chart must discard A response before calculating/rendering under B');
 assert.equal(queries,1);
 console.log('TK603 legacy async owner fence: 5 assertions PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
