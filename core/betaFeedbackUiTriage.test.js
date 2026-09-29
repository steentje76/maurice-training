/* MS-BETA-01 Slice C — feedback-UI + governed triage lifecycle.
 *  U  UI (echte code uit index.html): geldige inzending, onbekende categorie, lege/te lange tekst, dubbele
 *     submit, technische context default UIT, alleen na expliciete keuze en alleen allowlist, server/network-
 *     fout != succes, niet ingelogd;
 *  T  triagefunctie (echte netlify/functions/beta-feedback-triage.js tegen een nep-Supabase): unauthenticated,
 *     gewone gebruiker, tester, support/developer, geldige/illegale overgang, client-status/velden, cross-user,
 *     race, DUPLICATE-verwijzing, rol-lookup-fout, canoniek contract;
 *  M  migratie v569: geen UPDATE-grant/policy, minimale kolommen, DUPLICATE-constraint;
 *  X  sabotage. */
'use strict';
const fs = require('fs'); const path = require('path');
const ROOT = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const TRI_SRC = fs.readFileSync(path.join(ROOT, 'netlify/functions/beta-feedback-triage.js'), 'utf8');
const MIG = fs.readFileSync(path.join(ROOT, 'migratie_v569.sql'), 'utf8');
const BF = require(path.join(ROOT, 'core/betaFeedback.js'));
let pass = 0, fail = 0, finished = false, mute = false;
process.on('exit', c => { if (!finished && c === 0) { console.log('MISLUKT: test eindigde zonder samenvatting'); process.exitCode = 1; } });
const ok = (c, m) => { if (c) pass++; else { fail++; if (!mute) console.log('MISLUKT: ' + m); } };
const eq = (a, b, m) => ok(a === b, m + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')');

// ── UI-sandbox ──
function uiSrc(html) { const a = html.indexOf('var tkFeedbackState='); const e = html.indexOf('</script>', a); return a > 0 && e > a ? html.slice(a, e) : null; }
function ui(html, o) {
  o = o || {};
  const els = {}; const calls = [];
  function mk(id, extra) { const attrs = {}; const cls = new Set(); return Object.assign({ id, value: '', checked: false, disabled: false, textContent: '', style: {}, innerHTML: '',
    setAttribute: (k, v) => { attrs[k] = String(v); }, getAttribute: k => (k in attrs ? attrs[k] : null),
    classList: { toggle: (c, on) => { if (on) cls.add(c); else cls.delete(c); }, remove: c => cls.delete(c), contains: c => cls.has(c) } }, extra || {}); }
  const chips = ['problem', 'idea', 'unclear', 'works_well'].map(c => { const e = mk('chip-' + c); e.setAttribute('data-cat', c); e.setAttribute('aria-checked', 'false'); return e; });
  ['bfb-desc', 'bfb-steps', 'bfb-tech', 'bfb-status', 'bfb-submit', 'bft-status', 'bft-list', 'help-feedback-triage-btn'].forEach(id => { els[id] = mk(id); });
  els['bfb-cats'] = mk('bfb-cats', { querySelectorAll: () => chips });
  const active = { id: 's-help' };
  const env = {
    document: { getElementById: id => els[id] || null, querySelector: sel => (sel === '.scr.active' ? active : null) },
    navigator: { userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/129.0 Mobile Safari/537.36' },
    BetaFeedbackCore: BF, APP_VER: 'v4.70.7', SB_H: o.noAuth ? undefined : { Authorization: 'Bearer user-jwt' },
    tkProductTelemetryEnvironment: () => 'production', tkProductTelemetryPlatform: () => 'android',
    openModal: () => {}, escHtml: s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
    authSession: { user: { id: '11111111-1111-1111-1111-111111111111' } }, sbGet: async () => (o.role ? [{ system_role: o.role }] : []),
    fetch: (u, init) => { calls.push({ u, init }); if (o.fetchThrows) return Promise.reject(new Error('net'));
      const status = o.status || 201; const body = o.body || (status === 201 ? { ok: true, status: 'SUBMITTED', redactions: [] } : { ok: false, error: 'STORAGE_FAILED' });
      return o.slow ? new Promise(r => setTimeout(() => r({ status, ok: status < 300, json: async () => body }), 5)) : Promise.resolve({ status, ok: status < 300, json: async () => body }); }
  };
  const src = uiSrc(html);
  const api = new Function(...Object.keys(env), src + '\nreturn {tkFeedbackSubmit, tkFeedbackSelectCategory, openBetaFeedback, tkFeedbackBuildPayload, tkFeedbackTechContext, tkFeedbackRenderTriageEntry, tkFeedbackState};')(...Object.values(env));
  return { api, els, calls };
}
const body = c => (c && c.init && c.init.body) ? JSON.parse(c.init.body) : null;
async function suiteUi(html) {
  const R = {};
  { const w = ui(html); w.api.tkFeedbackSelectCategory('problem'); w.els['bfb-desc'].value = 'Knop reageert niet'; R.valid = await w.api.tkFeedbackSubmit(); R.validCalls = w.calls.length;
    R.validBody = body(w.calls[0]); R.validUrl = w.calls[0] && w.calls[0].u; R.validStatus = w.els['bfb-status'].textContent; R.validReset = w.els['bfb-desc'].value === ''; }
  { const w = ui(html); w.api.tkFeedbackSelectCategory('bug'); w.els['bfb-desc'].value = 'x'; R.unknownCat = await w.api.tkFeedbackSubmit(); R.unknownCatCalls = w.calls.length; }
  { const w = ui(html); w.api.tkFeedbackState.category = 'bug'; w.els['bfb-desc'].value = 'x'; R.forcedCat = await w.api.tkFeedbackSubmit(); R.forcedCatCalls = w.calls.length; }
  { const w = ui(html); w.api.tkFeedbackSelectCategory('idea'); w.els['bfb-desc'].value = '   '; await w.api.tkFeedbackSubmit(); R.emptyBody = body(w.calls[0]); }
  { const w = ui(html); w.api.tkFeedbackSelectCategory('idea'); w.els['bfb-desc'].value = 'a'.repeat(2001); R.long = await w.api.tkFeedbackSubmit(); R.longCalls = w.calls.length; R.longMsg = w.els['bfb-status'].textContent; }
  { const w = ui(html, { slow: true }); w.api.tkFeedbackSelectCategory('idea'); w.els['bfb-desc'].value = 'dubbel'; const p1 = w.api.tkFeedbackSubmit(); const p2 = w.api.tkFeedbackSubmit(); await Promise.all([p1, p2]); R.dblCalls = w.calls.length; }
  { const w = ui(html); w.api.tkFeedbackSelectCategory('idea'); w.els['bfb-desc'].value = 'x'; await w.api.tkFeedbackSubmit(); R.techDefault = body(w.calls[0]); }
  { const w = ui(html); w.api.tkFeedbackSelectCategory('problem'); w.els['bfb-desc'].value = 'x'; w.els['bfb-tech'].checked = true; await w.api.tkFeedbackSubmit(); R.techOn = body(w.calls[0]);
    R.techAfter = w.els['bfb-tech'].checked; w.els['bfb-tech'].checked = true; w.api.openBetaFeedback(); R.techReopen = w.els['bfb-tech'].checked; }
  for (const [k, o] of [['s502', { status: 502 }], ['s400', { status: 400, body: { ok: false, errors: ['INVALID_CATEGORY'] } }], ['s200bad', { status: 200, body: { ok: false } }], ['s201nok', { status: 201, body: { ok: false } }], ['net', { fetchThrows: true }]]) {
    const w = ui(html, o); w.api.tkFeedbackSelectCategory('idea'); w.els['bfb-desc'].value = 'bewaard'; const r = await w.api.tkFeedbackSubmit();
    R[k] = { r, kept: w.els['bfb-desc'].value === 'bewaard', msg: w.els['bfb-status'].textContent, busy: w.api.tkFeedbackState.busy, btn: w.els['bfb-submit'].disabled };
  }
  { const w = ui(html, { noAuth: true }); w.api.tkFeedbackSelectCategory('idea'); w.els['bfb-desc'].value = 'x'; R.noAuth = await w.api.tkFeedbackSubmit(); R.noAuthCalls = w.calls.length; }
  for (const role of [null, 'tester', 'support', 'developer']) { const w = ui(html, { role }); await w.api.tkFeedbackRenderTriageEntry(); R['entry_' + role] = w.els['help-feedback-triage-btn'].style.display; }
  return R;
}

// ── Triage-functie tegen nep-Supabase ──
const U = { user: 'aaaaaaaa-0000-4000-8000-000000000001', tester: 'aaaaaaaa-0000-4000-8000-000000000002', support: 'aaaaaaaa-0000-4000-8000-000000000003', dev: 'aaaaaaaa-0000-4000-8000-000000000004' };
const ROLES = { [U.user]: null, [U.tester]: 'tester', [U.support]: 'support', [U.dev]: 'developer' };
const F1 = 'bbbbbbbb-0000-4000-8000-000000000001', F2 = 'bbbbbbbb-0000-4000-8000-000000000002';
function loadTriage(src) { const m = { exports: {} }; new Function('module', 'exports', 'require', 'process', 'Buffer', src)(m, m.exports, p => (/betaFeedback\.js$/.test(p) ? BF : require(p)), { env: {} }, Buffer); return m.exports._internal; }
function fakeSb(o) {
  o = o || {};
  const rows = { [F1]: { id: F1, user_id: U.user, created_at: '2026-09-29T08:00:00Z', category: 'problem', status: 'SUBMITTED', description: 'tekst', reproduction_steps: null, redactions: [], technical_context: { os_family: 'android' }, duplicate_of: null },
    [F2]: { id: F2, user_id: U.tester, created_at: '2026-09-29T09:00:00Z', category: 'idea', status: 'TRIAGED', description: 'idee', reproduction_steps: null, redactions: [], technical_context: {}, duplicate_of: null } };
  const log = [];
  const fetch = async (url, init) => {
    init = init || {}; const u = new URL(url); const m = init.method || 'GET'; log.push({ m, path: u.pathname, q: u.search, body: init.body ? JSON.parse(init.body) : null, auth: (init.headers || {}).Authorization });
    if (u.pathname === '/auth/v1/user') { const t = (init.headers.Authorization || '').replace('Bearer ', ''); const uid = U[t]; return uid ? { ok: true, json: async () => ({ id: uid }) } : { ok: false, status: 401, json: async () => ({}) }; }
    if (u.pathname === '/rest/v1/users') { if (o.roleFail) return { ok: false, status: 500, json: async () => [] }; const id = u.searchParams.get('id').replace('eq.', ''); return { ok: true, json: async () => (id in ROLES ? [{ system_role: ROLES[id] }] : []) }; }
    if (u.pathname === '/rest/v1/beta_feedback') {
      const idq = u.searchParams.get('id'); const stq = u.searchParams.get('status');
      if (m === 'GET') { const sel = (u.searchParams.get('select') || '').split(','); const pick = r => { const x = {}; sel.forEach(k => { x[k] = r[k]; }); return x; };
        const list = idq ? (rows[idq.replace('eq.', '')] ? [rows[idq.replace('eq.', '')]] : []) : Object.values(rows); return { ok: true, json: async () => list.map(pick) }; }
      if (m === 'PATCH') { const id = idq && idq.replace('eq.', ''); const r = rows[id]; if (!r || !stq || (o.race ? true : r.status !== decodeURIComponent(stq.replace('eq.', '')))) return { ok: true, json: async () => [] };
        Object.assign(r, JSON.parse(init.body)); return { ok: true, json: async () => [r] }; }
    }
    return { ok: false, status: 404, json: async () => ({}) };
  };
  return { fetch, rows, log };
}
async function call(T, sb, token, bodyObj) {
  const ev = { httpMethod: 'POST', headers: token ? { authorization: 'Bearer ' + token } : {}, body: JSON.stringify(bodyObj) };
  T._resetRate(); const r = await T.handle(ev, { env: { SUPABASE_SERVICE_ROLE_KEY: 'svc', SUPABASE_URL: 'https://x.supabase.co' }, fetch: sb.fetch, now: () => Date.UTC(2026, 8, 29, 10) });
  return { code: r.statusCode, body: JSON.parse(r.body) };
}
async function suiteTriage(src) {
  const T = loadTriage(src); const R = {};
  let sb = fakeSb(); R.unauth = await call(T, sb, null, { action: 'list' }); R.badTok = await call(T, sb, 'nobody', { action: 'list' });
  sb = fakeSb(); R.user = await call(T, sb, 'user', { action: 'transition', id: F1, to: 'TRIAGED' }); R.userStatus = sb.rows[F1].status; R.userPatch = sb.log.filter(l => l.m === 'PATCH').length;
  sb = fakeSb(); R.tester = await call(T, sb, 'tester', { action: 'transition', id: F1, to: 'TRIAGED' }); R.testerStatus = sb.rows[F1].status; R.testerList = await call(T, sb, 'tester', { action: 'list' });
  sb = fakeSb(); R.list = await call(T, sb, 'support', { action: 'list' });
  R.listSelect = (sb.log.find(l => l.m === 'GET' && l.path === '/rest/v1/beta_feedback') || {}).q || '';
  sb = fakeSb(); R.sup = await call(T, sb, 'support', { action: 'transition', id: F1, to: 'TRIAGED' }); R.supRow = Object.assign({}, sb.rows[F1]);
  R.supPatch = sb.log.find(l => l.m === 'PATCH') || null;
  sb = fakeSb(); R.dev = await call(T, sb, 'dev', { action: 'transition', id: F2, to: 'ACCEPTED' }); R.devStatus = sb.rows[F2].status;
  sb = fakeSb(); R.illegal = await call(T, sb, 'dev', { action: 'transition', id: F1, to: 'ACCEPTED' }); R.illegalStatus = sb.rows[F1].status; R.illegalPatch = sb.log.filter(l => l.m === 'PATCH').length;
  sb = fakeSb(); R.unknownSt = await call(T, sb, 'dev', { action: 'transition', id: F1, to: 'DONE' });
  sb = fakeSb(); R.clientStatus = await call(T, sb, 'dev', { action: 'transition', id: F1, to: 'TRIAGED', status: 'VERIFIED' });
  sb = fakeSb(); R.clientUser = await call(T, sb, 'dev', { action: 'transition', id: F1, to: 'TRIAGED', user_id: U.dev });
  sb = fakeSb(); R.clientDesc = await call(T, sb, 'dev', { action: 'transition', id: F1, to: 'TRIAGED', description: 'x' });
  sb = fakeSb(); R.badAction = await call(T, sb, 'dev', { action: 'update', id: F1, status: 'VERIFIED' });
  sb = fakeSb(); R.dupNoRef = await call(T, sb, 'dev', { action: 'transition', id: F2, to: 'DUPLICATE' }); R.dupNoRefStatus = sb.rows[F2].status;
  sb = fakeSb(); R.dupSelf = await call(T, sb, 'dev', { action: 'transition', id: F2, to: 'DUPLICATE', duplicate_of: F2 });
  sb = fakeSb(); R.dupMissing = await call(T, sb, 'dev', { action: 'transition', id: F2, to: 'DUPLICATE', duplicate_of: 'bbbbbbbb-0000-4000-8000-00000000ffff' });
  sb = fakeSb(); R.dupOk = await call(T, sb, 'dev', { action: 'transition', id: F2, to: 'DUPLICATE', duplicate_of: F1 }); R.dupRow = Object.assign({}, sb.rows[F2]);
  sb = fakeSb(); R.refOnNonDup = await call(T, sb, 'dev', { action: 'transition', id: F1, to: 'TRIAGED', duplicate_of: F2 });
  sb = fakeSb({ race: true }); R.race = await call(T, sb, 'dev', { action: 'transition', id: F1, to: 'TRIAGED' });
  sb = fakeSb({ roleFail: true }); R.roleFail = await call(T, sb, 'dev', { action: 'list' });
  sb = fakeSb(); R.notFound = await call(T, sb, 'dev', { action: 'transition', id: 'bbbbbbbb-0000-4000-8000-00000000eeee', to: 'TRIAGED' });
  sb = fakeSb(); R.cross = await call(T, sb, 'user', { action: 'list' });   // gewone gebruiker kan ook eigen/andermans feedback niet triëren
  R.serviceOnly = sb.log.filter(l => l.path.indexOf('/rest/v1/') === 0).every(l => l.auth === 'Bearer svc');
  return R;
}

function assertAll(html, src, mig, U_, T, L) {
  L = L || '';
  ok(U_.valid === true && U_.validCalls === 1 && /beta-feedback$/.test(U_.validUrl || ''), L + 'U1: geldige inzending -> één POST naar de bestaande ingestion');
  ok(U_.validBody && U_.validBody.category === 'problem' && U_.validBody.description === 'Knop reageert niet', L + 'U2: payload = contractvelden');
  ok(/Bedankt/.test(U_.validStatus) && U_.validReset, L + 'U3: succes pas na 201 {ok:true}; formulier gereset');
  ok(U_.unknownCat === false && U_.unknownCatCalls === 0 && U_.forcedCat === false && U_.forcedCatCalls === 0, L + 'U4: onbekende categorie -> niets verstuurd');
  ok(U_.emptyBody && !('description' in U_.emptyBody), L + 'U5: lege tekst -> geen verzonnen inhoud (contract staat categorie-alleen toe)');
  ok(U_.long === false && U_.longCalls === 0 && /2000/.test(U_.longMsg), L + 'U6: te lange tekst -> client-validatie, niets verstuurd');
  eq(U_.dblCalls, 1, L + 'U7: dubbele submit -> één request');
  ok(U_.techDefault && !('technical_context' in U_.techDefault) && !('technical_context_consent' in U_.techDefault), L + 'U8: technische context standaard UIT');
  const allow = Object.keys(BF.TECH_CONTEXT);
  ok(U_.techOn && U_.techOn.technical_context_consent === true && Object.keys(U_.techOn.technical_context).every(k => allow.indexOf(k) !== -1), L + 'U9: alleen na keuze, alleen allowlist-velden');
  ok(U_.techOn && !JSON.stringify(U_.techOn.technical_context).match(/Mozilla|Chrome\/|http|jwt/i), L + 'U10: geen ruwe user-agent/URL/token in context');
  ok(U_.techAfter === false && U_.techReopen === false, L + 'U11: consent per inzending, nooit onthouden');
  ['s502', 's400', 's200bad', 's201nok', 'net'].forEach(k => ok(U_[k].r === false && U_[k].kept && !/Bedankt/.test(U_[k].msg) && U_[k].busy === false && U_[k].btn === false, L + 'U12: ' + k + ' -> fout, tekst behouden, knop weer vrij'));
  ok(U_.noAuth === false && U_.noAuthCalls === 0, L + 'U13: niet ingelogd -> niets verstuurd');
  ok(U_.entry_null === 'none' && U_.entry_tester === 'none' && U_.entry_support === '' && U_.entry_developer === '', L + 'U14: triage-knop alleen voor support/developer');
  ok(!/screenshot|getDisplayMedia|html2canvas|toDataURL/i.test(uiSrc(html) || ''), L + 'U15: geen screenshot/capture');
  eq(T.unauth.code, 401, L + 'T1: zonder token 401'); eq(T.badTok.code, 401, L + 'T2: ongeldig token 401');
  ok(T.user.code === 403 && T.userStatus === 'SUBMITTED' && T.userPatch === 0, L + 'T3: gewone gebruiker kan geen status wijzigen');
  ok(T.tester.code === 403 && T.testerStatus === 'SUBMITTED' && T.testerList.code === 403, L + 'T4: tester heeft geen triagerechten');
  ok(T.list.code === 200 && T.list.body.items.length === 2 && T.list.body.items.every(i => !('user_id' in i) && !('technical_context' in i)), L + 'T5: lijst zonder accountinfo/technische context');
  ok(!/user_id|technical_context|email/.test(T.listSelect), L + 'T6: server selecteert geen accountvelden');
  ok(T.list.body.items.find(i => i.id === F1).next.join() === 'TRIAGED', L + 'T7: toegestane volgende acties uit het contract');
  ok(T.sup.code === 200 && T.supRow.status === 'TRIAGED' && T.supRow.status_updated_by === 'aaaaaaaa-0000-4000-8000-000000000003', L + 'T8: support geldige overgang + toerekenbaar');
  ok(T.supPatch && /status=eq\.SUBMITTED/.test(T.supPatch.q) && Object.keys(T.supPatch.body).sort().join() === 'status,status_updated_at,status_updated_by', L + 'T9: PATCH conditioneel op huidige status, alleen statusvelden');
  ok(T.dev.code === 200 && T.devStatus === 'ACCEPTED', L + 'T10: developer geldige overgang');
  ok(T.illegal.code === 409 && T.illegal.body.error === 'INVALID_TRANSITION' && T.illegalStatus === 'SUBMITTED' && T.illegalPatch === 0, L + 'T11: illegale overgang fail-closed');
  eq(T.unknownSt.code, 409, L + 'T12: onbekende status geweigerd');
  ok(T.clientStatus.code === 400 && T.clientUser.code === 400 && T.clientDesc.code === 400 && T.badAction.code === 400, L + 'T13: client kan status/velden niet rechtstreeks zetten');
  ok(T.dupNoRef.code === 409 && T.dupNoRefStatus === 'TRIAGED', L + 'T14: DUPLICATE zonder verwijzing geweigerd (contract)');
  ok(T.dupSelf.code === 400 && T.dupMissing.code === 400, L + 'T15: DUPLICATE naar zichzelf/onbestaand geweigerd');
  ok(T.dupOk.code === 200 && T.dupRow.status === 'DUPLICATE' && T.dupRow.duplicate_of === F1, L + 'T16: geldige DUPLICATE met verwijzing');
  eq(T.refOnNonDup.code, 400, L + 'T17: verwijzing alleen bij DUPLICATE');
  eq(T.race.code, 409, L + 'T18: gelijktijdige wijziging -> 409');
  eq(T.roleFail.code, 503, L + 'T19: rol-lookup faalt -> fail-closed');
  eq(T.notFound.code, 404, L + 'T20: onbekend id -> 404');
  eq(T.cross.code, 403, L + 'T21: cross-user/cross-role -> 403');
  ok(T.serviceOnly, L + 'T22: databasetoegang uitsluitend server-side (service_role)');
  ok(/BetaFeedback\.canTransition\(/.test(src) && /require\('\.\.\/\.\.\/core\/betaFeedback\.js'\)/.test(src), L + 'T23: hervalidatie met het canonieke contract');
  ok(!/grant\s+(all|update|insert|delete)/i.test(mig) && !/create\s+policy/i.test(mig) && !/disable\s+row\s+level/i.test(mig), L + 'M1: v569 geeft geen UPDATE/INSERT/DELETE-grant of policy');
  ok(/add column if not exists duplicate_of uuid references public\.beta_feedback\(id\)/.test(mig) && /status_updated_by uuid references auth\.users\(id\)/.test(mig), L + 'M2: minimale kolommen');
  ok(/\(status = 'DUPLICATE'\) = \(duplicate_of is not null\)/.test(mig) && /duplicate_of <> id/.test(mig), L + 'M3: DUPLICATE-integriteit in de database');
}

(async function run() {
  const Uo = await suiteUi(HTML), To = await suiteTriage(TRI_SRC);
  assertAll(HTML, TRI_SRC, MIG, Uo, To, '');
  const sab = [
    ['rolcheck weg', { src: s => s.replace("if (TRIAGE_ROLES.indexOf(role) === -1) return reply(403, { ok: false, error: 'FORBIDDEN' });", '') }],
    ['tester mag triëren', { src: s => s.replace("const TRIAGE_ROLES = ['support', 'developer'];", "const TRIAGE_ROLES = ['support', 'developer', 'tester'];") }],
    ['contract-overgang overgeslagen', { src: s => s.replace("const verdict = BetaFeedback.canTransition(from, body.to, { duplicate_of: body.duplicate_of });", "const verdict = { ok: true };") }],
    ['PATCH zonder statusfilter', { src: s => s.replace("'&status=eq.' + encodeURIComponent(from)", "''") }],
    ['extra clientvelden toegestaan', { src: s => s.replace("if (extra.length) return reply(400, { ok: false, error: 'UNKNOWN_FIELD' });", '') }],
    ['user_id in lijst', { src: s => s.replace("const LIST_FIELDS = 'id,", "const LIST_FIELDS = 'id,user_id,").replace('items: (rows || []).map(x => ({ id: x.id,', 'items: (rows || []).map(x => ({ user_id: x.user_id, id: x.id,') }],
    ['UPDATE-grant in migratie', { mig: m => m + '\ngrant update on public.beta_feedback to authenticated;\n' }],
    ['dubbele-submit-guard weg', { html: h => h.replace('if(tkFeedbackState.busy)return false;', '') }],
    ['elke 2xx = succes', { html: h => h.replace('if(res&&res.status===201&&data&&data.ok===true){', 'if(res&&res.ok){') }],
    ['technische context standaard aan', { html: h => h.replace('if(t&&t.checked===true){ p.technical_context_consent=true;', 'if(true){ p.technical_context_consent=true;') }],
    ['ruwe user-agent in context', { html: h => h.replace('os_family:tkFeedbackOsFamily(ua), browser_family:tkFeedbackBrowserFamily(ua),', 'os_family:tkFeedbackOsFamily(ua), browser_family:tkFeedbackBrowserFamily(ua), user_agent:ua,') }],
    ['triage-knop voor iedereen', { html: h => h.replace("  b.style.display='none';\r\n  if(await tkFeedbackTriageAllowed()) b.style.display='';", "  b.style.display='';") }]
  ];
  for (const [name, m] of sab) {
    const h2 = m.html ? m.html(HTML) : HTML, s2 = m.src ? m.src(TRI_SRC) : TRI_SRC, m2 = m.mig ? m.mig(MIG) : MIG;
    if (h2 === HTML && s2 === TRI_SRC && m2 === MIG) { ok(false, 'SABOTAGE niet toepasbaar: ' + name); continue; }
    const pp = pass, ff = fail; let caught = false;
    try { mute = true; assertAll(h2, s2, m2, await suiteUi(h2), await suiteTriage(s2), '[sab] '); caught = fail > ff; } catch (e) { caught = false; } finally { mute = false; pass = pp; fail = ff; }
    if (process.env.SAB_DEBUG) console.log('SAB ' + name + ' detect=' + caught);
    ok(caught, 'SABOTAGE gedetecteerd via assertie: ' + name);
  }
  finished = true;
  console.log('\n[BetaFeedbackUiTriage] RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('MISLUKT: exception ' + (e && e.stack)); process.exit(1); });
