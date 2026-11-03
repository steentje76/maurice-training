/* Trainingskompas / MoveKit offline-pack core v0.1
 * Deterministic, no network, no local raw media export.
 * Offline VIDEO storage is explicitly BLOCKED until signed license clarification,
 * approved secure native adapter and Android device evidence are provided.
 *
 * The exercise GUIDE pack contains metadata only; existing training logs must
 * continue using the canonical offline session queue, not this module.
 */
(function(root,factory){
  var core=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=core;
  if(root)root.OfflineMoveKitPackCore=core;
})(typeof globalThis!=='undefined'?globalThis:null,function(){
  'use strict';
  var SCHEMA='trainingskompas-movekit-golden-inventory/2.0';
  var PACK_SCHEMA='trainingskompas-offline-guide/1.0';
  var UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  var CATALOG_ID=/^TK-\d{6}$/;
  var SHA256=/^[0-9a-f]{64}$/;
  var MAX_EXERCISES=64;

  function assert(cond,code){if(!cond)throw new Error(code);}
  function plain(s,max){
    assert(typeof s==='string','INVALID_TEXT');
    assert(s.length<=max,'TEXT_TOO_LONG');
    return s;
  }
  function owner(v){assert(UUID.test(v),'INVALID_OWNER');return v.toLowerCase();}
  function workoutId(v){return plain(v,80).replace(/[^a-zA-Z0-9_-]/g,'')===v?v:(function(){throw new Error('INVALID_WORKOUT_ID');})();}
  function validateInventory(inventory){
    assert(inventory&&inventory.schema===SCHEMA,'INVALID_INVENTORY_SCHEMA');
    assert(inventory.status==='STAGING_ONLY_DO_NOT_ACTIVATE','INVALID_INVENTORY_MODE');
    assert(Array.isArray(inventory.items)&&inventory.items.length>0,'INVALID_INVENTORY_ITEMS');
    var ids=new Set(),slugs=new Set();
    inventory.items.forEach(function(e){
      assert(e&&CATALOG_ID.test(e.catalog_id),'INVALID_CATALOG_ID');
      assert(typeof e.provider_id==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(e.provider_id),'INVALID_SLUG');
      assert(!ids.has(e.catalog_id)&&!slugs.has(e.provider_id),'DUPLICATE_INVENTORY_ID');
      ids.add(e.catalog_id);slugs.add(e.provider_id);
      ['video','poster'].forEach(function(t){
        var f=e[t];
        assert(f&&Number.isSafeInteger(f.bytes)&&f.bytes>0&&SHA256.test(f.sha256),'INVALID_MEDIA_DIGEST');
        assert(typeof f.path==='string'&&f.path==='movekit/v2/'+t+'/'+e.provider_id+(t==='video'?'.mp4':'.png'),'INVALID_MEDIA_PATH');
      });
    });
    return new Map(inventory.items.map(function(e){return[e.catalog_id,e];}));
  }

  function plan(inventory,opts){
    var map=validateInventory(inventory);
    assert(opts&&Array.isArray(opts.catalogIds),'MISSING_EXERCISES');
    var uid=owner(opts.ownerId),wid=workoutId(opts.workoutId);
    assert(opts.catalogIds.length>0&&opts.catalogIds.length<=MAX_EXERCISES,'INVALID_EXERCISE_COUNT');
    var seen=new Set(),entries=[],totalVideo=0,totalPoster=0;
    opts.catalogIds.forEach(function(id){
      assert(typeof id==='string'&&CATALOG_ID.test(id),'INVALID_CATALOG_ID');
      assert(map.has(id),'UNKNOWN_CATALOG_ID');
      if(seen.has(id))return;
      seen.add(id);
      var e=map.get(id);
      totalVideo+=e.video.bytes;totalPoster+=e.poster.bytes;
      entries.push(Object.freeze({
        catalogId:id,name:plain(e.name,180),
        videoBytes:e.video.bytes,posterBytes:e.poster.bytes,
        videoSha256:e.video.sha256,posterSha256:e.poster.sha256
      }));
    });
    // No object paths, download links, license metadata, raw media bytes or auth tokens.
    return Object.freeze({
      schema:PACK_SCHEMA,ownerId:uid,workoutId:wid,
      catalogIds:Object.freeze(Array.from(seen)),items:Object.freeze(entries),
      videoBytes:totalVideo,posterBytes:totalPoster,
      videoOfflineStatus:'LICENCE_REVIEW_REQUIRED',
      videoDownloadAllowed:false
    });
  }

  function videoDownloadDecision(state){
    // A UI switch or locally forged boolean NEVER authorizes licensing.
    if(!state||state.licencePermissionVerifiedByServer!==true)return {allowed:false,reason:'LICENCE_REVIEW_REQUIRED'};
    if(!state.authenticated||!state.entitlementVerifiedByServer)return {allowed:false,reason:'AUTH_REQUIRED'};
    if(!state.approvedSecureNativeStore)return {allowed:false,reason:'SECURE_ADAPTER_REQUIRED'};
    if(state.network==='offline')return {allowed:false,reason:'OFFLINE'};
    if(state.network!=='wifi'&&state.wifiOnly!==false)return {allowed:false,reason:'WIFI_REQUIRED'};
    if(state.consentToTransfer!==true)return {allowed:false,reason:'CONSENT_REQUIRED'};
    // This decision is ONLY for planned future native adapter; no downloader is
    // exported or implemented here. The actual media gate remains closed.
    return {allowed:false,reason:'NATIVE_IMPLEMENTATION_NOT_RELEASED'};
  }

  function guidePack(planInfo,catalog){
    assert(planInfo&&planInfo.schema===PACK_SCHEMA,'INVALID_PLAN');
    assert(catalog&&Array.isArray(catalog.catalog),'INVALID_CATALOG');
    var byId=new Map(catalog.catalog.map(function(e){return[e.catalog_id,e];}));
    var items=planInfo.catalogIds.map(function(id){
      var c=byId.get(id);
      assert(c&&c.source&&c.source.provider==='movekit','CATALOG_MISSING');
      var identity=c.identity||{},intelligence=c.intelligence||{};
      return {
        catalogId:id,
        name:plain(identity.name||'',180),
        category:plain(identity.category||'',80),
        primary:Array.isArray(identity.primary)?identity.primary.map(function(v){return plain(v,100);}):[],
        equipment:Array.isArray(identity.equipment)?identity.equipment.map(function(v){return plain(v,100);}):[],
        cues:Array.isArray(intelligence.cues)?intelligence.cues.slice(0,12).map(function(v){return plain(v,500);}):[]
      };
    });
    return {
      schema:PACK_SCHEMA,ownerId:owner(planInfo.ownerId),workoutId:workoutId(planInfo.workoutId),
      catalogIds:planInfo.catalogIds.slice(),items:items,
      videoOfflineStatus:'LICENCE_REVIEW_REQUIRED',rawMediaStored:false
    };
  }

  function store(adapter){
    assert(adapter&&['put','get','delete','list'].every(function(m){return typeof adapter[m]==='function';}),'INVALID_ADAPTER');
    function key(uid,wid){return owner(uid)+'|'+workoutId(wid);}
    function safe(entry,uid){
      return entry&&entry.ownerId===owner(uid)&&entry.schema===PACK_SCHEMA?entry:null;
    }
    return {
      save:async function(uid,pack){
        assert(pack&&pack.schema===PACK_SCHEMA,'INVALID_PACK');
        assert(pack.ownerId===owner(uid),'CROSS_ACCOUNT_WRITE');
        assert(pack.rawMediaStored===false&&pack.videoOfflineStatus==='LICENCE_REVIEW_REQUIRED','RAW_MEDIA_BLOCKED');
        var data=JSON.parse(JSON.stringify(pack));
        await adapter.put({key:key(uid,pack.workoutId),ownerId:owner(uid),data:data});
        return true;
      },
      get:async function(uid,wid){
        var v=await adapter.get(key(uid,wid));
        return v&&v.ownerId===owner(uid)&&safe(v.data,uid)?JSON.parse(JSON.stringify(v.data)):null;
      },
      list:async function(uid){
        uid=owner(uid);
        var rows=await adapter.list(uid+'|');
        return rows.filter(function(v){return v.ownerId===uid&&safe(v.data,uid);})
          .map(function(v){return JSON.parse(JSON.stringify(v.data));});
      },
      remove:async function(uid,wid){await adapter.delete(key(uid,wid));return true;}
    };
  }
  function memoryAdapter(){
    var m=new Map();
    return {
      put:async function(v){m.set(v.key,JSON.parse(JSON.stringify(v)));},
      get:async function(k){return m.has(k)?JSON.parse(JSON.stringify(m.get(k))):null;},
      list:async function(prefix){return Array.from(m.entries()).filter(function(e){return e[0].indexOf(prefix)===0;}).map(function(e){return JSON.parse(JSON.stringify(e[1]));});},
      delete:async function(k){m.delete(k);}
    };
  }
  return Object.freeze({
    SCHEMA:SCHEMA,PACK_SCHEMA:PACK_SCHEMA,MAX_EXERCISES:MAX_EXERCISES,
    validateInventory:validateInventory,plan:plan,guidePack:guidePack,
    videoDownloadDecision:videoDownloadDecision,store:store,
    memoryAdapter:memoryAdapter
  });
});