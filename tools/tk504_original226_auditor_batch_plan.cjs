#!/usr/bin/env node
'use strict';
// TK504/#614 -- OFFLINE, deterministic auditor allowlist BATCH PLAN for the 226 ORIGINAL MoveKit
// private Storage objects. Produces the exact rows a separately approved, privileged DBA could
// later seed into public.tk504_original226_audit_allowed_objects for ONE batch of <= 25
// consecutive original catalog IDs (each exactly one video + one poster).
//
// Fail-closed order: (1) pinned manifest FILE sha256, (2) full 452-entry validation via the
// existing verifier's productionManifestProblems, (3) pinned totals.all_sha256, (4) only then
// batch selection via the existing selectBatchEntries, plus strict per-row re-derivation of
// object_name from the validated storage_path AND from the migration's generated-column formula.
//
// IMPORTANT: matching manifest METADATA (bytes/sha256 recorded at staging time) is NOT a body
// SHA of the live Storage object. This tool performs zero Storage GETs; live byte verification
// is a separate, lease-gated step. The plan is never attestation evidence.
//
// Authorizes nothing: no network, no env reads, no credentials, no DB/SQL access, no shell/child
// processes, no GitHub. The only file write is the OPTIONAL --review-sql file, which must be an
// explicit absolute *.sql path OUTSIDE the repository, newly created (never overwritten). That SQL
// is review-only source: it is never executed here and ends in ROLLBACK by design.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const V = require('./tk504_private_storage_byte_sha_verify.cjs');

const ROOT = path.resolve(__dirname, '..');
const SCHEMA = 'tk504-original226-auditor-batch-plan/1.0';
const MODE = 'offline-batch-plan';
const TARGET_TABLE = 'public.tk504_original226_audit_allowed_objects';
const PINNED_MANIFEST_FILE_SHA256 = '67dd9c9f51ace53d97dfafc047f27603c72013ada1f5fd967273806c1da7050e';
const PINNED_MANIFEST_ALL_SHA256 = '8492f2c14521b9443db3f1c875b936cd8bddc96fbacc0837c9558c5a95738b10';
const NOTE = 'Manifest metadata (bytes/sha256 recorded at staging) is NOT a body SHA of live Storage objects; ' +
  'storage_gets=0 and live_byte_sha_verified=0. Plan only: seeding requires separate owner+DBA+security approval.';
// Mirrors supabase/migrations/20261111071021_tk504_original226_private_auditor_read_lease_stage.sql.
const MIGRATION_CATALOG_RE = /^TK-000(00[1-9]|0[1-9][0-9]|1[0-9][0-9]|2[01][0-9]|22[0-6])$/;
const MIGRATION_PROVIDER_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const PROVIDER_MAX = 128;
const BUCKET_OBJECT = Object.freeze({
  'exercise-media': Object.freeze({ kind: 'video', order: 0, objectName: p => 'movekit/v2/video/' + p + '.mp4' }),
  'exercise-posters': Object.freeze({ kind: 'poster', order: 1, objectName: p => 'movekit/v2/poster-optimized/' + p + '.webp' })
});
const ROW_KEYS = Object.freeze(['catalog_id', 'provider_id', 'bucket_id', 'object_name', 'bytes', 'sha256']);
const ORIGINAL_LAST = 226;

function fail(code) { const e = new Error(code); e.code = code; throw e; }
function need(ok, code) { if (!ok) fail(code); }
const sha256 = buf => crypto.createHash('sha256').update(buf).digest('hex');
const cidNum = id => Number(id.slice(3));

// Pure: raw manifest bytes -> validated plan object. Throws { code } on any problem.
// `pins` is injectable ONLY so tests can exercise synthetic fixtures; the CLI never passes it.
function buildBatchPlan(raw, startId, size, pins = {}) {
  const fileSha = pins.fileSha256 === undefined ? PINNED_MANIFEST_FILE_SHA256 : pins.fileSha256;
  const allSha = pins.allSha256 === undefined ? PINNED_MANIFEST_ALL_SHA256 : pins.allSha256;
  need(Buffer.isBuffer(raw) && raw.length > 0, 'MANIFEST_MISSING');
  const actualFileSha = sha256(raw);
  need(actualFileSha === fileSha, 'MANIFEST_FILE_SHA256_PIN_MISMATCH');
  let m;
  try { m = JSON.parse(raw.toString('utf8')); } catch (_) { fail('MANIFEST_MALFORMED_JSON'); }
  const problems = V.productionManifestProblems(m);
  need(problems.length === 0, 'MANIFEST_INVALID');
  need(m.totals.all_sha256 === allSha, 'MANIFEST_ALL_SHA256_PIN_MISMATCH');

  // Full-manifest identity maps for ambiguity checks (already validated, re-asserted here).
  const cidByProvider = new Map(), providerByCid = new Map();
  for (const e of m.entries) {
    need(MIGRATION_CATALOG_RE.test(e.catalog_id) && cidNum(e.catalog_id) <= ORIGINAL_LAST, 'MANIFEST_NON_ORIGINAL_ID');
    need(!cidByProvider.has(e.provider_id) || cidByProvider.get(e.provider_id) === e.catalog_id, 'PROVIDER_AMBIGUOUS');
    need(!providerByCid.has(e.catalog_id) || providerByCid.get(e.catalog_id) === e.provider_id, 'PROVIDER_MISMATCH');
    cidByProvider.set(e.provider_id, e.catalog_id); providerByCid.set(e.catalog_id, e.provider_id);
  }

  const sel = V.selectBatchEntries(m, startId, size);
  const lo = cidNum(sel.range.start_id), hi = cidNum(sel.range.end_id);
  const rows = sel.entries.map(e => {
    need(typeof e.catalog_id === 'string' && MIGRATION_CATALOG_RE.test(e.catalog_id), 'ROW_CATALOG_ID_INVALID');
    const n = cidNum(e.catalog_id);
    need(n >= lo && n <= hi && n <= ORIGINAL_LAST, 'ROW_OUT_OF_BATCH');
    need(typeof e.provider_id === 'string' && e.provider_id.length >= 1 && e.provider_id.length <= PROVIDER_MAX &&
      MIGRATION_PROVIDER_RE.test(e.provider_id), 'ROW_PROVIDER_ID_INVALID');
    need(Object.hasOwn(BUCKET_OBJECT, e.bucket), 'ROW_BUCKET_INVALID');
    const b = BUCKET_OBJECT[e.bucket];
    need(e.media_type === b.kind, 'ROW_KIND_BUCKET_MISMATCH');
    const k = V.KINDS[e.media_type];
    const mm = k.path.exec(e.storage_path);
    need(mm && mm[1] === e.provider_id, 'ROW_PATH_NOT_CANONICAL');
    // object_name: taken from the validated storage_path, and must equal the migration formula.
    need(e.storage_path === b.objectName(e.provider_id), 'ROW_OBJECT_NAME_FORMULA_MISMATCH');
    return { catalog_id: e.catalog_id, provider_id: e.provider_id, bucket_id: e.bucket,
      object_name: e.storage_path, bytes: e.bytes, sha256: e.sha256 };
  }).sort((a, b) => cidNum(a.catalog_id) - cidNum(b.catalog_id) ||
    BUCKET_OBJECT[a.bucket_id].order - BUCKET_OBJECT[b.bucket_id].order);

  const targets = new Set(rows.map(r => r.bucket_id + '/' + r.object_name));
  const pks = new Set(rows.map(r => r.catalog_id + '|' + r.bucket_id));
  const providers = new Set(rows.map(r => r.provider_id));
  const cids = new Set(rows.map(r => r.catalog_id));
  need(rows.length === 2 * size && targets.size === rows.length && pks.size === rows.length, 'BATCH_DUPLICATE_TARGET');
  need(cids.size === size && providers.size === size, 'BATCH_PROVIDER_PAIRING_INVALID');
  for (const id of cids) {
    const pair = rows.filter(r => r.catalog_id === id);
    need(pair.length === 2 && pair[0].provider_id === pair[1].provider_id &&
      pair[0].bucket_id === 'exercise-media' && pair[1].bucket_id === 'exercise-posters', 'BATCH_PROVIDER_PAIRING_INVALID');
  }

  return {
    schema: SCHEMA, mode: MODE, status: 'PLAN_ONLY_NOT_APPLIED',
    authorizes_nothing: true, storage_gets: 0, live_byte_sha_verified: 0, attestation_eligible: false,
    note: NOTE,
    manifest: { file: V.MANIFEST_REL, file_sha256: actualFileSha, all_sha256: m.totals.all_sha256, entries: m.entries.length },
    target_table: TARGET_TABLE,
    batch: { start_id: sel.range.start_id, end_id: sel.range.end_id, exercise_count: cids.size,
      object_count: rows.length, unique_target_count: targets.size, unique_provider_count: providers.size },
    rows_sha256: sha256(Buffer.from(JSON.stringify(rows), 'utf8')),
    rows
  };
}

// ---------------------------------------------------------------------------
// Review-only SQL source. Values are already regex-validated; quoting still refuses quotes.
function sqlLit(s) {
  need(typeof s === 'string' && /^[A-Za-z0-9._\/-]+$/.test(s), 'SQL_LITERAL_UNSAFE');
  return "'" + s + "'";
}
function reviewSql(plan) {
  need(plan && plan.mode === MODE && Array.isArray(plan.rows) && plan.rows.length >= 2, 'PLAN_INVALID');
  const n = plan.rows.length;
  const L = [];
  L.push('-- TK504 REVIEW-ONLY SQL SOURCE. GENERATED OFFLINE. NOT EXECUTED BY ANY TOOL.');
  L.push('-- Seeds ' + n + ' rows (' + plan.batch.exercise_count + ' original exercises, ' + plan.batch.start_id + '..' + plan.batch.end_id + ') into ' + TARGET_TABLE + '.');
  L.push('-- Requires separate owner + DBA + security approval and privileged execution. Auditor roles may not write.');
  L.push('-- manifest_file_sha256=' + plan.manifest.file_sha256);
  L.push('-- manifest_all_sha256=' + plan.manifest.all_sha256);
  L.push('-- rows_sha256=' + plan.rows_sha256);
  L.push('-- ' + NOTE);
  L.push('-- Ends in ROLLBACK on purpose: accidental execution changes nothing. The approved DBA replaces');
  L.push('-- the final ROLLBACK with COMMIT only in the separately reviewed execution copy.');
  L.push('');
  L.push('begin;');
  L.push("set local lock_timeout = '3s';");
  L.push("set local statement_timeout = '30s';");
  L.push('lock table public.tk504_original226_audit_leases in share row exclusive mode;');
  L.push('lock table ' + TARGET_TABLE + ' in share row exclusive mode;');
  L.push('do $$ begin');
  L.push("  if to_regclass('" + TARGET_TABLE + "') is null then raise exception 'TK504_AUDIT_ALLOWLIST_TABLE_NOT_PRESENT'; end if;");
  L.push("  if exists (select 1 from public.tk504_original226_audit_leases where active is true) then raise exception 'TK504_ACTIVE_AUDITOR_SEED_BLOCKED'; end if;");
  L.push("  if exists (select 1 from " + TARGET_TABLE + ") then raise exception 'TK504_ALLOWLIST_ALREADY_POPULATED'; end if;");
  L.push('end $$;');
  L.push('');
  L.push('insert into ' + TARGET_TABLE + ' (catalog_id, provider_id, bucket_id) values');
  plan.rows.forEach((r, i) => {
    L.push('  (' + [r.catalog_id, r.provider_id, r.bucket_id].map(sqlLit).join(', ') + ')' + (i === n - 1 ? ';' : ',') +
      ' -- bytes=' + Number(r.bytes) + ' sha256=' + (/^[0-9a-f]{64}$/.test(r.sha256) ? r.sha256 : fail('SQL_LITERAL_UNSAFE')));
  });
  L.push('');
  L.push('do $$ declare n integer; begin');
  L.push('  select count(*) into n');
  L.push('    from ' + TARGET_TABLE + ' a');
  L.push('    join (values');
  plan.rows.forEach((r, i) => {
    L.push('      (' + [r.catalog_id, r.bucket_id, r.object_name].map(sqlLit).join(', ') + ')' + (i === n - 1 ? '' : ','));
  });
  L.push('    ) as x(catalog_id, bucket_id, object_name)');
  L.push('      on a.catalog_id = x.catalog_id and a.bucket_id = x.bucket_id and a.object_name = x.object_name;');
  L.push('  if n <> ' + n + " then raise exception 'TK504_AUDIT_ALLOWLIST_BATCH_MISMATCH'; end if;");
  L.push('end $$;');
  L.push('');
  L.push('rollback;');
  return L.join('\n') + '\n';
}

// Explicit absolute *.sql path outside the repo; parent must exist; never overwrite.
function safeOutputPath(p, root = ROOT) {
  need(typeof p === 'string' && p.length > 0 && p.length <= 1024 && !/[\0\r\n]/.test(p), 'OUTPUT_PATH_INVALID');
  need(path.isAbsolute(p), 'OUTPUT_PATH_NOT_ABSOLUTE');
  need(!p.split(/[\\/]+/).includes('..'), 'OUTPUT_PATH_TRAVERSAL');
  const abs = path.resolve(p);
  need(path.extname(abs).toLowerCase() === '.sql', 'OUTPUT_PATH_NOT_SQL');
  const inside = (base, target) => {
    const rel = path.relative(base, target);
    return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
  };
  const norm = s => (process.platform === 'win32' ? s.toLowerCase() : s);
  const rootReal = (() => { try { return fs.realpathSync.native(root); } catch (_) { return path.resolve(root); } })();
  need(!inside(norm(path.resolve(root)), norm(abs)) && !inside(norm(rootReal), norm(abs)), 'OUTPUT_PATH_INSIDE_REPO');
  let parentReal;
  try { parentReal = fs.realpathSync.native(path.dirname(abs)); } catch (_) { fail('OUTPUT_PARENT_MISSING'); }
  need(fs.statSync(parentReal).isDirectory(), 'OUTPUT_PARENT_MISSING');
  need(!inside(norm(rootReal), norm(parentReal)) && !inside(norm(path.resolve(root)), norm(parentReal)), 'OUTPUT_PATH_INSIDE_REPO');
  return path.join(parentReal, path.basename(abs));
}
function writeNewFile(target, text) {
  let fd;
  try { fd = fs.openSync(target, 'wx', 0o600); } catch (e) { fail(e && e.code === 'EEXIST' ? 'OUTPUT_EXISTS' : 'OUTPUT_WRITE_FAILED'); }
  try { fs.writeSync(fd, text, null, 'utf8'); } finally { fs.closeSync(fd); }
}

// ---------------------------------------------------------------------------
// CLI
const USAGE = [
  'Usage:',
  '  node tools/tk504_original226_auditor_batch_plan.cjs [--check] --batch-start-id TK-000NNN --batch-size 1..25',
  '       [--review-sql <absolute *.sql path OUTSIDE the repo, must not exist>]',
  'Offline only. Prints a stable JSON plan; never executes SQL, never touches network/env/credentials.'
].join('\n');

function parseArgs(argv) {
  need(Array.isArray(argv), 'USAGE');
  const o = { check: false, startId: null, size: null, reviewSql: null };
  const seen = new Set();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    need(typeof a === 'string' && !seen.has(a), 'USAGE');
    seen.add(a);
    if (a === '--check') { o.check = true; continue; }
    const v = argv[i + 1];
    need(typeof v === 'string' && !v.startsWith('--'), 'USAGE');
    i++;
    if (a === '--batch-start-id') { need(/^TK-[0-9]{6}$/.test(v), 'USAGE'); o.startId = v; }
    else if (a === '--batch-size') { need(/^[1-9][0-9]?$/.test(v), 'USAGE'); o.size = Number(v); }
    else if (a === '--review-sql') o.reviewSql = v;
    else fail('USAGE');
  }
  need(o.startId !== null && o.size !== null, 'USAGE');
  return o;
}

function run(argv = process.argv.slice(2), io = {}) {
  const out = io.stdout || (s => process.stdout.write(s + '\n'));
  const err = io.stderr || (s => process.stderr.write(s + '\n'));
  const manifestFile = io.manifestFile || V.MANIFEST_FILE;
  let o;
  try { o = parseArgs(argv); } catch (_) { err(USAGE); return 2; }
  try {
    let raw;
    try { raw = fs.readFileSync(manifestFile); } catch (_) { fail('MANIFEST_MISSING'); }
    const plan = buildBatchPlan(raw, o.startId, o.size);
    let result = plan;
    if (o.reviewSql !== null) {
      const target = safeOutputPath(o.reviewSql, io.root || ROOT);
      const sql = reviewSql(plan);
      writeNewFile(target, sql);
      result = { ...plan, review_sql: { written: true, executed: false, sha256: sha256(Buffer.from(sql, 'utf8')) } };
    }
    out(JSON.stringify(result, null, 2));
    return 0;
  } catch (e) {
    const code = e && typeof e.code === 'string' && /^[A-Z0-9_]+$/.test(e.code) ? e.code : 'INTERNAL_ERROR';
    err(JSON.stringify({ status: 'BLOCKED', reason: code }));
    return 1;
  }
}

if (require.main === module) process.exitCode = run();

module.exports = Object.freeze({ SCHEMA, MODE, TARGET_TABLE, PINNED_MANIFEST_FILE_SHA256, PINNED_MANIFEST_ALL_SHA256,
  ROW_KEYS, USAGE, buildBatchPlan, reviewSql, safeOutputPath, parseArgs, run });
