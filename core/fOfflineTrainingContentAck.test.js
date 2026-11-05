/* Onafhankelijke tegenproef TK #533 — verloren offline velden bij synchronisatie.
 * Een onbevestigde wijziging van notitie/kleur/metadata mag NIET als serverbevestigd gelden.
 * Draait het exacte syncCustomTrainingsFromSupabase()-bronfragment uit index.html via vm. */
'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const begin=html.indexOf('function tkTrainingOefendoelen(t){');
const end=html.indexOf('async function pushCustomTrainingExercises(t){',begin);
assert(begin>0&&end>begin,'echte synccode aanwezig');
const code=html.slice(begin,end);
const target={exercise_id:'ex-1',sets:3,reps:10,rpe:null,rest:null,pick:null};
let passed=0;
async function run(testName,localChanges,serverChanges,shouldMatch){
  const local=Object.assign({id:'tr-1',name:'Push day',color:'#112233',note:'A',metadata:{a:1,b:2},exercise_targets:[target],exercises:['ex-1']},localChanges||{});
  const remote=Object.assign({id:'tr-1',naam:'Push day',kleur:'#112233',notitie:'A',metadata:{b:2,a:1},source:'builder'},serverChanges||{});
  const marks=[];let rendered=0,migrated=0;
  const ctx={
    customTrainings:[local],
    tkTrainingenOnbevestigd:()=>['tr-1'],
    tkMarkeerTrainingOnbevestigd:(id,on)=>marks.push({id,on}),
    sbGet:async table=>table==='custom_trainings'?[remote]:[{custom_training_id:'tr-1',...target}],
    // TK-INT-01: deze test bewijst inhoudsbevestiging, met een betrouwbaar lege queue.
    // De aparte fOfflineDeleteFailClosed-test bewijst juist de negatieve queue-scenario's.
    tkLeesWachtrijStrikt:async()=>[],tkHuidigeUid:()=> 'athlete-1',
    localStorage:{setItem:()=>{}},
    renderCustomTrainBtns:()=>{rendered++;},renderCustomTrainList:()=>{},
    migrateLegacyWbSaved:async()=>{migrated++;},navigator:{onLine:false}
  };
  vm.createContext(ctx);vm.runInContext(code,ctx);
  await vm.runInContext('syncCustomTrainingsFromSupabase()',ctx);
  assert.strictEqual(rendered,1,testName+': sync moet compleet draaien');
  assert.strictEqual(migrated,1,testName+': sync mag niet stil falen');
  const changed=JSON.stringify(ctx.customTrainings[0]);
  if(!shouldMatch){
    assert.strictEqual(changed,JSON.stringify(local),testName+': onbevestigde data overschreven');
    assert.strictEqual(marks.some(x=>!x.on),false,testName+': pending onterecht verwijderd');
  } else {
    assert.strictEqual(marks.some(x=>!x.on),true,testName+': gelijke data niet bevestigd');
  }
  passed++;
}
(async()=>{
 await run('note-only',{note:'OFFLINE WIJZIGING'},{},false);
 await run('color-only',{color:'#778899'},{},false);
 await run('metadata-only',{metadata:{a:1,b:3}},{},false);
 await run('metadata-key-order',{}, {},true);
 // Legacy handmatige training: dezelfde oefeningen mogen niet als mismatch tellen omdat targets ontbreken.
 const legacy={};vm.createContext(legacy);vm.runInContext(code,legacy);
 const match=vm.runInContext("tkTrainingInhoud({name:'Push day',exercises:['ex-1']})===tkTrainingInhoud({name:'Push day',exercise_targets:[{exercise_id:'ex-1',sets:null,reps:null,rpe:null,rest:null,pick:null}]})",legacy);
 assert.strictEqual(match,true,'legacy exercise_ids moeten met server-targets overeenkomen');passed++;
 let captured=null;
 legacy.tkCustomTrainingPost=async()=>({ok:true});
 legacy.tkCustomTrainingPatch=async()=>({ok:true});
 legacy.pushCustomTrainingExercisesRich=async t=>{captured=t.exercise_targets;return {ok:true};};
 await vm.runInContext("tkCustomTrainingHerstel({id:'tr-1',name:'Push day',exercises:['ex-1']},false)",legacy);
 assert.strictEqual(captured&&captured[0]&&captured[0].exercise_id,'ex-1','legacy recovery moet oefening behouden');passed++;
 await vm.runInContext("tkCustomTrainingHerstel({id:'tr-1',name:'Push day',exercises:['oude'],exercise_targets:[]},true)",legacy);
 assert.strictEqual(captured&&captured.length,0,'expliciet lege Builder-targets mogen niet herleven');passed++;
 console.log('fOfflineTrainingContentAck: '+passed+' geslaagd, 0 mislukt');
 console.log('Resultaat: '+passed+' geslaagd, 0 mislukt');
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
