'use strict';
/* Run only against a CI emulator. Installs the isolated package; never uninstalls any app. */
const fs=require('fs'),path=require('path'),assert=require('assert'),{execFileSync}=require('child_process');
const {chromium}=require('playwright');
const adb=(...args)=>execFileSync('adb',args,{encoding:'utf8',timeout:120000}).trim();
const pause=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  assert.equal(process.env.TK_EMULATOR_ONLY,'1','emulator execution must be explicit');
  assert(/^emulator-/.test(adb('get-serialno')),'refuse a physical device');
  adb('shell','settings','put','secure','show_ime_with_hard_keyboard','1');
  fs.mkdirSync('android-test-evidence',{recursive:true});
  const apk=fs.readdirSync('candidate').find(x=>x.endsWith('.apk'));assert(apk);
  const pkg='com.trainingskompas.app.gebruikerstest20261025';
  adb('install','-r',path.resolve('candidate',apk));
  const launch=adb('shell','am','start','-W','-n',pkg+'/com.trainingskompas.app.MainActivity');
  assert(/Status: ok/.test(launch),launch);
  fs.writeFileSync('android-test-evidence/launch.txt',launch);
  let pid;
  for(let i=0;i<30;i++){pid=adb('shell','pidof',pkg);if(pid)break;await pause(1000);}
  assert(pid);
  adb('forward','tcp:9222','localabstract:webview_devtools_remote_'+pid);
  let browser;
  for(let i=0;i<30;i++){
    try{browser=await chromium.connectOverCDP('http://127.0.0.1:9222');break;}catch(_){await pause(1000);}
  }
  assert(browser,'WebView debugging endpoint unavailable');
  try{
    const page=browser.contexts()[0].pages()[0];assert(page);
    await page.waitForFunction(()=>typeof buildWarmupRow==='function');
    await page.evaluate(()=>{
      sbGet=async()=>[];v43SafeGet=async()=>[];sbPost=async()=>true;sbUpsert=async()=>true;
      atleet={naam:'Synthetic emulator'};curT='B';sessionLog={};
      exercises=[{id:'synthetic',name:'Synthetic',type:'strength',active:true,muscle_primary:['Hamstrings']}];
      buildVasteTrainingScreen({id:'B',naam:'Synthetic TK577'});
      document.querySelectorAll('.scr.active,.pin-screen.active').forEach(x=>x.classList.remove('active'));
      document.getElementById('s-train-b').classList.add('active');
      document.getElementById('train-b-list').innerHTML='<div id="wu-rows-synthetic">'+buildWarmupRow('synthetic',3)+'</div>';
      updateSummary=()=>{};updateProgress=()=>{};trainStart=Date.now();
    });
    const input=page.locator('#w-synthetic-3-kg');
    for(const [text,expected] of [['67,5','67.5'],['0,5','0.5'],['77,5','77.5'],['67.5','67.5']]){
      await input.fill('');await input.pressSequentially(text,{delay:30});await input.blur();
      assert.equal(await input.inputValue(),expected);
      assert.equal(await page.evaluate(()=>sessionLog.synthetic.wu[2].kg),expected);
    }
    await page.evaluate(()=>{persistTrainingDraft(true);});
    assert.equal(await page.evaluate(()=>restoreTrainingDraft().sessionLog.synthetic.wu[2].kg),'67.5');
    await page.screenshot({path:'android-test-evidence/decimal-warmup.png'});
    adb('shell','input','keyevent','4');
    await page.evaluate(()=>{
      document.querySelectorAll('.scr.active').forEach(x=>x.classList.remove('active'));
      document.getElementById('s-settings').classList.add('active');
    });
    const header=await page.locator('#s-settings .hdr-title').boundingBox();assert(header&&header.y>=50,JSON.stringify(header));
    await page.screenshot({path:'android-test-evidence/settings-safe-area.png'});
    const fullHeight=await page.evaluate(()=>visualViewport.height);
    await page.evaluate(async()=>{
      ensureExercisesLoaded=async()=>{};ensureFavoritesLoaded=async()=>{};getRecentExerciseIds=async()=>[];
      await openExPicker(()=>{});
    });
    const search=page.locator('#ex-pick-search');await search.click();await search.fill('Synthetic');await search.dispatchEvent('input');
    await pause(1000);
    const visible=await page.locator('#ex-pick-list .pk-gcard').first().evaluate(el=>{
      const r=el.getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:visualViewport.height,offset:visualViewport.offsetTop};
    });
    assert(visible.height<fullHeight-80,'soft keyboard did not reduce the real visual viewport: '+JSON.stringify({fullHeight,...visible}));
    assert(visible.top>=visible.offset&&visible.bottom<=visible.offset+visible.height,JSON.stringify(visible));
    await page.screenshot({path:'android-test-evidence/picker-keyboard.png'});
    await page.locator('#ex-pick-list .pk-gcard').first().click();
    assert.equal(await page.locator('#m-ex-picker').evaluate(x=>x.classList.contains('open')),false);
    fs.writeFileSync('android-test-evidence/result.json',JSON.stringify({status:'PASS',package:pkg,api:adb('shell','getprop','ro.build.version.sdk'),checks:['launch','decimal-keystrokes','draft-readback','settings-header','real-ime-picker-selection'],physicalSamsung:false,pm5:false},null,2));
    console.log('TK577 ANDROID WEBVIEW PASS');
  }finally{await browser.close();}
})().catch(e=>{fs.mkdirSync('android-test-evidence',{recursive:true});fs.writeFileSync('android-test-evidence/failure.txt',String(e.stack));console.error(e);process.exitCode=1;});
