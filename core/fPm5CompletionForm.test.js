'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');const root=path.join(__dirname,'..'),s=fs.readFileSync(path.join(root,'index.html'),'utf8');
function fn(n){const i=s.search(new RegExp('(?:async )?function '+n+'\\('));assert(i>=0,n);for(let e=s.indexOf('}',i);e>=0;e=s.indexOf('}',e+1)){const x=s.slice(i,e+1);try{new Function('return ('+x+'\n)');return x;}catch{}}throw Error(n);}
const live=require('./concept2Live');const fields={},c={curT:'A',sessionLog:{row:{cardio:{type:'rowing',rpe:'7'}}},cardioSplitMode:{},cardioSplits:{row:{1:50,2:50}},

 getSessionExs:()=>[{id:'row',type:'rowing'}],resolveCardioType:()=> 'rowing',tkC2IsLoggableSummary:x=>Number(x.distanceM)>0&&Number(x.elapsedTimeS)>0,
 tkC2Converter:()=>live.liveWorkoutToActual,setCardioVal:(id,f,v)=>{fields[f]=v;},renderSplitRows:()=>{},scheduleAutosave:()=>{},persistTrainingDraft:()=>{c.saved=(c.saved||0)+1;},document:{getElementById:()=>({textContent:''})}};
const cfgStart=s.indexOf('const CARDIO_TYPES = ')+ 'const CARDIO_TYPES = '.length;let cfg;for(let e=s.indexOf('}',cfgStart);e>=0;e=s.indexOf('}',e+1)){try{cfg=new Function('return ('+s.slice(cfgStart,e+1)+')')();break;}catch{}}assert(cfg,'actual production CARDIO_TYPES');c.CARDIO_TYPES=cfg;
vm.createContext(c);for(const n of ['tkC2SessionRowFromLog','tkC2ReflectCompletedActual','computeAutoSplits','splitRowsHtml'])vm.runInContext(fn(n),c);
const frozen={measurement:{machineType:'rowerg',distanceM:1000,elapsedTimeS:227.7,watts:237,strokeRateSPM:27,dragFactor:125}};
assert.equal(c.tkC2ReflectCompletedActual('row',frozen),true);assert.equal(String(fields.dist),'1000');assert.equal(fields.time,'3:47.7');assert.equal(String(fields.watt),'237');assert.equal(String(fields.stroke),'27');assert.equal(String(fields.drag),'125');assert.equal(fields.split,'1:53.8');assert.equal(c.saved,1,'completed actual persisted immediately');assert.equal(c.sessionLog.row.cardio.rpe,'7','manual RPE is not a device value');assert.equal(Object.keys(c.cardioSplits.row).length,0,'no fabricated equal device splits');
assert.equal(c.tkC2SessionRowFromLog(frozen.measurement,{actualRpe:'7,5'},live.liveWorkoutToActual).rpe,7.5,'explicit user RPE survives single row conversion');
assert.equal(c.tkC2SessionRowFromLog(frozen.measurement,{rpe_target:8},live.liveWorkoutToActual).rpe,null,'target RPE never becomes actual');
assert.equal(c.tkC2SessionRowFromLog(frozen.measurement,{actualRpe:''},live.liveWorkoutToActual).rpe,null,'missing user RPE remains missing');
assert(s.includes('actualRpe:l.cardio?.rpe'));assert(s.includes("actualRpe:val('rpe')"));
let calls=0;c.CardioEngine={autoSplits:()=>{calls++;return {1:50};}};c.computeAutoSplits('row','rowing');assert.equal(calls,0);assert(c.splitRowsHtml('row','rowing').includes('Exacte splits niet beschikbaar'));
assert.equal(c.tkC2ReflectCompletedActual('row',{measurement:{}}),false,'invalid completion does not populate results');
console.log('PM5 frozen measurement -> existing converter -> visible form + retained user RPE; missing measured splits stay unavailable PASS');
