/* TK-UT-20261024-008 / -007: execute the actual app functions with synthetic inputs. */
'use strict';
const fs=require('fs'), path=require('path'), vm=require('vm'), assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
function fn(name){
  const st=html.indexOf('function '+name+'('); assert(st>=0,name+' exists');
  let n=0; for(let i=html.indexOf('{',st);i<html.length;i++){
    if(html[i]==='{')n++; else if(html[i]==='}'&&!--n)return html.slice(st,i+1);
  } throw Error(name+' unclosed');
}
let pass=0,fail=0;
function test(name,run){try{run();pass++;}catch(e){fail++;console.log('FAIL '+name+': '+e.message);}}
const fields={};
function field(value=''){return {value,attrs:{},setAttribute(k,v){this.attrs[k]=v;},setCustomValidity(v){this.error=v;},classList:{toggle(){}}};}
const ctx=vm.createContext({console, warmupState:{}, sessionLog:{}, exercises:[],
  document:{getElementById:id=>fields[id]||null},
  logSet(){},
  ExerciseCatalogService:{byId:id=>id==='TK-GM'?{identity:{primary:['Hamstrings','Billen'],secondary:['Rug']}}:null}
});
for(const name of ['escHtml','numNL','normNumStr','clampNumInput','buildWarmupRow','onWarmupEdit','getExerciseMuscles'])vm.runInContext(fn(name),ctx);
// New validation is optional here so the old implementation actually reaches the regression.
if(html.includes('function validateSetWeightInput('))vm.runInContext(fn('validateSetWeightInput'),ctx);
const row=ctx.buildWarmupRow('test',3);
const handler=row.match(/id="w-test-3-kg"[^>]*oninput="([^"]+)"/)[1];
for(const text of ['0,5','67,5','77,5','67.5'])test('008 keystrokes '+text,()=>{
  const el=fields['w-test-3-kg']=field();fields['w-test-3-reps']=field('2');
  for(const ch of text){el.value+=ch; vm.runInContext('(function(){'+handler+'}).call(el)',Object.assign(ctx,{el}));}
  assert.equal(ctx.numNL(el.value),Number(text.replace(',','.')));
  assert.equal(ctx.numNL(ctx.warmupState.test.values[3].kg),Number(text.replace(',','.')));
});
test('008 preserve comma before next digit / backspace',()=>{
  const el=fields['w-test-3-kg']=field('67,');ctx.el=el;vm.runInContext('(function(){'+handler+'}).call(el)',ctx);
  assert.equal(el.value,'67,');el.value='67';vm.runInContext('(function(){'+handler+'}).call(el)',ctx);assert.equal(el.value,'67');
});
test('008 invalid input never becomes a plausible number',()=>{
  const el=field('67x5');ctx.clampNumInput(el,0,500);assert.equal(el.value,'67x5');assert.equal(el.attrs['aria-invalid'],'true');
  assert.equal(ctx.normNumStr(el.value),'');
});
test('007 canonical-only exercise keeps declared muscle mapping',()=>{
  assert.deepEqual(Array.from(ctx.getExerciseMuscles('TK-GM')),['Hamstrings','Billen','Rug']);
});
test('007 legacy explicit mapping takes precedence and unknown stays unknown',()=>{
  ctx.exercises=[{id:'TK-GM',muscle_primary:['Core'],muscle_secondary:[]}];
  assert.deepEqual(Array.from(ctx.getExerciseMuscles('TK-GM')),['Core']);
  assert.deepEqual(Array.from(ctx.getExerciseMuscles('unknown')),[]);
});
// Saved row -> serialized readback -> existing Calculation Engine -> both recovery consumers.
(async()=>{
  try{
    ctx.exercises=[];
    ctx.CalcCore=require('./calculation.js');
    const now=new Date('2026-10-24T10:00:00Z');
    ctx.Date=class extends Date{constructor(...args){super(...(args.length?args:[now.getTime()]));}static now(){return now.getTime();}};
    ctx.MUSCLE_RECOVERY_HOURS={Hamstrings:72,Billen:72,Rug:72};ctx.SVG_ID_RECOVERY_HOURS={Hamstrings:72,Billen:72,Rug:72};
    ctx.muscleNamesToSvgIds=names=>names;
    for(const name of ['buildStrengthSessionRow','computeMuscleRecoveryPct','getRelevantMuscleRecovery','v43OverallRecovery']){
      let source=fn(name);if(name==='getRelevantMuscleRecovery'||name==='v43OverallRecovery')source='async '+source;
      vm.runInContext(source,ctx);
    }
    const saved=ctx.buildStrengthSessionRow('TK-GM',Array.from({length:4},()=>({kg:'60',effKg:60,reps:'8',rpe:'8'})),{date:'2026-10-24'}).row;
    ctx.sbGet=ctx.v43SafeGet=async()=>JSON.parse(JSON.stringify([saved]));
    const insight=await ctx.getRelevantMuscleRecovery(['Hamstrings','Billen','Rug']);
    const home=await ctx.v43OverallRecovery();
    assert.equal(saved.weight,60);assert.equal(saved.sets_detail.length,4);
    for(const row of insight){assert.equal(row.pct,ctx.CalcCore.calculateMuscleRecoveryPct(10,72,8));assert.equal(row.pct,home.rows.find(x=>x.muscle===row.muscle).pct);}
    assert.equal(home.hasData,true);pass++;
  }catch(e){fail++;console.log('FAIL 007 storage-to-calculation-to-Home/Insight: '+e.stack);}
  console.log('Resultaat: '+pass+' geslaagd, '+fail+' mislukt');process.exitCode=fail?1:0;
})();
