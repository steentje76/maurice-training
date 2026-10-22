/* TK-REL-SEC-16 — schrijfidentiteit in de directe REST-helpers (P1-rest, 19-10-2026).
 * Twintig productietabellen hebben de insert-trigger set_user_id_from_auth (read-only geverifieerd 19-10-2026):
 * een write met het token van een ANDERE ingelogde gebruiker wordt niet geweigerd maar stil op diens account
 * gezet. sbFetch pinde de identiteit alleen binnen één verzoek; sbDel/sbUpsert gingen zelfs buiten sbFetch om.
 *  H1 payload met user_id van A terwijl B is ingelogd: sbPost/sbPostReturning/sbUpsert/sbPatch versturen niets;
 *  H2 expliciete binding {uid:'A'} terwijl B is ingelogd: sbPost/sbPostReturning/sbPatch/sbDel/sbUpsert/sbRpc niets;
 *  H3 binding of payload van de ingelogde gebruiker zelf: verzoek gaat gewoon door (geen regressie);
 *  H4 sbDel/sbUpsert lopen via sbFetch: 401 → gedeelde refresh → één retry; wissel tijdens refresh → geen retry;
 *  H5 sbPostQ met payload van A onder B: status failed/account, niet gequeued, geen verzoek;
 *  H6 sbPostQ/sbPatchQ/sbDelQ/sbRpcQ met binding A onder B: niets verstuurd of gequeued;
 *  H7 offline verlopen sessie, bekende toesteleigenaar A, binding A: gewoon gequeued (offline-first blijft werken).
 * Draait de ECHTE helpers uit index.html via core/fixtures/schrijfHarnas.js. */
'use strict';
const assert=require('assert');
const {maak,resp}=require('./fixtures/schrijfHarnas');
let klaar=false,n=0;
process.on('exit',()=>{if(!klaar){console.error('FAIL niet alle scenario\'s afgerond (hangende promise)');process.exitCode=1;}});
const check=(ok,label)=>{assert(ok,label);n++;console.log('PASS',label);};

async function main(){
  // H1 — payload-eigenaar
  { const h=maak({login:'B'});
    const r1=await h.ctx.sbPost('weight_log',{user_id:'A',date:'2026-10-19',weight:80});
    const r2=await h.ctx.sbPostReturning('programs',[{user_id:'A',naam:'P'}]);
    const r3=await h.ctx.sbUpsert('atleet_profiel',{user_id:'A',naam:'X'});
    const r4=await h.ctx.sbPatch('goals','id=eq.1',{user_id:'A',status:'x'});
    check(r1===false&&r2===null&&r3===false&&r4===false,'H1 payload van A onder B: alle directe helpers geven een fout terug');
    check(h.st.req.length===0,'H1 payload van A onder B: geen enkel verzoek met het token van B'); }
  // H2 — expliciete binding
  { const h=maak({login:'B'});
    const b={uid:'A'};
    const r=[await h.ctx.sbPost('vaste_trainingen',{naam:'x'},b),await h.ctx.sbPostReturning('program_blocks',{week_nr:1},b),
      await h.ctx.sbPatch('program_block_exercises','id=eq.1',{sets:3},b),await h.ctx.sbDel('program_blocks','id=eq.1',b),
      await h.ctx.sbUpsert('training_exercises',{id:'t_1'},b),await h.ctx.sbRpc('upsert_daily_health',{p_date:'x'},b)];
    check(r[0]===false&&r[1]===null&&r[2]===false&&r[3]===false&&r[4]===false&&r[5]===null,'H2 binding A onder B: alle directe helpers weigeren');
    check(h.st.req.length===0,'H2 binding A onder B: geen enkel verzoek verstuurd'); }
  // H3 — eigen identiteit: ongewijzigd gedrag
  { const h=maak({login:'A'});
    const b={uid:'A'};
    const r=[await h.ctx.sbPost('vaste_trainingen',{naam:'x'},b),await h.ctx.sbPost('weight_log',{user_id:'A',weight:80}),
      await h.ctx.sbDel('program_blocks','id=eq.1',b),await h.ctx.sbUpsert('training_exercises',{id:'t_1'}),await h.ctx.sbPatch('goals','id=eq.1',{status:'x'})];
    check(r.every(x=>x===true)&&h.st.req.length===5&&h.st.req.every(q=>q.token==='Bearer tA'),'H3 eigen binding/payload: alle verzoeken verstuurd met het eigen token');
    check(h.st.req[3].prefer==='resolution=merge-duplicates','H3 sbUpsert behoudt resolution=merge-duplicates'); }
  // H4 — sbDel/sbUpsert via sbFetch: 401-refresh met identiteitspin
  for(const helper of ['sbDel','sbUpsert']){
    { const h=maak({login:'A'});let k=0;
      h.net.antwoord=req=>(++k===1?resp(401,{}):undefined);
      const ok=helper==='sbDel'?await h.ctx.sbDel('program_blocks','id=eq.1'):await h.ctx.sbUpsert('training_exercises',{id:'t_1'});
      check(ok===true&&h.st.req.length===2&&h.st.refreshes===1&&h.st.req[1].token==='Bearer tA2','H4 '+helper+': 401 → één refresh → één retry met het verse token'); }
    { const h=maak({login:'A'});
      h.net.antwoord=()=>resp(401,{});
      h.ctx.refreshAuthToken=async()=>{h.st.refreshes++;h.login('B');return true;};
      const ok=helper==='sbDel'?await h.ctx.sbDel('program_blocks','id=eq.1'):await h.ctx.sbUpsert('training_exercises',{id:'t_1'});
      check(ok===false&&h.writesMet('B').length===0,'H4 '+helper+': accountwissel tijdens refresh → geen retry onder B'); }
  }
  // H5 — sbPostQ met payload van A onder B
  { const h=maak({login:'B'});
    const u=await h.ctx.sbPostQ('exercise_goals',{user_id:'A',exercise_id:'squat',one_rm:100},{detail:true});
    check(u.ok===false&&u.status==='failed'&&u.reden==='account'&&h.st.queue.length===0&&h.st.req.length===0,'H5 sbPostQ payload van A onder B: failed/account, niet gequeued, geen verzoek'); }
  // H6 — Q-helpers met binding A onder B
  { const h=maak({login:'B'});const b={uid:'A'};
    const p=await h.ctx.sbPostQ('sessions',{exercise_id:'squat'},Object.assign({detail:true},b));
    const pa=await h.ctx.sbPatchQ('sessions','id=eq.1',{reps:5},b);
    const pad=await h.ctx.sbPatchQ('sessions','id=eq.1',{reps:5},Object.assign({detail:true},b));
    const d=await h.ctx.sbDelQ('sessions','id=eq.1',b);
    const dd=await h.ctx.sbDelQ('sessions','id=eq.1',Object.assign({detail:true},b));
    const rp=await h.ctx.sbRpcQ('schedule_my_training',{p_occurrence_id:'o1'},b);
    check(p.status==='failed'&&p.reden==='account'&&pa===false&&pad.status==='failed'&&d===false&&dd.status==='failed'&&rp===false,'H6 Q-helpers met binding A onder B: allemaal geweigerd');
    check(h.st.queue.length===0&&h.st.req.length===0,'H6 Q-helpers: niets gequeued en niets verstuurd'); }
  // H7 — offline-first blijft werken voor de bekende toesteleigenaar
  { const h=maak({login:null,cacheOwner:'A',online:false});
    const u=await h.ctx.sbPostQ('sessions',{exercise_id:'squat'},{detail:true,uid:'A'});
    const pa=await h.ctx.sbPatchQ('sessions','id=eq.1',{reps:5},{uid:'A'});
    check(u.status==='queued'&&pa===true&&h.st.queue.length===2&&h.st.queue.every(q=>q.eigenaar==='A'),'H7 sessie verlopen, toesteleigenaar A, binding A: gequeued onder A'); }
  klaar=true;console.log('TK-REL-SEC-16: '+n+'/'+n);
}
main().catch(e=>{console.error('FAIL',e&&e.stack||e);process.exitCode=1;});
