'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const api=require('./tk504EphemeralMediaSession.js');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const sw=fs.readFileSync(path.join(__dirname,'..','sw.js'),'utf8');
let checks=0;
function ok(value,message){assert.ok(value,message);checks++;}
function eq(a,b,message){assert.deepEqual(a,b,message);checks++;}
function segment(a,b){const s=html.indexOf(a),e=html.indexOf(b,s+a.length);ok(s>=0&&e>s,'source section found '+a);return html.slice(s,e);}
async function run(){
  let owner='00000000-0000-4000-8000-000000000001',time=100000,requests=0;
  const cache=api.create({ownerProvider:()=>owner,now:()=>time,maxEntries:3});
  const ticket=(id,type)=>({catalogId:id,type,url:'https://example.test/signed/'+(++requests),expiresAt:time+30000});
  const signed=(id,type,force)=>cache.signed(id,type,()=>ticket(id,type),force);
  const p1=await signed('TK-000227','poster');
  eq(requests,1,'first signing request');
  const p2=await signed('TK-000227','poster');
  eq(requests,1,'same-owner poster ticket reused without a new signing');
  eq(p2,p1,'same validated ephemeral ticket');
  await signed('TK-000227','video');
  eq(requests,2,'video separate key from poster');
  await signed('TK-000227','poster',true);
  eq(requests,3,'force renewal bypasses old token');
  time+=26000;
  await signed('TK-000227','poster');
  eq(requests,4,'near-expired token never reused');
  cache.invalidate();
  await signed('TK-000227','poster');
  eq(requests,5,'logout invalidates token reuse');
  owner='00000000-0000-4000-8000-000000000002';
  await signed('TK-000227','poster');
  eq(requests,6,'new owner always re-signs');
  eq(cache.rawMediaBytesCached,false,'no app-owned raw media caching');
  eq(cache.offlineDownloadReleased,false,'no unauthorized offline media release');
  await assert.rejects(()=>signed('BAD-777','poster'),e=>e.code==='INVALID_REQUEST');checks++;
  owner=null;
  await assert.rejects(()=>signed('TK-000227','poster'),e=>e.code==='AUTH_REQUIRED');checks++;
  owner='00000000-0000-4000-8000-000000000003';
  let release;
  let started=0;
  const slow=cache.signed('TK-000228','poster',()=>{
    started++;return new Promise(resolve=>{release=resolve;});
  });
  await Promise.resolve();await Promise.resolve();
  owner='00000000-0000-4000-8000-000000000004';
  cache.currentOwner();
  release(ticket('TK-000228','poster'));
  await assert.rejects(slow,e=>e.code==='STALE_ACCOUNT');checks++;
  eq(started,1,'stale in-flight signing is never replayed');
  const queue=api.queue({maxActive:2});
  let active=0,peak=0;
  const jobs=Array.from({length:9},(_,i)=>queue.schedule(async()=>{
    active++;peak=Math.max(peak,active);
    await new Promise(resolve=>setTimeout(resolve,1));
    active--;return i;
  }));
  eq(await Promise.all(jobs),Array.from({length:9},(_,i)=>i),'all bounded poster signings complete');
  ok(peak<=2,'poster signing concurrency bounded');
  let gate;
  let ran=false;
  const one=queue.schedule(()=>new Promise(resolve=>{gate=resolve;}));
  const two=queue.schedule(()=>new Promise(resolve=>setTimeout(resolve,1)));
  let alive=true;
  const third=queue.schedule(()=>{ran=true;return 3;},()=>alive).then(()=>null,e=>e);
  alive=false;
  await Promise.resolve();
  gate();
  await Promise.all([one,two]);
  eq((await third).code,'STALE_VIEW','stale queued DOM callback rejected');
  eq(ran,false,'disconnected DOM poster cannot trigger signing');

  // The picker is not the library: it must explicitly use signed posters.
  const picker=segment('const personalCatalogCollision=', 'const fav=isExerciseFavorite(e.id);');
  const source='function make(e){const A=window.ExerciseAssetProvider;'+picker+'return box;}';
  const published={catalog_id:'TK-000227',source:{provider:'movekit',provider_id:'slug'}};
  const context=vm.createContext({
    ExerciseCatalogService:{byId:id=>id==='TK-000227'?published:null},
    tk504PrivateEnabled:id=>id==='TK-000227',
    TYPE_LABELS:{},_pkIcon:()=>'<svg></svg>',escHtml:x=>x,
    window:{ExerciseAssetProvider:{poster:()=>null}}
  });
  vm.runInContext(source,context);
  const catalogCard=vm.runInContext('make({id:"TK-000227",_catalog:true,type:"mobility",muscle_primary:["Glutes"]})',context);
  ok(catalogCard.includes('class="tk504-picker-poster"'),'approved catalog tile has private poster');
  ok(catalogCard.includes('data-aid="TK-000227"'),'private poster bound to exact catalog identity');
  ok(!catalogCard.includes('src='),'no unsigned raw URL or fake placeholder URL');
  const personalCard=vm.runInContext('make({id:"TK-000227",_catalog:false,scope:"personal",type:"strength",muscle_primary:["Glutes"]})',context);
  ok(!personalCard.includes('tk504-picker-poster'),'TK-shaped personal collision cannot borrow licensed image');
  ok(/tk504ObservePickerPosters\(el\)/.test(html),'picker observes dynamically rendered poster nodes');
  ok(/tk504PickerPosterObserver\.disconnect\(\)/.test(html),'picker disconnects stale observer on a new search');

  const posterLoader=segment('function tk504LoadPrivateLibraryPoster(img,catalogId){','function _libLoad(img){');
  ok(posterLoader.includes('attempt>=2'),'poster retries are capped');
  ok(posterLoader.includes('tasks.schedule(sign,valid)'),'poster requests are bounded and identity guarded');
  ok(posterLoader.includes('img.classList.add(\'is-loaded\')'),'successful private poster becomes visible');
  ok(posterLoader.includes('img._done=0'),'failed lazy image gets another opportunity');
  ok(posterLoader.includes('tk504SignedMediaTicket'),'poster reuses only short-lived valid ticket');
  const video=segment('function tk504PrivateVideoMarkup(catalogId,poster,label){','async function tk504PlayPrivateVideo(');
  ok(video.includes('tk504-video-poster'),'technique-video preview uses a private poster');
  ok(video.includes('tk504-private-play'),'video action uses accessible full-width button styling');
  ok(!video.includes('class="vid-play"'),'48px icon style no longer wraps full button text');
  ok(!video.includes('http'),'markup never embeds raw hosted MP4/poster URL');
  ok(/const TK504_PRIVATE_MEDIA_RELEASE = false;/.test(html),'legacy 226 cutover stays separately gated');
  ok(sw.includes('/core/tk504EphemeralMediaSession.js'),'session-cache runtime included in PWA precache');
  console.log('TK504 private poster/replay UX: '+checks+' security, picker, TTL and retry assertions PASS');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
