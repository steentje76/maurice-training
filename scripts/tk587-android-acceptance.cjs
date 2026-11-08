'use strict';
/* TK #587 x MoveKit — Android WebView acceptance on a CI EMULATOR only.
 * Installs the isolated test package next to anything else; never uninstalls an app,
 * never signs in, never touches a real account. Backend calls are unauthenticated
 * probes that must be REFUSED (proves the private MoveKit catalog is login-gated). */
const fs = require('fs'), path = require('path'), cp = require('child_process'), assert = require('assert');
const { _android } = require('playwright');
const { run } = require('./tk584-browser-acceptance.cjs');
const PKG = 'com.trainingskompas.app.tk587test20261107';
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8').replace(/\r/g, '');
function extract(name) { const s = html.search(new RegExp('(?:async )?function ' + name + '\\(')); assert(s >= 0, 'missing ' + name); return html.slice(s, html.indexOf('\n}', s) + 2); }
// Functions exercised by core/fTk587IntegrationAcceptance.test.js: the APK must carry exactly this code.
const INTEGRATION_FNS = ['logSet', 'toggleSetDone', 'getSessionExs', 'execCompleteExercise', 'execExerciseHasData', 'addWorkSet',
  'confirmSwapExercise', 'execReplaceExercise', 'persistTrainingDraft', 'restoreExecutionDraft', 'tk603DraftOwnerMatches',
  'buildStrengthSessionRow', 'finishSession', 'programHistoryHtml', 'previewApplySwap', 'previewChooseReplacement',
  'previewAddExercise', 'selectExPickerItem', 'cleanupExPickerKeyboard', 'v43OverallRecovery', 'tk603CatalogRefFromPickerSelection',
  'strengthExecutionPrefill', 'execEnsureEditableWorkout', 'execRemoveExercise'];
const evidence = { package: PKG, checks: [], physicalSamsung: false, pm5: false, account: 'none (synthetic, no login)' };
const pass = c => { evidence.checks.push(c); console.log('PASS ' + c); };

function withTimeout(p, ms, what) {
  let t; return Promise.race([p, new Promise((_, rej) => { t = setTimeout(() => rej(new Error(what + ' timeout ' + ms + 'ms')), ms); })]).finally(() => clearTimeout(t));
}
async function diag(device, tag) {
  try { fs.writeFileSync(`android-test-evidence/${tag}-screen.png`, await withTimeout(device.screenshot(), 30000, 'screenshot')); } catch (_) {}
  try { fs.writeFileSync(`android-test-evidence/${tag}-activity.txt`, (await withTimeout(device.shell('dumpsys activity activities | head -80'), 30000, 'dumpsys')).toString()); } catch (_) {}
}
async function launch(device, tag) {
  await device.shell(`am force-stop ${PKG}`);
  // Explicit launcher activity + am start -W (monkey is unreliable on newer images).
  const resolved = (await device.shell(`cmd package resolve-activity --brief -c android.intent.category.LAUNCHER ${PKG}`)).toString().trim().split('\n').pop().trim();
  assert(resolved.startsWith(PKG + '/'), 'launcher activity not resolved: ' + resolved);
  evidence.launchActivity = resolved;
  await device.shell(`am start -W -n ${resolved}`);
  // Diagnostic only: wait until the WebView devtools socket exists (debuggable test variant).
  const t0 = Date.now(); let sock = '';
  while (Date.now() - t0 < 180000) {
    try { sock = (await device.shell('cat /proc/net/unix')).toString().split('\n').filter(l => /webview_devtools_remote/.test(l)).length; } catch (_) { sock = 'unreadable'; break; }
    if (sock) break; await new Promise(r => setTimeout(r, 2000));
  }
  evidence['devtoolsSocket_' + tag] = sock || 0;
  try {
    const webview = await withTimeout(device.webView({ pkg: PKG }, { timeout: 120000 }), 150000, 'webView');
    const page = await withTimeout(webview.page(), 60000, 'webview.page');
    await page.waitForFunction(() => typeof window.toggleSetDone === 'function' && typeof window.ExerciseCatalogService !== 'undefined', null, { timeout: 120000 });
    return page;
  } catch (e) { await diag(device, 'launch-' + tag); throw e; }
}

function writeFail(e) {
  fs.mkdirSync('android-test-evidence', { recursive: true });
  evidence.status = 'FAIL'; evidence.error = String(e && e.stack || e);
  fs.writeFileSync('android-test-evidence/result.json', JSON.stringify(evidence, null, 2));
}
// Watchdog: a hung WebView/adb connection must fail fast with evidence, not run into the job timeout.
const watchdog = setTimeout(() => { writeFail(new Error('watchdog: acceptance exceeded 20 minutes')); console.error('TK587 ANDROID ACCEPTANCE TIMEOUT'); process.exit(1); }, 20 * 60 * 1000);
(async () => {
  assert.equal(process.env.TK_EMULATOR_ONLY, '1', 'emulator-only guard required');
  const devices = await _android.devices(); assert.equal(devices.length, 1); const device = devices[0];
  assert(device.serial().startsWith('emulator-'), 'refuse a physical device');
  fs.mkdirSync('android-test-evidence', { recursive: true });
  const apk = fs.readdirSync('candidate').find(n => n.endsWith('.apk')); assert(apk, 'candidate APK missing');
  cp.execFileSync('sha256sum', ['-c', apk + '.sha256'], { cwd: 'candidate', stdio: 'inherit' });
  evidence.apk = apk; evidence.api = (await device.shell('getprop ro.build.version.sdk')).toString().trim();
  await device.installApk(fs.readFileSync(path.join('candidate', apk)));
  pass('install');

  let page = await launch(device, 'first');
  pass('launch+webview (' + evidence.launchActivity + ')');
  await page.screenshot({ path: 'android-test-evidence/after-launch.png' }).catch(() => {});
  const ver = await page.evaluate(() => typeof APP_VER !== 'undefined' ? APP_VER : null);
  assert.equal(ver, html.match(/const APP_VER = '([^']+)'/)[1], 'packaged APP_VER equals source');
  evidence.appVer = ver; pass('app-version ' + ver);

  // Exactly the integrated, tested code is packaged.
  const packaged = await page.evaluate(names => names.map(n => typeof window[n] === 'function' ? window[n].toString() : null), INTEGRATION_FNS);
  INTEGRATION_FNS.forEach((n, i) => assert.equal((packaged[i] || '').replace(/\r/g, ''), extract(n), 'packaged function differs from source: ' + n));
  pass('packaged-functions-equal-source (' + INTEGRATION_FNS.length + ')');

  // MoveKit: release flag on, private 356 never visible without sign-in, server refuses anonymous access.
  const cat = await page.evaluate(async () => {
    const before = ExerciseCatalogService.count();
    let status = null;
    try { const r = await fetch(tkApiUrl('/.netlify/functions/exercise-catalog-v2'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }); status = r.status; } catch (e) { status = 'network:' + e.message; }
    return { flag: typeof TK504_PUBLISHED_CATALOG_RELEASE !== 'undefined' && TK504_PUBLISHED_CATALOG_RELEASE === true, before, after: ExerciseCatalogService.count(), status, url: tkApiUrl('/.netlify/functions/exercise-catalog-v2') };
  });
  evidence.catalog = cat;
  assert(cat.flag, 'published catalog release flag');
  assert(/^https:\/\//.test(cat.url), 'catalog endpoint is an absolute HTTPS URL: ' + cat.url);
  assert(cat.before < 582 && cat.after === cat.before, 'no private MoveKit items without authenticated mount: ' + JSON.stringify(cat));
  assert(typeof cat.status === 'number' && cat.status >= 400 && cat.status < 500, 'anonymous catalog request must be refused: ' + cat.status);
  pass('movekit-private-catalog-login-gated (anonymous ' + cat.status + ', public count ' + cat.before + ')');

  // Real handlers in the real WebView: 8-exercise mixed plan, decimals, draft, no duplicate completion.
  const r = await run(page, true);
  evidence.execution = r; pass('execution-handlers ' + JSON.stringify(r));

  // Process restart: only the isolated fixture draft is read back.
  page = await launch(device, 'restart');
  const raw = await page.evaluate(() => localStorage.getItem('tk_draft_training'));
  assert(raw, 'draft survives process restart');
  const d = JSON.parse(raw);
  assert.equal(Object.values(d.sessionLog).flatMap(l => l.sets).length, 15, 'all 15 sets after restart');
  pass('process-restart-draft-readback (15 sets)');
  await page.screenshot({ path: 'android-test-evidence/after-restart.png' });

  evidence.status = 'PASS';
  fs.writeFileSync('android-test-evidence/result.json', JSON.stringify(evidence, null, 2));
  console.log('TK587 ANDROID ACCEPTANCE PASS api=' + evidence.api);
  clearTimeout(watchdog);
  await device.close();
  process.exit(0);
})().catch(e => {
  writeFail(e);
  console.error(e);
  // The open adb/WebView connection keeps node alive; exit explicitly so the job fails now.
  process.exit(1);
});
