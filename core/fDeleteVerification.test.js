/* TK-REL-SEC-25 — DELETE-verificatiecontract (fase 3, 19-10-2026).
 * Probleem: na een DELETE werd "rij afwezig in het RLS-gefilterde leesresultaat" als bewijs van verwijdering geteld.
 * Afwezig kan ook betekenen: de rij staat bij een andere eigenaar (trigger, overdracht), RLS weigerde de DELETE stil
 * (PostgREST: 2xx met 0 rijen) of het antwoord ging verloren. Contract (fail-closed):
 *  - een verwijdering is alleen bewezen als het DELETE-antwoord (Prefer: return=representation) exact deze rij,
 *    van deze eigenaar, als verwijderd teruggaf; alleen dan + afwezig bij teruglezen = SERVER_VERIFIED;
 *  - zonder dat bewijs: afwezig = UNKNOWN ("verwijdering niet bewezen"), nooit definitief; nog aanwezig = MISMATCH.
 *  D1 kern: verwijderd + afwezig zonder bewijs → UNKNOWN, niet definitief;
 *  D2 kern: verwijderd + afwezig mét bewijs → SERVER_VERIFIED; nog aanwezig → MISMATCH (ook mét bewijs);
 *  D3 app: geslaagde verwijdering → DELETE vraagt return=representation; bewijs vastgelegd; controle VERIFIED;
 *  D4 app: rij staat inmiddels bij een andere eigenaar (RLS verbergt hem; DELETE raakt 0 rijen) → niet VERIFIED,
 *     en de rij van B blijft bestaan;
 *  D5 app: geweigerde DELETE (403) → geen verwijdering vastgelegd; RLS-weigering (2xx, 0 rijen) → onbewezen;
 *  D6 app: onzeker netwerkantwoord (time-out/verloren) → QUEUED; na een replay die 0 rijen raakt → nog steeds onbewezen;
 *  D7 app: replay van een gequeuede DELETE die de rij teruggeeft → bewezen;
 *  D8 app: teruggegeven rij met een andere eigenaar telt niet als bewijs;
 *  D9 app: alle kinderen van een ouder verwijderen → alleen teruggegeven kinderen bewezen; een verborgen kind niet;
 *  D10 app: detailvariant (sbDelQ met detail:true) legt hetzelfde bewijs vast;
 *  D11 app: een herhaalde DELETE (0 rijen) van een al bewezen verwijderde rij houdt het bewijs. */
'use strict';
const assert=require('assert');
const V=require('./serverVerification.js');
const {maak,resp,fn,grab,db,koppel}=require('./fixtures/schrijfHarnas');
const {maakIndexedDb}=require('./fixtures/miniIndexedDb');
let klaar=false,n=0;
process.on('exit',()=>{if(!klaar){console.error('FAIL niet alle scenario\'s afgerond (hangende promise)');process.exitCode=1;}});
// TK_RED=1: elk scenario los rapporteren (RED-bewijs tegen de oude code) in plaats van bij de eerste fout te stoppen.
const RED=!!process.env.TK_RED;
const check=(ok,label)=>{ if(RED){ n++; console.log(ok?'PASS':'RED ',label); return; } assert(ok,label);n++;console.log('PASS',label);};
const stap=async(f)=>{ try{ await f(); }catch(e){ if(!RED)throw e; console.log('RED  (scenario afgebroken: '+String(e&&e.message||e).slice(0,80)+')'); } };
const BLOK=grab('// SERVER READ-AFTER-WRITE, FASE 2','function updateOfflineBadge(){');
const FLUSH=grab('let _flushBezig=false;','// DEV-UPDATE-01')+'\n'+fn('async function flushOfflineQueue(');
const wacht=ms=>new Promise(r=>setTimeout(r,ms));
const T='2026-10-19T12:00:00Z';
function opzet(o){
  o=o||{};
  const h=maak({extraSrc:FLUSH+'\n'+BLOK,online:o.online,ctx:Object.assign({indexedDB:maakIndexedDb(),ServerVerificationCore:V,
    renderOfflineQueueModal(){},escHtml:x=>String(x)},o.ctx||{})});
  const d=db();koppel(h,d);
  return {h,d};
}
const telStatus=(u,t)=>(u.perTabel&&u.perTabel[t])||{};
const reg=async(h,t,id)=>{ await wacht(40); return (await h.ctx.tkVerifyLeesRegister()).find(x=>x.soort==='record'&&x.tabel===t&&x.record_id===id); };

async function main(){
  // D1–D2 (kern)
  await stap(async()=>{ const basis={tabel:'sessions',eigenaar:'A',bron:'test',tijdstip:T,revisie:2,verwacht:{id:'s1'},velden:[],verwijderd:true};
    const zonder=V.verifyRecord(Object.assign({},basis,{server:null}));
    check(zonder.status===V.STATUS.UNKNOWN&&zonder.definitief===false&&zonder.afwijkingen.indexOf('verwijdering_niet_bewezen')>=0,'D1 verwijderd + afwezig zonder bewijs → UNKNOWN, niet definitief');
    const met=V.verifyRecord(Object.assign({},basis,{server:null,verwijderBewezen:true}));
    check(met.status===V.STATUS.SERVER_VERIFIED,'D2 verwijderd + afwezig met bewijs uit het DELETE-antwoord → SERVER_VERIFIED');
    const nog=V.verifyRecord(Object.assign({},basis,{server:{id:'s1',user_id:'A'},verwijderBewezen:true}));
    check(nog.status===V.STATUS.MISMATCH&&nog.afwijkingen.indexOf('nog_aanwezig')>=0,'D2 bewijs, maar nog aanwezig → MISMATCH');
    check(V.verifyRecord(Object.assign({},basis,{server:undefined,verwijderBewezen:true})).status===V.STATUS.UNKNOWN,'D2 niet teruggelezen → UNKNOWN, ook met bewijs'); });
  // D3
  await stap(async()=>{ const {h,d}=opzet();
    d.tabel('sessions').push({id:'s1',user_id:'A',exercise_id:'squat'});
    await h.ctx.sbDelQ('sessions','id=eq.s1');
    const del=h.st.req.find(r=>r.method==='DELETE');
    check(del&&/return=representation/.test(del.prefer||''),'D3 DELETE vraagt de verwijderde rijen terug (Prefer: return=representation)');
    const e=await reg(h,'sessions','s1');
    check(e&&e.verwijderd===true&&e.verwijderBewijs==='rij_teruggegeven','D3 bewijs vastgelegd: de server gaf exact deze rij als verwijderd terug');
    const u=await h.ctx.tkVerifieerMetServer();
    check(telStatus(u,'sessions').SERVER_VERIFIED===1,'D3 geslaagde verwijdering → SERVER_VERIFIED'); });
  // D4
  await stap(async()=>{ const {h,d}=opzet();
    await h.ctx.sbPostQ('sessions',{id:'s1',exercise_id:'squat',reps:8});await wacht(40);
    d.tabel('sessions')[0].user_id='B'; // rij staat inmiddels bij B (bv. trigger/overdracht)
    d.zichtbaar=(t,r,uid)=>!r.user_id||r.user_id===uid;
    await h.ctx.sbDelQ('sessions','id=eq.s1');
    const e=await reg(h,'sessions','s1');
    check(e.verwijderd===true&&!e.verwijderBewijs,'D4 DELETE raakte 0 rijen (RLS) → verwijdering niet bewezen');
    const u=await h.ctx.tkVerifieerMetServer();
    check(!telStatus(u,'sessions').SERVER_VERIFIED&&telStatus(u,'sessions').UNKNOWN===1,'D4 rij bij een andere eigenaar → UNKNOWN, niet VERIFIED');
    check(d.tabel('sessions').length===1&&d.tabel('sessions')[0].user_id==='B','D4 de rij van B is niet verwijderd'); });
  // D5
  await stap(async()=>{ const {h,d}=opzet();
    await h.ctx.sbPostQ('sessions',{id:'s1',exercise_id:'squat',reps:8});await wacht(40);
    const basis=h.net.antwoord;h.net.antwoord=async req=>req.method==='DELETE'?resp(403,{code:'42501'}):basis(req);
    await h.ctx.sbDelQ('sessions','id=eq.s1');h.net.antwoord=basis;
    const e=await reg(h,'sessions','s1');
    check(e.verwijderd===false&&e.revisie===1,'D5 geweigerde DELETE (403) → geen verwijdering vastgelegd');
    h.net.antwoord=async req=>req.method==='DELETE'?resp(200,[]):basis(req); // RLS: 2xx, 0 rijen
    await h.ctx.sbDelQ('sessions','id=eq.s1');h.net.antwoord=basis;
    const e2=await reg(h,'sessions','s1');
    check(e2.verwijderd===true&&!e2.verwijderBewijs,'D5 stille RLS-weigering (2xx, 0 rijen) → onbewezen');
    const u=await h.ctx.tkVerifieerMetServer();
    check(telStatus(u,'sessions').MISMATCH===1,'D5 rij nog zichtbaar aanwezig na stille weigering → MISMATCH'); });
  // D6
  await stap(async()=>{ const {h,d}=opzet();
    d.tabel('sessions').push({id:'s1',user_id:'A',exercise_id:'squat'});
    const basis=h.net.antwoord;
    h.net.antwoord=async req=>{ if(req.method==='DELETE'){ basis(req); throw new TypeError('Failed to fetch'); } return basis(req); }; // verwerkt, antwoord kwijt
    await h.ctx.sbDelQ('sessions','id=eq.s1');h.net.antwoord=basis;
    const e=await reg(h,'sessions','s1');
    check(e.verwijderd===true&&e.status==='QUEUED'&&!e.verwijderBewijs&&h.st.queue.length===1&&h.st.queue[0].item.onzeker===true,'D6 onzeker antwoord → QUEUED, onbewezen, item onzeker');
    await h.ctx.flushOfflineQueue();
    const u=await h.ctx.tkVerifieerMetServer();
    check(h.st.queue.length===0&&!telStatus(u,'sessions').SERVER_VERIFIED&&telStatus(u,'sessions').UNKNOWN===1,'D6 replay raakte 0 rijen → nog steeds onbewezen (UNKNOWN), nooit VERIFIED'); });
  // D7
  await stap(async()=>{ const {h,d}=opzet({online:false});
    d.tabel('sessions').push({id:'s1',user_id:'A',exercise_id:'squat'});
    await h.ctx.sbDelQ('sessions','id=eq.s1');
    h.ctx.navigator.onLine=true;
    await h.ctx.flushOfflineQueue();
    const del=h.st.req.find(r=>r.method==='DELETE');
    const e=await reg(h,'sessions','s1');
    check(del&&/return=representation/.test(del.prefer||'')&&e.verwijderBewijs==='rij_teruggegeven','D7 replay die de rij teruggeeft → bewijs vastgelegd');
    const u=await h.ctx.tkVerifieerMetServer();
    check(telStatus(u,'sessions').SERVER_VERIFIED===1,'D7 → SERVER_VERIFIED'); });
  // D8
  await stap(async()=>{ const {h}=opzet();
    const basis=h.net.antwoord;h.net.antwoord=async req=>req.method==='DELETE'?resp(200,[{id:'s1',user_id:'B'}]):basis(req);
    await h.ctx.sbDelQ('sessions','id=eq.s1');h.net.antwoord=basis;
    const e=await reg(h,'sessions','s1');
    check(e.verwijderd===true&&!e.verwijderBewijs,'D8 teruggegeven rij van een andere eigenaar → geen bewijs'); });
  // D9
  await stap(async()=>{ const {h,d}=opzet();
    await h.ctx.sbPostQ('custom_trainings',{id:'ct1',naam:'Push'});
    await h.ctx.sbPostQ('custom_training_exercises',{id:'e1',custom_training_id:'ct1',exercise_id:'squat'});
    await h.ctx.sbPostQ('custom_training_exercises',{id:'e2',custom_training_id:'ct1',exercise_id:'bench'});await wacht(40);
    d.tabel('custom_training_exercises').find(r=>r.id==='e2').user_id='B';
    d.zichtbaar=(t,r,uid)=>!r.user_id||r.user_id===uid;
    await h.ctx.sbDelQ('custom_training_exercises','custom_training_id=eq.ct1');
    const e1=await reg(h,'custom_training_exercises','e1'), e2=await reg(h,'custom_training_exercises','e2');
    check(e1.verwijderBewijs==='rij_teruggegeven'&&e2.verwijderd===true&&!e2.verwijderBewijs,'D9 alleen teruggegeven kinderen bewezen; het verborgen kind niet');
    const u=await h.ctx.tkVerifieerMetServer();
    const c=telStatus(u,'custom_training_exercises');
    check(c.SERVER_VERIFIED===1&&c.UNKNOWN===1,'D9 controle: één kind bewezen verwijderd, één onbewezen'); });
  // D10
  await stap(async()=>{ const {h,d}=opzet();
    d.tabel('sessions').push({id:'s1',user_id:'A',exercise_id:'squat'});
    const u=await h.ctx.sbDelQ('sessions','id=eq.s1',{detail:true});
    const e=await reg(h,'sessions','s1');
    check(u.status==='confirmed'&&e.verwijderBewijs==='rij_teruggegeven','D10 detailvariant legt hetzelfde bewijs vast'); });
  // D11
  await stap(async()=>{ const {h,d}=opzet();
    d.tabel('sessions').push({id:'s1',user_id:'A',exercise_id:'squat'});
    await h.ctx.sbDelQ('sessions','id=eq.s1'); await h.ctx.sbDelQ('sessions','id=eq.s1'); // tweede DELETE raakt 0 rijen
    const e=await reg(h,'sessions','s1');
    check(e.revisie===2&&e.verwijderBewijs==='rij_teruggegeven','D11 herhaalde DELETE van een bewezen verwijderde rij houdt het bewijs'); });
  klaar=true;console.log('TK-REL-SEC-25: '+n+'/'+n);
}
main().catch(e=>{console.error('FAIL',e&&e.stack||e);process.exitCode=1;});
