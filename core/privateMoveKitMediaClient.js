/* MoveKit private streaming client, STAGED & UNWIRED.
 * No raw path supplied by app, no URL persistence, no offline video downloads.
 * Server broker validates the bearer and signs video only. This client additionally
 * rejects untrusted hosts/paths/TTL and stale requests after account changes.
 * Not enabled in the UI until the MoveKit licensing/streaming gate is approved.
 */
(function(root,factory){
  var api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.PrivateMoveKitMediaClient=api;
})(typeof globalThis!=='undefined'?globalThis:null,function(){
  'use strict';
  var ID=/^TK-\d{6}$/;
  var OWNER=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  var BROKER='/.netlify/functions/exercise-media-url';
  var REMOTE_BROKER='https://maurice-art.netlify.app'+BROKER;
  var TRUSTED_WEB_ORIGINS=['https://maurice-art.netlify.app','https://trainingskompas.com','https://www.trainingskompas.com'];
  var NATIVE_ORIGINS=['https://localhost','capacitor://localhost']; // exactly broker CORS allowlist
  function brokerFor(origin){
    // Native WebView hosts UI locally; the broker exists ONLY on Netlify.
    if(NATIVE_ORIGINS.includes(origin))return REMOTE_BROKER;
    if(TRUSTED_WEB_ORIGINS.includes(origin))return BROKER;
    throw err('UNTRUSTED_APP_ORIGIN');
  }
  var STORAGE_ORIGIN='https://mhfxhzkdmgkaplicdszg.supabase.co';
  var PATH_PREFIX='/storage/v1/object/sign/exercise-media/movekit/v1/video/';
  var PATH_RE=/^\/storage\/v1\/object\/sign\/exercise-media\/movekit\/v1\/video\/[a-z0-9]+(?:-[a-z0-9]+)*\.mp4$/;
  function err(code){var e=new Error(code);e.code=code;return e;}
  function create(opts){
    opts=opts||{};
    var fetchFn=opts.fetch||((typeof fetch==='function')?fetch:null);
    var tokenProvider=opts.tokenProvider;
    var ownerProvider=opts.ownerProvider;
    var now=opts.now||Date.now;
    var origin=opts.origin||(typeof location!=='undefined'?location.origin:'https://maurice-art.netlify.app');
    var endpoint=brokerFor(origin);
    if(typeof fetchFn!=='function'||typeof tokenProvider!=='function'||typeof ownerProvider!=='function')throw err('CLIENT_NOT_CONFIGURED');
    var generation=0;
    function live(uid,req){
      return generation===req&&ownerProvider()===uid;
    }
    function verifySignedUrl(raw){
      if(typeof raw!=='string')throw err('INVALID_SIGNED_URL');
      var parsed;try{parsed=new URL(raw);}catch(_){throw err('INVALID_SIGNED_URL');}
      if(parsed.origin!==STORAGE_ORIGIN||!PATH_RE.test(parsed.pathname)
          ||parsed.username||parsed.password||parsed.hash||!parsed.searchParams.has('token')
          ||!parsed.searchParams.get('token')||parsed.searchParams.has('download'))throw err('INVALID_SIGNED_URL');
      if(parsed.pathname.includes('..')||parsed.pathname.includes('%2f')||parsed.pathname.includes('%2F'))throw err('INVALID_SIGNED_URL');
      return parsed.href;
    }
    async function get(catalogId,ownerId){
      if(typeof catalogId!=='string'||!ID.test(catalogId))throw err('INVALID_CATALOG_ID');
      if(typeof ownerId!=='string'||!OWNER.test(ownerId)||ownerProvider()!==ownerId)throw err('ACCOUNT_MISMATCH');
      var request=generation;
      var token=await tokenProvider();
      if(!live(ownerId,request))throw err('STALE_ACCOUNT');
      if(typeof token!=='string'||token.length<8||token.length>8192)throw err('AUTH_REQUIRED');
      var response;
      try{
        response=await fetchFn(endpoint,{
          method:'POST',cache:'no-store',credentials:'omit',redirect:'error',
          headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},
          body:JSON.stringify({catalog_id:catalogId,type:'video'})
        });
      }catch(_){throw err('NETWORK_UNAVAILABLE');}
      if(!live(ownerId,request))throw err('STALE_ACCOUNT');
      if(!response||!response.ok){
        var code=response&&response.status;
        if(code===401||code===403)throw err('AUTH_REQUIRED');
        if(code===404)throw err('MEDIA_NOT_FOUND');
        if(code===429)throw err('RATE_LIMITED');
        throw err('PRIVATE_MEDIA_UNAVAILABLE');
      }
      var payload;try{payload=await response.json();}catch(_){throw err('INVALID_BROKER_RESPONSE');}
      if(!live(ownerId,request))throw err('STALE_ACCOUNT');
      if(!payload||payload.ok!==true||payload.catalog_id!==catalogId||payload.type!=='video'
        ||!Number.isInteger(payload.expires_in)||payload.expires_in<=0||payload.expires_in>300)throw err('INVALID_BROKER_RESPONSE');
      // URL is ephemeral and deliberately returned ONLY to an active authorized
      // player. Do not save to IndexedDB/Cache Storage or service worker.
      return Object.freeze({url:verifySignedUrl(payload.url),expiresAt:now()+1000*Math.max(0,payload.expires_in-30),catalogId:catalogId});
    }
    return Object.freeze({
      get:get,
      invalidate:function(){generation++;},
      brokerPath:endpoint,
      offlineVideoDownloadAllowed:false
    });
  }
  return Object.freeze({create:create,BROKER:BROKER,REMOTE_BROKER:REMOTE_BROKER,STORAGE_ORIGIN:STORAGE_ORIGIN});
});