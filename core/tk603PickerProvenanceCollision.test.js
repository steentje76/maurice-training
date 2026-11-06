'use strict';
// #603 RED->GREEN: real original picker functions, synthetic data only.
// Distinct user-owned rows and signed catalog identity must never be fused by ID/name.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const match=html.match(/^const EX_CATALOG = (\{.*\});?\s*$/m);
assert(match,'canonical original EX_CATALOG must exist');
const published=JSON.parse(match[1]).catalog;
assert.equal(published.length,226);
function extract(name){
  const m=new RegExp('function\\s+'+name+'\\s*\\(').exec(html);
  assert(m,'missing actual app function '+name);
  let depth=0;
  for(let i=html.indexOf('{',m.index);i<html.length;i++){
    if(html[i]==='{')depth++;
    if(html[i]==='}'&&--depth===0)return html.slice(m.index,i+1);
  }
  throw Error('unbalanced '+name);
}
const functions=['catalogToPickerEx','invalidateExPickerPool','exPickerPool','resolvePickerEx','selectExPickerItem'];
const context=vm.createContext({
  exercises:[],
  ExerciseCatalogService:{
    all:()=>published,count:()=>published.length,
    byId:id=>published.find(x=>x.catalog_id===id)||null
  },
  exPickerCallback:null,
  closeModal:()=>{},
  console
});
vm.runInContext('let _exPickerPoolCache=null,_exPickerPoolKey=\'\';\n'+functions.map(extract).join('\n'),context,{timeout:5000});
function selected(id,source){
  let result=null;
  context.exPickerCallback=x=>{result=x;};
  context.selectExPickerItem(id,source);
  assert(result,'picker callback must fire for '+id+' ('+source+')');
  return result;
}
assert.equal(context.exPickerPool().length,226,'baseline unchanged');
const c=published[37],id=c.catalog_id;
const personal={id,name:c.identity.name,scope:'personal',type:'strength',muscle_primary:['custom']};
const preserved=JSON.stringify(personal);
context.exercises.push(personal);context.invalidateExPickerPool();
const entries=Array.from(context.exPickerPool()).filter(x=>x.id===id);
assert.equal(entries.length,2,'collision must expose both catalog and personal provenance');
assert.equal(entries.filter(x=>x._catalog===true).length,1,'exactly one catalog entry');
assert.equal(entries.filter(x=>x.scope==='personal').length,1,'exactly one personal entry');
assert.equal(context.resolvePickerEx(id,'catalog')._catalog,true,'typed catalog lookup survives shadow');
assert.equal(context.resolvePickerEx(id,'legacy'),personal,'typed personal lookup remains unchanged');
assert.equal(context.resolvePickerEx(id),personal,'legacy direct ID cannot silently upgrade to catalog');
assert.equal(selected(id,'catalog').catalog_id,id,'explicit catalog tile preserves identity');
assert.equal(selected(id,'legacy'),personal,'explicit personal tile remains personal');
assert.equal(JSON.stringify(personal),preserved,'no personal row mutation');
context.exercises[0]={...personal,name:'My own exercise'};context.invalidateExPickerPool();
assert.equal(context.resolvePickerEx(id,'legacy').name,'My own exercise');
assert.equal(context.resolvePickerEx(id,'catalog').catalog_id,id,'name mismatch must not block canonical catalog');
const allShadows=published.map(x=>({id:x.catalog_id,name:x.identity.name,scope:'personal',type:'strength'}));
context.exercises=allShadows;context.invalidateExPickerPool();
const all=Array.from(context.exPickerPool());
assert.equal(all.length,452,'all 226 original catalog entries remain separately addressable alongside personal collisions');
assert.equal(all.filter(x=>x._catalog).length,226,'full original canonical count preserved');
assert.equal(all.filter(x=>x.scope==='personal').length,226,'all personal rows preserved');
assert.equal(new Set(all.filter(x=>x._catalog).map(x=>x.catalog_id)).size,226,'catalog ids distinct');
assert.equal(context.resolvePickerEx('NOT-CATALOG','catalog'),null,'unknown catalog denied');
assert.match(html,/selectExPickerItem\('\$\{e\.id\}',\s*'\$\{e\._catalog/,'rendered tile must carry explicit source');
// The source helper also rejects a forged _catalog/catalog_id on a database-shaped row.
vm.runInContext(['tk504CatalogSourceRefFromCatalog','tk504CatalogSourceRefFromSelection',
  'tk603CatalogRefFromPickerSelection'].map(extract).join('\n'),context,{timeout:5000});
const canonical=context.resolvePickerEx(id,'catalog');
assert.equal(context.tk603CatalogRefFromPickerSelection(canonical).catalog_id,id,
  'actual ECS picker object is accepted');
assert.equal(context.tk603CatalogRefFromPickerSelection(personal),null,
  'personal row cannot claim a canonical source');
const spoof={...personal,_catalog:true,catalog_id:id};
assert.equal(context.tk603CatalogRefFromPickerSelection(spoof),null,
  'fake catalog metadata on a scope:personal row is never accepted');
context.exercises=[spoof];context.invalidateExPickerPool();
assert.equal(Array.from(context.exPickerPool()).filter(e=>e.id===id).length,2,
  'spoofed legacy row does not suppress ECS catalog tile');
assert.equal(context.resolvePickerEx(id,'catalog').catalog_id,id,
  'canonical source survives legacy spoof');
console.log('TK603 picker-source collision: 226 real catalog + 226 synthetic personal overlays, explicit selection, lossless legacy and spoof-deny PASS');