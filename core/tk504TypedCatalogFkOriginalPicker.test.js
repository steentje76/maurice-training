'use strict';
// Real app ExerciseCatalogService + actual picker conversion + isolated FK contract.
// No private licensed sources, credentials, DB writes or app runtime activation.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const assert=require('node:assert/strict');
const identity=require('./tk504TypedCatalogFk');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const embedded=html.match(/^const EX_CATALOG = (\{.*\});?\s*$/m);
assert(embedded,'original embedded 226 exercise catalog required');
const catalog=JSON.parse(embedded[1]);
assert.equal(catalog.catalog.length,226);
assert.equal(catalog.count,226);
const start=html.indexOf('function tkCatalogDisplayName(c){');
const end=html.indexOf('const EQUIP_LABELS=',start);
assert(start>=0&&end>start,'original picker conversion exists');
const map=new Map(catalog.catalog.map(c=>[c.catalog_id,c]));
const ecs={byId:id=>map.get(id)||null,all:()=>catalog.catalog,count:()=>catalog.count};
const sandbox=vm.createContext({ExerciseCatalogService:ecs,
  exercises:[],Set,console,_exPickerPoolCache:null,_exPickerPoolKey:null});
vm.runInContext(html.slice(start,end),sandbox,{timeout:5000});
function originalFn(name){
 const r=new RegExp('function\\s+'+name+'\\s*\\(').exec(html);
 assert(r,'missing original '+name);let depth=0;
 for(let i=html.indexOf('{',r.index);i<html.length;i++){
  if(html[i]==='{')depth++;
  if(html[i]==='}'&&--depth===0)return html.slice(r.index,i+1);
 }
 throw Error('unbalanced original '+name);
}
vm.runInContext(originalFn('exPickerPool')+'\n'+originalFn('resolvePickerEx'),sandbox);
const grantIds=new Set(catalog.catalog.map(c=>identity.fkForCatalog(c.catalog_id)));
const typed=identity.create({catalogService:ecs,verifiedBinding:(id,fk,providerId)=>
 grantIds.has(fk)&&map.get(id)?.source.provider_id===providerId});
let tested=0;
for(const c of catalog.catalog){
 const fromPicker=sandbox.catalogToPickerEx(c);
 const ref=typed.resolveSelection(fromPicker);
 assert(ref&&ref.catalogId===c.catalog_id);
 assert.equal(ref.fkId,identity.fkForCatalog(c.catalog_id));
 const original={exercise_id:c.catalog_id,id:'synthetic-session-'+c.catalog_id,
   note:'non-sensitive test data',sets_detail:[{reps:8,kg:20}]};
 const planned=typed.prepareSessionRow(fromPicker,original);
 assert.equal(planned.exercise_id,ref.fkId);
 assert.equal(planned.id,original.id);
 assert.strictEqual(planned.sets_detail,original.sets_detail);
 assert.equal(original.exercise_id,c.catalog_id);
 const restored=typed.resolveHistoryRow({exercise_id:planned.exercise_id,at:'synthetic'});
 assert.equal(restored.catalog_id,c.catalog_id);
 tested++;
}
assert.equal(tested,226);
assert.equal(typed.resolveHistoryRow({exercise_id:'TK-000038'}),null,
  'existing personal/historic TK-looking exercise IDs are not inferred as catalog');
assert.equal(typed.resolveHistoryRow({exercise_id:'TKC-000227'}),null,
  'unpublished candidate cannot be presented by the 226-item app');
const shadowId='TK-000038';
sandbox.exercises=[{id:shadowId,name:'SYNTHETIC PERSONAL LEGACY',scope:'personal'}];
const shadowSelected=sandbox.resolvePickerEx(shadowId);
assert.equal(shadowSelected.name,'SYNTHETIC PERSONAL LEGACY');
assert.equal(typed.resolveSelection(shadowSelected),null,
  'typed adapter must fail closed when original picker picks personal row');
const correct=sandbox.catalogToPickerEx(map.get(shadowId));
assert(typed.resolveSelection(correct),'explicit catalog selection retains correct provenance');
assert.equal(typed.prepareSessionRow(correct,{exercise_id:shadowId}).exercise_id,
 'TKC-000038');
assert.equal(catalog.catalog[37].identity.nl,null,
 'no Dutch content or production catalog changed');
assert(!html.includes('TK504_TYPED_FK_EXECUTION_RELEASE = true'),
 'typed execution must not be active in the product without DB migration');
console.log('TK504 real 226-item ECS/picker typed-FK smoke: '+tested+
 ' canonical selections/rows/history PASS; personal ID collision isolated, 356 unreleased');
