'use strict';
// TK614/#603 -- 582/582 typed exercise session writer + resolver CONTRACT.
// Real index.html helpers (extracted, isolated VM) against a SYNTHETIC
// in-memory DB model that mirrors the staged migration semantics:
//  - tk504_resolve_catalog_fk: auth required, exact catalog+provider, active+reviewed only
//  - tk504_typed_session_fk_guard: TKC insert needs an active+reviewed binding
//  - sessions RLS: row.user_id must equal the JWT subject; same UUID = idempotent
// NOT a production test: no Supabase, no real JWT, no Android, no network.
// Two DB modes: CURRENT (226 staged inactive, 356 active) and a HYPOTHETICAL
// post-gate mode (all 582 active) that exists ONLY in this synthetic model.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const catalogJson=require('../exercise-catalog.json');
const golden=require('../docs/generated/MOVEKIT_GOLDEN_V2_INVENTORY.json');
assert.match(html,/const TK504_TYPED_FK_SESSION_RELEASE = true;/);
const m=html.match(/^const EX_CATALOG = (\{.*\});?\s*$/m);
assert(m,'single embedded catalog');
const embedded=JSON.parse(m[1]).catalog;
let checks=0;
const ok=(v,label)=>{assert.ok(v,label);checks++;};
const eq=(a,b,label)=>{assert.deepEqual(a,b,label);checks++;};
async function rejects(p,re,label){await assert.rejects(p,re,label);checks++;}
const pad=n=>String(n).padStart(6,'0');

// 582 catalog: the embedded 226 (must equal exercise-catalog.json identity)
// plus the 356 published identities from the public golden inventory.
const ident=list=>list.map(c=>[c.catalog_id,c.source&&c.source.provider,c.source&&c.source.provider_id])
  .sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0);
eq(ident(embedded),ident(catalogJson.catalog),'embedded 226 identity = source exercise-catalog.json');
const goldenById=new Map(golden.items.map(r=>[r.catalog_id,r.provider_id]));
const ecs=new Map(embedded.map(c=>[c.catalog_id,c]));
for(let i=227;i<=582;i++){const id='TK-'+pad(i);
  ecs.set(id,{catalog_id:id,source:{provider:'movekit',provider_id:goldenById.get(id)}});}
eq(ecs.size,582);
const IDS=[...ecs.keys()].sort();
ok(IDS.every((id,i)=>id==='TK-'+pad(i+1)&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(ecs.get(id).source.provider_id)),
  '582 contiguous identities with provider slugs');
eq(new Set(IDS.map(id=>ecs.get(id).source.provider_id)).size,582,'582 unique provider slugs');

function extract(name){
 const r=new RegExp('(?:async\\s+)?function\\s+'+name+'\\s*\\(').exec(html);
 assert(r,'Missing real function '+name);let depth=0;
 for(let i=html.indexOf('{',r.index);i<html.length;i++){
  if(html[i]==='{')depth++;
  if(html[i]==='}'&&--depth===0)return html.slice(r.index,i+1);
 }
 throw Error('Unterminated '+name);
}
const NAMES=['tk504CatalogSourceRefFromCatalog','tk504CatalogSourceRefFromSelection',
 'tk603CatalogRefFromPickerSelection','tk504ValidateCatalogSourceRef','tk504VerifySessionBinding',
 'tk504RewriteVerifiedSessionRow','tkSessieSchrijfOpts','tkSessieOptsVoor',
 'ensureSessionExerciseRows','writeSessionRow'];
const SRC=NAMES.map(extract).join('\n');

const UA='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',UB='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
function syntheticDb(mode){
  const bindings=new Map();
  IDS.forEach((id,i)=>{const active=i>=226||mode==='post-gate-hypothetical';
    bindings.set(id,{catalog_id:id,exercise_id:'TKC-'+id.slice(3),provider_id:ecs.get(id).source.provider_id,
      active,reviewed_at:active?'2026-11-07T00:00:00Z':null});});
  const byFk=new Map([...bindings.values()].map(b=>[b.exercise_id,b]));
  const sessions=new Map();
  return {bindings,sessions,byFk,
    resolve(jwt,catalogId,providerId){
      if(!jwt)return null;
      const b=bindings.get(catalogId);
      return b&&b.provider_id===providerId&&b.active===true&&b.reviewed_at?b.exercise_id:null;
    },
    insertSession(jwt,row){
      if(!jwt)throw Error('401_no_jwt');
      if(row.user_id!==jwt)throw Error('42501_rls_owner');
      if(/^TKC-\d{6}$/.test(row.exercise_id||'')){
        const b=byFk.get(row.exercise_id);
        if(!b||!(b.active&&b.reviewed_at))throw Error('23514_catalog_fk_not_released');
      }
      const prev=sessions.get(row.id);
      if(prev){if(prev.user_id!==row.user_id)throw Error('42501_rls_owner');return 'duplicate-idempotent';}
      sessions.set(row.id,{...row});return 'inserted';
    }};
}
function sandbox(db){
  let owner=UA,jwt=UA,online=true,rpcCalls=0,shadowCalls=0;
  const queue=[];
  const nav={get onLine(){return online;}};
  const s=vm.createContext({
    TK504_TYPED_FK_SESSION_RELEASE:true,
    ExerciseCatalogService:{byId:k=>ecs.get(k)||null},
    tkEigenaarUid:()=>owner,navigator:nav,
    sbRpc:async(fn,args)=>{rpcCalls++;assert.equal(fn,'tk504_resolve_catalog_fk');
      if(!online)throw Error('network');return db.resolve(jwt,args.p_catalog_id,args.p_provider_id);},
    ensureExerciseRowStatus:async()=>{shadowCalls++;return 'queued';},
    sessionLog:{},
    // Synthetic stand-in for sbPostQ: offline -> durable local queue of the
    // EXACT prepared row; online -> server insert with the current JWT.
    sbPostQ:async(table,row)=>{assert.equal(table,'sessions');
      if(!online){queue.push(JSON.parse(JSON.stringify(row)));return 'queued';}
      return db.insertSession(jwt,row);},
    Set,console});
  vm.runInContext(SRC,s,{timeout:10000});
  return {s,queue,
    as(u){owner=u;jwt=u;},setOwnerOnly(u){owner=u;},setOnline(v){online=v;},
    get rpcCalls(){return rpcCalls;},get shadowCalls(){return shadowCalls;},
    replay(){const out=[];while(queue.length){const row=queue[0];
      try{out.push(db.insertSession(jwt,row));queue.shift();}catch(e){out.push('kept:'+e.message);break;}}return out;}};
}
const sel=(sb,id)=>({id,tk504_catalog_ref:sb.s.tk504CatalogSourceRefFromSelection(id)});
const row=(id,user,k)=>({id:'00000000-0000-4000-8000-'+String(k).padStart(12,'0'),exercise_id:id,user_id:user,
  sets_detail:[{kg:20,reps:8}],note:'keep '+id});

(async()=>{
 // ---- 1. source refs for all 582 come from the canonical catalog only
 {const sb=sandbox(syntheticDb('current'));
  const refs=IDS.map(id=>sb.s.tk504CatalogSourceRefFromSelection(id));
  ok(refs.every((r,i)=>r&&r.kind==='movekit-catalog-v1'&&r.catalog_id===IDS[i]&&
    r.provider_id===ecs.get(IDS[i]).source.provider_id),'582/582 canonical source refs');
  ok(sb.s.tk504CatalogSourceRefFromSelection('TK-000583')===null&&sb.s.tk504CatalogSourceRefFromSelection('TKC-000063')===null);
  // personal TK-shaped row or DB-shaped object is never catalog evidence
  ok(sb.s.tk603CatalogRefFromPickerSelection({id:'TK-000063',_catalog:true,catalog_id:'TK-000063',scope:'personal',user_id:UA})===null,
    'personal TK-000063 row is not catalog provenance');
  ok(sb.s.tk603CatalogRefFromPickerSelection({id:'TK-000188',catalog_id:'TK-000188'})===null,'no _catalog flag, no ref');
  ok(sb.s.tk603CatalogRefFromPickerSelection({id:'TK-000188',_catalog:true,catalog_id:'TK-000188'}).provider_id===
    ecs.get('TK-000188').source.provider_id,'real picker selection yields the canonical ref');
  await rejects(sb.s.tk504VerifySessionBinding({id:'TK-000063',tk504_catalog_ref:{kind:'movekit-catalog-v1',
    catalog_id:'TK-000063',provider_id:ecs.get('TK-000188').source.provider_id}}),/tk504_catalog_provenance_invalid/,
    'cross-slug forgery rejected before any RPC');
  eq(sb.rpcCalls,0);}

 // ---- 2. CURRENT state: 356 resolve, the 226 staged rows stay unresolvable
 {const db=syntheticDb('current'),sb=sandbox(db);
  let resolved=0,denied=0;
  for(const id of IDS){
    try{const b=await sb.s.tk504VerifySessionBinding(sel(sb,id));
      if(b&&b.fk_id==='TKC-'+id.slice(3)&&b.owner_uid===UA&&Number(id.slice(3))>226)resolved++;}
    catch(e){if(/tk504_catalog_fk_unverified/.test(e.message)&&Number(id.slice(3))<=226)denied++;}
  }
  eq([resolved,denied],[356,226],'current: 356 typed, 226 not released (no silent fallback)');
  sb.s.sessionLog={'TK-000063':{sets:[{}]},'TK-000188':{sets:[{}]},'TK-000300':{sets:[{}]},'own-squat':{sets:[{}]}};
  const st=await sb.s.ensureSessionExerciseRows([sel(sb,'TK-000063'),sel(sb,'TK-000188'),sel(sb,'TK-000300'),{id:'own-squat'}]);
  eq([st['TK-000063'],st['TK-000188'],st['TK-000300'],st['own-squat']],['rejected','rejected','typed-verified','queued']);
  eq(sb.shadowCalls,1,'only the personal exercise uses the legacy shadow path; never for catalog items');
  await rejects(Promise.resolve().then(()=>sb.s.tkSessieOptsVoor(st,'TK-000063')),/exercise_row_rejected/,
    'unreleased catalog item cannot be written');
  const o300=sb.s.tkSessieOptsVoor(st,'TK-000300');
  eq(await sb.s.writeSessionRow(row('TK-000300',UA,300),o300),'inserted');
  eq(db.sessions.get(row('TK-000300',UA,300).id).exercise_id,'TKC-000300');
  // a client that bypasses the app and posts TKC-000063 directly is refused by the DB guard
  assert.throws(()=>db.insertSession(UA,{id:'x',user_id:UA,exercise_id:'TKC-000063'}),/23514/);checks++;}

 // ---- 3. HYPOTHETICAL post-gate (synthetic only): 582/582 through ONE writer
 {const db=syntheticDb('post-gate-hypothetical'),sb=sandbox(db);
  let written=0;
  for(let k=0;k<IDS.length;k++){const id=IDS[k];
    const b=await sb.s.tk504VerifySessionBinding(sel(sb,id));
    const original=row(id,UA,k+1);
    const res=await sb.s.writeSessionRow(original,{detail:true,queueOnly:false,tk504_binding:b});
    const saved=db.sessions.get(original.id);
    if(res==='inserted'&&saved.exercise_id===b.fk_id&&saved.note===original.note&&original.exercise_id===id&&
       JSON.stringify(saved.sets_detail)===JSON.stringify(original.sets_detail))written++;
  }
  eq(written,582,'582/582 typed rows via the central writer, UUID/sets/note preserved');
  eq(db.sessions.size,582);
  // idempotent retry: same UUID twice = one row
  const b63=await sb.s.tk504VerifySessionBinding(sel(sb,'TK-000063'));
  eq(await sb.s.writeSessionRow(row('TK-000063',UA,63),{tk504_binding:b63}),'duplicate-idempotent');
  eq(db.sessions.size,582,'retry does not duplicate');

  // ---- 4. owner A/B
  sb.setOwnerOnly(UB); // account switched in the app after A verified
  await rejects(Promise.resolve().then(()=>sb.s.writeSessionRow(row('TK-000188',UB,9001),{tk504_binding:b63})),
    /tk504_session_fk_mapping_denied/,'A binding cannot be used for another catalog row');
  const b188A=(sb.as(UA),await sb.s.tk504VerifySessionBinding(sel(sb,'TK-000188')));
  sb.as(UB);
  await rejects(Promise.resolve().then(()=>sb.s.writeSessionRow(row('TK-000188',UB,9002),{tk504_binding:b188A})),
    /tk504_session_fk_mapping_denied/,"owner A's binding is refused for owner B");
  const b188B=await sb.s.tk504VerifySessionBinding(sel(sb,'TK-000188'));
  ok(b188B.owner_uid===UB,'B gets its own owner-bound binding');
  eq(await sb.s.writeSessionRow(row('TK-000188',UB,9003),{tk504_binding:b188B}),'inserted');
  // B forging A's user_id is refused server-side (RLS model)
  await rejects(sb.s.writeSessionRow(row('TK-000188',UA,9004),{tk504_binding:b188B}),/42501_rls_owner/);
  // B cannot overwrite A's existing UUID
  await rejects(sb.s.writeSessionRow({...row('TK-000188',UB,1),id:row('TK-000001',UA,1).id},{tk504_binding:b188B}),
    /42501_rls_owner/,'no cross-owner UUID overwrite');
  // account change during the RPC
  sb.as(UA);
  const rpc=sb.s.sbRpc;
  sb.s.sbRpc=async(f,a)=>{const r=await rpc(f,a);sb.setOwnerOnly(UB);return r;};
  await rejects(sb.s.tk504VerifySessionBinding(sel(sb,'TK-000063')),/tk504_account_changed/);
  sb.s.sbRpc=rpc;sb.as(UA);

  // ---- 5. offline + replay
  sb.setOnline(false);
  const before=sb.rpcCalls;
  await rejects(sb.s.tk504VerifySessionBinding(sel(sb,'TK-000063')),/tk504_typed_fk_offline_unverified/,
    'no new typed verification while offline');
  eq(sb.rpcCalls,before,'offline sends no RPC');
  sb.s.sessionLog={'TK-000063':{sets:[{}]}};
  const offSt=await sb.s.ensureSessionExerciseRows([sel(sb,'TK-000063')]);
  eq(offSt['TK-000063'],'rejected','offline unverified catalog item is not queued as legacy shadow');
  // a binding verified ONLINE before connectivity loss: the exact prepared row is queued
  const bOnline=b63;
  eq(await sb.s.writeSessionRow(row('TK-000063',UA,77063),{tk504_binding:bOnline}),'queued');
  eq(sb.queue.length,1);eq(sb.queue[0].exercise_id,'TKC-000063');eq(sb.queue[0].user_id,UA);
  sb.setOnline(true);
  eq(sb.replay(),['inserted'],'replay inserts once');
  eq(db.sessions.get(row('TK-000063',UA,77063).id).exercise_id,'TKC-000063');
  sb.queue.push(JSON.parse(JSON.stringify(db.sessions.get(row('TK-000063',UA,77063).id))));
  eq(sb.replay(),['duplicate-idempotent'],'second replay of the same UUID is idempotent');
  // replay after account switch: refused, kept, never re-owned
  sb.setOnline(false);
  await sb.s.writeSessionRow(row('TK-000063',UA,77064),{tk504_binding:bOnline});
  sb.setOnline(true);sb.as(UB);
  eq(sb.replay(),['kept:42501_rls_owner'],"B's session cannot flush A's queued row");
  eq(sb.queue.length,1);
  // replay after revocation: server re-checks the binding
  sb.as(UA);db.byFk.get('TKC-000063').active=false;
  eq(sb.replay(),['kept:23514_catalog_fk_not_released'],'revoked binding refuses a late replay');
  db.byFk.get('TKC-000063').active=true;
  eq(sb.replay(),['inserted']);
  eq(db.sessions.size,582+1+2,'582 + one B row + 2 replayed rows (no duplicates)');}

 console.log('TK614 typed 582 session-writer contract: '+checks+
  ' assertions PASS (SYNTHETIC DB model; not Supabase, not Android, not production)');
})().catch(e=>{console.error(e);process.exitCode=1;});
