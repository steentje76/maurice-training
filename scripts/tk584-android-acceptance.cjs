'use strict';
const fs=require('fs'),cp=require('child_process'),assert=require('assert');
const {_android}=require('playwright');const {run}=require('./tk584-browser-acceptance.cjs');
(async()=>{
 assert.equal(process.env.TK_EMULATOR_ONLY,'1','emulator-only guard required');
 const devices=await _android.devices();assert(devices.length===1);const device=devices[0];assert(device.serial().startsWith('emulator-'));
 const pkg='com.trainingskompas.app.tk584test20261101';const apk=fs.readdirSync('candidate').find(n=>n.endsWith('.apk'));assert(apk);
 cp.execFileSync('sha256sum',['-c',apk+'.sha256'],{cwd:'candidate',stdio:'inherit'});
 await device.installApk(fs.readFileSync('candidate/'+apk));
 await device.shell(`am force-stop ${pkg}`);await device.shell(`monkey -p ${pkg} -c android.intent.category.LAUNCHER 1`);
 let webview=await device.webView({pkg});let page=await webview.page();await page.waitForFunction(()=>typeof window.toggleSetDone==='function');
 console.log(JSON.stringify(await run(page,true)));
 // Restart the actual process: only the isolated fixture draft is read, never login/production data.
 await device.shell(`am force-stop ${pkg}`);await device.shell(`monkey -p ${pkg} -c android.intent.category.LAUNCHER 1`);
 webview=await device.webView({pkg});page=await webview.page();await page.waitForFunction(()=>typeof window.toggleSetDone==='function');
 const raw=await page.evaluate(()=>localStorage.getItem('tk_draft_training'));assert(raw,'draft survives process restart');const d=JSON.parse(raw);assert.equal(Object.values(d.sessionLog).flatMap(l=>l.sets).length,15);
 fs.mkdirSync('android-test-evidence',{recursive:true});await page.screenshot({path:'android-test-evidence/restarted.png'});fs.writeFileSync('android-test-evidence/result.json',JSON.stringify({package:pkg,setsAfterRestart:15,status:'PASS'}));
 await device.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
