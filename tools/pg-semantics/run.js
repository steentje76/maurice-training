#!/usr/bin/env node
/* PostgREST-semantiek tegen een ECHTE, lokale en wegwerpbare PostgreSQL + PostgREST (19-10-2026).
 * Draait de ECHTE schrijflaag, het verificatieregister en tkVerifieerMetServer() uit index.html (via
 * core/fixtures/schrijfHarnas.js) tegen PostgREST, in plaats van tegen de nep-PostgREST uit de unit-tests.
 * Geen productie: alleen localhost. Voorbereiding (zie README.md): database tk_semantiek met schema.sql en
 * PostgREST op http://127.0.0.1:3000 met dezelfde JWT-secret als hieronder (TK_PGRST_SECRET).
 * Gebruik: node tools/pg-semantics/run.js */
'use strict';
const crypto=require('crypto'),assert=require('assert'),path=require('path');
const {maak,grab,fn}=require(path.join(__dirname,'..','..','core','fixtures','schrijfHarnas'));
const {maakIndexedDb}=require(path.join(__dirname,'..','..','core','fixtures','miniIndexedDb'));
const BASE=process.env.TK_PGRST_URL||'http://127.0.0.1:3000';
const SECRET=process.env.TK_PGRST_SECRET||'tk-lokaal-geheim-alleen-voor-wegwerp-tests-0123456789';
const UID={A:'00000000-0000-4000-8000-00000000000a',B:'00000000-0000-4000-8000-00000000000b'};
const b64=o=>Buffer.from(typeof o==='string'?o:JSON.stringify(o)).toString('base64url');
function jwt(sub){ const h=b64({alg:'HS256',typ:'JWT'}),p=b64({sub,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600});
  return h+'.'+p+'.'+crypto.createHmac('sha256',SECRET).update(h+'.'+p).digest('base64url'); }
const TOKEN={['Bearer tA']:jwt(UID.A),['Bearer tB']:jwt(UID.B)};
let n=0,fout=0;
const check=(c,l)=>{ n++; if(c)console.log('PASS',l); else { fout++; console.log('FAIL',l); } };
const BLOK=grab('// SERVER READ-AFTER-WRITE, FASE 2','function updateOfflineBadge(){');
const FLUSH=grab('let _flushBezig=false;','// DEV-UPDATE-01')+'\n'+fn('async function flushOfflineQueue(');
const wacht=ms=>new Promise(r=>setTimeout(r,ms));
const verzoeken=[];
async function echteFetch(url,init){
  init=init||{}; const u=String(url).replace(/^https:\/\/sb\.invalid\/rest\/v1/,BASE);
  const h=Object.assign({},init.headers||{}); const auth=h.Authorization; delete h.apikey;
  if(TOKEN[auth])h.Authorization='Bearer '+TOKEN[auth]; else delete h.Authorization;
  verzoeken.push((init.method||'GET')+' '+u.replace(BASE,'')+' '+(auth||''));
  return fetch(u,{method:init.method||'GET',headers:h,body:init.body});
}
function opzet(){
  const h=maak({extraSrc:FLUSH+'\n'+BLOK,ctx:{indexedDB:maakIndexedDb(),ServerVerificationCore:require('../../core/serverVerification.js'),
    renderOfflineQueueModal(){},escHtml:x=>String(x),fetch:echteFetch}});
  const login=w=>{ h.ctx.authSession={user:{id:UID[w]},access_token:'t'+w,refresh_token:'r'+w}; h.ctx.SB_H.Authorization='Bearer t'+w; };
  login('A');
  return {h,login};
}
async function sql(q){ // direct lezen als superuser via psql is buiten deze runner; we lezen via PostgREST met het token van de eigenaar
  const r=await fetch(BASE+'/'+q,{headers:{Authorization:'Bearer '+TOKEN['Bearer tA']}}); return r.json(); }
const uuid=()=>crypto.randomUUID();

(async function(){
  try{ const r=await fetch(BASE+'/'); if(!r.ok)throw new Error('status '+r.status); }catch(e){ console.log('PostgREST niet bereikbaar op '+BASE+' — zie README.md'); process.exitCode=2; return; }
  // Schone start: alle rijen van de twee testgebruikers weg (kinderen via ON DELETE CASCADE).
  for(const w of ['A','B'])for(const t of ['sessions','training_instances','custom_trainings','nutrition_meals','activities','exercise_goals','cycle_symptom_logs','calendar_feed_tokens','goals'])
    await fetch(BASE+'/'+t+'?user_id=eq.'+UID[w],{method:'DELETE',headers:{Authorization:'Bearer '+TOKEN['Bearer t'+w]}});
  // P1 client-id + merge-duplicates: replay geeft één rij; verificatie met echte Postgres-typen
  { const {h}=opzet(); const ti=uuid(),s=uuid();
    await h.ctx.sbPostQ('training_instances',{id:ti,user_id:UID.A,status:'gestart',started_at:'2026-10-19T08:00:00.000Z',snapshot:{b:1,a:[1,2]}});
    const row={id:s,exercise_id:'squat',reps:8,weight:62.5,rpe:'7.5',training_instance_id:ti,sets_detail:[{kg:'62.5',reps:8,effKg:62.5}],start_at:'2026-10-19T08:01:00.000Z',user_id:null};
    const u1=await h.ctx.sbPostQ('sessions',Object.assign({},row),{detail:true});
    const u2=await h.ctx.sbPostQ('sessions',Object.assign({},row),{detail:true}); // replay met hetzelfde id
    const rijen=await sql('sessions?id=eq.'+s);
    check(u1.status==='confirmed'&&u2.status==='confirmed'&&rijen.length===1&&rijen[0].user_id===UID.A,'P1 replay met client-id (merge-duplicates) → één rij; trigger zet user_id op de ingelogde gebruiker');
    await wacht(30);
    const v=await h.ctx.tkVerifieerMetServer();
    check(v.ok&&v.perTabel.sessions&&v.perTabel.sessions.SERVER_VERIFIED===1&&v.perTabel.training_instances.SERVER_VERIFIED===1,
      'P1 echte teruglezing: timestamptz (+00:00), numeric (62.5/7.5) en jsonb vergeleken → SERVER_VERIFIED ('+JSON.stringify(v.perTabel)+')'); }
  // P2 exercise_goals on_conflict user_id,exercise_id
  { const {h}=opzet(); const ex='ex_'+uuid().slice(0,8);
    await h.ctx.sbPostQ('exercise_goals',{user_id:UID.A,exercise_id:ex,one_rm:100});
    const u=await h.ctx.sbPostQ('exercise_goals',{user_id:UID.A,exercise_id:ex,one_rm:110},{detail:true});
    const rijen=await sql('exercise_goals?exercise_id=eq.'+ex);
    check(u.status==='confirmed'&&rijen.length===1&&Number(rijen[0].one_rm)===110,'P2 exercise_goals on_conflict (GENERATED ALWAYS identity niet in payload) → één rij, bijgewerkt'); }
  // P3 activity_laps on_conflict activity_id,lap_index + verificatie met samengestelde sleutel
  { const {h}=opzet(); const a=uuid();
    await h.ctx.sbPostQ('activities',{id:a,user_id:UID.A,sport:'running',distance_meters:5000,recorded_at:'2026-10-19T06:00:00.000Z'});
    await h.ctx.sbPostQ('activity_laps',{activity_id:a,lap_index:0,duration_seconds:300});
    const u=await h.ctx.sbPostQ('activity_laps',{activity_id:a,lap_index:0,duration_seconds:300},{detail:true});
    const rijen=await sql('activity_laps?activity_id=eq.'+a);
    check(u.status==='confirmed'&&rijen.length===1,'P3 activity_laps replay → één rij (on_conflict activity_id,lap_index)');
    await wacht(30); const v=await h.ctx.tkVerifieerMetServer();
    check(v.perTabel.activity_laps&&v.perTabel.activity_laps.SERVER_VERIFIED===1&&v.perTabel.activities.SERVER_VERIFIED===1,'P3 laps zonder eigen user_id geverifieerd via de geverifieerde activiteit'); }
  // P4 ignore-duplicates: replay draait een latere wijziging niet terug; partiële unieke index
  { const {h}=opzet(); const id=uuid();
    await h.ctx.sbPostQ('calendar_feed_tokens',{id,user_id:UID.A,token_hash:'h1',active:true});
    await h.ctx.sbPatchQ('calendar_feed_tokens','user_id=eq.'+UID.A+'&active=eq.true',{active:false,revoked_at:'2026-10-19T10:00:00Z'});
    const u=await h.ctx.sbPostQ('calendar_feed_tokens',{id,user_id:UID.A,token_hash:'h1',active:true},{detail:true}); // replay
    const rijen=await sql('calendar_feed_tokens?id=eq.'+id);
    check(u.status==='confirmed'&&rijen.length===1&&rijen[0].active===false,'P4 replay met ignore-duplicates (ON CONFLICT DO NOTHING) laat de intrekking staan');
    await h.ctx.sbPostQ('calendar_feed_tokens',{id:uuid(),user_id:UID.A,token_hash:'h2',active:true});
    const u3=await h.ctx.sbPostQ('calendar_feed_tokens',{id:uuid(),user_id:UID.A,token_hash:'h3',active:true},{detail:true});
    check(u3.status==='rejected'&&u3.http===409,'P4 tweede actieve token (partiële unieke index, ander id) → 409, eerlijk geweigerd'); }
  // P5 cycle_symptom_logs zonder on_conflict: unieke dag → 409 (geen stille overschrijving)
  { const {h}=opzet(); const dag='2026-10-'+String(10+Math.floor(Math.random()*18));
    await h.ctx.sbPostQ('cycle_symptom_logs',{log_date:dag,symptoms:{hoofdpijn:2}});
    const u=await h.ctx.sbPostQ('cycle_symptom_logs',{log_date:dag,symptoms:{energie:3}},{detail:true});
    const rijen=await sql('cycle_symptom_logs?log_date=eq.'+dag);
    check(u.status==='rejected'&&u.http===409&&rijen.length===1&&rijen[0].symptoms.hoofdpijn===2,'P5 tweede symptoom-insert voor dezelfde dag → 409, bestaande symptomen ongewijzigd'); }
  // P6 trigger overschrijft user_id; de client weigert vooraf
  { const {h,login}=opzet(); login('B'); const id=uuid(); verzoeken.length=0;
    const u=await h.ctx.sbPostQ('sessions',{id,user_id:UID.A,exercise_id:'squat',reps:5},{detail:true});
    check(u.status==='failed'&&u.reden==='account'&&verzoeken.length===0,'P6 payload van A met token van B → geweigerd vóór verzending');
    const r=await fetch(BASE+'/sessions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+TOKEN['Bearer tB'],Prefer:'return=representation'},body:JSON.stringify({id,user_id:UID.A,exercise_id:'squat'})});
    const j=await r.json();
    check(r.status===201&&j[0].user_id===UID.B,'P6 ter vergelijking, rechtstreeks: de trigger zet de rij stil op B (bevestigt het productierisico)'); }
  // P7 RLS: rij van een andere eigenaar onzichtbaar → MISSING (niet definitief)
  { const {h,login}=opzet(); const id=uuid();
    await h.ctx.sbPostQ('sessions',{id,exercise_id:'squat',reps:5}); await wacht(30);
    await fetch(BASE+'/sessions?id=eq.'+id,{method:'DELETE',headers:{Authorization:'Bearer '+TOKEN['Bearer tA']}}); // elders verwijderd
    await fetch(BASE+'/sessions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+TOKEN['Bearer tB']},body:JSON.stringify({id,exercise_id:'squat',reps:5})}); // zelfde id nu van B
    const v=await h.ctx.tkVerifieerMetServer();
    const reg=(await h.ctx.tkVerifyLeesRegister()).find(x=>x.record_id===id);
    check(reg&&reg.status==='MISSING'&&reg.afwijkingen.indexOf('niet_zichtbaar_voor_eigenaar')>=0,'P7 rij bestaat bij een andere eigenaar (RLS verbergt hem) → MISSING, niet zichtbaar, niet definitief'); }
  // P8 maaltijd + regels (RLS via de ouder)
  { const {h}=opzet(); const m=uuid(),i1=uuid();
    await h.ctx.sbPostQ('nutrition_meals',{id:m,user_id:UID.A,meal_type:'ontbijt',occurred_at:'2026-10-19T07:30:00.000Z',consumed_at:'2026-10-19T07:30:00.000Z'});
    await h.ctx.sbPostQ('nutrition_meal_items',{id:i1,meal_id:m,quantity:150,quantity_unit:'g',nutrient_snapshot:{kcal:200.5,eiwit:12}});
    await wacht(30); const v=await h.ctx.tkVerifieerMetServer();
    check(v.perTabel.nutrition_meals.SERVER_VERIFIED>=1&&v.perTabel.nutrition_meal_items.SERVER_VERIFIED===1,'P8 maaltijd en regel (geen eigen user_id, RLS via maaltijd) → SERVER_VERIFIED'); }
  // P9 exercises: echte 409 van PostgREST + teruglezen
  { const {h}=opzet(); const id='mijn_'+uuid().slice(0,8);
    await h.ctx.sbPostQ('exercises',{id,name:'Mijn oefening',type:'strength',scope:'personal',active:true});
    const u=await h.ctx.sbPostQ('exercises',{id,name:'Mijn oefening',type:'strength',scope:'personal',active:true},{detail:true});
    check(u.status==='confirmed'&&u.http===409&&u.reden==='bestond','P9 echte 409 op de PK, zelfde zichtbare rij teruggelezen → bevestigd'); }
  // P10 lege in-lijst en tekst-id's met bijzondere tekens in de leesroute
  { const {h}=opzet(); const id='ct,"x" '+uuid().slice(0,6);
    await h.ctx.sbPostQ('custom_trainings',{id,naam:'Komma, "quote"'}); await wacht(30);
    const v=await h.ctx.tkVerifieerMetServer();
    check(v.perTabel.custom_trainings&&v.perTabel.custom_trainings.SERVER_VERIFIED===1,'P10 tekst-id met komma en aanhalingstekens correct teruggelezen (in-filter met quoting)'); }
  console.log('pg-semantics: '+(n-fout)+' geslaagd, '+fout+' mislukt');
  if(fout)process.exitCode=1;
})().catch(e=>{console.error('FAIL',e&&e.stack||e);process.exitCode=1;});
