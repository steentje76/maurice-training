/* TrainingKompas #533: first-workout recovery on empty server and note preservation.
 * Exercises actual production sync+recovery+rich-write source via VM; no network/DB writes. */
'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function take(start,end){
  const i=html.indexOf(start), j=html.indexOf(end,i+start.length);
  assert(i>=0&&j>i,'source anchors: '+start+' '+end);
  return html.slice(i,j);
}
const code=take("const TK_TRAININGEN_ONBEVESTIGD=","async function pushCustomTrainingExercises(t){")
  +"\n"+take("async function pushCustomTrainingExercisesRich(t,opts){","// migrateLegacyWbSaved");
let pass=0;
const tr=()=>({id:'new-01',name:'First workout',color:'#223344',note:'Offline note must survive',
  metadata:{version:3},source:'builder',exercises:['ex-A'],
  exercise_targets:[{exercise_id:'ex-A',sets:4,reps:8,rpe:8,rest:90,pick:null}]});
async function scenario(name,{online=true,queued=false,parentStatus='confirmed'}={}){
 const store=new Map([['tk_trainings_onbevestigd',JSON.stringify(['new-01'])]]);
 const writes=[],server={parents:[],children:[]};
 let migrated=0;
 const ctx={
  customTrainings:[tr()],
  localStorage:{
   getItem:k=>store.has(k)?store.get(k):null,
   setItem:(k,v)=>store.set(k,String(v)),
   removeItem:k=>store.delete(k)
  },
  navigator:{onLine:online},
  tkHuidigeUid:()=> 'u-test',
  updateOfflineBadge:()=>{},
  renderCustomTrainBtns:()=>{},renderCustomTrainList:()=>{},
  tkLeesWachtrijStrikt:async()=>queued?[{table:'custom_trainings',body:{id:'new-01'},owner_uid:'u-test'}]:[],
  migrateLegacyWbSaved:async()=>{migrated++;},
  sbGet:async table=>table==='custom_trainings'?[]:[],
  sbPost:async(table,row)=>{writes.push({api:'sbPost',table,row});return true;},
  sbDel:async(table,arg)=>{writes.push({api:'sbDel',table,arg});return true;},
  sbPostQ:async(table,row)=>{
   writes.push({api:'sbPostQ',table,row});
   if(table==='custom_trainings'){
    if(parentStatus==='confirmed'){server.parents.push(row);return {ok:true,status:'confirmed',http:201};}
    if(parentStatus==='queued')return {ok:true,status:'queued',reden:'offline'};
    return {ok:false,status:'rejected',reden:'validatie'};
   }
   server.children.push(row);return {ok:true,status:'confirmed',http:201};
  },
  sbDelQ:async(table,filter)=>{writes.push({api:'sbDelQ',table,filter});return {ok:true,status:'confirmed'};},
  sbPatchQ:async()=>{throw Error('unexpected PATCH')},
  newClientRowId:()=> 'generated-child-id',
  tkSchrijfUitkomst:(status,http,reden)=>({ok:status==='confirmed'||status==='queued',status,http,reden}),
  toast:()=>{}
 };
 vm.createContext(ctx); vm.runInContext(code,ctx);
 await vm.runInContext('syncCustomTrainingsFromSupabase()',ctx);
 assert.strictEqual(migrated,1,name+': sync stopped prematurely');
 assert.strictEqual(ctx.customTrainings.length,1,name+': first workout lost');
 assert.strictEqual(ctx.customTrainings[0].note,'Offline note must survive',name+': local note lost');
 const pending=JSON.parse(store.get('tk_trainings_onbevestigd')||'[]').includes('new-01');
 if(online&&!queued&&parentStatus==='confirmed'){
  assert.strictEqual(writes.some(w=>w.api==='sbPost'),false,name+': legacy direct writes bypass queue');
  assert.strictEqual(server.parents.length,1,name+': parent missing');
  assert.strictEqual(server.parents[0].notitie,'Offline note must survive',name+': note was dropped in server POST');
  assert.strictEqual(server.children.length,1,name+': exercise missing');
  assert.strictEqual(server.children[0].exercise_id,'ex-A',name+': wrong exercise');
  assert.strictEqual(pending,false,name+': confirmed composite training remained pending');
 } else if(parentStatus==='rejected'&&online&&!queued){
  assert.strictEqual(writes.length,1,name+': rejected parent should be attempted once');
  assert.strictEqual(writes[0].table,'custom_trainings',name+': rejected parent unexpectedly started children');
  assert.strictEqual(server.children.length,0,name+': child written after rejected parent');
  assert.strictEqual(pending,true,name+': rejected composite must remain pending');
 } else {
  assert.strictEqual(writes.length,0,name+': unexpected network mutation for offline/queued');
  assert.strictEqual(pending,true,name+': pending dropped before confirmation');
 }
 pass++;
}
(async()=>{
 await scenario('empty-online-first-builder');
 await scenario('empty-offline-first-builder',{online:false});
 await scenario('empty-parent-already-queued',{queued:true});
 await scenario('empty-post-parent-rejected',{parentStatus:'rejected'});
 console.log('fOfflineEmptyServerRecovery: '+pass+' geslaagd, 0 mislukt');
 console.log('Resultaat: '+pass+' geslaagd, 0 mislukt');
})().catch(e=>{console.error('fOfflineEmptyServerRecovery FAIL: '+e.stack);process.exitCode=1;});
