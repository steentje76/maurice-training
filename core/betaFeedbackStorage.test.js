/* MS-BETA-01 Slice B — opslag + ingestion + retentie (gedrag, niet alleen aanwezigheid).
 *  I  netlify/functions/beta-feedback.js (echte handler, gestubde fetch): auth, cap, rate limit, hervalidatie
 *     met core/betaFeedback.js, user_id uit token, status altijd SUBMITTED, fail-safe, geen tekst-echo;
 *  M  migratie_v568.sql: aparte tabel, RLS, geen client-schrijfrechten, triage via bestaande system_role,
 *     constraints gelijk aan het contract;
 *  R  cleanup-beta-feedback: 365 dagen, strikte boundary, één gefilterde DELETE, fail-safe, @daily;
 *  X  sabotage. */
'use strict';
const fs = require('fs'); const path = require('path');
const ROOT = path.join(__dirname, '..');
const BF = require(path.join(ROOT, 'core/betaFeedback.js'));
const ING = fs.readFileSync(path.join(ROOT, 'netlify/functions/beta-feedback.js'), 'utf8');
const CLN = fs.readFileSync(path.join(ROOT, 'netlify/functions/cleanup-beta-feedback.js'), 'utf8');
const SQL = fs.readFileSync(path.join(ROOT, 'migratie_v568.sql'), 'utf8');
const TOML = fs.readFileSync(path.join(ROOT, 'netlify.toml'), 'utf8');
let pass = 0, fail = 0, finished = false, mute = false;
process.on('exit', c => { if (!finished && c === 0) { console.log('MISLUKT: test eindigde zonder samenvatting'); process.exitCode = 1; } });
const ok = (c, m) => { if (c) pass++; else { fail++; if (!mute) console.log('MISLUKT: ' + m); } };
const eq = (a, b, m) => ok(a === b, m + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')');
function load(src) { const m = { exports: {} }; new Function('module', 'exports', 'require', 'process', 'Buffer', src)(m, m.exports, p => (/betaFeedback\.js$/.test(p) ? BF : require(p)), { env: {} }, Buffer); return m.exports._internal; }

const UA = '11111111-1111-4111-8111-111111111111', UB = '22222222-2222-4222-8222-222222222222';
const ENV = { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'svc-key', SUPABASE_ANON_KEY: 'anon-key' };
function net(o) {
  o = o || {}; const calls = [];
  const f = (u, init) => { calls.push({ u, init: init || {} });
    if (/\/auth\/v1\/user$/.test(u)) { const t = (init.headers || {}).Authorization; const id = t === 'Bearer tokA' ? UA : t === 'Bearer tokB' ? UB : null;
      return Promise.resolve(id ? { ok: true, json: () => Promise.resolve({ id }) } : { ok: false, status: 401, json: () => Promise.resolve({}) }); }
    if (/\/rest\/v1\/beta_feedback$/.test(u)) { if (o.writeThrows) throw new Error('net'); return Promise.resolve({ ok: !o.writeFail, status: o.writeFail ? 500 : 201 }); }
    return Promise.resolve({ ok: false, status: 404 }); };
  return { f, calls, inserts: () => calls.filter(c => /\/rest\/v1\/beta_feedback$/.test(c.u)) };
}
const ev = (body, tok, method) => ({ httpMethod: method || 'POST', headers: tok ? { authorization: 'Bearer ' + tok } : {}, body: typeof body === 'string' ? body : JSON.stringify(body) });
async function call(I, body, tok, o, method, env) { const n = net(o); const r = await I.handle(ev(body, tok, method), { env: env || ENV, fetch: n.f, now: () => Date.UTC(2026, 8, 29, 8) }); let j = {}; try { j = JSON.parse(r.body); } catch (_) {} return { r, j, n }; }

async function suiteIngest(src) {
  const I = load(src); I._resetRate(); const R = {};
  const good = { category: 'problem', description: 'Knop werkt niet, mail me op a@b.nl', technical_context_consent: true, technical_context: { app_version: 'v4.70.7', platform: 'android', route_id: 's-train-mgr' } };
  R.noAuth = await call(I, good, null);
  R.badTok = await call(I, good, 'tokX');
  R.get = await call(I, good, 'tokA', {}, 'GET');
  R.big = await call(I, { category: 'idea', description: 'x'.repeat(20000) }, 'tokA');
  R.json = await call(I, '{bad', 'tokA');
  R.cat = await call(I, { category: 'bug' }, 'tokA');
  R.unk = await call(I, { category: 'idea', foo: 1 }, 'tokA');
  R.forb = await call(I, { category: 'idea', hrv: 55 }, 'tokA');
  R.shot = await call(I, { category: 'idea', screenshot: 'data:x' }, 'tokA');
  R.status = await call(I, { category: 'idea', status: 'VERIFIED' }, 'tokA');
  R.uid = await call(I, { category: 'idea', user_id: UB }, 'tokA');
  R.noConsent = await call(I, { category: 'idea', technical_context: { platform: 'web' } }, 'tokA');
  R.forbCtx = await call(I, { category: 'idea', technical_context_consent: true, technical_context: { gps: '52,5' } }, 'tokA');
  R.long = await call(I, { category: 'idea', description: 'y'.repeat(2001) }, 'tokA');
  R.ok = await call(I, good, 'tokA');
  R.okB = await call(I, { category: 'works_well' }, 'tokB');
  R.wf = await call(I, good, 'tokA', { writeFail: true });
  let threw = false; try { R.wt = await call(I, good, 'tokA', { writeThrows: true }); } catch (_) { threw = true; } R.wtThrew = threw;
  R.noCfg = await call(I, good, 'tokA', {}, 'POST', { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon-key' });
  I._resetRate(); let last; for (let i = 0; i < I.MAX_PER_WINDOW + 1; i++) last = await call(I, { category: 'idea' }, 'tokB'); R.rate = last;
  return R;
}
function ins(x) { const i = x.n.inserts(); return i.length ? { url: i[0].u, init: i[0].init, row: JSON.parse(i[0].init.body) } : null; }

function suiteSql(sql) {
  const s = sql.replace(/--[^\n]*/g, '');
  const R = {};
  R.table = /create table if not exists public\.beta_feedback\s*\(/.test(s);
  R.rls = /alter table public\.beta_feedback enable row level security;/.test(s);
  R.revoke = /revoke all on public\.beta_feedback from anon, authenticated;/.test(s);
  R.grants = (s.match(/grant [a-z, ]+ on public\.beta_feedback to [a-z_]+/g) || []);
  R.policies = (s.match(/create policy [a-z_]+ on public\.beta_feedback\s+for (select|insert|update|delete|all)/g) || []);
  R.triage = /using \(exists \(select 1 from public\.users u\s+where u\.id = \(auth\.uid\(\)\)::text and u\.system_role in \('support','developer'\)\)\)/.test(s);
  R.tester = /tester/.test(s);
  R.cascade = /user_id uuid not null references auth\.users\(id\) on delete cascade/.test(s);
  const cats = (s.match(/category in \(([^)]*)\)/) || [0, ''])[1].match(/'([^']+)'/g) || [];
  R.cats = cats.map(x => x.slice(1, -1)).sort().join(',');
  const sts = (s.match(/status in \(([^)]*)\)/) || [0, ''])[1].match(/'([^']+)'/g) || [];
  R.sts = sts.map(x => x.slice(1, -1)).sort().join(',');
  R.len = (s.match(/between 1 and (\d+)/g) || []).map(x => Number(x.split(' ').pop()));
  R.consentChk = /check \(technical_context_consent or technical_context = '\{\}'::jsonb\)/.test(s);
  R.otherTables = /client_telemetry_events|product_telemetry_events|public\.sessions|coach_workout_feedback/.test(s);
  return R;
}
async function suiteClean(src) {
  const C = load(src); const R = {}; const NOW = Date.UTC(2026, 8, 29, 3), DAY = 864e5;
  R.days = C.RETENTION_DAYS; R.table = C.TABLE; R.cutoff = C.retentionCutoffIso(NOW);
  const calls = []; R.ok = await C.runCleanup({ env: { SUPABASE_SERVICE_ROLE_KEY: 'svc' }, fetch: (u, i) => { calls.push({ u, i }); return Promise.resolve({ ok: true }); }, now: () => NOW });
  R.calls = calls; const q = calls[0] ? decodeURIComponent(calls[0].u.split('?')[1] || '') : ''; const m = q.match(/^created_at=(lt|lte)\.(.+)$/);
  R.op = m ? m[1] : null; const cmp = { lt: (a, b) => a < b, lte: (a, b) => a <= b };
  const rows = { older: NOW - 365 * DAY - 1, exact: NOW - 365 * DAY, younger: NOW - 365 * DAY + 1 };
  R.del = {}; Object.keys(rows).forEach(k => { R.del[k] = !!(m && cmp[m[1]](new Date(rows[k]).toISOString(), m[2])); });
  const c2 = []; R.noKey = await C.runCleanup({ env: {}, fetch: u => { c2.push(u); return Promise.resolve({ ok: true }); }, now: () => NOW }); R.noKeyCalls = c2.length;
  let threw = false; try { R.thr = await C.runCleanup({ env: { SUPABASE_SERVICE_ROLE_KEY: 'svc' }, fetch: () => { throw new Error('x'); }, now: () => NOW }); } catch (_) { threw = true; } R.threw = threw;
  return R;
}

function assertAll(I, M, C, src, toml) {
  eq(I.noAuth.r.statusCode, 401, 'I1: zonder token -> 401'); eq(I.noAuth.n.inserts().length, 0, 'I1b: zonder token geen insert');
  ok(I.badTok.r.statusCode === 401 && I.badTok.n.inserts().length === 0, 'I2: ongeldig token -> 401, geen insert');
  eq(I.get.r.statusCode, 405, 'I3: alleen POST');
  ok(I.big.r.statusCode === 413 && I.big.n.calls.length === 0, 'I4: te grote payload -> 413 zonder verdere verwerking');
  ok(I.json.r.statusCode === 400 && I.json.n.inserts().length === 0, 'I5: ongeldige JSON -> 400');
  ok(I.cat.r.statusCode === 400 && I.cat.j.errors.indexOf('INVALID_CATEGORY') !== -1 && !ins(I.cat), 'I6: onbekende categorie -> 400, geen insert');
  ok(I.unk.r.statusCode === 400 && I.unk.j.errors.indexOf('UNKNOWN_FIELD') !== -1 && !ins(I.unk), 'I7: onbekende property -> 400');
  ok(I.forb.r.statusCode === 400 && I.forb.j.errors.indexOf('FORBIDDEN_FIELD') !== -1 && !ins(I.forb), 'I8: athlete-veld (hrv) -> 400');
  ok(I.shot.r.statusCode === 400 && !ins(I.shot), 'I9: screenshot -> 400 (buiten deze slice)');
  ok(I.status.r.statusCode === 400 && !ins(I.status), 'I10: client kan geen status meesturen (onbekende status/property)');
  ok(I.uid.r.statusCode === 400 && !ins(I.uid), 'I11: client kan geen user_id meesturen');
  ok(I.noConsent.r.statusCode === 400 && I.noConsent.j.errors.indexOf('TECHNICAL_CONTEXT_WITHOUT_CONSENT') !== -1 && !ins(I.noConsent), 'I12: technische context zonder consent -> 400');
  ok(I.forbCtx.r.statusCode === 400 && !ins(I.forbCtx), 'I13: verboden technische context (gps) -> 400');
  ok(I.long.r.statusCode === 400 && !ins(I.long), 'I14: vrije tekst > 2000 -> 400');
  const a = ins(I.ok);
  ok(I.ok.r.statusCode === 201 && a, 'I15: geldige submission -> 201 + één insert');
  ok(a && a.url === 'https://x.supabase.co/rest/v1/beta_feedback' && a.init.method === 'POST', 'I16: insert uitsluitend in public.beta_feedback');
  ok(a && a.init.headers.Authorization === 'Bearer svc-key' && a.init.headers.Prefer === 'return=minimal', 'I17: service_role, return=minimal');
  eq(a && a.row.user_id, UA, 'I18: user_id uit het token');
  eq(a && a.row.status, 'SUBMITTED', 'I19: status altijd SUBMITTED');
  eq(a && Object.keys(a.row).sort().join(','), 'category,contract,description,free_text_classification,redactions,reproduction_steps,status,submitted_at,technical_context,technical_context_consent,user_id', 'I20: exacte kolommen, geen extra velden');
  ok(a && /\[REDACTED_EMAIL\]/.test(a.row.description) && a.row.redactions.indexOf('email') !== -1, 'I21: redactie toegepast vóór opslag');
  eq(a && JSON.stringify(a.row.technical_context), JSON.stringify({ app_version: 'v4.70.7', platform: 'android', route_id: 's-train-mgr' }), 'I22: alleen geallowliste technische context');
  ok(!/Knop werkt niet|REDACTED/.test(I.ok.r.body), 'I23: antwoord bevat de tekst niet terug');
  const b = ins(I.okB); ok(b && b.row.user_id === UB && b.row.technical_context_consent === false && JSON.stringify(b.row.technical_context) === '{}', 'I24: andere gebruiker -> eigen user_id, zonder consent geen context');
  ok(I.wf.r.statusCode === 502 && I.wf.j.error === 'STORAGE_FAILED', 'I25: opslagfout zichtbaar als fout');
  ok(!I.wtThrew && I.wt.r.statusCode === 500, 'I26: netwerkfout -> 500, geen throw');
  ok(I.noCfg.r.statusCode === 503 && I.noCfg.n.calls.length === 0, 'I27: zonder service key niets gedaan');
  eq(I.rate.r.statusCode, 429, 'I28: rate limit per gebruiker');
  ok(/require\('\.\.\/\.\.\/core\/betaFeedback\.js'\)/.test(src) && /BetaFeedback\.buildSubmission\(body/.test(src), 'I29: hervalidatie met het canonieke contract');
  ok(!/client_telemetry_events|product_telemetry_events|\/rest\/v1\/sessions|coach_workout_feedback/.test(src), 'I30: geen andere sinks');
  // M
  ok(M.table && M.rls, 'M1: aparte tabel met RLS');
  ok(M.revoke, 'M2: default-grants van anon/authenticated ingetrokken');
  eq(M.grants.join('|'), 'grant select on public.beta_feedback to authenticated', 'M3: geen client insert/update/delete/truncate; alleen select (RLS-begrensd)');
  eq(M.policies.join('|'), 'create policy beta_feedback_select_triage on public.beta_feedback\n  for select', 'M4: exact één policy: select voor triage');
  ok(M.triage && !M.tester, 'M5: triage via bestaande system_role support/developer; tester niet');
  ok(M.cascade, 'M6: feedback verdwijnt met het account');
  eq(M.cats, Object.keys(BF.CATEGORIES).sort().join(','), 'M7: categorieën = contract');
  eq(M.sts, BF.STATUSES.slice().sort().join(','), 'M8: statussen = contract');
  ok(M.len.length === 2 && M.len.every(x => x === BF.MAX_TEXT), 'M9: tekstlengte = contract MAX_TEXT');
  ok(M.consentChk, 'M10: DB weigert context zonder consent');
  ok(!M.otherTables, 'M11: migratie raakt geen andere streams');
  // R
  eq(C.days, 365, 'R1: retentie 365 dagen'); eq(C.table, 'beta_feedback', 'R2: alleen beta_feedback');
  eq(C.cutoff, '2025-09-29T03:00:00.000Z', 'R3: cutoff = nu - 365 dagen');
  ok(C.ok.statusCode === 200 && C.calls.length === 1 && C.calls[0].i.method === 'DELETE' && /\/rest\/v1\/beta_feedback\?created_at=lt\./.test(C.calls[0].u), 'R4: één gefilterde DELETE');
  ok(C.calls[0] && C.calls[0].i.headers.Prefer === 'return=minimal', 'R5: geen rijen teruggelezen');
  eq(C.op, 'lt', 'R6: strikt ouder dan');
  ok(C.del.older && !C.del.exact && !C.del.younger, 'R7: expiry-boundary (exact 365 dagen blijft)');
  ok(C.noKey.statusCode === 500 && C.noKeyCalls === 0, 'R8: zonder key niets');
  ok(!C.threw && C.thr.statusCode === 500, 'R9: fout -> geen throw');
  ok(/\[functions\."cleanup-beta-feedback"\]\s*\n\s*schedule = "@daily"/.test(toml), 'R10: dagelijks gepland');
}

(async function run() {
  const I = await suiteIngest(ING), M = suiteSql(SQL), C = await suiteClean(CLN);
  assertAll(I, M, C, ING, TOML);
  const sab = [
    ['auth-check weg', { ing: s => s.replace("if (!uid) return reply(401, { ok: false, error: 'UNAUTHENTICATED' });", "if (!uid) { /* sab */ }") }],
    ['geen hervalidatie', { ing: s => s.replace('if (!built.ok) return reply(400,', 'if (false) return reply(400,') }],
    ['status van client overnemen', { ing: s => s.replace('status: r.status,', "status: (body && body.status) || r.status,").replace("const built = BetaFeedback.buildSubmission(body,", "const built = BetaFeedback.buildSubmission((function(b){var c=Object.assign({},b);delete c.status;return c;})(body),") }],
    ['user_id uit payload', { ing: s => s.replace('const row = { user_id: uid,', 'const row = { user_id: (body && body.user_id) || uid,').replace("const built = BetaFeedback.buildSubmission(body,", "const built = BetaFeedback.buildSubmission((function(b){var c=Object.assign({},b);delete c.user_id;return c;})(body),") }],
    ['payload-cap weg', { ing: s => s.replace("if (Buffer.byteLength(raw, 'utf8') > MAX_BYTES) return reply(413, { ok: false, error: 'PAYLOAD_TOO_LARGE' });", '') }],
    ['client-insert-grant', { sql: s => s.replace('grant select on public.beta_feedback to authenticated;', 'grant select, insert on public.beta_feedback to authenticated;') }],
    ['revoke weg', { sql: s => s.replace('revoke all on public.beta_feedback from anon, authenticated;', '') }],
    ['tester mag triëren', { sql: s => s.replace("u.system_role in ('support','developer')", "u.system_role in ('support','developer','tester')") }],
    ['retentie 30 dagen', { cln: s => s.replace('const RETENTION_DAYS = 365;', 'const RETENTION_DAYS = 30;') }],
    ['boundary lte', { cln: s => s.replace("'?created_at=lt.'", "'?created_at=lte.'") }],
    ['ongefilterde DELETE', { cln: s => s.replace("'?created_at=lt.' + encodeURIComponent(cutoffIso)", "''") }]
  ];
  for (const [name, m] of sab) {
    const i2 = m.ing ? m.ing(ING) : ING, s2 = m.sql ? m.sql(SQL) : SQL, c2 = m.cln ? m.cln(CLN) : CLN;
    if (i2 === ING && s2 === SQL && c2 === CLN) { ok(false, 'SABOTAGE niet toepasbaar: ' + name); continue; }
    const pp = pass, ff = fail; let caught = false;
    try { mute = true; assertAll(await suiteIngest(i2), suiteSql(s2), await suiteClean(c2), i2, TOML); caught = fail > ff; } catch (e) { caught = false; }
    finally { mute = false; pass = pp; fail = ff; }
    if (process.env.SAB_DEBUG) console.log('SAB ' + name + ' detect=' + caught);
    ok(caught, 'SABOTAGE gedetecteerd via assertie: ' + name);
  }
  finished = true;
  console.log('\n[BetaFeedbackStorage] RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('MISLUKT: exception ' + (e && e.stack)); process.exit(1); });
