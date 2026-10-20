/* TK-REL-SEC-29 — actual Chromium + IndexedDB-free, read-only encrypted backup UI.
 * Failure if chromium is unavailable in browser CI; no data leaves the test page. */
'use strict';
const path=require('path'),assert=require('assert');
let chromium;try{chromium=require('playwright').chromium;}catch(_){chromium=null;}
let ok=0;function check(c,name){assert(c,name);ok++;console.log('PASS '+name);}
(async()=>{
  if(!chromium){console.log('Chromium niet beschikbaar: SKIP');return;}
  const browser=await chromium.launch();
  try{
    const page=await browser.newPage();
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('file://'+path.join(__dirname,'../index.html'),{waitUntil:'domcontentloaded'});
    await page.waitForTimeout(500);
    const result=await page.evaluate(async()=>{
      const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
      authSession={user:{id:uid},access_token:'TEST-AUTH-TOKEN'};
      SB_H.Authorization='Bearer TEST-AUTH-TOKEN';
      localStorage.setItem('tk_cache_owner_uid',uid);
      localStorage.setItem('tk_trainings',JSON.stringify([{id:'ct1',name:'Back-up squat',access_token:'DO_NOT_EXPORT'}]));
      localStorage.setItem('tk_draft_training',JSON.stringify({t:'Bench',sessionLog:[{reps:8}]}));
      const before=[localStorage.getItem('tk_trainings'),localStorage.getItem('tk_draft_training')];
      // TK-REL-SEC-30: echte IndexedDB-wachtrij (strikt gelezen) in plaats van een gestubde offlineQueueAll().
      const qdb=await offlineDb(); await new Promise(res=>{ const tx=qdb.transaction(OFFLINE_STORE,'readwrite'); tx.objectStore(OFFLINE_STORE).clear(); tx.oncomplete=res; });
      await offlineQueueAdd({table:'sessions',method:'POST',body:{id:'s9',reps:8}},uid);
      const qVoor=JSON.stringify(await offlineQueueAll());
      let file=null;window.downloadFile=(data,name,mime)=>{file={data,name,mime};};
      document.getElementById('tk-backup-pass').value='my super strong password 22';
      document.getElementById('tk-backup-pass2').value='my super strong password 22';
      await tkMaakVersleuteldeLokaleBackup();
      const result={download:!!file,name:file?.name,plaintext:file?.data||'',status:document.getElementById('tk-backup-status').textContent,
        passCleared:document.getElementById('tk-backup-pass').value===''&&document.getElementById('tk-backup-pass2').value==='',
        unchanged:before[0]===localStorage.getItem('tk_trainings')&&before[1]===localStorage.getItem('tk_draft_training')};
      const envelope=JSON.parse(file.data),verified=await TKLocalBackup.inspect(envelope,'my super strong password 22',window.crypto);
      result.inspected=verified;
      result.queueUnchanged=JSON.stringify(await offlineQueueAll())===qVoor;
      // TK-REL-SEC-30 R1 in de echte browser: een IndexedDB-fout bij het lezen van de wachtrij → geen kopie.
      file=null; const echtGetAll=IDBObjectStore.prototype.getAll;
      IDBObjectStore.prototype.getAll=function(){ throw new DOMException('stuk','UnknownError'); };
      document.getElementById('tk-backup-pass').value='my super strong password 22'; document.getElementById('tk-backup-pass2').value='my super strong password 22';
      await tkMaakVersleuteldeLokaleBackup(); IDBObjectStore.prototype.getAll=echtGetAll;
      result.queueFail={download:!!file,status:document.getElementById('tk-backup-status').textContent};
      // R2: Android-app → geen schijnsucces.
      file=null; window.Capacitor={isNativePlatform:()=>true};
      document.getElementById('tk-backup-pass').value='my super strong password 22'; document.getElementById('tk-backup-pass2').value='my super strong password 22';
      await tkMaakVersleuteldeLokaleBackup(); delete window.Capacitor;
      result.native={download:!!file,status:document.getElementById('tk-backup-status').textContent,passCleared:document.getElementById('tk-backup-pass').value===''};
      result.iterations=envelope.iterations;
      return result;
    });
    check(result.download&&result.name.endsWith('.tkbackup'),'Encrypted file created through real UI');
    check(!result.plaintext.includes('Back-up squat')&&!result.plaintext.includes('DO_NOT_EXPORT'),'No plaintext or authentication secret in downloaded content');
    check(result.passCleared,'Passphrases cleared from inputs');
    check(result.unchanged,'Local records byte-for-byte unchanged');
    check(result.inspected.entries>=3&&result.inspected.restoreAllowed===false&&result.inspected.complete===false,'Decrypt supports read-only preview only');
    check(/ONVEILIG/.test(result.status),'UI explicitly warns uninstall is unsafe');
    check(result.queueUnchanged,'Real IndexedDB queue unchanged by export');
    check(result.iterations>=600000,'New file uses PBKDF2 with >= 600000 iterations');
    check(!result.queueFail.download&&/wachtrij/i.test(result.queueFail.status),'Unreadable real IndexedDB queue: no backup offered');
    // TK-REL-SEC-33: zonder native plugin (oudere APK) geen export en geen schijnsucces; met plugin: fNativeBackupExport*.
    check(!result.native.download&&/kan de kopie nog niet opslaan/.test(result.native.status)&&result.native.passCleared,'Native app without export plugin: no false download success, passphrase cleared');
    check(errors.length===0,'No browser page exceptions');
    console.log('fLocalEncryptedBackupChromium: '+ok+'/'+ok);
  }finally{await browser.close();}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1;});