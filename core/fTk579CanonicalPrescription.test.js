'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function source(name){
  const re=new RegExp('(?:async )?function '+name+'\\([^)]*\\)\\s*\\{');
  const m=re.exec(html);assert(m,'missing '+name);
  let depth=0,end=-1;
  for(let i=html.indexOf('{',m.index);i<html.length;i++){
    if(html[i]==='{')depth++;
    else if(html[i]==='}'&&--depth===0){end=i+1;break;}
  }
  assert(end>m.index,'unbalanced '+name);
  return html.slice(m.index,end);
}
const resolver=source('tkErgResolveIntervalPrescription');
const start=source('startIntervalExecution');
const pm5=source('tkErgSendFiniteTest');
assert(start.includes('tkErgResolveIntervalPrescription(exId,cardioType)'),
  'ordinary execution must use the shared prescription source');
assert(pm5.includes('tkErgResolveIntervalPrescription(exId,cardioType)'),
  'PM5 transfer must use the same shared prescription source');
const canonical={geldig:true,sport:'rowerg',blocks:[{type:'work',termination:{type:'time',seconds:90}}]};
const form={geldig:true,sport:'rowerg',blocks:[{type:'work',termination:{type:'time',seconds:60}}]};
const pending={exId:'EX',instanceId:'instance-123',sport:'rowerg',prescription:canonical};
let formReads=0;
function run(p){
 const resolve=new Function('_tkErgPending','buildIntervalPrescriptionFromForm',
  resolver+'\nreturn tkErgResolveIntervalPrescription;')(
    p,()=>{formReads++;return form;}
  );
 return resolve('EX','rowerg');
}
let r=run(pending);
assert.strictEqual(r.prescription,canonical,'canonical program snapshot must win over stale form');
assert.strictEqual(r.canon,pending,'same identity must be preserved');
assert.equal(formReads,0,'do not read or recalculate the form when canonical exists');
r=run({...pending,exId:'OTHER'});
assert.strictEqual(r.prescription,form,'unrelated program must not leak into this exercise');
assert.strictEqual(r.canon,null);
r=run({...pending,prescription:{geldig:false}});
assert.strictEqual(r.prescription,form,'invalid snapshot must fall back exactly as normal execution does');
r=run(null);
assert.strictEqual(r.prescription,form,'ad-hoc workouts use existing form');
assert.equal(formReads,3);
console.log('TK579 shared canonical prescription: execution and PM5 agree; fallback and instance isolation PASS');