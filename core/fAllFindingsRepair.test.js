'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const ROOT=path.join(__dirname,'..');const html=fs.readFileSync(process.env.TK_FINDINGS_HTML||path.join(ROOT,'index.html'),'utf8');
function fn(n){const i=html.search(new RegExp('(?:async )?function '+n+'\\('));assert(i>=0,'Missing '+n);for(let e=html.indexOf('}',i);e>=0;e=html.indexOf('}',e+1)){let v=html.slice(i,e+1);try{new Function('return ('+v+'\n)');return v;}catch{}}throw Error(n);}
function load(c,names){vm.createContext(c);for(const n of names)vm.runInContext(fn(n),c);return c;}
(async()=>{
 const original=[{exercise_id:'original',sets:3,reps:'10',rpe:'7'}];const c=load({previewCtx:{def:{exercises:original},order:['original'],swaps:{},removedIds:new Set()},resolveCardioType:()=>null,toast:()=>{},renderTrainingPreview:()=>{},openExPicker:async cb=>{c.pick=cb;}},['previewDefinitionItems','previewWorkingList','previewBuildModifications','previewAddExercise']);
 await c.previewAddExercise();c.pick({id:'extra'});assert.equal(c.previewWorkingList().length,2);assert.equal(original.length,1,'definition immutable');
 assert.equal(c.previewWorkingList()[1].exercise_id,'extra');assert.equal(c.previewBuildModifications().filter(x=>x.type==='add').length,1);
 await c.previewAddExercise();c.pick({id:'extra'});assert.equal(c.previewWorkingList().length,2,'no duplicate IDs');
 await c.previewAddExercise();const late=c.pick;c.previewCtx=null;late({id:'late'});assert.equal(original.length,1,'closed preview cannot be mutated by stale picker');
 const p=load({resolvePrescriptionRepTarget:()=>6,repsPrefillFromRange:()=>6,getOneRM:()=>90,estimatedOneRM:()=>null,resolveWorkingWeight:(id,opts)=>{p.resolved=opts;return {suggested:70,reason:'test-delegation'};}},['strengthExecutionPrefill']);
 let out=p.strengthExecutionPrefill({id:'x',sets:4,reps:'4-6',rpe:'7.5',suggestedWeight:80},{weight:85,reps:1,rpe:8.5,sets:1});
 assert.equal(out.rpe,'7.5','prescribed RPE wins over old actual');assert.equal(out.sets,4,'prescribed sets win over old actual');assert.equal(out.kg,80);
 out=p.strengthExecutionPrefill({id:'x',sets:4,reps:'4-6',rpe:'7.5'},{weight:85,reps:1});assert.equal(out.kg,70);assert.equal(p.resolved.reps,6,'weight delegated for target reps');
 p.resolveWorkingWeight=()=>({suggested:null});assert.equal(p.strengthExecutionPrefill({id:'x',reps:'4-6'},{weight:85,reps:1}).kg,null,'missing basis must not reuse previous 1-rep weight');
 const cc=load({},['buildPrescriptionContract']);const contract=cc.buildPrescriptionContract({sets:4,reps:'4-6',rpe:7.5,_rxRpeDelta:-0.5},{weight:85,reps:1,rpe:8},85);
 assert(!contract.coaching.includes('Iets lichter'));assert(contract.coaching.includes('niet lager'));
 const data=new Map();const e=load({tkEigenaarUid:()=> 'A',localStorage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)},refreshEquipmentPanel:()=>{}},['eqMemStorageKey','eqMemAll','eqMemVariant','eqMemVariantSet','eqMemEntryKey','eqMemGet','eqMemSet','eqMemFieldGet','eqMemFieldSet']);
 assert(e.eqMemSet('press','Pin 29'));assert.equal(e.eqMemGet('press'),'Pin 29');e.eqMemVariantSet('press','Machine 2');assert.equal(e.eqMemGet('press'),'');e.eqMemSet('press','Seat 4');e.eqMemFieldSet('press','pin','12');
 e.eqMemVariantSet('press','');assert.equal(e.eqMemGet('press'),'Pin 29');e.tkEigenaarUid=()=> 'B';assert.equal(e.eqMemGet('press'),'');e.tkEigenaarUid=()=> 'A';e.eqMemVariantSet('press','Machine 2');assert.equal(e.eqMemGet('press'),'Seat 4');assert.equal(e.eqMemFieldGet('press','pin'),'12');e.tkEigenaarUid=()=>null;assert.equal(e.eqMemSet('press','other'),false);
 assert(fn('buildEquipmentPanel').includes('oninput="eqMemSet('),'input saved without waiting for blur');
 for(const file of ['android-debug-apk.yml','tk577-user-test-apk.yml','tk584-verification.yml']){const s=fs.readFileSync(path.join(ROOT,'.github/workflows',file),'utf8');assert(/(?:  apk:|  build-debug-apk:)[\s\S]*?if: \$\{\{ false \}\}/.test(s),'APK hold missing '+file);}
 console.log('Earlier findings: preview insert/immutability, target RPE/sets/load delegation, truthful coaching, owner/apparatus persistence, stale callbacks and APK HOLD PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
