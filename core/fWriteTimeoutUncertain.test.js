/* TK-REL-SEC-19 — time-outs en onzekere servercommits in de wachtrij-helpers (P1-rest, 19-10-2026).
 * sbPatchQ/sbDelQ/sbRpcQ wachtten zonder grens op een antwoord: een hangend verzoek bevroor de knop en de invoer
 * bleef nergens bewaard. En een verloren antwoord na een insert zonder idempotente sleutel werd automatisch opnieuw
 * verstuurd (dubbel record).
 *  T1 sbPatchQ/sbDelQ/sbRpcQ (ook de detail-varianten): hangt de server, dan na de time-out gequeued met
 *     reden 'timeout' en onzeker:true, ook op het wachtrij-item;
 *  T2 classificatie in de detail-uitkomst: definitief (rejected), tijdelijk (offline/server: niet onzeker),
 *     onzeker (netwerkfout of time-out na verzenden);
 *  T3 replay van een getimede PATCH na herstel: dezelfde waarde, geen extra effect;
 *  T4 onzekere insert ZONDER idempotente sleutel (goals): niet automatisch opnieuw verstuurd, blijft zichtbaar in de
 *     wachtrij; een onzekere insert MET client-id (sessions) wordt wel afgespeeld;
 *  T5 tabellen met client-id of natuurlijke sleutel (availability_periods, cycle_periods, nutrition_targets,
 *     calendar_feed_tokens, research_consents, nutrition_nutrient_values, cycle_symptom_logs): verloren antwoord +
 *     replay → precies één rij.
 * Draait de ECHTE schrijflaag en flushOfflineQueue uit index.html via core/fixtures/schrijfHarnas.js. */
'use strict';
const assert=require('assert');
const {maak,resp,fn,grab,db,koppel}=require('./fixtures/schrijfHarnas');
let klaar=false,n=0;
process.on('exit',()=>{if(!klaar){console.error('FAIL niet alle scenario\'s afgerond (hangende promise)');process.exitCode=1;}});
const check=(ok,label)=>{assert(ok,label);n++;console.log('PASS',label);};
const FLUSH=grab('let _flushBezig=false;','// DEV-UPDATE-01')+'\n'+fn('async function flushOfflineQueue(');
const metGrens=(p)=>Promise.race([p,new Promise(r=>setTimeout(()=>r('HANGT'),400))]);

async function main(){
  // T1 — hangende server
  const gevallen=[
    ['sbPatchQ',c=>c.sbPatchQ('sessions','id=eq.1',{reps:5}),true],
    ['sbPatchQ detail',c=>c.sbPatchQ('sessions','id=eq.1',{reps:5},{detail:true}),'detail'],
    ['sbDelQ',c=>c.sbDelQ('sessions','id=eq.1'),true],
    ['sbDelQ detail',c=>c.sbDelQ('sessions','id=eq.1',{detail:true}),'detail'],
    ['sbRpcQ',c=>c.sbRpcQ('schedule_my_training',{p_occurrence_id:'o1'}),true]];
  for(const [naam,doe,verwacht] of gevallen){
    const h=maak({});h.run('TK_SCHRIJF_TIMEOUT_MS=30');
    h.net.antwoord=()=>new Promise(()=>{});
    const u=await metGrens(doe(h.ctx));
    const item=h.st.queue[0]&&h.st.queue[0].item;
    const ok=verwacht==='detail'?(u&&u.status==='queued'&&u.reden==='timeout'&&u.onzeker===true):(u===true);
    check(ok&&h.st.queue.length===1&&item&&item.onzeker===true,'T1 '+naam+': hangende server → na de time-out gequeued, gemarkeerd als onzeker');
  }
  // T2 — classificatie
  { const zaken=[
      ['400 validatie',()=>resp(400,{}),{status:'rejected',onzeker:false}],
      ['503 server',()=>resp(503,{}),{status:'queued',reden:'server',onzeker:false}],
      ['netwerkfout na verzenden',()=>{throw new TypeError('Failed to fetch');},{status:'queued',reden:'netwerk',onzeker:true}]];
    for(const [label,ant,v] of zaken){
      for(const [helper,doe] of [['sbPatchQ',c=>c.sbPatchQ('sessions','id=eq.1',{reps:5},{detail:true})],['sbPostQ',c=>c.sbPostQ('sessions',{exercise_id:'squat'},{detail:true})]]){
        const h=maak({});h.net.antwoord=ant;
        const u=await doe(h.ctx);
        check(Object.keys(v).every(k=>u[k]===v[k]),'T2 '+helper+' '+label+' → '+JSON.stringify(v));
      }
    }
    const h=maak({online:false});
    const u=await h.ctx.sbPatchQ('sessions','id=eq.1',{reps:5},{detail:true});
    check(u.status==='queued'&&u.reden==='offline'&&u.onzeker===false&&h.st.req.length===0,'T2 offline → gequeued, niet verzonden en dus niet onzeker'); }
  // T3 — replay van een getimede PATCH
  { const d=db();d.tabel('sessions').push({id:1,user_id:'A',reps:3});
    const h=maak({extraSrc:FLUSH,ctx:{renderOfflineQueueModal(){}}});h.run('TK_SCHRIJF_TIMEOUT_MS=30');
    let hang=true;h.net.antwoord=async req=>{ const a=d.afhandelen(req); if(hang&&req.method==='PATCH')return new Promise(()=>{}); return a; };
    const u=await metGrens(h.ctx.sbPatchQ('sessions','id=eq.1',{reps:5}));
    const gequeued=u===true&&h.st.queue.length===1;
    hang=false;await h.ctx.flushOfflineQueue();
    check(gequeued&&h.st.queue.length===0&&d.tabel('sessions').length===1&&d.tabel('sessions')[0].reps===5,'T3 getimede PATCH (al toegepast) wordt na herstel afgespeeld: zelfde waarde, geen extra effect'); }
  // T4 — onzekere insert zonder idempotente sleutel wordt niet automatisch herhaald
  { const d=db();
    const h=maak({extraSrc:FLUSH,ctx:{renderOfflineQueueModal(){}}});
    koppel(h,d,(req,k)=>req.method==='POST'&&k===1?'verloren':undefined);
    const g=await h.ctx.sbPostQ('goals',{user_id:'A',type:'kracht',naam:'Squat 140'},{detail:true});
    const s=await h.ctx.sbPostQ('sessions',{exercise_id:'squat',date:'2026-10-19'},{detail:true});
    check(g.status==='queued'&&g.onzeker===true&&s.status==='queued'&&s.onzeker===true,'T4 verloren antwoord bij goals en sessions: beide gequeued en als onzeker gemarkeerd');
    koppel(h,d);
    await h.ctx.flushOfflineQueue();
    check(d.tabel('goals').length===1&&d.tabel('sessions').length===1,'T4 replay: geen tweede doel (goals heeft geen idempotente sleutel) en geen tweede sessie (client-id)');
    check(h.st.queue.length===1&&h.st.queue[0].item.table==='goals','T4 het onzekere doel blijft zichtbaar in de wachtrij om te controleren, de sessie is afgehandeld');
    const DESC=fn('function describeOfflineQueueItem(item){');
    const h2=maak({extraSrc:DESC,ctx:{escHtml:x=>String(x),exercises:[]}});
    const it=h.st.queue[0];
    check(!!it&&/mogelijk al opgeslagen/i.test(h2.ctx.describeOfflineQueueItem(Object.assign({},it.item))),'T4 het wachtrijscherm meldt dat het item mogelijk al is opgeslagen'); }
  // T5 — tabellen met client-id of natuurlijke sleutel
  const T5=[['availability_periods',{start_date:'2026-11-01',end_date:'2026-11-07',reden:'vakantie'}],
    ['cycle_periods',{start_date:'2026-10-19',end_date:null}],
    ['nutrition_targets',{user_id:'A',kcal:2400}],
    ['calendar_feed_tokens',{user_id:'A',token_hash:'h',active:true}],
    ['research_consents',{user_id:'A',research_purpose:'x',consent_version:'1',action:'granted'}],
    ['nutrition_nutrient_values',{product_id:'p1',basis:'PER_100G',energy_kcal:120}],
    ['cycle_symptom_logs',{log_date:'2026-10-19',symptoms:['kramp']}]];
  for(const [t,row] of T5){
    const d=db();
    const h=maak({extraSrc:FLUSH,ctx:{renderOfflineQueueModal(){}}});
    koppel(h,d,(req,k)=>req.method==='POST'&&k===1?'verloren':undefined);
    const u=await h.ctx.sbPostQ(t,Object.assign({},row),{detail:true});
    koppel(h,d);await h.ctx.flushOfflineQueue();
    check(u.status==='queued'&&h.st.queue.length===0&&d.tabel(t).length===1,'T5 '+t+': verloren antwoord + replay → precies één rij');
  }
  klaar=true;console.log('TK-REL-SEC-19: '+n+'/'+n);
}
main().catch(e=>{console.error('FAIL',e&&e.stack||e);process.exitCode=1;});
