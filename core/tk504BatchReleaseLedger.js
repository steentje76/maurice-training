'use strict';
// #504/#603 — the ONE canonical ledger for the 15 owner-approved MoveKit
// packages (TK-000227..TK-000582). Shared by the existing catalog function,
// the existing V2 media broker and the existing ECS runtime bridge.
// It binds a server release to: an exact cumulative package prefix, the
// owner's content-approval fingerprints and one video+poster entry per ID.
// It never grants release: a candidate built here is NOT release approval.
(function(root,factory){
  const value=factory();
  if(typeof module==='object'&&module.exports)module.exports=value;
  if(root)root.TK504BatchReleaseLedger=value;
})(typeof globalThis!=='undefined'?globalThis:null,function(){
  const DECISION_ID='TK504-20261105-OWNER-BATCHES-01-15';
  const DISPLAY_SHA256='320f7abfa9d0022f9fd6695087409cc930cc6b300ec91ade5aef3465728d3e8d';
  // Pinned copy of docs/generated/MOVEKIT_V2_OWNER_BATCH_CONTENT_APPROVAL_20261105.json;
  // the test suite proves byte-for-byte equality with that approval record.
  const FINGERPRINTS=[
    'a4fde8696d721a1389ff2a41e41b08eb18f91b1f654a15bcee6b802aed2983d6',
    'e2347cd087763733497f58440ab48c7593994d4b739efb2576c6e3fe12635297',
    '27fba9d5ccfbb9a7ad448adcfd8de48d1966c2b0bd54c3706266d6111542f1bf',
    '8afa1330aa0e3cda53b97a7f3626684fb36fd2301fb15d9a32692ea96da4a0e2',
    '2b2a5eecfcf5ebea3ff0c67a907243dc8966e035ac0d9527b03e885fe1a76609',
    'b9b1732840530128984d17f33059d622a8aa0861892f19d03e0c53c8357ea93e',
    'ecc13bb075bff0da62ea8eb2e90f47cfbd4c3a36fac34becfd86ce2a10f734eb',
    '487b3bb3989c72161cb9ada179525aae82e0410ed22f6658c25cb3a19c955865',
    '951279967aa0d387590cf39024dcc0c8ed5db548656c660c25a4552c8f94f15c',
    'e22082e8f268f82170cbc84f2e974de1dd1ce4d8d4910760b1804cae2dddce9d',
    '0cbab2865701a409d1547e6f369e5bf297ddf254ca95ac63ead8cab8963e677a',
    '3e9a66bf9b08b9ba1159115c2102b3d40945871abcaae10dea65cc7b3a09defc',
    'aaf95141d3d33019f855bbbfef18f9c68e63b077c088350a61ecd91bd1c51b3a',
    'e1864cdfeb163c4bac1abfcf3924e41a304895c0cf8500fe99e78b51585f7162',
    '028418a69c9729f2583c26ebf951f9993d5dc597523c7c986a676f739eb2536d'
  ];
  const START=227,END=582,EXISTING=226,MAX_NEW=356;
  const cid=n=>'TK-'+String(n).padStart(6,'0');
  const num=c=>typeof c==='string'&&/^TK-[0-9]{6}$/.test(c)?Number(c.slice(3)):NaN;
  const BATCHES=Object.freeze(FINGERPRINTS.map((sha,i)=>{
    const from=START+i*25,through=Math.min(from+24,END);
    return Object.freeze({batch:i+1,from:cid(from),through:cid(through),
      count:through-from+1,display_sha256:sha,
      cumulative_new:through-START+1,cumulative_total:through-START+1+EXISTING});
  }));
  function batchOf(catalogId){
    const n=num(catalogId);
    if(!(n>=START&&n<=END))return null;
    return BATCHES[Math.floor((n-START)/25)];
  }
  function batchForNewCount(count){
    return BATCHES.find(b=>b.cumulative_new===count)||null;
  }
  function idsThrough(batch){
    const b=BATCHES[batch-1];
    if(!b)return null;
    const out=[];for(let n=START;n<=num(b.through);n++)out.push(cid(n));
    return out;
  }
  function releasedHeader(batch){
    if(!BATCHES[batch-1])return null;
    return {
      content_approval:{decision_id:DECISION_ID,display_sha256:DISPLAY_SHA256},
      released_batches:BATCHES.slice(0,batch).map(b=>({batch:b.batch,from:b.from,
        through:b.through,count:b.count,display_sha256:b.display_sha256}))
    };
  }
  // Returns {batch, ids} for a server release config whose new-catalog scope is
  // EXACTLY packages 1..N, or null. Gaps, partial packages, duplicates, foreign
  // fingerprints, unknown media types and extra IDs fail closed.
  function releasedScope(config){
    if(!config||typeof config!=='object'||!Array.isArray(config.entries))return null;
    const ca=config.content_approval;
    if(!ca||ca.decision_id!==DECISION_ID||ca.display_sha256!==DISPLAY_SHA256)return null;
    const declared=config.released_batches;
    if(!Array.isArray(declared)||declared.length<1||declared.length>BATCHES.length)return null;
    for(let i=0;i<declared.length;i++){
      const d=declared[i],b=BATCHES[i];
      if(!d||typeof d!=='object'||Object.keys(d).length!==5||d.batch!==b.batch||
        d.from!==b.from||d.through!==b.through||d.count!==b.count||
        d.display_sha256!==b.display_sha256)return null;
    }
    const batch=declared.length,ids=idsThrough(batch),want=new Set(ids);
    const seen=new Set();
    for(const e of config.entries){
      if(!e||typeof e!=='object')return null;
      const n=num(e.catalog_id);
      if(!(n>=1&&n<=END))return null;
      if(e.media_type!=='video'&&e.media_type!=='poster')return null;
      const key=e.catalog_id+'|'+e.media_type;
      if(seen.has(key))return null;
      seen.add(key);
      if(n>=START&&!want.has(e.catalog_id))return null;
    }
    for(const id of ids)
      if(!seen.has(id+'|video')||!seen.has(id+'|poster'))return null;
    return Object.freeze({batch,ids:Object.freeze(ids),
      through:BATCHES[batch-1].through,new_count:ids.length,total:EXISTING+ids.length});
  }
  // Server-published metadata must carry the exact approval of ITS package.
  function rowApprovalValid(catalogId,metadata){
    const b=batchOf(catalogId),p=metadata&&metadata.provenance;
    return !!(b&&p&&typeof p==='object'&&!Array.isArray(p)&&
      p.owner_display_approval===DECISION_ID&&p.approved_batch===b.batch&&
      p.approved_batch_display_sha256===b.display_sha256&&
      typeof p.approved_item_fingerprint==='string'&&
      /^[0-9a-f]{64}$/.test(p.approved_item_fingerprint));
  }
  // Client side: the server's release summary must be one exact package boundary.
  function responseReleaseValid(release,newCount){
    const b=batchForNewCount(newCount);
    return !!(b&&release&&typeof release==='object'&&release.batch===b.batch&&
      release.through===b.through&&release.display_sha256===b.display_sha256&&
      release.decision_id===DECISION_ID);
  }
  // Candidate generator from Git-tracked inventory digests (paths/checksums
  // only; no media, no private metadata). Status is intentionally NOT approved.
  function buildReleaseCandidate(batch,{inventory,posters,inventorySha,posterSha,
    reviewReference,uploadReference}){
    const ids=idsThrough(batch);
    if(!ids)throw Error('TK504_UNKNOWN_BATCH');
    if(!/^TK504-[0-9]{8}-[0-9]{3,6}$/.test(reviewReference||'')||
      !/^TK504-[0-9]{8}-[0-9]{3,6}$/.test(uploadReference||''))
      throw Error('TK504_REFERENCE_REQUIRED');
    const inv=new Map((inventory&&inventory.items||[]).map(x=>[x.catalog_id,x]));
    const pos=new Map((posters&&posters.items||[]).map(x=>[x.catalog_id,x]));
    const entries=[];
    for(const id of ids){
      const v=inv.get(id),p=pos.get(id);
      if(!v||!v.video||!p||p.provider_id!==v.provider_id)throw Error('TK504_INVENTORY_GAP '+id);
      for(const [type,a] of [['video',v.video],['poster',p]])
        entries.push({catalog_id:id,media_type:type,reviewed:true,upload_verified:true,
          review_reference:reviewReference,upload_reference:uploadReference,
          storage_path:a.path,sha256:a.sha256,bytes:a.bytes});
    }
    return {schema:'trainingskompas-movekit-v2-release/1.0',
      status:'RELEASE_CANDIDATE_NOT_APPROVED',
      inventory_sha256:inventorySha,poster_digest_sha256:posterSha,
      ...releasedHeader(batch),entries};
  }
  return Object.freeze({DECISION_ID,DISPLAY_SHA256,BATCHES,START,END,EXISTING,MAX_NEW,
    batchOf,batchForNewCount,idsThrough,releasedHeader,releasedScope,
    rowApprovalValid,responseReleaseValid,buildReleaseCandidate});
});
