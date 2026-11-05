/*
 * MoveKit V2 authenticated signed-media client — STAGED / UNWIRED.
 *
 * This client does not authorize playback: the server requires an explicit
 * release gate and service-only database grant on EVERY signing
 * request. Signed URLs are ephemeral and must NOT be saved to storage.
 */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.PrivateMoveKitV2MediaClient=api;
})(typeof globalThis!=='undefined'?globalThis:null,function(){
  'use strict';
  const ID=/^TK-\d{6}$/;
  const UID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
  const SLUG='[a-z0-9]+(?:-[a-z0-9]+)*';
  const HOST='https://mhfxhzkdmgkaplicdszg.supabase.co';
  const URI='/.netlify/functions/exercise-media-v2-url';
  const REMOTE='https://maurice-art.netlify.app'+URI;
  const WEB=new Set(['https://maurice-art.netlify.app','https://trainingskompas.com','https://www.trainingskompas.com']);
  const MOBILE=new Set(['https://localhost','capacitor://localhost']);
  function fail(code){const e=new Error(code);e.code=code;return e;}
  function endpoint(origin){
    if(WEB.has(origin))return URI;
    if(MOBILE.has(origin))return REMOTE;
    throw fail('UNTRUSTED_APP_ORIGIN');
  }
  function mediaPath(type){
    if(type==='video')return new RegExp('^/storage/v1/object/sign/exercise-media/movekit/v2/video/'+SLUG+'\\.mp4$');
    if(type==='poster')return new RegExp('^/storage/v1/object/sign/exercise-posters/movekit/v2/poster-optimized/'+SLUG+'\\.webp$');
    throw fail('INVALID_MEDIA_TYPE');
  }
  function validUrl(raw,type){
    let url;
    try{url=new URL(raw);}catch(_){throw fail('INVALID_SIGNED_URL');}
    const params=Array.from(url.searchParams.entries());
    if(url.origin!==HOST || !mediaPath(type).test(url.pathname)
       || url.hash || url.username || url.password
       || params.length!==1 || params[0][0]!=='token'
       || !/^[A-Za-z0-9._~-]{8,4096}$/.test(params[0][1])){
      throw fail('INVALID_SIGNED_URL');
    }
    return url.href;
  }
  function create(opts){
    opts=opts||{};
    const fetchFn=opts.fetch||(typeof fetch==='function'?fetch:null);
    const getToken=opts.tokenProvider;
    const getOwner=opts.ownerProvider;
    const now=opts.now||Date.now;
    const origin=opts.origin||(typeof location!=='undefined'?location.origin:null);
    const dest=endpoint(origin);
    if(typeof fetchFn!=='function'||typeof getToken!=='function'
      ||typeof getOwner!=='function')throw fail('CLIENT_NOT_CONFIGURED');
    let generation=0;
    const current=(uid,g)=>g===generation&&getOwner()===uid;
    async function get(catalogId,type,ownerId){
      if(typeof catalogId!=='string'||!ID.test(catalogId))throw fail('INVALID_CATALOG_ID');
      mediaPath(type);
      if(typeof ownerId!=='string'||!UID.test(ownerId)||getOwner()!==ownerId)
        throw fail('ACCOUNT_MISMATCH');
      const g=generation;
      const token=await getToken();
      if(!current(ownerId,g))throw fail('STALE_ACCOUNT');
      if(typeof token!=='string'||token.length<8||token.length>8192)
        throw fail('AUTH_REQUIRED');
      let res;
      try{
        res=await fetchFn(dest,{
          method:'POST',
          credentials:'omit',redirect:'error',cache:'no-store',
          headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
          body:JSON.stringify({catalog_id:catalogId,type:type,version:'v2'})
        });
      }catch(_){throw fail('NETWORK_UNAVAILABLE');}
      if(!current(ownerId,g))throw fail('STALE_ACCOUNT');
      if(!res||!res.ok){
        const status=res&&res.status;
        if(status===401)throw fail('AUTH_REQUIRED');
        if(status===403){
          // An unpublished canonical exercise is not a payment/entitlement
          // failure. Preserve the distinction for the future UI while never
          // trusting arbitrary response text or exposing backend details.
          let reason=null;
          try{
            const denial=await res.json();
            if(denial && typeof denial==='object' && !Array.isArray(denial))
              reason=denial.error;
          }catch(_){}
          if(!current(ownerId,g))throw fail('STALE_ACCOUNT');
          if(reason==='CONTENT_BINDING_NOT_APPROVED')throw fail('MEDIA_NOT_RELEASED');
          throw fail('ENTITLEMENT_REQUIRED');
        }
        if(status===404)throw fail('MEDIA_NOT_FOUND');
        if(status===429)throw fail('RATE_LIMITED');
        if(status===503)throw fail('MEDIA_NOT_RELEASED');
        throw fail('PRIVATE_MEDIA_UNAVAILABLE');
      }
      let payload;
      try{payload=await res.json();}catch(_){throw fail('INVALID_BROKER_RESPONSE');}
      if(!current(ownerId,g))throw fail('STALE_ACCOUNT');
      if(!payload || payload.ok!==true || payload.catalog_id!==catalogId
          || payload.type!==type || payload.version!=='v2'
          || !Number.isInteger(payload.expires_in)
          || payload.expires_in<31 || payload.expires_in>60)
        throw fail('INVALID_BROKER_RESPONSE');
      const signed=validUrl(payload.url,type);
      return Object.freeze({
        url:signed, catalogId:catalogId,type:type,version:'v2',
        expiresAt:now()+(payload.expires_in-30)*1000
      });
    }
    return Object.freeze({
      get, invalidate:()=>{generation++;}, brokerPath:dest,
      activeUi:false, rawMediaCacheAllowed:false,
      offlineDownloadReleased:false
    });
  }
  return Object.freeze({create,endpoint,validUrl,URI,REMOTE,HOST});
});
