'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function extract(name){const m=new RegExp('(?:async\\s+)?function\\s+'+name+'\\s*\\(').exec(html);assert(m,name);let d=0;for(let i=html.indexOf('{',m.index);i<html.length;i++){if(html[i]==='{')d++;if(html[i]==='}'&&--d===0)return html.slice(m.index,i+1);}throw Error(name);}
const memory={owner:'A'};
const ctx=vm.createContext({console,Object,Set,Map,CACHE_OWNER_KEY:'owner',localStorage:{getItem:k=>memory[k]||null,setItem:(k,v)=>memory[k]=v},wipePersonalCache:()=>{delete memory.owner;},strengthBasisCache:{'TK-000038':{recent:{e1rm:999}},'catalog:A:TK-000038':{recent:{e1rm:555}}},_exPickerPoolCache:[{id:'TK-000038',name:'A private'}],_exPickerPoolKey:'1:226:TK-000038',_tkRelRows:[{user_id:'A'}],_tkRelSessies:[{user_id:'A',weight:999}],_tkRelWeight:[{user_id:'A'}],_tkRelNutritionMeals:[{user_id:'A'}],_tkRelNutritionHydration:[{user_id:'A'}],_tkRelCache:{90:{personal:'A'}},tk603LiveSource:{'TK-000038':{owner:'A'}},sessionLog:{'TK-000038':{sets:[{kg:999}]}},sessionExtra:[{id:'TK-000038'}],resolvedWorkout:{items:[{exercise_id:'TK-000038'}]},curT:'A-training'});
vm.runInContext(['invalidateExPickerPool','resetPersonalCacheIfNewDeviceOwner'].map(extract).join('\n'),ctx);
ctx.resetPersonalCacheIfNewDeviceOwner('B');
assert.equal(memory.owner,'B');
assert.equal(Object.keys(ctx.strengthBasisCache).length,0,'previous owner strength basis must be cleared');
assert.equal(ctx._exPickerPoolCache,null,'same count/same ID personal picker cache must be invalidated');
assert.equal(ctx._tkRelRows,null,'relationship raw health cache must be cleared');
assert.equal(ctx._tkRelSessies,null,'relationship session/trend cache must be cleared');
assert.equal(Object.keys(ctx._tkRelCache).length,0,'computed relationship cache must be cleared');
assert.equal(Object.keys(ctx.tk603LiveSource).length,0,'live catalog provenance cannot survive account change');
assert.equal(Object.keys(ctx.sessionLog).length,0,'previous owner active log must leave memory');
assert.equal(ctx.curT,null,'previous owner active training must leave memory');
console.log('TK603 account cache reset: 9 real-function owner-switch assertions PASS');
