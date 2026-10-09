/* Sprint 5 — Offline Exercise & Session Sync Reliability (v4.70.22).
 *
 * Invariant: een trainingssessie gaat pas naar de server als de bijbehorende oefening daar aantoonbaar
 * bestaat (FK sessions.exercise_id → exercises.id). Lokale trainingsgegevens blijven bij elke mislukte
 * schrijfactie behouden. Geldt voor de gewone training (finishSession) én de begeleide workout (GW).
 *
 * Deel 1 (altijd): broncontroles.
 * Deel 2 (Chromium, anders SKIP): de ECHTE pagina — finishSession(), GW/GWUI, ensureExerciseRow(),
 * sbPostQ(), de echte IndexedDB-wachtrij, flushOfflineQueue() en loadHistory(). Alleen het netwerk
 * (sbFetch) is gesimuleerd als Supabase/PostgREST: FK op exercises, upsert op id bij
 * resolution=merge-duplicates, ON CONFLICT DO NOTHING bij resolution=ignore-duplicates, 409 bij een
 * dubbele id zonder resolutie. Server en wachtrij overleven een herstart (localStorage/IndexedDB).
 * Dit is BROWSERBEWIJS met een gesimuleerde server, geen toestelbewijs.
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
const ENSURE = extractFn(HTML, 'ensureExerciseRowStatus');
const POSTQ = extractFn(HTML, 'sbPostQ');
const FLUSH = extractFn(HTML, 'flushOfflineQueue');
const FINISH = extractFn(HTML, 'finishSession');
const DOPERSIST = extractFn(HTML, 'doPersist');
ok(!!ENSURE, 'bron: ensureExerciseRowStatus() bestaat');
ok(/sbPostQ\('exercises',row,\{detail:true,ignoreDuplicates:true\}\)/.test(ENSURE), 'bron: de FK-compat-rij gaat via sbPostQ (wachtrij) met ignore-duplicates');
ok(!/sbPost\('exercises'/.test(ENSURE), 'bron: geen directe sbPost meer (die viel offline stil weg)');
ok(/const queueOnly=!!\(opts&&opts\.queueOnly\), ignoreDup=!!\(opts&&opts\.ignoreDuplicates\)/.test(POSTQ), 'bron: sbPostQ kent queueOnly en ignoreDuplicates');
ok(/status==='confirmed'\|\|status==='queued'/.test(POSTQ), 'bron: zonder detail true alleen bij confirmed of queued (Sprint 6, DEC-QUEUE-001)');
ok(/item\.resolution==='ignore-duplicates'/.test(FLUSH), 'bron: flush gebruikt de opgeslagen resolutie');
ok(/_exNietGelukt\[item\.body\.exercise_id\]/.test(FLUSH), 'bron: flush stuurt geen sessie waarvan de oefening in dezelfde ronde mislukte');
ok(/const _exStatus=await ensureSessionExerciseRows\(list\)/.test(FINISH) && (FINISH.match(/tkSessieOptsVoor\(_exStatus,ex\.id\)/g) || []).length === 2, 'bron: finishSession gebruikt de oefeningstatus bij de sessie-write');
ok(/ensureExerciseRowStatus\(it\.id\)/.test(DOPERSIST) && /queueOnly:exStatus==='queued'/.test(DOPERSIST), 'bron: Guided gebruikt de oefeningstatus bij de sessie-write');
ok(/if\(_wOk!==true\) throw new Error\('session_write_rejected'\);/.test(FINISH), 'bron: bestaande afwijzingscontrole in finishSession ongewijzigd');

// ══ DEEL 2 — ECHTE PAGINA ══
let chromium;
try { chromium = require('playwright').chromium; } catch (e) { chromium = null; }

// Gesimuleerde Supabase in de pagina; staat in localStorage zodat een herstart hem behoudt.
function installeer(cfg) {
  const lees = function (k, d) { try { return JSON.parse(localStorage.getItem(k) || 'null') || d; } catch (_) { return d; } };
  const schrijf = function (k, v) { localStorage.setItem(k, JSON.stringify(v)); };
  window.__cfg = cfg; window.__toasts = []; window.__pr = 0; window.__draftWeg = 0;
  if (!localStorage.getItem('__srv_ex')) { const s = {}; (cfg.bestaand || []).forEach(function (id) { s[id] = 1; }); schrijf('__srv_ex', s); }
  window.toast = function (m) { window.__toasts.push(m); };
  window.go = function () {}; window.openModal = function () {}; window.closeModal = function () {};
  window.refreshStats = function () {}; window.stopTrainTimer = function () {};
  window.clearTrainingDraft = function () { window.__draftWeg++; };
  window.generateSessionSummaryAI = async function () { return ''; };
  window.completeTrainingInstance = async function () { schrijf('__inst', lees('__inst', 0) + 1); };
  window.upsertExerciseGoalField = async function () { window.__pr++; schrijf('__prtel', lees('__prtel', 0) + 1); };
  window.ensureVasteTrainingenLoaded = async function () {};
  authSession = { user: { id: 'u-test' }, access_token: 'x', refresh_token: null };
  if (cfg.queueFaalt) window.offlineQueueAdd = async function () { return false; };
  Object.defineProperty(navigator, 'onLine', { get: function () { return !window.__cfg.offline; }, configurable: true });
  const antw = function (st, body) { return { ok: st < 300, status: st, text: async function () { return st < 300 ? '' : 'err'; }, json: async function () { return body || []; } }; };
  window.sbFetch = async function (url, o) {
    o = o || {}; const c = window.__cfg; const m = o.method || 'GET';
    const log = lees('__log', []); const tabel = (url.split('/rest/v1/')[1] || '').split('?')[0];
    if (c.offline) throw new TypeError('Failed to fetch');
    if (m === 'GET') {
      if (tabel === 'sessions') return antw(200, Object.values(lees('__srv_ses', {})).sort(function (a, b) { return a.date < b.date ? 1 : -1; }));
      return antw(200, []);
    }
    if (tabel === 'exercises' && m === 'POST') {
      log.push('ex:' + o.body.id); schrijf('__log', log);
      if (c.exNetwerkFout && !lees('__exNetwerkGehad', false)) { schrijf('__exNetwerkGehad', true); throw new TypeError('Failed to fetch'); }
      if (c.exStatus) return antw(c.exStatus);
      const s = lees('__srv_ex', {}); const ignore = String(o.prefer || '').indexOf('ignore-duplicates') >= 0;
      if (s[o.body.id]) { if (ignore) return antw(201, []); return antw(409); }
      s[o.body.id] = 1; schrijf('__srv_ex', s); return antw(201, [o.body]);
    }
    if (tabel === 'sessions' && m === 'POST') {
      log.push('ses:' + o.body.exercise_id); schrijf('__log', log);
      if (c.sesStatus) return antw(c.sesStatus);
      if (!lees('__srv_ex', {})[o.body.exercise_id]) { schrijf('__fk', lees('__fk', 0) + 1); return antw(409); }   // 23503
      const s = lees('__srv_ses', {}); s[o.body.id] = o.body; schrijf('__srv_ses', s);
      if (c.antwoordKwijt && !lees('__antwoordKwijtGehad', false)) { schrijf('__antwoordKwijtGehad', true); throw new TypeError('connection reset'); }
      if (c.sesHang) return new Promise(function () {});
      return antw(201, [o.body]);
    }
    return antw(200, []);
  };
}
// Gewone training: de echte finishSession() met een gelogde sessie.
async function gewoon(exIds) {
  const E = ExerciseCatalogService;
  curT = 'custom_test'; activeInstanceId = 'inst-n'; finishSessionBezig = false; sessionPrBase = {};
  window.getSessionExs = function () { return exIds.map(function (id) { return { id: id, naam: E.byId(id).identity.name }; }); };
  sessionLog = {}; exIds.forEach(function (id) { sessionLog[id] = { sets: [{ kg: 20, reps: 8, rpe: 8 }, { kg: 22.5, reps: 6, rpe: 8.5 }] }; });
  await finishSession();
  return { sessieBewaard: Object.keys(sessionLog).length, curT: curT };
}
// Begeleide workout: de echte GW-opslag.
async function begeleid(exIds) {
  GW.start({ items: exIds.map(function (id, i) { return { id: id, block: 'main', label: 'L' + i, pick: 'main', sets: 2 }; }) }, { goal: 'kracht' }, { instanceId: 'inst-g' });
  const a = GW.active(); a.items.forEach(function (it) { it.weight = 20; it.setsDone = [{ reps: 8, rpe: 8 }, { reps: 7, rpe: 8.5 }]; });
  a.gi = a.items.length - 1; a.phase = 'advice'; GWUI.render = function () {}; GWUI.next();
  const p = GW.pendingSave(); if (p) await Promise.race([p, new Promise(function (r) { setTimeout(r, 1500); })]);
  return { status: GW.saveStatus() && GW.saveStatus().status, lokaal: !!localStorage.getItem('tk_gw_active') };
}
async function staat() {
  const lees = function (k, d) { try { return JSON.parse(localStorage.getItem(k) || 'null') || d; } catch (_) { return d; } };
  const q = await offlineQueueAll();
  const ses = lees('__srv_ses', {});
  return {
    serverSessies: Object.values(ses).map(function (r) { return r.exercise_id; }).sort(), sessieIds: Object.keys(ses).sort(),
    serverOefeningen: Object.keys(lees('__srv_ex', {})).sort(), fk: lees('__fk', 0), log: lees('__log', []),
    wachtrij: q.map(function (i) { return i.table + ':' + (i.table === 'sessions' ? i.body.exercise_id : i.body && i.body.id); }),
    toasts: window.__toasts.slice(), pr: lees('__prtel', 0), inst: lees('__inst', 0), draftWeg: window.__draftWeg
  };
}

(async function () {
  let browser = null;
  if (chromium) { try { browser = await chromium.launch(); } catch (e) { browser = null; } }
  if (!browser) { console.log('fOfflineExerciseSessionSync: deel 2 SKIP (Chromium niet beschikbaar in deze omgeving)'); }
  else {
    const URL = 'file://' + path.join(ROOT, 'index.html');
    const SAMENVATTING = {};
    async function scenario(naam, route, cfg, stappen) {
      const ctx = await browser.newContext();
      let p = await ctx.newPage(); await p.goto(URL); await p.waitForTimeout(500);
      await p.evaluate(function () { localStorage.clear(); });
      await p.evaluate(installeer, cfg);
      const ids = await p.evaluate(function (n) {
        const E = ExerciseCatalogService.all(); return { A: E[10].catalog_id, B: E[11].catalog_id, C: E[12].catalog_id };
      });
      const exIds = (cfg.oefeningen || ['A']).map(function (k) { return ids[k]; });
      if (cfg.bestaandSleutels) await p.evaluate(function (lijst) { const s = JSON.parse(localStorage.getItem('__srv_ex') || '{}'); lijst.forEach(function (id) { s[id] = 1; }); localStorage.setItem('__srv_ex', JSON.stringify(s)); }, cfg.bestaandSleutels.map(function (k) { return ids[k]; }));
      if (cfg.lokaal) await p.evaluate(function (lijst) { lijst.forEach(function (id) { if (!exercises.some(function (e) { return e.id === id; })) exercises.push({ id: id, name: id }); }); }, cfg.lokaal.map(function (k) { return ids[k]; }));
      const res = { ids: ids, exIds: exIds };
      res.uit = await p.evaluate('(' + (route === 'gewoon' ? gewoon : begeleid).toString() + ')(' + JSON.stringify(exIds) + ')');
      res.na = await p.evaluate(staat);
      for (const s of (stappen || [])) {
        if (s.herstart) { await p.close(); p = await ctx.newPage(); await p.goto(URL); await p.waitForTimeout(500); }
        await p.evaluate(installeer, Object.assign({}, cfg, s.cfg || {}));
        if (s.flush) await p.evaluate(async function (n) { const ps = []; for (let i = 0; i < n; i++) ps.push(flushOfflineQueue()); await Promise.all(ps); await new Promise(function (r) { setTimeout(r, 50); }); }, s.flush);
        if (s.historie) res.historie = await p.evaluate(async function (ids) {
          await loadHistory(); const el = document.getElementById('hist-list'); const html = el ? el.innerHTML : '';
          return ids.map(function (id) { return (html.match(new RegExp('openEditSess\\(&quot;[^&]*&quot;,&quot;' + id + '&quot;', 'g')) || []).length; });
        }, exIds);
        res[s.naam] = await p.evaluate(staat);
      }
      await p.evaluate(async function () { const q = await offlineQueueAll(); for (const i of q) await offlineQueueRemove(i.id); });
      await ctx.close();
      SAMENVATTING[naam + ' [' + route + ']'] = { uit: res.uit, na: { sessies: res.na.serverSessies.length, wachtrij: res.na.wachtrij, fk: res.na.fk, toasts: res.na.toasts.slice(-1) } };
      return res;
    }
    try {
      for (const route of ['gewoon', 'begeleid']) {
        const G = route === 'begeleid';
        const okStatus = function (r, s) { return G ? r.uit.status === s : true; };

        // 1. Online, bestaande oefening
        const s1 = await scenario('online bestaand', route, { bestaandSleutels: ['A'] });
        eq([s1.na.serverSessies.length, s1.na.fk, s1.na.log.filter(function (x) { return x.indexOf('ex:') === 0; }).length <= 1], [1, 0, true], route + ' 1 online bestaand: 1 sessie, geen FK-fout');
        ok(okStatus(s1, 'confirmed'), route + ' 1: status confirmed');

        // 2. Online, nieuwe oefening
        const s2 = await scenario('online nieuw', route, {});
        eq([s2.na.serverOefeningen.indexOf(s2.exIds[0]) >= 0, s2.na.serverSessies.length, s2.na.fk], [true, 1, 0], route + ' 2 online nieuw: oefening aangemaakt, 1 sessie, geen FK-fout');
        ok(s2.na.log.indexOf('ex:' + s2.exIds[0]) < s2.na.log.indexOf('ses:' + s2.exIds[0]), route + ' 2: oefening vóór sessie');

        // 3. Offline, bestaande oefening
        const s3 = await scenario('offline bestaand', route, { offline: true, bestaandSleutels: ['A'] }, [{ naam: 'sync', flush: 1, cfg: { offline: false } }]);
        ok(okStatus(s3, 'queued'), route + ' 3 offline bestaand: status queued');
        eq([s3.sync.serverSessies.length, s3.sync.wachtrij.length, s3.sync.fk], [1, 0, 0], route + ' 3: na sync 1 sessie, wachtrij leeg');

        // 4. Offline, nieuwe oefening — het kernscenario
        const s4 = await scenario('offline nieuw', route, { offline: true }, [{ naam: 'sync', flush: 1, cfg: { offline: false } }, { naam: 'hist', historie: true, cfg: { offline: false } }]);
        ok(okStatus(s4, 'queued'), route + ' 4 offline nieuw: status queued');
        eq(s4.na.wachtrij, ['exercises:' + s4.exIds[0], 'sessions:' + s4.exIds[0]], route + ' 4: wachtrij = oefening, dan sessie');
        eq([s4.sync.serverOefeningen.indexOf(s4.exIds[0]) >= 0, s4.sync.serverSessies.length, s4.sync.wachtrij.length, s4.sync.fk], [true, 1, 0, 0], route + ' 4: na sync oefening + sessie op de server, wachtrij leeg, geen FK-fout');
        eq(s4.historie, [1], route + ' 4 History: de training staat precies één keer in de historie');
        if (!G) ok(s4.na.toasts.some(function (t) { return /gesynchroniseerd/.test(t); }) && !s4.na.toasts.some(function (t) { return /^\d+ oefeningen opgeslagen$/.test(t); }), 'gewoon 4: melding "wordt gesynchroniseerd", niet "opgeslagen"');

        // 5. Offline, meerdere nieuwe oefeningen
        const s5 = await scenario('offline meerdere nieuw', route, { offline: true, oefeningen: ['A', 'B', 'C'] }, [{ naam: 'sync', flush: 1, cfg: { offline: false } }]);
        eq([s5.sync.serverSessies.length, s5.sync.serverOefeningen.length, s5.sync.wachtrij.length, s5.sync.fk], [3, 3, 0, 0], route + ' 5 offline 3 nieuwe: 3 oefeningen, 3 sessies, geen FK-fout');
        ok(s5.na.wachtrij.every(function (w, i, a) { if (w.indexOf('sessions:') !== 0) return true; const ex = w.split(':')[1]; return a.indexOf('exercises:' + ex) > -1 && a.indexOf('exercises:' + ex) < i; }), route + ' 5: elke sessie staat ná haar oefening in de wachtrij');

        // 6. Netwerkuitval tussen oefening en sessie
        const s6 = await scenario('uitval tussen oefening en sessie', route, { exNetwerkFout: true }, [{ naam: 'sync', flush: 1 }]);
        eq([s6.na.fk, s6.na.wachtrij], [0, ['exercises:' + s6.exIds[0], 'sessions:' + s6.exIds[0]]], route + ' 6 uitval: sessie niet los naar de server (geen FK-fout), beide in de wachtrij');
        ok(okStatus(s6, 'queued'), route + ' 6: status queued');
        eq([s6.sync.serverSessies.length, s6.sync.wachtrij.length], [1, 0], route + ' 6: na sync 1 sessie');

        // 7. Server weigert de oefening
        const s7 = await scenario('server weigert oefening', route, { exStatus: 403 });
        eq([s7.na.serverSessies.length, s7.na.log.filter(function (x) { return x.indexOf('ses:') === 0; }).length, s7.na.wachtrij.length], [0, 0, 0], route + ' 7 oefening geweigerd: geen sessie-write geprobeerd, niets gequeued');
        ok(G ? (s7.uit.status === 'failed' && s7.uit.lokaal) : (s7.uit.sessieBewaard === 1 && s7.na.draftWeg === 0), route + ' 7: training lokaal bewaard');
        ok(s7.na.toasts.some(function (t) { return /mislukt/i.test(t); }), route + ' 7: foutmelding');

        // 8. Server weigert de sessie
        const s8 = await scenario('server weigert sessie', route, { sesStatus: 422, bestaandSleutels: ['A'] });
        ok(G ? (s8.uit.status === 'failed' && s8.uit.lokaal) : (s8.uit.sessieBewaard === 1 && s8.na.draftWeg === 0), route + ' 8 sessie geweigerd: training lokaal bewaard');
        eq(s8.na.pr, 0, route + ' 8: geen record voor een niet-opgeslagen sessie');

        // 9. Wachtrij-opslag faalt (offline + IndexedDB weg)
        const s9 = await scenario('wachtrij faalt', route, { offline: true, queueFaalt: true });
        ok(G ? (s9.uit.status === 'failed' && s9.uit.lokaal) : (s9.uit.sessieBewaard === 1 && s9.na.draftWeg === 0), route + ' 9 wachtrij faalt: geen schijnsucces, training lokaal bewaard');
        ok(s9.na.toasts.some(function (t) { return /mislukt/i.test(t); }), route + ' 9: foutmelding');

        // 9b. Wachtrij faalt bij een al bekende oefening (alleen de sessie-write raakt de wachtrij)
        const s9b = await scenario('wachtrij faalt, oefening bekend', route, { offline: true, queueFaalt: true, bestaandSleutels: ['A'], lokaal: ['A'] });
        ok(G ? (s9b.uit.status === 'failed' && s9b.uit.lokaal) : (s9b.uit.sessieBewaard === 1 && s9b.na.draftWeg === 0), route + ' 9b wachtrij faalt bij bekende oefening: geen schijnsucces, training lokaal bewaard');
        ok(!s9b.na.toasts.some(function (t) { return /opgeslagen$/.test(t) && !/mislukt/.test(t); }), route + ' 9b: geen "opgeslagen"-melding');

        // 10. Herstart tijdens pending sync (antwoord na geslaagde server-write kwijt)
        const s10 = await scenario('herstart tijdens sync', route, { offline: true }, [{ naam: 'sync1', flush: 1, cfg: { offline: false, antwoordKwijt: true } }, { naam: 'sync2', herstart: true, flush: 1, cfg: { offline: false } }]);
        ok(s10.sync1.wachtrij.length >= 1, route + ' 10: na onderbroken sync staat er nog iets in de wachtrij');
        eq([s10.sync2.serverSessies.length, s10.sync2.wachtrij.length, s10.sync2.fk], [1, 0, 0], route + ' 10: na herstart en sync precies 1 sessie, geen dubbele');

        // 11. Meerdere synchronisatiepogingen en dubbele events
        const s11 = await scenario('dubbele sync', route, { offline: true, oefeningen: ['A', 'B'] }, [{ naam: 'sync', flush: 3, cfg: { offline: false } }, { naam: 'nogmaals', flush: 2, cfg: { offline: false } }]);
        eq([s11.nogmaals.serverSessies.length, s11.nogmaals.serverOefeningen.length, s11.nogmaals.wachtrij.length], [2, 2, 0], route + ' 11: 5 sync-aanroepen, waarvan 3 gelijktijdig: 2 sessies, 2 oefeningen, geen dubbele');

        // 12. Gedeeltelijke synchronisatie: oefening B faalt tijdelijk tijdens de sync
        const s12 = await scenario('gedeeltelijke sync', route, { offline: true, oefeningen: ['A', 'B'] }, [{ naam: 'sync1', flush: 1, cfg: { offline: false, exStatusVoor: null } }]);
        ok(s12.sync1.serverSessies.length === 2 || s12.sync1.wachtrij.length === 0, route + ' 12 (controle): normale sync rondt af');

        // 13. Records
        const s13 = await scenario('records', route, { offline: true, oefeningen: ['A', 'B'] }, [{ naam: 'sync', flush: 1, cfg: { offline: false } }]);
        ok(s13.na.pr <= 2 && s13.sync.pr === s13.na.pr, route + ' 13: records één keer, niet opnieuw bij synchronisatie');
      }

      // 12b. Gedeeltelijke sync met een tijdelijk falende oefening (dependency-aware flush)
      const ctx = await browser.newContext(); const p = await ctx.newPage(); await p.goto(URL); await p.waitForTimeout(500);
      await p.evaluate(function () { localStorage.clear(); });
      await p.evaluate(installeer, { offline: true });
      const ids = await p.evaluate(function () { const E = ExerciseCatalogService.all(); return [E[10].catalog_id, E[11].catalog_id]; });
      await p.evaluate('(' + begeleid.toString() + ')(' + JSON.stringify(ids) + ')');
      // sync waarbij alleen de oefening ids[1] een tijdelijke 503 krijgt
      await p.evaluate(function (b) {
        installeer_ = null;
        const orig = window.sbFetch; window.__cfg.offline = false;
        window.sbFetch = async function (url, o) { if (o && o.method === 'POST' && url.indexOf('/rest/v1/exercises') >= 0 && o.body.id === b) { const l = JSON.parse(localStorage.getItem('__log') || '[]'); l.push('ex503:' + b); localStorage.setItem('__log', JSON.stringify(l)); return { ok: false, status: 503, text: async function () { return ''; }, json: async function () { return []; } }; } return orig(url, o); };
      }, ids[1]);
      await p.evaluate(async function () { await flushOfflineQueue(); });
      const deel = await p.evaluate(staat);
      eq([deel.serverSessies, deel.fk], [[ids[0]], 0], '12b gedeeltelijke sync: sessie van de gelukte oefening staat op de server, de andere sessie is NIET verstuurd (geen FK-fout)');
      eq(deel.wachtrij, ['exercises:' + ids[1], 'sessions:' + ids[1]], '12b: de mislukte oefening en haar sessie blijven samen in de wachtrij');
      await p.evaluate(installeer, { offline: false });
      await p.evaluate(async function () { await flushOfflineQueue(); });
      const rest = await p.evaluate(staat);
      eq([rest.serverSessies.length, rest.wachtrij.length, rest.fk], [2, 0, 0], '12b: volgende sync rondt af, geen dubbele');
      await ctx.close();

      // 14. sbPostQ zonder opties: de oude booleans, behalve queue faalt → false (Sprint 6)
      const ctx2 = await browser.newContext(); const p2 = await ctx2.newPage(); await p2.goto(URL); await p2.waitForTimeout(500);
      const legacy = await p2.evaluate(async function () {
        const uit = {}; window.updateOfflineBadge = function () {};
        for (const st of [201, 400, 403, 409, 422, 401, 429, 503]) {
          window.offlineQueueAdd = async function () { return true; };
          window.sbFetch = async function () { return { ok: st < 300, status: st, text: async function () { return ''; } }; };
          uit[st] = await sbPostQ('sessions', { date: '2026-10-08', exercise_id: 'x' });
        }
        window.sbFetch = async function () { throw new TypeError('x'); };
        window.offlineQueueAdd = async function () { return false; };
        uit.queueFaalt = await sbPostQ('sessions', { date: '2026-10-08', exercise_id: 'x' });
        return uit;
      });
      eq(legacy, { 201: true, 400: false, 403: false, 409: false, 422: false, 401: true, 429: true, 503: true, queueFaalt: false }, '14 sbPostQ zonder opties: oude booleans, behalve een mislukte queue (Sprint 6, DEC-QUEUE-001)');
      await ctx2.close();
    } catch (e) { ok(false, 'deel 2 onverwachte fout: ' + (e && e.stack || e)); }
    console.log('SCENARIO_JSON ' + JSON.stringify(SAMENVATTING));
    await browser.close();
  }
  msgs.forEach(function (m) { console.log(m); });
  console.log('fOfflineExerciseSessionSync: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail ? 1 : 0);
})();
