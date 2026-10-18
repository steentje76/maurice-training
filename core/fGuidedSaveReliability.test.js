/* Sprint 3 — Guided Workout Save Reliability (v4.70.20).
 *
 * Bevinding (gereproduceerd op main fde8b5de): bij een geweigerde server-write (400/403/409/422)
 * of een mislukte offline-queue telde de begeleide workout de rij toch als geschreven, rondde de
 * training-instance af, wiste de lokale kopie (tk_gw_active), toonde "Voltooid" zonder melding en
 * blokkeerde een nieuwe poging (sessionsLogged). Gevolg: stil verlies van de training. Ook werd het
 * PR-record bijgewerkt voor een sessie die nooit is opgeslagen, en een dubbele tik op de laatste
 * stap logde de samenvatting twee keer.
 *
 * Deel 1 (altijd): broncontroles op de opslagketen.
 * Deel 2 (Chromium, anders SKIP): de echte pagina met de echte GW/GWUI-module en een gesimuleerde
 * server (upsert op id, zoals PostgREST met resolution=merge-duplicates). Per scenario: wat staat
 * op de server, wat in de wachtrij, wat lokaal, wat ziet de sporter, kan hij opnieuw proberen.
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
  if (!m) throw new Error('functie niet gevonden: ' + name);
  let i = src.indexOf('{', m.index), d = 0;
  for (; i < src.length; i++) { if (src[i] === '{') d++; else if (src[i] === '}') { d--; if (!d) return src.slice(m.index, i + 1); } }
  throw new Error('functie niet afgesloten: ' + name);
}

// ══ DEEL 1 — BRON ══
const POSTQ = extractFn(HTML, 'sbPostQ');
const DOPERSIST = extractFn(HTML, 'doPersist');
const FINISH = (function () { const i = HTML.indexOf('  function finish(){\n    if(!st.active)return Promise.resolve(null);'); return i < 0 ? '' : HTML.slice(i, HTML.indexOf('\n  }\n', i)); })();
ok(/async function writeSessionRow\(row, opts\)\{ return await sbPostQ\('sessions', row, opts\); \}/.test(HTML), 'bron: writeSessionRow geeft opts door');
ok(/const detail=!!\(opts&&opts\.detail\);/.test(POSTQ), 'bron: sbPostQ kent een optionele detail-uitkomst');
eq((POSTQ.match(/return (?:uit|queue)\(/g) || []).length, 6, 'bron: elke uitgang van sbPostQ loopt via één uitkomst (uit(), sinds v4.70.24 ook via queue() die zelf uit() gebruikt)');
ok(/return detail\?tkSchrijfUitkomst\(status,http(?:,reden)?\)/.test(POSTQ), 'bron: detail geeft tkSchrijfUitkomst');
ok(/q===true\?uit\('queued',http,reden\):uit\('failed',http,'opslag'\)/.test(POSTQ), 'bron: queued alleen als queuen zelf lukte');
ok(/:\(status==='confirmed'\|\|status==='queued'\)/.test(POSTQ), 'bron: zonder detail true alleen bij confirmed of queued (Sprint 6, DEC-QUEUE-001)');
ok(/writeSessionRow\(built\.row,\{detail:true[,}]/.test(DOPERSIST), 'bron: Guided vraagt de echte uitkomst op');
ok(/built\.row\.id=it\._rowId;/.test(DOPERSIST), 'bron: stabiel client-id per rij');
ok(DOPERSIST.indexOf('if(!it._rowId)') < DOPERSIST.indexOf('writeSessionRow('), 'bron: id vastgelegd vóór de write');
ok(!/written\+\+/.test(DOPERSIST), 'bron: geen blinde teller meer');
ok(/if\(st8!=='failed'\)\{/.test(DOPERSIST) && DOPERSIST.indexOf('if(st8!==\'failed\'){') < DOPERSIST.indexOf('upsertExerciseGoalField'), 'bron: PR-record alleen na een opgeslagen rij');
ok(/!n\.failed && typeof completeTrainingInstance==='function'/.test(DOPERSIST), 'bron: instance pas afronden als alles opgeslagen is');
ok(/if\(status==='failed'\)\{ persist\(\); \}\s*else \{ a\.sessionsLogged=true; clearActive\(\); \}/.test(DOPERSIST), 'bron: lokale kopie pas weg na opslag');
ok(FINISH && !/clearActive\(\)/.test(FINISH), 'bron: finish() wist de lokale kopie niet meer zelf');
ok(/if\(!a\._gelogd\)/.test(FINISH), 'bron: één samenvatting per training');
ok(/function abort\(\)\{if\(unsaved\(st\.active\)\)return false;/.test(HTML), 'bron: abort() gooit een niet-opgeslagen training niet weg');
ok(/if\(tkGuidedStartGeblokkeerd\(mode\)\)return;/.test(extractFn(HTML, 'previewStartTraining')) && extractFn(HTML, 'previewStartTraining').indexOf('tkGuidedStartGeblokkeerd') < extractFn(HTML, 'previewStartTraining').indexOf('startInstanceFromDefinition('), 'bron: geen nieuwe begeleide start over een niet-opgeslagen training, vóór het aanmaken van een instance');

// ══ DEEL 2 — ECHTE PAGINA ══
let chromium;
try { chromium = require('playwright').chromium; } catch (e) { chromium = null; }

// In de pagina: een gesimuleerde server + wachtrij in localStorage, zodat een "herstart"
// (nieuwe pagina, zelfde opslag) dezelfde server en wachtrij ziet.
function installeer(cfg) {
  const lees = function (k, d) { try { return JSON.parse(localStorage.getItem(k) || 'null') || d; } catch (_) { return d; } };
  const schrijf = function (k, v) { localStorage.setItem(k, JSON.stringify(v)); };
  window.__cfg = cfg; window.__toasts = []; window.__pr = 0; window.__inst = lees('__inst', 0);
  authSession = { user: { id: 'u-test' }, access_token: 'x', refresh_token: null }; // Sprint 7: een write heeft een eigenaar nodig
  window.toast = function (m) { window.__toasts.push(m); };
  window.go = function () {}; window.updateOfflineBadge = function () {};
  window.completeTrainingInstance = async function () { window.__inst++; schrijf('__inst', window.__inst); };
  window.upsertExerciseGoalField = async function () { window.__pr++; };
  window.offlineQueueAdd = async function (it) { if (window.__cfg.queueFaalt) return false; if (it.table !== 'sessions') return true; const q = lees('__queue', []); q.push(it.body && it.body.id); schrijf('__queue', q); return true; };   // telt alleen sessies (sinds v4.70.22 gaat ook de FK-compat-rij via de wachtrij)
  Object.defineProperty(navigator, 'onLine', { get: function () { return !window.__cfg.offline; }, configurable: true });
  window.sbFetch = async function (url, o) {
    if (url.indexOf('/rest/v1/sessions') < 0) return { ok: true, status: 200, text: async function () { return ''; }, json: async function () { return []; } };
    const pogingen = lees('__posts', []); pogingen.push(o.body.id); schrijf('__posts', pogingen);
    const plan = window.__cfg.status; const st = Array.isArray(plan) ? plan[(pogingen.length - 1) % plan.length] : plan;
    if (st === 'netwerk') throw new TypeError('Failed to fetch');
    if (st === 'hang') return new Promise(function () {});
    if (st < 300) { const srv = lees('__srv', {}); srv[o.body.id] = o.body; schrijf('__srv', srv); }
    return { ok: st < 300, status: st, text: async function () { return 'x'; }, json: async function () { return [o.body]; } };
  };
}
function staat() {
  const lees = function (k, d) { try { return JSON.parse(localStorage.getItem(k) || 'null') || d; } catch (_) { return d; } };
  const srv = lees('__srv', {}); const posts = lees('__posts', []); const queue = lees('__queue', []);
  const el = document.getElementById('gw-scroll'); let scherm = '';
  if (el && window.GWUI) { GWUI.render(); scherm = el.innerText.replace(/\s+/g, ' '); }
  const s = GW.saveStatus();
  return {
    status: s ? s.status : null, serverRijen: Object.keys(srv).length, posts: posts.length, uniekePosts: new Set(posts).size,
    queue: queue.length, uniekeQueue: new Set(queue).size, ids: Object.keys(srv).sort(), instance: window.__inst, pr: window.__pr,
    lokaal: !!localStorage.getItem('tk_gw_active'), hasUnsaved: GW.hasUnsaved(), hasActive: GW.hasActive(),
    log: lees('tk_gw_log', []).length, toasts: window.__toasts.slice(), scherm: scherm,
    opnieuwKnop: !!(el && el.innerHTML.indexOf('GWUI.retrySave()') >= 0), nieuweKnop: !!(el && el.innerHTML.indexOf('GWUI.again()') >= 0)
  };
}
async function startEnAfronden(dubbel) {
  const exs = ExerciseCatalogService.all();
  GW.start({ items: [{ id: exs[0].catalog_id, block: 'main', label: 'A', pick: 'main', sets: 2 }, { id: exs[1].catalog_id, block: 'main', label: 'B', pick: 'main', sets: 2 }] }, { goal: 'kracht' }, { instanceId: 'inst-1' });
  const a = GW.active(); a.items.forEach(function (it) { it.weight = 20; it.setsDone = [{ reps: 8, rpe: 8 }, { reps: 7, rpe: 8.5 }]; });
  a.gi = a.items.length - 1; a.phase = 'advice';
  GWUI.next(); if (dubbel) GWUI.next();
  await new Promise(function (r) { setTimeout(r, 300); });
}

(async function () {
  let browser = null;
  if (chromium) { try { browser = await chromium.launch(); } catch (e) { browser = null; } }
  if (!browser) { console.log('fGuidedSaveReliability: deel 2 SKIP (Chromium niet beschikbaar in deze omgeving)'); }
  else {
    const URL = 'file://' + path.join(ROOT, 'index.html');
    async function scenario(cfg, stappen) {
      const ctx = await browser.newContext();
      let page = await ctx.newPage();
      await page.goto(URL); await page.waitForTimeout(500);
      await page.evaluate(function () { localStorage.clear(); });
      await page.evaluate(installeer, cfg);
      const res = {};
      await page.evaluate('(' + startEnAfronden.toString() + ')(' + (cfg.dubbel ? 'true' : 'false') + ')');
      res.na = await page.evaluate(staat);
      for (const s of (stappen || [])) {
        if (s.herstart) { await page.close(); page = await ctx.newPage(); await page.goto(URL); await page.waitForTimeout(500); }
        await page.evaluate(installeer, Object.assign({}, cfg, s.cfg || {}));
        if (s.herstart) res.naHerstart = await page.evaluate(function () {
          const home = (function () { try { return DASH.guidedActive(); } catch (_) { return null; } })();
          GWUI.launch(); return { hasUnsaved: GW.hasUnsaved(), home: home, status: GW.saveStatus() && GW.saveStatus().status };
        });
        if (s.preview) res.preview = await page.evaluate(async function () {
          let starts = 0; window.startInstanceFromDefinition = async function () { starts++; return 'x'; };
          previewCtx = { def: { exercises: [] }, order: [], removedIds: new Set(), swaps: {} };
          await previewStartTraining('guided'); const r = { starts: starts, toasts: window.__toasts.slice() }; previewCtx = null; return r;
        });
        if (s.klaar) { await page.evaluate(function () { GWUI.finishHome(); }); }
        if (s.opnieuw) { await page.evaluate(async function () { GWUI.retrySave(); const p = GW.pendingSave(); if (p) await p; await new Promise(function (r) { setTimeout(r, 50); }); }); }
        res[s.naam] = await page.evaluate(staat);
      }
      await ctx.close();
      return res;
    }
    try {
      // ── Server bevestigt ──
      const r201 = await scenario({ status: 201 });
      eq([r201.na.status, r201.na.serverRijen, r201.na.instance, r201.na.lokaal], ['confirmed', 2, 1, false], '201: bevestigd, 2 rijen, instance afgerond, lokale kopie weg');
      ok(r201.na.scherm.indexOf('Training opgeslagen') >= 0 && !r201.na.opnieuwKnop, '201: scherm zegt "Training opgeslagen", geen herstelknop');
      ok(r201.na.toasts.indexOf('Training opgeslagen') >= 0, '201: melding "Training opgeslagen"');

      // ── Server weigert ──
      for (const st of [400, 403, 409, 422]) {
        const r = await scenario({ status: st });
        eq([r.na.status, r.na.serverRijen, r.na.queue, r.na.instance], ['failed', 0, 0, 0], st + ': niet opgeslagen, niet gequeued, instance NIET afgerond');
        ok(r.na.lokaal && r.na.hasUnsaved, st + ': training blijft lokaal bewaard');
        ok(r.na.scherm.indexOf('Opslaan mislukt') >= 0 && r.na.opnieuwKnop, st + ': scherm meldt de fout en biedt "Opnieuw opslaan"');
        ok(!r.na.nieuweKnop, st + ': geen "Nieuwe training" zolang niet opgeslagen');
        ok(r.na.toasts.some(function (t) { return /Opslaan mislukt/.test(t); }), st + ': foutmelding');
        eq(r.na.pr, 0, st + ': geen PR-record voor een niet-opgeslagen sessie');
      }

      // ── Tijdelijke fout / offline: wachtrij ──
      for (const st of [401, 429, 500, 503, 'netwerk']) {
        const r = await scenario({ status: st });
        eq([r.na.status, r.na.uniekeQueue, r.na.serverRijen, r.na.instance, r.na.lokaal], ['queued', 2, 0, 1, false], st + ': in de wachtrij (2 unieke ids), lokale kopie weg');
        ok(r.na.scherm.indexOf('Offline opgeslagen') >= 0 && r.na.scherm.indexOf('Training opgeslagen') < 0, st + ': scherm zegt "Offline opgeslagen", niet "opgeslagen"');
        ok(r.na.toasts.some(function (t) { return /gesynchroniseerd/.test(t); }) && r.na.toasts.indexOf('Training opgeslagen') < 0, st + ': melding over synchronisatie, niet "Training opgeslagen"');
      }
      const rOff = await scenario({ status: 201, offline: true });
      eq([rOff.na.status, rOff.na.posts, rOff.na.uniekeQueue, rOff.na.lokaal], ['queued', 0, 2, false], 'offline: niets verstuurd, 2 rijen in de wachtrij');

      // ── Queuen mislukt (IndexedDB weg) ──
      const rQ = await scenario({ status: 201, offline: true, queueFaalt: true });
      eq([rQ.na.status, rQ.na.queue, rQ.na.lokaal, rQ.na.instance], ['failed', 0, true, 0], 'queue faalt: geen schijnsucces, lokaal bewaard, instance open');

      // ── 422, daarna opnieuw proberen (zelfde sessie) ──
      const rR = await scenario({ status: 422 }, [{ naam: 'retry', opnieuw: true, cfg: { status: 201 } }]);
      eq([rR.retry.status, rR.retry.serverRijen, rR.retry.instance, rR.retry.lokaal], ['confirmed', 2, 1, false], '422 → opnieuw: bevestigd, 2 rijen, instance 1×');
      eq(rR.retry.uniekePosts, 2, '422 → opnieuw: dezelfde 2 ids opnieuw verstuurd (geen nieuwe ids)');
      ok(rR.retry.posts === 4, '422 → opnieuw: 2 pogingen per rij');

      // ── Gedeeltelijk: rij 1 ok, rij 2 geweigerd ──
      const rP = await scenario({ status: [201, 422] }, [{ naam: 'retry', opnieuw: true, cfg: { status: 201 } }]);
      eq([rP.na.status, rP.na.serverRijen, rP.na.instance], ['failed', 1, 0], 'gedeeltelijk: status failed, 1 rij op de server, instance open');
      eq([rP.retry.status, rP.retry.serverRijen, rP.retry.posts, rP.retry.instance], ['confirmed', 2, 3, 1], 'gedeeltelijk → opnieuw: alleen de mislukte rij opnieuw, geen dubbele');

      // ── Herstart na een geweigerde write ──
      const rH = await scenario({ status: 422 }, [{ naam: 'naHerstartRetry', herstart: true, opnieuw: true, cfg: { status: 201 } }]);
      eq([rH.naHerstart.hasUnsaved, rH.naHerstart.home, rH.naHerstart.status], [true, true, 'failed'], 'herstart: training staat nog open op Vandaag, status "failed"');
      eq([rH.naHerstartRetry.status, rH.naHerstartRetry.serverRijen, rH.naHerstartRetry.uniekePosts, rH.naHerstartRetry.instance, rH.naHerstartRetry.lokaal], ['confirmed', 2, 2, 1, false], 'herstart → opnieuw: bevestigd, geen dubbele rijen');

      // ── Time-out: request blijft hangen, app wordt gesloten ──
      const rT = await scenario({ status: 'hang' }, [{ naam: 'naHerstartRetry', herstart: true, opnieuw: true, cfg: { status: 201 } }]);
      eq([rT.na.status, rT.na.lokaal], ['saving', true], 'hangend verzoek: status "saving", training lokaal bewaard');
      eq(rT.naHerstart.status, 'unsaved', 'herstart na hangend verzoek: status "unsaved" (uitkomst onbekend)');
      eq([rT.naHerstartRetry.status, rT.naHerstartRetry.serverRijen, rT.naHerstartRetry.uniekePosts], ['confirmed', 2, 2], 'herstart → opnieuw: zelfde ids, geen dubbele rijen');

      // ── Dubbel tikken op de laatste stap ──
      const rD = await scenario({ status: 201, dubbel: true });
      eq([rD.na.posts, rD.na.serverRijen, rD.na.log, rD.na.instance], [2, 2, 1, 1], 'dubbel tikken: één opslagronde, één samenvatting, instance 1×');

      // ── "Klaar" en nieuwe start bij een niet-opgeslagen training ──
      const rK = await scenario({ status: 422 }, [{ naam: 'naKlaar', klaar: true }, { naam: 'naPreview', preview: true }]);
      ok(rK.naKlaar.lokaal && rK.naKlaar.hasUnsaved, 'Klaar bij niet-opgeslagen training: niet weggegooid');
      ok(rK.naKlaar.toasts.some(function (t) { return /nog niet opgeslagen/.test(t); }), 'Klaar: melding dat de training nog niet is opgeslagen');
      eq(rK.preview.starts, 0, 'nieuwe begeleide start: geen nieuwe instance zolang de vorige niet is opgeslagen');
      ok(rK.preview.toasts.some(function (t) { return /vorige begeleide training is nog niet opgeslagen/.test(t); }), 'nieuwe begeleide start: duidelijke melding');
      ok(rK.naPreview.lokaal, 'nieuwe begeleide start: de niet-opgeslagen training blijft staan');

      // ── Bestaand gedrag: sbPostQ zonder opts ──
      const ctx = await browser.newContext(); const pg = await ctx.newPage(); await pg.goto(URL); await pg.waitForTimeout(500);
      const legacy = await pg.evaluate(async function () {
        authSession = { user: { id: 'u-test' } }; // Sprint 7: een write heeft een eigenaar nodig
        const uit = {};
        window.updateOfflineBadge = function () {};
        for (const st of [201, 400, 422, 403, 401, 429, 503]) {
          window.offlineQueueAdd = async function () { return true; };
          window.sbFetch = async function () { return { ok: st < 300, status: st, text: async function () { return ''; } }; };
          uit[st] = await sbPostQ('sessions', { date: '2026-10-08', exercise_id: 'x' });
        }
        window.sbFetch = async function () { throw new TypeError('x'); };
        uit.netwerk = await sbPostQ('sessions', { date: '2026-10-08', exercise_id: 'x' });
        window.offlineQueueAdd = async function () { return false; };
        uit.netwerkQueueFaalt = await sbPostQ('sessions', { date: '2026-10-08', exercise_id: 'x' });
        uit.detailQueueFaalt = (await sbPostQ('sessions', { date: '2026-10-08', exercise_id: 'x' }, { detail: true })).status;
        return uit;
      });
      eq(legacy, { 201: true, 400: false, 422: false, 403: false, 401: true, 429: true, 503: true, netwerk: true, netwerkQueueFaalt: false, detailQueueFaalt: 'failed' }, 'sbPostQ zonder opts: oude booleans, behalve een mislukte queue (Sprint 6, DEC-QUEUE-001: geen valse succesmelding meer)');
      await ctx.close();
    } catch (e) { ok(false, 'deel 2 onverwachte fout: ' + (e && e.stack || e)); }
    await browser.close();
  }
  msgs.forEach(function (m) { console.log(m); });
  console.log('fGuidedSaveReliability: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail ? 1 : 0);
})();
