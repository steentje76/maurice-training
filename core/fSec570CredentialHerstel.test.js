/* SEC-570-03 — credentials in tekst- en JSON-tekstvelden van de versleutelde reddingskopie (heracceptatie PR #573).
 *
 * core/localBackup.js::clean() verwijderde credentialvelden alleen uit objecten. Een JSON-tekst met bijvoorbeeld
 * "refresh_token" (wachtrijpayload of localStorage-waarde) kwam ongewijzigd in de kopie. Herstel: geheimIn() doorzoekt
 * de geschoonde waarde begrensd; een item met credentialmateriaal dat niet betrouwbaar te schonen is, wordt
 * overgeslagen met een herkenbare reden. Tekst wordt nooit herschreven; de echte wachtrij blijft ongewijzigd.
 *
 * Uitsluitend synthetische, inerte waarden (CANARY). TK_RED=1: alle scenario's doorlopen en RED melden (bewijs tegen
 * de oude code). Mutatiecontrole: fSec570CredentialMutants.test.js. */
'use strict';
const assert=require('assert');
const {webcrypto}=require('crypto');
const B=require('./localBackup.js');
const I=require('./localInventory.js');
const RED=!!process.env.TK_RED;
let n=0, rood=0, klaar=false;
process.on('exit',()=>{ if(!klaar&&!RED){ console.error('FAIL niet alle scenario\'s afgerond'); process.exitCode=1; } });
const check=(ok,label)=>{ n++; if(RED){ if(!ok)rood++; console.log(ok?'PASS':'RED ',label); return; } assert(ok,label); console.log('PASS',label); };
const veilig=(f,label)=>{ try{ f(); }catch(e){ check(false,label+' (gooit: '+String(e&&e.message||e).slice(0,60)+')'); } };

const A='user_aaaaaaaa', Bo='user_bbbbbbbb', T='2026-10-21T12:00:00Z';
const CANARY='INERT-SYNTHETIC-CANARY';
const JWT='eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJJTkVSVC1TWU5USEVUSUMifQ.SW5lcnRTeW50aGV0aWNDYW5hcnk';
const prep=(o)=>B.prepare(Object.assign({owner:A,cacheOwner:A,manifest:I.BRONNEN,local:{},queue:[]},o));
const qe=(d)=>d.entries.filter(x=>x.storage==='offline_queue');
const lek=(d)=>JSON.stringify(d.entries).includes(CANARY)||JSON.stringify(d.entries).includes(JWT);
const reden=(d,bron,r)=>d.omissions.some(o=>(bron===null||o.source===bron)&&(r?o.reason===r:true));
const q=(o)=>Object.assign({id:1,owner_uid:A,table:'sessions',method:'POST'},o);
// Eén wachtrij-item: niet in de kopie, geen canary, herkenbare reden.
const weigertQ=(naam,item,r)=>veilig(()=>{ const d=prep({queue:[item]});
  check(qe(d).length===0&&!lek(d)&&reden(d,'offline_queue',r),naam+' → niet in de kopie, geen credential ('+r+')'); },naam);

/* 1 — exacte auditorreproductie */
veilig(()=>{
  const d=B.prepare({owner:A,cacheOwner:A,local:{},manifest:I.BRONNEN,queue:[{id:1,owner_uid:A,table:'sessions',method:'POST',
    body:{id:'s1',user_id:A,meta:JSON.stringify({user_id:A,refresh_token:'INERT-SYNTHETIC-CANARY'})}}]});
  check(!JSON.stringify(d.entries).includes('INERT-SYNTHETIC-CANARY'),'K1 SEC-570-03 auditorreproductie: credential niet in de reddingskopie');
  check(reden(d,'offline_queue','credential_in_text'),'K1 overgeslagen item herkenbaar (credential_in_text)');
},'K1');

/* 2 — credentialsleutels in een geneste JSON-tekst */
['refresh_token','access_token','id_token','password','client_secret','api-key','authorization','cookie','token_hash','token'].forEach(k=>{
  weigertQ('K2 '+k+' in geneste JSON-tekst',q({body:{id:'s1',meta:JSON.stringify({[k]:CANARY})}}),'credential_in_text');
});
weigertQ('K2 credentialsleutel diep in JSON-tekst',q({body:{id:'s1',meta:JSON.stringify({a:{b:[{c:{refresh_token:CANARY}}]}})}}),'credential_in_text');

/* 3 — dubbel en drievoudig gecodeerde JSON, ook afgebroken (ongeldig) */
weigertQ('K3 dubbel gecodeerde JSON',q({body:{id:'s1',meta:JSON.stringify(JSON.stringify({refresh_token:CANARY}))}}),'credential_in_text');
weigertQ('K3 drievoudig gecodeerde JSON',q({body:{id:'s1',meta:JSON.stringify(JSON.stringify(JSON.stringify({access_token:CANARY})))}}),'credential_in_text');
weigertQ('K3 afgebroken dubbel gecodeerde JSON (ongeldig)',q({body:{id:'s1',meta:JSON.stringify(JSON.stringify({refresh_token:CANARY})).slice(0,-6)}}),'credential_in_text');
weigertQ('K3 afgebroken dubbel gecodeerde JSON met alleen-BAD_KEY-sleutel (password)',q({body:{id:'s1',meta:JSON.stringify(JSON.stringify({password:CANARY})).slice(0,-6)}}),'credential_in_text');

/* 4 — arrays */
weigertQ('K4 array van JSON-teksten',q({body:{id:'s1',lijst:['ok',JSON.stringify({password:CANARY})]}}),'credential_in_text');
weigertQ('K4 JSON-tekst met array van objecten',q({body:{id:'s1',meta:JSON.stringify([{x:1},{secret:CANARY}])}}),'credential_in_text');
weigertQ('K4 body als array van rijen',q({body:[{id:'s1'},{id:'s2',note:JSON.stringify({refresh_token:CANARY})}]}),'credential_in_text');

/* 5 — RPC-argumenten */
weigertQ('K5 RPC-args met JSON-tekst',{id:2,owner_uid:A,table:null,method:'RPC',function:'save_x',args:{p:JSON.stringify({client_secret:CANARY})}},'credential_in_text');
weigertQ('K5 RPC-args met credentialachtige objectsleutel',{id:2,owner_uid:A,table:null,method:'RPC',function:'save_x',args:{oauth_code:CANARY}},'credential_material');
weigertQ('K5 RPC-functienaam die credentials verwerkt',{id:2,owner_uid:A,table:null,method:'RPC',function:'store_oauth_state',args:{x:1}},'credential_material');
veilig(()=>{ const d=prep({queue:[{id:2,owner_uid:A,table:null,method:'RPC',function:'save_x',args:{refresh_token:CANARY,x:1}}]});
  const e=qe(d)[0]; check(e&&e.redacted===true&&e.value.args.x===1&&!lek(d),'K5 RPC-args met exacte credentialsleutel als object → veld verwijderd, item gemarkeerd (bestaand gedrag)'); },'K5');

/* 6 — credentials in objecten */
veilig(()=>{ const d=prep({queue:[q({body:{id:'s1',reps:5,refresh_token:CANARY,meta:{client_secret:CANARY}}})]});
  const e=qe(d)[0]; check(e&&e.redacted===true&&e.value.body.reps===5&&!lek(d),'K6 exacte credentialsleutels in objecten → verwijderd en gemarkeerd (bestaand gedrag behouden)'); },'K6');
weigertQ('K6 camelCase-credentialsleutel in object (refreshToken)',q({body:{id:'s1',refreshToken:CANARY}}),'credential_material');
weigertQ('K6 credentialachtige objectsleutel (oauth_state)',q({body:{id:'s1',oauth_state:CANARY}}),'credential_material');

/* 7 — afwijkende en legacypayloads */
weigertQ('K7 genest legacyrecord van een credentialtabel in JSON-tekst',q({body:{id:'s1',meta:JSON.stringify({table:'wearable_connections',method:'POST',body:{provider:'x'}})}}),'credential_in_text');
weigertQ('K7 credentialtabel in genest object',q({body:{id:'s1',legacy:{table:'calendar_feed_tokens',body:{active:true}}}}),'credential_material');
weigertQ('K7 \\u-escape in credentialsleutel (geldige JSON)',q({body:{id:'s1',meta:'{"refresh\\u005ftoken":"'+CANARY+'"}'}}),'credential_in_text');
weigertQ('K7 percent-gecodeerde credential',q({body:{id:'s1',note:'refresh%5Ftoken%3D'+CANARY}}),'credential_in_text');
weigertQ('K7 credential in filtertekst',q({method:'PATCH',filter:'refresh_token=eq.'+CANARY,body:{x:1}}),'credential_in_text');
weigertQ('K7 sleutel=waarde-tekst',q({body:{id:'s1',note:'password: '+CANARY}}),'credential_in_text');
weigertQ('K7 credentialachtige sleutel in vrije tekst (oauth_code=…)',q({body:{id:'s1',note:'oauth_code='+CANARY}}),'credential_in_text');
weigertQ('K7 JWT in tekst',q({body:{id:'s1',note:'kopie '+JWT}}),'credential_in_text');
weigertQ('K7 Bearer-token in tekst',q({body:{id:'s1',note:'Authorization header Bearer '+CANARY+'-0123456789'}}),'credential_in_text');

/* 8 — ongeldige JSON en te diepe nesting */
weigertQ('K8 ongeldige JSON met credentialsleutel',q({body:{id:'s1',meta:'{"refresh_token":"'+CANARY+'",'}}),'credential_in_text');
weigertQ('K8 ongeldige JSON met \\u-escapes (niet te controleren)',q({body:{id:'s1',meta:'{"refresh\\u005ftoken":"'+CANARY+'",'}}),'payload_unverifiable');
veilig(()=>{ let s=JSON.stringify({refresh_token:CANARY}); for(let k=0;k<40;k++)s='['+s+']';
  const d=prep({queue:[q({body:{id:'s1',meta:s}})]}); check(qe(d).length===0&&!lek(d),'K8 credential onder te diepe JSON-nesting → niet in de kopie'); },'K8');
veilig(()=>{ let o={ok:1}; for(let k=0;k<28;k++)o={x:o};
  const d=prep({local:{tk_trainings:JSON.stringify(o)}}); check(!d.entries.some(e=>e.key==='tk_trainings')&&reden(d,null,'payload_unverifiable'),'K8 te diep genest localStorage-item (> 25) → herkenbaar overgeslagen'); },'K8');
veilig(()=>{ const d=prep({queue:[q({body:{id:'s1',meta:'{niet-json'}})]}); check(qe(d).length===1,'K8 ongeldige JSON zonder credential en zonder escapes → behouden'); },'K8');

/* 9 — grote payloads en parsergrenzen */
veilig(()=>{ const groot='a'.repeat(8*1024*1024+1);
  const d=prep({queue:[q({body:{id:'s1',note:groot}})]}); check(qe(d).length===0&&reden(d,'offline_queue','payload_unverifiable'),'K9 tekst groter dan MAX_WAARDE → overgeslagen'); },'K9');
veilig(()=>{ const mb='a'.repeat(1024*1024); const lijst=[]; for(let k=0;k<17;k++)lijst.push(mb);
  const d=prep({queue:[q({body:{id:'s1',lijst}})]}); check(qe(d).length===0&&reden(d,'offline_queue','payload_unverifiable'),'K9 totale te doorzoeken tekst > budget (17 MB) → overgeslagen'); },'K9');
veilig(()=>{ const mb='a'.repeat(1024*1024);
  const d=prep({queue:[q({body:{id:'s1',lijst:[mb,mb,mb]}})]}); check(qe(d).length===1,'K9 binnen het budget (3 MB) → behouden'); },'K9');
veilig(()=>{ const t0=Date.now(); let s=JSON.stringify({ok:1}); for(let k=0;k<8;k++)s=JSON.stringify([s,s]);
  const d=prep({queue:[q({body:{id:'s1',meta:s}})]}); check(Date.now()-t0<5000&&d&&Array.isArray(d.entries),'K9 vertakte meervoudig gecodeerde JSON → begrensd, binnen 5 s'); },'K9');

/* 10 — geldige JSON-tekst en tekst zonder credentials blijven behouden */
veilig(()=>{ const geldig=[
    q({id:10,body:{id:'s1',meta:JSON.stringify({user_id:A,k:1,notes:'goed'})}}),
    q({id:11,body:{id:'s2',meta:JSON.stringify(JSON.stringify({rpe:8}))}}),
    q({id:12,body:{id:'s3',note:'Een token van waardering; geen geheimen'}}),
    q({id:13,body:{id:'s4',note:'Bearer kort'}}),
    q({id:14,body:[{id:'s5',user_id:A,reps:5}],resolution:'ignore-duplicates',onzeker:true}),
    {id:15,owner_uid:A,table:'message_participants',method:'PATCH',filter:'thread_id=eq.t1&user_id=eq.'+A,body:{last_read_at:T}},
    {id:16,owner_uid:A,table:'sessions',method:'DELETE',filter:'id=eq.s9'},
    {id:17,owner_uid:A,table:null,method:'RPC',function:'schedule_my_training',args:{p_user_id:A,definition_snapshot:{user_id:A,naam:'Push'}}},
    {id:18,owner_uid:A,table:null,method:'RPC',function:'upsert_endurance_profile_target',args:{p_target:JSON.stringify({pace:300})}}
  ];
  const d=prep({queue:geldig});
  check(qe(d).length===geldig.length,'K10 geldige productievormen en JSON-tekst zonder credentials → allemaal in de kopie');
  check(B.valideer(d,I.BRONNEN)===true,'K10 kopie voldoet aan de bestaande inhoudsvalidatie'); },'K10');
veilig(()=>{ const d=prep({local:{tk_trainings:JSON.stringify([{id:'ct1',name:'Push',meta:JSON.stringify({sets:3})}]),sel_rowing:'PM5'}});
  check(d.entries.some(e=>e.key==='tk_trainings')&&d.entries.some(e=>e.key==='sel_rowing'),'K10 localStorage met geldige JSON-tekst en platte tekst → behouden'); },'K10');

/* localStorage-pad (zelfde clean()-lek) */
veilig(()=>{ const d=prep({local:{tk_trainings:JSON.stringify([{id:'ct1',meta:JSON.stringify({refresh_token:CANARY})}])}});
  check(!d.entries.some(e=>e.key==='tk_trainings')&&!lek(d)&&reden(d,null,'credential_in_text'),'L1 localStorage-JSON met credential in geneste JSON-tekst → bron overgeslagen'); },'L1');
veilig(()=>{ const d=prep({local:{sel_rowing:'sessie '+JWT}});
  check(!d.entries.some(e=>e.key==='sel_rowing')&&!lek(d),'L2 localStorage platte tekst met JWT → bron overgeslagen'); },'L2');
veilig(()=>{ const d=prep({local:{tk_trainings:'[{"id":"ct1","name":"Push","password":"'+CANARY+'"}]'}});
  const e=d.entries.find(x=>x.key==='tk_trainings'); check(e&&e.redacted===true&&!lek(d),'L3 exacte credentialsleutel in localStorage-object → verwijderd en gemarkeerd (bestaand gedrag)'); },'L3');

/* 12 — cross-account-isolatie blijft voorgaan */
veilig(()=>{ const d=prep({queue:[{id:30,owner_uid:Bo,table:'sessions',method:'POST',body:{id:'x',meta:JSON.stringify({refresh_token:CANARY})}},
    {id:31,owner_uid:A,table:'sessions',method:'POST',body:JSON.stringify({user_id:Bo,id:'row1'})},
    {id:32,owner_uid:A,table:'sessions',method:'POST',body:{id:'s1',meta:JSON.stringify({user_id:Bo,refresh_token:CANARY})}}]});
  check(qe(d).length===0&&!lek(d)&&reden(d,'offline_queue','other_or_unknown_owner')&&reden(d,'offline_queue','unexpected_payload_type')&&reden(d,'offline_queue','payload_other_owner'),'K12 andere eigenaar (record, stringbody, genest) → eigenaarsisolatie SEC-570-01/02 blijft voorgaan'); },'K12');
veilig(()=>{ const d=prep({cacheOwner:Bo,local:{}}); check(d.owner===A,'K12 export blijft aan de exporteur gebonden'); },'K12');

/* 13 + 14 — wachtrij ongewijzigd; kopie blijft onvolledig */
veilig(()=>{ const queue=[q({id:40,body:{id:'s1',meta:JSON.stringify({refresh_token:CANARY})}}),q({id:41,body:{id:'s2',reps:3}})];
  const voor=JSON.stringify(queue); const d=prep({queue});
  check(JSON.stringify(queue)===voor,'K13 wachtrij-invoer byte-gelijk na export (niets verwijderd of gewijzigd)');
  check(qe(d).length===1&&qe(d)[0].key==='41','K13 alleen het veilige item in de kopie; het overgeslagen item staat nog in de echte wachtrij');
  check(d.complete===false&&d.restoreAllowed===false&&d.omissions.length>=1,'K14 kopie blijft complete:false en restoreAllowed:false, met zichtbare omissie'); },'K13');

/* 11 — versleutelde kopie, read-only preview, bestaande back-ups */
(async()=>{
  const PASS='een lange wachtzin voor test';
  try{
    const d=prep({queue:[q({id:50,body:{id:'s1',reps:5}}),q({id:51,body:{id:'s2',meta:JSON.stringify({refresh_token:CANARY})}})]});
    const p=await B.inspect(await B.encrypt(d,PASS,webcrypto),PASS,webcrypto);
    check(p.entries===1&&!JSON.stringify(p.data).includes(CANARY)&&p.complete===false&&p.restoreAllowed===false,'K11 nieuwe versleutelde kopie: geen credential, read-only preview, nooit volledig/herstelbaar');
  }catch(e){ check(false,'K11 versleutelen/preview faalde: '+(e&&e.message)); }
  try{
    // Bestaand v1-bestand (210.000 iteraties) met geldige gegevens blijft leesbaar; geen automatische migratie.
    const enc=new TextEncoder(), s=webcrypto.subtle, salt=webcrypto.getRandomValues(new Uint8Array(16)), iv=webcrypto.getRandomValues(new Uint8Array(12));
    const data={format:B.DATA_FORMAT,owner:A,created:T,entries:[{storage:'offline_queue',key:'3',value:{table:'sessions',method:'POST',body:{id:'x',meta:JSON.stringify({rpe:7})}},source:'offline_wachtrij'},{storage:'localStorage',key:'sel_rowing',value:'PM5',source:'machinekeuze'}],omissions:[],complete:false,restoreAllowed:false};
    const base=await s.importKey('raw',enc.encode(PASS),'PBKDF2',false,['deriveKey']);
    const key=await s.deriveKey({name:'PBKDF2',salt,iterations:210000,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt']);
    const ct=await s.encrypt({name:'AES-GCM',iv,additionalData:enc.encode(B.FORMAT)},key,enc.encode(JSON.stringify(data)));
    const b64=a=>Buffer.from(a).toString('base64');
    const p=await B.inspect({format:B.FORMAT,kdf:'PBKDF2-SHA256',iterations:210000,cipher:'AES-256-GCM',salt:b64(salt),iv:b64(iv),data:b64(new Uint8Array(ct))},PASS,webcrypto);
    check(p.entries===2&&p.legacyKdf===true&&p.restoreAllowed===false,'K11 bestaand v1-back-upbestand met geldige gegevens blijft leesbaar in de read-only preview');
  }catch(e){ check(false,'K11 bestaand v1-bestand niet leesbaar: '+(e&&e.message)); }
  klaar=true;
  if(RED){ console.log('SEC-570-03 RED-modus: '+rood+' van '+n+' scenario\'s RED'); process.exitCode=rood?1:0; }
  else console.log('SEC-570-03: '+n+'/'+n);
})().catch(e=>{ console.error('FAIL',e&&e.stack||e); process.exitCode=1; });
