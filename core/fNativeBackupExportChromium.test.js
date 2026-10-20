/* TK-REL-SEC-33 — native export in een ECHTE Chromium (20-10-2026): echte UI, echte IndexedDB-wachtrij, echte
 * WebCrypto (versleuteling en SHA-256), met een in-page nep-plugin die het TkBestandOpslaan-contract nabootst (de
 * SAF-route zelf wordt op een emulator/fysiek toestel getest).
 *  K1 Android-route via de bestaande knop: begrensde delen, alleen de versleutelde envelop over de bridge;
 *  K2 alleen bij VERIFIED_READBACK de melding "Versleutelde kopie weggeschreven en teruggelezen.";
 *  K3 de herstelpreview opent het opgeslagen bestand (echte bestandskeuze);
 *  K4 teruglezen mislukt → geen succes; K5 localStorage en wachtrij ongewijzigd; K6 geen paginafouten.
 * Zonder Chromium: SKIP; de Chromium-workflow faalt op een SKIP. */
'use strict';
const path=require('path');
let chromium; try{ chromium=require('playwright').chromium; }catch(e){ chromium=null; }
let n=0,fout=0; const ok=(c,l)=>{ n++; if(c)console.log('  ok  '+l); else { fout++; console.log('MISLUKT: '+l); } };
(async function(){
  let browser=null; if(chromium){ try{ browser=await chromium.launch(); }catch(e){ browser=null; } }
  if(!browser){ console.log('fNativeBackupExportChromium: SKIP (Chromium niet beschikbaar in deze omgeving)'); return; }
  try{
    const page=await browser.newPage({viewport:{width:360,height:900}}); const errs=[]; page.on('pageerror',e=>errs.push(e.message));
    await page.goto('file://'+path.join(__dirname,'..','index.html'),{waitUntil:'domcontentloaded',timeout:30000}); await page.waitForTimeout(500);
    const r=await page.evaluate(async function(){
      const A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', PASS='een lange wachtzin voor test';
      authSession={user:{id:A},access_token:'tA',refresh_token:'rA'}; SB_H.Authorization='Bearer tA';
      window.fetch=async()=>({ok:true,status:200,headers:{get:()=>null},text:async()=>'[]',json:async()=>[]});
      localStorage.clear(); localStorage.setItem('tk_cache_owner_uid',A);
      localStorage.setItem('tk_trainings',JSON.stringify([{id:'ct1',name:'Geheim plan',exercises:['squat']}]));
      const db=await offlineDb(); await new Promise(res=>{ const tx=db.transaction(OFFLINE_STORE,'readwrite'); tx.objectStore(OFFLINE_STORE).clear(); tx.oncomplete=res; });
      await offlineQueueAdd({table:'goals',method:'PATCH',filter:'id=eq.4',body:{naam:'x'}},A);
      const dump=async()=>JSON.stringify([Object.keys(localStorage).sort().filter(k=>k!=='tk_export_bezig').map(k=>[k,localStorage.getItem(k)]),await offlineQueueAll()]);
      const voor=await dump();
      // In-page nep-plugin (contract TkBestandOpslaan); bridge-verkeer wordt vastgelegd.
      const docs={}, bridge=[]; let sessie=null, fout={};
      const sha=async t=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(t)))).map(b=>('0'+b.toString(16)).slice(-2)).join('');
      const plugin={
        async start(a){ bridge.push(JSON.stringify(a)); sessie={id:'s',naam:a.naam,grootte:a.grootte,sha:a.sha256,index:0}; docs[a.naam]=''; return {status:'GEOPEND',sessie:'s',naam:a.naam}; },
        async schrijf(a){ bridge.push(JSON.stringify(a)); if(a.index!==sessie.index||a.data.length>524288)return {status:'WRITE_FAILED',verwijderd:true}; docs[sessie.naam]+=a.data; sessie.index++; return {status:'DEEL_OK'}; },
        async voltooi(a){ bridge.push(JSON.stringify(a)); const d=docs[sessie.naam]; if(fout.lees){ delete docs[sessie.naam]; return {status:'READ_FAILED',verwijderd:true}; }
          if(d.length!==sessie.grootte||(await sha(d))!==sessie.sha){ delete docs[sessie.naam]; return {status:'MISMATCH',verwijderd:true}; }
          return {status:'VERIFIED_READBACK',grootte:d.length,sha256:await sha(d),naam:sessie.naam}; },
        async afbreken(a){ bridge.push(JSON.stringify(a)); if(sessie)delete docs[sessie.naam]; return {status:a.status,verwijderd:true}; },
        async afronden(a){ bridge.push(JSON.stringify(a)); return {status:'AFGEROND'}; }
      };
      window.Capacitor={isNativePlatform:()=>true,Plugins:{TkBestandOpslaan:plugin}};
      let gedownload=false; window.downloadFile=()=>{ gedownload=true; };
      document.getElementById('tk-backup-pass').value=PASS; document.getElementById('tk-backup-pass2').value=PASS;
      await tkMaakVersleuteldeLokaleBackup();
      const uit={status:document.getElementById('tk-backup-status').textContent,gedownload,namen:Object.keys(docs),bridge:bridge.join('|')};
      uit.bestand=docs[uit.namen[0]]||'';
      uit.envelopBegin=uit.bestand.indexOf(TKNativeExport.ENVELOP_BEGIN)===0;
      // K4
      fout={lees:true}; document.getElementById('tk-backup-pass').value=PASS; document.getElementById('tk-backup-pass2').value=PASS;
      await tkMaakVersleuteldeLokaleBackup();
      uit.status2=document.getElementById('tk-backup-status').textContent;
      uit.na=await dump(); uit.voor=voor;
      delete window.Capacitor;
      return uit;
    });
    ok(r.namen.length===1&&!r.gedownload&&r.envelopBegin,'K1 Android-route via de bestaande knop: één document, geen browserdownload, alleen de versleutelde envelop');
    ok(!/Geheim plan|een lange wachtzin/.test(r.bridge),'K1 geen wachtzin of onversleutelde gegevens over de bridge');
    ok(/Versleutelde kopie weggeschreven en teruggelezen\./.test(r.status)&&/geen garantie dat een cloudopslag/.test(r.status),'K2 VERIFIED_READBACK → verplichte melding met cloud-voorbehoud');
    ok(!/weggeschreven en teruggelezen/.test(r.status2)&&/niet worden teruggelezen/.test(r.status2),'K4 teruglezen mislukt → geen succesmelding');
    ok(r.na===r.voor,'K5 localStorage en offline-wachtrij ongewijzigd');
    await page.evaluate(()=>{ const m=document.getElementById('m-export'); if(m)m.classList.add('open'); });
    await page.setInputFiles('#tk-restore-file',{name:r.namen[0],mimeType:'application/json',buffer:Buffer.from(r.bestand)});
    const pv=await page.evaluate(async()=>{ document.getElementById('tk-restore-pass').value='een lange wachtzin voor test'; const u=await tkHerstelPreviewToon(); return {ok:u&&u.ok,tekst:document.getElementById('tk-restore-result').textContent}; });
    ok(pv.ok===true&&/gegevens in het bestand/.test(pv.tekst)&&/Dit is alleen een controle/.test(pv.tekst),'K3 de herstelpreview opent het native opgeslagen bestand');
    // TK-REL-SEC-34: MIME-contract in de echte bestandsinvoer; inhoud beslist, niet naam of type.
    const acc=await page.evaluate(()=>[document.getElementById('tk-restore-file').accept,document.getElementById('tk-backup-file').accept]);
    ok(acc.every(a=>a.split(',').indexOf('application/octet-stream')>=0&&a.split(',').indexOf('.tkbackup')>=0),'K7 beide bestandsinvoeren laten het native exporttype (application/octet-stream) toe');
    const kies=async(naam,mime,buf)=>{ await page.setInputFiles('#tk-restore-file',{name:naam,mimeType:mime,buffer:buf});
      return page.evaluate(async()=>{ document.getElementById('tk-restore-pass').value='een lange wachtzin voor test'; const u=await tkHerstelPreviewToon(); return {ok:!!(u&&u.ok),tekst:document.getElementById('tk-restore-result').textContent}; }); };
    const o1=await kies(r.namen[0],'application/octet-stream',Buffer.from(r.bestand));
    ok(o1.ok&&/gegevens in het bestand/.test(o1.tekst),'K7 native export met type application/octet-stream opent in de herstelpreview');
    const o2=await kies('kopie.bin','application/x-onbekend',Buffer.from(r.bestand));
    ok(o2.ok,'K7 dezelfde inhoud met een andere naam en ander type → gelezen (inhoud beslist)');
    const o3=await kies('onzin.tkbackup','application/octet-stream',Buffer.from('{"format":"tk-local-rescue-encrypted.v1","data":"AAAA"}'));
    ok(!o3.ok&&/Niet gecontroleerd/.test(o3.tekst),'K7 ".tkbackup" met ongeldige inhoud → veilig geweigerd');
    ok(errs.length===0,'K6 geen paginafouten'+(errs.length?(': '+errs.join(' | ')):''));
  }finally{ await browser.close(); }
  console.log('fNativeBackupExportChromium: '+(n-fout)+' geslaagd, '+fout+' mislukt');
  if(fout)process.exitCode=1;
})().catch(e=>{console.error('FAIL',e&&e.stack||e);process.exitCode=1;});
