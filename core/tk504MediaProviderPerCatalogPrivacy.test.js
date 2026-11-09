'use strict';
// TK504 — real shipped ExerciseAssetProvider, 226 legacy + future 582 cutover.
// Synthetic per-catalog release decisions: no production release toggles,
// private media, credentials, network, storage or real user data are touched.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const HTML=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const catalog=require('../exercise-catalog.json');
const catalogMap=new Map(catalog.catalog.map(e=>[e.catalog_id,e]));
const begin=HTML.indexOf('var ExerciseAssetProvider=(function(){');
const end=HTML.indexOf('/* TK504: preparatory protected-media runtime');
assert(begin>0&&end>begin,'real provider block location has not moved');
const source=HTML.slice(begin,end);
let tests=0;
function eq(a,b,msg){assert.deepEqual(a,b,msg);tests++;}
function yes(a,msg){assert.ok(a,msg);tests++;}
function load(host,privates){
  const opened=[],added=[],matched=[],removed=[];
  const cache={
    add:async req=>{added.push(req.url||String(req));},
    match:async req=>{matched.push(req);return {ok:true};},
    delete:async req=>{removed.push(req);return true;}
  };
  const caches={open:async name=>{opened.push(name);return cache;}};
  const window={};
  const location={hostname:host};
  const self={caches};
  const allowed=cid=>privates.has(cid);
  const loaded=new Function('window','location','tk504PrivateEnabled','self','caches','ExerciseCatalogService','Request',source+
    '\nreturn {P:ExerciseAssetProvider,VM:VIDEO_MANIFEST,R:window.MediaUrlResolver};')(
      window,location,allowed,self,caches,{byId:id=>catalogMap.get(id)||null},
      class SyntheticRequest{constructor(url){this.url=url;}});
  return {...loaded,opened,added,matched,removed};
}
(async()=>{
const blocked=new Set(['TK-000206']);
const android=load('localhost',blocked);
const web=load('trainingskompas.com',blocked);
const onlyLegacy=load('localhost',new Set());
eq(Object.keys(android.VM).length,226,'existing V1 provider still contains its 226 legacy identities');
yes(Object.values(android.VM).every(e=>/^TK-\d{6}$/.test(e.catalog_id)),'all V1 manifest items carry a catalog identity');
// Existing public V1 is unaffected for authorized legacy playback until owner cutover.
eq(onlyLegacy.P.resolve('TK-000206','video'),'https://maurice-art.netlify.app/videos/wall-sit.mp4','old V1 route unchanged in nonprivate mode');
eq(onlyLegacy.P.video('TK-000206').url,'https://maurice-art.netlify.app/videos/wall-sit.mp4','legacy video url unchanged');
eq(onlyLegacy.P.resolve('TK-000226','video'),'https://maurice-art.netlify.app/videos/dead-bug.mp4','other original identity unaffected');
// Synthetic private decision for one exercise must close every direct raw-video shortcut.
for(const r of [android,web]){
  eq(r.P.resolve('TK-000206','video'),null,'private V1 item cannot resolve a raw video URL '+r.R.originFor());
  eq(r.P.videos('TK-000206').length,1,'private item keeps its catalog video identity');
  eq(r.P.videos('TK-000206')[0].url,null,'video entry contains no raw URL for protected ID');
  eq(r.P.video('TK-000206').url,null,'single-video helper does not leak raw URL');
  yes(r.P.hasVideo('TK-000206'),'private video identity remains discoverable');
  eq(await r.P.downloadOffline('TK-000206'),false,'no offline caching of protected MP4');
  eq(await r.P.isOffline('TK-000206'),false,'protected media never reports V1 offline');
  eq(r.opened.length,0,'protected video did not contact V1 Cache Storage');
  eq(r.P.resolve('TK-000226','video'),r.R.originFor()?
    'https://maurice-art.netlify.app/videos/dead-bug.mp4':'videos/dead-bug.mp4',
    'another legacy exercise is not collateral-blocked');
}
eq(await android.P.downloadOffline('TK-000226'),true,'nonprivate V1 offline behavior retained');
eq(await android.P.isOffline('TK-000226'),true,'nonprivate V1 cached status retained');
yes(android.opened.length>=2,'cache touched only for explicitly nonprivate original');
eq(android.P.resolve('TK-999999','video'),null,'unknown catalog never resolves to a different media asset');
eq(android.P.videos('TK-999999'),[],'unknown catalog has no video');
// Model the FUTURE 226 cutover in-memory only: all previous raw routes must be denied.
const allIds=new Set(Object.keys(android.VM));
for(const host of ['localhost','trainingskompas.com']){
  const x=load(host,allIds);
  for(const id of allIds){
    const v=x.P.videos(id);
    yes(v.every(e=>e.url===null),'future private cutover cannot expose old raw URL '+id);
    eq(x.P.video(id)?.url,null,'future per-ID video facade fails closed '+id);
  }
  eq(x.opened.length,0,'full release simulation did not cache raw videos');
}
yes(!/tk504PrivateEnabled\(\s*\)/.test(source),'provider always passes a catalog ID to its privacy gate');
console.log('TK504 per-catalog media provider: '+tests+' assertions PASS; existing V1 preserved; each protected media URL and offline shortcut is denied; future 226 cutover simulated only');
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
