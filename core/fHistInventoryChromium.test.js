/* TK-REL-SEC-28 — historische inventaris in een ECHTE Chromium met echte localStorage, sessionStorage en IndexedDB
 * (fase 3, 19-10-2026). Laadt index.html (file://) en gebruikt de functies van de app zelf.
 *  C1 echte bronnen: eigen trainingen, lopende training, oude naamruimte, onbekende sleutel, toestelinstelling,
 *     wachtrij-items van twee gebruikers → juiste statussen; indexedDB.databases() bevat alleen bekende databases;
 *  C2 niet-destructief: alle localStorage-/sessionStorage-waarden en de offline-wachtrij byte-gelijk; maurice_offline v1;
 *  C3 tweede inventarisatie: geen dubbele registraties;
 *  C4 onderbreking: put gooit midden in de scan (bij de bron 'lopende training') → gestopt; volgende run hervat en eindigt gelijk aan de ononderbroken stand;
 *  C5 accountwissel tijdens de scan → gestopt, geen verzoek met het token van B;
 *  C6 scherm: aantallen zichtbaar; "Veilig om te verwijderen" uitgeschakeld;
 *  C7 geen paginafouten.
 * Zonder Chromium (quality gate zonder Playwright): SKIP; de Chromium-workflow faalt op een SKIP. */
'use strict';
const path=require('path');
const ROOT=path.join(__dirname,'..');
let chromium; try{ chromium=require('playwright').chromium; }catch(e){ chromium=null; }
let n=0,fout=0;
const ok=(c,l)=>{ n++; if(c)console.log('  ok  '+l); else { fout++; console.log('MISLUKT: '+l); } };
(async function(){
  let browser=null;
  if(chromium){ try{ browser=await chromium.launch(); }catch(e){ browser=null; } }
  if(!browser){ console.log('fHistInventoryChromium: SKIP (Chromium niet beschikbaar in deze omgeving)'); return; }
  try{
    const page=await browser.newPage({viewport:{width:360,height:900}});
    const errs=[]; page.on('pageerror',e=>errs.push(e.message));
    await page.goto('file://'+path.join(ROOT,'index.html'),{waitUntil:'domcontentloaded',timeout:30000}); await page.waitForTimeout(500);
    const r=await page.evaluate(async function(){
      const uit={};
      authSession={user:{id:'A'},access_token:'tA',refresh_token:'rA'}; SB_H.Authorization='Bearer tA';
      window.flushOfflineQueue=async function(){};
      const T={custom_trainings:[{id:'ct1',user_id:'A',naam:'Push',kleur:null,notitie:null,source:null,metadata:null}],
        custom_training_exercises:[{id:'x1',user_id:'A',custom_training_id:'ct1',exercise_id:'squat',sets:null,reps:null,rpe:null,rest:null,pick:null}]};
      const tokens=[]; let wisselBijGet=false;
      window.fetch=async function(url,init){
        init=init||{}; const u=new URL(url); const t=u.pathname.split('/').pop(); const m=init.method||'GET';
        tokens.push(m+' '+((init.headers&&init.headers.Authorization)||''));
        const antw=(s,b)=>({ok:s>=200&&s<300,status:s,headers:{get:()=>null},text:async()=>JSON.stringify(b),json:async()=>b});
        if(m!=='GET')return antw(500,{});
        if(wisselBijGet){ authSession={user:{id:'B'},access_token:'tB',refresh_token:'rB'}; SB_H.Authorization='Bearer tB'; }
        const uid=(init.headers.Authorization==='Bearer tA')?'A':'B'; let rows=(T[t]||[]).filter(x=>x.user_id===uid);
        u.searchParams.forEach((v,k)=>{ if(v.indexOf('in.(')===0){ const l=v.slice(4,-1).split(',').map(x=>x.replace(/^"|"$/g,'')); rows=rows.filter(x=>l.indexOf(String(x[k]))>=0); } });
        return antw(200,rows);
      };
      // Bronnen opzetten (zoals een bestaand toestel van A)
      localStorage.clear(); sessionStorage.clear();
      const training=(id,naam,ex)=>({id,name:naam,color:'#111111',note:'',exercises:ex,source:null,metadata:null,exercise_targets:ex.map(e=>({exercise_id:e,sets:null,reps:null,rpe:null,rest:null,pick:null}))});
      localStorage.setItem('tk_cache_owner_uid','A');
      localStorage.setItem('tk_trainings',JSON.stringify([training('ct1','Push',['squat']),training('ct9','Lokaal',['row'])]));
      localStorage.setItem('tk_draft_training',JSON.stringify({t:'kracht',sessionLog:{},ts:1}));
      localStorage.setItem('maurice_trainings','[]');
      localStorage.setItem('onbekende_sleutel','x');
      localStorage.setItem('tk_theme','dark');
      localStorage.setItem('tk_auth_session',JSON.stringify({access_token:'GEHEIM'}));
      sessionStorage.setItem('tk_active_org_pref_v1','org1');
      const db=await offlineDb(); await new Promise(res=>{ const tx=db.transaction(OFFLINE_STORE,'readwrite'); tx.objectStore(OFFLINE_STORE).clear(); tx.oncomplete=res; });
      await offlineQueueAdd({table:'sessions',method:'POST',body:{id:'qa',exercise_id:'squat'}},'A');
      await offlineQueueAdd({table:'sessions',method:'POST',body:{id:'qb',exercise_id:'row'}},'B');
      const dump=()=>JSON.stringify([Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)]),Object.keys(sessionStorage).sort().map(k=>[k,sessionStorage.getItem(k)])]);
      const qdump=async()=>JSON.stringify(await offlineQueueAll());
      const voor=dump(), qvoor=await qdump();
      const hist=async()=>(await tkVerifyLeesRegister()).filter(x=>x.soort==='historisch'&&x.scanner==='A');
      // C1–C2
      const u1=await tkInventariseerHistorie();
      const rs=await hist(); const st=(b,k)=>(rs.find(x=>x.bron===b&&x.record_sleutel===k)||{}).status;
      uit.c1={ok:u1.ok,volledig:u1.volledig,redenen:u1.redenen,ct1:st('eigen_trainingen','id:ct1'),ct9:st('eigen_trainingen','id:ct9'),concept:st('actieve_training','tk_draft_training'),
        legacy:st('namespace_legacy','maurice_trainings'),onbekend:st('localStorage:onbekend','onbekende_sleutel'),thema:st('thema','tk_theme'),
        qa:rs.filter(x=>x.bron==='offline_wachtrij').map(x=>x.status).sort().join(','),dbs:(await indexedDB.databases()).map(d=>d.name+':'+d.version).sort(),
        geheim:JSON.stringify(rs).indexOf('GEHEIM')>=0};
      uit.c2={ls:dump()===voor,q:(await qdump())===qvoor};
      // C3
      const n1=rs.length; const u2=await tkInventariseerHistorie(); const rs2=await hist();
      uit.c3={ok:u2.ok,n1,n2:rs2.length,uniek:new Set(rs2.map(x=>x.key)).size,nieuweRun:u2.run_id!==u1.run_id};
      // C4: put gooit vanaf de 3e aanroep binnen een nieuwe run
      localStorage.setItem('tk_coach_style','kort'); // nieuwe bron → nieuwe run nodig
      const echtPut=IDBObjectStore.prototype.put; let tel=0;
      IDBObjectStore.prototype.put=function(v){ if(v&&v.soort==='historisch'&&v.bron==='actieve_training'){ tel++; throw new DOMException('vol','QuotaExceededError'); } return echtPut.apply(this,arguments); }; // crash midden in de scan
      const u3=await tkInventariseerHistorie();
      IDBObjectStore.prototype.put=echtPut;
      const u4=await tkInventariseerHistorie(); const rs4=await hist();
      uit.c4={u3:u3.ok+':'+u3.reden,u4ok:u4.ok,hervat:u4.hervat,over:u4.overgeslagen,uniek:new Set(rs4.map(x=>x.key)).size,
        coach:(rs4.find(x=>x.bron==='coach_stijl')||{}).status,ls:dump()===JSON.stringify([JSON.parse(voor)[0].concat([['tk_coach_style','kort']]).sort((a,b)=>a[0]<b[0]?-1:1),JSON.parse(voor)[1]])};
      // C5
      localStorage.setItem('tk_coach_style','lang'); tokens.length=0; wisselBijGet=true;
      const u5=await tkInventariseerHistorie(); wisselBijGet=false;
      uit.c5={reden:u5.reden,b:tokens.filter(x=>x.indexOf('Bearer tB')>=0).length};
      authSession={user:{id:'A'},access_token:'tA',refresh_token:'rA'}; SB_H.Authorization='Bearer tA';
      // C6
      go('s-help');
      const u6=await tkInventariseerHistorieToon();
      uit.c6={ok:u6&&u6.ok,tekst:document.getElementById('help-update-inv-body').textContent,veilig:document.getElementById('help-update-safe').disabled,knop:!!document.getElementById('help-update-inv')};
      return uit;
    });
    ok(r.c1.ok===true&&r.c1.volledig===true,'C1 inventaris voltooid en volledig (echte localStorage, sessionStorage, IndexedDB)'+(r.c1.redenen.length?(': '+JSON.stringify(r.c1.redenen)):''));
    ok(r.c1.ct1==='HIST_GEKOPPELD'&&r.c1.ct9==='HIST_NIET_GEVONDEN','C1 eigen training gelijk aan de server → GEKOPPELD; alleen lokaal → NIET_GEVONDEN');
    ok(r.c1.concept==='HIST_NIET_VERIFIEERBAAR'&&r.c1.legacy==='HIST_EIGENAARLOOS'&&r.c1.onbekend==='HIST_ONBEKENDE_BRON'&&r.c1.thema==='HIST_NIET_PERSOONLIJK','C1 concept, oude naamruimte, onbekende sleutel en toestelinstelling juist ingedeeld');
    ok(r.c1.qa==='HIST_ANDERE_EIGENAAR,HIST_WACHTRIJ','C1 echte wachtrij: eigen item WACHTRIJ, item van B ANDERE_EIGENAAR');
    ok(r.c1.dbs.indexOf('maurice_offline:1')>=0&&r.c1.dbs.indexOf('tk_verificatie:1')>=0&&r.c1.dbs.length===2,'C1/C2 echte databases: alleen maurice_offline v1 en tk_verificatie v1 ('+r.c1.dbs.join(', ')+')');
    ok(r.c2.ls&&r.c2.q&&!r.c1.geheim,'C2 localStorage, sessionStorage en wachtrij byte-gelijk; geen sessie-inhoud in het register');
    ok(r.c3.ok&&r.c3.nieuweRun&&r.c3.n1===r.c3.n2&&r.c3.uniek===r.c3.n2,'C3 tweede inventarisatie: geen dubbele registraties ('+r.c3.n2+')');
    ok(r.c4.u3==='false:opslag_mislukt'&&r.c4.u4ok&&r.c4.hervat===true&&r.c4.over>0&&r.c4.coach==='HIST_NIET_VERIFIEERBAAR','C4 onderbreking halverwege → volgende run hervat en rondt af ('+r.c4.over+' bronnen overgeslagen)');
    ok(r.c4.ls,'C4 lokale gegevens ongewijzigd na onderbreking en hervatten');
    ok(r.c5.reden==='account_gewisseld'&&r.c5.b===0,'C5 accountwissel tijdens de scan → gestopt, geen verzoek met het token van B');
    ok(r.c6.ok&&/lokale gegevens geïnventariseerd/.test(r.c6.tekst)&&/Geblokkeerd/.test(r.c6.tekst)&&/geen toestemming om de app te verwijderen/.test(r.c6.tekst),'C6 scherm toont de inventaris');
    ok(r.c6.veilig===true&&r.c6.knop===true,'C6 "Veilig om te verwijderen" uitgeschakeld; inventarisknop aanwezig');
    ok(errs.length===0,'C7 geen paginafouten'+(errs.length?(': '+errs.join(' | ')):''));
  }finally{ await browser.close(); }
  console.log('fHistInventoryChromium: '+(n-fout)+' geslaagd, '+fout+' mislukt');
  if(fout)process.exitCode=1;
})().catch(e=>{console.error('FAIL',e&&e.stack||e);process.exitCode=1;});
