/* UX-EXEC-A11Y-01 — native set-completion control, presentation-only.
 * Browser test uses a synthetic, local fixture; no live user or backend writes.
 * Run with: node core/fUxSetCompletionAccessibility.test.js
 * Set TK_REQUIRE_CHROMIUM=1 for a non-skippable browser acceptance gate.
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace(/\r\n/g, '\n');

assert.match(html, /<button type="button" class="set-circle setr-ring" id="sc-\$\{exId\}-\$\{i\}"[^>]*aria-pressed="\$\{!!\(setObj&&setObj\.done\)\}"/, 'completion is a native button with initial persisted state');
assert.match(html, /if\(typeof c\.hasAttribute==='function'&&c\.hasAttribute\('aria-pressed'\)\)c\.setAttribute\('aria-pressed',String\(nowDone\)\)/, 'toggle reflects existing done state to assistive tech');
assert.match(html, /if\(typeof c\.hasAttribute==='function'&&c\.hasAttribute\('aria-pressed'\)\)c\.setAttribute\('aria-pressed','true'\)/, 'session resume reflects restored completed state');
assert.match(html, /\.setr-ring\{width:44px;height:44px;margin:-5px/, 'hit target is 44px while taking old 34px layout width');
assert.match(html, /\.setr-ring::before\{[^}]*inset:5px[^}]*border:2px/, '34px visual ring remains unchanged');
assert.match(html, /\.setr-ring:focus-visible\{outline:2px solid var\(--accent\)/, 'visible keyboard focus');
assert.match(html, /function updateSetE1RM\(/, 'e1RM remains a separate existing calculation');
console.log('UX-EXEC-A11Y-01 source contract: 7/7 PASS');

(async function runBrowser() {
  let chromium = null;
  try { chromium = require('playwright').chromium; } catch (_) {}
  if (!chromium) {
    if (process.env.TK_REQUIRE_CHROMIUM === '1') throw Error('Playwright ontbreekt: browseracceptatie verplicht');
    console.log('UX-EXEC-A11Y-01 Chromium: SKIP (Playwright ontbreekt)');
    return;
  }
  let browser;
  try { browser = await chromium.launch({ headless: true }); }
  catch (err) {
    if (process.env.TK_REQUIRE_CHROMIUM === '1') throw err;
    console.log('UX-EXEC-A11Y-01 Chromium: SKIP (browser ontbreekt): ' + err.message.split('\n')[0]);
    return;
  }
  try {
    for (const width of [320,360,375,390,412,430]) {
      const page = await browser.newPage({viewport:{width,height:900}});
      const errors = [];
      page.on('pageerror',e=>errors.push(e.message));
      await page.goto('file://' + path.join(root,'index.html'), {waitUntil:'domcontentloaded',timeout:60000});
      await page.evaluate(async function() {
        const seed=TRAIN_CFG_SEED.A.slice(1,4);
        const exRows=seed.map(function(e) {return {id:e.id,name:e.naam,type:e.type,active:true,muscle_primary:e.muscles.p,muscle_secondary:e.muscles.s,scope:'global'};});
        const teRows=seed.map(function(e,i) {return {id:'A_'+e.id,exercise_id:e.id,training_ref:'A',sort_order:i,sets:e.sets,reps:e.reps,rpe:e.rpe,wu:e.wu,tip:e.tip};});
        window.__ux_a11y = {exercises:exRows,training_exercises:teRows};
        window.sbGet=async function(t) {return window.__ux_a11y[t]?JSON.parse(JSON.stringify(window.__ux_a11y[t])):[];};
        window.sbUpsert=async function() {return true;};
        window.sbPost=async function() {return true;};
        window.sbPatch=async function() {return true;};
        window.fetchWearableStatus=async function(){return {connected:false};};
        atleet={naam:'Test Sporter'};
        exercises=exRows;
        await loadTrainCfg();
        go('s-home');
        await startT('A');
      });
      const sel='#sc-backsquat-1';
      const ctl=page.locator(sel);
      await ctl.waitFor({state:'visible'});
      let state = await page.evaluate(function() {
        const el=document.querySelector('#sc-backsquat-1');
        const b=el.getBoundingClientRect();
        const ring=getComputedStyle(el,'::before');
        const kg=document.querySelector('#s-backsquat-1-kg').getBoundingClientRect();
        const reps=document.querySelector('#s-backsquat-1-reps').getBoundingClientRect();
        const row=document.querySelector('#sr-backsquat-1');
        return {tag:el.tagName,width:b.width,height:b.height,
          ringInset:ring.top,aria:el.getAttribute('aria-pressed'),
          kg:kg.width,reps:reps.width,overflow:row.scrollWidth>row.clientWidth+1};
      });
      assert.equal(state.tag,'BUTTON',width+'px native button');
      assert.equal(state.width,44,width+'px click target width');
      assert.equal(state.height,44,width+'px click target height');
      assert.equal(state.ringInset,'5px',width+'px original 34px ring');
      assert.equal(state.aria,'false',width+'px initial uncompleted');
      assert.ok(state.kg>=56 && state.reps>=56,width+'px data inputs readable');
      assert.ok(!state.overflow,width+'px no row overflow');
      await ctl.focus();
      await page.keyboard.press('Space');
      state=await page.evaluate(function() {return {pressed:document.querySelector('#sc-backsquat-1').getAttribute('aria-pressed'),done:!!sessionLog.backsquat?.sets?.[0]?.done,cls:document.querySelector('#sc-backsquat-1').classList.contains('done')};});
      assert.deepEqual(state,{pressed:'true',done:true,cls:true},width+'px keyboard Space persists done');
      await page.keyboard.press('Enter');
      state=await page.evaluate(function() {return {pressed:document.querySelector('#sc-backsquat-1').getAttribute('aria-pressed'),done:!!sessionLog.backsquat?.sets?.[0]?.done,cls:document.querySelector('#sc-backsquat-1').classList.contains('done')};});
      assert.deepEqual(state,{pressed:'false',done:false,cls:false},width+'px keyboard Enter undoes done');
      state=await page.evaluate(function() {
        sessionLog.backsquat.sets[0].done=true;
        restoreCompletedSetVisualState('backsquat');
        return document.querySelector('#sc-backsquat-1').getAttribute('aria-pressed');
      });
      assert.equal(state,'true',width+'px restored state announced correctly');
      assert.equal(errors.filter(e=>/toggleSetDone|restoreCompletedSetVisualState|buildWorkSetRow/.test(e)).length,0,width+'px no related runtime exceptions');
      console.log('UX-EXEC-A11Y-01 Chromium '+width+'px: PASS');
      await page.close();
    }
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
