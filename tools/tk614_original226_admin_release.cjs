'use strict';
/**
 * TK614 / #603 -- FAIL-CLOSED ADMIN RELEASE CANDIDATE for the ORIGINAL 226
 * MoveKit bindings (TK-000001..TK-000226 -> TKC-000001..TKC-000226).
 *
 * Generates PRIVATE psql files (outside Git, exclusive create, 0600) for three
 * strictly separated, DBA-executed phases. It never connects to a database,
 * never uses the network and never executes anything itself.
 *
 *   fingerprint  READ-ONLY live precondition/registry fingerprint (BEGIN READ ONLY .. ROLLBACK)
 *   A stage      226 technical aliases + bindings, INACTIVE + UNREVIEWED, no media,
 *                one audited BEGIN/COMMIT transaction.
 *   B activate   reviewed_at + binding.active=true for exactly 226 (technical
 *                exercise.active stays false), separate transaction, bound to the
 *                committed stage decision + its registry snapshot.
 *   C reverse    binding.active=false + reviewed_at=NULL for the 226 only. No
 *                session/alias delete. Idempotent (0..226 rows).
 *
 * Every phase requires a separate private OWNER APPROVAL artefact whose digest
 * covers decision ID, the 226 scope IDs, source digests and (A/B) the live
 * precondition + registry snapshot fingerprints. The DBA must re-type the
 * decision ID and the approval digest on the command line (two channels).
 * ACTIVATION additionally needs an Ed25519 owner signature from a key pinned in
 * TRUSTED_OWNER_KEY_SHA256 (empty = BLOCKED) AND the existing public release
 * gate (docs/generated/MOVEKIT_V2_RELEASE_GATES.json) must cover 001..226.
 * There is no environment variable or CLI flag that can bypass either.
 *
 * planAll / verifyAllPlan / renderBatchBlock are reused unchanged from
 * tools/tk614_original226_batch25_preflight.cjs.
 */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {safelyOutsideRepo}=require('./tk504_prepare_private_fk_manifest.cjs');
const T=require('./tk614_original226_batch25_preflight.cjs');

const ROOT=path.resolve(__dirname,'..');
const ORIGINAL=226,TOTAL=582,EXISTING=TOTAL-ORIGINAL,LEGACY_TK_ROWS=23;
const SCHEMA_APPROVAL='tk614-original226-owner-approval/1.0';
const SCHEMA_REPORT='tk614-original226-admin-release/1.0';
const FINGERPRINT_KIND='tk614-live-fingerprint/1.0';
const PHASES=Object.freeze(['stage','activate','reverse']);
const PHASE_LABEL=Object.freeze({stage:'A_STAGE',activate:'B_ACTIVATE',reverse:'C_REVERSE'});
const MARKERS=Object.freeze({
  stage:'TK614_PHASE_A_STAGE_COMMITTED_226_INACTIVE_UNREVIEWED_RUNTIME_NOT_YET_FIXED',
  activate:'TK614_PHASE_B_ACTIVATE_COMMITTED_226_REVIEWED_ACTIVE_TECHNICAL_ALIASES_INACTIVE',
  reverse:'TK614_PHASE_C_REVERSE_COMMITTED_226_INACTIVE_UNREVIEWED_HISTORY_INTACT'});
const DECISION_RE=/^TK614-OWNER-(STAGE|ACTIVATE|REVERSE)-[0-9]{8}-[A-Z0-9]{2,32}$/;
const HEX64=/^[0-9a-f]{64}$/;
const ISO_Z=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
const MAX_APPROVAL_AGE_MS=14*24*3600*1000,MAX_CLOCK_SKEW_MS=5*60*1000;
const MIN_SERVER_VERSION_NUM=150000;
const ADVISORY_KEY='614226,603';
// Owner Ed25519 public keys (sha256 of SPKI DER) trusted to sign ACTIVATION.
// Intentionally EMPTY: only a separately reviewed commit may add a key.
// Empty list => activation rendering is BLOCKED (fail closed).
const TRUSTED_OWNER_KEY_SHA256=Object.freeze([]);
const ACTIVATION_GATES=Object.freeze(['source','owner','review','license','rollback','ab_acceptance']);
// prosrc digest of tk504_protect_reserved_catalog_fk pinned independently by
// the TK603 staged migration; used to self-check the repo extraction method.
const TK603_RESERVED_GUARD_SHA256='485486db293fa2f17c0d2718e3287fa8c0c6ebde9485341c991a2f132f56d92b';
const TK504_STAGE_FILE=path.join(ROOT,'supabase','migrations','20261106110000_tk504_typed_catalog_fk_stage.sql');
const TK614_AUDIT_FILE=path.join(ROOT,'supabase','migrations','20261108120000_tk614_admin_release_audit_stage.sql');
const RELEASE_GATES_FILE=path.join(ROOT,'docs','generated','MOVEKIT_V2_RELEASE_GATES.json');
const GUARDED_FUNCTIONS=Object.freeze([
  {sig:'public.tk504_protect_reserved_catalog_fk()',name:'tk504_protect_reserved_catalog_fk',tag:'tk504'},
  {sig:'public.tk504_protect_catalog_fk_bindings()',name:'tk504_protect_catalog_fk_bindings',tag:'tk504'},
  {sig:'public.tk504_validate_typed_session_fk()',name:'tk504_validate_typed_session_fk',tag:'tk504'},
  {sig:'public.tk504_resolve_catalog_fk(text,text)',name:'tk504_resolve_catalog_fk',tag:'tk504'},
  {sig:'public.tk504_historical_catalog_id(text)',name:'tk504_historical_catalog_id',tag:'tk504'},
  {sig:'public.tk614_protect_admin_release_audit()',name:'tk614_protect_admin_release_audit',tag:'tk614'}]);
const FP_TABLES=Object.freeze(['public.exercises','public.sessions','public.movekit_catalog_fk_bindings',
  'public.tk614_admin_release_audit']);
const FP_FUNCTIONS=Object.freeze(['set_exercise_scope_context','set_user_id_from_auth',
  ...GUARDED_FUNCTIONS.map(f=>f.name)]);

const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const pad=n=>String(n).padStart(6,'0');
const num=id=>Number(String(id).slice(String(id).indexOf('-')+1));
function fail(code){const e=new Error(code);e.code=code;throw e;}
function need(ok,code){if(!ok)fail(code);}
const isObj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const sameKeys=(o,keys)=>isObj(o)&&JSON.stringify(Object.keys(o).sort())===JSON.stringify([...keys].sort());

// ---------------------------------------------------------------------------
// Canonical approval digest
function canonicalJson(v){
  if(Array.isArray(v))return '['+v.map(canonicalJson).join(',')+']';
  if(isObj(v))return '{'+Object.keys(v).sort().map(k=>{
    need(v[k]!==undefined,'APPROVAL_SHAPE_INVALID');
    return JSON.stringify(k)+':'+canonicalJson(v[k]);}).join(',')+'}';
  need(v===null||typeof v==='string'||typeof v==='boolean'||(typeof v==='number'&&Number.isFinite(v)),
    'APPROVAL_SHAPE_INVALID');
  return JSON.stringify(v);
}
function approvalDigest(a){
  need(isObj(a),'APPROVAL_SHAPE_INVALID');
  const rest={};for(const k of Object.keys(a))if(k!=='approval_sha256'&&k!=='signature')rest[k]=a[k];
  return sha(Buffer.from(canonicalJson(rest),'utf8'));
}
const scopeIds=()=>Array.from({length:ORIGINAL},(_,i)=>'TK-'+pad(i+1));
const idsSha=ids=>sha(Buffer.from(ids.join('\n'),'utf8'));
const APPROVAL_KEYS=Object.freeze({
  stage:['schema','phase','decision_id','prior_decision_id','approved_by','approved_at','scope','sources','live','approval_sha256'],
  activate:['schema','phase','decision_id','prior_decision_id','approved_by','approved_at','scope','sources','live','gates',
    'signature','approval_sha256'],
  reverse:['schema','phase','decision_id','prior_decision_id','approved_by','approved_at','scope','sources','live','approval_sha256']});

function validateFingerprint(fp){
  need(sameKeys(fp,['kind','server_version_num','precondition_sha256','registry_snapshot_sha256','session_user',
    'original_226_bindings','original_226_released','existing_356_active_reviewed','legacy_tk_rows',
    'latest_audit_decision_id','latest_audit_registry_after_sha256'])&&fp.kind===FINGERPRINT_KIND,'FINGERPRINT_INVALID');
  need(HEX64.test(fp.precondition_sha256)&&HEX64.test(fp.registry_snapshot_sha256)&&
    /^[0-9]{6}$/.test(fp.server_version_num)&&Number(fp.server_version_num)>=MIN_SERVER_VERSION_NUM,'FINGERPRINT_INVALID');
  return fp;
}
function pendingGates(){
  const g={};
  for(const k of ACTIVATION_GATES)g[k]=k==='review'?{status:'PENDING',accepted_by:null,evidence_sha256:null,completed_at:null}:
    {status:'PENDING',accepted_by:null,evidence_sha256:null};
  return g;
}
// Builds an UNSIGNED approval draft. Building a draft authorises nothing.
function buildApproval({phase,decisionId,priorDecisionId=null,approvedBy,approvedAt,plan,manifestSha256,fingerprint,gates}){
  need(PHASES.includes(phase),'PHASE_INVALID');
  need(plan&&HEX64.test(plan.all_sha256||''),'PLAN_REQUIRED');
  if(phase!=='reverse')validateFingerprint(fingerprint);
  else if(fingerprint)validateFingerprint(fingerprint);
  const ids=scopeIds();
  const a={schema:SCHEMA_APPROVAL,phase,decision_id:decisionId,prior_decision_id:priorDecisionId,
    approved_by:approvedBy,approved_at:approvedAt,
    scope:{count:ORIGINAL,catalog_ids:ids,catalog_ids_sha256:idsSha(ids)},
    sources:{mapping_sha256:plan.source_mapping_sha256,source_catalog_sha256:plan.source_catalog_sha256,
      all_sha256:plan.all_sha256,private_manifest_sha256:manifestSha256},
    live:fingerprint?{precondition_sha256:fingerprint.precondition_sha256,
      registry_snapshot_sha256:fingerprint.registry_snapshot_sha256,server_version_num:fingerprint.server_version_num}:
      {precondition_sha256:null,registry_snapshot_sha256:null,server_version_num:null}};
  if(phase==='activate'){a.gates=gates===undefined?pendingGates():gates;a.signature=null;}
  a.approval_sha256=approvalDigest(a);
  return a;
}
// Recompute the digest after the owner edited a draft; drops any signature.
function sealApproval(a){
  need(isObj(a)&&PHASES.includes(a.phase),'APPROVAL_SHAPE_INVALID');
  const out={...a};if(a.phase==='activate')out.signature=null;
  out.approval_sha256=approvalDigest(out);
  return out;
}
// Owner-side helper: Ed25519 signature over the 32 raw digest bytes.
function signApproval(a,privateKey){
  need(isObj(a)&&a.phase==='activate'&&HEX64.test(a.approval_sha256||'')&&a.approval_sha256===approvalDigest(a),
    'APPROVAL_DIGEST_MISMATCH');
  const key=privateKey instanceof crypto.KeyObject?privateKey:crypto.createPrivateKey(privateKey);
  need(key.type==='private'&&key.asymmetricKeyType==='ed25519','OWNER_KEY_NOT_ED25519');
  const der=crypto.createPublicKey(key).export({format:'der',type:'spki'});
  return {...a,signature:{alg:'ed25519',public_key_spki_der_base64:der.toString('base64'),
    value_base64:crypto.sign(null,Buffer.from(a.approval_sha256,'hex'),key).toString('base64')}};
}

// Existing public release gate: does any released record cover 001..226?
function original226Released(gates){
  if(!isObj(gates)||gates.status!=='RELEASE_APPROVED'||!Array.isArray(gates.released_batches))return false;
  const covered=new Set();
  for(const b of gates.released_batches){
    if(!isObj(b)||!/^TK-[0-9]{6}$/.test(b.from||'')||!/^TK-[0-9]{6}$/.test(b.through||''))continue;
    const f=num(b.from),t=num(b.through);
    if(t<f||t>TOTAL)continue;
    for(let n=f;n<=t;n++)covered.add(n);
  }
  for(let n=1;n<=ORIGINAL;n++)if(!covered.has(n))return false;
  return true;
}
function activationBlockers(releaseGates,trustedKeys=TRUSTED_OWNER_KEY_SHA256){
  const out=[];
  if(!original226Released(releaseGates))out.push('ACTIVATION_BLOCKED_ORIGINAL_226_NOT_IN_RELEASE_GATES');
  if(!Array.isArray(trustedKeys)||trustedKeys.length===0)out.push('ACTIVATION_BLOCKED_NO_PINNED_OWNER_KEY');
  return out;
}

function verifySignature(a,trustedKeys){
  need(Array.isArray(trustedKeys)&&trustedKeys.length>0&&trustedKeys.every(k=>HEX64.test(k)),
    'ACTIVATION_BLOCKED_NO_PINNED_OWNER_KEY');
  const s=a.signature;
  need(sameKeys(s,['alg','public_key_spki_der_base64','value_base64'])&&s.alg==='ed25519'&&
    typeof s.public_key_spki_der_base64==='string'&&typeof s.value_base64==='string','ACTIVATION_SIGNATURE_REQUIRED');
  const der=Buffer.from(s.public_key_spki_der_base64,'base64');
  need(trustedKeys.includes(sha(der)),'OWNER_KEY_NOT_TRUSTED');
  let ok=false;
  try{
    const key=crypto.createPublicKey({key:der,format:'der',type:'spki'});
    ok=key.asymmetricKeyType==='ed25519'&&
      crypto.verify(null,Buffer.from(a.approval_sha256,'hex'),key,Buffer.from(s.value_base64,'base64'));
  }catch(_){ok=false;}
  need(ok,'OWNER_SIGNATURE_INVALID');
}

/**
 * Full approval verification. opts:
 *  phase, plan, manifestSha256, confirmDecisionId, confirmApprovalSha256, now (ms),
 *  releaseGates (activate), trustedOwnerKeySha256 (activate; default pinned list).
 */
function verifyApproval(a,opts){
  const {phase,plan}=opts;
  need(PHASES.includes(phase),'PHASE_INVALID');
  need(isObj(a),'APPROVAL_SHAPE_INVALID');
  need(a.schema===SCHEMA_APPROVAL,'APPROVAL_SCHEMA_INVALID');
  need(a.phase===phase,'APPROVAL_PHASE_MISMATCH');
  need(sameKeys(a,APPROVAL_KEYS[phase]),'APPROVAL_SHAPE_INVALID');
  const m=DECISION_RE.exec(typeof a.decision_id==='string'?a.decision_id:'');
  need(m&&m[1]===phase.toUpperCase(),'DECISION_ID_INVALID');
  const prior=a.prior_decision_id,pm=DECISION_RE.exec(typeof prior==='string'?prior:'');
  if(phase==='stage')need(prior===null,'PRIOR_DECISION_INVALID');
  if(phase==='activate')need(pm&&(pm[1]==='STAGE'||pm[1]==='REVERSE')&&prior!==a.decision_id,'PRIOR_DECISION_INVALID');
  if(phase==='reverse')need(prior===null||(pm&&prior!==a.decision_id),'PRIOR_DECISION_INVALID');
  need(typeof a.approved_by==='string'&&a.approved_by.trim().length>=2&&a.approved_by.length<=128&&
    !/[\u0000-\u001f'\\]/.test(a.approved_by),'APPROVED_BY_INVALID');
  need(typeof a.approved_at==='string'&&ISO_Z.test(a.approved_at),'APPROVAL_STALE_OR_FUTURE');
  const now=opts.now===undefined?Date.now():opts.now,at=Date.parse(a.approved_at);
  need(Number.isFinite(at)&&now-at<=MAX_APPROVAL_AGE_MS&&at-now<=MAX_CLOCK_SKEW_MS,'APPROVAL_STALE_OR_FUTURE');
  const ids=scopeIds();
  need(sameKeys(a.scope,['count','catalog_ids','catalog_ids_sha256'])&&a.scope.count===ORIGINAL&&
    Array.isArray(a.scope.catalog_ids)&&JSON.stringify(a.scope.catalog_ids)===JSON.stringify(ids)&&
    a.scope.catalog_ids_sha256===idsSha(ids),'APPROVAL_SCOPE_MISMATCH');
  need(plan&&plan.entries&&plan.entries.length===ORIGINAL&&
    JSON.stringify(plan.entries.map(e=>e.catalog_id))===JSON.stringify(ids),'APPROVAL_SCOPE_MISMATCH');
  need(sameKeys(a.sources,['mapping_sha256','source_catalog_sha256','all_sha256','private_manifest_sha256'])&&
    a.sources.mapping_sha256===plan.source_mapping_sha256&&a.sources.source_catalog_sha256===plan.source_catalog_sha256&&
    a.sources.all_sha256===plan.all_sha256&&HEX64.test(opts.manifestSha256||'')&&
    a.sources.private_manifest_sha256===opts.manifestSha256,'APPROVAL_SOURCE_DIGEST_MISMATCH');
  const L=a.live;
  need(sameKeys(L,['precondition_sha256','registry_snapshot_sha256','server_version_num']),'APPROVAL_LIVE_PRECONDITIONS_INVALID');
  const liveOk=x=>HEX64.test(x.precondition_sha256||'')&&HEX64.test(x.registry_snapshot_sha256||'')&&
    /^[0-9]{6}$/.test(x.server_version_num||'')&&Number(x.server_version_num)>=MIN_SERVER_VERSION_NUM;
  if(phase==='reverse')need((L.precondition_sha256===null&&L.registry_snapshot_sha256===null&&L.server_version_num===null)||
    liveOk(L),'APPROVAL_LIVE_PRECONDITIONS_INVALID');
  else need(liveOk(L),'APPROVAL_LIVE_PRECONDITIONS_INVALID');
  need(typeof a.approval_sha256==='string'&&HEX64.test(a.approval_sha256)&&a.approval_sha256===approvalDigest(a),
    'APPROVAL_DIGEST_MISMATCH');
  need(typeof opts.confirmDecisionId==='string'&&typeof opts.confirmApprovalSha256==='string','APPROVAL_CONFIRMATION_REQUIRED');
  need(opts.confirmDecisionId===a.decision_id&&opts.confirmApprovalSha256===a.approval_sha256,'APPROVAL_CONFIRMATION_MISMATCH');
  if(phase==='activate'){
    need(sameKeys(a.gates,ACTIVATION_GATES),'APPROVAL_SHAPE_INVALID');
    for(const k of ACTIVATION_GATES){
      const g=a.gates[k];
      need(sameKeys(g,k==='review'?['status','accepted_by','evidence_sha256','completed_at']:
        ['status','accepted_by','evidence_sha256']),'APPROVAL_SHAPE_INVALID');
      need(g.status==='ACCEPTED','ACTIVATION_GATE_NOT_ACCEPTED');
      need(typeof g.accepted_by==='string'&&g.accepted_by.trim().length>=2&&g.accepted_by.length<=128&&
        HEX64.test(g.evidence_sha256||''),'ACTIVATION_GATE_EVIDENCE_INVALID');
    }
    const rv=a.gates.review.completed_at;
    need(typeof rv==='string'&&ISO_Z.test(rv)&&Date.parse(rv)<=at,'REVIEW_TIMESTAMP_INVALID');
    need(original226Released(opts.releaseGates),'ACTIVATION_BLOCKED_ORIGINAL_226_NOT_IN_RELEASE_GATES');
    verifySignature(a,opts.trustedOwnerKeySha256===undefined?TRUSTED_OWNER_KEY_SHA256:opts.trustedOwnerKeySha256);
  }else need(!('gates' in a)&&!('signature' in a),'APPROVAL_SHAPE_INVALID');
  return Object.freeze({phase,decision_id:a.decision_id,approval_sha256:a.approval_sha256});
}

// ---------------------------------------------------------------------------
// Repo-staged guard definitions (prosrc digests), self-checked against TK603.
function extractBody(text,name,tag){
  const src=String(text).replace(/\r\n/g,'\n');
  const re=new RegExp('create or replace function public\\.'+name+'\\([^)]*\\)[\\s\\S]*?\\$'+tag+'\\$([\\s\\S]*?)\\$'+tag+'\\$;','i');
  const m=src.match(re);
  need(m,'REPO_GUARD_DEFINITION_MISSING');
  return m[1];
}
function repoFunctionDigests(tk504Sql,auditSql){
  const out={};
  for(const f of GUARDED_FUNCTIONS)out[f.sig]=sha(Buffer.from(extractBody(f.tag==='tk504'?tk504Sql:auditSql,f.name,f.tag),'utf8'));
  need(out['public.tk504_protect_reserved_catalog_fk()']===TK603_RESERVED_GUARD_SHA256,'REPO_GUARD_DIGEST_METHOD_MISMATCH');
  return Object.freeze(out);
}

// ---------------------------------------------------------------------------
// SQL building blocks. Every phase file runs with search_path=pg_catalog and
// TimeZone=UTC so the fingerprints are byte-identical to the read-only file.
function q(s){
  need(typeof s==='string'&&s.length>0&&s.length<=256&&!/['\\\u0000-\u001f]/.test(s),'UNSAFE_SQL_LITERAL');
  return "'"+s+"'";
}
const series=(a,b,prefix)=>`(SELECT '${prefix}'||lpad(g::text,6,'0') FROM generate_series(${a},${b}) g)`;
const H=e=>`encode(sha256(convert_to(${e},'UTF8')),'hex')`;
const NORM_SRC=`replace(p.prosrc,chr(13)||chr(10),chr(10))`;
const REL_IN=`(SELECT to_regclass(x) FROM unnest(ARRAY[${FP_TABLES.map(t=>`'${t}'`).join(',')}]::text[]) AS x)`;
const PRECONDITION_EXPR=H(`concat_ws(E'\\n',
  'server_version_num='||current_setting('server_version_num'),
  (SELECT string_agg(p.oid::regprocedure::text||'|'||p.prosecdef::text||'|'||p.provolatile::text||'|'||
      coalesce(p.proconfig::text,'')||'|'||coalesce(p.proacl::text,'')||'|'||p.proowner::regrole::text||'|'||
      ${H(NORM_SRC)},E'\\n' ORDER BY p.oid::regprocedure::text)
     FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE (n.nspname='public' AND p.proname IN (${FP_FUNCTIONS.map(f=>`'${f}'`).join(',')}))
       OR (n.nspname='auth' AND p.proname='uid')),
  (SELECT string_agg(t.tgrelid::regclass::text||'|'||t.tgname::text||'|'||t.tgenabled::text||'|'||t.tgtype::text||'|'||
      t.tgfoid::regprocedure::text,E'\\n' ORDER BY t.tgrelid::regclass::text,t.tgname::text)
     FROM pg_trigger t WHERE NOT t.tgisinternal AND t.tgrelid IN ${REL_IN}),
  (SELECT string_agg(c.oid::regclass::text||'|'||c.relrowsecurity::text||'|'||c.relforcerowsecurity::text||'|'||
      coalesce(c.relacl::text,''),E'\\n' ORDER BY c.oid::regclass::text)
     FROM pg_class c WHERE c.oid IN ${REL_IN}),
  (SELECT string_agg(pol.polrelid::regclass::text||'|'||pol.polname::text||'|'||pol.polcmd::text||'|'||
      pol.polpermissive::text||'|'||pol.polroles::text||'|'||coalesce(pg_get_expr(pol.polqual,pol.polrelid),'')||'|'||
      coalesce(pg_get_expr(pol.polwithcheck,pol.polrelid),''),E'\\n' ORDER BY pol.polrelid::regclass::text,pol.polname::text)
     FROM pg_policy pol WHERE pol.polrelid IN ${REL_IN}),
  (SELECT string_agg(a.attrelid::regclass::text||'|'||a.attname::text||'|'||format_type(a.atttypid,a.atttypmod)||'|'||
      a.attnotnull::text,E'\\n' ORDER BY a.attrelid::regclass::text,a.attnum)
     FROM pg_attribute a WHERE a.attrelid IN ${REL_IN} AND a.attnum>0 AND NOT a.attisdropped),
  (SELECT string_agg(con.conrelid::regclass::text||'|'||con.conname::text||'|'||pg_get_constraintdef(con.oid),
      E'\\n' ORDER BY con.conrelid::regclass::text,con.conname::text)
     FROM pg_constraint con WHERE con.conrelid IN ${REL_IN}))`);
// Registry snapshot: full binding rows, full TKC alias rows and the IDENTITY of
// the 23 legacy TK rows (owners may edit pr/1RM on personal rows; that must
// not block a release). Sessions are excluded (live churn).
const REGISTRY_EXPR=H(`concat_ws(E'\\n',
  'bindings:'||coalesce((SELECT string_agg(to_jsonb(b)::text,E'\\n' ORDER BY b.catalog_id)
     FROM public.movekit_catalog_fk_bindings b),''),
  'aliases:'||coalesce((SELECT string_agg(to_jsonb(e)::text,E'\\n' ORDER BY e.id)
     FROM public.exercises e WHERE e.id ~ '^TKC-[0-9]{6}$'),''),
  'legacy:'||coalesce((SELECT string_agg(concat_ws('|',e.id,e.scope,e.created_by,e.user_id,e.gym_id),E'\\n' ORDER BY e.id)
     FROM public.exercises e WHERE e.id ~ '^TK-[0-9]{6}$'),''))`);
const FP_LEGACY=`(SELECT md5(coalesce(string_agg(e::text,'|' ORDER BY e.id),'')) FROM public.exercises e
   WHERE e.id ~ '^TK-[0-9]{6}$')`;
const FP_B356=`(SELECT md5(coalesce(string_agg(b::text,'|' ORDER BY b.catalog_id),'')) FROM public.movekit_catalog_fk_bindings b
   WHERE b.catalog_id IN ${series(ORIGINAL+1,TOTAL,'TK-')})`;
const FP_A356=`(SELECT md5(coalesce(string_agg(e::text,'|' ORDER BY e.id),'')) FROM public.exercises e
   WHERE e.id IN ${series(ORIGINAL+1,TOTAL,'TKC-')})`;
const FP_A226=`(SELECT md5(coalesce(string_agg(e::text,'|' ORDER BY e.id),'')) FROM public.exercises e
   WHERE e.id IN ${series(1,ORIGINAL,'TKC-')})`;
// Relevant history (all TK/TKC-shaped sessions) + total row count.
const FP_SESSIONS=`(SELECT md5(coalesce(string_agg(s::text,'|' ORDER BY s.id),''))||':'||
   (SELECT count(*) FROM public.sessions)::text FROM public.sessions s WHERE s.exercise_id ~ '^TKC?-[0-9]{6}$')`;
const PROBE_UID='00000000-0000-4000-8000-000000000614';
const ALL_PRIVS="'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'";
const WRITE_PRIVS="'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'";

function header(phase,plan,a){
  const what={stage:'226 technical aliases + bindings INACTIVE/UNREVIEWED, no media. Runtime stays unchanged.',
    activate:'reviewed_at + binding.active for exactly 226. Technical exercise.active stays false. No media.',
    reverse:'binding.active=false, reviewed_at=NULL for the 226 only. Aliases and every session row are kept.'}[phase];
  return `-- TK614 #603 PRIVATE ADMIN RELEASE CANDIDATE -- PHASE ${PHASE_LABEL[phase]}
-- ${what}
-- DBA ONLY: psql as the trusted postgres admin role. Never via PostgREST, service_role, a JWT session or the app.
-- Owner decision: ${a.decision_id}${a.prior_decision_id?'   prior decision: '+a.prior_decision_id:''}
-- Approval sha256: ${a.approval_sha256}
-- Plan all_sha256: ${plan.all_sha256}
-- Source mapping sha256: ${plan.source_mapping_sha256}
-- Source catalog sha256: ${plan.source_catalog_sha256}
-- Scope: TK-000001..TK-000226 only. The 356 reviewed rows, the 23 legacy TK rows and all sessions stay unchanged.
\\set ON_ERROR_STOP on
BEGIN ISOLATION LEVEL REPEATABLE READ;
SET LOCAL search_path TO pg_catalog;
SET LOCAL TimeZone TO 'UTC';
SET LOCAL lock_timeout TO '5s';
SET LOCAL statement_timeout TO '120s';
SET LOCAL idle_in_transaction_session_timeout TO '60s';
LOCK TABLE public.tk614_admin_release_audit IN EXCLUSIVE MODE;
LOCK TABLE public.movekit_catalog_fk_bindings IN EXCLUSIVE MODE;
LOCK TABLE public.exercises IN SHARE ROW EXCLUSIVE MODE;
`;
}

function contextGuard(phase,a,digests){
  const fp=phase!=='reverse';
  const trig=(rel,name,fn)=>`(t.tgrelid=to_regclass('${rel}') AND t.tgname='${name}' AND t.tgfoid=to_regprocedure('${fn}'))`;
  const dig=GUARDED_FUNCTIONS.map(f=>`('${f.sig}','${digests[f.sig]}')`).join(',');
  need(GUARDED_FUNCTIONS.every(f=>HEX64.test(digests[f.sig]||'')),'REPO_GUARD_DEFINITION_MISSING');
  return `DO $tk614$
BEGIN
 IF session_user::text <> 'postgres' OR current_user::text <> 'postgres' OR current_setting('role') <> 'none'
 THEN RAISE EXCEPTION 'TK614_REQUIRES_TRUSTED_POSTGRES_ADMIN'; END IF;
 IF auth.uid() IS NOT NULL
   OR coalesce(current_setting('request.jwt.claims',true),'') <> ''
   OR coalesce(current_setting('request.jwt.claim.sub',true),'') <> ''
   OR coalesce(current_setting('request.jwt.claim.role',true),'') <> ''
 THEN RAISE EXCEPTION 'TK614_JWT_CONTEXT_FORBIDDEN'; END IF;
 IF current_setting('transaction_isolation') <> 'repeatable read' OR current_setting('transaction_read_only') <> 'off'
 THEN RAISE EXCEPTION 'TK614_ISOLATION_REQUIRED'; END IF;
 IF NOT pg_try_advisory_xact_lock(${ADVISORY_KEY}) THEN RAISE EXCEPTION 'TK614_SECOND_WRITER_ACTIVE'; END IF;
 IF current_setting('server_version_num')::int < ${MIN_SERVER_VERSION_NUM}
 THEN RAISE EXCEPTION 'TK614_SERVER_VERSION_UNSUPPORTED'; END IF;
 IF EXISTS(SELECT 1 FROM public.tk614_admin_release_audit WHERE decision_id=${q(a.decision_id)})
 THEN RAISE EXCEPTION 'TK614_DECISION_ALREADY_USED'; END IF;
 IF to_regprocedure('auth.uid()') IS NULL OR to_regprocedure('public.tk504_resolve_catalog_fk(text,text)') IS NULL
   OR to_regprocedure('public.tk504_historical_catalog_id(text)') IS NULL
 THEN RAISE EXCEPTION 'TK614_SCHEMA_REQUIRED'; END IF;
 IF (SELECT count(*) FROM pg_class c WHERE c.oid IN ${REL_IN} AND c.relrowsecurity)<>${FP_TABLES.length}
 THEN RAISE EXCEPTION 'TK614_RLS_NOT_ENABLED'; END IF;
 IF (SELECT count(*) FROM pg_trigger t WHERE NOT t.tgisinternal AND t.tgenabled='O' AND (
      ${trig('public.exercises','tk504_reserved_catalog_fk_guard','public.tk504_protect_reserved_catalog_fk()')}
   OR ${trig('public.movekit_catalog_fk_bindings','tk504_catalog_fk_bindings_guard','public.tk504_protect_catalog_fk_bindings()')}
   OR ${trig('public.sessions','tk504_typed_session_fk_guard','public.tk504_validate_typed_session_fk()')}
   OR ${trig('public.tk614_admin_release_audit','tk614_admin_release_audit_guard','public.tk614_protect_admin_release_audit()')}))<>4
 THEN RAISE EXCEPTION 'TK614_GUARD_TRIGGER_MISSING_OR_DISABLED'; END IF;
 IF (SELECT count(*) FROM pg_proc p JOIN (VALUES ${dig}) AS v(sig,digest) ON p.oid=to_regprocedure(v.sig)
      WHERE ${H(NORM_SRC)}=v.digest)<>${GUARDED_FUNCTIONS.length}
 THEN RAISE EXCEPTION 'TK614_GUARD_DEFINITION_DRIFT'; END IF;
 IF has_table_privilege('anon','public.movekit_catalog_fk_bindings',${ALL_PRIVS})
   OR has_table_privilege('authenticated','public.movekit_catalog_fk_bindings',${ALL_PRIVS})
   OR has_table_privilege('service_role','public.movekit_catalog_fk_bindings',${WRITE_PRIVS})
   OR has_table_privilege('anon','public.tk614_admin_release_audit',${ALL_PRIVS})
   OR has_table_privilege('authenticated','public.tk614_admin_release_audit',${ALL_PRIVS})
   OR has_table_privilege('service_role','public.tk614_admin_release_audit',${ALL_PRIVS})
 THEN RAISE EXCEPTION 'TK614_CLIENT_REGISTRY_PRIVILEGE'; END IF;
${fp?` IF current_setting('server_version_num') IS DISTINCT FROM ${q(a.live.server_version_num)}
 THEN RAISE EXCEPTION 'TK614_SERVER_VERSION_DRIFT'; END IF;
 IF (${PRECONDITION_EXPR}) IS DISTINCT FROM ${q(a.live.precondition_sha256)}
 THEN RAISE EXCEPTION 'TK614_PRECONDITION_FINGERPRINT_DRIFT'; END IF;
 IF (${REGISTRY_EXPR}) IS DISTINCT FROM ${q(a.live.registry_snapshot_sha256)}
 THEN RAISE EXCEPTION 'TK614_REGISTRY_SNAPSHOT_DRIFT'; END IF;
`:''}END
$tk614$;
`;
}

function planTables(rows,entries){
  return `CREATE TEMP TABLE tk614_expected_356(catalog_id text NOT NULL, exercise_id text NOT NULL,
  provider_id text NOT NULL) ON COMMIT DROP;
INSERT INTO tk614_expected_356 VALUES
${entries.slice(ORIGINAL).map(e=>`  (${q(e.catalog_id)},${q(e.exercise_id)},${q(e.provider_id)})`).join(',\n')};
CREATE TEMP TABLE tk614_plan_226(n int PRIMARY KEY, batch int NOT NULL, catalog_id text NOT NULL UNIQUE,
  exercise_id text NOT NULL UNIQUE, provider_id text NOT NULL UNIQUE) ON COMMIT DROP;
INSERT INTO tk614_plan_226 VALUES
${rows.map((e,i)=>`  (${i+1},${T.batchOf(e.catalog_id)},${q(e.catalog_id)},${q(e.exercise_id)},${q(e.provider_id)})`).join(',\n')};
DO $tk614$
BEGIN
 IF (SELECT count(*) FROM tk614_plan_226)<>${ORIGINAL} OR (SELECT count(DISTINCT batch) FROM tk614_plan_226)<>${T.BATCH_COUNT}
   OR EXISTS(SELECT 1 FROM tk614_plan_226 WHERE catalog_id<>'TK-'||lpad(n::text,6,'0')
      OR exercise_id<>'TKC-'||lpad(n::text,6,'0') OR batch<>((n-1)/${T.BATCH_SIZE})+1)
   OR (SELECT count(*) FROM tk614_expected_356)<>${EXISTING}
   OR EXISTS(SELECT 1 FROM tk614_plan_226 p JOIN tk614_expected_356 x ON x.provider_id=p.provider_id)
 THEN RAISE EXCEPTION 'TK614_PLAN_TABLE_INVALID'; END IF;
END
$tk614$;
`;
}

const CHECK_TKC_OWNER=` IF EXISTS(SELECT 1 FROM public.exercises WHERE id ~ '^TKC-[0-9]{6}$' AND
   (scope IS DISTINCT FROM 'global' OR created_by IS NOT NULL OR user_id IS NOT NULL OR gym_id IS NOT NULL))
 THEN RAISE EXCEPTION 'TK614_RESERVED_ALIAS_WRONG_OWNER_OR_SCOPE'; END IF;`;
const CHECK_356=` IF (SELECT count(*) FROM public.movekit_catalog_fk_bindings b
       JOIN tk614_expected_356 x ON x.catalog_id=b.catalog_id AND x.exercise_id=b.exercise_id AND x.provider_id=b.provider_id
       JOIN public.exercises e ON e.id=b.exercise_id AND e.scope='global'
        AND e.created_by IS NULL AND e.user_id IS NULL AND e.gym_id IS NULL
      WHERE b.active AND b.reviewed_at IS NOT NULL AND b.source_provider='movekit')<>${EXISTING}
   OR (SELECT count(*) FROM public.movekit_catalog_fk_bindings WHERE catalog_id IN ${series(ORIGINAL+1,TOTAL,'TK-')})<>${EXISTING}
 THEN RAISE EXCEPTION 'TK614_EXISTING_356_CHANGED_OR_MISSING'; END IF;`;
const CHECK_LEGACY=` IF (SELECT count(*) FROM public.exercises WHERE id ~ '^TK-[0-9]{6}$')<>${LEGACY_TK_ROWS}
 THEN RAISE EXCEPTION 'TK614_LEGACY_TK_ROW_COUNT_CHANGED'; END IF;`;
const EXACT_JOIN=`JOIN tk614_plan_226 p ON p.catalog_id=b.catalog_id AND p.exercise_id=b.exercise_id AND p.provider_id=b.provider_id`;
const ALIAS_INACTIVE_JOIN=`JOIN public.exercises e ON e.id=b.exercise_id AND e.scope='global' AND e.active=false
        AND e.created_by IS NULL AND e.user_id IS NULL AND e.gym_id IS NULL`;

const BEFORE=`CREATE TEMP TABLE tk614_before ON COMMIT DROP AS SELECT
 ${FP_LEGACY} AS legacy_fp,
 ${FP_SESSIONS} AS sessions_fp,
 ${FP_B356} AS bindings_356_fp,
 ${FP_A356} AS aliases_356_fp,
 ${FP_A226} AS aliases_226_fp,
 (${PRECONDITION_EXPR}) AS precondition_fp,
 (${REGISTRY_EXPR}) AS registry_fp,
 (SELECT count(*) FROM public.movekit_catalog_fk_bindings b WHERE b.catalog_id IN ${series(1,ORIGINAL,'TK-')}
   AND (b.active OR b.reviewed_at IS NOT NULL))::int AS released_226;
`;
function commonPost(opts){
  return ` IF (SELECT bindings_356_fp FROM tk614_before) IS DISTINCT FROM ${FP_B356}
   OR (SELECT aliases_356_fp FROM tk614_before) IS DISTINCT FROM ${FP_A356}
 THEN RAISE EXCEPTION 'TK614_EXISTING_356_MODIFIED_IN_TXN'; END IF;
 IF (SELECT legacy_fp FROM tk614_before) IS DISTINCT FROM ${FP_LEGACY}
 THEN RAISE EXCEPTION 'TK614_LEGACY_TK_ROWS_CHANGED'; END IF;
 IF (SELECT sessions_fp FROM tk614_before) IS DISTINCT FROM ${FP_SESSIONS}
 THEN RAISE EXCEPTION 'TK614_HISTORY_CHANGED'; END IF;
 IF (SELECT precondition_fp FROM tk614_before) IS DISTINCT FROM (${PRECONDITION_EXPR})
 THEN RAISE EXCEPTION 'TK614_SCHEMA_OR_POLICY_CHANGED_IN_TXN'; END IF;
${opts.aliases226Unchanged?` IF (SELECT aliases_226_fp FROM tk614_before) IS DISTINCT FROM ${FP_A226}
 THEN RAISE EXCEPTION 'TK614_TECHNICAL_ALIASES_CHANGED'; END IF;
`:''}`;
}
// Read-only resolver probe under a synthetic auth.uid(); identity is reset.
function resolverProbe(expect226,opts={}){
  return ` PERFORM set_config('request.jwt.claim.sub',${q(PROBE_UID)},true);
 IF (SELECT count(*) FROM tk614_plan_226 p
      WHERE public.tk504_resolve_catalog_fk(p.catalog_id,p.provider_id) IS NOT NULL)<>${expect226}
   OR (SELECT count(*) FROM tk614_plan_226 p
      WHERE public.tk504_resolve_catalog_fk(p.catalog_id,p.provider_id) IS NOT DISTINCT FROM p.exercise_id)<>${expect226}
 THEN RAISE EXCEPTION 'TK614_RESOLVER_226_NOT_${expect226}'; END IF;
${opts.wrongSlug?` IF (SELECT count(*) FROM tk614_plan_226 p JOIN tk614_plan_226 w ON w.n=(p.n % ${ORIGINAL})+1
      WHERE public.tk504_resolve_catalog_fk(p.catalog_id,w.provider_id) IS NOT NULL)<>0
 THEN RAISE EXCEPTION 'TK614_RESOLVER_ACCEPTS_WRONG_SLUG'; END IF;
`:''}${opts.existing356?` IF (SELECT count(*) FROM tk614_expected_356 x
      WHERE public.tk504_resolve_catalog_fk(x.catalog_id,x.provider_id)=x.exercise_id)<>${EXISTING}
 THEN RAISE EXCEPTION 'TK614_EXISTING_356_RESOLVER_CHANGED'; END IF;
`:''} PERFORM set_config('request.jwt.claim.sub','',true);
 IF auth.uid() IS NOT NULL THEN RAISE EXCEPTION 'TK614_PROBE_IDENTITY_NOT_RESET'; END IF;`;
}
function auditInsert(phase,plan,a,rowsExpr){
  return `INSERT INTO public.tk614_admin_release_audit
(decision_id,phase,prior_decision_id,approval_sha256,all_sha256,source_mapping_sha256,source_catalog_sha256,
 precondition_sha256,registry_before_sha256,registry_after_sha256,rows_changed)
SELECT ${q(a.decision_id)},${q(phase)},${a.prior_decision_id?q(a.prior_decision_id):'NULL'},${q(a.approval_sha256)},
 ${q(plan.all_sha256)},${q(plan.source_mapping_sha256)},${q(plan.source_catalog_sha256)},
 b.precondition_fp,b.registry_fp,(${REGISTRY_EXPR}),${rowsExpr}
FROM tk614_before b;
`;
}
const footer=phase=>`COMMIT;
SELECT '${MARKERS[phase]}' AS result;
`;

function renderStage(plan,entries,a,digests){
  return header('stage',plan,a)+contextGuard('stage',a,digests)+planTables(plan.entries,entries)+`DO $tk614$
BEGIN
${CHECK_TKC_OWNER}
${CHECK_356}
 IF EXISTS(SELECT 1 FROM public.movekit_catalog_fk_bindings WHERE catalog_id IN ${series(1,ORIGINAL,'TK-')})
 THEN RAISE EXCEPTION 'TK614_STAGE_ALREADY_PRESENT'; END IF;
 IF EXISTS(SELECT 1 FROM public.exercises WHERE id IN ${series(1,ORIGINAL,'TKC-')})
 THEN RAISE EXCEPTION 'TK614_ORIGINAL_ALIAS_COLLISION'; END IF;
 IF EXISTS(SELECT 1 FROM public.movekit_catalog_fk_bindings b JOIN tk614_plan_226 p ON p.provider_id=b.provider_id)
 THEN RAISE EXCEPTION 'TK614_PROVIDER_ALREADY_BOUND'; END IF;
${CHECK_LEGACY}
 IF EXISTS(SELECT 1 FROM public.tk614_admin_release_audit WHERE all_sha256=${q(plan.all_sha256)})
 THEN RAISE EXCEPTION 'TK614_PLAN_ALREADY_IN_AUDIT'; END IF;
END
$tk614$;
${BEFORE}${plan.batches.map(T.renderBatchBlock).join('')}DO $tk614$
BEGIN
 IF (SELECT count(*) FROM public.movekit_catalog_fk_bindings b ${EXACT_JOIN}
       ${ALIAS_INACTIVE_JOIN}
      WHERE b.active=false AND b.reviewed_at IS NULL AND b.source_provider='movekit')<>${ORIGINAL}
   OR EXISTS(SELECT 1 FROM public.movekit_catalog_fk_bindings WHERE catalog_id IN ${series(1,ORIGINAL,'TK-')}
      AND (active OR reviewed_at IS NOT NULL))
 THEN RAISE EXCEPTION 'TK614_STAGE_NOT_226_INACTIVE_UNREVIEWED'; END IF;
 IF (SELECT count(*) FROM public.exercises WHERE id ~ '^TKC-[0-9]{6}$')<>${TOTAL}
   OR (SELECT count(*) FROM public.movekit_catalog_fk_bindings WHERE catalog_id IN ${series(1,TOTAL,'TK-')})<>${TOTAL}
 THEN RAISE EXCEPTION 'TK614_CANONICAL_582_INCOMPLETE'; END IF;
${commonPost({aliases226Unchanged:false})}${resolverProbe(0,{existing356:true})}
END
$tk614$;
${auditInsert('stage',plan,a,String(ORIGINAL))}${footer('stage')}`;
}

function renderActivate(plan,entries,a,digests){
  const ts=a.gates.review.completed_at,prior=q(a.prior_decision_id),all=q(plan.all_sha256);
  return header('activate',plan,a)+contextGuard('activate',a,digests)+planTables(plan.entries,entries)+`DO $tk614$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.tk614_admin_release_audit
      WHERE decision_id=${prior} AND phase IN ('stage','reverse') AND all_sha256=${all})
 THEN RAISE EXCEPTION 'TK614_PRIOR_DECISION_NOT_FOUND'; END IF;
 IF (SELECT a.decision_id FROM public.tk614_admin_release_audit a WHERE a.all_sha256=${all}
      ORDER BY a.id DESC LIMIT 1) IS DISTINCT FROM ${prior}
 THEN RAISE EXCEPTION 'TK614_PRIOR_DECISION_NOT_LATEST'; END IF;
 IF (SELECT a.registry_after_sha256 FROM public.tk614_admin_release_audit a WHERE a.decision_id=${prior})
      IS DISTINCT FROM ${q(a.live.registry_snapshot_sha256)}
 THEN RAISE EXCEPTION 'TK614_APPROVAL_NOT_BOUND_TO_PRIOR_STATE'; END IF;
 IF EXISTS(SELECT 1 FROM public.tk614_admin_release_audit a JOIN pg_stat_activity s ON s.pid=pg_backend_pid()
      WHERE a.decision_id=${prior} AND a.backend_pid=pg_backend_pid() AND a.executed_at>=s.backend_start)
 THEN RAISE EXCEPTION 'TK614_ACTIVATE_IN_SAME_SESSION_AS_PRIOR_PHASE'; END IF;
 IF ${q(ts)}::timestamptz > now() THEN RAISE EXCEPTION 'TK614_REVIEW_TIMESTAMP_IN_FUTURE'; END IF;
${CHECK_TKC_OWNER}
${CHECK_356}
${CHECK_LEGACY}
 IF EXISTS(SELECT 1 FROM public.movekit_catalog_fk_bindings b JOIN tk614_plan_226 p ON p.catalog_id=b.catalog_id
      WHERE b.provider_id<>p.provider_id OR b.exercise_id<>p.exercise_id OR b.source_provider<>'movekit')
   OR EXISTS(SELECT 1 FROM public.movekit_catalog_fk_bindings b JOIN tk614_plan_226 p ON p.provider_id=b.provider_id
      WHERE b.catalog_id<>p.catalog_id)
 THEN RAISE EXCEPTION 'TK614_CROSS_PROVIDER_DRIFT'; END IF;
 IF (SELECT count(*) FROM public.movekit_catalog_fk_bindings b ${EXACT_JOIN})<>${ORIGINAL}
   OR (SELECT count(*) FROM public.movekit_catalog_fk_bindings WHERE catalog_id IN ${series(1,ORIGINAL,'TK-')})<>${ORIGINAL}
   OR (SELECT count(*) FROM public.exercises e JOIN tk614_plan_226 p ON p.exercise_id=e.id WHERE e.scope='global'
      AND e.active=false AND e.created_by IS NULL AND e.user_id IS NULL AND e.gym_id IS NULL)<>${ORIGINAL}
 THEN RAISE EXCEPTION 'TK614_PARTIAL_OR_MISSING_STAGE'; END IF;
 IF EXISTS(SELECT 1 FROM public.movekit_catalog_fk_bindings WHERE catalog_id IN ${series(1,ORIGINAL,'TK-')}
      AND (active OR reviewed_at IS NOT NULL))
 THEN RAISE EXCEPTION 'TK614_ALREADY_ACTIVE_OR_REVIEWED'; END IF;
END
$tk614$;
${BEFORE}DO $tk614$
DECLARE changed int;
BEGIN
 UPDATE public.movekit_catalog_fk_bindings b SET reviewed_at=${q(ts)}::timestamptz, active=true
   FROM tk614_plan_226 p
  WHERE b.catalog_id=p.catalog_id AND b.exercise_id=p.exercise_id AND b.provider_id=p.provider_id
    AND b.active=false AND b.reviewed_at IS NULL;
 GET DIAGNOSTICS changed = ROW_COUNT;
 IF changed<>${ORIGINAL} THEN RAISE EXCEPTION 'TK614_ACTIVATION_ROW_COUNT_%',changed; END IF;
END
$tk614$;
DO $tk614$
BEGIN
 IF (SELECT count(*) FROM public.movekit_catalog_fk_bindings b ${EXACT_JOIN}
       ${ALIAS_INACTIVE_JOIN}
      WHERE b.active AND b.reviewed_at=${q(ts)}::timestamptz AND b.source_provider='movekit')<>${ORIGINAL}
 THEN RAISE EXCEPTION 'TK614_ACTIVATION_NOT_226_ACTIVE_REVIEWED'; END IF;
 IF EXISTS(SELECT 1 FROM public.exercises WHERE id IN ${series(1,ORIGINAL,'TKC-')} AND active IS DISTINCT FROM false)
 THEN RAISE EXCEPTION 'TK614_TECHNICAL_ALIAS_ACTIVATED'; END IF;
${commonPost({aliases226Unchanged:true})}${resolverProbe(ORIGINAL,{wrongSlug:true,existing356:true})}
END
$tk614$;
${auditInsert('activate',plan,a,String(ORIGINAL))}${footer('activate')}`;
}

function renderReverse(plan,entries,a,digests){
  const all=q(plan.all_sha256);
  return header('reverse',plan,a)+contextGuard('reverse',a,digests)+planTables(plan.entries,entries)+`DO $tk614$
BEGIN
${a.prior_decision_id?` IF NOT EXISTS(SELECT 1 FROM public.tk614_admin_release_audit
      WHERE decision_id=${q(a.prior_decision_id)} AND all_sha256=${all})
 THEN RAISE EXCEPTION 'TK614_PRIOR_DECISION_NOT_FOUND'; END IF;
`:''} IF EXISTS(SELECT 1 FROM public.movekit_catalog_fk_bindings b JOIN tk614_plan_226 p ON p.catalog_id=b.catalog_id
      WHERE b.exercise_id<>p.exercise_id)
 THEN RAISE EXCEPTION 'TK614_REVERSE_SCOPE_MISMATCH'; END IF;
END
$tk614$;
${BEFORE}UPDATE public.movekit_catalog_fk_bindings b SET active=false, reviewed_at=NULL
  FROM tk614_plan_226 p
 WHERE b.catalog_id=p.catalog_id AND b.exercise_id=p.exercise_id AND (b.active OR b.reviewed_at IS NOT NULL);
DO $tk614$
BEGIN
 IF EXISTS(SELECT 1 FROM public.movekit_catalog_fk_bindings WHERE catalog_id IN ${series(1,ORIGINAL,'TK-')}
      AND (active OR reviewed_at IS NOT NULL))
 THEN RAISE EXCEPTION 'TK614_REVERSE_INCOMPLETE'; END IF;
${commonPost({aliases226Unchanged:true})}${resolverProbe(0)}
END
$tk614$;
${auditInsert('reverse',plan,a,'b.released_226')}${footer('reverse')}`;
}

// Static contract every rendered phase file must satisfy before it is written.
const scanText=sql=>sql.split('\n').filter(l=>!l.trimStart().startsWith('--')).join('\n')
  .replace(/'(?:[^']|'')*'/g,"''").replace(/ON COMMIT DROP/g,'');
const FORBIDDEN_RELEASE_SQL=new RegExp('\\b(GRANT|REVOKE|ALTER|DROP|TRUNCATE|DELETE|POLICY|SECURITY\\s+DEFINER|'+
  'SET\\s+ROLE|RESET\\s+ROLE|SET\\s+SESSION|ROLLBACK|SAVEPOINT|session_replication_role|DISABLE|COPY|'+
  'CREATE\\s+(?:OR\\s+REPLACE\\s+)?(?:FUNCTION|PROCEDURE|TRIGGER|ROLE|POLICY|INDEX|SCHEMA|EXTENSION|VIEW|RULE|TABLE)|'+
  'movekit_media_grants|tk614_disposable_sandbox_marker)\\b','i');
const ALLOWED_INSERT=new Set(['public.exercises','public.movekit_catalog_fk_bindings','public.tk614_admin_release_audit',
  'tk614_expected_356','tk614_plan_226']);
function guardPhaseSql(phase,sql,a){
  need(PHASES.includes(phase)&&typeof sql==='string','PHASE_INVALID');
  const s=scanText(sql),bad=()=>fail('RELEASE_SQL_CONTRACT_VIOLATION');
  if(FORBIDDEN_RELEASE_SQL.test(s))bad();
  if(/(INSERT\s+INTO|UPDATE)\s+public\.sessions\b/i.test(s))bad();
  if((sql.match(/^BEGIN ISOLATION LEVEL REPEATABLE READ;$/gm)||[]).length!==1)bad();
  if(/^(BEGIN|START\s+TRANSACTION)\b(?! ISOLATION LEVEL REPEATABLE READ;$)(?!$)/gim.test(sql))bad();
  if((s.match(/\bCOMMIT\b/gi)||[]).length!==1||(sql.match(/^COMMIT;$/gm)||[]).length!==1)bad();
  if(!sql.startsWith('-- TK614 #603 PRIVATE ADMIN RELEASE CANDIDATE -- PHASE '+PHASE_LABEL[phase]+'\n'))bad();
  if(!sql.includes('\\set ON_ERROR_STOP on\nBEGIN ISOLATION LEVEL REPEATABLE READ;\n'))bad();
  if(!sql.endsWith(`COMMIT;\nSELECT '${MARKERS[phase]}' AS result;\n`))bad();
  const firstDo=sql.indexOf('DO $tk614$');
  for(const l of ['LOCK TABLE public.tk614_admin_release_audit IN EXCLUSIVE MODE;',
    'LOCK TABLE public.movekit_catalog_fk_bindings IN EXCLUSIVE MODE;','LOCK TABLE public.exercises IN SHARE ROW EXCLUSIVE MODE;'])
    if(!(sql.indexOf(l)>0&&sql.indexOf(l)<firstDo))bad();
  const inserts=[...s.matchAll(/\bINSERT\s+INTO\s+([A-Za-z0-9_.]+)/gi)].map(m=>m[1]);
  if(!inserts.every(t=>ALLOWED_INSERT.has(t)))bad();
  const updates=[...s.matchAll(/\bUPDATE\s+([A-Za-z0-9_.]+)/gi)].map(m=>m[1]);
  const cnt=t=>inserts.filter(x=>x===t).length;
  if(cnt('public.tk614_admin_release_audit')!==1)bad();
  const firstWrite=Math.min(...['INSERT INTO public.','UPDATE public.'].map(k=>{const i=sql.indexOf(k);return i<0?Infinity:i;}));
  if(!(sql.indexOf('TK614_JWT_CONTEXT_FORBIDDEN')>0&&sql.indexOf('TK614_JWT_CONTEXT_FORBIDDEN')<firstWrite))bad();
  if(!(sql.indexOf('TK614_DECISION_ALREADY_USED')>0&&sql.indexOf('TK614_DECISION_ALREADY_USED')<firstWrite))bad();
  if(!(sql.indexOf('TK614_SECOND_WRITER_ACTIVE')>0&&sql.indexOf('TK614_SECOND_WRITER_ACTIVE')<firstWrite))bad();
  const plain=s.replace(/\s+/g,' ');
  if(phase==='stage'){
    if(updates.length!==0||cnt('public.exercises')!==T.BATCH_COUNT||cnt('public.movekit_catalog_fk_bindings')!==T.BATCH_COUNT)bad();
    if(/active\s*=\s*true|SET\s+reviewed_at/i.test(plain))bad();
    if(!sql.includes('TK614_REGISTRY_SNAPSHOT_DRIFT')||!sql.includes('TK614_PRECONDITION_FINGERPRINT_DRIFT'))bad();
  }
  if(phase==='activate'){
    if(cnt('public.exercises')!==0||cnt('public.movekit_catalog_fk_bindings')!==0)bad();
    if(updates.length!==1||updates[0]!=='public.movekit_catalog_fk_bindings')bad();
    if(!/UPDATE public\.movekit_catalog_fk_bindings b SET reviewed_at='' ?::timestamptz, active=true /.test(plain))bad();
    for(const g of ['TK614_PRIOR_DECISION_NOT_FOUND','TK614_APPROVAL_NOT_BOUND_TO_PRIOR_STATE','TK614_CROSS_PROVIDER_DRIFT',
      'TK614_PARTIAL_OR_MISSING_STAGE','TK614_ALREADY_ACTIVE_OR_REVIEWED','TK614_ACTIVATE_IN_SAME_SESSION_AS_PRIOR_PHASE',
      'TK614_TECHNICAL_ALIAS_ACTIVATED','TK614_REGISTRY_SNAPSHOT_DRIFT','TK614_PRECONDITION_FINGERPRINT_DRIFT'])
      if(!sql.includes(g))bad();
  }
  if(phase==='reverse'){
    if(cnt('public.exercises')!==0||cnt('public.movekit_catalog_fk_bindings')!==0)bad();
    if(updates.length!==1||updates[0]!=='public.movekit_catalog_fk_bindings')bad();
    if(!plain.includes('UPDATE public.movekit_catalog_fk_bindings b SET active=false, reviewed_at=NULL FROM tk614_plan_226 p'))bad();
    if(/active\s*=\s*true/i.test(plain))bad();
  }
  if(a&&(!sql.includes(a.decision_id)||!sql.includes(a.approval_sha256)))bad();
  return sql;
}

// Read-only fingerprint file for the DBA. Writes nothing (READ ONLY + ROLLBACK).
function renderFingerprintSql(){
  const sql=`-- TK614 #603 READ-ONLY LIVE FINGERPRINT for the original-226 admin release candidate.
-- Writes nothing: READ ONLY transaction, ends with ROLLBACK. Run as the trusted postgres admin role.
-- Copy the single JSON line into the owner approval (approval-template --fingerprint).
\\set ON_ERROR_STOP on
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL search_path TO pg_catalog;
SET LOCAL TimeZone TO 'UTC';
SELECT json_build_object(
 'kind','${FINGERPRINT_KIND}',
 'server_version_num',current_setting('server_version_num'),
 'precondition_sha256',${PRECONDITION_EXPR},
 'registry_snapshot_sha256',${REGISTRY_EXPR},
 'session_user',session_user::text,
 'original_226_bindings',(SELECT count(*) FROM public.movekit_catalog_fk_bindings WHERE catalog_id IN ${series(1,ORIGINAL,'TK-')}),
 'original_226_released',(SELECT count(*) FROM public.movekit_catalog_fk_bindings WHERE catalog_id IN ${series(1,ORIGINAL,'TK-')}
    AND (active OR reviewed_at IS NOT NULL)),
 'existing_356_active_reviewed',(SELECT count(*) FROM public.movekit_catalog_fk_bindings WHERE catalog_id IN ${series(ORIGINAL+1,TOTAL,'TK-')}
    AND active AND reviewed_at IS NOT NULL),
 'legacy_tk_rows',(SELECT count(*) FROM public.exercises WHERE id ~ '^TK-[0-9]{6}$'),
 'latest_audit_decision_id',(SELECT a.decision_id FROM public.tk614_admin_release_audit a ORDER BY a.id DESC LIMIT 1),
 'latest_audit_registry_after_sha256',(SELECT a.registry_after_sha256 FROM public.tk614_admin_release_audit a ORDER BY a.id DESC LIMIT 1)
)::text AS tk614_fingerprint;
ROLLBACK;
`;
  const s=scanText(sql).replace(/\bROLLBACK;\s*$/,'');
  if(/\b(INSERT|UPDATE|DELETE|GRANT|REVOKE|ALTER|DROP|TRUNCATE|COMMIT|CREATE|LOCK)\b/i.test(s))fail('FINGERPRINT_SQL_NOT_READ_ONLY');
  return sql;
}
function parseFingerprintOutput(text){
  const line=String(text).split(/\r?\n/).map(l=>l.trim()).find(l=>l.startsWith('{')&&l.includes(FINGERPRINT_KIND));
  need(line,'FINGERPRINT_INVALID');
  let fp;try{fp=JSON.parse(line);}catch(_){fail('FINGERPRINT_INVALID');}
  return validateFingerprint(fp);
}

/**
 * Pure: verify everything and render ONE phase. input:
 *  {manifestBytes, catalogBytes, approval, confirmDecisionId, confirmApprovalSha256,
 *   tk504Sql, auditSql, releaseGates, now}
 * trust (library callers only, NEVER reachable from the CLI or env):
 *  {trustedOwnerKeySha256:[hex]}  -- default: the pinned (empty) list.
 */
function prepareRelease(phase,input,trust={}){
  need(PHASES.includes(phase),'PHASE_INVALID');
  need(Buffer.isBuffer(input.manifestBytes),'MANIFEST_BYTES_REQUIRED');
  let manifest;try{manifest=JSON.parse(input.manifestBytes.toString('utf8'));}catch(_){fail('MANIFEST_NOT_JSON');}
  // Pinned mapping + source catalog SHAs; no override is accepted here.
  const plan=T.planAll(manifest,input.catalogBytes);
  const {entries}=T.verifyAllPlan(plan,manifest);
  const manifestSha256=sha(input.manifestBytes);
  const a=input.approval;
  verifyApproval(a,{phase,plan,manifestSha256,confirmDecisionId:input.confirmDecisionId,
    confirmApprovalSha256:input.confirmApprovalSha256,now:input.now,releaseGates:input.releaseGates,
    trustedOwnerKeySha256:trust.trustedOwnerKeySha256});
  const digests=repoFunctionDigests(input.tk504Sql,input.auditSql);
  const sql=guardPhaseSql(phase,(phase==='stage'?renderStage:phase==='activate'?renderActivate:renderReverse)(
    plan,entries,a,digests),a);
  const report=Object.freeze({schema:SCHEMA_REPORT,status:'PRIVATE_ADMIN_SQL_RENDERED_NOT_EXECUTED',phase,
    phase_label:PHASE_LABEL[phase],decision_id:a.decision_id,prior_decision_id:a.prior_decision_id,
    approval_sha256:a.approval_sha256,all_sha256:plan.all_sha256,mapping_sha256:plan.source_mapping_sha256,
    source_catalog_sha256:plan.source_catalog_sha256,private_manifest_sha256:manifestSha256,
    sql_sha256:sha(Buffer.from(sql,'utf8')),scope:{first:'TK-000001',last:'TK-'+pad(ORIGINAL),count:ORIGINAL},
    expected_marker:MARKERS[phase],database_writes_performed:false,activation_executed:false});
  return {plan,sql,report,manifest};
}

// ---------------------------------------------------------------------------
// CLI
const COMMANDS=Object.freeze({
  fingerprint:{flags:['--out'],required:['--out']},
  'approval-template':{flags:['--phase','--manifest','--fingerprint','--decision-id','--prior-decision-id','--approved-by','--out'],
    required:['--phase','--manifest','--decision-id','--approved-by','--out']},
  seal:{flags:['--approval','--out'],required:['--approval','--out']},
  render:{flags:['--phase','--manifest','--approval','--confirm-decision-id','--confirm-approval-sha256','--out'],
    required:['--phase','--manifest','--approval','--confirm-decision-id','--confirm-approval-sha256','--out']},
  status:{flags:['--manifest'],required:['--manifest']}});
const PATH_FLAGS=['--out','--manifest','--fingerprint','--approval'];
const USAGE='Usage: tk614_original226_admin_release.cjs <fingerprint|approval-template|seal|render|status> [flags]; '+
  'see docs/TK614_ORIGINAL226_ADMIN_RELEASE_CANDIDATE_20261108.md';
function parseArgs(argv){
  const cmd=argv[0],spec=COMMANDS[cmd];
  if(!spec){const e=Error(USAGE);e.code='USAGE';throw e;}
  const o={};
  for(let i=1;i<argv.length;i+=2){
    const k=argv[i];
    if(!spec.flags.includes(k)||i+1>=argv.length||o[k]!==undefined){const e=Error(USAGE);e.code='USAGE';throw e;}
    o[k]=argv[i+1];
  }
  for(const k of spec.required)need(o[k]!==undefined,'USAGE');
  for(const k of PATH_FLAGS)if(o[k]!==undefined){
    need(path.isAbsolute(o[k]),'PATH_MUST_BE_ABSOLUTE');
    o[k]=path.resolve(o[k]);
    need(safelyOutsideRepo(o[k]),k==='--out'?'PRIVATE_OUTPUT_INSIDE_REPOSITORY':'PRIVATE_INPUT_INSIDE_REPOSITORY');
  }
  if(o['--phase']!==undefined)need(PHASES.includes(o['--phase']),'PHASE_INVALID');
  if(o['--out']!==undefined)need(!fs.existsSync(o['--out']),'EEXIST_PRIVATE_OUTPUT');
  return {cmd,o};
}
function writeExclusive(dest,text){
  const fd=fs.openSync(dest,'wx',0o600);
  try{fs.writeFileSync(fd,text,'utf8');}finally{fs.closeSync(fd);}
}
const readJson=f=>{try{return JSON.parse(fs.readFileSync(f,'utf8'));}catch(_){fail('PRIVATE_INPUT_NOT_JSON');}};
const repoInputs=()=>({catalogBytes:fs.readFileSync(path.join(ROOT,'exercise-catalog.json')),
  tk504Sql:fs.readFileSync(TK504_STAGE_FILE,'utf8'),auditSql:fs.readFileSync(TK614_AUDIT_FILE,'utf8'),
  releaseGates:JSON.parse(fs.readFileSync(RELEASE_GATES_FILE,'utf8'))});

function run(argv,io={}){
  const out=io.stdout||(x=>process.stdout.write(x));
  const {cmd,o}=parseArgs(argv);
  let report;
  if(cmd==='fingerprint'){
    const sql=renderFingerprintSql();
    writeExclusive(o['--out'],sql);
    report={status:'READ_ONLY_FINGERPRINT_SQL_WRITTEN',sql_sha256:sha(Buffer.from(sql,'utf8')),database_writes_performed:false};
  }else if(cmd==='status'){
    const r=repoInputs(),manifestBytes=fs.readFileSync(o['--manifest']);
    const manifest=JSON.parse(manifestBytes.toString('utf8'));
    const plan=T.planAll(manifest,r.catalogBytes);T.verifyAllPlan(plan,manifest);
    repoFunctionDigests(r.tk504Sql,r.auditSql);
    const blockers=activationBlockers(r.releaseGates);
    report={schema:SCHEMA_REPORT,status:'STATUS',all_sha256:plan.all_sha256,private_manifest_sha256:sha(manifestBytes),
      stage:'RENDERABLE_WITH_DBA_APPROVED_OWNER_DECISION_AND_LIVE_FINGERPRINT',
      activate:blockers.length?'BLOCKED':'RENDERABLE_WITH_SIGNED_OWNER_DECISION',activation_blockers:blockers,
      reverse:'RENDERABLE_WITH_DBA_APPROVED_OWNER_DECISION',database_writes_performed:false};
  }else if(cmd==='approval-template'){
    const r=repoInputs(),manifestBytes=fs.readFileSync(o['--manifest']);
    const manifest=JSON.parse(manifestBytes.toString('utf8'));
    const plan=T.planAll(manifest,r.catalogBytes);T.verifyAllPlan(plan,manifest);
    const phase=o['--phase'];
    const fingerprint=o['--fingerprint']?validateFingerprint(readJson(o['--fingerprint'])):undefined;
    need(phase==='reverse'||fingerprint,'FINGERPRINT_REQUIRED');
    const a=buildApproval({phase,decisionId:o['--decision-id'],priorDecisionId:o['--prior-decision-id']||null,
      approvedBy:o['--approved-by'],approvedAt:new Date().toISOString(),plan,manifestSha256:sha(manifestBytes),fingerprint});
    writeExclusive(o['--out'],JSON.stringify(a,null,2)+'\n');
    report={status:'UNSIGNED_APPROVAL_DRAFT_WRITTEN_AUTHORISES_NOTHING',phase,decision_id:a.decision_id,
      approval_sha256:a.approval_sha256,database_writes_performed:false};
  }else if(cmd==='seal'){
    const a=sealApproval(readJson(o['--approval']));
    writeExclusive(o['--out'],JSON.stringify(a,null,2)+'\n');
    report={status:'APPROVAL_DIGEST_RECOMPUTED_SIGNATURE_CLEARED',phase:a.phase,decision_id:a.decision_id,
      approval_sha256:a.approval_sha256,database_writes_performed:false};
  }else{
    const r=repoInputs();
    // No trust override from the CLI: the pinned owner-key list and the repo release gates apply.
    const {sql,report:rep}=prepareRelease(o['--phase'],{...r,manifestBytes:fs.readFileSync(o['--manifest']),
      approval:readJson(o['--approval']),confirmDecisionId:o['--confirm-decision-id'],
      confirmApprovalSha256:o['--confirm-approval-sha256']});
    writeExclusive(o['--out'],sql);
    report={...rep,private_sql_created:true};
  }
  out(JSON.stringify(report)+'\n');
  return report;
}
if(require.main===module){
  try{run(process.argv.slice(2));}
  catch(e){process.stderr.write('TK614_ADMIN_RELEASE_BLOCKED: '+(e.code||e.message)+'\n');process.exitCode=1;}
}
module.exports=Object.freeze({SCHEMA_APPROVAL,SCHEMA_REPORT,FINGERPRINT_KIND,PHASES,PHASE_LABEL,MARKERS,DECISION_RE,
  TRUSTED_OWNER_KEY_SHA256,ACTIVATION_GATES,TK603_RESERVED_GUARD_SHA256,GUARDED_FUNCTIONS,MAX_APPROVAL_AGE_MS,
  PRECONDITION_EXPR,REGISTRY_EXPR,PROBE_UID,
  canonicalJson,approvalDigest,buildApproval,sealApproval,signApproval,pendingGates,validateFingerprint,
  original226Released,activationBlockers,verifyApproval,repoFunctionDigests,renderFingerprintSql,
  parseFingerprintOutput,guardPhaseSql,prepareRelease,parseArgs,run});
