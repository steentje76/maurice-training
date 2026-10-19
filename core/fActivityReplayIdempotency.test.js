/* TK-REL-SEC-08 — idempotente replay van activities/activity_laps (heracceptatie 19-10-2026).
 * Productie (read-only geverifieerd): UNIQUE activity_laps(activity_id, lap_index); UNIQUE
 * activities(user_id, dedupe_key) WHERE dedupe_key IS NOT NULL; id uuid default gen_random_uuid();
 * UPDATE-policies op beide tabellen. Deze suite draait de ECHTE sbPostQ, offlineQueueAdd en
 * flushOfflineQueue tegen een nagebootste PostgREST die die indexen afdwingt (ON CONFLICT alleen op de
 * PK, tenzij on_conflict is meegegeven — zoals PostgREST documenteert) en een verloren antwoord ná
 * een geslaagde servercommit kan simuleren.
 *  A1 lap: verloren antwoord → wachtrij → replay wordt bevestigd en verdwijnt uit de wachtrij (geen
 *     eeuwige 409 die de wachtrij en de updatecontrole blokkeert);
 *  A2 lap: een nieuwe poging voor een al opgeslagen lap meldt geen valse fout;
 *  A3 handmatige activiteit: verloren antwoord + replay geeft geen tweede rij;
 *  A4 oude, al gequeuede lap-items (zonder id) worden bij de volgende flush ook hersteld. */
'use strict';
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const block=(a,b)=>{const i=html.indexOf(a),j=html.indexOf(b,i+a.length);assert(i>=0&&j>i,'brongrenzen niet gevonden: '+a);return html.slice(i,j);};
const SRC=[
  block('const SB_RETRY_STATUS=','let _sbRefreshInFlight=null;'),
  block('async function offlineQueueAdd(item','async function offlineQueueAll(){'),
  block('const IDEMPOTENT_TABELLEN_MET_CLIENT_ID','// Speelt de queue in volgorde af;'),
  block('async function flushOfflineQueue(){','function updateOfflineBadge(){')
].join('\n');
let klaar=false,n=0;
process.on('exit',()=>{if(!klaar){console.error('FAIL niet alle scenario\'s afgerond (hangende promise)');process.exitCode=1;}});
const check=(ok,label)=>{assert(ok,label);n++;console.log('PASS',label);};

// Nagebootste PostgREST met de productie-indexen.
function server(){
  const rows={activities:[],activity_laps:[]};let seq=0,verliesVolgende=false;
  const UNIEK={activity_laps:[['activity_id','lap_index']],activities:[['user_id','dedupe_key']]};
  function botst(t,r){for(const k of (UNIEK[t]||[])){if(k.some(c=>r[c]==null))continue;const hit=rows[t].find(x=>k.every(c=>x[c]===r[c]));if(hit)return {hit,k};}return null;}
  async function handle(url,o){
    const u=new URL(url);const t=u.pathname.split('/').pop();const prefer=o.prefer||'';
    const oc=u.searchParams.get('on_conflict');const body=Object.assign({},o.body);
    if(o.method!=='POST')return {ok:true,status:204,text:async()=>'',json:async()=>[]};
    const merge=/merge-duplicates/.test(prefer),ignore=/ignore-duplicates/.test(prefer);
    if(body.id!=null){const pk=rows[t].find(x=>x.id===body.id);
      if(pk){ if(!oc&&(merge||ignore)){ if(merge)Object.assign(pk,body); return {ok:true,status:200,text:async()=>'',json:async()=>[pk]}; }
              return {ok:false,status:409,text:async()=>'{"code":"23505"}',json:async()=>({})}; } }
    const b=botst(t,body);
    if(b){ const opKey=oc&&oc.split(',').sort().join()===b.k.slice().sort().join();
      if(opKey&&(merge||ignore)){ if(merge)Object.assign(b.hit,body,{id:b.hit.id}); return {ok:true,status:200,text:async()=>'',json:async()=>[b.hit]}; }
      return {ok:false,status:409,text:async()=>'{"code":"23505"}',json:async()=>({})}; }
    const rij=Object.assign({id:body.id||('srv-'+(++seq))},body);rows[t].push(rij);
    return {ok:true,status:201,text:async()=>'',json:async()=>[rij]};
  }
  return {rows,verlies(){verliesVolgende=true;},
    fetch:async(url,o)=>{const r=await handle(url,o);if(verliesVolgende){verliesVolgende=false;throw new Error('verbinding verbroken na servercommit');}return r;}};
}
function maak(srv){
  const ctx={console:{log(){},warn(){},error(){}},SB_URL:'https://sb.invalid',navigator:{onLine:true},
    authSession:{user:{id:'A'}},localStorage:{getItem:()=>null},OFFLINE_STORE:'queue',_flushBezig:false,
    updateOfflineBadge(){},renderOfflineQueueModal(){},toast(){},document:{getElementById:()=>null},
    syncCustomTrainingsFromSupabase:async()=>{},setTimeout,clearTimeout,crypto:require('crypto').webcrypto};
  ctx.queue=[];let qid=0;
  ctx.offlineDb=async()=>({transaction:()=>{const tx={objectStore:()=>({add:rec=>{ctx.queue.push(Object.assign({},rec,{id:++qid}));Promise.resolve().then(()=>tx.oncomplete&&tx.oncomplete());}})};return tx;}});
  ctx.tkLeesWachtrijStrikt=async()=>ctx.queue.slice();ctx.offlineQueueAll=ctx.tkLeesWachtrijStrikt;
  ctx.offlineQueueRemove=async id=>{ctx.queue=ctx.queue.filter(i=>i.id!==id);return true;};
  ctx.sbFetch=srv.fetch;
  vm.createContext(ctx);vm.runInContext(SRC,ctx);return ctx;
}
const LAP={activity_id:'act-1',lap_index:0,duration_seconds:300,distance_meters:1000};
async function main(){
  { const srv=server(),c=maak(srv);
    srv.verlies();const r=await c.sbPostQ('activity_laps',Object.assign({},LAP),{detail:true});
    check(r.status==='queued'&&srv.rows.activity_laps.length===1,'A1 verloren antwoord: lap staat op server én in de wachtrij');
    await c.flushOfflineQueue();
    check(c.queue.length===0,'A1 replay van de lap wordt bevestigd en verlaat de wachtrij');
    check(srv.rows.activity_laps.length===1,'A1 nog steeds precies één lap op de server'); }
  { const srv=server(),c=maak(srv);
    await c.sbPostQ('activity_laps',Object.assign({},LAP));
    const r=await c.sbPostQ('activity_laps',Object.assign({},LAP),{detail:true});
    check(r.ok===true&&srv.rows.activity_laps.length===1,'A2 nieuwe poging voor een al opgeslagen lap: geen valse fout, één rij'); }
  { const srv=server(),c=maak(srv);
    const run={user_id:'A',sport:'running',distance_meters:5000,source_provenance:'manual',data_quality:'unverified',recorded_at:'2026-10-19T08:00:00Z'};
    srv.verlies();const r=await c.sbPostQ('activities',run,{detail:true});
    check(r.status==='queued','A3 verloren antwoord bij handmatige run: gequeued');
    await c.flushOfflineQueue();
    check(srv.rows.activities.length===1&&c.queue.length===0,'A3 replay maakt geen tweede activiteit'); }
  { const srv=server(),c=maak(srv);
    srv.rows.activity_laps.push(Object.assign({id:'srv-x'},LAP));
    c.queue.push({id:77,owner_uid:'A',table:'activity_laps',method:'POST',body:Object.assign({},LAP),ts:0});
    await c.flushOfflineQueue();
    check(c.queue.length===0&&srv.rows.activity_laps.length===1,'A4 een al vastgelopen, oud lap-item wordt bij de volgende flush hersteld'); }
  klaar=true;console.log('TK-REL-SEC-08: '+n+'/'+n);
}
main().catch(e=>{console.error('FAIL',e&&e.message||e);process.exitCode=1;});
