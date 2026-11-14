'use strict';
// Synthetic handler acceptance in an actual browser / the isolated APK WebView.
const fs=require('fs'),path=require('path'),assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8').replace(/\r/g,'');
function extract(name){const start=html.search(new RegExp('(?:async )?function '+name+'\\('));assert(start>=0);return html.slice(start,html.indexOf('\n}',start)+2);}
const functions=['tk603LiveSourceKey','logSet','toggleSetDone','getSessionExs','execCompleteExercise','persistTrainingDraft','restoreExecutionDraft'];
// Function scope: inside the real app WebView the fixture shadows, never redeclares, app globals.
function fixtureSource(srcs){return `(()=>{
// #603: owner-bound drafts; synthetic owner and production typed-FK flag, never a real account.
const tkEigenaarUid=()=>'synthetic-tk584-owner',TK504_TYPED_FK_SESSION_RELEASE=true;let tk603LiveSource=Object.create(null);
let sessionLog={},sessionExtra=[],resolvedWorkout=null,TRAIN_CFG={},curT='prog_synthetic',execFocus={prog_synthetic:0},execSkipped={},sessionProgramSnapshot={items:[]},execCompleteBusy=false;
let exercises=[],repPRCache={},exerciseGoals=new Map(),sessionPrBase={},BARBELL_EXERCISES=new Set(),lastSetDoneAt={},activeInstanceId='synthetic',saveState='',lastSaveTs=null;
const noop=()=>{};const normNumStr=v=>v==null?'':String(v).replace(',','.');const numNL=v=>Number(normNumStr(v));const td=()=> '2026-11-01';
const getEffectiveKg=(id,i)=>Number(normNumStr(document.getElementById('s-'+id+'-'+i+'-kg')?.value))||null;
const prFor=()=>Infinity,nearestRepBucket=()=>10,updateProgress=noop,updateSummary=noop,scheduleAutosave=noop,refreshActiveSetBanner=noop,unlockAudio=noop,showPostSetAdvice=noop,showSetCompletionFeedback=noop,autoRestAfterSet=noop,updateSaveIndicator=noop;
const currentWorkoutElapsedMs=()=>1000,execSkipSet=t=>execSkipped[t]||new Set(),applySessionRecovery=(t,x)=>x;
const resolveCardioType=()=>null,confirmModal=async()=>true,execFocusGo=(t,n)=>{execFocus[t]+=n;},showSessionSummary=noop;
${srcs.join('\n')}
const fixture=[['row',65,12],['lateral',6,15],['bench',57.5,12],['squat',63.5,12],['ohp',41,12]];
sessionExtra=fixture.concat([['untouched1'],['untouched2'],['untouched3']]).map(([id])=>({id,_t:curT,sets:3,type:'strength'}));
const host=document.createElement('main');host.id='tk584-fixture';host.style.cssText='background:white;color:black;position:fixed;inset:0;overflow:auto;z-index:2147483647;padding:12px';document.body.appendChild(host);
for(const [id,kg,reps] of fixture){const box=document.createElement('section');box.innerHTML='<h2>'+id+'</h2>';
 for(let i=1;i<=3;i++){
  box.insertAdjacentHTML('beforeend','<div id="sr-'+id+'-'+i+'"><input aria-label="kg" id="s-'+id+'-'+i+'-kg" value="'+String(kg).replace('.',',')+'"><input aria-label="reps" id="s-'+id+'-'+i+'-reps" value="'+reps+'"><input id="s-'+id+'-'+i+'-rpe" value=""><button id="sc-'+id+'-'+i+'">Set bevestigen</button></div>');
 }
 host.appendChild(box);
 for(let i=1;i<=3;i++)document.getElementById('sc-'+id+'-'+i).onclick=()=>toggleSetDone(id,i);
 const b=document.createElement('button');b.id='complete-'+id;b.textContent='Oefening afronden';b.onclick=()=>{execFocus[curT]=fixture.findIndex(x=>x[0]===id);return execCompleteExercise(curT);};box.appendChild(b);
}
window.tk584Probe={state:()=>JSON.parse(JSON.stringify({sessionLog,sessionExtra})),restore:()=>{const d=JSON.parse(localStorage.getItem('tk_draft_training'));sessionLog=d.sessionLog;sessionExtra=d.sessionExtra;restoreExecutionDraft(d);return d;}};
})();
`}
// In the APK WebView a real tap is tried first; if Playwright reports the fixture outside the
// Android viewport, the same handler is fired with a DOM click and that is recorded (not hidden).
async function tap(page,sel,actualApk,interaction){
 if(!actualApk){await page.locator(sel).click();interaction.tap++;return;}
 try{await page.locator(sel).click({timeout:5000});interaction.tap++;}
 catch(e){if(!/outside of the viewport|Timeout/i.test(String(e&&e.message)))throw e;await page.locator(sel).dispatchEvent('click');interaction.domClick++;}
}
async function run(page,actualApk=false){
 const interaction={tap:0,domClick:0};
 const srcs=actualApk?await page.evaluate(names=>names.map(n=>window[n].toString()),functions):functions.map(extract);
 if(actualApk)for(let i=0;i<functions.length;i++)assert.equal(srcs[i].replace(/\r/g,''),extract(functions[i]),'packaged function must match source: '+functions[i]);
 await page.evaluate(fixtureSource(srcs));
 await tap(page,'#sc-bench-1',actualApk,interaction);
 let state=await page.evaluate(()=>window.tk584Probe.state());assert.equal(state.sessionLog.bench.sets[0].kg,'57.5');
 for(const id of ['row','lateral','bench','squat','ohp'])await tap(page,'#complete-'+id,actualApk,interaction);
 await page.waitForFunction(()=>Object.keys(window.tk584Probe.state().sessionLog).length===5);
 state=await page.evaluate(()=>window.tk584Probe.state());
 const sets=Object.values(state.sessionLog).flatMap(l=>l.sets);assert.equal(sets.length,15);assert.equal(sets.reduce((v,s)=>v+Number(s.kg)*Number(s.reps),0),8442);
 const restored=await page.evaluate(()=>window.tk584Probe.restore());assert.deepEqual(restored.sessionLog,state.sessionLog);
 await tap(page,'#complete-ohp',actualApk,interaction);assert.equal(Object.values((await page.evaluate(()=>window.tk584Probe.state())).sessionLog).flatMap(l=>l.sets).length,15);
 return {test:'TK584 synthetic actual handlers',exercises:5,sets:15,volume:8442,draftRoundtrip:true,duplicateCompletion:false,actualApk,interaction};
}
module.exports={run};
if(require.main===module)(async()=>{const {chromium}=require('playwright');const browser=await chromium.launch({headless:true});try{const page=await browser.newPage({viewport:{width:390,height:844}});await page.route('https://tk584.invalid/**',r=>r.fulfill({body:'<!doctype html><html><body></body></html>',contentType:'text/html'}));await page.goto('https://tk584.invalid/');console.log(JSON.stringify(await run(page)));}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
