'use strict';
// #603: render the ORIGINAL picker under synthetic identity collisions.
// Selected recent source must never light up a different-origin tile.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function extract(name){
 const m=new RegExp('function\\s+'+name+'\\s*\\(').exec(html);assert(m,name);
 let d=0;for(let i=html.indexOf('{',m.index);i<html.length;i++){
  if(html[i]==='{')d++;if(html[i]==='}'&&--d===0)return html.slice(m.index,i+1);
 }
 throw Error(name);
}
const own={id:'TK-000038',scope:'personal',name:'Mijn eigen oefening',type:'strength'};
const canonical={id:'TK-000038',catalog_id:'TK-000038',_catalog:true,name:'Movekit canonical',type:'strength'};
let gate=true,byKey=['catalog:TK-000038'],legacyIds=['TK-000038'];
const DOM={};
const s=vm.createContext({
 get TK504_TYPED_FK_SESSION_RELEASE(){return gate;},
 get exPickerRecentSourceKeys(){return byKey;},
 get exPickerRecentIds(){return legacyIds;},
 exPickerFilterState:{sport:'all',type:'all',muscle:'all',equipment:'all'},
 exPickerQuickFilter:'recent',
 exPickerCallback:null,
 exPickerPool:()=>[own,canonical],
 pickerExEquipment:()=>null,
 isExerciseFavorite:()=>false,
 tkPickerDisplayName:x=>x.name,
 tkPickerSearchText:x=>x.name.toLowerCase(),
 resolveCardioType:()=>null,
 _pkIcon:()=>'<svg></svg>',
 TYPE_LABELS:{strength:'Kracht'},
 escHtml:String,
 window:{ExerciseAssetProvider:{poster:()=>null}},
 tk504PickerPosterObserver:null,tk504ObservePickerPosters:()=>{},
 tk504PrivateEnabled:()=>false,
 ExerciseCatalogService:{byId:()=>null},
 document:{getElementById:id=>{
  if(!DOM[id])DOM[id]={value:'',innerHTML:'',textContent:''};return DOM[id];
 }},
 console
});
vm.runInContext(extract('tk603PickerSourceKey')+'\n'+extract('renderExPickerList'),s);
let n=0;const ok=(v,label)=>{assert(v,label);n++;};
function htmlNow(){s.renderExPickerList();return DOM['ex-pick-list'].innerHTML;}
let view=htmlNow();
ok(view.includes('Movekit canonical')&&!view.includes('Mijn eigen oefening'),
 'typed catalog recent does not select same-id personal card');
ok((view.match(/pk-gcard/g)||[]).length===1,'catalog recent exactly one card');
byKey=['legacy:TK-000038'];view=htmlNow();
ok(view.includes('Mijn eigen oefening')&&!view.includes('Movekit canonical'),
 'legacy personal recent does not leak into same-id catalog');
byKey=['legacy:TK-000038','catalog:TK-000038'];view=htmlNow();
ok(view.includes('Mijn eigen oefening')&&view.includes('Movekit canonical'),
 'both verified origins can show separately');
ok((view.match(/pk-gcard/g)||[]).length===2,'both have independent cards');
byKey=[];view=htmlNow();
ok(!view.includes('Mijn eigen oefening')&&!view.includes('Movekit canonical'),
 'unknown typed source is not guessed from ID');
gate=false;view=htmlNow();
ok(view.includes('Mijn eigen oefening')&&view.includes('Movekit canonical'),
 'unreleased V1 compatibility retains the historical id-based recent picker');
console.log('TK603 real recent-picker source UI: '+n+' synthetic selection/identity assertions PASS');
