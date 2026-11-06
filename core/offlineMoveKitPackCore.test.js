'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const M=require('./offlineMoveKitPackCore.js');
const root=path.join(__dirname,'..');
const inv=JSON.parse(fs.readFileSync(path.join(root,'docs/generated/MOVEKIT_GOLDEN_V2_INVENTORY.json'),'utf8'));
const catalog=JSON.parse(fs.readFileSync(path.join(root,'exercise-catalog.json'),'utf8'));
const A='12345678-1234-4234-8234-123456789abc';
const B='12345678-1234-4234-8234-123456789def';
let passed=0;
const t=(label,fn)=>{fn();passed++;};
const fails=(fn,code)=>assert.throws(fn,e=>e.message===code);

t('full inventory accepted',()=>assert.equal(M.validateInventory(inv).size,582));
t('existing IDs retained',()=>assert.equal(inv.items.filter(x=>x.status==='existing-id').length,226));
t('356 candidate IDs only',()=>assert.equal(inv.items.filter(x=>x.status==='proposed-new').length,356));
t('old assets version separated',()=>assert(inv.items.every(x=>x.video.path.startsWith('movekit/v2/'))));
t('all staged videos licence-gated',()=>assert.equal(inv.offline_video_licence_clearance,'REQUIRED'));
t('no raw files embedded in source inventory',()=>assert(!JSON.stringify(inv).includes('base64')));
t('no duplicate IDs',()=>assert.equal(new Set(inv.items.map(x=>x.catalog_id)).size,582));
t('current IDs reused without mutation',()=>{
 const fromCatalog=new Map(catalog.catalog.map(e=>[e.source.provider_id,e.catalog_id]));
 for(const x of inv.items.filter(x=>x.status==='existing-id'))assert.equal(x.catalog_id,fromCatalog.get(x.provider_id));
});
t('dataset matches video total byte count',()=>assert.equal(inv.items.reduce((n,x)=>n+x.video.bytes,0),inv.video_total_bytes));
t('dataset matches poster total byte count',()=>assert.equal(inv.items.reduce((n,x)=>n+x.poster.bytes,0),inv.poster_total_bytes));
const known=['TK-000001','TK-000206','TK-000227'];
const options={ownerId:A,workoutId:'workout_1',catalogIds:known};
const p=M.plan(inv,options);
t('known ids ordered',()=>assert.deepEqual(p.catalogIds,known));
t('video is disabled by default',()=>assert.equal(p.videoDownloadAllowed,false));
t('plan carries no signed URLs',()=>assert(!JSON.stringify(p).includes('https://')));
t('plan carries no raw storage paths',()=>assert(!JSON.stringify(p).includes('/video/')));
t('owner normalized',()=>assert.equal(p.ownerId,A.toLowerCase()));
t('video bytes summed',()=>assert.equal(p.videoBytes,p.items.reduce((n,x)=>n+x.videoBytes,0)));
t('posters bytes summed',()=>assert.equal(p.posterBytes,p.items.reduce((n,x)=>n+x.posterBytes,0)));
t('duplicates count once',()=>assert.equal(M.plan(inv,{...options,catalogIds:[...known,known[0]]}).items.length,3));
t('unknown exercise fails closed',()=>fails(()=>M.plan(inv,{...options,catalogIds:['TK-999999']}),'UNKNOWN_CATALOG_ID'));
t('invalid id fails closed',()=>fails(()=>M.plan(inv,{...options,catalogIds:['../../secret']}),'INVALID_CATALOG_ID'));
t('invalid owner fails',()=>fails(()=>M.plan(inv,{...options,ownerId:'cross-user'}),'INVALID_OWNER'));
t('invalid workout key fails',()=>fails(()=>M.plan(inv,{...options,workoutId:'../secret'}),'INVALID_WORKOUT_ID'));
t('empty workouts rejected',()=>fails(()=>M.plan(inv,{...options,catalogIds:[]}),'INVALID_EXERCISE_COUNT'));
t('too many exercises rejected',()=>fails(()=>M.plan(inv,{...options,catalogIds:new Array(65).fill(known[0])}),'INVALID_EXERCISE_COUNT'));
t('duplicate inventory ID rejected',()=>{
 const fake=structuredClone(inv);fake.items[1].catalog_id=fake.items[0].catalog_id;
 fails(()=>M.plan(fake,options),'DUPLICATE_INVENTORY_ID');
});
t('path injected inventory rejected',()=>{
 const fake=structuredClone(inv);fake.items[0].video.path='../secret.mp4';
 fails(()=>M.plan(fake,options),'INVALID_MEDIA_PATH');
});
t('raw data persisted false',()=>assert.equal(M.guidePack(M.plan(inv,{...options,catalogIds:known.slice(0,2)}),catalog).rawMediaStored,false));
t('metadata guide excludes network source and bearer tokens',()=>{
 const g=M.guidePack(M.plan(inv,{...options,catalogIds:known.slice(0,2)}),catalog);
 assert.equal(g.items.length,2);assert.equal(g.items[0].catalogId,'TK-000001');
 assert(!JSON.stringify(g).includes('http'));assert(!JSON.stringify(g).includes('mp4'));assert(Array.isArray(g.items[0].cues));
});
t('forged plan with unmapped catalog exercises rejected',()=>fails(()=>M.guidePack(p,catalog),'CATALOG_MISSING'));
for(const [reason,opts] of [
 ['LICENCE_REVIEW_REQUIRED',{}],
 ['AUTH_REQUIRED',{licencePermissionVerifiedByServer:true}],
 ['SECURE_ADAPTER_REQUIRED',{licencePermissionVerifiedByServer:true,authenticated:true,entitlementVerifiedByServer:true}],
 ['OFFLINE',{licencePermissionVerifiedByServer:true,authenticated:true,entitlementVerifiedByServer:true,approvedSecureNativeStore:true,network:'offline'}],
 ['WIFI_REQUIRED',{licencePermissionVerifiedByServer:true,authenticated:true,entitlementVerifiedByServer:true,approvedSecureNativeStore:true,network:'cellular'}],
 ['CONSENT_REQUIRED',{licencePermissionVerifiedByServer:true,authenticated:true,entitlementVerifiedByServer:true,approvedSecureNativeStore:true,network:'wifi'}],
 ['NATIVE_IMPLEMENTATION_NOT_RELEASED',{licencePermissionVerifiedByServer:true,authenticated:true,entitlementVerifiedByServer:true,approvedSecureNativeStore:true,network:'wifi',consentToTransfer:true}]
])t('fail-closed video decision '+reason,()=>assert.deepEqual(M.videoDownloadDecision(opts),{allowed:false,reason}));
const adapter=M.memoryAdapter();
const storage=M.store(adapter);
(async()=>{
 const g=M.guidePack(M.plan(inv,{...options,catalogIds:known.slice(0,2)}),catalog);
 assert.equal(await storage.get(A,'workout_1'),null);passed++;
 assert.equal(await storage.save(A,g),true);passed++;
 assert.equal((await storage.get(A,'workout_1')).items.length,2);passed++;
 assert.equal(await storage.get(B,'workout_1'),null);passed++;
 assert.deepEqual(await storage.list(B),[]);passed++;
 assert.equal((await storage.list(A)).length,1);passed++;
 await assert.rejects(()=>storage.save(B,g),/CROSS_ACCOUNT_WRITE/);passed++;
 await assert.rejects(()=>storage.save(A,{...g,rawMediaStored:true}),/RAW_MEDIA_BLOCKED/);passed++;
 await assert.rejects(()=>storage.save(A,{...g,videoOfflineStatus:'AVAILABLE'}),/RAW_MEDIA_BLOCKED/);passed++;
 const fetched=await storage.get(A,'workout_1');fetched.items[0].name='tampered';
 assert.notEqual((await storage.get(A,'workout_1')).items[0].name,'tampered');passed++;
 await storage.remove(B,'workout_1');
 assert.notEqual(await storage.get(A,'workout_1'),null);passed++;
 await storage.remove(A,'workout_1');assert.equal(await storage.get(A,'workout_1'),null);passed++;
 const bPack=M.guidePack(M.plan(inv,{...options,ownerId:B,workoutId:'B_guide',catalogIds:known.slice(0,1)}),catalog);
 await storage.save(B,bPack);passed++;
 await storage.save(A,g);passed++;
 const deleted=await storage.clearOwner(A);assert.equal(deleted,1);passed++;
 assert.equal(await storage.get(A,'workout_1'),null);passed++;
 assert.equal((await storage.get(B,'B_guide')).ownerId,B);passed++;
 assert.equal(await storage.clearOwner(A),0);passed++;
 await assert.rejects(()=>storage.clearOwner('invalid-user'),/INVALID_OWNER/);passed++;
 await storage.clearOwner(B);assert.equal(await storage.get(B,'B_guide'),null);passed++;
 console.log('Offline MoveKit contract PASS: '+passed+' deterministic checks');
})().catch(e=>{console.error(e.stack);process.exitCode=1;});