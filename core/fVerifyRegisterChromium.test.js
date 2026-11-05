/* TK-REL-SEC-24 — verificatieregister en "Controleren met de server" in een ECHTE Chromium met echte IndexedDB
 * (read-after-write fase 2, 19-10-2026). Laadt index.html (file://) en gebruikt de functies van de app zelf.
 *  B1 bestaande offline-wachtrij (maurice_offline v1) blijft ongewijzigd: zelfde items, zelfde databaseversie;
 *     het register staat in een aparte database (tk_verificatie) met store "register";
 *  B2 echte IndexedDB: write → revisie 1, PATCH → revisie 2, verwijderen van alle kinderen van een ouder;
 *  B3 opslagfout: de registerdatabase is niet te openen → defect-markering, de write blijft bevestigd;
 *  B4 transactie breekt af (put gooit binnen de transactie) → defect-markering;
 *  B5 "Controleren met de server" in de echte pagina: aantallen per status, "Veilig om te verwijderen" uitgeschakeld;
 *  B6 leesverzoeken gaan alleen met het token van de eigenaar; een accountwissel stopt de controle;
 *  B7 geen paginafouten.
 * Zonder Chromium (quality gate zonder Playwright): SKIP; de Chromium-workflow faalt op een SKIP. */
'use strict';
const path=require('path'),assert=require('assert');
const ROOT=path.join(__dirname,'..');
let chromium; try{ chromium=require('playwright').chromium; }catch(e){ chromium=null; }
let n=0,fout=0;
const ok=(c,l)=>{ n++; if(c)console.log('  ok  '+l); else { fout++; console.log('MISLUKT: '+l); } };
(async function(){
  let browser=null;
  if(chromium){ try{ browser=await chromium.launch(); }catch(e){ browser=null; } }
  if(!browser){ console.log('fVerifyRegisterChromium: SKIP (Chromium niet beschikbaar in deze omgeving)'); return; }
  try{
    const page=await browser.newPage({viewport:{width:360,height:900}});
    const errs=[]; page.on('pageerror',e=>errs.push(e.message));
    await page.goto('file://'+path.join(ROOT,'index.html'),{waitUntil:'domcontentloaded',timeout:30000}); await page.waitForTimeout(500);
    const r=await page.evaluate(async function(){
      const uit={};
      const wacht=ms=>new Promise(res=>setTimeout(res,ms));
      authSession={user:{id:'A'},access_token:'tA',refresh_token:'rA'}; SB_H.Authorization='Bearer tA';
      window.flushOfflineQueue=async function(){};
      // In-page nep-server: rijen per tabel; leest select/in-filters; registreert het gebruikte token.
      const T={sessions:[],training_instances:[]}, tokens=[];
      let wisselBijGet=false;
      window.fetch=async function(url,init){
        init=init||{}; const u=new URL(url); const t=u.pathname.split('/').pop(); const m=init.method||'GET';
        tokens.push(m+' '+((init.headers&&init.headers.Authorization)||''));
        const antw=(s,b)=>({ok:s>=200&&s<300,status:s,headers:{get:()=>null},text:async()=>JSON.stringify(b),json:async()=>b});
        if(m==='GET'){ if(wisselBijGet){ authSession={user:{id:'B'},access_token:'tB',refresh_token:'rB'}; SB_H.Authorization='Bearer tB'; }
          const p=u.searchParams; let rows=(T[t]||[]).slice();
          p.forEach((v,k)=>{ if(v.indexOf('in.(')===0){ const l=v.slice(4,-1).split(',').map(x=>x.replace(/^"|"$/g,'')); rows=rows.filter(r=>l.indexOf(String(r[k]))>=0); } });
          return antw(200,rows); }
        if(m==='POST'){ const b=JSON.parse(init.body); (T[t]=T[t]||[]).push(Object.assign({user_id:'A'},b)); return antw(201,[b]); }
        if(m==='PATCH'){ const id=u.searchParams.get('id').slice(3); const r0=(T[t]||[]).find(r=>r.id===id); if(r0)Object.assign(r0,JSON.parse(init.body)); return antw(200,r0?[r0]:[]); }
        if(m==='DELETE'){ const id=u.searchParams.get('id'); if(id)T[t]=(T[t]||[]).filter(r=>r.id!==id.slice(3)); return antw(204,null); }
      };
      // B1: bestaande wachtrij
      const leeg=async function(){ const db=await offlineDb(); await new Promise(ok=>{ const tx=db.transaction(OFFLINE_STORE,'readwrite'); tx.objectStore(OFFLINE_STORE).clear(); tx.oncomplete=ok; }); };
      await leeg();
      await offlineQueueAdd({table:'goals',method:'POST',body:{naam:'oud'}},'A');
      const voor=JSON.stringify((await offlineQueueAll()).map(i=>[i.table,i.body&&i.body.naam,i.owner_uid]));
      await sbPostQ('sessions',{id:'s1',exercise_id:'squat',reps:8});
      await wacht(100);
      const na=JSON.stringify((await offlineQueueAll()).map(i=>[i.table,i.body&&i.body.naam,i.owner_uid]));
      const dbs=(indexedDB.databases?await indexedDB.databases():[]).map(d=>d.name+':'+d.version).sort();
      uit.b1={voor,na,dbs};
      // B2
      let rows=await tkVerifyLeesRegister();
      uit.b2a=(rows.find(x=>x.record_id==='s1')||{}).revisie;
      await sbPatchQ('sessions','id=eq.s1',{reps:9}); await wacht(100);
      rows=await tkVerifyLeesRegister(); const e=rows.find(x=>x.record_id==='s1'); uit.b2b=[e.revisie,e.verwacht.reps];
      await sbPostQ('custom_training_exercises',{id:'e1',custom_training_id:'ct1',exercise_id:'x'});
      await sbDelQ('custom_training_exercises','custom_training_id=eq.ct1'); await wacht(100);
      uit.b2c=(await tkVerifyLeesRegister()).find(x=>x.record_id==='e1').verwijderd;
      // B3
      localStorage.removeItem(TK_VERIFY_DEFECT_KEY);
      const echt=indexedDB.open.bind(indexedDB); indexedDB.open=function(naam,v){ if(naam==='tk_verificatie')throw new Error('stuk'); return echt(naam,v); }; // alleen het register faalt
      const u3=await sbPostQ('sessions',{id:'s3',exercise_id:'squat'},{detail:true}); await wacht(50);
      indexedDB.open=echt; uit.b3=[u3.status,tkVerifyDefect()];
      // B4
      localStorage.removeItem(TK_VERIFY_DEFECT_KEY);
      const put=IDBObjectStore.prototype.put; IDBObjectStore.prototype.put=function(){ throw new DOMException('vol','QuotaExceededError'); };
      const u4=await sbPostQ('sessions',{id:'s4',exercise_id:'squat'},{detail:true}); await wacht(150);
      IDBObjectStore.prototype.put=put; uit.b4=[u4.status,tkVerifyDefect()];
      localStorage.removeItem(TK_VERIFY_DEFECT_KEY);
      // B5
      go('s-help');
      const res=await tkVerifieerMetServerToon();
      uit.b5={ok:res&&res.ok,tekst:document.getElementById('help-update-verify-body').textContent,
        veiligDisabled:document.getElementById('help-update-safe').disabled,knop:!!document.getElementById('help-update-verify'),
        tokens:tokens.filter(x=>x.indexOf('GET')===0)};
      // B6
      wisselBijGet=true; tokens.length=0;
      const r6=await tkVerifieerMetServer();
      uit.b6={reden:r6.reden,getB:tokens.filter(x=>x==='GET Bearer tB').length};
      return uit;
    });
    ok(r.b1.voor===r.b1.na,'B1 wachtrij-items ongewijzigd na registreren');
    ok(r.b1.dbs.indexOf('maurice_offline:1')>=0&&r.b1.dbs.indexOf('tk_verificatie:1')>=0,'B1 maurice_offline blijft versie 1; register in aparte database tk_verificatie ('+r.b1.dbs.join(', ')+')');
    ok(r.b2a===1&&r.b2b[0]===2&&r.b2b[1]===9,'B2 echte IndexedDB: revisie 1 → 2 met aangevulde verwachting');
    ok(r.b2c===true,'B2 verwijderen van alle kinderen van een ouder markeert het kind als verwijderd');
    ok(r.b3[0]==='confirmed'&&r.b3[1]===true,'B3 registerdatabase niet te openen → defect-markering, write bevestigd');
    ok(r.b4[0]==='confirmed'&&r.b4[1]===true,'B4 put gooit binnen de transactie (abort) → defect-markering');
    ok(r.b5.ok===true&&/bevestigd op de server/.test(r.b5.tekst)&&/geen toestemming om de app te verwijderen/.test(r.b5.tekst),'B5 echte pagina: aantallen en statussen zichtbaar, geen toestemming');
    ok(r.b5.veiligDisabled===true&&r.b5.knop===true,'B5 "Veilig om te verwijderen" uitgeschakeld; "Controleren met de server" aanwezig');
    ok(r.b5.tokens.length>0&&r.b5.tokens.every(x=>x==='GET Bearer tA'),'B6 leesverzoeken alleen met het token van de eigenaar');
    ok(r.b6.reden==='account_gewisseld'&&r.b6.getB===0,'B6 accountwissel tijdens teruglezen → gestopt, geen leesverzoek met het token van B');
    ok(errs.length===0,'B7 geen paginafouten'+(errs.length?(': '+errs.join(' | ')):''));
  }finally{ await browser.close(); }
  console.log('fVerifyRegisterChromium: '+(n-fout)+' geslaagd, '+fout+' mislukt');
  if(fout)process.exitCode=1;
})().catch(e=>{console.error('FAIL',e&&e.stack||e);process.exitCode=1;});
