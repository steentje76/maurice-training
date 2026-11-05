/* TK-REL-SEC-27 — historische inventaris en basismeting in de app (fase 3, 19-10-2026).
 * Draait het ECHTE fase-2-blok en het ECHTE inventarisblok uit index.html (vm), met een mini-IndexedDB, een
 * Web-Storage-nabootsing (key/length) en een nep-server (RLS per gebruiker).
 *  A1 basismeting: identieke eigen training → HIST_GEKOPPELD; afwijkend → AFWIJKEND; niet op de server → NIET_GEVONDEN;
 *     concept → NIET_VERIFIEERBAAR; thema → NIET_PERSOONLIJK; wachtrij → WACHTRIJ; nooit SERVER_VERIFIED;
 *  A2 niet-destructief: localStorage, sessionStorage en de offline-wachtrij zijn na de inventaris byte-gelijk; geen writes;
 *  A3 herhaalde inventarisatie: geen dubbele registraties, eerst_gezien blijft, nieuwe run;
 *  A4 onderbreking halverwege (transactie breekt af): hervat, afgeronde bronnen overgeslagen, eindstand gelijk aan een
 *     ononderbroken run;
 *  A5 accountwissel tijdens de scan: stop, geen verzoek met het token van B, niets meer vastgelegd, run blijft open;
 *  A6 meerdere gebruikers op één toestel: B ziet de gegevens van A als ANDERE_EIGENAAR en leest ze niet bij de server;
 *  A7 offline: vergelijking niet mogelijk → HIST_ONBEKEND; inventaris wel voltooid;
 *  A8 onleesbaar: kapotte JSON of onleesbare wachtrij → inventaris onvolledig, poort niet geïnventariseerd;
 *  A9 bron verandert tijdens de scan → niet afgerond; volgende run rondt af;
 *  A10 verouderde inventaris (lokale wijziging na afronding) → poort weer niet geïnventariseerd;
 *  A11 rij van een andere eigenaar (RLS verbergt hem) → NIET_GEVONDEN, niet gekoppeld;
 *  A12 telemetrie bevat alleen aantallen;
 *  A13 poort fase 2: voltooide inventaris → historie geïnventariseerd, maar geblokkeerde gegevens houden de poort dicht;
 *  A15 een bron die tijdens de scan wijzigt: alleen records van de laatst verwerkte bronversie tellen;
 *  A14 scherm: aantallen en statussen; "Veilig om te verwijderen" blijft uitgeschakeld (geen code zet hem aan). */
'use strict';
const assert=require('assert');
const {maak,fn,grab,db,koppel,HTML}=require('./fixtures/schrijfHarnas');
const {maakIndexedDb}=require('./fixtures/miniIndexedDb');
let klaar=false,n=0;
process.on('exit',()=>{if(!klaar){console.error('FAIL niet alle scenario\'s afgerond (hangende promise)');process.exitCode=1;}});
const RED=!!process.env.TK_RED;
const check=(ok,label)=>{ if(RED){ n++; console.log(ok?'PASS':'RED ',label); return; } assert(ok,label);n++;console.log('PASS',label);};
const stap=async(f)=>{ try{ await f(); }catch(e){ if(!RED)throw e; console.log('RED  (scenario afgebroken: '+String(e&&e.message||e).slice(0,80)+')'); } };
const BLOK2=HTML.indexOf('// HISTORISCHE INVENTARIS EN BASISMETING, FASE 3')>=0?grab('// SERVER READ-AFTER-WRITE, FASE 2','// HISTORISCHE INVENTARIS EN BASISMETING, FASE 3'):grab('// SERVER READ-AFTER-WRITE, FASE 2','function updateOfflineBadge(){');
let BLOK3=''; try{ BLOK3=grab('// HISTORISCHE INVENTARIS EN BASISMETING, FASE 3','function updateOfflineBadge(){'); }catch(_){ BLOK3=''; }
const HULP=[fn('function tkTrainingOefendoelen('),fn('function tkTrainingInhoud(')].join('\n')+'\n'+(HTML.indexOf('function tkTrainingVanServer(')>=0?fn('function tkTrainingVanServer('):'');
const wacht=ms=>new Promise(r=>setTimeout(r,ms));
// Web Storage met key()/length, zoals de browser.
function opslag(init){
  const m=new Map(Object.entries(init||{}));
  return {get length(){return m.size;},key:i=>[...m.keys()][i]===undefined?null:[...m.keys()][i],getItem(k){ this._gelezen.push(k); return m.has(k)?m.get(k):null; },
    setItem:(k,v)=>{m.set(k,String(v));},removeItem:k=>{m.delete(k);},_dump:()=>JSON.stringify([...m.entries()].sort()),_gelezen:[]};
}
const TRAINING=(id,naam,ex)=>({id,name:naam,color:'#111111',note:'',exercises:ex,source:null,metadata:null,exercise_targets:ex.map(e=>({exercise_id:e,sets:null,reps:null,rpe:null,rest:null,pick:null}))});
function opzet(o){
  o=o||{};
  const logs=[];
  const ls=opslag(Object.assign({tk_cache_owner_uid:'A'},o.ls||{})), ss=opslag(o.ss||{});
  const idb=maakIndexedDb(o.fouten);
  const h=maak({extraSrc:HULP+'\n'+BLOK2+'\n'+BLOK3,online:o.online,ctx:Object.assign({indexedDB:idb,localStorage:ls,sessionStorage:ss,
    ServerVerificationCore:require('./serverVerification.js'),LocalInventoryCore:require('./localInventory.js'),
    flushOfflineQueue:async()=>{},renderOfflineQueueModal(){},escHtml:x=>String(x),AUTH_SESSION_KEY:'tk_auth_session',CACHE_OWNER_KEY:'tk_cache_owner_uid',
    ObservabilityCore:{tkLog:function(){logs.push(JSON.stringify([].slice.call(arguments)));}}},o.ctx||{})});
  const d=db();koppel(h,d);
  d.zichtbaar=(t,r,uid)=>!r.user_id||r.user_id===uid;
  return {h,d,ls,ss,idb,logs};
}
const hist=async(h)=>{ await wacht(10); return (await h.ctx.tkVerifyLeesRegister()).filter(x=>x.soort==='historisch'); };
const vanBron=(rs,b)=>rs.filter(r=>r.bron===b);
const serverTraining=(d,id,uid,naam,ex)=>{ d.tabel('custom_trainings').push({id,user_id:uid,naam,kleur:null,notitie:null,source:null,metadata:null});
  ex.forEach((e,i)=>d.tabel('custom_training_exercises').push({id:id+'-'+i,user_id:uid,custom_training_id:id,exercise_id:e,sets:null,reps:null,rpe:null,rest:null,pick:null,sort_order:i})); };
function standaard(extra){
  return Object.assign({tk_trainings:JSON.stringify([TRAINING('ct1','Push',['squat','bench']),TRAINING('ct2','Pull',['row']),TRAINING('ct3','Benen',['lunge'])]),
    tk_draft_training:JSON.stringify({t:'kracht',sessionLog:{squat:[{kg:60,reps:8}]},ts:1}),tk_theme:'dark',tk_coach_style:'kort',
    tk_auth_session:JSON.stringify({access_token:'GEHEIM-TOKEN',refresh_token:'R1'})},extra||{});
}
function standaardServer(d){ serverTraining(d,'ct1','A','Push',['squat','bench']); serverTraining(d,'ct2','A','Pull',['deadlift']); }

async function main(){
  const bestaat=typeof (opzet().h.ctx.tkInventariseerHistorie)==='function';
  check(bestaat,'A0 inventarisfunctie aanwezig in de app');
  if(!bestaat&&RED){ console.log('RED  (alle A-scenario\'s: functie ontbreekt in de oude code)'); klaar=true; return; }
  // A1 + A2 + A12 + A13
  await stap(async()=>{ const {h,d,ls,ss,logs}=opzet({ls:standaard(),ss:{tk_active_org_pref_v1:'org1'}});
    standaardServer(d);
    h.st.queue.push({id:7,item:{table:'sessions',method:'POST',body:{id:'s9',exercise_id:'squat'}},eigenaar:'A'});
    const voorLs=ls._dump(), voorSs=ss._dump(), voorQ=JSON.stringify(h.st.queue);
    const u=await h.ctx.tkInventariseerHistorie();
    const rs=await hist(h);
    const st=(b,rk)=>(rs.find(r=>r.bron===b&&r.record_sleutel===rk)||{}).status;
    check(u.ok===true&&u.volledig===true,'A1 inventaris voltooid en volledig');
    check(st('eigen_trainingen','id:ct1')==='HIST_GEKOPPELD','A1 identieke eigen training → HIST_GEKOPPELD');
    check(st('eigen_trainingen','id:ct2')==='HIST_AFWIJKEND'&&st('eigen_trainingen','id:ct3')==='HIST_NIET_GEVONDEN','A1 afwijkende → AFWIJKEND; niet op de server → NIET_GEVONDEN');
    check(st('actieve_training','tk_draft_training')==='HIST_NIET_VERIFIEERBAAR'&&st('thema','tk_theme')==='HIST_NIET_PERSOONLIJK'&&st('offline_wachtrij','item:7')==='HIST_WACHTRIJ','A1 concept, toestelinstelling en wachtrij-item juist ingedeeld');
    check(!rs.some(r=>r.status==='SERVER_VERIFIED')&&!(await h.ctx.tkVerifyLeesRegister()).some(r=>r.soort==='record'),'A1 geen enkel historisch record SERVER_VERIFIED; geen fase-2-registeritems aangemaakt');
    check(u.samenvatting.overeenkomend===1&&u.samenvatting.geinventariseerd===rs.length&&u.samenvatting.geblokkeerd===5,'A1 samenvatting: '+u.samenvatting.geinventariseerd+' geïnventariseerd, 1 overeenkomend, '+u.samenvatting.geblokkeerd+' geblokkeerd');
    check(ls._dump()===voorLs&&ss._dump()===voorSs&&JSON.stringify(h.st.queue)===voorQ,'A2 localStorage, sessionStorage en offline-wachtrij byte-gelijk na de inventaris');
    check(h.st.req.every(r=>r.method==='GET'),'A2 alleen leesverzoeken naar de server');
    check(!rs.some(r=>/GEHEIM|Push|squat/.test(JSON.stringify(r))),'A2 register bevat alleen vingerafdrukken en statussen, geen inhoud of tokens');
    check(ls._gelezen.indexOf('tk_auth_session')<0,'A2 de inlogsessie wordt niet uitgelezen (alleen aanwezigheid)');
    const v=logs.filter(l=>/inventory_run/.test(l));
    check(v.length===1&&!/ct1|Push|squat|GEHEIM|org1/.test(v[0]),'A12 telemetrie: alleen aantallen');
    const r2=await h.ctx.tkVerifieerMetServer();
    check(r2.ok&&r2.historieGeinventariseerd===true&&r2.poort.toegestaan===false&&r2.poort.redenen.indexOf('historische_gegevens_buiten_register')>=0&&r2.poort.redenen.indexOf('historie_niet_geinventariseerd')<0,'A13 poort: historie geïnventariseerd, geblokkeerde gegevens houden hem dicht');
    // A3
    const eerst=rs.find(r=>r.record_sleutel==='id:ct1').eerst_gezien;
    await wacht(5);
    const u2=await h.ctx.tkInventariseerHistorie(); const rs2=await hist(h);
    check(u2.ok&&u2.run_id!==u.run_id&&rs2.length===rs.length&&new Set(rs2.map(r=>r.key)).size===rs2.length,'A3 tweede inventarisatie: nieuwe run, geen dubbele registraties ('+rs2.length+')');
    check(rs2.find(r=>r.record_sleutel==='id:ct1').eerst_gezien===eerst&&u2.samenvatting.geinventariseerd===u.samenvatting.geinventariseerd,'A3 eerst_gezien behouden; zelfde aantallen');
    check(ls._dump()===voorLs&&JSON.stringify(h.st.queue)===voorQ,'A3 ook na de tweede run byte-gelijk'); });
  // A4
  await stap(async()=>{ const ref=opzet({ls:standaard()}); standaardServer(ref.d); const ur=await ref.h.ctx.tkInventariseerHistorie(); const rsr=await hist(ref.h);
    const {h,d}=opzet({ls:standaard(),fouten:{abortTxNummer:3}}); standaardServer(d);
    const u1=await h.ctx.tkInventariseerHistorie();
    check(u1.ok===false&&u1.reden==='opslag_mislukt'&&u1.verwerkt.length===1,'A4 crash halverwege (3e schrijftransactie breekt af) → gestopt na 1 bron');
    const vg=(await h.ctx.tkVerifyLeesRegister()).find(x=>x.soort==='inventaris');
    check(vg&&vg.status==='bezig','A4 voortgang blijft "bezig"');
    const u2=await h.ctx.tkInventariseerHistorie(); const rs=await hist(h);
    check(u2.ok&&u2.hervat===true&&u2.overgeslagen===1&&u2.run_id===vg.run_id,'A4 volgende run hervat dezelfde run en slaat de afgeronde bron over');
    const sig=x=>x.map(r=>r.bron+'|'+r.record_sleutel+'|'+r.status).sort().join();
    check(sig(rs)===sig(rsr)&&u2.samenvatting.geblokkeerd===ur.samenvatting.geblokkeerd,'A4 eindstand gelijk aan een ononderbroken run, zonder dubbele registraties'); });
  // A5
  await stap(async()=>{ const {h,d}=opzet({ls:standaard()}); standaardServer(d);
    h.net.voor=req=>{ if(req.method==='GET'&&/custom_trainings/.test(req.url))h.login('B'); };
    const u=await h.ctx.tkInventariseerHistorie(); h.net.voor=null;
    check(u.ok===false&&u.reden==='account_gewisseld','A5 accountwissel tijdens de scan → gestopt');
    check(h.st.req.filter(r=>r.token==='Bearer tB').length===0,'A5 geen verzoek met het token van B');
    h.login('A');
    const rs=await hist(h), vg=(await h.ctx.tkVerifyLeesRegister()).find(x=>x.soort==='inventaris');
    check(vanBron(rs,'eigen_trainingen').length===0&&vg.status==='bezig','A5 de bron waarin gewisseld werd is niet vastgelegd; run blijft open'); });
  // A6
  await stap(async()=>{ const {h,d}=opzet({ls:standaard()}); standaardServer(d); h.login('B');
    h.st.queue.push({id:1,item:{table:'sessions',method:'POST',body:{id:'a1'}},eigenaar:'A'},{id:2,item:{table:'sessions',method:'POST',body:{id:'b1'}},eigenaar:'B'});
    const u=await h.ctx.tkInventariseerHistorie(); const rs=await hist(h);
    check(u.ok&&vanBron(rs,'eigen_trainingen').every(r=>r.status==='HIST_ANDERE_EIGENAAR'&&r.eigenaar==='A'&&r.scanner==='B'),'A6 scanner B: eigen trainingen van A → ANDERE_EIGENAAR');
    check(!h.st.req.some(r=>/custom_trainings/.test(r.url)),'A6 gegevens van A worden niet met het token van B bij de server gelezen');
    const q=vanBron(rs,'offline_wachtrij');
    check(q.find(r=>r.record_sleutel==='item:1').status==='HIST_ANDERE_EIGENAAR'&&q.find(r=>r.record_sleutel==='item:2').status==='HIST_WACHTRIJ','A6 wachtrij: item van A → ANDERE_EIGENAAR, eigen item → WACHTRIJ'); });
  // A7
  await stap(async()=>{ const {h,d}=opzet({ls:standaard(),online:false}); standaardServer(d);
    const u=await h.ctx.tkInventariseerHistorie(); const rs=await hist(h);
    check(u.ok&&vanBron(rs,'eigen_trainingen').every(r=>r.status==='HIST_ONBEKEND')&&h.st.req.length===0&&u.samenvatting.onbekend>=3,'A7 offline → eigen trainingen niet vergeleken (ONBEKEND), inventaris voltooid'); });
  // A8
  await stap(async()=>{ const {h}=opzet({ls:standaard({tk_trainings:'[{kapot'})});
    const u=await h.ctx.tkInventariseerHistorie();
    check(u.ok&&u.volledig===false&&u.redenen.some(x=>/eigen_trainingen/.test(x)),'A8 kapotte JSON → inventaris onvolledig');
    const p=await h.ctx.tkInvPoort('A');
    check(p.geinventariseerd===false,'A8 onvolledige inventaris → poort niet geïnventariseerd');
    const w=opzet({ls:standaard(),ctx:{tkLeesWachtrijStrikt:async()=>{ throw new Error('idb'); }}});
    const uw=await w.h.ctx.tkInventariseerHistorie();
    check(uw.ok&&uw.volledig===false&&(await w.h.ctx.tkInvPoort('A')).geinventariseerd===false,'A8 onleesbare wachtrij → onvolledig, poort niet geïnventariseerd');
    const r2=await h.ctx.tkVerifieerMetServer();
    check(r2.ok&&r2.historieGeinventariseerd===false&&r2.poort.redenen.indexOf('historie_niet_geinventariseerd')>=0,'A8 controle met de server: onvolledige inventaris telt niet als geïnventariseerd'); });
  // A15
  await stap(async()=>{ const {h,d,ls}=opzet({ls:standaard()}); standaardServer(d);
    let een=false; h.net.voor=req=>{ if(!een&&req.method==='GET'&&/custom_training_exercises/.test(req.url)){ een=true; ls.setItem('tk_trainings',JSON.stringify([TRAINING('ct1','Push',['squat','bench'])])); } };
    const u1=await h.ctx.tkInventariseerHistorie(); h.net.voor=null;
    const u2=await h.ctx.tkInventariseerHistorie();
    const ref=opzet({ls:standaard({tk_trainings:JSON.stringify([TRAINING('ct1','Push',['squat','bench'])])})}); standaardServer(ref.d);
    const ur=await ref.h.ctx.tkInventariseerHistorie();
    const st=await h.ctx.tkInvStatus('A');
    check(u1.ok===false&&u2.ok&&u2.samenvatting.geinventariseerd===ur.samenvatting.geinventariseerd&&!st.records.some(r=>r.record_sleutel==='id:ct3'),'A15 bron gewijzigd tijdens de scan: records van de oude bronversie tellen niet mee'); });
  // A9
  await stap(async()=>{ const {h,d,ls}=opzet({ls:standaard()}); standaardServer(d);
    let een=false; h.net.voor=req=>{ if(!een&&req.method==='GET'){ een=true; ls.setItem('tk_coach_style','lang'); } };
    const u=await h.ctx.tkInventariseerHistorie(); h.net.voor=null;
    check(u.ok===false&&u.reden==='gewijzigd_tijdens_scan','A9 bron verandert tijdens de scan → niet afgerond');
    const u2=await h.ctx.tkInventariseerHistorie();
    check(u2.ok&&u2.hervat===true,'A9 volgende run hervat en rondt af'); });
  // A10
  await stap(async()=>{ const {h,d,ls}=opzet({ls:standaard()}); standaardServer(d);
    await h.ctx.tkInventariseerHistorie();
    check((await h.ctx.tkInvPoort('A')).geinventariseerd===true,'A10 direct na afronding: geïnventariseerd');
    ls.setItem('tk_trainings',JSON.stringify([TRAINING('ct1','Push',['squat'])]));
    const p=await h.ctx.tkInvPoort('A');
    check(p.geinventariseerd===false&&p.reden==='verouderd','A10 lokale wijziging na afronding → verouderd, niet geïnventariseerd');
    ls.setItem('iets_onbekends','1'); ls.setItem('tk_trainings',JSON.stringify([TRAINING('ct1','Push',['squat','bench']),TRAINING('ct2','Pull',['row']),TRAINING('ct3','Benen',['lunge'])]));
    check((await h.ctx.tkInvPoort('A')).geinventariseerd===false,'A10 nieuwe, onbekende sleutel → verouderd'); });
  // A11
  await stap(async()=>{ const {h,d}=opzet({ls:standaard()}); serverTraining(d,'ct1','B','Push',['squat','bench']);
    await h.ctx.tkInventariseerHistorie(); const rs=await hist(h);
    check(rs.find(r=>r.record_sleutel==='id:ct1').status==='HIST_NIET_GEVONDEN','A11 identieke rij bij een andere eigenaar (RLS) → NIET_GEVONDEN, niet gekoppeld'); });
  // A14
  await stap(async()=>{ const el={textContent:'',innerHTML:''};
    const {h,d}=opzet({ls:standaard(),ctx:{document:{getElementById:id=>id==='help-update-inv-body'?el:null,querySelectorAll:()=>[],querySelector:()=>null}}}); standaardServer(d);
    await h.ctx.tkInventariseerHistorieToon();
    check(/lokale gegevens geïnventariseerd/.test(el.innerHTML)&&/Overeenkomend met de server: 1/.test(el.innerHTML)&&/Geblokkeerd: \d+/.test(el.innerHTML)&&/Onbekend: \d+/.test(el.innerHTML)&&/geen toestemming om de app te verwijderen/.test(el.innerHTML),'A14 scherm toont geïnventariseerd, overeenkomend, onbekend en geblokkeerd');
    check(/id="help-update-inv" onclick="tkInventariseerHistorieToon\(\)"/.test(HTML)&&/id="help-update-safe" disabled aria-disabled="true"/.test(HTML),'A14 knop "Lokale gegevens inventariseren" aanwezig; "Veilig om te verwijderen" uitgeschakeld');
    const zetAan=HTML.match(/help-update-safe[^\n]*(disabled\s*=\s*false|removeAttribute\(['"]disabled)/g);
    check(!zetAan&&(HTML.match(/help-update-safe/g)||[]).length===1,'A14 geen code die "Veilig om te verwijderen" inschakelt'); });
  klaar=true;console.log('TK-REL-SEC-27: '+n+'/'+n);
}
main().catch(e=>{console.error('FAIL',e&&e.stack||e);process.exitCode=1;});
