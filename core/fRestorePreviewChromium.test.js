/* TK-REL-SEC-31 — herstelpreview in een ECHTE Chromium (fase 4B, 19-10-2026): echte localStorage, IndexedDB-wachtrij,
 * WebCrypto en bestandskeuze (setInputFiles op het echte <input type=file>).
 *  K1 kopie maken met de app zelf, daarna een lokale wijziging (conflict) en een herstelpreview via de echte knop;
 *  K2 scherm: verplichte melding, aantallen, conflict; "Herstel uitvoeren" uitgeschakeld; wachtzin gewist;
 *  K3 localStorage, offline-wachtrij en het controleregister (IndexedDB) inhoudelijk ongewijzigd; databaseversies gelijk;
 *  K4 herhaalde preview geeft exact dezelfde uitkomst; K5 verkeerde wachtzin en kopie van een ander account geweigerd;
 *  K6 geen schrijfverzoeken naar de server; K7 geen paginafouten.
 * Zonder Chromium (quality gate zonder Playwright): SKIP; de Chromium-workflow faalt op een SKIP. */
'use strict';
const path=require('path');
let chromium; try{ chromium=require('playwright').chromium; }catch(e){ chromium=null; }
let n=0,fout=0; const ok=(c,l)=>{ n++; if(c)console.log('  ok  '+l); else { fout++; console.log('MISLUKT: '+l); } };
(async function(){
  let browser=null; if(chromium){ try{ browser=await chromium.launch(); }catch(e){ browser=null; } }
  if(!browser){ console.log('fRestorePreviewChromium: SKIP (Chromium niet beschikbaar in deze omgeving)'); return; }
  try{
    const page=await browser.newPage({viewport:{width:360,height:900}}); const errs=[]; page.on('pageerror',e=>errs.push(e.message));
    await page.goto('file://'+path.join(__dirname,'..','index.html'),{waitUntil:'domcontentloaded',timeout:30000}); await page.waitForTimeout(500);
    const prep=await page.evaluate(async function(){
      const A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', B='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', PASS='een lange wachtzin voor test';
      authSession={user:{id:A},access_token:'tA',refresh_token:'rA'}; SB_H.Authorization='Bearer tA';
      window.__writes=[]; window.fetch=async function(url,init){ init=init||{}; const m=init.method||'GET'; if(m!=='GET')window.__writes.push(m+' '+url);
        return {ok:true,status:200,headers:{get:()=>null},text:async()=>'[]',json:async()=>[]}; };
      localStorage.clear(); localStorage.setItem('tk_cache_owner_uid',A);
      const T=(id,naam,ex)=>({id,name:naam,color:'#111111',note:'',exercises:ex,source:null,metadata:null,exercise_targets:ex.map(e=>({exercise_id:e,sets:null,reps:null,rpe:null,rest:null,pick:null}))});
      localStorage.setItem('tk_trainings',JSON.stringify([T('ct1','Push',['squat']),T('ct2','Pull',['row'])]));
      localStorage.setItem('tk_coach_style','kort');
      const db=await offlineDb(); await new Promise(r=>{ const tx=db.transaction(OFFLINE_STORE,'readwrite'); tx.objectStore(OFFLINE_STORE).clear(); tx.oncomplete=r; });
      await offlineQueueAdd({table:'goals',method:'PATCH',filter:'id=eq.4',body:{naam:'x'}},A);
      const snap=await tkBackupSnapshot(); const env=await TKLocalBackup.encrypt(snap,PASS,window.crypto);
      // kopie van B
      const snapB=TKLocalBackup.prepare({owner:B,cacheOwner:B,manifest:LocalInventoryCore.BRONNEN,local:{tk_trainings:'[{"id":"van-b"}]'},queue:[]});
      const envB=await TKLocalBackup.encrypt(snapB,PASS,window.crypto);
      // lokale wijziging na de kopie: ct2 anders (conflict), ct1 gelijk (bestaat al)
      localStorage.setItem('tk_trainings',JSON.stringify([T('ct1','Push',['squat']),T('ct2','Pull',['deadlift'])]));
      return {a:JSON.stringify(env),b:JSON.stringify(envB)};
    });
    const dump=()=>page.evaluate(async function(){
      const ls=Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)]);
      const q=await offlineQueueAll();
      let reg=null; try{ reg=await tkVerifyLeesRegister(); }catch(_){ reg='geen'; }
      const dbs=(await indexedDB.databases()).map(d=>d.name+':'+d.version).sort();
      return JSON.stringify({ls,q,reg,dbs});
    });
    // Zorg dat het controleregister bestaat, zodat ook die database vergeleken wordt.
    await page.evaluate(async()=>{ await tkVerifyLeesRegister().catch(()=>null); });
    const voor=await dump();
    await page.evaluate(()=>{ go('s-instellingen'); const m=document.getElementById('m-export'); if(m)m.classList.add('open'); });
    const kies=async(tekst,pw)=>{ await page.setInputFiles('#tk-restore-file',{name:'kopie.tkbackup',mimeType:'application/json',buffer:Buffer.from(tekst)});
      await page.evaluate(p=>{ document.getElementById('tk-restore-pass').value=p; },pw);
      await page.evaluate(async()=>{ await tkHerstelPreviewToon(); });
      return page.evaluate(()=>({tekst:document.getElementById('tk-restore-result').textContent,pw:document.getElementById('tk-restore-pass').value,
        apply:document.getElementById('tk-restore-apply').disabled})); };
    const r1=await kies(prep.a,'een lange wachtzin voor test');
    ok(/Dit is alleen een controle\. Er worden geen gegevens teruggezet\./.test(r1.tekst)&&/gegevens in het bestand/.test(r1.tekst),'K1/K2 echte bestandskeuze (setInputFiles) en de functie achter de knop: preview met de verplichte melding');
    ok(/Conflicten: 1/.test(r1.tekst)&&/Staat al op dit toestel: [1-9]/.test(r1.tekst),'K2 conflict (ct2) en bestaand record (ct1) herkend');
    ok(r1.apply===true&&r1.pw==='','K2 "Herstel uitvoeren" uitgeschakeld; wachtzin gewist');
    const r2=await kies(prep.a,'een lange wachtzin voor test');
    ok(r2.tekst===r1.tekst,'K4 herhaalde preview: exact dezelfde uitkomst');
    const r3=await kies(prep.a,'verkeerde wachtzin 12345');
    ok(/Onjuiste wachtzin of beschadigd bestand/.test(r3.tekst),'K5 verkeerde wachtzin → geweigerd');
    const r4=await kies(prep.b,'een lange wachtzin voor test');
    ok(/hoort bij een ander account/.test(r4.tekst)&&!/van-b/.test(r4.tekst)&&!/gegevens in het bestand/.test(r4.tekst),'K5 kopie van een ander account → geweigerd zonder aantallen of inhoud');
    const na=await dump();
    ok(na===voor,'K3 localStorage, offline-wachtrij en controleregister inhoudelijk ongewijzigd; databaseversies gelijk');
    ok((await page.evaluate(()=>window.__writes.length))===0,'K6 geen schrijfverzoeken naar de server');
    ok(errs.length===0,'K7 geen paginafouten'+(errs.length?(': '+errs.join(' | ')):''));
  }finally{ await browser.close(); }
  console.log('fRestorePreviewChromium: '+(n-fout)+' geslaagd, '+fout+' mislukt');
  if(fout)process.exitCode=1;
})().catch(e=>{console.error('FAIL',e&&e.stack||e);process.exitCode=1;});
