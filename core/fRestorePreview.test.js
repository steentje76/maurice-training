/* TK-REL-SEC-31 — herstelpreview fase 4B (19-10-2026). Draait de ECHTE blokken uit index.html (schrijflaag, fase-2-
 * leesroute, herstelpreview) met echte WebCrypto, een Web-Storage-nabootsing en een nep-server met RLS.
 *  P1 geldige kopie → plan met aantallen; nooit herstel toegestaan;
 *  P2 verkeerde wachtzin; P3 beschadigde ciphertext; P4 gewijzigde salt, IV, iteraties of KDF → geweigerd;
 *  P5 account A opent de kopie van B → geweigerd zonder aantallen of inhoud;
 *  P6 accountwissel tijdens het lezen van het bestand of tijdens het teruglezen bij de server → gestopt;
 *  P7 identiek lokaal record → BESTAAT_AL; P8 conflicterend lokaal record → CONFLICT;
 *  P9 oud formaat (v1-sleutelafleiding) leesbaar met waarschuwing; onbekend formaat geweigerd; oude opslagstructuur →
 *     NIET_ONDERSTEUND;
 *  P10 onvolledige kopie (weggelaten bronnen, weggelaten geheimvelden) zichtbaar; P11 kind zonder ouder → ONBEKEND;
 *  P12 te groot, leeg of ongeldig bestand → geweigerd zonder inlezen; P13 onderbreking tijdens het inlezen → fail-closed,
 *     tweede poging werkt; P14 herhaalde preview: identiek plan, lokale opslag en wachtrij byte-gelijk, alleen GET;
 *  P15 al op de server; niet-idempotente insert en concept → NIET_ONDERSTEUND; inhoud met een andere eigenaar → ANDER_ACCOUNT;
 *  P16 scherm: melding, aantallen, wachtzin gewist, "Herstel uitvoeren" uitgeschakeld; geen telemetrie; plan zonder inhoud. */
'use strict';
const assert=require('assert');
const {webcrypto}=require('crypto');
const {maak,fn,grab,db,koppel,HTML}=require('./fixtures/schrijfHarnas');
const {maakIndexedDb}=require('./fixtures/miniIndexedDb');
const INV=require('./localInventory.js'), B=require('./localBackup.js');
let RP=null; try{ RP=require('./restorePreview.js'); }catch(_){ RP=null; }
let klaar=false,n=0;
process.on('exit',()=>{if(!klaar){console.error('FAIL niet alle scenario\'s afgerond (hangende promise)');process.exitCode=1;}});
const RED=!!process.env.TK_RED;
const check=(ok,label)=>{ if(RED){ n++; console.log(ok?'PASS':'RED ',label); return; } assert(ok,label);n++;console.log('PASS',label);};
const stap=async(f)=>{ try{ await f(); }catch(e){ if(!RED)throw e; console.log('RED  (scenario afgebroken: '+String(e&&e.message||e).slice(0,90)+')'); } };
const UA='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', UB='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', PASS='een lange wachtzin voor test';
const BLOK2=grab('// SERVER READ-AFTER-WRITE, FASE 2','// HISTORISCHE INVENTARIS EN BASISMETING, FASE 3');
let BLOKP=''; if(HTML.indexOf('// TK-REL-SEC-31: HERSTELPREVIEW')>=0)BLOKP=grab('// TK-REL-SEC-31: HERSTELPREVIEW','async function exportJSON(){');
const HULP=[fn('function tkTrainingOefendoelen('),fn('function tkTrainingInhoud('),fn('function tkTrainingVanServer(')].join('\n');
function opslag(init){ const m=new Map(Object.entries(init||{}));
  return {get length(){return m.size;},key:i=>[...m.keys()][i]===undefined?null:[...m.keys()][i],getItem(k){ (this._gelezen=this._gelezen||[]).push(k); return m.has(k)?m.get(k):null; },
    setItem:(k,v)=>{m.set(k,String(v));},removeItem:k=>{m.delete(k);},_dump:()=>JSON.stringify([...m.entries()])}; }
const T=(id,naam,ex)=>({id,name:naam,color:'#111111',note:'',exercises:ex,source:null,metadata:null,exercise_targets:ex.map(e=>({exercise_id:e,sets:null,reps:null,rpe:null,rest:null,pick:null}))});
function opzet(o){
  o=o||{};
  const logs=[];
  const ls=opslag(Object.assign({tk_cache_owner_uid:UA},o.ls||{}));
  const el={}; const veld=id=>(el[id]=el[id]||{value:'',innerHTML:'',textContent:'',files:null});
  const h=maak({extraSrc:HULP+'\n'+BLOK2+'\n'+BLOKP,login:null,online:o.online,ctx:{indexedDB:maakIndexedDb(),localStorage:ls,ServerVerificationCore:require('./serverVerification.js'),
    LocalInventoryCore:INV,TKLocalBackup:B,TKRestorePreview:RP,CACHE_OWNER_KEY:'tk_cache_owner_uid',escHtml:x=>String(x),document:{getElementById:veld,querySelectorAll:()=>[],querySelector:()=>null},
    ObservabilityCore:{tkLog:function(){logs.push(JSON.stringify([].slice.call(arguments)));}},TextEncoder,TextDecoder}});
  h.ctx.window.crypto=webcrypto; h.ctx.crypto=webcrypto;
  const login=uid=>{ h.ctx.authSession=uid?{user:{id:uid},access_token:'t'+uid.slice(0,1),refresh_token:'r'}:null; h.ctx.SB_H.Authorization=uid?'Bearer t'+uid.slice(0,1):'Bearer anon'; };
  login(o.login===undefined?UA:o.login);
  const d=db(); koppel(h,d); d.zichtbaar=(t,r,uid)=>!r.user_id||r.user_id===uid;
  (o.queue||[]).forEach((q,i)=>h.st.queue.push({id:100+i,item:q.item,eigenaar:q.owner}));
  return {h,d,ls,veld,logs,login};
}
async function kopie(o){ // maak een echte kopie zoals de app (prepare + encrypt)
  o=o||{};
  const data=B.prepare({owner:o.owner||UA,cacheOwner:o.owner||UA,manifest:INV.BRONNEN,local:o.local||{},queue:(o.queue||[]).map((q,i)=>Object.assign({id:i+1,ts:1,owner_uid:o.owner||UA},q))});
  if(o.muteer)o.muteer(data);
  return JSON.stringify(await B.encrypt(data,PASS,webcrypto));
}
const bestand=(tekst,o)=>({size:(o&&o.size)||Buffer.byteLength(tekst),text:(o&&o.text)||(async()=>tekst)});
const st=(p,b,rs)=>((p.records||[]).find(r=>r.bron===b&&(!rs||r.record_sleutel===rs))||{}).status;
async function versleutelRuw(data,iter){ // geldige envelop rond willekeurige (al gevalideerde) inhoud
  const enc=new TextEncoder(), s=webcrypto.subtle, salt=webcrypto.getRandomValues(new Uint8Array(16)), iv=webcrypto.getRandomValues(new Uint8Array(12));
  const base=await s.importKey('raw',enc.encode(PASS),'PBKDF2',false,['deriveKey']);
  const key=await s.deriveKey({name:'PBKDF2',salt,iterations:iter,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt']);
  const ct=await s.encrypt({name:'AES-GCM',iv,additionalData:enc.encode(B.FORMAT)},key,enc.encode(JSON.stringify(data)));
  const b=a=>Buffer.from(a).toString('base64');
  return JSON.stringify({format:B.FORMAT,kdf:'PBKDF2-SHA256',iterations:iter,cipher:'AES-256-GCM',salt:b(salt),iv:b(iv),data:b(new Uint8Array(ct))});
}

(async()=>{
  const bestaat=!!RP&&typeof (opzet().h.ctx.tkHerstelPreview)==='function';
  check(bestaat,'P0 herstelpreview aanwezig (core/restorePreview.js en tkHerstelPreview)');
  if(!bestaat&&RED){ console.log('RED  (alle P-scenario\'s: herstelpreview ontbreekt)'); klaar=true; return; }
  const LOK={tk_trainings:JSON.stringify([T('ct1','Push',['squat']),T('ct2','Pull',['row'])]),tk_coach_style:'kort',tk_gw_hist:JSON.stringify({squat:{weight:80},bench:{weight:60}})};
  const KOPIE_LOK={tk_trainings:JSON.stringify([T('ct1','Push',['squat']),T('ct2','Pull',['deadlift']),T('ct3','Benen',['lunge'])]),tk_coach_style:'kort',
    tk_gw_hist:JSON.stringify({squat:{weight:80},bench:{weight:65},row:{weight:50}}),tk_draft_training:JSON.stringify({t:'kracht',sessionLog:{}}),tk_wb_saved:JSON.stringify([{id:'w1'}]),
    tk_trainings_onbevestigd:JSON.stringify(['ct3','ct9'])};
  const KOPIE_Q=[{table:'custom_training_exercises',method:'POST',body:{id:'e1',custom_training_id:'ct3',exercise_id:'lunge'}},
    {table:'custom_training_exercises',method:'POST',body:{id:'e2',custom_training_id:'ctX',exercise_id:'row'}},
    {table:'sessions',method:'POST',body:{exercise_id:'squat',reps:5}},
    {table:'nutrition_meals',method:'POST',body:{id:'m1',user_id:UA,meal_type:'ontbijt'}},
    {table:'goals',method:'PATCH',filter:'id=eq.4',body:{naam:'x'}}];
  // P1 + P7 + P8 + P9 (legacy bron) + P10 + P11 + P15 + P14
  await stap(async()=>{ const {h,d,ls}=opzet({ls:LOK,queue:[{owner:UA,item:{table:'goals',method:'PATCH',filter:'id=eq.4',body:{naam:'x'}}}]});
    d.tabel('custom_trainings').push({id:'ct1',user_id:UA,naam:'Push',kleur:null,notitie:null,source:null,metadata:null});
    d.tabel('custom_training_exercises').push({id:'x1',user_id:UA,custom_training_id:'ct1',exercise_id:'squat',sets:null,reps:null,rpe:null,rest:null,pick:null});
    d.tabel('nutrition_meals').push({id:'m1',user_id:UA,meal_type:'ontbijt'});
    const tekst=await kopie({local:Object.assign({tk_cache_owner_uid:UA},KOPIE_LOK),queue:KOPIE_Q});
    const voorLs=ls._dump(), voorQ=JSON.stringify(h.st.queue);
    const u=await h.ctx.tkHerstelPreview(bestand(tekst),PASS);
    const p=u.plan||{};
    check(u.ok===true&&p.herstel_toegestaan===false&&p.melding===RP.MELDING,'P1 geldige kopie → plan, herstel nooit toegestaan, met de verplichte melding');
    check(st(p,'eigen_trainingen','id:ct1')==='BESTAAT_AL'&&st(p,'begeleide_training_historie','sleutel:squat')==='BESTAAT_AL'&&st(p,'coach_stijl')==='BESTAAT_AL','P7 identieke lokale records → BESTAAT_AL');
    check(st(p,'eigen_trainingen','id:ct2')==='CONFLICT'&&st(p,'begeleide_training_historie','sleutel:bench')==='CONFLICT','P8 zelfde identiteit, andere inhoud → CONFLICT');
    check(st(p,'eigen_trainingen','id:ct3')==='HERSTELBAAR'&&st(p,'begeleide_training_historie','sleutel:row')==='HERSTELBAAR','P1 lokaal afwezig en ondersteund → HERSTELBAAR');
    check(st(p,'builder_opgeslagen_legacy')==='NIET_ONDERSTEUND'&&st(p,'actieve_training')==='NIET_ONDERSTEUND','P9 oude opslagstructuur en concept → NIET_ONDERSTEUND');
    check(st(p,'trainingen_onbevestigd','id:ct3')==='HERSTELBAAR'&&st(p,'trainingen_onbevestigd','id:ct9')==='ONBEKEND','P11 markering zonder training → ONBEKEND (ouder ontbreekt)');
    check(st(p,'offline_wachtrij','wachtrij:custom_training_exercises:e1')==='HERSTELBAAR'&&st(p,'offline_wachtrij','wachtrij:custom_training_exercises:e2')==='ONBEKEND','P11 kind met ouder in de kopie → HERSTELBAAR; kind zonder ouder → ONBEKEND');
    const meal=p.records.find(r=>r.record_sleutel==='wachtrij:nutrition_meals:m1');
    check(meal&&meal.op_server==='ja'&&meal.redenen.indexOf('al_op_server')>=0,'P15 wachtrij-insert die al op de server staat → gemarkeerd "al op server"');
    check(p.records.find(r=>r.record_sleutel==='id:ct1').op_server==='ja'&&p.records.find(r=>r.record_sleutel==='id:ct3').op_server==='nee','P15 eigen training: op de server (ja) vs. alleen lokaal (nee, niet definitief)');
    check(p.records.some(r=>r.bron==='offline_wachtrij'&&r.status==='NIET_ONDERSTEUND'&&r.redenen.indexOf('niet_idempotent_dubbel_risico')>=0),'P15 insert zonder client-id → NIET_ONDERSTEUND (dubbel risico)');
    check(st(p,'offline_wachtrij',p.records.find(r=>r.tabel==='goals').record_sleutel)==='BESTAAT_AL','P7 identiek lokaal wachtrij-item → BESTAAT_AL');
    const b=p.bronnen.find(x=>x.bron==='offline_wachtrij');
    check(b&&b.afhankelijkheden.indexOf('custom_trainings')>=0&&b.al_op_server>=1&&b.nader_onderzoek>=1&&b.overslaan>=1,'P3-plan per bron: afhankelijkheden, al op server, overslaan en nader onderzoek');
    check(p.bestand.volledig===false&&p.bestand.overgeslagen_bij_export===0&&p.telling.HERSTELBAAR>=3,'P10 bestand altijd als onvolledig gemarkeerd');
    // P14
    const u2=await h.ctx.tkHerstelPreview(bestand(tekst),PASS);
    check(JSON.stringify(u2.plan)===JSON.stringify(p),'P14 herhaalde preview → identiek (deterministisch) plan');
    check(ls._dump()===voorLs&&JSON.stringify(h.st.queue)===voorQ,'P14 localStorage en offline-wachtrij byte-gelijk na twee previews');
    check(h.st.req.every(r=>r.method==='GET'),'P14 alleen leesverzoeken naar de server');
    const pj=JSON.stringify(p);
    check(!/Push|Benen|lunge|deadlift|ontbijt|kracht|weight/.test(pj)&&!/wachtzin|PASS/.test(pj),'P16 plan bevat geen inhoud, wachtzin of credentials'); });
  // P2–P4
  await stap(async()=>{ const {h}=opzet(); const tekst=await kopie({local:{tk_trainings:'[{"id":"ct1"}]'}}); const env=JSON.parse(tekst);
    const r=async(o,pw)=>(await h.ctx.tkHerstelPreview(bestand(JSON.stringify(Object.assign({},env,o))),pw||PASS)).reden;
    check(await r({},'verkeerde wachtzin 123')==='wachtzin_of_beschadigd','P2 verkeerde wachtzin → geweigerd');
    const ct=Buffer.from(env.data,'base64'); ct[5]^=1;
    check(await r({data:ct.toString('base64')})==='wachtzin_of_beschadigd','P3 beschadigde ciphertext → geweigerd');
    const zout=Buffer.from(env.salt,'base64'); zout[0]^=1; const iv=Buffer.from(env.iv,'base64'); iv[0]^=1;
    check(await r({salt:zout.toString('base64')})==='wachtzin_of_beschadigd'&&await r({iv:iv.toString('base64')})==='wachtzin_of_beschadigd','P4 gewijzigde salt of IV → geweigerd');
    check(await r({iterations:600001})==='onbekend_formaat'&&await r({kdf:'scrypt'})==='onbekend_formaat'&&await r({cipher:'AES-128-GCM'})==='onbekend_formaat','P4 gewijzigde iteraties, KDF of cipher → geweigerd'); });
  // P5
  await stap(async()=>{ const {h}=opzet(); const tekst=await kopie({owner:UB,local:{tk_trainings:'[{"id":"geheim-van-b"}]'}});
    const u=await h.ctx.tkHerstelPreview(bestand(tekst),PASS);
    check(u.ok===false&&u.reden==='ander_account'&&!u.plan&&!/geheim-van-b/.test(JSON.stringify(u)),'P5 A opent de kopie van B → geweigerd, geen aantallen of inhoud'); });
  // P6
  await stap(async()=>{ const {h,login}=opzet(); const tekst=await kopie({local:{tk_trainings:'[{"id":"ct1"}]'}});
    const u=await h.ctx.tkHerstelPreview(bestand(tekst,{text:async()=>{ login(UB); return tekst; }}),PASS);
    check(u.ok===false&&u.reden==='account_gewisseld','P6 accountwissel tijdens het lezen van het bestand → gestopt');
    login(UA); h.net.voor=req=>{ if(req.method==='GET')login(UB); };
    const u2=await h.ctx.tkHerstelPreview(bestand(tekst),PASS); h.net.voor=null;
    check(u2.ok===false&&u2.reden==='account_gewisseld'&&!h.st.req.some(r=>r.token==='Bearer tb'),'P6 accountwissel tijdens het teruglezen → gestopt, geen verzoek met het token van B'); });
  // P9
  await stap(async()=>{ const {h}=opzet(); const data=B.prepare({owner:UA,cacheOwner:UA,manifest:INV.BRONNEN,local:{tk_coach_style:'kort'},queue:[]});
    const u=await h.ctx.tkHerstelPreview(bestand(await versleutelRuw(data,210000)),PASS);
    check(u.ok&&u.plan.bestand.oude_sleutelafleiding===true,'P9 v1-bestand (210.000 iteraties) leesbaar, met waarschuwing');
    const vreemd=JSON.stringify({format:'tk-local-rescue-encrypted.v9',kdf:'PBKDF2-SHA256',iterations:600000,cipher:'AES-256-GCM',salt:'AAAAAAAAAAAAAAAAAAAAAA==',iv:'AAAAAAAAAAAAAAAA',data:'AAAAAAAAAAAAAAAAAAAAAA=='});
    check((await h.ctx.tkHerstelPreview(bestand(vreemd),PASS)).reden==='onbekend_formaat','P9 onbekend formaat → geweigerd'); });
  // P10
  await stap(async()=>{ const {h}=opzet(); const tekst=await kopie({local:{tk_trainings:'[{"id":"ct5","name":"x","password":"weg"}]',onbekende_sleutel:'x',tk_auth_session:'{"access_token":"t"}'}});
    const u=await h.ctx.tkHerstelPreview(bestand(tekst),PASS);
    check(u.ok&&u.plan.bestand.overgeslagen_bij_export>=1&&u.plan.bestand.overgeslagen_per_reden.not_exported>=1,'P10 onvolledige kopie: weggelaten bronnen zichtbaar');
    check(st(u.plan,'eigen_trainingen','id:ct5')==='ONBEKEND','P10 item met weggelaten geheimvelden → ONBEKEND (niet getrouw herstelbaar)'); });
  // P12
  await stap(async()=>{ const {h}=opzet(); let gelezen=false; const lees=async()=>{ gelezen=true; return 'x'; };
    check((await h.ctx.tkHerstelPreview({size:B.MAX_BESTAND+1,text:lees},PASS)).reden==='te_groot'&&!gelezen,'P12 te groot bestand → geweigerd zonder in te lezen');
    check((await h.ctx.tkHerstelPreview({size:0,text:lees},PASS)).reden==='te_groot','P12 leeg bestand → geweigerd');
    check((await h.ctx.tkHerstelPreview(bestand('{dit is geen json'),PASS)).reden==='onbekend_formaat'&&(await h.ctx.tkHerstelPreview(bestand('[]'),PASS)).reden==='onbekend_formaat','P12 ongeldige JSON of structuur → geweigerd');
    const groot=JSON.stringify({format:B.FORMAT,kdf:'PBKDF2-SHA256',iterations:600000,cipher:'AES-256-GCM',salt:'AAAAAAAAAAAAAAAAAAAAAA==',iv:'AAAAAAAAAAAAAAAA',data:'A'.repeat(23*1024*1024)});
    const t0=Date.now(); const ug=await h.ctx.tkHerstelPreview(bestand(groot),PASS);
    check(ug.ok===false&&Date.now()-t0<3000,'P12 envelop met 23 MB data → geweigerd zonder sleutelafleiding ('+(Date.now()-t0)+' ms)'); });
  // P13
  await stap(async()=>{ const {h}=opzet(); const tekst=await kopie({local:{tk_trainings:'[{"id":"ct1"}]'}});
    const u=await h.ctx.tkHerstelPreview(bestand(tekst,{text:async()=>{ throw new Error('NotReadableError'); }}),PASS);
    check(u.ok===false&&u.reden==='lezen_onderbroken','P13 onderbreking tijdens het inlezen → fail-closed');
    check((await h.ctx.tkHerstelPreview(bestand(tekst),PASS)).ok===true,'P13 tweede poging werkt (geen achtergebleven toestand)'); });
  // P15 andere eigenaar in de inhoud
  await stap(async()=>{ const {h}=opzet(); const data=B.prepare({owner:UA,cacheOwner:UA,manifest:INV.BRONNEN,local:{},queue:[]});
    data.entries.push({storage:'offline_queue',key:'9',value:{table:'sessions',method:'POST',body:{id:'s9',user_id:UB}},source:'offline_wachtrij'});
    data.entries.push({storage:'localStorage',key:'tk_running_execution_v1_'+UB,value:'{"state":{}}',source:'hardloop_uitvoering'});
    const u=await h.ctx.tkHerstelPreview(bestand(await versleutelRuw(data,600000)),PASS);
    check(u.ok&&u.plan.telling.ANDER_ACCOUNT===2&&!/s9/.test(JSON.stringify(u.plan.records.filter(r=>r.status==='ANDER_ACCOUNT').map(r=>r.redenen))),'P15 gegevens met een andere eigenaar in de kopie → ANDER_ACCOUNT'); });
  // P16 UI
  await stap(async()=>{ const {h,veld,logs}=opzet({ls:LOK}); const tekst=await kopie({local:Object.assign({tk_cache_owner_uid:UA},KOPIE_LOK),queue:KOPIE_Q});
    veld('tk-restore-file').files=[bestand(tekst)]; veld('tk-restore-pass').value=PASS;
    await h.ctx.tkHerstelPreviewToon();
    const t=veld('tk-restore-result').innerHTML;
    check(/Dit is alleen een controle\. Er worden geen gegevens teruggezet\./.test(t)&&/gegevens in het bestand/.test(t)&&/Potentieel herstelbaar: <b>\d+/.test(t)&&/Conflicten: \d+/.test(t)&&/ander account: \d+/.test(t)&&/onvolledig/.test(t),'P16 scherm: melding, aantallen, conflicten, ander account en onvolledigheid');
    check(veld('tk-restore-pass').value==='','P16 wachtzin gewist');
    check(/id="tk-restore-apply" disabled aria-disabled="true"/.test(HTML)&&!/tk-restore-apply[^\n]*(onclick|disabled\s*=\s*false|removeAttribute)/.test(HTML.replace(/id="tk-restore-apply" disabled aria-disabled="true" title="[^"]*"/,''))&&(HTML.match(/tk-restore-apply/g)||[]).length===1,'P16 "Herstel uitvoeren" uitgeschakeld; geen code die hem inschakelt');
    check(logs.length===0,'P16 geen telemetrie of logging van de preview');
    const zonder=opzet(); zonder.veld('tk-restore-pass').value=PASS; zonder.veld('tk-restore-file').files=[]; await zonder.h.ctx.tkHerstelPreviewToon();
    check(zonder.veld('tk-restore-pass').value===''&&/Dit is alleen een controle/.test(zonder.veld('tk-restore-result').innerHTML),'P16 zonder bestand: wachtzin gewist, melding getoond'); });
  // P17 kern en randgevallen (mutatiegevoelig)
  await stap(async()=>{ const data=B.prepare({owner:UB,cacheOwner:UB,manifest:INV.BRONNEN,local:{tk_coach_style:'x'},queue:[]});
    check(RP.classificeer({data,scanner:UA,lokaal:{}}).ok===false,'P17 kern weigert een kopie van een ander account (ook los van de app)');
    const {h}=opzet(); const tekst=await kopie({owner:UB,local:{tk_trainings:'[{"id":"ctb"}]'}}); const voor=h.st.req.length;
    await h.ctx.tkHerstelPreview(bestand(tekst),PASS);
    check(h.st.req.length===voor,'P17 kopie van een ander account: geen enkel serververzoek'); });
  await stap(async()=>{ const {h,d}=opzet({queue:[{owner:UA,item:{table:'sessions',method:'POST',body:{id:'s5',exercise_id:'squat',reps:9}}}]});
    d.zichtbaar=null; // RLS uit: een rij van een ander wordt zichtbaar
    d.tabel('custom_trainings').push({id:'ctO',user_id:UB,naam:'X',kleur:null,notitie:null,source:null,metadata:null});
    d.tabel('custom_trainings').push({id:'ctS',user_id:UA,naam:'Server',kleur:null,notitie:null,source:null,metadata:null});
    const tekst=await kopie({local:{tk_trainings:JSON.stringify([T('ctO','X',[]),Object.assign(T('ctU','U',[]),{user_id:UB})])},
      queue:[{table:'sessions',method:'POST',body:{id:'s5',exercise_id:'squat',reps:5}},{table:'custom_training_exercises',method:'POST',body:{id:'eS',custom_training_id:'ctS',exercise_id:'row'}},
      ],muteer:dd=>dd.entries.push({storage:'offline_queue',key:'77',value:{table:'goals',method:'PATCH',filter:'user_id=eq.'+UB+'&id=eq.1',body:{naam:'y'}},source:'offline_wachtrij'})}); // oud of gemanipuleerd bestand
    const p=(await h.ctx.tkHerstelPreview(bestand(tekst),PASS)).plan;
    check(p.records.find(r=>r.record_sleutel==='id:ctO').op_server==='nee','P17 serverrij van een andere eigenaar telt niet als "op de server"');
    check(st(p,'eigen_trainingen','id:ctU')==='ANDER_ACCOUNT','P17 eigen training met de user_id van een ander → ANDER_ACCOUNT');
    check(st(p,'offline_wachtrij','wachtrij:sessions:s5')==='CONFLICT','P17 lokaal wachtrij-item met dezelfde identiteit en andere inhoud → CONFLICT');
    check(st(p,'offline_wachtrij','wachtrij:custom_training_exercises:eS')==='HERSTELBAAR','P17 ouder alleen op de server (eigen account) → kind herstelbaar');
    check(p.records.some(r=>r.tabel==='goals'&&r.status==='ANDER_ACCOUNT'),'P17 wachtrijfilter op de user_id van een ander → ANDER_ACCOUNT'); });
  await stap(async()=>{ const {h}=opzet({ls:{tk_cache_owner_uid:UB,tk_coach_style:'kort'}}); const tekst=await kopie({local:{tk_coach_style:'kort'}});
    const p=(await h.ctx.tkHerstelPreview(bestand(tekst),PASS)).plan;
    check(st(p,'coach_stijl')==='HERSTELBAAR','P17 lokale cache van een ander account telt niet als "staat al op dit toestel"'); });
  await stap(async()=>{ const {h}=opzet({ctx:{}}); h.ctx.tkLeesWachtrijStrikt=async()=>{ throw new Error('idb'); };
    const tekst=await kopie({queue:[{table:'goals',method:'PATCH',filter:'id=eq.4',body:{naam:'x'}}]});
    const u=await h.ctx.tkHerstelPreview(bestand(tekst),PASS);
    check(u.ok&&u.lokaleWachtrijLeesbaar===false&&u.plan.records.every(r=>r.bron!=='offline_wachtrij'||r.status==='ONBEKEND'),'P17 onleesbare lokale wachtrij → wachtrij-items ONBEKEND (niet "herstelbaar")'); });
  await stap(async()=>{ const {h,d}=opzet(); d.tabel('custom_trainings').push({id:'ct1',user_id:UA,naam:'Push',kleur:null,notitie:null,source:null,metadata:null});
    const basis=h.net.antwoord; h.net.antwoord=async req=>/custom_training_exercises/.test(req.url)&&req.method==='GET'?{ok:false,status:500,headers:{get:()=>null},text:async()=>'{}',json:async()=>({})}:basis(req);
    const tekst=await kopie({local:{tk_trainings:JSON.stringify([T('ct1','Push',['squat'])])}});
    const p=(await h.ctx.tkHerstelPreview(bestand(tekst),PASS)).plan;
    check(p.records.find(r=>r.record_sleutel==='id:ct1').op_server==='onbekend','P17 oefeningen niet te lezen → "op de server" onbekend, niet afwijkend'); });
  await stap(async()=>{ const {h,ls}=opzet({ls:{tk_auth_session:'{"access_token":"GEHEIM"}'}}); const tekst=await kopie({local:{tk_coach_style:'kort'}});
    ls._gelezen=[]; await h.ctx.tkHerstelPreview(bestand(tekst),PASS);
    check(ls._gelezen.indexOf('tk_auth_session')<0,'P17 de inlogsessie wordt niet uitgelezen'); });
  await stap(async()=>{ const data=B.prepare({owner:UA,cacheOwner:UA,manifest:INV.BRONNEN,local:{tk_coach_style:'a',tk_rest_default:'90',tk_trainings:'[{"id":"z"},{"id":"a"}]'},queue:[]});
    const om=JSON.parse(JSON.stringify(data)); om.entries.reverse();
    const p1=RP.plan(RP.classificeer({data,scanner:UA,lokaal:{}}),{eigenaar:UA}), p2=RP.plan(RP.classificeer({data:om,scanner:UA,lokaal:{}}),{eigenaar:UA});
    check(JSON.stringify(p1)===JSON.stringify(p2),'P17 plan onafhankelijk van de volgorde in het bestand (deterministisch)'); });
  klaar=true; console.log('TK-REL-SEC-31: '+n+'/'+n);
})().catch(e=>{console.error('FAIL',e&&e.stack||e);process.exitCode=1;});
