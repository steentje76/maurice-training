/* Sprint 7 — Offline Data Integrity (v4.70.24, DEC-SYNC-002).
 *
 * Track B (Builder): een training telt pas als opgeslagen als de training-rij ÉN haar oefeningen op de
 * server staan; geen oefeningen zonder training, geen overschrijving van een lokale versie door een
 * oudere serverversie, herstel na herstart en gedeeltelijke opslag, geen dubbele rijen.
 * Track C (voeding): client-ids voor supplement-definities, producten en maaltijden; kindrijen volgen hun
 * ouder in de wachtrij; geen dubbele definities of producten bij herhaalde pogingen.
 * Track D: eerlijke statusredenen (offline, netwerk, timeout, auth, server, validatie, toegang, opslag,
 * account, afhankelijk); geen rij-inhoud in de console; zichtbare status van wat alleen lokaal staat.
 *
 * Deel 1: broncontroles. Deel 2 (Chromium, anders SKIP): de ECHTE pagina — WB.saveWorkout(),
 * syncCustomTrainingsFromSupabase(), flushOfflineQueue(), de voedingsflows, sbPostQ() en de echte
 * IndexedDB-wachtrij. Alleen het netwerk (sbFetch) is gesimuleerd als PostgREST met de productie-
 * constraints (PK, FK, unieke barcode, RLS-ouder voor custom_training_exercises, geen UPDATE-policy op
 * supplement-definities, voedingswaarden, barcodes en berichten). Server en wachtrij overleven een
 * herstart. BROWSERBEWIJS met een gesimuleerde server, geen toestelbewijs.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r\n/g, '\n');

let pass = 0, fail = 0;
const msgs = [];
function ok(c, l) { if (c) pass++; else { fail++; msgs.push('MISLUKT: ' + l); } }
function eq(a, b, l) { ok(JSON.stringify(a) === JSON.stringify(b), l + ' (kreeg ' + JSON.stringify(a) + ', verwacht ' + JSON.stringify(b) + ')'); }
function extractFn(src, name) {
  const m = new RegExp('(?:async\\s+)?function\\s+' + name + '\\s*\\(').exec(src);
  if (!m) return '';
  let i = src.indexOf('{', m.index), d = 0;
  for (; i < src.length; i++) { if (src[i] === '{') d++; else if (src[i] === '}') { d--; if (!d) return src.slice(m.index, i + 1); } }
  return '';
}

// ══ DEEL 1 — BRON ══
const POSTQ = extractFn(HTML, 'sbPostQ');
ok(/if\(!tkEigenaarUid\(\)\) return uit\('failed',null,'account'\);/.test(POSTQ), 'bron: geen write en geen wachtrij-item zonder bekende eigenaar');
ok(/const CACHE_OWNER_KEY='tk_cache_owner_uid';/.test(HTML) && /localStorage\.getItem\('tk_cache_owner_uid'\)/.test(extractFn(HTML, 'tkEigenaarUid')), 'bron: eigenaar-terugval leest dezelfde sleutel als CACHE_OWNER_KEY');
ok(/TK_WACHTRIJ_OUDERS\[t\]&&await tkWachtrijHeeftOuder\(t,d\)/.test(POSTQ), 'bron: kindrij volgt haar ouder de wachtrij in');
ok(/magTimeout=!!\(d&&d\.id!=null&&\(IDEMPOTENT_TABELLEN_MET_CLIENT_ID\[t\]\|\|ignoreDup\)\)/.test(POSTQ), 'bron: time-out alleen bij idempotente rijen met client-id');
ok(/tkFoutcode\(err\)/.test(POSTQ) && !/console\.error\('sbPostQ',t,r\.status,err\)/.test(POSTQ), 'bron: geen serverfouttekst (rij-inhoud) in de console');
ok(/_ouderMislukt/.test(extractFn(HTML, 'flushOfflineQueue')), 'bron: flush slaat kinderen van een mislukte ouder over');
ok(/custom_training_exercises: true \};/.test(HTML), 'bron: oefeningenrijen zijn idempotent (client-id)');
ok(/const TK_IDEMPOTENT_ZONDER_UPDATE = \{ messages: true \};/.test(HTML), 'bron: berichten gebruiken ignore-duplicates (geen UPDATE-policy)');
ok(!/sbGet\('nutrition_products','&name=eq\./.test(HTML), 'bron: geen product meer terugzoeken op naam na het schrijven');
ok(!/sbGet\('nutrition_supplement_definitions','&name=eq\.'\+encodeURIComponent\(name\.trim\(\)\)\+'&created_by=eq\.'\+uid\+'&order=created_at\.desc/.test(HTML), 'bron: geen supplement-definitie terugzoeken na het schrijven');
ok(/intakeState\.goalsOpgeslagen\[gk\]/.test(extractFn(HTML, 'intakeConfirm')), 'bron: intake verstuurt al opgeslagen doelen niet opnieuw');
ok(/'tk_supp_defs','tk_voeding_shells'/.test(HTML), 'bron: nieuwe lokale sleutels zijn persoonsgebonden');
// AI Coach interpreteert geen opslagstatus: de AI-routes lezen wachtrij en markeringen niet.
const AI = ['generateSessionSummaryAI', 'askCoachAboutGoal', 'askCoachProfiel'].map(function (f) { return extractFn(HTML, f); }).join('\n');
ok(AI.length > 100 && !/offlineQueue|tkTrainingenOnbevestigd|tkSchrijfUitkomst|_pending/.test(AI), 'bron: AI-coachroutes lezen geen wachtrij- of opslagstatus');

// ══ DEEL 2 — ECHTE PAGINA ══
let chromium;
try { chromium = require('playwright').chromium; } catch (e) { chromium = null; }

function installeer(cfg) {
  const lees = function (k, d) { try { return JSON.parse(localStorage.getItem(k) || 'null') || d; } catch (_) { return d; } };
  const schrijf = function (k, v) { localStorage.setItem(k, JSON.stringify(v)); };
  window.__cfg = cfg; window.__toasts = []; window.__inflight = 0; window.__teller = {}; window.__console = [];
  window.toast = function (m) { window.__toasts.push(m); };
  window.go = function () {}; window.closeModal = function () {}; window.openModal = function () {};
  ['renderCustomTrainBtns', 'renderCustomTrainList', 'voedingRenderOverview', 'voedingRenderSupplementHistory', 'voedingSuppInfoButtonUpdate', 'voedingSuppHideSuggestions'].forEach(function (f) { window[f] = function () {}; });
  window.migrateLegacyWbSaved = async function () {};
  if (!window.__consoleGepatcht) { window.__consoleGepatcht = true; const oe = console.error, ow = console.warn; console.error = function () { window.__console.push([].slice.call(arguments).map(String).join(' ')); }; console.warn = function () { window.__console.push([].slice.call(arguments).map(String).join(' ')); }; }
  authSession = cfg.uid === null ? null : { user: { id: cfg.uid || 'u-a' }, access_token: 'x', refresh_token: null };
  if (cfg.queueFaalt) window.offlineQueueAdd = async function () { return false; };
  Object.defineProperty(navigator, 'onLine', { get: function () { return !window.__cfg.offline; }, configurable: true });
  const OUDERS = { custom_training_exercises: [['custom_training_id', 'custom_trainings']], nutrition_supplement_logs: [['supplement_id', 'nutrition_supplement_definitions']], nutrition_nutrient_values: [['product_id', 'nutrition_products']], nutrition_product_identifiers: [['product_id', 'nutrition_products']], nutrition_meal_items: [['meal_id', 'nutrition_meals'], ['product_id', 'nutrition_products']] };
  const GEEN_UPDATE = { nutrition_supplement_definitions: 1, nutrition_nutrient_values: 1, nutrition_product_identifiers: 1, messages: 1, research_consents: 1 };
  const antw = function (st, body, txt) { return { ok: st < 300, status: st, text: async function () { return txt || (st < 300 ? '' : JSON.stringify({ code: 'PGRST', message: 'err' })); }, json: async function () { return body || []; } }; };
  const tel = function (k) { window.__teller[k] = (window.__teller[k] || 0) + 1; return window.__teller[k]; };
  window.sbFetch = async function (url, o) {
    o = o || {}; const c = window.__cfg; const m = o.method || 'GET';
    const rest = url.split('/rest/v1/')[1] || ''; const tabel = rest.split('?')[0]; const q = decodeURIComponent(rest.split('?')[1] || '');
    const sleutel = m + ':' + tabel;
    if (c.offline) throw new TypeError('Failed to fetch');
    window.__inflight++;
    try {
      await new Promise(function (r) { setTimeout(r, 2); });
      const srv = lees('__srv', {}); const T = srv[tabel] || (srv[tabel] = {});
      const log = lees('__log', []);
      if (m !== 'GET') { log.push(sleutel + (o.body && o.body.id ? ':' + o.body.id : '') + (q ? '?' + q : '')); schrijf('__log', log); }
      if (c.hang && c.hang[sleutel]) return await new Promise(function () {});
      if (c.netwerk && c.netwerk[sleutel] && tel('n' + sleutel) <= c.netwerk[sleutel]) throw new TypeError('Failed to fetch');
      if (c.fail && c.fail[sleutel] && tel('f' + sleutel) <= c.fail[sleutel].keer) return antw(c.fail[sleutel].status, null, c.fail[sleutel].tekst);
      if (m === 'GET') {
        let rows = Object.values(T);
        const f = /(?:^|&)(id|name|custom_training_id|meal_type)=eq\.([^&]+)/g; let x;
        while ((x = f.exec(q))) { const k = x[1], v = x[2]; rows = rows.filter(function (r) { return String(r[k]) === v; }); }
        if (/order=sort_order\.asc/.test(q)) rows.sort(function (a, b) { return (a.sort_order || 0) - (b.sort_order || 0); });
        return antw(200, rows);
      }
      if (m === 'POST') {
        const b = Object.assign({}, o.body); const pref = String(o.prefer || '');
        for (const p of (OUDERS[tabel] || [])) { if (b[p[0]] != null && !(srv[p[1]] || {})[b[p[0]]]) return antw(tabel === 'custom_training_exercises' ? 403 : 409, null, JSON.stringify({ code: tabel === 'custom_training_exercises' ? '42501' : '23503', details: 'Failing row contains (' + JSON.stringify(b) + ')' })); }
        if (tabel === 'nutrition_product_identifiers' && Object.values(T).some(function (r) { return r.identifier_type === b.identifier_type && r.value === b.value && r.id !== b.id; })) return antw(409, null, JSON.stringify({ code: '23505' }));
        const id = b.id || ('srv-' + tabel + '-' + (Object.keys(T).length + 1));
        if (T[id]) {
          if (pref.indexOf('ignore-duplicates') >= 0) return antw(201, []);
          if (pref.indexOf('merge-duplicates') >= 0) { if (GEEN_UPDATE[tabel]) return antw(403, null, JSON.stringify({ code: '42501' })); T[id] = Object.assign({}, b, { id: id, _eig: authSession && authSession.user.id }); schrijf('__srv', srv); return antw(201, [T[id]]); }
          return antw(409, null, JSON.stringify({ code: '23505' }));
        }
        T[id] = Object.assign({}, b, { id: id, _eig: authSession && authSession.user.id }); schrijf('__srv', srv);
        if (c.kwijt && c.kwijt[sleutel] && tel('k' + sleutel) <= c.kwijt[sleutel]) throw new TypeError('connection reset');
        return antw(201, [T[id]]);
      }
      if (m === 'PATCH') { const mm = /id=eq\.(.+)$/.exec(q); if (mm && T[mm[1]]) { Object.assign(T[mm[1]], o.body); schrijf('__srv', srv); } return antw(200, []); }
      if (m === 'DELETE') { const mm = /(custom_training_id|id)=eq\.(.+)$/.exec(q); if (mm) Object.keys(T).forEach(function (k) { if (String(T[k][mm[1]]) === mm[2]) delete T[k]; }); schrijf('__srv', srv); return antw(204, []); }
      return antw(200, []);
    } finally { window.__inflight--; }
  };
}
// Wacht tot er geen verzoeken meer lopen en de stand niet meer verandert.
async function stil() {
  let vorige = '', gelijk = 0;
  for (let i = 0; i < 200 && gelijk < 3; i++) {
    await new Promise(function (r) { setTimeout(r, 20); });
    const nu = (window.__inflight || 0) + '|' + localStorage.getItem('__log') + '|' + localStorage.getItem('tk_trainings_onbevestigd');
    if (nu === vorige && !window.__inflight) gelijk++; else gelijk = 0; vorige = nu;
  }
}
async function staat(tid) {
  const lees = function (k, d) { try { return JSON.parse(localStorage.getItem(k) || 'null') || d; } catch (_) { return d; } };
  const srv = lees('__srv', {}); const q = await offlineQueueAll();
  const ct = srv.custom_trainings || {}, ce = Object.values(srv.custom_training_exercises || {});
  const lok = (typeof customTrainings !== 'undefined' ? customTrainings : []).find(function (t) { return t.id === tid; }) || null;
  return {
    serverTraining: tid ? !!ct[tid] : Object.keys(ct).length,
    serverNaam: tid && ct[tid] ? ct[tid].naam : null,
    serverOef: ce.filter(function (e) { return e.custom_training_id === tid; }).sort(function (a, b) { return a.sort_order - b.sort_order; }).map(function (e) { return e.exercise_id + '×' + e.sets; }),
    lokaalOef: lok ? (lok.exercise_targets || []).map(function (e) { return e.exercise_id + '×' + e.sets; }) : null,
    lokaalNaam: lok ? lok.name : null,
    opslag: (lees('tk_trainings', []) || []).some(function (t) { return t.id === tid; }),
    onbevestigd: lees('tk_trainings_onbevestigd', []).indexOf(tid) >= 0,
    wachtrij: q.map(function (i) { return i.method + ':' + i.table; }),
    toasts: window.__toasts.slice(), log: lees('__log', []),
    tellen: Object.keys(srv).reduce(function (a, k) { a[k] = Object.keys(srv[k]).length; return a; }, {})
  };
}
async function bouw(naam, ids, sets, bestaandId) {
  WB.st.sel = WB.defaultSel();
  WB.st.plan = { items: ids.map(function (id) { return { id: id, pick: 'compound', sets: sets, reps: '8-10', rest: 90 }; }) };
  const id = WB.saveWorkout(naam, bestaandId || null);
  return id;
}

(async function () {
  let browser = null;
  if (chromium) { try { browser = await chromium.launch(); } catch (e) { browser = null; } }
  if (!browser) { console.log('fOfflineDataIntegrity: deel 2 SKIP (Chromium niet beschikbaar in deze omgeving)'); }
  else {
    const URL = 'file://' + path.join(ROOT, 'index.html');
    const S = {};
    async function nieuw() { const ctx = await browser.newContext(); const p = await ctx.newPage(); await p.goto(URL); await p.waitForTimeout(400); await p.evaluate(function () { localStorage.clear(); }); return { ctx: ctx, p: p }; }
    async function herstart(ctx, p, cfg) { await p.close(); const p2 = await ctx.newPage(); await p2.goto(URL); await p2.waitForTimeout(400); await p2.evaluate(installeer, cfg || {}); return p2; }
    const run = function (p, fn, arg) { return p.evaluate('(async function(){ const stil=' + stil.toString() + '; const staat=' + staat.toString() + '; const bouw=' + bouw.toString() + '; return (' + fn.toString() + ')(' + JSON.stringify(arg === undefined ? null : arg) + '); })()'); };
    const OEF = async function (p) { return p.evaluate(function () { const E = ExerciseCatalogService.all(); return [E[20].catalog_id, E[21].catalog_id, E[22].catalog_id]; }); };
    try {
      // ════ TRACK B — BUILDER ════
      // B1 online
      { const { ctx, p } = await nieuw(); await p.evaluate(installeer, {}); const ex = await OEF(p);
        const r = await run(p, async function (a) { const id = await bouw('Kracht A', a, 4); await stil(); return Object.assign({ id: id }, await staat(id)); }, ex);
        eq([r.serverTraining, r.serverOef, r.onbevestigd, r.wachtrij.length], [true, ex.map(function (e) { return e + '×4'; }), false, 0], 'B1 online: training + 3 oefeningen in volgorde op de server, markering weg');
        ok(r.log.indexOf('POST:custom_trainings:' + r.id) < r.log.findIndex(function (l) { return l.indexOf('POST:custom_training_exercises') === 0; }), 'B1: training-rij vóór de oefeningen');
        S.B1 = { server: r.serverOef.length, onbevestigd: r.onbevestigd }; await ctx.close(); }

      // B2 offline → herstart → sync vóór flush → flush
      { const { ctx, p } = await nieuw(); await p.evaluate(installeer, { offline: true }); const ex = await OEF(p);
        const r = await run(p, async function (a) { const id = await bouw('Offline B', a, 3); await stil(); return Object.assign({ id: id }, await staat(id)); }, ex);
        eq([r.serverTraining, r.onbevestigd, r.wachtrij], [false, true, ['POST:custom_trainings', 'DELETE:custom_training_exercises', 'POST:custom_training_exercises', 'POST:custom_training_exercises', 'POST:custom_training_exercises']], 'B2 offline: training, dan oefeningen in de wachtrij; gemarkeerd');
        await p.evaluate(function () { localStorage.setItem('__srv', JSON.stringify({ custom_trainings: { ander: { id: 'ander', naam: 'Ander', sort_order: 0 } } })); });
        const p2 = await herstart(ctx, p, {});
        const voor = await run(p2, async function (id) { await syncCustomTrainingsFromSupabase(); await stil(); return await staat(id); }, r.id);
        eq([voor.lokaalOef, voor.opslag, voor.onbevestigd], [ex.map(function (e) { return e + '×3'; }), true, true], 'B2 herstart + sync vóór flush: training met alle oefeningen lokaal behouden');
        const na = await run(p2, async function (id) { await Promise.all([flushOfflineQueue(), flushOfflineQueue(), flushOfflineQueue()]); await stil(); await flushOfflineQueue(); await stil(); return await staat(id); }, r.id);
        eq([na.serverOef, na.onbevestigd, na.wachtrij.length, na.tellen.custom_training_exercises], [ex.map(function (e) { return e + '×3'; }), false, 0, 3], 'B2 flush (3× gelijktijdig + 1×): volledig op de server, markering weg, geen dubbele rijen');
        S.B2 = { naSync: na.serverOef.length, dubbel: na.tellen.custom_training_exercises }; await ctx.close(); }

      // B3 netwerkuitval tussen training en oefeningen
      { const { ctx, p } = await nieuw(); await p.evaluate(installeer, { netwerk: { 'POST:custom_training_exercises': 99, 'DELETE:custom_training_exercises': 99 } }); const ex = await OEF(p);
        const r = await run(p, async function (a) { const id = await bouw('Uitval', a, 2); await stil(); return Object.assign({ id: id }, await staat(id)); }, ex);
        eq([r.serverTraining, r.serverOef.length, r.onbevestigd, r.wachtrij.filter(function (w) { return w.indexOf('custom_training_exercises') > 0; }).length], [true, 0, true, 4], 'B3 uitval: training op de server, oefeningen veilig in de wachtrij, gemarkeerd');
        ok(!r.toasts.some(function (t) { return /alleen op dit toestel/.test(t); }), 'B3: gequeued is geen foutmelding');
        const p2 = await herstart(ctx, p, {});
        const na = await run(p2, async function (id) { await flushOfflineQueue(); await stil(); return await staat(id); }, r.id);
        eq([na.serverOef.length, na.onbevestigd, na.tellen.custom_training_exercises], [3, false, 3], 'B3 herstart + flush: volledig, markering weg, geen dubbele');
        await ctx.close(); }

      // B4 oefeningen definitief geweigerd → lokaal behouden → herstel bij volgende sync
      { const { ctx, p } = await nieuw(); await p.evaluate(installeer, { fail: { 'POST:custom_training_exercises': { status: 422, keer: 99 } } }); const ex = await OEF(p);
        const r = await run(p, async function (a) { const id = await bouw('Geweigerd', a, 5); await stil(); return Object.assign({ id: id }, await staat(id)); }, ex);
        eq([r.serverTraining, r.serverOef.length, r.onbevestigd, r.lokaalOef.length], [true, 0, true, 3], 'B4 oefeningen geweigerd: training-rij staat, oefeningen lokaal, gemarkeerd');
        ok(r.toasts.some(function (t) { return /alleen op dit toestel/.test(t); }), 'B4: foutmelding "alleen op dit toestel"');
        const p2 = await herstart(ctx, p, {});
        const h = await run(p2, async function (id) { await syncCustomTrainingsFromSupabase(); await stil(); return await staat(id); }, r.id);
        eq([h.lokaalOef.length, h.serverOef.length], [3, 3], 'B4 herstart + sync: lokale versie niet overschreven door de lege serverversie; stil herstel zet de oefeningen op de server');
        const h2 = await run(p2, async function (id) { await syncCustomTrainingsFromSupabase(); await stil(); return await staat(id); }, r.id);
        eq([h2.onbevestigd, h2.tellen.custom_training_exercises, h2.tellen.custom_trainings], [false, 3, 1], 'B4 volgende sync: bevestigd, markering weg, geen dubbele');
        await ctx.close(); }

      // B5 training-rij geweigerd → geen enkele oefening-write
      { const { ctx, p } = await nieuw(); await p.evaluate(installeer, { fail: { 'POST:custom_trainings': { status: 403, keer: 99 } } }); const ex = await OEF(p);
        const r = await run(p, async function (a) { const id = await bouw('Geen toegang', a, 3); await stil(); return Object.assign({ id: id }, await staat(id)); }, ex);
        eq([r.serverTraining, r.log.filter(function (l) { return l.indexOf('custom_training_exercises') >= 0; }).length, r.onbevestigd, r.lokaalOef.length, r.wachtrij.length], [false, 0, true, 3, 0], 'B5 training geweigerd: geen oefening-write, alles lokaal, gemarkeerd, niets gequeued');
        await ctx.close(); }

      // B6 lokale opslag niet beschikbaar (offline + IndexedDB weg)
      { const { ctx, p } = await nieuw(); await p.evaluate(installeer, { offline: true, queueFaalt: true }); const ex = await OEF(p);
        const r = await run(p, async function (a) { const id = await bouw('Geen opslag', a, 3); await stil(); return Object.assign({ id: id }, await staat(id)); }, ex);
        eq([r.opslag, r.lokaalOef.length, r.onbevestigd], [true, 3, true], 'B6 wachtrij faalt: training blijft lokaal (tk_trainings) en gemarkeerd');
        ok(r.toasts.some(function (t) { return /alleen op dit toestel/.test(t); }), 'B6: foutmelding');
        await ctx.close(); }

      // B7 bewerken offline → herstart → oudere serverversie overschrijft de bewerking niet
      { const { ctx, p } = await nieuw(); await p.evaluate(installeer, {}); const ex = await OEF(p);
        const id = await run(p, async function (a) { const id = await bouw('Bewerk', a, 3); await stil(); return id; }, ex);
        await p.evaluate(function () { window.__cfg.offline = true; });
        await run(p, async function (arg) { await bouw('Bewerk', arg.ex, 6, arg.id); await stil(); }, { ex: ex, id: id });
        const p2 = await herstart(ctx, p, {});
        const voor = await run(p2, async function (id) { await syncCustomTrainingsFromSupabase(); await stil(); return await staat(id); }, id);
        eq([voor.lokaalOef, voor.onbevestigd], [ex.map(function (e) { return e + '×6'; }), true], 'B7 herstart + sync vóór flush: bewerking (6 sets) blijft, niet overschreven door de serverversie (3 sets)');
        const na = await run(p2, async function (id) { await flushOfflineQueue(); await stil(); return await staat(id); }, id);
        eq([na.serverOef, na.onbevestigd, na.tellen.custom_training_exercises], [ex.map(function (e) { return e + '×6'; }), false, 3], 'B7 flush: server heeft de bewerking, markering weg, geen dubbele');
        await ctx.close(); }

      // B8 antwoord kwijt na geslaagde write → replay zonder dubbele rij
      { const { ctx, p } = await nieuw(); await p.evaluate(installeer, { kwijt: { 'POST:custom_training_exercises': 1 } }); const ex = await OEF(p);
        const id = await run(p, async function (a) { const id = await bouw('Kwijt', a, 3); await stil(); return id; }, ex);
        const na = await run(p, async function (id) { await flushOfflineQueue(); await stil(); return await staat(id); }, id);
        eq([na.tellen.custom_training_exercises, na.wachtrij.length, na.onbevestigd], [3, 0, false], 'B8 antwoord kwijt + replay: precies 3 oefeningenrijen');
        await ctx.close(); }

      // B9 accountwissel
      { const { ctx, p } = await nieuw(); await p.evaluate(installeer, { offline: true, uid: 'u-a' }); const ex = await OEF(p);
        const id = await run(p, async function (a) { const id = await bouw('Van A', a, 3); await stil(); return id; }, ex);
        const r = await p.evaluate(async function () { const voor = localStorage.getItem('tk_trainings_onbevestigd'); window.__cfg.offline = false; authSession = { user: { id: 'u-b' }, access_token: 'x' }; resetPersonalCacheIfNewDeviceOwner('u-b'); await flushOfflineQueue(); const srv = JSON.parse(localStorage.getItem('__srv') || '{}'); return { voor: !!voor, na: localStorage.getItem('tk_trainings_onbevestigd'), lokaal: localStorage.getItem('tk_trainings'), server: Object.keys(srv.custom_trainings || {}).length, wachtrij: (await offlineQueueAll()).length }; });
        eq([r.voor, r.na, r.lokaal, r.server, r.wachtrij > 0], [true, null, null, 0, true], 'B9 accountwissel: markering en lokale lijst van A gewist bij B, niets onder B verstuurd, items van A blijven geïsoleerd');
        await ctx.close(); }

      // ════ TRACK C — VOEDING ════
      async function supp(p, naam) { return p.evaluate(async function (n) { document.getElementById('voeding-supp-name').value = n; document.getElementById('voeding-supp-dose').value = '5'; await voedingSaveSupplement(); return { err: document.getElementById('voeding-supp-error').style.display, naam: document.getElementById('voeding-supp-name').value }; }, naam); }
      // C1 offline nieuw supplement 2× → één definitie, twee logs, juiste volgorde
      { const { ctx, p } = await nieuw(); await p.evaluate(installeer, { offline: true });
        const a = await supp(p, 'Creatine X'); const b = await supp(p, 'creatine x ');
        const q = await p.evaluate(async function () { return (await offlineQueueAll()).map(function (i) { return i.table; }); });
        eq([a.err, a.naam, b.err], ['none', '', 'none'], 'C1 offline supplement: opgeslagen (gequeued), formulier geleegd');
        eq(q, ['nutrition_supplement_definitions', 'nutrition_supplement_logs', 'nutrition_supplement_definitions', 'nutrition_supplement_logs'], 'C1: definitie vóór log in de wachtrij');
        const na = await p.evaluate(async function () { window.__cfg.offline = false; await flushOfflineQueue(); const s = JSON.parse(localStorage.getItem('__srv')); const defs = Object.values(s.nutrition_supplement_definitions || {}); const logs = Object.values(s.nutrition_supplement_logs || {}); return { defs: defs.length, logs: logs.length, fk: logs.every(function (l) { return defs.some(function (d) { return d.id === l.supplement_id; }); }), wachtrij: (await offlineQueueAll()).length }; });
        eq(na, { defs: 1, logs: 2, fk: true, wachtrij: 0 }, 'C1 sync: één definitie (geen dubbele bij herhaling), twee logs, FK klopt, wachtrij leeg');
        S.C1 = na; await ctx.close(); }
      // C2 mislukt (lokale opslag weg) → opnieuw online → één definitie
      { const { ctx, p } = await nieuw(); await p.evaluate(installeer, { offline: true, queueFaalt: true });
        const a = await supp(p, 'Magnesium');
        await p.evaluate(installeer, {});
        const b = await supp(p, 'Magnesium');
        const na = await p.evaluate(function () { const s = JSON.parse(localStorage.getItem('__srv')); return [Object.keys(s.nutrition_supplement_definitions || {}).length, Object.keys(s.nutrition_supplement_logs || {}).length]; });
        eq([a.err, a.naam, b.err, na], ['block', 'Magnesium', 'none', [1, 1]], 'C2 mislukt → fout + invoer blijft; opnieuw → precies één definitie en één log');
        await ctx.close(); }
      // C3 eigen product offline + maaltijd: product, waarden, barcode, maaltijd, regel in de juiste volgorde
      { const { ctx, p } = await nieuw(); await p.evaluate(installeer, { offline: true });
        const r = await p.evaluate(async function () {
          const zet = function (id, v) { let el = document.getElementById(id); if (!el) { el = document.createElement('input'); el.id = id; document.body.appendChild(el); } el.value = v; };
          zet('voeding-custom-kcal', '400'); zet('voeding-custom-protein', '10'); zet('voeding-custom-carbs', '50'); zet('voeding-custom-fat', '15');
          const bc = NutritionFoundation2Core.normalizeBarcode('5449000000996');
          await voedingPersistCustomProduct('Mijn reep', '', 'PER_100G', '5449000000996', bc, null);
          const pid = voedingSelectedProduct && voedingSelectedProduct.id;
          ['voeding-portion-error'].forEach(function (id) { if (!document.getElementById(id)) { const d = document.createElement('div'); d.id = id; document.body.appendChild(d); } });
          const voeg = async function () { zet('voeding-qty-input', '50'); zet('voeding-qty-unit', 'g'); zet('voeding-meal-select', 'breakfast'); voedingSelectedProduct = { id: pid, name: 'Mijn reep', nutrientRow: { basis: 'PER_100G', energy_kcal: 400, protein_g: 10, carbohydrate_g: 50, fat_g: 15 } }; await voedingConfirmAddToMeal(); };
          await voeg(); await voeg();
          return { pid: pid, q: (await offlineQueueAll()).map(function (i) { return i.table; }) };
        });
        eq(r.q, ['nutrition_products', 'nutrition_product_identifiers', 'nutrition_nutrient_values', 'nutrition_meals', 'nutrition_meal_items', 'nutrition_meals', 'nutrition_meal_items'], 'C3 offline: product → barcode → waarden → maaltijd → regel, FIFO');
        const na = await p.evaluate(async function () { window.__cfg.offline = false; await flushOfflineQueue(); await flushOfflineQueue(); const s = JSON.parse(localStorage.getItem('__srv')); const n = function (t) { return Object.keys(s[t] || {}).length; }; return { prod: n('nutrition_products'), nv: n('nutrition_nutrient_values'), id: n('nutrition_product_identifiers'), meals: n('nutrition_meals'), items: n('nutrition_meal_items'), wachtrij: (await offlineQueueAll()).length }; });
        eq(na, { prod: 1, nv: 1, id: 1, meals: 1, items: 2, wachtrij: 0 }, 'C3 sync: één product, één maaltijd (zelfde ontbijt), twee regels, geen FK-fout, wachtrij leeg');
        S.C3 = na; await ctx.close(); }
      // C4 product tijdelijk 503 tijdens de flush → kinderen blijven staan → volgende ronde compleet
      { const { ctx, p } = await nieuw(); await p.evaluate(installeer, { offline: true });
        await p.evaluate(async function () { const zet = function (id, v) { let el = document.getElementById(id); if (!el) { el = document.createElement('input'); el.id = id; document.body.appendChild(el); } el.value = v; }; zet('voeding-custom-kcal', '200'); zet('voeding-custom-protein', ''); zet('voeding-custom-carbs', ''); zet('voeding-custom-fat', ''); await voedingPersistCustomProduct('Yoghurt', '', 'PER_100G', '', null, null); });
        const r1 = await p.evaluate(async function () { window.__cfg = Object.assign({}, window.__cfg, { offline: false, fail: { 'POST:nutrition_products': { status: 503, keer: 1 } } }); await flushOfflineQueue(); const s = JSON.parse(localStorage.getItem('__srv') || '{}'); return { nv: Object.keys(s.nutrition_nutrient_values || {}).length, q: (await offlineQueueAll()).map(function (i) { return i.table; }), log: JSON.parse(localStorage.getItem('__log') || '[]').filter(function (l) { return l.indexOf('nutrient') >= 0; }).length }; });
        eq([r1.nv, r1.log, r1.q], [0, 0, ['nutrition_products', 'nutrition_nutrient_values']], 'C4 ouder faalt in de flush: kind niet verstuurd (geen FK-fout), beide blijven in volgorde');
        const r2 = await p.evaluate(async function () { await flushOfflineQueue(); const s = JSON.parse(localStorage.getItem('__srv')); return [Object.keys(s.nutrition_products).length, Object.keys(s.nutrition_nutrient_values).length, (await offlineQueueAll()).length]; });
        eq(r2, [1, 1, 0], 'C4 volgende ronde: compleet');
        await ctx.close(); }
      // C5 product geweigerd → geen waarden of barcode verstuurd, fout, invoer blijft
      { const { ctx, p } = await nieuw(); await p.evaluate(installeer, { fail: { 'POST:nutrition_products': { status: 422, keer: 1 } } });
        const r = await p.evaluate(async function () { const zet = function (id, v) { let el = document.getElementById(id); if (!el) { el = document.createElement('input'); el.id = id; document.body.appendChild(el); } el.value = v; }; zet('voeding-custom-kcal', '200'); zet('voeding-custom-protein', ''); zet('voeding-custom-carbs', ''); zet('voeding-custom-fat', ''); await voedingPersistCustomProduct('Kwark', '', 'PER_100G', '', null, null); const id1 = voedingPendingProduct && voedingPendingProduct.id; const e = document.getElementById('voeding-custom-error').style.display; await voedingPersistCustomProduct('Kwark', '', 'PER_100G', '', null, null); const s = JSON.parse(localStorage.getItem('__srv')); return { e: e, id1: id1, prods: Object.keys(s.nutrition_products || {}), nv: Object.keys(s.nutrition_nutrient_values || {}).length }; });
        eq([r.e, r.prods, r.nv], ['block', [r.id1], 1], 'C5 geweigerd → fout; opnieuw → hetzelfde product-id, één product, één waardenrij');
        await ctx.close(); }
      // C6 OFF-ingest: barcode al van een ander product (409) → winnaar, geen barcode aan het verkeerde product
      { const { ctx, p } = await nieuw(); await p.evaluate(installeer, {});
        const r = await p.evaluate(async function () {
          localStorage.setItem('__srv', JSON.stringify({ nutrition_products: { oud: { id: 'oud', name: 'Cola', created_by: 'u-a' } }, nutrition_product_identifiers: { i1: { id: 'i1', product_id: 'winnaar', identifier_type: 'EAN13', value: '5449000000996' } } }));
          window.sbGet = async function (t, q) { if (t === 'nutrition_product_identifiers' && window.__eerste !== 1) { window.__eerste = 1; return []; } const s = JSON.parse(localStorage.getItem('__srv')); if (t === 'nutrition_product_identifiers') return Object.values(s.nutrition_product_identifiers); return []; };
          const res = await voedingIngestOffCandidate({ barcode: '5449000000996', name: 'Cola', nutrients: { status: 'missing' } }, 'EAN13', { source_type: 'OPEN_FOOD_FACTS', source_name: 'off', source_record_id: 'x', source_version: '1', fetched_at: new Date().toISOString() }, 'OK', 'u-a');
          return res;
        });
        eq(r.productId, 'winnaar', 'C6 OFF: barcode-race → het product van de winnaar, niet een ouder product met dezelfde naam');
        await ctx.close(); }

      // ════ TRACK D — STATUS, PRIVACY, ACCOUNT ════
      { const { ctx, p } = await nieuw(); await p.evaluate(installeer, {});
        const r = await p.evaluate(async function () {
          const uit = {}; const zet = function (c) { window.__cfg = c; window.__teller = {}; };
          const w = async function (t, d) { const u = await sbPostQ(t, d, { detail: true }); return u.status + '/' + u.reden; };
          zet({}); uit.confirmed = await w('nutrition_hydration_entries', { user_id: 'u-a', amount_ml: 1 });
          zet({ offline: true }); uit.offline = await w('nutrition_hydration_entries', { user_id: 'u-a', amount_ml: 1 });
          zet({ netwerk: { 'POST:nutrition_hydration_entries': 1 } }); uit.netwerk = await w('nutrition_hydration_entries', { user_id: 'u-a', amount_ml: 1 });
          zet({ fail: { 'POST:goals': { status: 503, keer: 1 } } }); uit.server = await w('goals', { naam: 'x' });
          zet({ fail: { 'POST:goals': { status: 401, keer: 1 } } }); uit.auth = await w('goals', { naam: 'x' });
          zet({ fail: { 'POST:goals': { status: 422, keer: 1 } } }); uit.validatie = await w('goals', { naam: 'x' });
          zet({ fail: { 'POST:goals': { status: 403, keer: 1 } } }); uit.toegang = await w('goals', { naam: 'x' });
          const oq = window.offlineQueueAdd; window.offlineQueueAdd = async function () { return false; };
          zet({ offline: true }); uit.opslag = await w('goals', { naam: 'x' }); window.offlineQueueAdd = oq;
          const ses = authSession; authSession = null; const voor = (await offlineQueueAll()).length;
          zet({ offline: true }); uit.account = await w('goals', { naam: 'x' }); uit.accountGeenItem = (await offlineQueueAll()).length === voor;
          localStorage.setItem('tk_cache_owner_uid', 'u-a'); uit.verlopenSessie = await w('goals', { naam: 'x' });
          const laatste = (await offlineQueueAll()).slice(-1)[0]; uit.verlopenEigenaar = laatste && laatste.owner_uid; localStorage.removeItem('tk_cache_owner_uid'); authSession = ses;
          zet({ offline: true }); await sbPostQ('nutrition_products', { id: 'p-dep', name: 'x', created_by: 'u-a' }, { detail: true });
          zet({}); uit.afhankelijk = await w('nutrition_nutrient_values', { id: 'nv-dep', product_id: 'p-dep', basis: 'PER_100G' });
          TK_SCHRIJF_TIMEOUT_MS = 150;
          zet({ hang: { 'POST:nutrition_hydration_entries': true, 'POST:goals': true } });
          uit.timeout = await w('nutrition_hydration_entries', { user_id: 'u-a', amount_ml: 2 });
          let goalKlaar = false; sbPostQ('goals', { naam: 'geen id' }, { detail: true }).then(function () { goalKlaar = true; });
          await new Promise(function (r) { setTimeout(r, 400); }); uit.geenTimeoutZonderId = !goalKlaar;
          TK_SCHRIJF_TIMEOUT_MS = 20000;
          zet({ fail: { 'POST:nutrition_hydration_entries': { status: 422, keer: 1, tekst: JSON.stringify({ code: '23514', details: 'Failing row contains (geheim-gewicht-87kg)' }) } } }); window.__console = [];
          await sbPostQ('nutrition_hydration_entries', { user_id: 'u-a', amount_ml: 3 }, { detail: true });
          uit.privacy = window.__console.join('|').indexOf('geheim') < 0 && window.__console.join('|').indexOf('23514') >= 0;
          zet({}); localStorage.setItem('__srv', JSON.stringify({ messages: { m1: { id: 'm1' } } }));
          const mq = await sbPostQ('messages', { id: 'm1', body: 'x' }, { detail: true }); uit.berichtReplay = mq.status;
          return uit;
        });
        eq(r, { confirmed: 'confirmed/null', offline: 'queued/offline', netwerk: 'queued/netwerk', server: 'queued/server', auth: 'queued/auth', validatie: 'rejected/validatie', toegang: 'rejected/toegang', opslag: 'failed/opslag', account: 'failed/account', accountGeenItem: true, verlopenSessie: 'queued/offline', verlopenEigenaar: 'u-a', afhankelijk: 'queued/afhankelijk', timeout: 'queued/timeout', geenTimeoutZonderId: true, privacy: true, berichtReplay: 'confirmed' },
          'D1 statussen en redenen: CONFIRMED, QUEUED (offline/netwerk/server/auth/afhankelijk/timeout), REJECTED (validatie/toegang), FAILED (opslag/account); offline verlopen sessie → gequeued onder de toesteleigenaar; geen time-out zonder client-id; geen rij-inhoud in de console; replay van een bericht is een no-op');
        S.D1 = r; await ctx.close(); }
      // D2 status zichtbaar: melding en wachtrijscherm
      { const { ctx, p } = await nieuw(); await p.evaluate(installeer, { fail: { 'POST:custom_training_exercises': { status: 422, keer: 99 } } }); const ex = await OEF(p);
        const r = await run(p, async function (a) { await bouw('Zichtbaar', a, 3); await stil(); updateOfflineBadge(); await new Promise(function (r) { setTimeout(r, 100); }); let lijst = document.getElementById('offline-queue-list'); if (!lijst) { lijst = document.createElement('div'); lijst.id = 'offline-queue-list'; document.body.appendChild(lijst); } await renderOfflineQueueModal(); return { badge: document.getElementById('offline-badge').textContent, zichtbaar: document.getElementById('offline-badge').style.display, lijst: lijst.textContent }; }, ex);
        ok(/1 training staat alleen op dit toestel/.test(r.badge) && r.zichtbaar === 'block', 'D2: melding toont de training die alleen op dit toestel staat (' + r.badge + ')');
        ok(/Alleen op dit toestel: Zichtbaar/.test(r.lijst) && /Verwijder de app niet/.test(r.lijst), 'D2: wachtrijscherm noemt de training en waarschuwt');
        await ctx.close(); }
    } catch (e) { ok(false, 'deel 2 onverwachte fout: ' + (e && e.stack || e)); }
    console.log('SCENARIO_JSON ' + JSON.stringify(S));
    await browser.close();
  }
  msgs.forEach(function (m) { console.log(m); });
  console.log('fOfflineDataIntegrity: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail ? 1 : 0);
})();
