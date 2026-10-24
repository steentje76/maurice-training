/* TK-REL-SEC-33 — native Android-export van de versleutelde reddingskopie (20-10-2026).
 * Draait het ECHTE exportblok uit index.html en core/nativeBackupExport.js met een nep-plugin die het contract van
 * TkBestandOpslaanPlugin/TkExportSessie nabootst (de native kern zelf: TkExportSessieTest, JUnit).
 *  N1 geslaagde opslag → VERIFIED_READBACK, exacte melding, cloud-voorbehoud; bestand byte-gelijk aan de envelop;
 *  N2 gebruiker annuleert → CANCELLED, geen document;  N3 schrijven mislukt → WRITE_FAILED, document verwijderd;
 *  N4 teruglezen mislukt → READ_FAILED;  N5 teruggelezen bestand verschilt (native en webcontrole) → MISMATCH;
 *  N6 onvoldoende opslag → WRITE_FAILED "onvoldoende opslagruimte";  N7 app onderbroken tijdens opslag → markering,
 *     volgende keer waarschuwing; nooit als volledige back-up gemeld;  N8 accountwissel tijdens de delen en na
 *     terugkomst → ACCOUNT_CHANGED, document verwijderd;  N9 fout in de native bridge → nooit succes;
 *  N10 bestand met dezelfde naam → de werkelijk opgeslagen naam wordt gemeld;  N11 grote bestanden: 20 MB in
 *     begrensde delen; boven de grens geweigerd vóór de plugin;  N12 geen wachtzin of onversleutelde gegevens over de
 *     bridge of in logs; native code zonder logging, SharedPreferences of opslagrechten;  N13 webexport werkt
 *     ongewijzigd;  N14 de herstelpreview opent dezelfde kopie;  N15 oudere APK zonder plugin → geen schijnsucces;
 *  N16 verwijderen mislukt → expliciet gemeld;  N17 "Veilig om te verwijderen" blijft uitgeschakeld;
 *  N18 (TK-REL-SEC-34) exportoverzicht per bron: aanwezig, geëxporteerd, overgeslagen, niet exporteerbaar. */
'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),vm=require('vm');
const {webcrypto}=require('crypto');
const B=require('./localBackup'), M=require('./localInventory'), RP=require('./restorePreview');
let NX=null; try{ NX=require('./nativeBackupExport'); }catch(_){ NX=null; }
let n=0; const RED=!!process.env.TK_RED;
const check=(ok,label)=>{ if(RED){ n++; console.log(ok?'PASS':'RED ',label); return; } assert(ok,label);n++;console.log('PASS',label);};
const stap=async(f)=>{ try{ await f(); }catch(e){ if(!RED)throw e; console.log('RED  (scenario afgebroken: '+String(e&&e.message||e).slice(0,90)+')'); } };
const A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', Bu='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', PASS='een lange wachtzin voor test';
const ROOT=path.join(__dirname,'..');
const HTML=fs.readFileSync(path.join(ROOT,'index.html'),'utf8').replace(/\r\n/g,'\n');
const BLOK=(()=>{ const i=HTML.indexOf('// TK-REL-SEC-29: encrypted, intentionally partial recovery export.'); const j=HTML.indexOf('// TK-REL-SEC-31: HERSTELPREVIEW',i); return HTML.slice(i,j>i?j:HTML.indexOf('async function exportJSON(){',i)); })();
const sha=t=>require('crypto').createHash('sha256').update(Buffer.from(t,'ascii')).digest('hex');

// Nep-plugin: zelfde contract als TkBestandOpslaanPlugin (+ TkExportSessie). fout: {annuleer, schrijfBij, vol, leesFout,
// afwijkend, nativeLiegt, naam, bridgeBij, verwijderMislukt, onderbreekBij}
function nepPlugin(fout){
  fout=fout||{};
  const st={aanroepen:[],documenten:{},delen:[],bridge:[]};
  let sessie=null;
  const doc=()=>st.documenten[sessie.naam];
  const faal=(status,reden)=>{ const naam=sessie&&sessie.naam; let weg=false; if(naam&&!fout.verwijderMislukt){ delete st.documenten[naam]; weg=true; } sessie=null; return {status,reden,verwijderd:weg}; };
  const bridge=(m,arg)=>{ st.aanroepen.push(m); st.bridge.push(JSON.stringify(arg)); if(fout.bridgeBij===m)throw new Error('bridge: plugin niet bereikbaar'); };
  return {st,plugin:{
    async start(a){ bridge('start',a); if(fout.annuleer)return {status:'CANCELLED'};
      let naam=fout.naam||a.naam; if(st.documenten[naam]!==undefined)naam=naam.replace('.tkbackup',' (1).tkbackup');
      st.documenten[naam]=''; sessie={id:'s1',naam,grootte:a.grootte,sha:a.sha256,index:0}; return {status:'GEOPEND',sessie:'s1',naam}; },
    async schrijf(a){ bridge('schrijf',a); st.delen.push(a.data.length);
      if(!sessie||a.sessie!==sessie.id)return {status:'WRITE_FAILED',reden:'geen_sessie',verwijderd:false};
      if(fout.onderbreekBij===a.index)throw new Error('Activity destroyed');
      if(a.index!==sessie.index)return faal('WRITE_FAILED','volgorde');
      if(a.data.length>512*1024)return faal('WRITE_FAILED','deelgrootte');
      if(fout.vol&&a.index===0)return faal('WRITE_FAILED','opslag_vol');
      if(fout.schrijfBij===a.index)return faal('WRITE_FAILED','schrijven');
      st.documenten[sessie.naam]+=a.data; sessie.index++; return {status:'DEEL_OK',geschreven:st.documenten[sessie.naam].length}; },
    async voltooi(a){ bridge('voltooi',a); if(!sessie||a.sessie!==sessie.id)return {status:'WRITE_FAILED',reden:'geen_sessie'};
      const d=doc(); if(fout.leesFout)return faal('READ_FAILED','teruglezen');
      const terug=fout.afwijkend?d.slice(0,-2)+'X}':d;
      if(terug.length!==sessie.grootte||sha(terug)!==sessie.sha)return faal('MISMATCH','teruggelezen_inhoud_wijkt_af');
      if(fout.nativeLiegt)return {status:'VERIFIED_READBACK',grootte:terug.length,sha256:'0'.repeat(64),naam:sessie.naam};
      return {status:'VERIFIED_READBACK',grootte:terug.length,sha256:sha(terug),naam:sessie.naam}; },
    async afbreken(a){ bridge('afbreken',a); if(!sessie)return {status:'WRITE_FAILED',reden:'geen_sessie',verwijderd:false}; const r=faal(a.status,'afgebroken'); return {status:r.status,verwijderd:r.verwijderd}; },
    async afronden(a){ bridge('afronden',a); sessie=null; return {status:'AFGEROND'}; }
  }};
}
function opslag(init){ const m=new Map(Object.entries(init||{}));
  return {get length(){return m.size;},key:i=>[...m.keys()][i]===undefined?null:[...m.keys()][i],getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>{m.set(k,String(v));},removeItem:k=>{m.delete(k);},_m:m}; }
function app(o){
  o=o||{};
  const el={}; const veld=id=>(el[id]=el[id]||{value:'',textContent:'',files:null});
  veld('tk-backup-pass').value=PASS; veld('tk-backup-pass2').value=PASS;
  const st={downloads:[],logs:[]};
  const ls=o.ls||opslag({tk_cache_owner_uid:A,tk_trainings:JSON.stringify([{id:'ct1',name:'Geheim trainingsplan'}]),tk_draft_training:JSON.stringify({t:'Plaintext concept'})});
  const nep=o.nep||nepPlugin(o.fout);
  const log=(...x)=>st.logs.push(x.map(String).join(' '));
  const ctx={console:{log,warn:log,error:log,info:log},localStorage:ls,authSession:{user:{id:A}},tkEigenaarUid:()=>ctx.authSession&&ctx.authSession.user.id,
    LocalInventoryCore:M,TKLocalBackup:B,TKNativeExport:NX||undefined,document:{getElementById:veld},td:()=>'2026-10-20',
    downloadFile:(d,naam)=>st.downloads.push({d,naam}),tkLeesWachtrijStrikt:async()=>o.queue||[],offlineQueueAll:async()=>o.queue||[],
    TextEncoder,TextDecoder,setTimeout,Promise,Date,JSON};
  ctx.window=ctx; ctx.crypto=webcrypto; ctx.globalThis=ctx;
  if(o.native!==false)ctx.Capacitor={isNativePlatform:()=>true,Plugins:o.geenPlugin?{}:{TkBestandOpslaan:nep.plugin}};
  vm.createContext(ctx); vm.runInContext(BLOK,ctx);
  return {ctx,st,veld,ls,nep,status:()=>veld('tk-backup-status').textContent};
}
const ENVELOP=n=>{ const b='{"format":"tk-local-rescue-encrypted.v1","kdf":"PBKDF2-SHA256","data":"'; return b+'A'.repeat(Math.max(0,n-b.length-2))+'"}'; };

(async()=>{
  check(!!NX&&typeof NX.exporteer==='function','N0 native exportmodule aanwezig (core/nativeBackupExport.js)');
  if(!NX&&RED){ console.log('RED  (alle N-scenario\'s: native export ontbreekt)'); console.log('TK-REL-SEC-33: '+n+'/'+n); return; }
  // N1 + N12 + N14
  await stap(async()=>{ const {ctx,st,nep,status,veld}=app();
    await ctx.tkMaakVersleuteldeLokaleBackup();
    const docs=Object.keys(nep.st.documenten), tekst=nep.st.documenten[docs[0]];
    check(/^\d+ items, \d+ overgeslagen\. .*Versleutelde kopie weggeschreven en teruggelezen\./.test(status())&&/geen garantie dat een cloudopslag/.test(status())&&/ONVEILIG/.test(status()),'N1 geslaagde opslag → "Versleutelde kopie weggeschreven en teruggelezen." met cloud-voorbehoud');
    check(docs.length===1&&st.downloads.length===0&&nep.st.aanroepen.join(',')==='start,schrijf,voltooi,afronden','N1 native route gekozen (geen browserdownload); één document');
    const env=JSON.parse(tekst); const r=await B.inspect(env,PASS,webcrypto);
    check(r.owner===A&&r.entries>=2,'N1 opgeslagen bestand is een geldige, ontsleutelbare kopie van dit account');
    const plan=RP.plan(RP.classificeer({data:r.data,scanner:A,lokaal:{localStorage:{tk_cache_owner_uid:A},wachtrij:[],cacheEigenaar:A}}),{eigenaar:A});
    check(plan.records.length>=2&&plan.herstel_toegestaan===false,'N14 de herstelpreview opent dezelfde kopie');
    const bridge=nep.st.bridge.join('|');
    check(!bridge.includes(PASS)&&!bridge.includes('Geheim trainingsplan')&&!bridge.includes('Plaintext concept'),'N12 geen wachtzin of onversleutelde gegevens over de native bridge');
    check(st.logs.every(l=>!l.includes(PASS)&&!l.includes('Geheim')),'N12 geen wachtzin of inhoud in logs');
    check(veld('tk-backup-pass').value===''&&veld('tk-backup-pass2').value==='','N12 wachtzin gewist');
    check(ctx.localStorage.getItem('tk_export_bezig')===null,'N7 markering na afloop opgeruimd'); });
  // N2–N6, N9, N16
  const geval=async(fout,label,test)=>stap(async()=>{ const {ctx,nep,status}=app({fout}); await ctx.tkMaakVersleuteldeLokaleBackup(); check(test(status(),nep)&&!/weggeschreven en teruggelezen/.test(status()),label); });
  await geval({annuleer:true},'N2 gebruiker annuleert → "geannuleerd", geen document',(t,nep)=>/geannuleerd/.test(t)&&!Object.keys(nep.st.documenten).length);
  await geval({schrijfBij:0},'N3 schrijven mislukt → "Opslaan mislukt", onvolledig bestand verwijderd',(t,nep)=>/Opslaan mislukt/.test(t)&&/verwijderd/.test(t)&&!Object.keys(nep.st.documenten).length);
  await geval({leesFout:true},'N4 teruglezen mislukt → READ_FAILED-melding, bestand verwijderd',(t,nep)=>/niet worden teruggelezen/.test(t)&&!Object.keys(nep.st.documenten).length);
  await geval({afwijkend:true},'N5 teruggelezen bestand verschilt (native) → MISMATCH-melding',(t)=>/wijkt af/.test(t));
  await geval({nativeLiegt:true},'N5 native meldt succes met een andere SHA-256 → webcontrole: MISMATCH, bestand verwijderd',(t,nep)=>/wijkt af/.test(t)&&nep.st.aanroepen.indexOf('afbreken')>=0&&!Object.keys(nep.st.documenten).length);
  await geval({vol:true},'N6 onvoldoende opslag → "onvoldoende opslagruimte"',(t)=>/onvoldoende opslagruimte/.test(t));
  await geval({bridgeBij:'start'},'N9 bridge-fout bij start → mislukt, geen succes',(t)=>/Opslaan mislukt/.test(t));
  await geval({bridgeBij:'voltooi'},'N9 bridge-fout bij voltooien → niet terug te lezen, document afgebroken',(t,nep)=>/niet worden teruggelezen/.test(t)&&nep.st.aanroepen.indexOf('afbreken')>=0);
  await geval({schrijfBij:0,verwijderMislukt:true},'N16 verwijderen mislukt → expliciet: zelf verwijderen, niet gebruiken',(t)=>/kon niet worden verwijderd/.test(t));
  // N7 onderbreking
  await stap(async()=>{ const {ctx,nep,status}=app({fout:{onderbreekBij:0}}); await ctx.tkMaakVersleuteldeLokaleBackup();
    check(!/weggeschreven en teruggelezen/.test(status())&&nep.st.aanroepen.indexOf('afbreken')>=0,'N7 onderbreking tijdens opslag → geen succes, document afgebroken');
    const ls=opslag({tk_cache_owner_uid:A,tk_trainings:'[{"id":"ct1"}]',tk_export_bezig:JSON.stringify({naam:'trainingskompas_lokaal_2026-10-19.tkbackup',gestart:'2026-10-19T10:00:00Z'})});
    const tweede=app({ls}); await tweede.ctx.tkMaakVersleuteldeLokaleBackup();
    check(/eerdere export \(trainingskompas_lokaal_2026-10-19\.tkbackup\) is onderbroken/.test(tweede.status())&&/gebruik het niet als back-up/.test(tweede.status()),'N7 app gestopt tijdens opslag: volgende keer waarschuwing dat dat bestand onvolledig kan zijn'); });
  // N8 accountwissel
  await stap(async()=>{ const {ctx,nep,status}=app(); const echt=nep.plugin.schrijf;
    nep.plugin.schrijf=async function(a){ ctx.authSession={user:{id:Bu}}; return echt.call(this,a); };
    const groot={}; for(let i=0;i<40;i++)groot['sel_m'+i]='x'.repeat(10000); // meerdere delen
    ctx.localStorage.setItem('tk_gw_hist',JSON.stringify(groot));
    await ctx.tkMaakVersleuteldeLokaleBackup();
    check(/ander account/.test(status())&&!Object.keys(nep.st.documenten).length,'N8 accountwissel tijdens de opslag → ACCOUNT_CHANGED, document verwijderd');
    check(nep.st.aanroepen.filter(x=>x==='schrijf').length===1&&nep.st.aanroepen.indexOf('voltooi')<0,'N8 na de wissel geen enkel volgend deel meer naar de plugin'); });
  await stap(async()=>{ const nep=nepPlugin(); const r=await NX.exporteer({plugin:nep.plugin,tekst:ENVELOP(1000),naam:'x.tkbackup',eigenaarGelijk:()=>false,subtle:webcrypto.subtle});
    check(r.status==='ACCOUNT_CHANGED'&&nep.st.aanroepen.length===0,'N8 ander account vóór de start → ACCOUNT_CHANGED, plugin niet aangeroepen');
    const nep2=nepPlugin(); nep2.plugin.voltooi=async()=>({status:'OK',grootte:1000,sha256:sha(ENVELOP(1000))}); // juiste grootte en hash, maar geen VERIFIED_READBACK
    const r2=await NX.exporteer({plugin:nep2.plugin,tekst:ENVELOP(1000),naam:'x.tkbackup',eigenaarGelijk:()=>true,subtle:webcrypto.subtle});
    check(r2.status!=='VERIFIED_READBACK'&&!r2.geslaagd,'N9 onbekende native status → nooit succes');
    const nep3=nepPlugin({verwijderMislukt:true}); let teller=0;
    const r3=await NX.exporteer({plugin:nep3.plugin,tekst:ENVELOP(1000),naam:'x.tkbackup',eigenaarGelijk:()=>(teller++<1),subtle:webcrypto.subtle});
    check(r3.status==='ACCOUNT_CHANGED'&&r3.verwijderd===false&&r3.documentAangemaakt===true,'N16 afbreken waarbij verwijderen mislukt → verwijderd:false wordt doorgegeven'); });
  await stap(async()=>{ const {ctx,nep,status}=app(); const echt=nep.plugin.voltooi;
    nep.plugin.voltooi=async function(a){ const r=await echt.call(this,a); ctx.authSession={user:{id:Bu}}; return r; };
    await ctx.tkMaakVersleuteldeLokaleBackup();
    check(/ander account/.test(status())&&nep.st.aanroepen.indexOf('afbreken')>=0&&!Object.keys(nep.st.documenten).length,'N8 accountwissel na terugkomst van het native resultaat → geen succes, document verwijderd'); });
  // N10
  await stap(async()=>{ const nep=nepPlugin(); nep.st.documenten['trainingskompas_lokaal_2026-10-20.tkbackup']='bestaand';
    const {ctx,status}=app({nep}); await ctx.tkMaakVersleuteldeLokaleBackup();
    check(/Bestand: trainingskompas_lokaal_2026-10-20 \(1\)\.tkbackup\./.test(status())&&nep.st.documenten['trainingskompas_lokaal_2026-10-20.tkbackup']==='bestaand','N10 bestaande naam: werkelijk opgeslagen naam gemeld, bestaand bestand onaangeroerd'); });
  // N11
  await stap(async()=>{ const nep=nepPlugin(); const t=ENVELOP(20*1024*1024);
    const r=await NX.exporteer({plugin:nep.plugin,tekst:t,naam:'groot.tkbackup',eigenaarGelijk:()=>true,subtle:webcrypto.subtle,maxGrootte:B.MAX_BESTAND});
    check(r.status==='VERIFIED_READBACK'&&nep.st.delen.length===Math.ceil(t.length/NX.DEEL)&&Math.max(...nep.st.delen)<=256*1024,'N11 20 MB binnen de grens: '+nep.st.delen.length+' begrensde delen van ≤ 256 KiB');
    const nep2=nepPlugin(); const r2=await NX.exporteer({plugin:nep2.plugin,tekst:ENVELOP(B.MAX_BESTAND+1),naam:'te-groot.tkbackup',eigenaarGelijk:()=>true,subtle:webcrypto.subtle,maxGrootte:B.MAX_BESTAND});
    check(r2.status==='WRITE_FAILED'&&r2.reden==='te_groot'&&nep2.st.aanroepen.length===0,'N11 boven de grens → geweigerd vóór de plugin');
    const r3=await NX.exporteer({plugin:nepPlugin().plugin,tekst:'{"format":"tk-local-rescue-data.v1","entries":[]}',naam:'x.tkbackup',eigenaarGelijk:()=>true,subtle:webcrypto.subtle});
    check(r3.status==='WRITE_FAILED'&&r3.reden==='geen_versleutelde_envelop','N12 onversleutelde inhoud kan niet naar de plugin');
    const r4=await NX.exporteer({plugin:nepPlugin().plugin,tekst:ENVELOP(100),naam:'../x.tkbackup',eigenaarGelijk:()=>true,subtle:webcrypto.subtle});
    check(r4.status==='WRITE_FAILED'&&r4.reden==='ongeldige_naam','N11 ongeldige bestandsnaam → geweigerd'); });
  // N12 native broncode
  await stap(async()=>{ const plug=path.join(ROOT,'android/app/src/main/java/com/trainingskompas/app/TkBestandOpslaanPlugin.java'), kern=path.join(ROOT,'android/app/src/main/java/com/trainingskompas/app/export/TkExportSessie.java'), best=path.join(ROOT,'android/app/src/main/java/com/trainingskompas/app/export/ContentBestemming.java');
    const src=[plug,kern,best].map(f=>fs.existsSync(f)?fs.readFileSync(f,'utf8'):'').join('\n');
    check(src.length>1000&&!/\bLog\.[a-z]\(|System\.out|printStackTrace|getSharedPreferences|getExternalStorage|openFileOutput/.test(src),'N12 native code: geen logging, geen SharedPreferences, geen app-opslag van inhoud');
    const man=fs.readFileSync(path.join(ROOT,'android/app/src/main/AndroidManifest.xml'),'utf8');
    check(!/WRITE_EXTERNAL_STORAGE|READ_EXTERNAL_STORAGE|MANAGE_EXTERNAL_STORAGE|READ_MEDIA_/.test(man),'N12 geen algemene opslagrechten in het manifest');
    const act=fs.readFileSync(path.join(ROOT,'android/app/src/main/java/com/trainingskompas/app/MainActivity.java'),'utf8');
    check(/registerPlugin\(TkBestandOpslaanPlugin\.class\);[\s\S]*super\.onCreate/.test(act)&&/ACTION_CREATE_DOCUMENT/.test(src),'N1 plugin geregistreerd vóór super.onCreate; SAF ACTION_CREATE_DOCUMENT');
    const gr=fs.readFileSync(path.join(ROOT,'android/app/build.gradle'),'utf8');
    const blok=(gr.match(/exportproef\s*\{([^}]*)\}/)||[])[1]||'';
    check(/applicationIdSuffix "\.exportproef"/.test(blok)&&/initWith debug/.test(blok)&&!/signingConfig/.test(blok)&&!/release/.test(blok)&&/applicationId "com\.trainingskompas\.app"/.test(gr),'D2 testvariant met eigen applicationId (.exportproef), ondertekening geërfd van debug (nooit release); bestaande id ongewijzigd'); });
  // N13 + N15 + N17
  await stap(async()=>{ const {ctx,st,nep,status}=app({native:false}); await ctx.tkMaakVersleuteldeLokaleBackup();
    check(st.downloads.length===1&&/aangeboden/.test(status())&&nep.st.aanroepen.length===0,'N13 webexport ongewijzigd (browserdownload, geen plugin)');
    const oud=app({geenPlugin:true}); await oud.ctx.tkMaakVersleuteldeLokaleBackup();
    check(/kan de kopie nog niet opslaan/.test(oud.status())&&oud.st.downloads.length===0,'N15 oudere APK zonder plugin → geen schijnsucces');
    check(/id="help-update-safe" disabled aria-disabled="true"/.test(HTML)&&(HTML.match(/help-update-safe/g)||[]).length===1,'N17 "Veilig om te verwijderen" blijft uitgeschakeld'); });
  // N18 (TK-REL-SEC-34) exportoverzicht per bron met synthetische testgegevens
  await stap(async()=>{ const ls=opslag({tk_cache_owner_uid:A,tk_trainings:JSON.stringify([{id:'ct1',name:'Synth A'},{id:'ct2',name:'Synth B'}]),
      tk_draft_training:JSON.stringify({t:'kracht',sessionLog:{squat:[{kg:40,reps:5}]}}),tk_coach_style:'kort',tk_theme:'dark',tk_auth_session:'{"access_token":"T"}'});
    const {ctx,status}=app({ls,queue:[{id:3,ts:1,owner_uid:A,table:'sessions',method:'POST',body:{id:'s1',exercise_id:'squat',reps:5}}]});
    await ctx.tkMaakVersleuteldeLokaleBackup();
    const t=status();
    check(/Geëxporteerd: actieve_training: 1, coach_stijl: 1, eigen_trainingen: 2, offline_wachtrij: 1\./.test(t),'N18 overzicht: 2 eigen trainingen, 1 lopende training, 1 wachtrij-item en de voorkeur geëxporteerd');
    check(/Niet exporteerbaar \(toestel\/systeem\): cache_eigenaar, sessie, thema\./.test(t)&&/controleer met de herstelpreview/.test(t),'N18 niet exporteerbaar (toestel/systeem) apart benoemd; herstelbaarheid verwijst naar de preview');
    check(!/Synth A|Synth B|access_token|squat/.test(t),'N18 overzicht bevat alleen bronnamen en aantallen, geen inhoud'); });
  console.log('TK-REL-SEC-33: '+n+'/'+n);
})().catch(e=>{console.error('FAIL',e&&e.stack||e);process.exitCode=1;});
