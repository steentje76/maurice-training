/* TK-INT-01 — onafhankelijk aangetoonde offline-delete fail-closed regressie.
 * Reproduceerde op bf8c1e5: bij IndexedDB-readfout werd een lokaal verwijderde
 * custom training opnieuw uit de (nog niet bijgewerkte) serverlijst geladen.
 */
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const start=html.indexOf('async function syncCustomTrainingsFromSupabase(){');
const end=html.indexOf('// UX-EXEC-01 (B1/B3)',start);
if(start<0||end<start)throw Error('syncCustomTrainingsFromSupabase not found');
const implementation=html.slice(start,end);
let count=0;
function eq(actual,expected,label){
  const a=JSON.stringify(actual),b=JSON.stringify(expected);
  if(a!==b)throw Error(label+': got '+a+', expected '+b);
  count++;console.log('PASS '+label);
}
async function scenario(queue,local=[]){
  let writes=0,renders=0,migrations=0;
  const ctx={
    customTrainings:local.map(x=>({...x})),
    navigator:{onLine:true},
    sbGet:async t=>t==='custom_trainings'
      ?[{id:'pending-delete',naam:'Still on server',kleur:'#111'}]:[],
    tkLeesWachtrijStrikt:async()=>{
      if(queue instanceof Error)throw queue;
      return queue;
    },
    tkHuidigeUid:()=> 'athlete-1',
    tkTrainingenOnbevestigd:()=>[],
    tkMarkeerTrainingOnbevestigd:()=>{},
    renderCustomTrainBtns:()=>{renders++;},
    renderCustomTrainList:()=>{renders++;},
    localStorage:{setItem:()=>{writes++;}},
    migrateLegacyWbSaved:async()=>{migrations++;},
    console
  };
  vm.createContext(ctx);
  vm.runInContext(implementation,ctx);
  await ctx.syncCustomTrainingsFromSupabase();
  return {ids:ctx.customTrainings.map(t=>t.id),writes,renders,migrations};
}
(async()=>{
  let r=await scenario(new Error('IndexedDB read refused'));
  eq(r.ids,[],'Onleesbare wachtrij: verwijderde training keert niet terug');
  eq([r.writes,r.renders,r.migrations],[0,0,0],'Onleesbare wachtrij: geen synchronisatiebijwerkingen');
  r=await scenario({length:0});
  eq(r.ids,[],'Ongeldig wachtrijtype sluit sync af');
  r=await scenario([{table:'custom_trainings',method:'DELETE',filter:'id=eq.pending-delete',owner_uid:'athlete-1'}]);
  eq(r.ids,[],'Wachtende DELETE wordt genegeerd uit serverresultaten');
  r=await scenario([]);
  eq(r.ids,['pending-delete'],'Geldige lege wachtrij laat bestaande servertrainingen toe');
  r=await scenario(new Error('db-abort'),[{id:'local-only',name:'Local',exercises:[]}]);
  eq(r.ids,['local-only'],'Wachtrijfout bewaart al aanwezige lokale training');
  console.log('TK-INT-01: '+count+' negatieve en positieve checks geslaagd');
})().catch(e=>{console.error(e);process.exitCode=1});
