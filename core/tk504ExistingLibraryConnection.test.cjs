'use strict';
/* TK504: the original 226-item app library/picker uses ONE canonical ID;
 * Dutch only changes visible labels. No supplier content or credentials. */
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const match=html.match(/^const EX_CATALOG = (\{.*\});?\s*$/m);
assert(match,'missing canonical embedded library');
const catalog=JSON.parse(match[1]);
assert.equal(catalog.count,226);
const byId=new Map(catalog.catalog.map(x=>[x.catalog_id,x]));
assert.equal(byId.size,226);
const start=html.indexOf('function tkCatalogDisplayName(c){');
const stop=html.indexOf('const EQUIP_LABELS=',start);
assert(start>0&&stop>start,'UI helpers must live in original picker');
const context=vm.createContext({
 ExerciseCatalogService:{byId:id=>byId.get(id)||null}
});
vm.runInContext(html.slice(start,stop),context);
const original=byId.get('TK-000038');
assert(original&&original.source.provider_id==='barbell-squat');
assert.equal(original.identity.nl,null);
const english=context.catalogToPickerEx(original);
assert.equal(english.id,'TK-000038');
assert.equal(english.name,original.identity.name);
assert.equal(english._catalog,true);
assert.equal(context.tkPickerSearchText(english).includes('barbell squat'),true);
assert.equal(context.tkPickerSearchText(english).includes('barbell-squat'),true);
const keep=original.identity.name;
original.identity.nl='Squat met halterstang';
const dutch=context.catalogToPickerEx(original);
assert.equal(dutch.name,'Squat met halterstang');
assert.equal(context.tkPickerDisplayName(dutch),'Squat met halterstang');
assert.equal(context.tkPickerSearchText(dutch).includes('squat met halterstang'),true);
assert.equal(context.tkPickerSearchText(dutch).includes('barbell squat'),true);
assert.equal(original.identity.name,keep);
assert.equal(dutch.id,english.id);
assert.equal(dutch.catalog_id,english.catalog_id);
const personal={id:original.catalog_id,name:'Eigen squat',
 scope:'personal',muscle_primary:['Benen'],catalog_id:original.catalog_id};
assert.equal(context.tkPickerDisplayName(personal),'Eigen squat');
assert.equal(context.tkPickerSearchText(personal).includes('squat met halterstang'),false);
assert.equal(context.tkCatalogDisplayName(byId.get('TK-000019')),
  byId.get('TK-000019').identity.name);
assert.equal(byId.get('TK-000227'),undefined);
assert.equal(html.includes('function exPickerPool(){'),true);
assert.equal(html.includes('function resolvePickerEx(id,source='),true);
assert.equal(html.includes('function ensureExerciseRowStatus(exId){'),true);
assert.equal(html.includes('function renderExPickerList(){'),true);
assert.equal(html.includes('tkPickerSearchText(e).includes(q)'),true);
assert.equal(html.includes('tkPickerDisplayName(a).localeCompare('),true);
assert.equal(html.includes('lib-d-name' ),true);
assert.equal(html.includes('escHtml(tkCatalogDisplayName(c))'),true);
assert.equal(html.includes('I.cues.map('),true);
assert.equal(html.includes('I.mistakes.map('),true);
assert.equal(html.includes('ExerciseAssetProvider.poster(id)'),true);
const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
let compiled=0;
for(const result of scripts){
 if(/type\s*=\s*["'](?:application\/json|importmap)["']/i.test(result[1]))continue;
 const code=result[2].trim();
 if(!code)continue;
 new Function(code);
 compiled++;
}
assert(compiled>0);
console.log('PASS original 226 IDs, English/Dutch search, personal isolation, unchanged history/asset route, and '+compiled+' embedded JS script syntax checks');
