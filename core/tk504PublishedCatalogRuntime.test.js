'use strict';
// End-to-end with the REAL ECS/search/picker from the current TK index.html.
// Only synthetic reviewed+entitled server records. No real 356 content,
// no Supabase, media, grant, UX change or release.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const Runtime=require('./tk504PublishedCatalogRuntime.js');
const root=path.join(__dirname,'..');
const baseline=require('../exercise-catalog.json');
const golden=require('../docs/generated/MOVEKIT_GOLDEN_V2_INVENTORY.json');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const first=html.indexOf('var ExerciseCatalogService=(function(){');
const end=html.indexOf('\n})();',first);
assert(first>=0&&end>first,'Original ECS directly extracted from real app');
let n=0;
function ok(v,m){assert.ok(v,m);n++;}
function eq(a,b,m){assert.equal(a,b,m);n++;}
function reject(fn,msg){assert.throws(fn,msg);n++;}
const v2=golden.items.filter(x=>Number(x.catalog_id.slice(3))>=227)
 .sort((a,b)=>a.catalog_id.localeCompare(b.catalog_id));
eq(v2.length,356);
const sample=baseline.catalog[0];
const items=v2.map((row,i)=>({
 catalog_id:row.catalog_id,source:{provider:'movekit',provider_id:row.provider_id},
 reviewed:true,published:true,
 identity:{...structuredClone(sample.identity),
  name:'QA Synthetic Movement '+(i+1),
  nl:'QA unieke oefening '+(i+1),
  primary:['quadriceps'],secondary:[],equipment:['barbell'],
  goals:['strength']},
 intelligence:structuredClone(sample.intelligence),
 relations:{alternatives:[],progressions:[],regressions:[]},
 assets:[],flags:structuredClone(sample.flags)
}));
const payload={schema:'tk504-authorized-catalog-v2/1.0',
 status:'PUBLISHED_AND_ENTITLED',total:582,new_count:356,items};
const c=structuredClone(baseline);
const context=vm.createContext({EX_CATALOG:c,
 localStorage:{getItem:()=>null,setItem:()=>{}},favoriteExIds:new Set(),
 performance:{now:()=>1},console,window:{},Set,Date});
vm.runInContext(html.slice(first,end+5),context,{timeout:5000});
const real=context.ExerciseCatalogService;
eq(real.count(),226);
let pickerInvalidations=0;
const runtime=Runtime.create({catalog:c,service:real,
 invalidatePicker:()=>{pickerInvalidations++;}});
let currentUser='test-user-a';
const owner=()=>currentUser;
const mounted=runtime.mount(payload,currentUser,owner);
eq(mounted.added,356);
eq(real.count(),582);
eq(c.count,582);
eq(real.byId('TK-000227').identity.nl,'QA unieke oefening 1');
eq(real.byId('TK-000582').identity.nl,'QA unieke oefening 356');
eq(real.byProvider('movekit',v2[0].provider_id).catalog_id,'TK-000227');
ok(real.search('unieke oefening 356').some(x=>x.catalog_id==='TK-000582'),
 'Real ECS inverted index accepts new Dutch exercise metadata');
ok(real.search('unieke oefening 1').some(x=>x.catalog_id==='TK-000227'),
 'New ECS search uses same existing search implementation');
eq(pickerInvalidations,1,'Existing single picker cache is invalidated');
eq(c.catalog.filter(x=>Number(x.catalog_id.slice(3))<=226).length,226);
ok(c.catalog.slice(0,226).every((r,i)=>r.catalog_id===baseline.catalog[i].catalog_id),
 'Original 226 IDs and order are preserved');
ok(c.catalog.slice(226).every(r=>r.assets.length===0),
 'No signed media URLs or public assets exposed via catalog');
ok(c.catalog.slice(226).every(r=>r.source.provider==='movekit'),
 'No new supplier or independent catalog created');
eq(runtime.owner(),'test-user-a');
// Existing premium-library video block must offer the PRIVATE player for
// an authorized new ID with deliberately no public V1 video asset.
const vStart=html.indexOf('function _videoBlock(id){');
const vNext=html.indexOf('\n/* Lazy player:',vStart);
ok(vStart>=0&&vNext>vStart,'original library video renderer exists');
context.tk504PrivateEnabled=()=>true;
context.ExerciseAssetProvider={
 has:()=>false,video:()=>({}),poster:()=>null,resolve:()=>null
};
context.escHtml=x=>String(x);
context._fmtDur=x=>String(x);
vm.runInContext(html.slice(vStart,vNext),context,{timeout:1500});
const privateCard=context._videoBlock('TK-000227');
ok(privateCard.includes('id="lib-video-play"')&&privateCard.includes('data-vid="TK-000227"'),
 '356 new MoveKit item uses the SAME existing signed-media player affordance');
ok(!privateCard.includes('data-vsrc=')&&!privateCard.includes('movekit/v2/video/'),
 'private card cannot expose a public MP4 or storage path');
eq(runtime.owner(),'test-user-a');
reject(()=>runtime.mount({...payload,items:items.slice(0,355)},currentUser,owner),/NOT_RELEASED_OR_INCOMPLETE/);
reject(()=>runtime.mount({...payload,status:'DRAFT'},currentUser,owner),/NOT_RELEASED_OR_INCOMPLETE/);
reject(()=>runtime.mount({...payload,items:items.map((r,i)=>i===0?{...r,reviewed:false}:r)},currentUser,owner),/UNREVIEWED_OR_DUPLICATE/);
reject(()=>runtime.mount({...payload,items:items.map((r,i)=>i===0?{...r,source:{provider:'movekit',provider_id:baseline.catalog[0].source.provider_id}}:r)},currentUser,owner),/UNREVIEWED_OR_DUPLICATE/);
reject(()=>runtime.mount({...payload,items:items.map((r,i)=>i===0?{...r,catalog_id:'TK-000038'}:r)},currentUser,owner),/UNREVIEWED_OR_DUPLICATE/);
reject(()=>runtime.mount({...payload,items:items.map((r,i)=>i===0?{...r,identity:{...r.identity,nl:'<script>danger</script>'}}:r)},currentUser,owner),/INVALID_DISPLAY_METADATA/);
reject(()=>runtime.mount({...payload,items:items.map((r,i)=>i===0?{...r,assets:[{type:'video',url:'https://private.example'}]}:r)},currentUser,owner),/MEDIA_MUST_BE_PRIVATE/);
reject(()=>runtime.mount(payload,'test-user-b',owner),/AUTH_OWNER_CHANGED/);
eq(real.count(),582,'bad/forged payload may not mutate the previously verified catalog');
currentUser='test-user-b';
ok(runtime.clear(),'Logout/account change clears live private additions');
eq(real.count(),226);
eq(real.byId('TK-000227'),null);
eq(real.search('unieke oefening 356').length,0,
 'Rebuild index clears all unpublished/private search tokens');
eq(runtime.owner(),null);
eq(pickerInvalidations,2);
ok(!runtime.clear(),'Clear idempotent');
const second=runtime.mount(payload,'test-user-b',owner);
eq(second.count,582);
eq(real.byId('TK-000227').source.provider_id,v2[0].provider_id);
ok(runtime.clear(),'Re-login able to revoke again');
eq(real.count(),226);
// Existing product wires the same ECS and protected media; flags hard off.
ok(html.includes("TK504_PUBLISHED_CATALOG_RELEASE = false"),
 'real app does NOT load unpublished content on startup');
ok(html.includes("TK504_TYPED_FK_SESSION_RELEASE = false"),
 'catalog cannot bypass typed session logging gate');
ok(html.includes("tk504PublishedCatalogRuntime.mount(answer,current,tkEigenaarUid)"),
 'approved response installs into the actual ECS, not a parallel UI');
ok(html.includes("tk504InvalidateProtectedMedia();"),
 'old private media bridge is invalidated after catalog identity changes');
ok(html.includes("tk504PublishedCatalogRuntime.clear()"),
 'logout and owner change revoke in-memory private catalog');
ok(html.includes("protectedCatalog||ExerciseAssetProvider.has(id,'video')"),
 '356 protected video cards use existing library without public assets');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
ok(sw.includes("'/core/tk504PublishedCatalogRuntime.js'"),
 'serviceworker precaches the new core bridge');

// Exercise the actual ECS for every completed 25-item cumulative batch,
// including shrink on re-login and the final six. No new catalog or picker.
for(const count of [...Array.from({length:14},(_,i)=>(i+1)*25),356,25]){
 const partial={...payload,total:226+count,new_count:count,items:items.slice(0,count)};
 const installed=runtime.mount(partial,currentUser,owner);
 eq(installed.added,count);eq(real.count(),226+count);eq(c.count,226+count);
 ok(real.byId('TK-'+String(226+count).padStart(6,'0')));
 if(count<356)eq(real.byId('TK-'+String(227+count).padStart(6,'0')),null);
 ok(real.search('unieke oefening 1').some(x=>x.catalog_id==='TK-000227'));
 ok(c.catalog.slice(0,226).every((r,i)=>r.catalog_id===baseline.catalog[i].catalog_id));
}
const firstBatch={...payload,total:251,new_count:25,items:items.slice(0,25)};
for(const count of [0,1,24,26,49,351,355,357,'25',null]){
 reject(()=>runtime.mount({...payload,total:226+count,new_count:count,
  items:items.slice(0,count)},currentUser,owner),/NOT_RELEASED_OR_INCOMPLETE/);
 eq(real.count(),251,'rejection preserves last verified batch');
}
reject(()=>runtime.mount({...firstBatch,total:582},currentUser,owner),/NOT_RELEASED_OR_INCOMPLETE/);
reject(()=>runtime.mount({...firstBatch,items:items.slice(25,50)},currentUser,owner),/UNREVIEWED_OR_DUPLICATE/);
reject(()=>runtime.mount({...firstBatch,items:items.slice(0,26)},currentUser,owner),/NOT_RELEASED_OR_INCOMPLETE/);
const futureRelation=structuredClone(firstBatch);
futureRelation.items[0].relations.alternatives=['TK-000252'];
reject(()=>runtime.mount(futureRelation,currentUser,owner),/UNKNOWN_RELATION_ID/);
eq(real.count(),251);
const allowedRelation=structuredClone(firstBatch);
allowedRelation.items[0].relations.alternatives=['TK-000251',baseline.catalog[0].catalog_id];
eq(runtime.mount(allowedRelation,currentUser,owner).count,251);
ok(runtime.clear());
eq(real.count(),226);
eq(real.byId('TK-000227'),null);
eq(real.search('unieke oefening 1').length,0);

console.log('TK504 actual ECS authorized 356-catalog mount: '+n+
 ' assertions PASS; existing search+picker, strict 582 identities, no public assets, owner reset, no new UX');
