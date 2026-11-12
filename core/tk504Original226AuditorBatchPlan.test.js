'use strict';
// TK504/#614 -- OFFLINE auditor allowlist batch plan. Uses the real pinned 452-entry manifest
// and synthetic in-memory mutations only. No network, no credentials, no env, no DB/SQL execution.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const P = require('../tools/tk504_original226_auditor_batch_plan.cjs');
const V = require('../tools/tk504_private_storage_byte_sha_verify.cjs');
const S = require('../tools/tk614_original226_private_media_staging.cjs');

let checks = 0;
const ok = (v, m) => { assert.ok(v, m); checks++; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks++; };
const throwsCode = (fn, code, m) => { assert.throws(fn, e => e.code === code, m || code); checks++; };
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const canonical = b => Buffer.from(b.toString('utf8').replace(/\r\n/g, '\n'), 'utf8');
const canonicalSha = b => sha(canonical(b));
const cid = n => 'TK-' + String(n).padStart(6, '0');
const RAW = fs.readFileSync(V.MANIFEST_FILE);
const BASE = JSON.parse(RAW.toString('utf8'));
// Re-serialize a mutated clone with a recomputed self-digest and inject matching pins, so the
// test proves rejection comes from full-manifest validation, not merely from the pins.
const repinned = mutate => {
  const m = structuredClone(BASE); mutate(m);
  m.totals.all_sha256 = S.manifestDigest(m);
  const raw = Buffer.from(S.serializeManifest(m), 'utf8');
  return { raw, pins: { fileSha256: canonicalSha(raw), allSha256: m.totals.all_sha256 } };
};

// 1. First packet: exactly 25 exercises / 50 rows, canonical migration columns, stable order.
const first = P.buildBatchPlan(RAW, 'TK-000001', 25);
eq([first.mode, first.authorizes_nothing, first.storage_gets, first.live_byte_sha_verified, first.attestation_eligible],
  ['offline-batch-plan', true, 0, 0, false], 'inert flags');
eq([first.manifest.file_sha256, first.manifest.all_sha256, first.manifest.entries],
  [P.PINNED_MANIFEST_FILE_SHA256, P.PINNED_MANIFEST_ALL_SHA256, 452], 'pinned digests reported');
eq([first.batch.exercise_count, first.batch.object_count, first.batch.unique_target_count, first.rows.length], [25, 50, 50, 50], 'first packet counts');
ok(first.rows.every(r => JSON.stringify(Object.keys(r)) === JSON.stringify(P.ROW_KEYS)), 'exact row keys');
eq(first.rows.map(r => r.catalog_id + ':' + r.bucket_id),
  Array.from({ length: 25 }, (_, i) => [cid(i + 1) + ':exercise-media', cid(i + 1) + ':exercise-posters']).flat(), 'numeric id then video/poster order');
ok(first.rows.every(r => r.object_name === (r.bucket_id === 'exercise-media'
  ? 'movekit/v2/video/' + r.provider_id + '.mp4' : 'movekit/v2/poster-optimized/' + r.provider_id + '.webp')), 'object_name matches migration formula');
ok(/NOT a body SHA/.test(first.note), 'metadata-is-not-body-SHA note present');
eq(P.buildBatchPlan(RAW, 'TK-000001', 25), first, 'deterministic');
eq(P.buildBatchPlan(canonical(RAW), 'TK-000001', 25), first, 'LF Linux equals CRLF Windows canonical manifest');

// 2. Final packet: exactly 2 rows.
const last = P.buildBatchPlan(RAW, 'TK-000226', 1);
eq([last.rows.length, last.batch.start_id, last.batch.end_id, last.rows[0].bucket_id, last.rows[1].bucket_id],
  [2, 'TK-000226', 'TK-000226', 'exercise-media', 'exercise-posters'], 'final packet');

// 3. 9x25 + 1x1 covers all 452 manifest objects without overlap.
const all = [];
for (let s = 1; s <= 201; s += 25) all.push(...P.buildBatchPlan(RAW, cid(s), 25).rows);
all.push(...last.rows);
const keys = all.map(r => r.bucket_id + '/' + r.object_name);
eq([all.length, new Set(keys).size], [452, 452], 'no overlap');
eq([...keys].sort(), BASE.entries.map(e => e.bucket + '/' + e.storage_path).sort(), 'exact manifest coverage');

// 4. Invalid range / IDs / sizes.
for (const [id, n, code] of [['TK-000000', 1, 'BATCH_START_ID_INVALID'], ['TK-000227', 1, 'BATCH_START_ID_INVALID'],
  ['tk-000001', 1, 'BATCH_START_ID_INVALID'], ['TK-000210', 25, 'BATCH_RANGE_OVERFLOW'],
  ['TK-000001', 26, 'BATCH_SIZE_INVALID'], ['TK-000001', 0, 'BATCH_SIZE_INVALID']])
  throwsCode(() => P.buildBatchPlan(RAW, id, n), code, id + '/' + n);

// 5. Digest pins and missing manifest.
const flipped = Buffer.from(RAW); flipped[flipped.indexOf('0e5eea10')] = 0x31; // '0' -> '1' in a sha
throwsCode(() => P.buildBatchPlan(flipped, 'TK-000001', 25), 'MANIFEST_FILE_SHA256_PIN_MISMATCH', 'file pin');
throwsCode(() => P.buildBatchPlan(flipped, 'TK-000001', 25, { fileSha256: canonicalSha(flipped) }), 'MANIFEST_INVALID', 'self-digest');
throwsCode(() => P.buildBatchPlan(RAW, 'TK-000001', 25, { allSha256: '0'.repeat(64) }), 'MANIFEST_ALL_SHA256_PIN_MISMATCH', 'all pin');
throwsCode(() => P.buildBatchPlan(Buffer.alloc(0), 'TK-000001', 25), 'MANIFEST_MISSING', 'empty');

// 6. Re-pinned synthetic mutations still fail full validation.
const mutations = {
  missingProvider: m => { delete m.entries[3].provider_id; },
  extra227: m => { m.entries[450].catalog_id = 'TK-000227'; m.entries[451].catalog_id = 'TK-000227'; },
  duplicatePath: m => { Object.assign(m.entries[3], { provider_id: m.entries[1].provider_id, storage_path: m.entries[1].storage_path }); },
  ambiguousProvider: m => { for (const i of [2, 3]) Object.assign(m.entries[i], { provider_id: m.entries[0].provider_id, storage_path: m.entries[i - 2].storage_path }); },
  nonCanonicalPath: m => { m.entries[0].storage_path = 'movekit/v2/video/../' + m.entries[0].provider_id + '.mp4'; }
};
for (const [name, fn] of Object.entries(mutations)) {
  const { raw, pins } = repinned(fn);
  throwsCode(() => P.buildBatchPlan(raw, 'TK-000001', 25, pins), 'MANIFEST_INVALID', name);
}

// 7. CLI: invalid usage -> nonzero, no stdout; missing manifest -> BLOCKED; no partial result.
const cli = (argv, io = {}) => { const o = [], e = []; const code = P.run(argv, { stdout: s => o.push(s), stderr: s => e.push(s), ...io }); return { code, out: o.join(''), err: e.join('') }; };
for (const argv of [[], ['--check'], ['--batch-start-id', 'TK-000001'], ['--batch-start-id', 'TK-000001', '--batch-size', '25', '--batch-size', '1'],
  ['--batch-start-id', 'TK-000001', '--batch-size', '25', '--live'], ['--batch-start-id', 'TK-000001', '--batch-size', '-1']]) {
  const r = cli(argv); ok(r.code === 2 && r.out === '', 'usage ' + argv.join(' '));
}
const missing = cli(['--batch-start-id', 'TK-000001', '--batch-size', '25'], { manifestFile: path.join(os.tmpdir(), 'tk504-no-such-manifest.json') });
ok(missing.code === 1 && missing.out === '' && /MANIFEST_MISSING/.test(missing.err), 'missing manifest blocked');
const good = cli(['--check', '--batch-start-id', 'TK-000001', '--batch-size', '25']);
eq([good.code, JSON.parse(good.out).rows_sha256], [0, first.rows_sha256], 'CLI first packet');

// 8. Review SQL: explicit absolute path outside repo only; never overwrites; inert ROLLBACK.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tk504-plan-'));
try {
  const target = path.join(dir, 'batch01.sql');
  const w = cli(['--batch-start-id', 'TK-000001', '--batch-size', '25', '--review-sql', target]);
  const sql = fs.readFileSync(target, 'utf8');
  ok(sql.includes('do $$ begin') && sql.includes('end $$;') && !sql.includes('do $ begin') && !sql.includes('end $;'), 'review SQL uses valid dollar-quoted DO blocks');
  ok(sql.includes('lock table public.tk504_original226_audit_leases') && sql.includes('TK504_ACTIVE_AUDITOR_SEED_BLOCKED') && sql.includes('TK504_ALLOWLIST_ALREADY_POPULATED'), 'safe batch staging blocked while lease active or prior allowlist populated');
  ok(w.code === 0 && JSON.parse(w.out).review_sql.executed === false, 'sql written, not executed');
  eq([(sql.match(/^ {2}\('TK-0000\d\d', '[a-z0-9-]+', 'exercise-(media|posters)'\)[,;]/gm) || []).length,
    /\nrollback;\n$/.test(sql), /\bcommit\s*;/i.test(sql.replace(/^--.*$/gm, ''))], [50, true, false], 'sql shape');
  const again = cli(['--batch-start-id', 'TK-000001', '--batch-size', '25', '--review-sql', target]);
  ok(again.code === 1 && again.out === '' && /OUTPUT_EXISTS/.test(again.err) && fs.readFileSync(target, 'utf8') === sql, 'no overwrite');
  for (const [p, code] of [['relative.sql', 'OUTPUT_PATH_NOT_ABSOLUTE'], [path.join(__dirname, 'x.sql'), 'OUTPUT_PATH_INSIDE_REPO'],
    [dir + path.sep + '..' + path.sep + 'x.sql', 'OUTPUT_PATH_TRAVERSAL'], [path.join(dir, 'x.json'), 'OUTPUT_PATH_NOT_SQL'],
    [path.join(dir, 'nope', 'x.sql'), 'OUTPUT_PARENT_MISSING']])
    throwsCode(() => P.safeOutputPath(p), code, 'path ' + code);
} finally { fs.rmSync(dir, { recursive: true, force: true }); }

// 9. No network / env / shell / credentials in the plan tool; original verifier --check unchanged and green.
const src = fs.readFileSync(path.join(__dirname, '..', 'tools', 'tk504_original226_auditor_batch_plan.cjs'), 'utf8');
ok(!/process\.env|child_process|fetch\(|require\('node:(https?|net|tls|dns)'\)|sb_secret|service_role|execute_sql/.test(src), 'no env/network/shell');
const vc = spawnSync(process.execPath, [path.join(__dirname, '..', 'tools', 'tk504_private_storage_byte_sha_verify.cjs'), '--check'],
  { encoding: 'utf8', shell: false, env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot } });
ok(vc.status === 0, 'original verifier --check still passes');

console.log('tk504Original226AuditorBatchPlan: ' + checks + ' checks passed');
