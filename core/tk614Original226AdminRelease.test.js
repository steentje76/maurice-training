'use strict';
// TK614/#603 -- ADMIN RELEASE CANDIDATE for the ORIGINAL 226 (phase A stage,
// B activate, C reverse). RED/GREEN on the real generator with a SYNTHETIC 582
// manifest built from the PUBLIC golden inventory (it reproduces the pinned
// private mapping SHA). No DB, Docker, network, credentials or private data.
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const crypto=require('node:crypto');
const {verify}=require('../tools/tk504_prepare_private_fk_manifest.cjs');
const T=require('../tools/tk614_original226_batch25_preflight.cjs');
const R=require('../tools/tk614_original226_admin_release.cjs');
const S=require('../tools/tk614_admin_release_docker_smoke.cjs');
const P=require('../tools/tk614_original226_review_packet.cjs');
const ROOT=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const catalogBytes=fs.readFileSync(path.join(ROOT,'exercise-catalog.json'));
const catalog=JSON.parse(catalogBytes.toString('utf8'));
const golden=require('../docs/generated/MOVEKIT_GOLDEN_V2_INVENTORY.json');
const posters=require('../docs/generated/MOVEKIT_V2_OPTIMIZED_POSTER_DIGESTS.json');
const contentApproval=require('../docs/generated/MOVEKIT_V2_OWNER_BATCH_CONTENT_APPROVAL_20261105.json');
const repoGates=require('../docs/generated/MOVEKIT_V2_RELEASE_GATES.json');

const stage={_status:'PRIVATE_REVIEW_NOT_RELEASED',_base_count:226,_new_count:356,count:582,
 _approved_for_import:0,_media_grants_created:0,_app_activated:false,_history_updates:0,
 _personal_exercise_updates:0,
 catalog:[...golden.items].sort((a,b)=>a.catalog_id.localeCompare(b.catalog_id)).map((r,i)=>({
  catalog_id:r.catalog_id,source:{provider:'movekit',provider_id:r.provider_id},
  ...(i>=226?{_review:{status:'NOT_PUBLISHED',confirmed_by_authenticated_reviewer:false,
   media_entitlement_status:'NOT_VERIFIED',supplier_metadata_modified:false}}:{})}))};
const manifest={...verify({stage,catalog,golden,posters,approval:contentApproval,
  release:{...repoGates,status:'BLOCKED_NOT_REVIEWED',entries:[]}}),private_stage_sha256:'a'.repeat(64)};
const manifestBytes=Buffer.from(JSON.stringify(manifest),'utf8');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const MSHA=sha(manifestBytes);
const tk504Sql=read('supabase/migrations/20261106110000_tk504_typed_catalog_fk_stage.sql');
const auditSql=read('supabase/migrations/20261108120000_tk614_admin_release_audit_stage.sql');
const plan=T.planAll(manifest,catalogBytes);
const pad=n=>String(n).padStart(6,'0');

let checks=0;
const ok=(v,m)=>{assert.ok(v,m);checks++;};
const eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++;};
const throwsCode=(fn,code,m)=>{assert.throws(fn,e=>e.code===code||e.message===code,m||code);checks++;};
const scan=s=>s.split('\n').filter(l=>!l.trimStart().startsWith('--')).join('\n').replace(/'(?:[^']|'')*'/g,"''");
const count=(s,re)=>(s.match(re)||[]).length;

const NOW=Date.now(),iso=ms=>new Date(ms).toISOString(),AT=iso(NOW-3600e3);
const FP={kind:R.FINGERPRINT_KIND,server_version_num:'170004',precondition_sha256:'1'.repeat(64),
  registry_snapshot_sha256:'2'.repeat(64),session_user:'postgres',original_226_bindings:0,original_226_released:0,
  existing_356_active_reviewed:356,legacy_tk_rows:23,latest_audit_decision_id:null,latest_audit_registry_after_sha256:null};
// Coverage alone is no longer a release (TK614 phase-B review 2026-11-09): the
// synthetic gate must also carry a packet-bound owner release record.
const GATES_COVERAGE_ONLY={status:'RELEASE_APPROVED',released_batches:[{from:'TK-000001',through:'TK-000226'}]};
// SYNTHETIC gates = real 15-batch/1164-entry MEDIA scope + FK-only record bound to a
// synthetic owner decision, accepted only via the library trust/opts argument.
const GATES_OK=structuredClone(S.SYNTHETIC_RELEASE_GATES);
const SD={ownerDecision:S.SYNTHETIC_OWNER_DECISION};
// Repo state: the owner FK-only record is committed; it becomes valid only once the
// sha256 of the private LICENSE.txt is bound (tools/tk614_original226_owner_decision.cjs --bind-license).
const LICENSE_BOUND=require('../tools/tk614_original226_owner_decision.cjs').repoOwnerDecision().license.file_sha256!==null;
const PUBLIC_PIN='9a4e3f7ee3cab1792fcc00efca3992c10bb251c0840f47c0a0a224106f280c63';
const REPO_BLOCKERS=LICENSE_BOUND?[]:['ACTIVATION_BLOCKED_ORIGINAL_226_NOT_IN_RELEASE_GATES'];
const KEYS=crypto.generateKeyPairSync('ed25519'),OTHER=crypto.generateKeyPairSync('ed25519');
const KEY_SHA=sha(KEYS.publicKey.export({format:'der',type:'spki'}));
const trustOK={trustedOwnerKeySha256:[KEY_SHA],...SD};
const STAGE_ID='TK614-OWNER-STAGE-20261108-A1',ACT_ID='TK614-OWNER-ACTIVATE-20261108-B1',
  REV_ID='TK614-OWNER-REVERSE-20261108-C1';
function accepted(){
  const g={};
  for(const k of R.ACTIVATION_GATES)g[k]={status:'ACCEPTED',accepted_by:'Synthetic Reviewer',evidence_sha256:sha('ev-'+k),
    ...(k==='review'?{completed_at:iso(NOW-7200e3)}:{})};
  return g;
}
function mk(phase,o={}){
  return R.buildApproval({phase,decisionId:o.decisionId||{stage:STAGE_ID,activate:ACT_ID,reverse:REV_ID}[phase],
    priorDecisionId:o.prior!==undefined?o.prior:(phase==='activate'?STAGE_ID:null),approvedBy:'Synthetic Owner',
    approvedAt:o.at||AT,plan,manifestSha256:MSHA,fingerprint:o.fp===undefined?FP:o.fp,
    gates:phase==='activate'?(o.gates===undefined?accepted():o.gates):undefined});
}
const edit=(a,f)=>{const b=structuredClone(a);f(b);return R.sealApproval(b);};
const inp=(a,o={})=>({manifestBytes,catalogBytes,approval:a,confirmDecisionId:a.decision_id,
  confirmApprovalSha256:a.approval_sha256,tk504Sql,auditSql,releaseGates:repoGates,now:NOW,...o});
const prep=(phase,a,o,trust)=>R.prepareRelease(phase,inp(a,o),trust);

// ---- 1. repo-staged guard definitions, self-checked against the TK603 pin
const D=R.repoFunctionDigests(tk504Sql,auditSql);
eq(D['public.tk504_protect_reserved_catalog_fk()'],R.TK603_RESERVED_GUARD_SHA256,'extraction reproduces the TK603 pin');
eq(Object.keys(D),R.GUARDED_FUNCTIONS.map(f=>f.sig));
ok(Object.values(D).every(x=>/^[0-9a-f]{64}$/.test(x))&&new Set(Object.values(D)).size===6,'6 distinct guard digests');
{const crlf=s=>s.replace(/\r\n/g,'\n').replace(/\n/g,'\r\n');
 eq(R.repoFunctionDigests(crlf(tk504Sql),crlf(auditSql)),D,'CRLF checkout gives the same digests');}
throwsCode(()=>R.repoFunctionDigests(tk504Sql.replace('Reserved catalog FK rows are admin-managed','drift'),auditSql),
  'REPO_GUARD_DIGEST_METHOD_MISMATCH');
throwsCode(()=>R.repoFunctionDigests(tk504Sql,''),'REPO_GUARD_DEFINITION_MISSING');

// ---- 2. why STAGE alone does NOT fix the runtime (offline model of the same predicates)
{
  const UA=S.UA,UB=S.UB,st={exercises:[],bindings:[],sessions:[
    {id:'s1',user_id:UA,exercise_id:'TK-000063',note:'legacy'},{id:'s2',user_id:UA,exercise_id:'TKC-000300',note:'typed'}]};
  for(const e of manifest.entries.slice(226)){
    st.exercises.push({id:e.exercise_id,scope:'global',active:false,created_by:null,user_id:null,gym_id:null});
    st.bindings.push({catalog_id:e.catalog_id,exercise_id:e.exercise_id,provider_id:e.provider_id,active:true,
      reviewed_at:'2026-11-07T00:00:00Z'});
  }
  [1,5,38,63,100,150,188,2,3,4,10,25,26,50,60,64,70,80,90,120,189,200,226].forEach((n,i)=>st.exercises.push({
    id:'TK-'+pad(n),scope:i<7?'global':'personal',active:true,created_by:i<7?null:(i%2?UB:UA),
    user_id:i<7?null:(i%2?UB:UA),gym_id:null}));
  const staged=T.simulateBatches(st,manifest,catalog,[1,2,3,4,5,6,7,8,9,10]).state;
  // tk504_resolve_catalog_fk and tk504_validate_typed_session_fk both require active AND reviewed_at.
  const live=b=>!!(b&&b.active===true&&b.reviewed_at!=null);
  const resolvable=s=>plan.entries.filter(e=>live(s.bindings.find(b=>b.catalog_id===e.catalog_id&&b.provider_id===e.provider_id))).length;
  const loggable=s=>plan.entries.filter(e=>live(s.bindings.find(b=>b.exercise_id===e.exercise_id))).length;
  eq(resolvable(st),0,'before: 0/226');
  eq([resolvable(staged),loggable(staged)],[0,0],'after STAGE: still 0/226 resolvable and 0/226 loggable -> runtime NOT fixed');
  const act=structuredClone(staged);
  for(const b of act.bindings)if(Number(b.catalog_id.slice(3))<=226&&!b.active&&b.reviewed_at==null){b.active=true;b.reviewed_at=AT;}
  eq([resolvable(act),loggable(act)],[226,226],'only the separate ACTIVATE makes the 226 resolvable/loggable');
  ok(act.exercises.filter(x=>/^TKC-\d{6}$/.test(x.id)&&Number(x.id.slice(4))<=226).every(x=>x.active===false),
    'technical exercise.active stays false');
  const rev=structuredClone(act);
  for(const b of rev.bindings)if(Number(b.catalog_id.slice(3))<=226){b.active=false;b.reviewed_at=null;}
  eq([resolvable(rev),loggable(rev)],[0,0],'REVERSE returns to the safe inactive state');
  eq(rev.sessions,st.sessions,'REVERSE never touches sessions');
  eq(rev.bindings.filter(b=>Number(b.catalog_id.slice(3))>226),st.bindings,'356 untouched by all phases');
}

// ---- 3. GREEN phase A (stage)
const aS=mk('stage');
const rS=prep('stage',aS),sqlS=rS.sql;
eq([rS.report.status,rS.report.phase,rS.report.phase_label,rS.report.database_writes_performed,rS.report.activation_executed],
  ['PRIVATE_ADMIN_SQL_RENDERED_NOT_EXECUTED','stage','A_STAGE',false,false]);
eq(rS.report.sql_sha256,sha(Buffer.from(sqlS,'utf8')));
eq([rS.report.all_sha256,rS.report.private_manifest_sha256,rS.report.expected_marker],[plan.all_sha256,MSHA,R.MARKERS.stage]);
eq(rS.report.scope,{first:'TK-000001',last:'TK-000226',count:226});
eq(prep('stage',structuredClone(aS)).sql,sqlS,'byte-identical re-render');
ok(sqlS.startsWith('-- TK614 #603 PRIVATE ADMIN RELEASE CANDIDATE -- PHASE A_STAGE\n'));
eq(count(sqlS,/^BEGIN ISOLATION LEVEL REPEATABLE READ;$/gm),1,'one transaction');
eq(count(sqlS,/^COMMIT;$/gm),1);
ok(!/\bROLLBACK\b/.test(sqlS),'release file commits; no silent rollback');
ok(sqlS.endsWith(`COMMIT;\nSELECT '${R.MARKERS.stage}' AS result;\n`));
ok(R.MARKERS.stage.includes('RUNTIME_NOT_YET_FIXED'));
const firstDo=sqlS.indexOf('DO $tk614$');
for(const l of ['LOCK TABLE public.tk614_admin_release_audit IN EXCLUSIVE MODE;',
  'LOCK TABLE public.movekit_catalog_fk_bindings IN EXCLUSIVE MODE;','LOCK TABLE public.exercises IN SHARE ROW EXCLUSIVE MODE;'])
  ok(sqlS.indexOf(l)>0&&sqlS.indexOf(l)<firstDo,'lock before first read: '+l);
ok(sqlS.includes("SET LOCAL search_path TO pg_catalog;\nSET LOCAL TimeZone TO 'UTC';"));
ok(sqlS.includes('pg_try_advisory_xact_lock(614226,603)'),'no second writer');
for(const g of ['TK614_REQUIRES_TRUSTED_POSTGRES_ADMIN','TK614_JWT_CONTEXT_FORBIDDEN','TK614_ISOLATION_REQUIRED',
  'TK614_SECOND_WRITER_ACTIVE','TK614_SERVER_VERSION_UNSUPPORTED','TK614_DECISION_ALREADY_USED','TK614_SCHEMA_REQUIRED',
  'TK614_RLS_NOT_ENABLED','TK614_GUARD_TRIGGER_MISSING_OR_DISABLED','TK614_GUARD_DEFINITION_DRIFT',
  'TK614_CLIENT_REGISTRY_PRIVILEGE','TK614_SERVER_VERSION_DRIFT','TK614_PRECONDITION_FINGERPRINT_DRIFT',
  'TK614_REGISTRY_SNAPSHOT_DRIFT','TK614_PLAN_TABLE_INVALID','TK614_RESERVED_ALIAS_WRONG_OWNER_OR_SCOPE',
  'TK614_EXISTING_356_CHANGED_OR_MISSING','TK614_STAGE_ALREADY_PRESENT','TK614_ORIGINAL_ALIAS_COLLISION',
  'TK614_PROVIDER_ALREADY_BOUND','TK614_LEGACY_TK_ROW_COUNT_CHANGED','TK614_PLAN_ALREADY_IN_AUDIT',
  'TK614_STAGE_NOT_226_INACTIVE_UNREVIEWED','TK614_CANONICAL_582_INCOMPLETE','TK614_EXISTING_356_MODIFIED_IN_TXN',
  'TK614_LEGACY_TK_ROWS_CHANGED','TK614_HISTORY_CHANGED','TK614_SCHEMA_OR_POLICY_CHANGED_IN_TXN',
  'TK614_RESOLVER_226_NOT_0','TK614_EXISTING_356_RESOLVER_CHANGED','TK614_PROBE_IDENTITY_NOT_RESET'])
  ok(sqlS.includes(g),'stage guard '+g);
ok(sqlS.indexOf('TK614_JWT_CONTEXT_FORBIDDEN')<sqlS.indexOf('INSERT INTO public.'),'context guard precedes every write');
for(const [sig,d] of Object.entries(D))ok(sqlS.includes(`('${sig}','${d}')`),'pinned guard body '+sig);
ok(sqlS.includes(`'${FP.precondition_sha256}'`)&&sqlS.includes(`'${FP.registry_snapshot_sha256}'`)&&
  sqlS.includes(`'${FP.server_version_num}'`),'approval-pinned live fingerprints');
ok(sqlS.includes(R.PRECONDITION_EXPR)&&sqlS.includes(R.REGISTRY_EXPR));
ok(sqlS.includes(aS.decision_id)&&sqlS.includes(aS.approval_sha256));
eq([...sqlS.matchAll(/^-- >>> TK614 ALL226 BATCH (\d\d)\/10 BEGIN/gm)].map(m=>Number(m[1])),[1,2,3,4,5,6,7,8,9,10]);
eq(count(sqlS,/SELECT catalog_id,exercise_id,provider_id,false,NULL/g),10,'bindings inserted inactive/unreviewed');
eq(count(sqlS,/'TK614 catalog FK reference '\|\|substring\(exercise_id from 5\),'system','strength','global',false,NULL,NULL,NULL/g),10,
  'technical aliases inserted global/inactive/unowned');
{const byId=new Map(catalog.catalog.map(c=>[c.catalog_id,c]));
 const rows=[...sqlS.matchAll(/^  \((\d+),(\d+),'(TK-\d{6})','(TKC-\d{6})','([a-z0-9-]+)'\)/gm)];
 eq(rows.length,226,'226 plan rows');
 ok(rows.every((m,i)=>Number(m[1])===i+1&&Number(m[2])===Math.ceil((i+1)/25)&&m[3]==='TK-'+pad(i+1)&&
   m[4]==='TKC-'+pad(i+1)&&m[5]===byId.get(m[3]).source.provider_id),'plan rows = public source identity');
 const exp=[...sqlS.matchAll(/^  \('(TK-\d{6})','(TKC-\d{6})','([a-z0-9-]+)'\)/gm)];
 eq(exp.length,356);ok(exp.every((m,i)=>m[1]==='TK-'+pad(227+i)&&m[3]===manifest.entries[226+i].provider_id));}
ok(!/\bUPDATE\b/i.test(scan(sqlS)),'stage never updates anything');
ok(!/active\s*=\s*true/i.test(scan(sqlS))&&!/SET\s+reviewed_at/i.test(sqlS),'stage never activates or reviews');
ok(!/movekit_media_grants/.test(sqlS),'no media grants');
ok(!/(INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+public\.sessions/i.test(sqlS),'no session writer');
ok(!/tk614_disposable_sandbox_marker/.test(sqlS),'release file is not the sandbox proof');

// ---- 4. RED approvals (stage)
const RED=(label,code,a,o)=>throwsCode(()=>prep('stage',a,o),code,label);
RED('schema','APPROVAL_SCHEMA_INVALID',edit(aS,a=>{a.schema='tk614-original226-owner-approval/0.9';}));
RED('reverse approval for stage','APPROVAL_PHASE_MISMATCH',mk('reverse'));
RED('extra allow flag','APPROVAL_SHAPE_INVALID',edit(aS,a=>{a.allow_activation=true;}));
RED('missing live','APPROVAL_SHAPE_INVALID',edit(aS,a=>{delete a.live;}));
RED('gates on stage','APPROVAL_SHAPE_INVALID',edit(aS,a=>{a.gates=accepted();}));
RED('activate decision on stage','DECISION_ID_INVALID',mk('stage',{decisionId:'TK614-OWNER-ACTIVATE-20261108-A1'}));
RED('lowercase decision','DECISION_ID_INVALID',mk('stage',{decisionId:'tk614-owner-stage-20261108-a1'}));
RED('injected decision','DECISION_ID_INVALID',mk('stage',{decisionId:"TK614-OWNER-STAGE-20261108-A1'--"}));
RED('prior on stage','PRIOR_DECISION_INVALID',mk('stage',{prior:ACT_ID}));
RED('empty approver','APPROVED_BY_INVALID',edit(aS,a=>{a.approved_by=' ';}));
RED('stale approval','APPROVAL_STALE_OR_FUTURE',mk('stage',{at:iso(NOW-15*24*3600e3)}));
RED('future approval','APPROVAL_STALE_OR_FUTURE',mk('stage',{at:iso(NOW+10*60e3)}));
RED('non ISO date','APPROVAL_STALE_OR_FUTURE',mk('stage',{at:'2026-11-08'}));
RED('scope missing 226','APPROVAL_SCOPE_MISMATCH',edit(aS,a=>{a.scope.catalog_ids.pop();}));
RED('scope reorder','APPROVAL_SCOPE_MISMATCH',edit(aS,a=>{const c=a.scope.catalog_ids;[c[0],c[1]]=[c[1],c[0]];}));
RED('scope includes 227','APPROVAL_SCOPE_MISMATCH',edit(aS,a=>{a.scope.catalog_ids.push('TK-000227');}));
RED('scope count','APPROVAL_SCOPE_MISMATCH',edit(aS,a=>{a.scope.count=225;}));
RED('scope ids digest','APPROVAL_SCOPE_MISMATCH',edit(aS,a=>{a.scope.catalog_ids_sha256='3'.repeat(64);}));
for(const k of ['mapping_sha256','source_catalog_sha256','all_sha256','private_manifest_sha256'])
  RED('source '+k,'APPROVAL_SOURCE_DIGEST_MISMATCH',edit(aS,a=>{a.sources[k]='4'.repeat(64);}));
RED('other manifest bytes','APPROVAL_SOURCE_DIGEST_MISMATCH',aS,{manifestBytes:Buffer.from(JSON.stringify(manifest,null,1),'utf8')});
RED('live precondition null','APPROVAL_LIVE_PRECONDITIONS_INVALID',edit(aS,a=>{a.live.precondition_sha256=null;}));
RED('live old server','APPROVAL_LIVE_PRECONDITIONS_INVALID',edit(aS,a=>{a.live.server_version_num='140009';}));
RED('live uppercase hex','APPROVAL_LIVE_PRECONDITIONS_INVALID',edit(aS,a=>{a.live.registry_snapshot_sha256='A'.repeat(64);}));
RED('unsealed edit','APPROVAL_DIGEST_MISMATCH',{...aS,approved_by:'Someone Else'});
RED('forged digest','APPROVAL_DIGEST_MISMATCH',{...aS,approval_sha256:'0'.repeat(64)});
RED('no confirmation','APPROVAL_CONFIRMATION_REQUIRED',aS,{confirmDecisionId:undefined});
RED('no digest confirmation','APPROVAL_CONFIRMATION_REQUIRED',aS,{confirmApprovalSha256:undefined});
RED('wrong decision confirmation','APPROVAL_CONFIRMATION_MISMATCH',aS,{confirmDecisionId:'TK614-OWNER-STAGE-20261108-A2'});
RED('wrong digest confirmation','APPROVAL_CONFIRMATION_MISMATCH',aS,{confirmApprovalSha256:'5'.repeat(64)});
throwsCode(()=>mk('stage',{fp:null}),'FINGERPRINT_INVALID','stage approval needs a live fingerprint');
{const m=structuredClone(manifest);m.entries[140].provider_id='x-forged';
 RED('tampered manifest','PROVISIONING_MAPPING_DIGEST_MISMATCH',aS,{manifestBytes:Buffer.from(JSON.stringify(m),'utf8')});}
RED('source catalog drift','SOURCE_CATALOG_SHA_MISMATCH',aS,{catalogBytes:Buffer.concat([catalogBytes,Buffer.from(' ')])});
RED('manifest not JSON','MANIFEST_NOT_JSON',aS,{manifestBytes:Buffer.from('{nope','utf8')});
RED('guard drift in repo','REPO_GUARD_DIGEST_METHOD_MISMATCH',aS,{tk504Sql:tk504Sql.replace('admin-managed','x')});

// ---- 5. phase B (activate): fail-closed by default, GREEN only with pinned key + release gate
ok(Object.isFrozen(R.TRUSTED_OWNER_KEY_SHA256)&&R.TRUSTED_OWNER_KEY_SHA256.length===1&&
  R.TRUSTED_OWNER_KEY_SHA256[0]===PUBLIC_PIN,'exactly one owner PUBLIC key fingerprint pinned');
eq(R.activationBlockers(repoGates),REPO_BLOCKERS,'public key pin is not a signed owner approval');
ok(!R.activationBlockers(repoGates).includes('ACTIVATION_BLOCKED_NO_PINNED_OWNER_KEY'),
  'owner public key pinned; independent signed approval still required');
eq(R.activationBlockers(GATES_OK,[KEY_SHA],SD),[]);
eq(R.activationBlockers(GATES_OK,[KEY_SHA]),['ACTIVATION_BLOCKED_ORIGINAL_226_NOT_IN_RELEASE_GATES'],
  'synthetic decision is never accepted against the committed sidecar');
eq(R.original226Released(repoGates),LICENSE_BOUND,'repo FK-only record valid only once the license hash is bound');
eq(R.mediaGateProblems(repoGates),[],'repo MEDIA gate intact: RELEASE_APPROVED, 15 batches 227..582, 1164 entries');
eq(R.original226Released(GATES_OK,SD),true);
// RED (unsafe media mixing): 001..226 inside MEDIA released_batches is rejected, in any shape.
const mix=extra=>({...GATES_OK,released_batches:[...GATES_OK.released_batches,...extra]});
for(const extra of [[{batch:16,from:'TK-000001',through:'TK-000226',count:226,display_sha256:'a1'.repeat(32)}],
  [{from:'TK-000001',through:'TK-000100'},{from:'TK-000101',through:'TK-000226'}],[{from:'TK-000226',through:'TK-000226'}]]){
  eq(R.original226Released(mix(extra),SD),false,'appended media batch '+extra[0].from+' rejected');
  ok(R.mediaGateProblems(mix(extra)).includes('MEDIA_RELEASED_BATCHES_NOT_EXACTLY_15'));
}
{const g=structuredClone(GATES_OK);g.released_batches[0]={...g.released_batches[0],from:'TK-000001'};
 ok(R.mediaGateProblems(g).includes('MEDIA_RELEASE_SCOPE_INCLUDES_ORIGINAL_226_OR_INVALID'),'replaced media batch 001.. rejected');
 eq(R.original226Released(g,SD),false);}
eq(R.original226Released({...GATES_OK,released_batches:[{from:'TK-000001',through:'TK-000226'}]},SD),false,
  'old model: 001..226 as the only media range is rejected');
{const g=structuredClone(GATES_OK);g.released_batches.pop();
 ok(R.mediaGateProblems(g).includes('MEDIA_RELEASED_BATCHES_NOT_EXACTLY_15'));eq(R.original226Released(g,SD),false,'14 media batches');}
{const g=structuredClone(GATES_OK);g.released_batches[3].display_sha256='b'.repeat(64);
 ok(R.mediaGateProblems(g).includes('MEDIA_LEDGER_356_INTEGRITY_FAILED'),'foreign media fingerprint');}
{const g=structuredClone(GATES_OK);g.entries.pop();
 ok(R.mediaGateProblems(g).includes('MEDIA_ENTRIES_NOT_1164'));eq(R.original226Released(g,SD),false,'media entry removed');}
{const g=structuredClone(GATES_OK);g.content_approval.decision_id='TK614-OWNER-REVIEW226-20261109-BULK01';
 ok(R.mediaGateProblems(g).includes('MEDIA_LEDGER_356_INTEGRITY_FAILED'),'FK decision cannot replace the 356 content approval');}
eq(R.original226Released({...GATES_OK,status:'BLOCKED_NOT_REVIEWED'},SD),false);
eq(R.original226Released(null,SD),false);
// RED for the pre-2026-11-09 behaviour: a bare coverage range (no owner record/evidence) used to pass.
eq(R.original226Released(GATES_COVERAGE_ONLY,SD),false,'coverage-only gate without owner record is rejected');
ok(R.original226ReleaseRecordProblems(GATES_COVERAGE_ONLY,SD).includes('RELEASE_RECORD_MISSING'));
eq(R.activationBlockers(GATES_COVERAGE_ONLY,[KEY_SHA],SD),['ACTIVATION_BLOCKED_ORIGINAL_226_NOT_IN_RELEASE_GATES']);
// RED: structurally valid record with generic/synthetic evidence digests is no proof.
{const g={...GATES_OK,[P.RECORD_KEY]:S.syntheticRelease226Record(P.repoReviewPacket())};
 eq(P.releaseRecordProblems(g[P.RECORD_KEY],P.repoReviewPacket()),[],'shape-valid');
 ok(R.original226ReleaseRecordProblems(g,SD).includes('RELEASE_RECORD_NOT_BOUND_TO_OWNER_DECISION'),'unbound evidence rejected');
 eq(R.original226Released(g,SD),false);}
const REPO_ACT_BLOCK=LICENSE_BOUND?'ACTIVATION_SIGNATURE_REQUIRED':'ACTIVATION_BLOCKED_ORIGINAL_226_NOT_IN_RELEASE_GATES';
const aA=mk('activate'),sA=R.signApproval(aA,KEYS.privateKey);
throwsCode(()=>prep('activate',aA),REPO_ACT_BLOCK,'repo gate/key blocks activation');
throwsCode(()=>prep('activate',sA),LICENSE_BOUND?'OWNER_KEY_NOT_TRUSTED':'ACTIVATION_BLOCKED_ORIGINAL_226_NOT_IN_RELEASE_GATES',
  'synthetic signing key is not the owner public key');
throwsCode(()=>prep('activate',sA,{releaseGates:GATES_OK},SD),'OWNER_KEY_NOT_TRUSTED',
  'public pin refuses a synthetic signer');
throwsCode(()=>prep('activate',sA,{releaseGates:GATES_OK}),'ACTIVATION_BLOCKED_ORIGINAL_226_NOT_IN_RELEASE_GATES',
  'synthetic gates without the library-only synthetic decision stay blocked');
throwsCode(()=>prep('activate',sA,{releaseGates:GATES_COVERAGE_ONLY},trustOK),'ACTIVATION_BLOCKED_ORIGINAL_226_NOT_IN_RELEASE_GATES',
  'coverage-only gate stays blocked even with a valid signature from a trusted key');
{const g=structuredClone(GATES_OK);g[P.RECORD_KEY].batches[9].status=P.PACKET_STATUS;
 throwsCode(()=>prep('activate',sA,{releaseGates:g},trustOK),'ACTIVATION_BLOCKED_ORIGINAL_226_NOT_IN_RELEASE_GATES',
  'partial owner approval (9/10 batches) blocks activation');}
{const g=structuredClone(GATES_OK);g[P.RECORD_KEY].media_grants=1;
 throwsCode(()=>prep('activate',sA,{releaseGates:g},trustOK),'ACTIVATION_BLOCKED_ORIGINAL_226_NOT_IN_RELEASE_GATES',
  'a release record that grants media is never accepted');}
throwsCode(()=>prep('activate',sA,{releaseGates:GATES_OK},{trustedOwnerKeySha256:['not-hex'],...SD}),'ACTIVATION_BLOCKED_NO_PINNED_OWNER_KEY');
throwsCode(()=>prep('activate',aA,{releaseGates:GATES_OK},trustOK),'ACTIVATION_SIGNATURE_REQUIRED');
throwsCode(()=>prep('activate',R.signApproval(aA,OTHER.privateKey),{releaseGates:GATES_OK},trustOK),'OWNER_KEY_NOT_TRUSTED');
{const b=structuredClone(sA),v=Buffer.from(b.signature.value_base64,'base64');v[0]^=1;b.signature.value_base64=v.toString('base64');
 throwsCode(()=>prep('activate',b,{releaseGates:GATES_OK},trustOK),'OWNER_SIGNATURE_INVALID','bit-flipped signature');}
{const other=R.signApproval(mk('activate',{decisionId:'TK614-OWNER-ACTIVATE-20261108-B2'}),KEYS.privateKey);
 throwsCode(()=>prep('activate',{...sA,signature:other.signature},{releaseGates:GATES_OK},trustOK),'OWNER_SIGNATURE_INVALID',
  'signature of another decision cannot be replayed');}
throwsCode(()=>R.signApproval({...aA,approved_by:'Tampered'},KEYS.privateKey),'APPROVAL_DIGEST_MISMATCH');
throwsCode(()=>prep('activate',mk('activate',{gates:R.pendingGates()})),'ACTIVATION_GATE_NOT_ACCEPTED','template gates are PENDING');
for(const k of R.ACTIVATION_GATES){
  const g=accepted();g[k].status='REJECTED';
  throwsCode(()=>prep('activate',mk('activate',{gates:g})),'ACTIVATION_GATE_NOT_ACCEPTED','gate '+k);
}
{const g=accepted();g.license.evidence_sha256='nope';throwsCode(()=>prep('activate',mk('activate',{gates:g})),'ACTIVATION_GATE_EVIDENCE_INVALID');}
{const g=accepted();g.rollback.accepted_by=null;throwsCode(()=>prep('activate',mk('activate',{gates:g})),'ACTIVATION_GATE_EVIDENCE_INVALID');}
{const g=accepted();delete g.ab_acceptance;throwsCode(()=>prep('activate',mk('activate',{gates:g})),'APPROVAL_SHAPE_INVALID');}
{const g=accepted();g.review.completed_at=iso(NOW);throwsCode(()=>prep('activate',mk('activate',{gates:g})),'REVIEW_TIMESTAMP_INVALID');}
throwsCode(()=>prep('activate',mk('activate',{prior:null})),'PRIOR_DECISION_INVALID','activation must name its prior decision');
throwsCode(()=>prep('activate',mk('activate',{prior:'TK614-OWNER-ACTIVATE-20261108-B0'})),'PRIOR_DECISION_INVALID');
throwsCode(()=>prep('activate',mk('activate',{prior:ACT_ID})),'PRIOR_DECISION_INVALID','self prior');
throwsCode(()=>mk('activate',{fp:null}),'FINGERPRINT_INVALID');
throwsCode(()=>prep('activate',aS,{releaseGates:GATES_OK},trustOK),'APPROVAL_PHASE_MISMATCH','stage approval never activates');
throwsCode(()=>prep('stage',sA),'APPROVAL_PHASE_MISMATCH');
{const saved={...process.env};
 process.env.TK614_ALLOW_ACTIVATION='true';process.env.TK614_FORCE='1';process.env.ALLOW_ACTIVATION='true';
 try{throwsCode(()=>prep('activate',sA,{releaseGates:GATES_OK},SD),'OWNER_KEY_NOT_TRUSTED',
   'env flags cannot bypass the pinned owner public key');}
 finally{for(const k of ['TK614_ALLOW_ACTIVATION','TK614_FORCE','ALLOW_ACTIVATION'])if(!(k in saved))delete process.env[k];}}
ok(!/process\.env/.test(read('tools/tk614_original226_admin_release.cjs')),'generator never reads environment variables');
const rA=prep('activate',sA,{releaseGates:GATES_OK},trustOK),sqlA=rA.sql;
eq([rA.report.phase_label,rA.report.prior_decision_id,rA.report.activation_executed,rA.report.database_writes_performed],
  ['B_ACTIVATE',STAGE_ID,false,false]);
ok(sqlA.startsWith('-- TK614 #603 PRIVATE ADMIN RELEASE CANDIDATE -- PHASE B_ACTIVATE\n'));
eq([count(sqlA,/^BEGIN ISOLATION LEVEL REPEATABLE READ;$/gm),count(sqlA,/^COMMIT;$/gm)],[1,1]);
ok(!/\bROLLBACK\b/.test(sqlA)&&sqlA.endsWith(`COMMIT;\nSELECT '${R.MARKERS.activate}' AS result;\n`));
eq([...scan(sqlA).matchAll(/\bUPDATE\s+([\w.]+)/gi)].map(m=>m[1]),['public.movekit_catalog_fk_bindings'],'exactly one UPDATE');
ok(sqlA.includes(`SET reviewed_at='${sA.gates.review.completed_at}'::timestamptz, active=true`),'reviewed_at = owner review time');
ok(sqlA.includes('AND b.active=false AND b.reviewed_at IS NULL;'),'only inactive/unreviewed rows can flip');
ok(!/INSERT INTO public\.(exercises|movekit_catalog_fk_bindings)\b/.test(sqlA),'activation inserts nothing');
ok(!/UPDATE public\.exercises/i.test(sqlA),'technical exercise.active never touched');
for(const g of ['TK614_PRIOR_DECISION_NOT_FOUND','TK614_PRIOR_DECISION_NOT_LATEST','TK614_APPROVAL_NOT_BOUND_TO_PRIOR_STATE',
  'TK614_ACTIVATE_IN_SAME_SESSION_AS_PRIOR_PHASE','TK614_REVIEW_TIMESTAMP_IN_FUTURE','TK614_CROSS_PROVIDER_DRIFT',
  'TK614_PARTIAL_OR_MISSING_STAGE','TK614_ALREADY_ACTIVE_OR_REVIEWED','TK614_ACTIVATION_ROW_COUNT_',
  'TK614_ACTIVATION_NOT_226_ACTIVE_REVIEWED','TK614_TECHNICAL_ALIAS_ACTIVATED','TK614_TECHNICAL_ALIASES_CHANGED',
  'TK614_RESOLVER_226_NOT_226','TK614_RESOLVER_ACCEPTS_WRONG_SLUG','TK614_EXISTING_356_RESOLVER_CHANGED',
  'TK614_JWT_CONTEXT_FORBIDDEN','TK614_REGISTRY_SNAPSHOT_DRIFT','TK614_PRECONDITION_FINGERPRINT_DRIFT',
  'TK614_HISTORY_CHANGED','TK614_SCHEMA_OR_POLICY_CHANGED_IN_TXN'])ok(sqlA.includes(g),'activate guard '+g);
ok(sqlA.includes(`decision_id='${STAGE_ID}' AND phase IN ('stage','reverse')`),'bound to the committed stage decision');
ok(sqlA.indexOf('TK614_APPROVAL_NOT_BOUND_TO_PRIOR_STATE')<sqlA.indexOf('UPDATE public.'),'chain checked before the flip');
ok(!/movekit_media_grants/.test(sqlA)&&!/(INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+public\.sessions/i.test(sqlA));
ok(prep('activate',R.signApproval(mk('activate',{prior:REV_ID}),KEYS.privateKey),{releaseGates:GATES_OK},trustOK)
  .sql.includes(`decision_id='${REV_ID}'`),'re-activation after a reverse names the reverse decision');
ok(sqlS!==sqlA&&!sqlS.includes('SET reviewed_at'),'STAGE and ACTIVATE are separate files');

// ---- 6. phase C (reverse)
const aR=mk('reverse',{fp:null}),rR=prep('reverse',aR),sqlR=rR.sql;
eq(aR.live,{precondition_sha256:null,registry_snapshot_sha256:null,server_version_num:null});
ok(sqlR.startsWith('-- TK614 #603 PRIVATE ADMIN RELEASE CANDIDATE -- PHASE C_REVERSE\n'));
ok(sqlR.endsWith(`COMMIT;\nSELECT '${R.MARKERS.reverse}' AS result;\n`)&&!/\bROLLBACK\b/.test(sqlR));
eq([...scan(sqlR).matchAll(/\bUPDATE\s+([\w.]+)/gi)].map(m=>m[1]),['public.movekit_catalog_fk_bindings']);
ok(sqlR.includes('UPDATE public.movekit_catalog_fk_bindings b SET active=false, reviewed_at=NULL\n  FROM tk614_plan_226 p'));
ok(sqlR.includes('(b.active OR b.reviewed_at IS NOT NULL);'),'idempotent: only still-released rows change');
ok(!/\bDELETE\b/i.test(scan(sqlR)),'never deletes');
ok(!/INSERT INTO public\.(exercises|movekit_catalog_fk_bindings)\b/.test(sqlR)&&!/(INSERT\s+INTO|UPDATE)\s+public\.(sessions|exercises)/i.test(sqlR));
ok(!sqlR.includes('TK614_REGISTRY_SNAPSHOT_DRIFT')&&!sqlR.includes('TK614_PRECONDITION_FINGERPRINT_DRIFT'),
  'emergency reverse is not blocked by later registry/schema drift');
for(const g of ['TK614_JWT_CONTEXT_FORBIDDEN','TK614_SECOND_WRITER_ACTIVE','TK614_DECISION_ALREADY_USED',
  'TK614_GUARD_TRIGGER_MISSING_OR_DISABLED','TK614_REVERSE_INCOMPLETE','TK614_HISTORY_CHANGED',
  'TK614_TECHNICAL_ALIASES_CHANGED','TK614_EXISTING_356_MODIFIED_IN_TXN','TK614_LEGACY_TK_ROWS_CHANGED','TK614_RESOLVER_226_NOT_0'])
  ok(sqlR.includes(g),'reverse guard '+g);
ok(sqlR.includes(',b.released_226\nFROM tk614_before b;'),'audit records the real number of changed rows (0..226)');
ok(!sqlR.includes('TK614_PRIOR_DECISION_NOT_FOUND'));
{const s2=prep('reverse',mk('reverse',{prior:ACT_ID,fp:null})).sql;
 ok(s2.includes('TK614_PRIOR_DECISION_NOT_FOUND')&&s2.includes(`decision_id='${ACT_ID}'`));}
ok(prep('reverse',mk('reverse')).sql.length>0,'reverse also accepts a full fingerprint');
throwsCode(()=>prep('reverse',edit(aR,a=>{a.live.registry_snapshot_sha256='6'.repeat(64);})),'APPROVAL_LIVE_PRECONDITIONS_INVALID');
throwsCode(()=>prep('reverse',mk('reverse',{prior:REV_ID,fp:null})),'PRIOR_DECISION_INVALID','self prior');
throwsCode(()=>prep('reverse',edit(aR,a=>{a.signature=null;})),'APPROVAL_SHAPE_INVALID');

// ---- 7. static release-SQL contract (tamper RED)
eq(R.guardPhaseSql('stage',sqlS,aS),sqlS);eq(R.guardPhaseSql('activate',sqlA,sA),sqlA);eq(R.guardPhaseSql('reverse',sqlR,aR),sqlR);
const V=(phase,sql,label)=>throwsCode(()=>R.guardPhaseSql(phase,sql),'RELEASE_SQL_CONTRACT_VIOLATION',label);
const pre=(sql,ins)=>sql.replace('\nCOMMIT;\n','\n'+ins+'\nCOMMIT;\n');
V('stage',pre(sqlS,'DELETE FROM public.sessions;'),'delete sessions');
V('stage',pre(sqlS,"INSERT INTO public.sessions(date,exercise_id) VALUES (now(),'TKC-000001');"),'second session writer');
V('stage',pre(sqlS,'UPDATE public.movekit_catalog_fk_bindings SET active=true;'),'stage coupled with activation');
V('stage',pre(sqlS,'UPDATE public.exercises SET active=true;'),'exercise activation');
V('stage',pre(sqlS,'GRANT SELECT ON public.movekit_catalog_fk_bindings TO authenticated;'),'grant');
V('stage',pre(sqlS,'ALTER TABLE public.exercises DISABLE TRIGGER tk504_reserved_catalog_fk_guard;'),'guard disable');
V('stage',pre(sqlS,'CREATE POLICY x ON public.sessions USING (true);'),'policy change');
V('stage',pre(sqlS,'SET ROLE service_role;'),'role switch');
V('stage',pre(sqlS,'INSERT INTO public.movekit_media_grants VALUES (1);'),'media grant');
V('stage',pre(sqlS,'COMMIT;\nBEGIN;'),'second transaction');
V('stage',sqlS.replace('\nCOMMIT;\n','\nROLLBACK;\n'),'rollback instead of commit');
V('stage',sqlS.replace('LOCK TABLE public.exercises IN SHARE ROW EXCLUSIVE MODE;\n',''),'missing lock');
V('stage',sqlS.replace(R.MARKERS.stage,'OK'),'marker');
V('activate',pre(sqlA,'UPDATE public.movekit_catalog_fk_bindings SET active=true;'),'second update');
V('reverse',pre(sqlR,"UPDATE public.movekit_catalog_fk_bindings SET active=true WHERE catalog_id='TK-000300';"),'reverse touching 356');
V('reverse',pre(sqlR,"DELETE FROM public.exercises WHERE id='TKC-000001';"),'reverse delete');
V('activate',sqlS,'a stage file is not an activation file');V('stage',sqlA,'an activation file is not a stage file');
V('reverse',sqlA,'an activation file is not a reverse file');
throwsCode(()=>R.guardPhaseSql('stage',sqlS,{...aS,decision_id:'TK614-OWNER-STAGE-20261108-ZZ'}),'RELEASE_SQL_CONTRACT_VIOLATION');

// ---- 8. read-only fingerprint file; identical fingerprint expressions in every phase
const F=R.renderFingerprintSql();
ok(F.includes('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;')&&F.endsWith('ROLLBACK;\n'));
ok(!/\b(INSERT|UPDATE|DELETE|GRANT|REVOKE|ALTER|DROP|TRUNCATE|COMMIT|CREATE|LOCK)\b/i.test(scan(F)),'fingerprint writes nothing');
ok(F.includes(R.PRECONDITION_EXPR)&&F.includes(R.REGISTRY_EXPR));
for(const s of [F,sqlS,sqlA,sqlR])ok(s.includes("SET LOCAL search_path TO pg_catalog;\nSET LOCAL TimeZone TO 'UTC';"),
  'same search_path/TimeZone => byte-identical fingerprints');
for(const k of ['pg_policy','pg_trigger','relrowsecurity','relacl','proacl','prosrc','server_version_num',
  'pg_get_constraintdef','format_type','pg_get_expr'])ok(R.PRECONDITION_EXPR.includes(k),'precondition covers '+k);
for(const t of ['public.exercises','public.sessions','public.movekit_catalog_fk_bindings','public.tk614_admin_release_audit'])
  ok(R.PRECONDITION_EXPR.includes(`'${t}'`),'precondition table '+t);
for(const f of ['set_exercise_scope_context','set_user_id_from_auth','tk504_validate_typed_session_fk','tk504_resolve_catalog_fk',
  'tk614_protect_admin_release_audit'])ok(R.PRECONDITION_EXPR.includes(`'${f}'`),'precondition function '+f);
ok(R.PRECONDITION_EXPR.includes("n.nspname='auth' AND p.proname='uid'"),'auth.uid() definition pinned');
ok(R.REGISTRY_EXPR.includes('public.movekit_catalog_fk_bindings')&&R.REGISTRY_EXPR.includes("'^TKC-[0-9]{6}$'")&&
  R.REGISTRY_EXPR.includes("'^TK-[0-9]{6}$'")&&!R.REGISTRY_EXPR.includes('public.sessions'));
eq(R.parseFingerprintOutput('BEGIN\n'+JSON.stringify(FP)+'\nROLLBACK\n'),FP);
throwsCode(()=>R.parseFingerprintOutput('nothing'),'FINGERPRINT_INVALID');
throwsCode(()=>R.parseFingerprintOutput(JSON.stringify({...FP,precondition_sha256:'x'})),'FINGERPRINT_INVALID');
throwsCode(()=>R.parseFingerprintOutput(JSON.stringify({...FP,server_version_num:'140000'})),'FINGERPRINT_INVALID');
throwsCode(()=>R.validateFingerprint({...FP,extra:1}),'FINGERPRINT_INVALID');

// ---- 9. audit migration (staged, append-only, no client access)
{const a=auditSql.replace(/\r\n/g,'\n').toLowerCase(),code=a.replace(/--[^\n]*/g,'');
 ok(a.includes('decision_id text not null unique'),'decision replay impossible');
 ok(a.includes('alter table public.tk614_admin_release_audit enable row level security;'));
 ok(a.includes('revoke all on table public.tk614_admin_release_audit\n  from public, anon, authenticated, service_role;'));
 ok(!/\bgrant\b/.test(code)&&!/create policy/.test(code),'no grant and no policy');
 ok(a.includes("if tg_op <> 'insert' then")&&a.includes('before truncate on public.tk614_admin_release_audit'),'append-only');
 ok(a.includes("session_user <> 'postgres' or current_user <> 'postgres' or auth.uid() is not null"),'trusted admin only');
 ok(a.includes('check (rows_changed between 0 and 226)')&&a.includes("(phase = 'activate' and prior_decision_id is not null)"));
 ok(!/(insert\s+into|update|delete\s+from)\s+public\.(exercises|sessions|movekit_catalog_fk_bindings)\b/.test(code),'no data change');}

// ---- 10. CLI: private-or-nothing, no bypass flag, activation BLOCKED
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'tk614-admin-release-'));
try{
  const logs=[],io={stdout:x=>{logs.push(String(x));}};
  const mf=path.join(tmp,'manifest.json');fs.writeFileSync(mf,manifestBytes);
  const fpFile=path.join(tmp,'fingerprint.json');fs.writeFileSync(fpFile,JSON.stringify(FP));
  const fOut=path.join(tmp,'fingerprint.sql');
  eq(R.run(['fingerprint','--out',fOut],io).database_writes_performed,false);
  eq(fs.readFileSync(fOut,'utf8'),F);
  const draft=path.join(tmp,'stage-approval.json');
  const r2=R.run(['approval-template','--phase','stage','--manifest',mf,'--fingerprint',fpFile,'--decision-id',STAGE_ID,
    '--approved-by','Synthetic Owner','--out',draft],io);
  eq(r2.status,'UNSIGNED_APPROVAL_DRAFT_WRITTEN_AUTHORISES_NOTHING');
  const dj=JSON.parse(fs.readFileSync(draft,'utf8'));
  eq([dj.approval_sha256,R.approvalDigest(dj),dj.live.registry_snapshot_sha256],[r2.approval_sha256,r2.approval_sha256,FP.registry_snapshot_sha256]);
  const sOut=path.join(tmp,'phase-a.sql');
  const renderArgs=(phase,approvalFile,id,digest,out)=>['render','--phase',phase,'--manifest',mf,'--approval',approvalFile,
    '--confirm-decision-id',id,'--confirm-approval-sha256',digest,'--out',out];
  const r3=R.run(renderArgs('stage',draft,STAGE_ID,dj.approval_sha256,sOut),io);
  eq([r3.private_sql_created,r3.phase,r3.sql_sha256],[true,'stage',sha(fs.readFileSync(sOut))]);
  ok(fs.readFileSync(sOut,'utf8').startsWith('-- TK614 #603 PRIVATE ADMIN RELEASE CANDIDATE -- PHASE A_STAGE\n'));
  if(process.platform!=='win32')eq(fs.statSync(sOut).mode&0o777,0o600,'private 0600');
  throwsCode(()=>R.run(renderArgs('stage',draft,STAGE_ID,dj.approval_sha256,sOut),io),'EEXIST_PRIVATE_OUTPUT');
  const bad=path.join(tmp,'must-not-exist.sql');
  throwsCode(()=>R.run(renderArgs('stage',draft,STAGE_ID,'0'.repeat(64),bad),io),'APPROVAL_CONFIRMATION_MISMATCH');
  throwsCode(()=>R.run(renderArgs('stage',draft,'TK614-OWNER-STAGE-20261108-XX',dj.approval_sha256,bad),io),'APPROVAL_CONFIRMATION_MISMATCH');
  const actFile=path.join(tmp,'activate-signed.json');fs.writeFileSync(actFile,JSON.stringify(sA));
  throwsCode(()=>R.run(renderArgs('activate',actFile,ACT_ID,sA.approval_sha256,bad),io),
    LICENSE_BOUND?'OWNER_KEY_NOT_TRUSTED':'ACTIVATION_BLOCKED_ORIGINAL_226_NOT_IN_RELEASE_GATES',
    'CLI rejects an untrusted synthetic signer even with accepted gates');
  for(const extra of [['--allow-activation','true'],['--force','1'],['--trusted-key',KEY_SHA],['--release-gates',fpFile],
    ['--expected-mapping-sha','a'.repeat(64)],['--now','0']])
    throwsCode(()=>R.run([...renderArgs('activate',actFile,ACT_ID,sA.approval_sha256,bad),...extra],io),'USAGE','flag '+extra[0]);
  ok(!fs.existsSync(bad),'nothing written on any failure');
  const rdraft=path.join(tmp,'reverse-approval.json');
  R.run(['approval-template','--phase','reverse','--manifest',mf,'--decision-id',REV_ID,'--approved-by','Synthetic Owner','--out',rdraft],io);
  const rj=JSON.parse(fs.readFileSync(rdraft,'utf8'));
  eq(rj.live,{precondition_sha256:null,registry_snapshot_sha256:null,server_version_num:null});
  const rOut=path.join(tmp,'phase-c.sql');
  R.run(renderArgs('reverse',rdraft,REV_ID,rj.approval_sha256,rOut),io);
  ok(fs.readFileSync(rOut,'utf8').includes('SET active=false, reviewed_at=NULL'));
  throwsCode(()=>R.run(['approval-template','--phase','stage','--manifest',mf,'--decision-id',STAGE_ID,'--approved-by','Synthetic Owner',
    '--out',path.join(tmp,'nofp.json')],io),'FINGERPRINT_REQUIRED');
  const adraft=path.join(tmp,'activate-draft.json');
  R.run(['approval-template','--phase','activate','--manifest',mf,'--fingerprint',fpFile,'--decision-id',ACT_ID,
    '--prior-decision-id',STAGE_ID,'--approved-by','Synthetic Owner','--out',adraft],io);
  const aj=JSON.parse(fs.readFileSync(adraft,'utf8'));
  eq([aj.gates.license.status,aj.signature,aj.prior_decision_id],['PENDING',null,STAGE_ID]);
  aj.gates=accepted();const edited=path.join(tmp,'activate-edited.json');fs.writeFileSync(edited,JSON.stringify(aj));
  const sealed=path.join(tmp,'activate-sealed.json');
  const r5=R.run(['seal','--approval',edited,'--out',sealed],io);
  const sj=JSON.parse(fs.readFileSync(sealed,'utf8'));
  eq([sj.approval_sha256,r5.approval_sha256],[R.approvalDigest(sj),R.approvalDigest(sj)]);
  ok(sj.approval_sha256!==aj.approval_sha256&&sj.signature===null,'seal recomputes digest and clears any signature');
  const st=R.run(['status','--manifest',mf],io);
  eq([st.stage,st.activate,st.reverse,st.database_writes_performed],['RENDERABLE_WITH_DBA_APPROVED_OWNER_DECISION_AND_LIVE_FINGERPRINT',
    LICENSE_BOUND?'RENDERABLE_WITH_SIGNED_OWNER_DECISION':'BLOCKED',
    'RENDERABLE_WITH_DBA_APPROVED_OWNER_DECISION',false]);
  eq(st.activation_blockers,REPO_BLOCKERS);
  eq(st.original_226_fk_release_problems,LICENSE_BOUND?[]:
    ['OWNER_DECISION_LICENSE_EVIDENCE_PENDING','RELEASE_RECORD_EVIDENCE_MISSING_OR_INVALID'],'status reports the FK-only record state');
  throwsCode(()=>R.run(['activate-now'],io),'USAGE');
  throwsCode(()=>R.run(renderArgs('publish',actFile,ACT_ID,sA.approval_sha256,path.join(tmp,'p.sql')),io),'PHASE_INVALID');
  throwsCode(()=>R.run(['fingerprint','--out','relative.sql'],io),'PATH_MUST_BE_ABSOLUTE');
  throwsCode(()=>R.run(['fingerprint','--out',path.join(__dirname,'tk614-NO-fingerprint.sql')],io),'PRIVATE_OUTPUT_INSIDE_REPOSITORY');
  ok(!fs.existsSync(path.join(__dirname,'tk614-NO-fingerprint.sql')));
  throwsCode(()=>R.run(['status','--manifest',path.join(ROOT,'exercise-catalog.json')],io),'PRIVATE_INPUT_INSIDE_REPOSITORY');
  ok(logs.length>=8&&logs.every(l=>manifest.entries.every(e=>!l.includes(e.provider_id))),'stdout has zero provider slugs');
}finally{fs.rmSync(tmp,{recursive:true,force:true});}

// ---- 11. disposable Docker smoke: pure parts (Docker itself is not run here)
throwsCode(()=>S.parseArgs(['--manifest','rel.json','--out-dir','rel']),'PATHS_MUST_BE_ABSOLUTE');
throwsCode(()=>S.parseArgs(['--manifest',path.join(os.tmpdir(),'m.json'),'--out-dir',os.tmpdir(),'--commit','1']),'USAGE');
throwsCode(()=>S.run(['--manifest',path.join(os.tmpdir(),'m.json'),'--out-dir',path.join(__dirname,'tk614-NO-smoke')]),
  'PRIVATE_OUTPUT_INSIDE_REPOSITORY');
ok(!fs.existsSync(path.join(__dirname,'tk614-NO-smoke')));
{const setup=S.buildSetupSql(manifest.entries);
 for(const f of ['tk504-typed-fk-stage.sql','tk603-scope-stage.sql','tk614-audit-stage.sql'])ok(setup.includes('\\i /tmp/'+f));
 ok(setup.indexOf('set session_replication_role = replica;')<setup.indexOf('set session_replication_role = origin;'),
   'replica seeding is closed again');
 ok(/create policy "eigen_data_alleen" on public\."sessions"/i.test(setup),'captured RLS policies replayed');
 eq([count(setup,/SYNTHETIC LEGACY GLOBAL/g),count(setup,/SYNTHETIC LEGACY PERSONAL/g),count(setup,/SYNTHETIC REVIEWED ALIAS/g)],[7,16,356]);
 const bd=[...setup.matchAll(/^\('(TK-\d{6})','(TKC-\d{6})','([a-z0-9-]+)',true,/gm)];
 ok(bd.length===356&&bd.every(m=>Number(m[1].slice(3))>226),'only the 356 are pre-seeded');}
for(const kind of ['after_stage','after_activate','cross_owner','after_reverse'])for(const u of [S.UA,S.UB]){
  const p=S.buildProbeSql(kind,u,manifest.entries);
  ok(p.includes('SET LOCAL ROLE authenticated')&&p.includes(`set_config('request.jwt.claim.sub','${u}',true)`)&&
    p.trim().endsWith('ROLLBACK;'),kind+' probe runs as simulated owner and rolls back');
}
ok(S.buildProbeSql('after_stage',S.UA,manifest.entries).includes('PROBE_226_RESOLVABLE_BEFORE_ACTIVATION'));
{const p=S.buildProbeSql('after_activate',S.UB,manifest.entries);
 for(const g of ['PROBE_226_NOT_RESOLVABLE_AFTER_ACTIVATION','PROBE_WRONG_SLUG_RESOLVED','PROBE_FORGED_SLUG_RESOLVED',
   'PROBE_PERSONAL_SHADOW_ACCEPTED','PROBE_TECHNICAL_ALIAS_ACTIVATED'])ok(p.includes(g));}
ok(S.buildProbeSql('after_reverse',S.UA,manifest.entries).includes('PROBE_HISTORY_LOST_AFTER_REVERSE'));
throwsCode(()=>S.buildProbeSql('write_typed_A',S.UB,manifest.entries),'PROBE_KIND_INVALID');
throwsCode(()=>S.buildProbeSql('production',S.UA,manifest.entries),'PROBE_KIND_INVALID');
{const fin=S.buildFinalSql(manifest.entries);
 ok(fin.includes("'stage:226,activate:226,reverse:226,reverse:0'")&&fin.includes('FINAL_AUDIT_UPDATE_ACCEPTED')&&
   fin.includes('FINAL_HISTORICAL_SESSIONS_CHANGED')&&fin.includes('FINAL_EXISTING_356_CHANGED'));}
eq(S.judge({marker:'M'},0,'x M',''),true);eq(S.judge({marker:'M'},0,'x',''),false);
eq(S.judge({marker:'M'},0,'M','ERROR: y'),false);
eq(S.judge({error:'TK614_X'},3,'','psql:f:1: ERROR:  TK614_X'),true);
eq(S.judge({error:'TK614_X'},0,'',''),false,'a negative must really fail');
eq(S.judge({error:'TK614_X'},3,R.MARKERS.stage,'ERROR:  TK614_X'),false,'a committed phase marker is never a negative pass');
ok(R.original226Released(S.SYNTHETIC_RELEASE_GATES,SD)&&S.SYNTHETIC_RELEASE_GATES._synthetic_smoke_only===true);
ok(!R.original226Released(S.SYNTHETIC_RELEASE_GATES),'smoke gates need the library-only synthetic decision');
eq(S.SYNTHETIC_RELEASE_GATES.released_batches,repoGates.released_batches,'smoke keeps the real 15 media batches');
eq(S.SYNTHETIC_RELEASE_GATES.entries.length,1164);
{const src=read('tools/tk614_admin_release_docker_smoke.cjs');
 ok(src.includes("'--pull','never'")&&src.includes("'--network','none'")&&src.includes("['rm','-f',name]"),'disposable, offline, removed');
 ok(!/process\.env/.test(src),'smoke never reads environment variables');}

console.log('TK614 original-226 admin release candidate: '+checks+
  ' assertions PASS; phases A/B/C guarded, owner public pin accepted; real activation still requires a separately signed B decision');
