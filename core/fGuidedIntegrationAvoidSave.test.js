/* Sprint 4 — Integratie #527 (trainingscontext op vervangpaden) + #528 (betrouwbare Guided-opslag)
 * + DEC-AVOID-001 (automatische keuze nooit een expliciet vermeden oefening).
 *
 * Draait de ECHTE pagina (Chromium; zonder Chromium SKIP deel 2) met de echte catalogus, de echte
 * AthleteConstraints-core, de echte GW/GWUI-module, de echte offline-wachtrij (IndexedDB) en de echte
 * flushOfflineQueue(). Alleen het netwerk (sbFetch) is gesimuleerd: een server die op id upsert, zoals
 * PostgREST met resolution=merge-duplicates. Dit is SIMULATIE + BROWSERBEWIJS, geen toestelbewijs.
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
const HELPER = extractFn(HTML, 'tkZonderVermeden');
const SWAP = extractFn(HTML, 'swapAlternative');
const GW_ALT = (function () { const i = HTML.indexOf('  function alt(){\n    var it=GW.cur();'); return HTML.slice(i, HTML.indexOf('  function quit(){', i)); })();
ok(/AthleteConstraints\.avoidMatch\(t,naamVan\(c\)\|\|''\)==='exact'/.test(HELPER), 'bron: dezelfde exacte matchregel als de core (avoidMatch)');
ok(/athleteAvoidTerms\(\)/.test(HELPER) && !/athleteEquipmentSet/.test(HELPER), 'bron: alleen avoid-termen, geen materiaalregel');
ok(GW_ALT.indexOf('applyAthleteConstraintsCatalog(alts)') < GW_ALT.indexOf('tkZonderVermeden(alts') && GW_ALT.indexOf('tkZonderVermeden(alts') < GW_ALT.indexOf('alts[0].catalog_id'), 'bron: Guided — constraints, dan vermeden eruit, dan pas de keuze');
ok(SWAP.indexOf('AthleteConstraints.applyConstraints') < SWAP.indexOf('tkZonderVermeden(alts') && SWAP.indexOf('tkZonderVermeden(alts') < SWAP.indexOf('if(!alts.length)return null;'), 'bron: Builder-swap — constraints, dan vermeden eruit, dan "geen alternatief"');
ok(!/tkZonderVermeden/.test(extractFn(HTML, 'previewRenderSwapPicker')) && !/tkZonderVermeden/.test(extractFn(HTML, 'openSwapExercise')), 'bron: handmatige pickers ongewijzigd (sporter kiest zelf; PO_DECISION_REQUIRED)');
ok(!/tkZonderVermeden/.test(extractFn(HTML, 'generate')), 'bron: Autobuild ongewijzigd ("nooit lege training"; PO_DECISION_REQUIRED)');
ok(/if\(typeof ensureExerciseRow==='function'\)\{ try\{ await ensureExerciseRow\(it\.id\); \}catch\(_\)\{\} \}/.test(extractFn(HTML, 'doPersist')) && extractFn(HTML, 'doPersist').indexOf('ensureExerciseRow(it.id)') < extractFn(HTML, 'doPersist').indexOf('writeSessionRow('), 'bron: Guided maakt vóór de write de FK-compat-rij (zelfde helper als finishSession)');
ok(/Filtering mag nooit een lege set opleveren/.test(fs.readFileSync(path.join(__dirname, 'athleteConstraints.js'), 'utf8')), 'bron: core-contract (regel 5) ongewijzigd');

// ══ DEEL 2 — ECHTE PAGINA ══
let chromium;
try { chromium = require('playwright').chromium; } catch (e) { chromium = null; }

function installeer(cfg) {
  const lees = function (k, d) { try { return JSON.parse(localStorage.getItem(k) || 'null') || d; } catch (_) { return d; } };
  const schrijf = function (k, v) { localStorage.setItem(k, JSON.stringify(v)); };
  window.__cfg = cfg; window.__toasts = []; window.__pr = 0; window.__inst = lees('__inst', 0);
  window.toast = function (m) { window.__toasts.push(m); };
  window.go = function () {};
  window.completeTrainingInstance = async function () { window.__inst++; schrijf('__inst', window.__inst); };
  window.upsertExerciseGoalField = async function () { window.__pr++; };
  authSession = { user: { id: 'u-test' }, access_token: 'x', refresh_token: null };
  Object.defineProperty(navigator, 'onLine', { get: function () { return !window.__cfg.offline; }, configurable: true });
  window.sbFetch = async function (url, o) {
    if (window.__cfg.offline) throw new TypeError('Failed to fetch');   // echt offline: elk verzoek faalt
    if (url.indexOf('/rest/v1/exercises') >= 0 && o && o.method === 'POST') { const ex = lees('__exs', {}); ex[o.body.id] = 1; schrijf('__exs', ex); return { ok: true, status: 201, text: async function () { return ''; }, json: async function () { return [o.body]; } }; }
    if (url.indexOf('/rest/v1/sessions') < 0) return { ok: true, status: 200, text: async function () { return ''; }, json: async function () { return []; } };
    const p = lees('__posts', []); p.push(o.body.id); schrijf('__posts', p);
    let st = window.__cfg.status;
    // FK sessions.exercise_id → exercises.id (productieschema): onbekende oefening = 23503 → 409.
    if (window.__cfg.fk && st < 300 && !lees('__exs', {})[o.body.exercise_id]) st = 409;
    if (st < 300) { const srv = lees('__srv', {}); srv[o.body.id] = o.body; schrijf('__srv', srv); }
    return { ok: st < 300, status: st, text: async function () { return 'x'; }, json: async function () { return [o.body]; } };
  };
  tkTrainingCtx = cfg.ctx === undefined ? false : cfg.ctx;
}

(async function () {
  let browser = null;
  if (chromium) { try { browser = await chromium.launch(); } catch (e) { browser = null; } }
  if (!browser) { console.log('fGuidedIntegrationAvoidSave: deel 2 SKIP (Chromium niet beschikbaar in deze omgeving)'); }
  else {
    const URL = 'file://' + path.join(ROOT, 'index.html');
    async function pagina(ctx) { const p = await ctx.newPage(); await p.goto(URL); await p.waitForTimeout(500); return p; }
    try {
      // ── A. AthleteConstraints: automatische keuze ──
      const ctxA = await browser.newContext(); const pA = await pagina(ctxA);
      const A = await pA.evaluate(async function (installeerSrc) {
        eval('window.__inst_=' + installeerSrc);
        const E = ExerciseCatalogService; const basis = E.all().find(function (e) { return e.identity.name === 'Band Curl'; });
        const alts = WB.altList(basis.catalog_id).map(function (a) { return a.identity.name; });
        const zonderRel = E.all().find(function (e) { return WB.altList(e.catalog_id).length === 0; });
        GWUI.render = function () {};
        async function guided(ctx, exId) {
          window.__inst_({ status: 201, ctx: ctx });
          GW.start({ items: [{ id: exId || basis.catalog_id, block: 'main', label: 'A', pick: 'main', sets: 2 }, { id: E.all()[3].catalog_id, block: 'main', label: 'B', pick: 'main', sets: 2 }] }, { goal: 'kracht' }, {});
          const a = GW.active(); a.items[1].setsDone = [{ reps: 8, rpe: 8 }]; a.items[1].weight = 30;
          GWUI.alt(); await new Promise(function (r) { setTimeout(r, 400); });
          const c = GW.cur(); const r = { naam: E.byId(c.id).identity.name, materiaal: E.byId(c.id).identity.equipment, toasts: window.__toasts.slice(),
            andereSets: GW.active().items[1].setsDone.length, andereKg: GW.active().items[1].weight, andereId: GW.active().items[1].id };
          GW.abort(); return r;
        }
        function builder(ctx) {
          window.__inst_({ status: 201, ctx: ctx });
          return null;
        }
        return {
          alts: alts, rel0: zonderRel ? zonderRel.identity.name : null, refB: E.all()[3].catalog_id,
          materiaalOk: await guided({ location: 'thuis', equipment: ['dumbbell'], avoid_exercises: [] }),
          materiaalOntbreekt: await guided({ location: 'thuis', equipment: ['kettlebell'], avoid_exercises: [] }),
          vermijdEen: await guided({ location: 'gym', equipment: [], avoid_exercises: [alts[0]] }),
          vermijdAlles: await guided({ location: 'gym', equipment: [], avoid_exercises: alts.slice() }),
          materiaalEnVermijd: await guided({ location: 'thuis', equipment: ['kettlebell'], avoid_exercises: [alts[0]] }),
          geenContext: await guided(false),
          geenAlternatief: zonderRel ? await guided({ location: 'gym', equipment: [], avoid_exercises: [] }, zonderRel.catalog_id) : null
        };
      }, installeer.toString());
      ok(A.alts.length >= 4 && A.alts[0] === 'Barbell Curl', 'A: testgeval Band Curl → ' + A.alts.join(', '));
      ok(A.materiaalOk.materiaal.every(function (m) { return m === 'dumbbell' || m === 'bodyweight'; }), 'A1 materiaal beschikbaar: uitvoerbaar alternatief (' + A.materiaalOk.naam + ')');
      eq(A.materiaalOntbreekt.naam, A.alts[0], 'A2 geen passend materiaal: bestaande fallback (eerste alternatief), ongewijzigd');
      ok(A.vermijdEen.naam !== A.alts[0], 'A3 één vermeden oefening: niet gekozen (' + A.vermijdEen.naam + ')');
      eq(A.vermijdAlles.naam, 'Band Curl', 'A4 alle alternatieven vermeden: oefening blijft staan (DEC-AVOID-001; was: vermeden oefening via fallback)');
      ok(A.vermijdAlles.toasts.indexOf('Geen geschikt alternatief') >= 0, 'A4: bestaande melding "Geen geschikt alternatief"');
      ok(A.materiaalEnVermijd.naam !== A.alts[0], 'A5 materiaalfallback + vermeden: de vermeden oefening valt alsnog weg (' + A.materiaalEnVermijd.naam + ')');
      eq(A.geenContext.naam, A.alts[0], 'A6 geen gebruikerscontext: ongewijzigd het eerste alternatief');
      if (A.geenAlternatief) ok(A.geenAlternatief.toasts.indexOf('Geen geschikt alternatief') >= 0, 'A7 geen alternatieven in de catalogus (' + A.rel0 + '): bestaande melding');
      ok([A.materiaalOk, A.vermijdEen, A.vermijdAlles, A.geenContext].every(function (r) { return r.andereSets === 1 && r.andereKg === 30 && r.andereId === A.refB; }), 'A8 vervangen raakt de sets en het gewicht van andere oefeningen niet');

      // Builder-swap (WB.swapAlternative) met dezelfde context
      const B = await pA.evaluate(function () {
        const E = ExerciseCatalogService; const basis = E.all().find(function (e) { return e.identity.name === 'Band Curl'; });
        const alts = WB.altList(basis.catalog_id).map(function (a) { return a.identity.name; });
        function swap(ctx) {
          tkTrainingCtx = ctx;
          WB.st.sel = { goal: 'kracht' };
          WB.st.plan = { items: [{ id: basis.catalog_id, block: 'main', sets: 3 }, { id: E.all()[3].catalog_id, block: 'main', sets: 3 }] };
          const nid = WB.swapAlternative(0);
          if (WB.st.plan.items[1].id !== E.all()[3].catalog_id) return { fout: 'ander item gewijzigd' };
          return { nid: nid ? E.byId(nid).identity.name : null };
        }
        return { alts: alts, vermijdAlles: swap({ location: 'gym', equipment: [], avoid_exercises: alts.slice() }), vermijdEen: swap({ location: 'gym', equipment: [], avoid_exercises: [alts[0]] }), geen: swap(false) };
      });
      ok(!B.vermijdAlles.fout && !B.vermijdEen.fout && !B.geen.fout, 'B: Builder-swap uitgevoerd op een echt WB-plan');
      {
        eq(B.vermijdAlles.nid, null, 'B1 Builder-swap, alles vermeden: geen alternatief (was: vermeden oefening)');
        ok(B.vermijdEen.nid && B.vermijdEen.nid !== B.alts[0], 'B2 Builder-swap, één vermeden: een ander alternatief (' + B.vermijdEen.nid + ')');
        ok(B.geen.nid !== null, 'B3 Builder-swap zonder context: ongewijzigd een alternatief');
      }
      await ctxA.close();

      // ── C. Gecombineerd: vervangen + opslaan ──
      async function combi(cfg, vervolg) {
        const ctx = await browser.newContext(); let p = await pagina(ctx);
        await p.evaluate(function () { localStorage.clear(); });
        await p.evaluate(installeer, cfg);
        const na = await p.evaluate(async function () {
          const E = ExerciseCatalogService; const basis = E.all().find(function (e) { return e.identity.name === 'Band Curl'; });
          GW.start({ items: [{ id: basis.catalog_id, block: 'main', label: 'A', pick: 'main', sets: 2 }, { id: E.all()[3].catalog_id, block: 'main', label: 'B', pick: 'main', sets: 2 }] }, { goal: 'kracht' }, { instanceId: 'inst-c' });
          GWUI.alt(); await new Promise(function (r) { setTimeout(r, 400); });
          const vervangen = GW.cur().id;
          const a = GW.active(); a.items.forEach(function (it) { if (it.weight == null) it.weight = 12; it.setsDone = [{ reps: 8, rpe: 8 }, { reps: 8, rpe: 8.5 }]; });
          a.gi = a.items.length - 1; a.phase = 'advice'; GWUI.next(); const pr = GW.pendingSave(); if (pr) await pr;
          return { vervangen: vervangen, vervangenNaam: E.byId(vervangen).identity.name, basisId: basis.catalog_id };
        });
        const staat = async function () {
          return p.evaluate(async function () {
            const lees = function (k, d) { try { return JSON.parse(localStorage.getItem(k) || 'null') || d; } catch (_) { return d; } };
            const srv = lees('__srv', {}); const q = await offlineQueueAll();
            return { status: GW.saveStatus() && GW.saveStatus().status, rijen: Object.values(srv).map(function (r) { return r.exercise_id; }).sort(), ids: Object.keys(srv).sort(),
              inst: Object.values(srv).map(function (r) { return r.training_instance_id; }), queue: q.filter(function (i) { return i.table === 'sessions'; }).map(function (i) { return i.body.id; }).sort(),
              lokaal: !!localStorage.getItem('tk_gw_active'), unsaved: GW.hasUnsaved(), pr: window.__pr, instAf: window.__inst, toasts: window.__toasts.slice() };
          });
        };
        const res = { na: na, s0: await staat() };
        for (const v of (vervolg || [])) {
          if (v.herstart) { await p.close(); p = await pagina(ctx); }
          await p.evaluate(installeer, Object.assign({}, cfg, v.cfg || {}));
          if (v.herstart) await p.evaluate(function () { GWUI.render = function () {}; GWUI.launch(); });
          if (v.opnieuw) await p.evaluate(async function () { GWUI.retrySave(); const pr = GW.pendingSave(); if (pr) await pr; });
          if (v.flush) await p.evaluate(async function () { await flushOfflineQueue(); await flushOfflineQueue(); });
          res[v.naam] = await staat();
        }
        await p.evaluate(async function () { const q = await offlineQueueAll(); for (const i of q) await offlineQueueRemove(i.id); });
        await ctx.close();
        return res;
      }
      const ctxVermijd = { location: 'gym', equipment: [], avoid_exercises: ['Barbell Curl'] };

      const c1 = await combi({ status: 201, ctx: ctxVermijd });
      ok(c1.na.vervangenNaam !== 'Barbell Curl' && c1.na.vervangen !== c1.na.basisId, 'C1 vervangen (niet de vermeden oefening): ' + c1.na.vervangenNaam);
      eq([c1.s0.status, c1.s0.rijen.length, c1.s0.instAf, c1.s0.lokaal], ['confirmed', 2, 1, false], 'C1 vervangen + opslaan: bevestigd, 2 rijen, instance 1×');
      ok(c1.s0.rijen.indexOf(c1.na.vervangen) >= 0 && c1.s0.rijen.indexOf(c1.na.basisId) < 0, 'C1: de vervangende oefening is opgeslagen, niet de oorspronkelijke');

      const c2 = await combi({ status: 422, ctx: ctxVermijd }, [{ naam: 'retry', opnieuw: true, cfg: { status: 201 } }]);
      eq([c2.s0.status, c2.s0.rijen.length, c2.s0.lokaal, c2.s0.instAf, c2.s0.pr], ['failed', 0, true, 0, 0], 'C2 vervangen + 422: niets opgeslagen, lokaal bewaard, instance open, geen PR-record');
      eq([c2.retry.status, c2.retry.rijen.length, c2.retry.instAf], ['confirmed', 2, 1], 'C2 opnieuw opslaan: bevestigd, 2 rijen');
      ok(c2.retry.rijen.indexOf(c2.na.vervangen) >= 0, 'C2: na opnieuw opslaan staat de vervangende oefening op de server');

      const c3 = await combi({ status: 201, ctx: ctxVermijd, offline: true }, [{ naam: 'sync', flush: true, cfg: { status: 201, offline: false } }]);
      eq([c3.s0.status, c3.s0.queue.length, c3.s0.rijen.length, c3.s0.lokaal], ['queued', 2, 0, false], 'C3 offline vervangen + afronden: 2 rijen in de echte wachtrij (IndexedDB)');
      eq([c3.sync.rijen.length, c3.sync.queue.length], [2, 0], 'C3 na synchronisatie (2× flush): 2 rijen op de server, wachtrij leeg — geen dubbele');
      eq(c3.sync.ids, c3.s0.queue, 'C3: de server-ids zijn exact de ids uit de wachtrij (idempotent)');
      ok(c3.sync.rijen.indexOf(c3.na.vervangen) >= 0 && c3.sync.inst.every(function (i) { return i === 'inst-c'; }), 'C3 historie: vervangende oefening en training-instance correct op de server');
      ok(c3.s0.pr >= 0 && c3.s0.toasts.some(function (t) { return /gesynchroniseerd/.test(t); }), 'C3: melding "wordt gesynchroniseerd", niet "Training opgeslagen"');

      const c4 = await combi({ status: 422, ctx: ctxVermijd }, [{ naam: 'naHerstart', herstart: true, cfg: { status: 422 } }, { naam: 'retry', opnieuw: true, cfg: { status: 201 } }, { naam: 'retry2', opnieuw: true, cfg: { status: 201 } }]);
      ok(c4.naHerstart.unsaved && c4.naHerstart.lokaal, 'C4 herstart met niet-bevestigde opslag: training staat nog open');
      eq([c4.retry.status, c4.retry.rijen.length, c4.retry.instAf], ['confirmed', 2, 1], 'C4 herstart → opnieuw opslaan: bevestigd, 2 rijen');
      eq([c4.retry2.rijen.length, c4.retry2.instAf], [2, 1], 'C4 nog een keer opnieuw: geen dubbele rijen, instance niet opnieuw afgerond');
      ok(c4.retry.rijen.indexOf(c4.na.vervangen) >= 0, 'C4: na herstart blijft de vervangen oefening behouden');

      // ── C5. Productieschema: FK sessions.exercise_id → exercises.id ──
      // Catalogus-only oefeningen staan niet in de exercises-tabel (productie: 20 van 226 TK-ids).
      // finishSession maakt vooraf een FK-compat-rij (ensureExerciseRow); Guided moet dat ook.
      const c5 = await combi({ status: 201, ctx: ctxVermijd, fk: true });
      eq([c5.s0.status, c5.s0.rijen.length, c5.s0.lokaal], ['confirmed', 2, false], 'C5 FK-schema: catalogusoefeningen krijgen eerst een exercises-rij, sessies bevestigd');
      const c5b = await combi({ status: 201, ctx: ctxVermijd, fk: true, offline: true }, [{ naam: 'sync', flush: true, cfg: { status: 201, offline: false, fk: true } }]);
      eq(c5b.s0.status, 'queued', 'C5 offline met FK-schema: in de wachtrij');
      // BEKEND, BESTAAND GEDRAG (ook finishSession): ensureExerciseRow() schrijft niet via de wachtrij.
      // Offline gelogd met een nieuwe catalogusoefening → bij sync weigert de FK de rij; het item blijft
      // zichtbaar in de wachtrij (niet verloren, niet dubbel). Vastgelegd als restrisico R4-OFFLINE-FK.
      eq([c5b.sync.rijen.length, c5b.sync.queue.length], [0, 2], 'C5 offline → sync met FK-schema: rijen blijven in de wachtrij (niet verloren, niet dubbel) — restrisico R4-OFFLINE-FK');
    } catch (e) { ok(false, 'deel 2 onverwachte fout: ' + (e && e.stack || e)); }
    await browser.close();
  }
  msgs.forEach(function (m) { console.log(m); });
  console.log('fGuidedIntegrationAvoidSave: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail ? 1 : 0);
})();
