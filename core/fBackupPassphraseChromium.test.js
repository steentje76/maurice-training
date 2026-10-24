'use strict';
const path=require('path'),assert=require('node:assert/strict');
let chromium;try{chromium=require('playwright').chromium;}catch(_){console.log('Chromium niet beschikbaar: SKIP');}
(async()=>{
 if(!chromium)return;
 const browser=await chromium.launch();
 try{
  for(const width of [320,390,430]){
   const page=await browser.newPage({viewport:{width,height:850}});
   await page.route('https://**/*',route=>route.abort());
   await page.goto('file://'+path.join(__dirname,'..','index.html'),{waitUntil:'domcontentloaded'});
   await page.waitForTimeout(500);
   await page.evaluate(()=>{document.querySelectorAll('.modal-bg.open').forEach(x=>x.classList.remove('open'));openModal('m-export');});
   for(const id of ['tk-backup-pass','tk-backup-pass2','tk-backup-check-pass','tk-restore-pass']){
    const input=page.locator('#'+id),button=page.locator('#'+id+'-toggle');
    await input.fill('synthetic test passphrase');
    assert.equal(await input.getAttribute('type'),'password');
    await button.click();assert.equal(await input.getAttribute('type'),'text');
    assert.equal(await button.getAttribute('aria-pressed'),'true');
    const rect=await button.boundingBox();assert(rect.height>=44&&rect.x>=0&&rect.x+rect.width<=width);
    await button.focus();await page.keyboard.press('Space');assert.equal(await input.getAttribute('type'),'password');
    assert.equal(await input.inputValue(),'synthetic test passphrase');
   }
   // Closing/reopening clears secrets and resets visibility. No network or storage writer is used.
   await page.evaluate(()=>{tkToggleBackupWachtzin('tk-backup-pass');closeModal('m-export');openModal('m-export');});
   for(const id of ['tk-backup-pass','tk-backup-pass2','tk-backup-check-pass','tk-restore-pass']){
    assert.equal(await page.locator('#'+id).inputValue(),'');assert.equal(await page.locator('#'+id).getAttribute('type'),'password');
   }
   assert.equal(await page.locator('#tk-restore-apply').isDisabled(),true);
   await page.close();console.log('PASS passphrase UI width '+width);
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
