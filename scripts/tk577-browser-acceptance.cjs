/* Real Chromium, synthetic data only; no live account, PM5 or backend acceptance. */
'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert'),{pathToFileURL}=require('url');
const pw=require(process.env.TK_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
let pass=0,fail=0;
async function check(name,run){try{await run();pass++;console.log('PASS '+name);}catch(e){fail++;console.log('FAIL '+name+': '+e.stack);}}
(async()=>{
  const browser=await pw.chromium.launch({headless:true,...(process.env.TK_CHROME_PATH?{executablePath:process.env.TK_CHROME_PATH}:{})});
  try{
    for(const width of [320,360,390,430]){
      const page=await browser.newPage({viewport:{width,height:844}});
      // This test cannot contact a real account or emit telemetry.
      await page.route(/^https?:/,route=>route.fulfill({status:200,contentType:'application/json',body:'[]'}));
      await page.goto(pathToFileURL(path.join(root,'index.html')).href);
      await page.waitForTimeout(300);
      await page.evaluate(()=>{
        sbGet=async()=>[];v43SafeGet=async()=>[];sbUpsert=async()=>true;sbPost=async()=>true;sbPatch=async()=>true;
        atleet={naam:'Synthetic TK577'};
        exercises=[{id:'gm',name:'Good Morning',type:'strength',active:true,muscle_primary:['Hamstrings','Billen'],muscle_secondary:['Rug']},
          {id:'hex',name:'Hexabar Deadlift',type:'strength',active:true,muscle_primary:['Hamstrings'],muscle_secondary:['Rug']},
          {id:'roeien',name:'Roeien',type:'rowing',active:true,muscle_primary:[],muscle_secondary:[]}];
        ensureExercisesLoaded=async()=>{};ensureFavoritesLoaded=async()=>{};getRecentExerciseIds=async()=>[];
        loadPrevPerformance=async(id)=>id==='gm'?{weight:60,reps:8,rpe:8,date:'2026-10-23'}:null;
        sessionLog={};sessionExtra=[];curT='B';
      });
      await check(width+' -008 sequential decimal typing + autosave + rerender',async()=>{
        await page.evaluate(()=>{
          document.querySelectorAll('.scr.active').forEach(x=>x.classList.remove('active'));
          buildVasteTrainingScreen({id:'B',naam:'Synthetic TK577'});
          document.getElementById('s-train-b').classList.add('active');
          document.getElementById('train-b-list').innerHTML='<div id="wu-rows-hex">'+buildWarmupRow('hex',3)+'</div>';
          updateSummary=()=>{};updateProgress=()=>{};
          trainStart=Date.now();
        });
        const input=page.locator('#w-hex-3-kg');
        for(const [text,expected] of [['67,5','67.5'],['0,5','0.5'],['77,5','77.5'],['67.5','67.5']]){
          await input.fill('');await input.pressSequentially(text,{delay:20});await input.blur();
          assert.equal(await input.inputValue(),expected);
          assert.equal(await page.evaluate(()=>sessionLog.hex.wu[2].kg),expected);
          const stored=await page.evaluate(()=>{persistTrainingDraft(true);return JSON.parse(localStorage.getItem('tk_draft_training')).sessionLog.hex.wu[2].kg;});
          assert.equal(stored,expected);
        }
        await page.evaluate(()=>{document.getElementById('wu-rows-hex').innerHTML=buildWarmupRow('hex',3);});
        assert.equal(await input.inputValue(),'67.5');
      });
      await check(width+' -001 settings header clears status area with scaled text',async()=>{
        await page.evaluate(()=>{
          document.querySelectorAll('.scr.active').forEach(x=>x.classList.remove('active'));
          document.getElementById('s-settings').classList.add('active');
        });
        const top=await page.locator('#s-settings .hdr-title').evaluate(x=>x.getBoundingClientRect().top);
        assert(top>=50,'title must start below status area, got '+top);
      });
      await check(width+' -009 latest empty row does not hide relevant previous performance',async()=>{
        await page.evaluate(async()=>{
          ensureEquipmentTypesLoaded=async()=>{};loadTrainCfg=async()=>{};loadEquipment=async()=>[];
          getSessionExs=()=>[{id:'gm',naam:'Good Morning',type:'strength',sets:4,reps:'8',wu:0}];
          v43SafeGet=async(table)=>table==='sessions'?[{exercise_id:'gm',date:'2026-10-24',weight:null,reps:null}]:[];
          await renderTrainScreen('B');
        });
        assert.equal(await page.locator('#s-gm-1-kg').inputValue(),'60');
        assert.equal(await page.evaluate(()=>!!sessionLog.gm?.sets?.some(s=>s&&s.done)),false,'a suggestion is never a completed set');
      });
      for(const scale of [1,1.3])await check(width+' -003 preview readable / actions reachable, text scale '+scale,async()=>{
        await page.evaluate(scale=>{
          previewCtx={def:{name:'Training B',exercises:[{exercise_id:'roeien',sets:1,reps:'1000m'},{exercise_id:'hex',sets:4,reps:'6-8',wu:3}]},
            source:'vast',id:'B',order:['roeien','hex'],swaps:{},overrides:{},removedIds:new Set(),prevMap:{hex:{weight:77.5,reps:8}},view:'plan',adjustOpen:true};
          previewWeightInfo=it=>({suggested:it.exercise_id==='hex'?77.5:null,prev:previewCtx.prevMap[it.exercise_id]});
          openModal('m-training-preview');
          document.querySelectorAll('.tpv2-exb *').forEach(x=>{const n=parseFloat(getComputedStyle(x).fontSize);x.style.fontSize=(n*scale)+'px';});
        },scale);
        const cards=await page.locator('.tpv2-excard').evaluateAll(cards=>cards.map(c=>{
          const b=c.getBoundingClientRect(),text=c.querySelector('.tpv2-exb').getBoundingClientRect();
          const actions=c.querySelector('.tpv2-exactions');
          return {width:text.width,overflow:c.scrollWidth>c.clientWidth+1,actions:!!actions&&actions.getBoundingClientRect().top>=text.bottom-1,right:b.right};
        }));
        for(const c of cards){assert(c.width>=150,'content too narrow '+JSON.stringify(c));assert(!c.overflow);assert(c.actions);assert(c.right<=width+1);}
      });
      await check(width+' -002 central picker replacement keeps original definition, uses own history',async()=>{
        await page.evaluate(async()=>{previewOpenSwapPicker('hex');await previewChooseReplacement();});
        await page.locator('#ex-pick-search').fill('Good Morning');
        await page.locator('#ex-pick-search').dispatchEvent('input');
        await page.locator('#ex-pick-list .pk-gcard[onclick="selectExPickerItem(\'gm\')"]').click();
        await page.waitForTimeout(80);
        const result=await page.evaluate(()=>({id:previewWorkingList()[1].exercise_id,original:previewCtx.def.exercises[1].exercise_id,prev:previewCtx.prevMap.gm.weight,mods:previewBuildModifications(),resolved:buildResolvedExecutionItems(previewWorkingList()).map(x=>x.id),history:buildStrengthSessionRow('gm',[{kg:'60',effKg:60,reps:'8'}],{date:'2026-10-24'}).row.exercise_id}));
        assert.equal(result.id,'gm');assert.equal(result.original,'hex');assert.equal(result.prev,60);
        assert(result.mods.some(x=>x.type==='swap'&&x.replacement_exercise_id==='gm'));
        assert.deepEqual(result.resolved,['roeien','gm']);assert.equal(result.history,'gm');
      });
      await check(width+' -010 keyboard-height viewport keeps first search result clickable; back closes picker',async()=>{
        await page.setViewportSize({width,height:400});
        await page.evaluate(async()=>{await openExPicker(()=>{});});
        await page.locator('#ex-pick-search').fill('Good Morning');await page.locator('#ex-pick-search').dispatchEvent('input');
        const first=page.locator('#ex-pick-list .pk-gcard').first();
        const b=await first.boundingBox();assert(b&&b.y>=0&&b.y+b.height<=400,'result below keyboard area '+JSON.stringify(b));
        await page.evaluate(()=>tkNavTopmostOverlay().close());
        assert.equal(await page.locator('#m-ex-picker').evaluate(x=>x.classList.contains('open')),false);
        assert.equal(await page.locator('#m-training-preview').evaluate(x=>x.classList.contains('open')),true);
        assert.equal(await page.evaluate(()=>exPickerCallback),null);
      });
      await page.close();
    }
  }finally{await browser.close();}
  console.log('TK577 BROWSER: '+pass+' passed, '+fail+' failed');process.exitCode=fail?1:0;
})().catch(e=>{console.error(e);process.exitCode=1;});
