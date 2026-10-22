/* SEC-570-01 / SEC-570-02 — negatieve regressietests uit de onafhankelijke eindacceptatie van PR #570 (21-10-2026).
 *
 * SEC-570-01  core/serverVerification.js — verifyRecord() controleerde wel de eigenaar van de serverrij, maar niet een
 *             meegegeven lokale verwacht[eigenaarVeld]. Ook gemanipuleerd of tegenstrijdig bewijs in
 *             beoordeelRegister()/uninstallGate() mag nooit "toegestaan" opleveren.
 * SEC-570-02  core/localBackup.js — prepare() exporteerde een wachtrijrecord van eigenaar A waarvan de body een
 *             JSON-tekst met eigenaar B was (embeddedOtherOwner() inspecteerde alleen objecten en filters).
 *
 * TK_RED=1 draait alle scenario's door en meldt RED in plaats van te stoppen (bewijs tegen de oude code).
 * De mutatiecontrole staat in fSec570Mutants.test.js. */
'use strict';
const assert=require('assert');
const {webcrypto}=require('crypto');
const V=require('./serverVerification.js');
const B=require('./localBackup.js');
const I=require('./localInventory.js');
const RED=!!process.env.TK_RED;
let n=0, rood=0, klaar=false;
process.on('exit',()=>{ if(!klaar&&!RED){ console.error('FAIL niet alle scenario\'s afgerond'); process.exitCode=1; } });
const check=(ok,label)=>{ n++; if(RED){ if(!ok)rood++; console.log(ok?'PASS':'RED ',label); return; } assert(ok,label); console.log('PASS',label); };
const S=V.STATUS, T='2026-10-21T12:00:00Z';

/* ---------------------------------------------------------------- SEC-570-01 — verifyRecord */
const vr=(o)=>V.verifyRecord(Object.assign({eigenaar:'A',eigenaarVeld:'user_id',velden:['value'],bron:'independent',tijdstip:T,tabel:'sessions',revisie:1},o));
const SRV={id:'row1',user_id:'A',value:7};
{ // Oorspronkelijke reproductie van de auditor (letterlijk).
  const r=V.verifyRecord({verwacht:{id:'row1',user_id:'B',value:7},server:{id:'row1',user_id:'A',value:7},eigenaar:'A',eigenaarVeld:'user_id',velden:['value'],bron:'independent',tijdstip:new Date().toISOString(),tabel:'sessions',revisie:1});
  check(r.status!==S.SERVER_VERIFIED,'A1 SEC-570-01 lokale eigenaar B, opgegeven/server-eigenaar A → nooit SERVER_VERIFIED');
  check(r.status===S.UNKNOWN&&r.definitief===false&&r.verified_at===null&&r.afwijkingen.indexOf('eigenaar_lokaal_tegenstrijdig')>=0,'A1 tegenstrijdige lokale eigenaar → UNKNOWN, niet definitief, herkenbare reden'); }
[['null',null],['lege tekst',''],['array met de juiste eigenaar',['A']],['object',{id:'A'}],['andere eigenaar','B'],['NaN',NaN]].forEach(([naam,w])=>{
  check(vr({verwacht:{id:'row1',user_id:w,value:7},server:SRV}).status!==S.SERVER_VERIFIED,'A2 lokaal eigenaarsveld '+naam+' → niet geverifieerd');
});
check(vr({verwacht:{id:'row1',user_id:'A',value:7},server:SRV}).status===S.SERVER_VERIFIED,'A3 lokale eigenaar gelijk aan opgegeven en server-eigenaar → SERVER_VERIFIED (positieve controle)');
check(vr({verwacht:{id:'row1',value:7},server:SRV}).status===S.SERVER_VERIFIED,'A4 lokaal geen eigenaarsveld (productievorm, verwachtVan() laat het weg), server-eigenaar klopt → SERVER_VERIFIED');
{ const r=vr({verwacht:{id:'row1',value:7},server:{id:'row1',user_id:'B',value:7}});
  check(r.status===S.MISMATCH&&r.afwijkingen.indexOf('eigenaar')>=0,'A5 lokaal geen eigenaarsveld is geen bewijs: server-eigenaar B → MISMATCH(eigenaar)'); }
check(vr({verwacht:{id:'row1',value:7},server:{id:'row1',value:7}}).status===S.MISMATCH,'A6 lokaal én server zonder eigenaar → MISMATCH (ontbrekend eigendom is geen bewijs)');
check(vr({verwacht:{id:'row1',value:7},server:{id:'row1',user_id:['A'],value:7}}).status!==S.SERVER_VERIFIED,'A7 server-eigenaar als array [\'A\'] → niet geverifieerd (geen String()-coërcie als eigendomsbewijs)');
check(vr({verwacht:{id:'row1',value:7},server:SRV,eigenaar:['A']}).status===S.UNKNOWN,'A8 opgegeven eigenaar als array → UNKNOWN (onvolledige invoer)');
check(vr({verwacht:{id:'row1',value:7},server:SRV,eigenaar:''}).status===S.UNKNOWN,'A8 opgegeven eigenaar leeg → UNKNOWN');
// DELETE-bewijspad: een bewezen verwijdering van een record met een tegenstrijdige lokale eigenaar is geen bewijs.
check(vr({verwacht:{id:'row1',user_id:'B'},velden:[],verwijderd:true,verwijderBewezen:true,server:null}).status!==S.SERVER_VERIFIED,'A9 DELETE-pad met tegenstrijdige lokale eigenaar → niet geverifieerd');
check(vr({verwacht:{id:'row1',user_id:'A'},velden:[],verwijderd:true,verwijderBewezen:true,server:null}).status===S.SERVER_VERIFIED,'A10 DELETE-pad met gelijke lokale eigenaar en bewijs → bevestigd (positieve controle)');
// Eigendom via de ouder (geen eigen eigenaarsveld) blijft werken.
{ const kind={tabel:'nutrition_meal_items',eigenaarVeld:null,verwacht:{id:'i1',value:3},server:{id:'i1',meal_id:'m1',value:3}};
  check(vr(Object.assign({},kind,{eigenaarViaOuder:true})).status===S.SERVER_VERIFIED,'A11 eigendom via de ouder (eigenaarVeld:null + eigenaarViaOuder) → geverifieerd (positieve controle)');
  check(vr(kind).status!==S.SERVER_VERIFIED,'A11 eigenaarVeld:null zonder eigenaarViaOuder → niet geverifieerd'); }
{ const BASIS={eigenaar:'A',bron:'independent',tijdstip:T,oudertabel:'nutrition_meals',kindtabel:'nutrition_meal_items',ouderRevisie:1,kindRevisies:[1],
    kindEigenaarVeld:null,oudervelden:['name'],kindvelden:['value'],kinderen:[{id:'i1',meal_id:'m1',value:3}],serverKinderen:[{id:'i1',meal_id:'m1',value:3}]};
  const pc=(o)=>V.verifyParentChildren(Object.assign({},BASIS,o));
  check(pc({ouder:{id:'m1',name:'Ontbijt'},serverOuder:{id:'m1',user_id:'A',name:'Ontbijt'}}).status===S.SERVER_VERIFIED,'A12 ouder-kind met juiste eigenaar → SERVER_VERIFIED (positieve controle)');
  const fout=pc({ouder:{id:'m1',user_id:'B',name:'Ontbijt'},serverOuder:{id:'m1',user_id:'A',name:'Ontbijt'}});
  check(fout.status!==S.SERVER_VERIFIED&&fout.ouder.status!==S.SERVER_VERIFIED&&fout.kinderen.every(k=>k.status!==S.SERVER_VERIFIED),'A13 ouder met tegenstrijdige lokale eigenaar → ouder én via-ouder-kinderen niet geverifieerd'); }

/* ---------------------------------------------------------------- SEC-570-01 — beoordeelRegister / uninstallGate */
const ITEM={tabel:'sessions',record_id:'row1',eigenaar:'A',revisie:1};
const echt=vr({verwacht:{id:'row1',value:7},server:SRV});
const reg=(o)=>V.beoordeelRegister(Object.assign({register:{aanwezig:true,defect:false,items:[ITEM]},resultaten:[echt],historisch:{geinventariseerd:true,aantal:0},onleesbaar:[]},o));
check(echt.status===S.SERVER_VERIFIED&&reg({}).toegestaan===true,'B0 echte uitkomst voor exact deze identiteit → toegestaan (positieve controle)');
{ const r=V.verifyRecord({verwacht:{id:'row1',user_id:'B',value:7},server:{id:'row1',user_id:'A',value:7},eigenaar:'A',eigenaarVeld:'user_id',velden:['value'],bron:'independent',tijdstip:T,tabel:'sessions',revisie:1});
  check(reg({resultaten:[r]}).toegestaan===false,'B1 auditscenario: uitkomst met tegenstrijdige lokale eigenaar → poort weigert'); }
const vals=(w)=>Object.assign({},echt,w);
[['SERVER_VERIFIED met afwijkingen',{afwijkingen:['eigenaar']}],['zonder verified_at',{verified_at:null}],['lege verified_at',{verified_at:''}],
 ['andere contractversie',{versie:'serververify.v0'}],['afwijkingen geen lijst',{afwijkingen:'geen'}],
 ['sleutel van eigenaar B bij owner_uid A',{sleutel:V.sleutel('sessions','row1','B')}],['zonder sleutel',{sleutel:null}],
 ['revisie als array',{revisie:[1]}],['owner_uid als array',{owner_uid:['A']}],['tabel als array',{tabel:['sessions']}]
].forEach(([naam,w])=>check(reg({resultaten:[vals(w)]}).toegestaan===false,'B2 gemanipuleerd bewijs ('+naam+') → poort weigert'));
check(reg({resultaten:[vr({verwacht:{id:'row1',value:7},server:{id:'row1',user_id:'B',value:7},eigenaar:'B'})]}).toegestaan===false,'B3 geldige uitkomst voor eigenaar B telt niet voor het registeritem van A');
check(reg({register:{aanwezig:true,defect:false,items:[Object.assign({},ITEM,{tabel:['sessions']})]}}).toegestaan===false,'B4 registeritem met tabel als array → identiteit onvolledig, geweigerd');
check(reg({register:{aanwezig:true,defect:false,items:[Object.assign({},ITEM,{eigenaar:['A']})]}}).toegestaan===false,'B4 registeritem met eigenaar als array → geweigerd');
check(reg({register:{aanwezig:true,defect:false,items:[Object.assign({},ITEM,{revisie:[1]})]}}).toegestaan===false,'B4 registeritem met revisie als array → geweigerd');
check(reg({register:{aanwezig:true,defect:false,items:[null]}}).toegestaan===false,'B4 leeg registeritem → geweigerd');
check(reg({historisch:{geinventariseerd:false,aantal:0}}).toegestaan===false,'B5 onvolledig: historie niet geïnventariseerd → geweigerd');
check(reg({onleesbaar:['wachtrij']}).toegestaan===false,'B5 onvolledig: lokale bron onleesbaar → geweigerd');
check(reg({resultaten:[echt,vals({status:S.MISMATCH,afwijkingen:['veld:value'],verified_at:null})]}).toegestaan===false,'B6 tegenstrijdig: VERIFIED én MISMATCH voor dezelfde identiteit → zwaarste telt');
check(reg({resultaten:[{status:'SERVER_VERIFIED',tabel:'sessions',record_id:'row1',owner_uid:'A',revisie:1}]}).toegestaan===false,'B7 handmatig opgebouwde, onvolledige uitkomst (alleen status/identiteit) → geweigerd');
const INV=(o)=>Object.assign({volledig:true,onleesbaar:[],ids:[ITEM],historischGeinventariseerd:true,historischAantal:0},o);
const gate=(o)=>V.uninstallGate(Object.assign({inventaris:INV(),resultaten:[echt]},o));
check(gate({}).toegestaan===true,'G0 uninstallGate met echte uitkomst → toegestaan (positieve controle)');
check(gate({resultaten:[vals({afwijkingen:['eigenaar']})]}).toegestaan===false,'G1 uninstallGate met tegenstrijdig bewijs → geweigerd');
check(gate({resultaten:[V.verifyRecord({verwacht:{id:'row1',user_id:'B',value:7},server:SRV,eigenaar:'A',velden:['value'],bron:'x',tijdstip:T,tabel:'sessions',revisie:1})]}).toegestaan===false,'G2 uninstallGate met auditscenario → geweigerd');
check(gate({inventaris:INV({ids:[Object.assign({},ITEM,{eigenaar:['A']})]})}).toegestaan===false,'G3 uninstallGate met eigenaar als array in de inventaris → geweigerd');
check(gate({resultaten:[]}).toegestaan===false,'G4 uninstallGate zonder resultaten → geweigerd');

/* ---------------------------------------------------------------- SEC-570-02 — localBackup.prepare */
const A='user_aaaaaaaa', Bo='user_bbbbbbbb';
const prep=(queue)=>B.prepare({owner:A,cacheOwner:A,manifest:I.BRONNEN,local:{},queue});
const qe=(d)=>d.entries.filter(x=>x.storage==='offline_queue');
const reden=(d,r)=>d.omissions.some(o=>o.source==='offline_queue'&&o.reason===r);
{ // Oorspronkelijke reproductie van de auditor (letterlijk) + de invoer blijft ongewijzigd.
  const queue=[{id:1,owner_uid:A,table:'sessions',method:'POST',body:JSON.stringify({user_id:Bo,id:'row1'})}];
  const voor=JSON.stringify(queue);
  const d=prep(queue);
  check(!d.entries.some(x=>x.storage==='offline_queue'),'C1 SEC-570-02 body als JSON-tekst met eigenaar B → niet in de back-up van A');
  check(reden(d,'unexpected_payload_type'),'C1 uitsluiting herkenbaar (unexpected_payload_type)');
  check(JSON.stringify(queue)===voor,'C1 wachtrij-invoer ongewijzigd (prepare() verwijdert of wijzigt geen wachtrijrecords)');
  check(d.complete===false&&d.restoreAllowed===false,'C1 kopie blijft gemarkeerd als onvolledig en niet herstelbaar'); }
const q=(o)=>Object.assign({id:2,owner_uid:A,table:'sessions',method:'POST'},o);
[
  ['geneste JSON-tekst met eigenaar B',q({body:{id:'s1',meta:JSON.stringify({user_id:Bo})}}),'payload_other_owner'],
  ['dubbel gecodeerde JSON-tekst met eigenaar B',q({body:{id:'s1',meta:JSON.stringify(JSON.stringify({user_id:Bo}))}}),'payload_other_owner'],
  ['diep geneste JSON-tekst in array',q({body:{id:'s1',lijst:[{x:[JSON.stringify([{owner_uid:Bo}])]}]}}),'payload_other_owner'],
  ['array van rijen, één met eigenaar B',q({body:[{id:'s1',user_id:A},{id:'s2',user_id:Bo}]}),'payload_other_owner'],
  ['RPC-args met JSON-tekst p_user_id B',{id:3,owner_uid:A,table:null,method:'RPC',function:'f',args:{snapshot:JSON.stringify({p_user_id:Bo})}},'payload_other_owner'],
  ['ongeldige JSON die een eigenaarskolom noemt',q({body:{id:'s1',meta:'{"user_id":"'+Bo+'",'}}),'payload_unverifiable'],
  ['tekst met eigenaarsfilter van B',q({body:{id:'s1',note:'user_id=eq.'+Bo}}),'payload_unverifiable'],
  ['eigenaar als array met de juiste waarde',q({body:{id:'s1',user_id:[A]}}),'payload_other_owner'],
  ['eigenaar als getal',q({body:{id:'s1',user_id:12345678}}),'payload_other_owner'],
  ['eigenaar als object',q({body:{id:'s1',user_id:{id:A}}}),'payload_other_owner'],
  ['eigenaarskolom in hoofdletters',q({body:{id:'s1',USER_ID:Bo}}),'payload_other_owner'],
  ['eigenaarssleutel met spatie',q({body:{id:'s1','user_id ':Bo}}),'payload_unverifiable'],
  ['filter or=(user_id.eq.B)',q({method:'PATCH',filter:'or=(user_id.eq.'+Bo+')',body:{x:1}}),'payload_unverifiable'],
  ['filter user_id=neq.A',q({method:'DELETE',filter:'id=eq.1&user_id=neq.'+A}),'payload_other_owner'],
  ['filter met eigen én andere eigenaar',q({method:'DELETE',filter:'user_id=eq.'+A+'&user_id=eq.'+Bo}),'payload_other_owner'],
  ['percent-gecodeerde eigenaarskolom in filter',q({method:'DELETE',filter:'user%5Fid=eq.'+Bo}),'payload_other_owner'],
  ['ongeldige percent-codering in filter',q({method:'DELETE',filter:'user_id=eq.%ZZ'}),'payload_other_owner'],
  ['args als tekst',{id:4,owner_uid:A,table:null,method:'RPC',function:'f',args:'{"x":1}'},'unexpected_payload_type'],
  ['body als getal',q({body:5}),'unexpected_payload_type'],
  ['filter als object',q({method:'PATCH',filter:{user_id:A},body:{x:1}}),'unexpected_payload_type']
].forEach(([naam,item,r])=>{ const d=prep([item]); check(qe(d).length===0&&reden(d,r),'C2 '+naam+' → niet in de kopie ('+r+')'); });
{ let diep={user_id:A}; for(let k=0;k<40;k++)diep={x:diep};
  let d=null, gooit=false; try{ d=prep([q({body:diep})]); }catch(_){ gooit=true; }
  check(!gooit&&qe(d).length===0&&reden(d,'payload_unverifiable'),'C3 te diep genest → herkenbaar overgeslagen, geen crash'); }
check(qe(prep([{id:5,table:'sessions',method:'POST',body:{id:'s1'}}])).length===0,'C4 wachtrijrecord zonder owner_uid → niet in de kopie');
check(qe(prep([{id:5,owner_uid:Bo,table:'sessions',method:'POST',body:{id:'s1'}}])).length===0,'C4 wachtrijrecord van eigenaar B → niet in de kopie');
// Positieve controles: geldige productievormen en legacyrecords zonder payloadeigenaar blijven in de kopie.
{ const geldig=[
    {id:10,owner_uid:A,ts:1,table:'sessions',method:'POST',body:{id:'s1',user_id:A,reps:5}},
    {id:11,owner_uid:A,ts:1,table:'sessions',method:'POST',body:[{id:'s2',user_id:A},{id:'s3',user_id:A}],resolution:'ignore-duplicates',onzeker:true},
    {id:12,owner_uid:A,ts:1,table:'message_participants',method:'PATCH',filter:'thread_id=eq.t1&user_id=eq.'+A,body:{last_read_at:T}},
    {id:13,owner_uid:A,ts:1,table:'sessions',method:'DELETE',filter:'id=eq.s9'},
    {id:14,owner_uid:A,ts:1,table:null,method:'RPC',function:'save_x',args:{p_user_id:A,definition_snapshot:{user_id:A,naam:'Push'}}},
    {id:15,owner_uid:A,ts:1,table:'sessions',method:'POST',body:{id:'s4',reps:3}},
    {id:16,owner_uid:A,ts:1,table:'sessions',method:'POST',body:{id:'s5',meta:JSON.stringify({user_id:A,k:1})}},
    {id:17,owner_uid:A,ts:1,table:'sessions',method:'POST',body:{id:'s6',note:'{niet-json maar zonder eigenaar'}},
    {id:18,owner_uid:A,ts:1,table:'sessions',method:'POST',body:{id:'s7',user_id:null}}
  ];
  const d=prep(geldig);
  check(qe(d).length===geldig.length,'C5 geldige productievormen (POST/array/PATCH-filter/DELETE/RPC), legacy zonder payloadeigenaar en eigen JSON-tekst → allemaal in de kopie');
  check(qe(d).every(e=>!('owner_uid' in e.value)&&!('ts' in e.value)),'C5 kopie-items zonder id/ts/owner_uid (ongewijzigd formaat)');
  check(B.valideer(d,I.BRONNEN)===true,'C5 kopie voldoet aan de bestaande inhoudsvalidatie'); }

/* ---------------------------------------------------------------- versleutelde kopie + read-only preview */
(async()=>{
  const PASS='een lange wachtzin voor test';
  try{
    const d=prep([{id:20,owner_uid:A,ts:1,table:'sessions',method:'POST',body:{id:'s1',user_id:A,reps:5}},{id:21,owner_uid:A,table:'sessions',method:'POST',body:JSON.stringify({user_id:Bo,id:'x'})}]);
    const env=await B.encrypt(d,PASS,webcrypto);
    const p=await B.inspect(env,PASS,webcrypto);
    check(p.owner===A&&p.entries===1&&p.complete===false&&p.restoreAllowed===false&&!JSON.stringify(p.data).includes(Bo),'D1 versleutelen + read-only preview: alleen het geldige item, geen gegevens van B, nooit volledig/herstelbaar');
  }catch(e){ check(false,'D1 versleutelen + read-only preview faalde: '+(e&&e.message)); }
  // Bestaand v1-formaat (210.000 iteraties) blijft leesbaar.
  try{
    const enc=new TextEncoder(), s=webcrypto.subtle, salt=webcrypto.getRandomValues(new Uint8Array(16)), iv=webcrypto.getRandomValues(new Uint8Array(12));
    const data={format:B.DATA_FORMAT,owner:A,created:T,entries:[{storage:'offline_queue',key:'3',value:{table:'sessions',method:'POST',body:{id:'x'}},source:'offline_wachtrij'}],omissions:[],complete:false,restoreAllowed:false};
    const base=await s.importKey('raw',enc.encode(PASS),'PBKDF2',false,['deriveKey']);
    const key=await s.deriveKey({name:'PBKDF2',salt,iterations:210000,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt']);
    const ct=await s.encrypt({name:'AES-GCM',iv,additionalData:enc.encode(B.FORMAT)},key,enc.encode(JSON.stringify(data)));
    const b64=a=>Buffer.from(a).toString('base64');
    const p=await B.inspect({format:B.FORMAT,kdf:'PBKDF2-SHA256',iterations:210000,cipher:'AES-256-GCM',salt:b64(salt),iv:b64(iv),data:b64(new Uint8Array(ct))},PASS,webcrypto);
    check(p.entries===1&&p.legacyKdf===true&&p.restoreAllowed===false,'D2 bestaand v1-back-upbestand blijft leesbaar in de read-only preview');
  }catch(e){ check(false,'D2 bestaand v1-back-upbestand niet leesbaar: '+(e&&e.message)); }
  klaar=true;
  if(RED){ console.log('SEC-570 RED-modus: '+rood+' van '+n+' scenario\'s RED'); process.exitCode=rood?1:0; }
  else console.log('SEC-570: '+n+'/'+n);
})().catch(e=>{ console.error('FAIL',e&&e.stack||e); process.exitCode=1; });
