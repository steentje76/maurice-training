'use strict';
// #603: exercise FK placeholders are never independent exercises in the app.
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function take(name){
 const m=new RegExp('(?:async\\s+)?function\\s+'+name+'\\s*\\(').exec(html);
 assert(m,'missing '+name);
 let d=0;
 for(let i=html.indexOf('{',m.index);i<html.length;i++){
  if(html[i]==='{')d++;
  else if(html[i]==='}'&&--d===0)return html.slice(m.index,i+1);
 }
 throw Error('unclosed '+name);
}
const testSource=take('tk504IsReservedGlobalFkStub')+'\n'+take('ensureExercisesLoaded');
function make(rows){
 const sandbox={exercises:[],_exercisesLoading:null};
 let reads=0,writes=0;
 sandbox.sbGet=async()=>{reads++;return rows;};
 sandbox.sbUpsert=async()=>{writes++;return true;};
 vm.createContext(sandbox);vm.runInContext(testSource,sandbox,{timeout:3000});
 return {sandbox,load:()=>sandbox.ensureExercisesLoaded(),
  get reads(){return reads;},get writes(){return writes;}};
}
const alias=i=>({id:'TKC-'+String(i).padStart(6,'0'),name:'reserved FK stub',
  scope:'global',active:true});
const personal=i=>({id:'TK-'+String(i).padStart(6,'0'),name:'personal training',
  scope:'personal',active:true});
(async()=>{
 const allAliases=Array.from({length:582},(_,i)=>alias(i+1));
 const personalRows=Array.from({length:16},(_,i)=>personal(i+1));
 const misc={id:'legacy-row',scope:'global',name:'Legacy exercise'};
 const a=make([...allAliases,...personalRows,misc]);
 const loaded=await a.load();
 assert.equal(loaded.length,17);
 assert.equal(loaded.filter(r=>r.scope==='personal').length,16);
 assert(loaded.includes(misc));
 assert.equal(loaded.filter(r=>r.id.startsWith('TKC-')).length,0);
 assert.equal(a.reads,1);
 assert.equal(a.writes,0);
 await a.load();assert.equal(a.reads,1,'existing cache still works');
 assert.equal(a.sandbox.tk504IsReservedGlobalFkStub({id:'TKC-000038',scope:'personal'}),false);
 assert.equal(a.sandbox.tk504IsReservedGlobalFkStub({id:'TK-000038',scope:'global'}),false);
 assert.equal(a.sandbox.tk504IsReservedGlobalFkStub({id:'TKC-000583',scope:'global'}),false);
 assert.equal(a.sandbox.tk504IsReservedGlobalFkStub(alias(1)),true);
 assert.equal(a.sandbox.tk504IsReservedGlobalFkStub(alias(582)),true);
 const allStubOnly=make(allAliases);
 const invisible=await allStubOnly.load();
 assert.equal(invisible.length,0);
 assert.equal(allStubOnly.writes,0,'only FK rows cannot trigger default exercise seeding');
 const legacy=make([misc]);
 assert.equal((await legacy.load()).length,1);
 assert.equal(legacy.writes,0);
 console.log('TK504 global FK placeholders: 582 hidden, 16 personal IDs preserved, empty-stub DB no writes, legacy route preserved PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
