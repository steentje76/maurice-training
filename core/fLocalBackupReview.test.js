/* TK-REL-SEC-30 — onafhankelijke beveiligingsacceptatie van de versleutelde reddingskopie (PR #566, 19-10-2026).
 * Nieuwe negatieve tests; eerdere groene tests gelden niet als bewijs.
 *  R1 onleesbare offline-wachtrij: offlineQueueAll() maskeert een IndexedDB-fout als [] → de kopie mag dan NIET
 *     worden gemaakt (anders ontbreken niet-verstuurde writes stil);
 *  R2 Android-app (Capacitor): <a download> met een blob-URL doet in de WebView niets (geen DownloadListener) →
 *     geen schijnsucces; de app weigert met uitleg;
 *  R3 sleutelafleiding: nieuwe bestanden PBKDF2-SHA256 met ≥ 600.000 iteraties (OWASP 2023); bestaande v1-bestanden
 *     (210.000) blijven leesbaar; elke andere waarde wordt geweigerd;
 *  R4 resource-uitputting: te grote envelop of onbekende envelopvelden → geweigerd vóór de sleutelafleiding;
 *  R5 kwaadaardige maar geldig versleutelde inhoud (eigenaar geen tekst, onbekende bron, enorme sleutel, waarde van
 *     verkeerd type, te veel items, ontbrekende velden) → geweigerd;
 *  R6 getrouwheid: weggelaten geheimvelden en genormaliseerde waarden worden per item gemarkeerd; een sleutel
 *     "__proto__" in gebruikersdata gaat niet verloren en vervuilt geen prototype;
 *  R7 wachtrij-item met een filter op de user_id van een ander → niet in de kopie;
 *  R8 een onbekende opslagbron is herkenbaar (vingerafdruk van de sleutelnaam, geen inhoud);
 *  R9 controle zonder bestand: de wachtzin wordt toch gewist;
 *  R10 accountwissel tijdens het versleutelen → geen download;
 *  R11 credential-materiaal (calendar_feed_tokens.token_hash, apikey, cookie) komt niet in de kopie;
 *  R12 een echt wachtrijrecord (plat, zoals offlineQueueAdd het opslaat) komt in de kopie: PR #566 verwachtte een
 *      genest 'item' en sloeg elk echt wachtrij-item over. */
'use strict';
const assert=require('assert'),fs=require('fs'),path=require('path'),vm=require('vm');
const {webcrypto}=require('crypto');
const B=require('./localBackup');
const M=require('./localInventory');
let n=0;
const RED=!!process.env.TK_RED;
const check=(ok,label)=>{ if(RED){ n++; console.log(ok?'PASS':'RED ',label); return; } assert(ok,label);n++;console.log('PASS',label);};
const stap=async(f)=>{ try{ await f(); }catch(e){ if(!RED)throw e; console.log('RED  (scenario afgebroken: '+String(e&&e.message||e).slice(0,90)+')'); } };
const weigert=async(fn)=>{ try{ await fn(); return false; }catch(_){ return true; } };
const A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', Bu='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const PASS='een lange wachtzin voor test';
const HTML=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').replace(/\r\n/g,'\n');
const BLOK=(()=>{ const i=HTML.indexOf('// TK-REL-SEC-29: encrypted, intentionally partial recovery export.'); const j=HTML.indexOf('async function exportJSON(){',i); assert(i>=0&&j>i,'backupblok'); return HTML.slice(i,j); })();
function opslag(init){ const m=new Map(Object.entries(init||{}));
  return {get length(){return m.size;},key:i=>[...m.keys()][i]===undefined?null:[...m.keys()][i],getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>{m.set(k,String(v));},removeItem:k=>{m.delete(k);},_dump:()=>JSON.stringify([...m.entries()])}; }
function app(o){
  o=o||{};
  const el={}; const veld=id=>(el[id]=el[id]||{value:'',textContent:'',files:null});
  veld('tk-backup-pass').value=PASS; veld('tk-backup-pass2').value=PASS;
  const st={downloads:[]};
  const ls=opslag(Object.assign({tk_cache_owner_uid:A,tk_trainings:JSON.stringify([{id:'ct1',name:'Push'}])},o.ls||{}));
  const ctx={console:{log(){},warn(){},error(){}},localStorage:ls,authSession:{user:{id:A}},tkEigenaarUid:()=>A,
    LocalInventoryCore:M,TKLocalBackup:B,document:{getElementById:veld},td:()=>'2026-10-19',
    downloadFile:(d,naam)=>st.downloads.push({d,naam}),
    offlineQueueAll:o.offlineQueueAll||(async()=>[]),tkLeesWachtrijStrikt:o.tkLeesWachtrijStrikt||(async()=>[]),
    TextEncoder,TextDecoder,setTimeout,Promise};
  ctx.window=ctx; ctx.crypto=webcrypto; ctx.Capacitor=o.capacitor||undefined; ctx.globalThis=ctx;
  vm.createContext(ctx); vm.runInContext(BLOK,ctx);
  return {ctx,st,veld,ls};
}

(async()=>{
  // R1
  await stap(async()=>{ const {ctx,st,veld}=app({offlineQueueAll:async()=>[],tkLeesWachtrijStrikt:async()=>{ throw new Error('idb_abort'); }});
    await ctx.tkMaakVersleuteldeLokaleBackup();
    check(st.downloads.length===0&&/wachtrij/i.test(veld('tk-backup-status').textContent),'R1 onleesbare offline-wachtrij → geen kopie (geen stille weglating van niet-verstuurde writes)'); });
  // R2
  await stap(async()=>{ const {ctx,st,veld}=app({capacitor:{isNativePlatform:()=>true}});
    await ctx.tkMaakVersleuteldeLokaleBackup();
    const t=veld('tk-backup-status').textContent;
    check(st.downloads.length===0&&!/aangeboden/.test(t)&&/Android|app/i.test(t),'R2 Android-app: geen schijnsucces via een niet-werkende browserdownload'); });
  // R3
  await stap(async()=>{ const data=B.prepare({owner:A,cacheOwner:A,manifest:M.BRONNEN,local:{tk_trainings:'[{"id":"x"}]'},queue:[]});
    const env=await B.encrypt(data,PASS,webcrypto);
    check(env.iterations>=600000,'R3 nieuwe bestanden: PBKDF2-SHA256 met ≥ 600.000 iteraties ('+env.iterations+')');
    const leg=await maakLegacy(data);
    check(!(await weigert(()=>B.inspect(leg,PASS,webcrypto))),'R3 bestaand v1-bestand (210.000 iteraties) blijft leesbaar');
    let afgeleid=0; const spion={subtle:new Proxy(webcrypto.subtle,{get(t,k){ const f=t[k]; if(k==='deriveKey')return function(){ afgeleid++; return f.apply(t,arguments); }; return typeof f==='function'?f.bind(t):f; }})};
    for(const it of [1,209999,600001,1000000000])check(await weigert(()=>B.inspect(Object.assign({},env,{iterations:it}),PASS,spion))&&afgeleid===0,'R3 iteraties '+it+' → geweigerd zonder sleutelafleiding (geen rekenbom)'); });
  // R4
  await stap(async()=>{ const data=B.prepare({owner:A,cacheOwner:A,manifest:M.BRONNEN,local:{tk_trainings:'[{"id":"x"}]'},queue:[]});
    const env=await B.encrypt(data,PASS,webcrypto);
    let afgeleid=0; const spion={getRandomValues:x=>webcrypto.getRandomValues(x),subtle:new Proxy(webcrypto.subtle,{get(t,k){ const f=t[k]; if(k==='importKey'||k==='deriveKey')return function(){ afgeleid++; return f.apply(t,arguments); }; return typeof f==='function'?f.bind(t):f; }})};
    const groot=Object.assign({},env,{data:'A'.repeat(40*1024*1024)});
    const t0=Date.now(); const w=await weigert(()=>B.inspect(groot,PASS,spion));
    check(w&&afgeleid===0&&Date.now()-t0<2000,'R4 te grote envelop (40 MB) → geweigerd vóór sleutelafleiding');
    check(await weigert(()=>B.inspect(Object.assign({},env,{extra:'x'}),PASS,webcrypto)),'R4 onbekend envelopveld → geweigerd');
    check(await weigert(()=>B.inspect(Object.assign({},env,{salt:'!!!niet-base64'}),PASS,webcrypto)),'R4 ongeldige base64 → geweigerd');
    const {ctx,st,veld}=app(); veld('tk-backup-check-pass').value=PASS; veld('tk-backup-file').files=[{size:30*1024*1024,text:async()=>{ throw new Error('mag niet gelezen worden'); }}];
    await ctx.tkControleerVersleuteldeLokaleBackup();
    check(/groter|te groot/i.test(veld('tk-backup-status').textContent),'R4 bestand van 30 MB → geweigerd zonder in te lezen'); });
  // R5
  await stap(async()=>{ const basis={format:'tk-local-rescue-data.v1',owner:A,created:'2026-10-19T00:00:00Z',entries:[],omissions:[],complete:false,restoreAllowed:false};
    const varianten={
      'eigenaar geen tekst':Object.assign({},basis,{owner:123}),
      'eigenaar leeg':Object.assign({},basis,{owner:''}),
      'onbekende bron':Object.assign({},basis,{entries:[{storage:'localStorage',key:'tk_trainings',value:'[]',source:'verzonnen_bron'}]}),
      'bron past niet bij sleutel':Object.assign({},basis,{entries:[{storage:'localStorage',key:'tk_trainings',value:'[]',source:'actieve_training'}]}),
      'enorme sleutel':Object.assign({},basis,{entries:[{storage:'localStorage',key:'sel_'+'k'.repeat(5000),value:'1',source:'machinekeuze'}]}),
      'waarde verkeerd type':Object.assign({},basis,{entries:[{storage:'localStorage',key:'tk_trainings',value:{x:1},source:'eigen_trainingen'}]}),
      'wachtrijwaarde geen object':Object.assign({},basis,{entries:[{storage:'offline_queue',key:'1',value:'x',source:'offline_wachtrij'}]}),
      'te veel items':Object.assign({},basis,{entries:Array.from({length:25000},(_,i)=>({storage:'offline_queue',key:String(i),value:{table:'t',method:'POST'},source:'offline_wachtrij'}))}),
      'omissions geen objecten':Object.assign({},basis,{omissions:['x']}),
      'aanmaakdatum ongeldig':Object.assign({},basis,{created:'gisteren'})
    };
    for(const [naam,d] of Object.entries(varianten)){ const env=await versleutelRuw(d); check(await weigert(()=>B.inspect(env,PASS,webcrypto)),'R5 '+naam+' → geweigerd'); }
    check(await weigert(()=>B.inspect(null,PASS,webcrypto)),'R5 lege envelop → geweigerd');
    for(const [naam,d] of Object.entries({'onbekende bron':varianten['onbekende bron'],'te veel items':varianten['te veel items']}))check(await weigert(()=>B.encrypt(d,PASS,webcrypto)),'R5 versleutelen van ongeldige inhoud ('+naam+') → geweigerd: wat geschreven wordt, moet ook leesbaar zijn');
    const okVar=Object.assign({},basis,{entries:[{storage:'localStorage',key:'sel_rowing',value:'PM5',source:'machinekeuze'},{storage:'offline_queue',key:'3',value:{table:'sessions',method:'POST',body:{id:'x'}},source:'offline_wachtrij'}]});
    check(!(await weigert(async()=>B.inspect(await versleutelRuw(okVar),PASS,webcrypto))),'R5 (positieve controle) geldige inhoud wordt geaccepteerd'); });
  // R6
  await stap(async()=>{ const raw='[{"id":"ct1","name":"Push","password":"x","__proto__":{"polluted":true}}]';
    const d=B.prepare({owner:A,cacheOwner:A,manifest:M.BRONNEN,local:{tk_trainings:raw},queue:[]});
    const e=d.entries.find(x=>x.key==='tk_trainings');
    check(e&&e.redacted===true&&!/"password"/.test(e.value),'R6 weggelaten geheimveld → item gemarkeerd (redacted)');
    check(e&&/"__proto__"/.test(e.value)&&({}).polluted===undefined,'R6 sleutel "__proto__" blijft data, geen prototypevervuiling');
    const d2=B.prepare({owner:A,cacheOwner:A,manifest:M.BRONNEN,local:{tk_trainings:'[ {"id" : "ct1"} ]'},queue:[]});
    check(d2.entries[0].normalized===true,'R6 genormaliseerde (niet byte-gelijke) waarde gemarkeerd');
    const d3=B.prepare({owner:A,cacheOwner:A,manifest:M.BRONNEN,local:{tk_trainings:'[{"id":"ct1"}]'},queue:[]});
    check(!d3.entries[0].normalized&&!d3.entries[0].redacted&&d3.entries[0].value==='[{"id":"ct1"}]','R6 ongewijzigde waarde byte-gelijk en zonder markering'); });
  // R7
  await stap(async()=>{ const d=B.prepare({owner:A,cacheOwner:A,manifest:M.BRONNEN,local:{},queue:[{id:1,owner_uid:A,ts:1,table:'goals',method:'PATCH',filter:'user_id=eq.'+Bu+'&id=eq.4',body:{naam:'x'}},{id:2,owner_uid:A,ts:1,table:'goals',method:'DELETE',filter:'id=eq.4&user_id=eq.'+A}]});
    check(!d.entries.some(e=>e.key==='1')&&d.entries.some(e=>e.key==='2')&&d.omissions.some(o=>o.reason==='payload_other_owner'),'R7 filter op de user_id van een ander → niet in de kopie; eigen filter wel'); });
  // R8
  await stap(async()=>{ const d=B.prepare({owner:A,cacheOwner:A,manifest:M.BRONNEN,local:{vreemde_sleutel:'GEHEIME INHOUD'},queue:[]});
    const o=d.omissions.find(x=>x.source==='unrecognized_local_storage');
    check(o&&typeof o.key_fingerprint==='string'&&o.key_fingerprint.length===8&&!JSON.stringify(d).includes('GEHEIME'),'R8 onbekende bron herkenbaar via vingerafdruk van de sleutelnaam, zonder inhoud'); });
  // R9
  await stap(async()=>{ const {ctx,veld}=app(); veld('tk-backup-check-pass').value=PASS; veld('tk-backup-file').files=[];
    await ctx.tkControleerVersleuteldeLokaleBackup();
    check(veld('tk-backup-check-pass').value==='','R9 controle zonder bestand: wachtzin gewist'); });
  // R10
  await stap(async()=>{ const {ctx,st}=app(); const echt=B.encrypt;
    ctx.TKLocalBackup=Object.assign({},B,{encrypt:async function(){ ctx.authSession={user:{id:Bu}}; return echt.apply(null,arguments); }});
    await ctx.tkMaakVersleuteldeLokaleBackup();
    check(st.downloads.length===0,'R10 accountwissel tijdens het versleutelen → geen download'); });
  // R11
  await stap(async()=>{ const d=B.prepare({owner:A,cacheOwner:A,manifest:M.BRONNEN,local:{},queue:[
      {id:1,owner_uid:A,ts:1,table:'calendar_feed_tokens',method:'POST',body:{user_id:A,token_hash:'HASHGEHEIM',active:true}},
      {id:2,owner_uid:A,ts:1,table:'sessions',method:'POST',body:{id:'s1',apikey:'APIGEHEIM',cookie:'KOEKJE',reps:5}}]});
    const t=JSON.stringify(d);
    check(!/HASHGEHEIM|APIGEHEIM|KOEKJE/.test(t)&&d.omissions.some(o=>o.reason==='credential_material'),'R11 credential-materiaal (token_hash, apikey, cookie) niet in de kopie'); });
  // R12
  await stap(async()=>{ const echt={id:7,ts:1760000000000,owner_uid:A,table:'sessions',method:'POST',body:{id:'s7',exercise_id:'squat',reps:5},resolution:'ignore-duplicates',onzeker:true};
    const d=B.prepare({owner:A,cacheOwner:A,manifest:M.BRONNEN,local:{},queue:[echt]});
    const e=d.entries.find(x=>x.storage==='offline_queue'&&x.key==='7');
    check(e&&e.value.table==='sessions'&&e.value.body.reps===5&&e.value.onzeker===true&&!('owner_uid' in e.value)&&!('ts' in e.value),'R12 echt (plat) wachtrijrecord uit maurice_offline komt in de kopie (zonder id/ts/eigenaar)'); });
  console.log('TK-REL-SEC-30: '+n+'/'+n);
})().catch(e=>{console.error('FAIL',e&&e.stack||e);process.exitCode=1;});

// Een v1-bestand zoals PR #566 het maakte (210.000 iteraties), om leesbaarheid van bestaande kopieën te bewijzen.
async function maakLegacy(data){ return versleutelRuw(data,210000); }
// Versleutel willekeurige inhoud met het envelopformaat (geldige authenticatietag): test de validatie ná ontsleutelen.
async function versleutelRuw(data,iter){
  const enc=new TextEncoder(), s=webcrypto.subtle, salt=webcrypto.getRandomValues(new Uint8Array(16)), iv=webcrypto.getRandomValues(new Uint8Array(12));
  const it=iter||210000; // v1-iteraties: accepteert zowel de oude als de nieuwe code, zodat R5 echt de inhoudsvalidatie test
  const base=await s.importKey('raw',enc.encode(PASS),'PBKDF2',false,['deriveKey']);
  const key=await s.deriveKey({name:'PBKDF2',salt,iterations:it,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt']);
  const ct=await s.encrypt({name:'AES-GCM',iv,additionalData:enc.encode(B.FORMAT)},key,enc.encode(JSON.stringify(data)));
  const b64=a=>Buffer.from(a).toString('base64');
  return {format:B.FORMAT,kdf:'PBKDF2-SHA256',iterations:it,cipher:'AES-256-GCM',salt:b64(salt),iv:b64(iv),data:b64(new Uint8Array(ct))};
}
