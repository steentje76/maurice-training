'use strict';
// TK #603: exact original Preview -> Execution bridge is source-qualified.
// A personal TK-shaped ID cannot trigger licensed Movekit video/poster.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const match=html.match(/^const EX_CATALOG = (\{.*\});?\s*$/m);
assert(match,'actual 226-item ECS');
const catalog=JSON.parse(match[1]).catalog;
assert.equal(catalog.length,226);
function extract(name){
 const m=new RegExp('function\\s+'+name+'\\s*\\(').exec(html);assert(m,name);
 let d=0;for(let i=html.indexOf('{',m.index);i<html.length;i++){
  if(html[i]==='{')d++;if(html[i]==='}'&&--d===0)return html.slice(m.index,i+1);
 }
 throw Error(name);
}
const id='TK-000038';
const personal={id,name:'Persoonlijke oefening 38',scope:'personal',type:'strength',muscle_primary:['triceps']};
let released=false,posters=[],videos=[];
const s=vm.createContext({
 get TK504_TYPED_FK_SESSION_RELEASE(){return released;},
 ExerciseCatalogService:{byId:code=>catalog.find(c=>c.catalog_id===code)||null},
 ExerciseAssetProvider:{
  poster:code=>{posters.push(code);return 'synthetic-media://poster';},
  hasVideo:code=>{videos.push(code);return true;},
  video:code=>{videos.push(code);return {file:'synthetic-file-only'};}
 },
 exercises:[personal],previewCtx:{overrides:{}},
 previewResolveItemWeight:()=>null,previewResolveItemDetrain:()=>null,
 resolveCardioType:()=>null,console
});
const fn=['tk504CatalogSourceRefFromCatalog','tk504CatalogSourceRefFromSelection',
 'tk504ValidateCatalogSourceRef','buildResolvedExecutionItems'];
vm.runInContext(fn.map(extract).join('\n'),s);
const ref=s.tk504CatalogSourceRefFromSelection(id);
assert(ref,'registered canonical source');
let n=0;const ok=(v,msg)=>{assert(v,msg);n++;};
const item=(extra={})=>({exercise_id:id,sets:4,reps:'8',rpe:'8',...extra});
const call=x=>Array.from(s.buildResolvedExecutionItems([x]))[0];
let result=call(item());
ok(result.naam!=='Persoonlijke oefening 38'&&result.canonicalId===id,
  'unreleased mode keeps original 226 catalog-first execution semantics');
ok(posters.length===1&&videos.length===2,'legacy media bridge unchanged while flag off');
released=true;posters=[];videos=[];
result=call(item());
ok(result.naam===personal.name&&result.canonicalId===undefined,
  'new typed mode without verified source selects personal exercise');
ok(posters.length===0&&videos.length===0,'personal TK-number never requests licensed catalog media');
result=call(item({tk504_catalog_ref:ref}));
ok(result.canonicalId===id&&result.tk504_catalog_ref.provider_id===ref.provider_id,
  'real owner-chosen canonical ref unlocks canonical execution bridge');
ok(posters.length===1&&videos.length===2,'canonical typed tile uses one existing asset provider');
posters=[];videos=[];
result=call(item({tk504_catalog_ref:{...ref,provider_id:'fake-slug'}}));
ok(result.naam===personal.name&&result.canonicalId===undefined,
  'forged catalog provider does not upgrade personal exercise');
ok(posters.length===0&&videos.length===0,
  'forged ref does not access licensed media');
s.exercises=[];
result=call(item());
ok(result.id===id&&result.naam===id&&result.canonicalId===undefined,
  'unknown old definition has raw fallback, not fabricated catalog access');
ok(posters.length===0&&videos.length===0,
  'missing personal row and missing provenance still deny protected asset');
console.log('TK603 existing execution bridge catalog/personal media isolation: '+n+' assertions PASS');
