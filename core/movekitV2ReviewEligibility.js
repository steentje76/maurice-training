/*
 * TK-504 MoveKit V2 - REVIEW-ONLY execution / logging / media-grant eligibility gate.
 *
 * Pure, isolated, fail-closed. NOT wired into index.html, Supabase, workout
 * execution, logging or media signing. It only answers: "may this exercise
 * reference be used for <purpose>?" given two TRUSTED, caller-supplied sets:
 *   - baseline: the already published canonical MoveKit identities (226)
 *   - pending : the private-review identities that are NOT released (356)
 *
 * Rules (all deny by default):
 *  - Eligibility comes ONLY from membership of the trusted baseline by canonical
 *    catalog_id AND matching provenance (provider 'movekit' + provider_id slug).
 *  - Anything a candidate says about itself (status, published, approved,
 *    _review, release flags, variant_of, ...) is ignored and never grants access.
 *  - A pending identity is never eligible, whatever it claims or references.
 *  - A legacy/DB row `id` alone is never a binding; a personal/owned row
 *    (scope / user_id / owner_id / ownerId) is never auto-eligible, even when it
 *    reuses a published TK id.
 *  - Candidates are read via own data properties only (no accessors/proxies
 *    surprises, no prototype lookups) and never mutated. Output is frozen.
 *  - This gate does NOT resolve issue #584 or any production behaviour.
 */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.MoveKitV2ReviewEligibility=api;
})(typeof globalThis!=='undefined'?globalThis:null,function(){
  'use strict';
  const ID=/^TK-\d{6}$/;
  const SLUG=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const PROVIDER='movekit';
  const PURPOSES=Object.freeze(['workout_execution','workout_log','media_grant']);
  const PERSONAL_KEYS=Object.freeze(['scope','user_id','owner_id','ownerId','userId']);
  const REASON=Object.freeze({
    ALLOWED:'ALLOWED_PUBLISHED_CANONICAL',
    BAD_PURPOSE:'DENY_UNKNOWN_PURPOSE',
    MALFORMED:'DENY_MALFORMED_CANDIDATE',
    ACCESSOR:'DENY_NON_DATA_PROPERTY',
    PERSONAL:'DENY_PERSONAL_OR_OWNED_ROW',
    NO_CATALOG_ID:'DENY_NO_CANONICAL_CATALOG_ID',
    ID_MISMATCH:'DENY_ROW_ID_CATALOG_ID_MISMATCH',
    PENDING:'DENY_PENDING_UNRELEASED_IDENTITY',
    UNKNOWN:'DENY_UNKNOWN_IDENTITY',
    SOURCE_MISSING:'DENY_SOURCE_PROVENANCE_MISSING',
    PROVIDER_MISMATCH:'DENY_PROVIDER_MISMATCH',
    SLUG_MISMATCH:'DENY_PROVIDER_ID_MISMATCH',
    PENDING_REVIEW_MARKER:'DENY_PENDING_REVIEW_MARKER'
  });

  function error(code){const e=new Error(code);e.code=code;return e;}
  const hasOwn=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
  function plain(v){
    if(v===null||typeof v!=='object'||Array.isArray(v))return false;
    const p=Object.getPrototypeOf(v);
    return p===Object.prototype||p===null;
  }
  /** Own DATA property value, or {bad:true} for accessors. Never invokes getters. */
  function read(obj,key){
    if(!hasOwn(obj,key))return {present:false};
    const d=Object.getOwnPropertyDescriptor(obj,key);
    if(!d||!hasOwn(d,'value'))return {present:true,bad:true};
    return {present:true,value:d.value};
  }

  function snapshot(rows,label,seen){
    if(!Array.isArray(rows))throw error('INVALID_'+label);
    const out=new Map();
    for(const row of rows){
      if(!plain(row))throw error('INVALID_'+label);
      const id=read(row,'catalog_id'),src=read(row,'source');
      if(id.bad||src.bad||typeof id.value!=='string'||!ID.test(id.value)||!plain(src.value))
        throw error('INVALID_'+label);
      const prov=read(src.value,'provider'),slug=read(src.value,'provider_id');
      if(prov.bad||slug.bad||prov.value!==PROVIDER||typeof slug.value!=='string'||!SLUG.test(slug.value))
        throw error('INVALID_'+label+'_SOURCE');
      if(seen.ids.has(id.value))throw error('DUPLICATE_CATALOG_ID');
      if(seen.slugs.has(slug.value))throw error('DUPLICATE_PROVIDER_ID');
      seen.ids.add(id.value);seen.slugs.add(slug.value);
      out.set(id.value,Object.freeze({catalogId:id.value,providerId:slug.value}));
    }
    return out;
  }

  /**
   * @param {{baseline:Array,pending:Array,expectedBaseline?:number,expectedPending?:number}} opts
   * Counts default to the audited 226 / 356 and fail closed on any drift.
   */
  function create(opts){
    if(!plain(opts))throw error('GATE_NOT_CONFIGURED');
    const expB=opts.expectedBaseline===undefined?226:opts.expectedBaseline;
    const expP=opts.expectedPending===undefined?356:opts.expectedPending;
    const seen={ids:new Set(),slugs:new Set()};
    const baseline=snapshot(opts.baseline,'BASELINE',seen);
    const pending=snapshot(opts.pending,'PENDING',seen); // disjointness enforced via shared `seen`
    if(baseline.size!==expB)throw error('BASELINE_COUNT_CHANGED');
    if(pending.size!==expP)throw error('PENDING_COUNT_CHANGED');
    const pendingSlugs=new Set([...pending.values()].map((x)=>x.providerId));

    function deny(reason,catalogId){
      return Object.freeze({allowed:false,reason,catalogId:catalogId||null,providerId:null});
    }

    function decide(candidate,purpose){
      if(typeof purpose!=='string'||!PURPOSES.includes(purpose))return deny(REASON.BAD_PURPOSE);
      try{
        if(!plain(candidate))return deny(REASON.MALFORMED);
        for(const k of PERSONAL_KEYS)if(hasOwn(candidate,k))return deny(REASON.PERSONAL);
        const cid=read(candidate,'catalog_id'),rid=read(candidate,'id');
        const rev=read(candidate,'_review'),ident=read(candidate,'identity');
        if(cid.bad||rid.bad||rev.bad||ident.bad)return deny(REASON.ACCESSOR);
        if(!cid.present||typeof cid.value!=='string'||!ID.test(cid.value)){
          return deny(REASON.NO_CATALOG_ID); // legacy DB id alone is never a binding
        }
        const catalogId=cid.value;
        if(rid.present&&(typeof rid.value!=='string'||(ID.test(rid.value)&&rid.value!==catalogId)))
          return deny(REASON.ID_MISMATCH,catalogId);
        if(pending.has(catalogId))return deny(REASON.PENDING,catalogId);
        if(rev.present&&rev.value!==undefined&&rev.value!==null)return deny(REASON.PENDING_REVIEW_MARKER,catalogId);
        if(plain(ident.value)){
          const cat=read(ident.value,'category');
          if(!cat.bad&&cat.value==='pending_review')return deny(REASON.PENDING_REVIEW_MARKER,catalogId);
        }
        const trusted=baseline.get(catalogId);
        if(!trusted)return deny(REASON.UNKNOWN,catalogId);
        const src=read(candidate,'source');
        if(src.bad)return deny(REASON.ACCESSOR,catalogId);
        if(!src.present||!plain(src.value))return deny(REASON.SOURCE_MISSING,catalogId);
        const prov=read(src.value,'provider'),slug=read(src.value,'provider_id');
        if(prov.bad||slug.bad)return deny(REASON.ACCESSOR,catalogId);
        if(prov.value!==PROVIDER)return deny(REASON.PROVIDER_MISMATCH,catalogId);
        if(typeof slug.value!=='string'||slug.value!==trusted.providerId)
          return deny(pendingSlugs.has(slug.value)?REASON.PENDING:REASON.SLUG_MISMATCH,catalogId);
        return Object.freeze({allowed:true,reason:REASON.ALLOWED,catalogId,providerId:trusted.providerId});
      }catch(_e){
        return deny(REASON.MALFORMED); // e.g. hostile Proxy: fail closed
      }
    }

    return Object.freeze({
      decide,
      canExecute:(c)=>decide(c,'workout_execution').allowed,
      canLog:(c)=>decide(c,'workout_log').allowed,
      canGrantMedia:(c)=>decide(c,'media_grant').allowed,
      baselineCount:baseline.size,
      pendingCount:pending.size,
      reviewOnly:true,
      activeUi:false,
      resolvesIssue584:false
    });
  }

  return Object.freeze({create,PURPOSES,REASON});
});
