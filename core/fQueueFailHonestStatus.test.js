/* Sprint 6 — R4-QUEUE-FAIL: eerlijke opslagstatus bij sbPostQ-aanroepers (v4.70.23, DEC-QUEUE-001).
 *
 * Invariant: de app meldt alleen "opgeslagen" als de server de write bevestigde (CONFIRMED) of als hij
 * duurzaam in de offline-wachtrij staat (QUEUED). Bij FAILED (queuen mislukt, IndexedDB weg) en
 * REJECTED (server weigert definitief) volgt een foutmelding, blijft het formulier/de modal staan en
 * gaat er niets verloren. Een herhaalde poging levert geen dubbele rij op.
 *
 * Deel 1 (altijd): broncontroles.
 * Deel 2 (Chromium, anders SKIP): de ECHTE pagina en de echte functies (voeding, cyclus, doelen,
 * onderzoeksdeelname, exercise_goals, Mijn trainingen), de echte sbPostQ() en IndexedDB-wachtrij,
 * flushOfflineQueue() en syncCustomTrainingsFromSupabase(). Alleen het netwerk (sbFetch) is
 * gesimuleerd. Server en wachtrij overleven een herstart (localStorage/IndexedDB).
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
const POSTQ = extractFn(HTML, 'sbPostQ');
const OPGESLAGEN = extractFn(HTML, 'sbPostQOpgeslagen');
ok(/:\(status==='confirmed'\|\|status==='queued'\)/.test(POSTQ), 'bron: sbPostQ zonder detail is alleen true bij confirmed of queued');
ok(!/status!=='rejected'/.test(POSTQ), 'bron: de oude boolean (true ook bij failed) is weg');
ok(!!OPGESLAGEN && /sbPostQ\(t,d,\{detail:true\}\)/.test(OPGESLAGEN) && /if\(!u\|\|!u\.ok\)\{[^}]*throw err;/.test(OPGESLAGEN), 'bron: sbPostQOpgeslagen gooit bij een niet-ok uitkomst');
const KLASSE_B = ['voedingSaveTargets', 'voedingConfirmWaterEntry', 'voedingConfirmAddToMeal', 'voedingSaveSupplement', 'voedingSubmitCorrection', 'voedingPersistCustomProduct', 'voedingPersistNewProductFromLabel', 'voedingSaveManualEntry'];
KLASSE_B.forEach(function (f) {
  const b = extractFn(HTML, f);
  ok(!!b && !/\bsbPostQ\(/.test(b) && /sbPostQOpgeslagen\(/.test(b), 'bron: ' + f + ' negeert de schrijfuitkomst niet meer');
});
ok(/if\(!\(await withdrawResearchConsent\(\)\)\)/.test(extractFn(HTML, 'toggleResearchConsent')) && /if\(!\(await grantResearchConsent\(\)\)\)/.test(extractFn(HTML, 'toggleResearchConsent')), 'bron: onderzoeksdeelname controleert de uitkomst');
ok(/_alleenGeheugen:!_okW/.test(extractFn(HTML, 'upsertExerciseGoalField')), 'bron: exercise_goals blijft alleen-geheugen als de INSERT niet lukte');
ok(!/sbPostQ\('custom_trainings',\{/.test(HTML) && (HTML.match(/tkCustomTrainingPost\(\{id:/g) || []).length === 4, 'bron: alle 4 custom_trainings-INSERTs lopen via tkCustomTrainingPost');
ok(/_behouden=customTrainings\.filter/.test(extractFn(HTML, 'syncCustomTrainingsFromSupabase')), 'bron: de sync behoudt nog niet bevestigde trainingen');
ok(/'tk_trainings_onbevestigd'/.test(HTML.slice(HTML.indexOf('const PERSONAL_CACHE_KEYS'), HTML.indexOf('const PERSONAL_CACHE_KEYS') + 600)), 'bron: tk_trainings_onbevestigd is persoonsgebonden (gewist bij eigenaarwissel)');

// ══ DEEL 2 — ECHTE PAGINA ══
let chromium;
try { chromium = require('playwright').chromium; } catch (e) { chromium = null; }

const STATUS = {
  confirmed: {},
  queued: { postStatusAlle: 503 },               // tijdelijke serverfout → wachtrij
  rejected: { postStatusAlle: 422 },             // definitief geweigerd
  failed: { postStatusAlle: 503, queueFaalt: true } // queuen mislukt (IndexedDB weg)
};

function installeer(cfg) {
  const lees = function (k, d) { try { return JSON.parse(localStorage.getItem(k) || 'null') || d; } catch (_) { return d; } };
  const schrijf = function (k, v) { localStorage.setItem(k, JSON.stringify(v)); };
  window.__cfg = cfg; window.__toasts = []; window.__gesloten = []; window.__go = [];
  window.toast = function (m) { window.__toasts.push(m); };
  window.go = function (s) { window.__go.push(s); }; window.closeModal = function (id) { window.__gesloten.push(id); }; window.openModal = function () {};
  ['voedingRenderOverview', 'voedingRenderSupplementHistory', 'voedingSuppInfoButtonUpdate', 'voedingSuppHideSuggestions', 'updateOfflineBadge', 'renderCustomTrainBtns', 'renderCustomTrainList']
    .forEach(function (f) { window[f] = function () {}; });
  ['renderResearchConsentCard', 'renderCyclusScreen', 'renderDoelenScreen', 'migrateLegacyWbSaved'].forEach(function (f) { window[f] = async function () {}; });
  window.confirm = function () { return true; };
  authSession = { user: { id: cfg.uid || 'u-test' }, access_token: 'x', refresh_token: null };
  if (cfg.queueFaalt) window.offlineQueueAdd = async function () { return false; };
  Object.defineProperty(navigator, 'onLine', { get: function () { return !window.__cfg.offline; }, configurable: true });
  const antw = function (st, body) { return { ok: st < 300, status: st, text: async function () { return st < 300 ? '' : 'err'; }, json: async function () { return body || []; } }; };
  window.sbFetch = async function (url, o) {
    o = o || {}; const c = window.__cfg; const m = o.method || 'GET';
    const tabel = (url.split('/rest/v1/')[1] || '').split('?')[0];
    if (c.offline) throw new TypeError('Failed to fetch');
    const log = lees('__log', []);
    if (m === 'GET') {
      if (tabel === 'custom_trainings') return antw(200, Object.values(lees('__srv', {}).custom_trainings || {}));
      return antw(200, (c.get || {})[tabel] || []);
    }
    if (m === 'POST') {
      log.push('POST:' + tabel); schrijf('__log', log);
      const st = c.postStatusAlle;
      if (st) return antw(st);
      const srv = lees('__srv', {}); const t = srv[tabel] || (srv[tabel] = {});
      const id = (o.body && o.body.id) || ('srv-' + tabel + '-' + (Object.keys(t).length + 1));
      const merge = String(o.prefer || '').indexOf('merge-duplicates') >= 0;
      if (o.body && o.body.id && t[id] && !merge) return antw(409);
      t[id] = Object.assign({}, o.body, { id: id, _eigenaar: authSession.user.id }); schrijf('__srv', srv);
      return antw(201, [t[id]]);
    }
    log.push(m + ':' + tabel); schrijf('__log', log);
    return antw(200, []);
  };
}
// Zorgt dat een (dynamisch gerenderd) veld bestaat en zet de waarde.
function zetVelden(velden) {
  Object.keys(velden).forEach(function (id) {
    let el = document.getElementById(id);
    if (!el) { el = document.createElement('input'); el.id = id; document.body.appendChild(el); }
    if (el.tagName === 'SELECT' && ![].some.call(el.options, function (o) { return o.value === String(velden[id]); })) { const o = document.createElement('option'); o.value = velden[id]; el.appendChild(o); }
    el.value = velden[id];
  });
  ['voeding-portion-error', 'voeding-correctie-error'].forEach(function (id) { if (!document.getElementById(id)) { const d = document.createElement('div'); d.id = id; d.style.display = 'none'; document.body.appendChild(d); } });
}
const FLOWS = {
  water: { err: 'm-voeding-water-error', tabel: 'nutrition_hydration_entries', succes: /Water toegevoegd/,
    run: async function () { zetVelden({ 'm-voeding-water-input': '250' }); await voedingConfirmWaterEntry(); },
    bewaard: function () { return document.getElementById('m-voeding-water-input').value === '250' && window.__gesloten.indexOf('m-voeding-water') < 0; } },
  doelen_voeding: { err: 'voeding-doel-error', tabel: 'nutrition_targets', succes: /Voedingsdoelen opgeslagen/,
    run: async function () { zetVelden({ 'voeding-doel-kcal': '2200', 'voeding-doel-protein': '150', 'voeding-doel-carbs': '', 'voeding-doel-fat': '' }); voedingDoelConfirmedCheck = false; await voedingSaveTargets(); },
    bewaard: function () { return document.getElementById('voeding-doel-kcal').value === '2200' && window.__go.indexOf('s-voeding') < 0; } },
  supplement: { err: 'voeding-supp-error', tabel: 'nutrition_supplement_logs', succes: null, get: { nutrition_supplement_definitions: [{ id: 'def-1' }] },
    run: async function () { zetVelden({ 'voeding-supp-name': 'Creatine', 'voeding-supp-dose': '5', 'voeding-supp-unit': 'g' }); await voedingSaveSupplement(); },
    bewaard: function () { return document.getElementById('voeding-supp-name').value === 'Creatine' && document.getElementById('voeding-supp-dose').value === '5'; } },
  maaltijd: { err: 'voeding-portion-error', tabel: 'nutrition_meal_items', succes: /Toegevoegd aan maaltijd/, get: { nutrition_meals: [{ id: 'meal-1' }] },
    run: async function () {
      zetVelden({ 'voeding-qty-input': '100', 'voeding-qty-unit': 'g', 'voeding-meal-select': 'breakfast' });
      if (!voedingSelectedProduct) voedingSelectedProduct = { id: 'prod-1', name: 'Havermout', nutrientRow: { basis: 'PER_100G', energy_kcal: 370, protein_g: 13, carbohydrate_g: 60, fat_g: 7 } };
      await voedingConfirmAddToMeal();
    },
    bewaard: function () { return !!voedingSelectedProduct && !!voedingPendingAddItemId; } },
  correctie: { err: 'voeding-correctie-error', tabel: 'nutrition_nutrient_values', succes: /Correctie opgeslagen/,
    run: async function () { zetVelden({ 'voeding-correctie-value': '120' }); await voedingSubmitCorrection('prod-1', false, 'PER_100G'); },
    bewaard: function () { return document.getElementById('voeding-correctie-value').value === '120' && window.__go.indexOf('s-voeding-product') < 0; } },
  eigen_product: { err: 'voeding-custom-error', tabel: 'nutrition_products', succes: null, get: { nutrition_products: [{ id: 'prod-9' }] },
    run: async function () { zetVelden({ 'voeding-custom-kcal': '400', 'voeding-custom-protein': '10', 'voeding-custom-carbs': '50', 'voeding-custom-fat': '15' }); await voedingPersistCustomProduct('Mijn reep', '', 'PER_100G', '', null, null); },
    bewaard: function () { return document.getElementById('voeding-custom-kcal').value === '400' && window.__go.indexOf('s-voeding-hoeveelheid') < 0; } },
  label_product: { err: 'voeding-newproduct-error', tabel: 'nutrition_products', succes: null, get: { nutrition_products: [{ id: 'prod-9' }] },
    run: async function () { zetVelden({}); if (!document.getElementById('voeding-newproduct-error')) { const d = document.createElement('div'); d.id = 'voeding-newproduct-error'; d.style.display = 'none'; document.body.appendChild(d); } voedingLastRecognition = { basis: 'PER_100G', observations: { energy_kcal: { normalized_value: 250 } } }; await voedingPersistNewProductFromLabel('Label reep'); },
    bewaard: function () { return window.__go.indexOf('s-voeding-hoeveelheid') < 0; } },
  handmatig_product: { err: 'voeding-manual-error', tabel: 'nutrition_products', succes: null, get: { nutrition_products: [{ id: 'prod-9' }] },
    run: async function () { zetVelden({ 'voeding-manual-name': 'Handmatige reep', 'voeding-manual-brand': '', 'voeding-manual-basis': 'PER_100G', 'voeding-manual-barcode': '', 'voeding-manual-kcal': '300', 'voeding-manual-kj': '', 'voeding-manual-protein': '8', 'voeding-manual-carbs': '', 'voeding-manual-sugar': '', 'voeding-manual-fat': '', 'voeding-manual-satfat': '', 'voeding-manual-fiber': '', 'voeding-manual-salt': '' }); await voedingSaveManualEntry(true); },
    bewaard: function () { return document.getElementById('voeding-manual-name').value === 'Handmatige reep' && window.__go.indexOf('s-voeding-hoeveelheid') < 0; } },
  onderzoek: { err: null, tabel: 'research_consents', succes: /Bedankt voor je deelname/,
    run: async function () { window.getResearchConsentStatus = async function () { return false; }; await toggleResearchConsent(); },
    bewaard: function () { return true; } },
  doel: { err: null, tabel: 'goals', succes: null,
    run: async function () { zetVelden({ 'goal-type': 'eigen', 'goal-naam': 'Eerste muscle-up', 'goal-doelwaarde': '1', 'goal-eenheid': 'x', 'goal-einddatum': '', 'goal-motivatie': '' }); await saveNewGoal(); },
    bewaard: function () { return document.getElementById('goal-naam').value === 'Eerste muscle-up' && window.__gesloten.indexOf('m-goal-add') < 0; } },
  cyclus: { err: null, tabel: 'cycle_periods', succes: /Menstruatie geregistreerd/,
    run: async function () { window.cyclusLaadPeriodes = async function () { return []; }; await cyclusStartMenstruatie(); },
    bewaard: function () { return true; } }
};
async function voerUit(naam) {
  const f = FLOWS[naam];
  const fout = []; const oorspronkelijk = console.error; console.error = function () { fout.push(1); };
  try { await f.run(); } finally { console.error = oorspronkelijk; }
  const lees = function (k, d) { try { return JSON.parse(localStorage.getItem(k) || 'null') || d; } catch (_) { return d; } };
  const errEl = f.err ? document.getElementById(f.err) : null;
  const q = await offlineQueueAll();
  const srv = lees('__srv', {});
  const toasts = window.__toasts.slice();
  return {
    foutZichtbaar: errEl ? errEl.style.display === 'block' : toasts.some(function (t) { return /mislukt|niet opgeslagen|Kon niet opslaan/i.test(t); }),
    succesMelding: f.succes ? toasts.some(function (t) { return f.succes.test(t); }) : null,
    gesloten: window.__gesloten.slice(), go: window.__go.slice(),
    bewaard: f.bewaard(), toasts: toasts,
    wachtrij: q.filter(function (i) { return i.table === f.tabel; }).length,
    wachtrijIds: q.filter(function (i) { return i.table === f.tabel; }).map(function (i) { return i.body && i.body.id; }),
    server: Object.keys(srv[f.tabel] || {}).length
  };
}

(async function () {
  let browser = null;
  if (chromium) { try { browser = await chromium.launch(); } catch (e) { browser = null; } }
  if (!browser) { console.log('fQueueFailHonestStatus: deel 2 SKIP (Chromium niet beschikbaar in deze omgeving)'); }
  else {
    const URL = 'file://' + path.join(ROOT, 'index.html');
    const SAMENVATTING = {};
    async function nieuw() {
      const ctx = await browser.newContext(); const p = await ctx.newPage(); await p.goto(URL); await p.waitForTimeout(400);
      await p.evaluate(function () { localStorage.clear(); });
      return { ctx: ctx, p: p };
    }
    async function laad(p) { await p.evaluate('window.__FLOWS=' + '{' + Object.keys(FLOWS).map(function (k) { const f = FLOWS[k]; return JSON.stringify(k) + ':{err:' + JSON.stringify(f.err) + ',tabel:' + JSON.stringify(f.tabel) + ',succes:' + (f.succes ? f.succes.toString() : 'null') + ',run:' + f.run.toString() + ',bewaard:' + f.bewaard.toString() + '}'; }).join(',') + '};' + zetVelden.toString() + ';window.zetVelden=zetVelden;'); }
    async function doe(p, naam) { return p.evaluate('(' + voerUit.toString().replace('const f = FLOWS[naam];', 'const f = window.__FLOWS[naam];') + ')(' + JSON.stringify(naam) + ')'); }
    try {
      // ── 1. Elke aanroeper × elke status ──
      for (const flow of Object.keys(FLOWS)) {
        for (const st of Object.keys(STATUS)) {
          const { ctx, p } = await nieuw();
          await p.evaluate(installeer, Object.assign({ get: FLOWS[flow].get || {} }, STATUS[st]));
          await laad(p);
          const r = await doe(p, flow);
          SAMENVATTING[flow + '/' + st] = { fout: r.foutZichtbaar, succes: r.succesMelding, bewaard: r.bewaard, wachtrij: r.wachtrij, server: r.server };
          const goed = st === 'confirmed' || st === 'queued';
          ok(r.foutZichtbaar === !goed, flow + ' ' + st + ': foutmelding ' + (goed ? 'afwezig' : 'zichtbaar') + ' (toasts ' + JSON.stringify(r.toasts) + ')');
          if (r.succesMelding !== null) ok(r.succesMelding === goed, flow + ' ' + st + ': succesmelding alleen bij confirmed/queued');
          if (!goed) ok(r.bewaard, flow + ' ' + st + ': invoer/formulier blijft staan');
          if (st === 'confirmed') eq([r.server, r.wachtrij], [1, 0], flow + ' confirmed: 1 rij op de server, wachtrij leeg');
          if (st === 'queued') eq([r.server, r.wachtrij], [0, 1], flow + ' queued: 1 rij in de wachtrij');
          if (st === 'rejected' || st === 'failed') eq([r.server, r.wachtrij], [0, 0], flow + ' ' + st + ': niets op de server en niets in de wachtrij');
          await ctx.close();
        }
      }

      // ── 2. Opnieuw proberen na FAILED/REJECTED: precies één rij ──
      for (const flow of ['water', 'maaltijd', 'doel', 'doelen_voeding']) {
        for (const st of ['failed', 'rejected']) {
          const { ctx, p } = await nieuw();
          await p.evaluate(installeer, Object.assign({ get: FLOWS[flow].get || {} }, STATUS[st]));
          await laad(p);
          const eerst = await doe(p, flow);
          await p.evaluate(installeer, { get: FLOWS[flow].get || {} });
          const daarna = await doe(p, flow);
          eq([daarna.server, daarna.wachtrij], [1, 0], flow + ' ' + st + ' → opnieuw: precies 1 rij');
          ok(daarna.succesMelding !== false && !daarna.toasts.some(function (t) { return /mislukt/i.test(t); }), flow + ' ' + st + ' → opnieuw: nu wel opgeslagen');
          if (flow === 'maaltijd') ok(eerst.bewaard, 'maaltijd ' + st + ': dezelfde client-id blijft klaar voor de retry');
          await ctx.close();
        }
      }
      // Maaltijd: de retry gebruikt dezelfde id (geen tweede rij als de eerste poging tóch was aangekomen)
      {
        const { ctx, p } = await nieuw();
        await p.evaluate(installeer, Object.assign({ get: FLOWS.maaltijd.get }, STATUS.rejected));
        await laad(p);
        const id1 = await p.evaluate(async function () { await window.__FLOWS.maaltijd.run(); return voedingPendingAddItemId; });
        await p.evaluate(installeer, { get: FLOWS.maaltijd.get });
        await p.evaluate(async function () { await window.__FLOWS.maaltijd.run(); });
        const ids = await p.evaluate(function () { return Object.keys(JSON.parse(localStorage.getItem('__srv')).nutrition_meal_items); });
        eq(ids, [id1], 'maaltijd retry: de server-rij heeft de id van de eerste poging');
        await ctx.close();
      }

      // ── 3. QUEUED → herstart → sync: precies één rij, ook bij dubbele flush ──
      for (const flow of ['water', 'maaltijd', 'supplement', 'doel']) {
        const { ctx, p } = await nieuw();
        await p.evaluate(installeer, Object.assign({ get: FLOWS[flow].get || {} }, STATUS.queued));
        await laad(p);
        await doe(p, flow);
        await p.close();
        const p2 = await ctx.newPage(); await p2.goto(URL); await p2.waitForTimeout(400);
        await p2.evaluate(installeer, { get: FLOWS[flow].get || {} });
        const naHerstart = await p2.evaluate(async function (t) { return (await offlineQueueAll()).filter(function (i) { return i.table === t; }).length; }, FLOWS[flow].tabel);
        eq(naHerstart, 1, flow + ' queued: na herstart staat de rij nog in de wachtrij');
        await p2.evaluate(async function () { await Promise.all([flushOfflineQueue(), flushOfflineQueue()]); await flushOfflineQueue(); });
        const eind = await p2.evaluate(async function (t) { const srv = JSON.parse(localStorage.getItem('__srv') || '{}'); return [Object.keys(srv[t] || {}).length, (await offlineQueueAll()).length]; }, FLOWS[flow].tabel);
        eq(eind, [1, 0], flow + ' queued → herstart → 3× flush (2 gelijktijdig): 1 rij op de server, wachtrij leeg');
        await ctx.close();
      }

      // ── 4. Cross-account: een gequeuede rij van A wordt nooit onder B verstuurd ──
      {
        const { ctx, p } = await nieuw();
        await p.evaluate(installeer, Object.assign({ uid: 'u-a' }, STATUS.queued));
        await laad(p);
        await doe(p, 'water');
        const eigenaar = await p.evaluate(async function () { return (await offlineQueueAll()).map(function (i) { return i.owner_uid; }); });
        eq(eigenaar, ['u-a'], 'cross-account: wachtrij-item draagt de eigenaar');
        await p.evaluate(installeer, { uid: 'u-b' });
        await p.evaluate(async function () { await flushOfflineQueue(); });
        const naB = await p.evaluate(async function () { const s = JSON.parse(localStorage.getItem('__srv') || '{}'); return [Object.keys(s.nutrition_hydration_entries || {}).length, (await offlineQueueAll()).length]; });
        eq(naB[0], 0, 'cross-account: niets verstuurd onder gebruiker B');
        await p.evaluate(installeer, { uid: 'u-a' });
        await p.evaluate(async function () { await flushOfflineQueue(); });
        const naA = await p.evaluate(function () { const s = JSON.parse(localStorage.getItem('__srv') || '{}'); return Object.values(s.nutrition_hydration_entries || {}).map(function (r) { return r._eigenaar; }); });
        ok(naB[1] === 0 ? naA.length === 0 : (naA.length === 1 && naA[0] === 'u-a'), 'cross-account: terug als A → verstuurd onder A (of al eerder veilig verwijderd), nooit onder B');
        await ctx.close();
      }

      // ── 5. exercise_goals: na een mislukte INSERT geen PATCH op een niet-bestaande rij ──
      for (const st of Object.keys(STATUS)) {
        const { ctx, p } = await nieuw();
        await p.evaluate(installeer, STATUS[st]);
        const r = await p.evaluate(async function () {
          exerciseGoals = new Map();
          await upsertExerciseGoalField('ex-t', 'pr', 100);
          const geheugen = !!exerciseGoals.get('ex-t')._alleenGeheugen;
          window.__cfg = {}; localStorage.setItem('__log', '[]');
          await upsertExerciseGoalField('ex-t', 'pr', 105);
          return { geheugen: geheugen, tweede: JSON.parse(localStorage.getItem('__log') || '[]'), waarde: exerciseGoals.get('ex-t').pr };
        });
        const goed = st === 'confirmed' || st === 'queued';
        eq(r.geheugen, !goed, 'exercise_goals ' + st + ': _alleenGeheugen=' + !goed);
        eq(r.tweede, [goed ? 'PATCH:exercise_goals' : 'POST:exercise_goals'], 'exercise_goals ' + st + ': volgende wijziging is ' + (goed ? 'PATCH' : 'opnieuw een INSERT (geen stil verlies)'));
        eq(r.waarde, 105, 'exercise_goals ' + st + ': waarde in het geheugen klopt');
        await ctx.close();
      }

      // ── 6. Mijn trainingen: een niet-bevestigde training overleeft herstart + sync ──
      for (const st of Object.keys(STATUS)) {
        const { ctx, p } = await nieuw();
        await p.evaluate(function () { localStorage.setItem('__srv', JSON.stringify({ custom_trainings: { custom_Y: { id: 'custom_Y', naam: 'Y', kleur: '#000', sort_order: 0 } } })); });
        await p.evaluate(installeer, STATUS[st]);
        const status = await p.evaluate(async function () {
          customTrainings = [{ id: 'custom_X', name: 'X', color: '#0E3B4A', note: '', exercises: [], source: 'builder', metadata: {}, exercise_targets: [] }];
          localStorage.setItem('tk_trainings', JSON.stringify(customTrainings));
          const u = await tkCustomTrainingPost({ id: 'custom_X', naam: 'X', kleur: '#0E3B4A', notitie: null, sort_order: 0, scope: 'personal', source: 'builder', metadata: {} });
          return { status: u.status, toasts: window.__toasts.slice() };
        });
        eq(status.status, st, 'Mijn trainingen ' + st + ': status');
        ok(status.toasts.some(function (t) { return /alleen op dit toestel/.test(t); }) === (st === 'rejected' || st === 'failed'), 'Mijn trainingen ' + st + ': melding alleen bij rejected/failed');
        await p.close();
        const p2 = await ctx.newPage(); await p2.goto(URL); await p2.waitForTimeout(400);
        await p2.evaluate(installeer, {});
        const naSync = await p2.evaluate(async function () {
          await syncCustomTrainingsFromSupabase();
          return { lijst: customTrainings.map(function (t) { return t.id; }).sort(), opslag: JSON.parse(localStorage.getItem('tk_trainings')).map(function (t) { return t.id; }).sort(), onbevestigd: tkTrainingenOnbevestigd() };
        });
        eq([naSync.lijst, naSync.opslag], [['custom_X', 'custom_Y'], ['custom_X', 'custom_Y']], 'Mijn trainingen ' + st + ': na herstart + sync staat de training er nog (geen verlies)');
        eq(naSync.onbevestigd, st === 'confirmed' ? [] : ['custom_X'], 'Mijn trainingen ' + st + ': markering onbevestigd');
        if (st === 'queued') {
          const eind = await p2.evaluate(async function () { await flushOfflineQueue(); await syncCustomTrainingsFromSupabase(); return { lijst: customTrainings.map(function (t) { return t.id; }).sort(), onbevestigd: tkTrainingenOnbevestigd(), server: Object.keys(JSON.parse(localStorage.getItem('__srv')).custom_trainings).sort() }; });
          eq(eind, { lijst: ['custom_X', 'custom_Y'], onbevestigd: [], server: ['custom_X', 'custom_Y'] }, 'Mijn trainingen queued → flush → sync: op de server, markering opgeruimd, geen dubbele');
        }
        if (st === 'confirmed') {
          // Een elders verwijderde (bevestigde) training komt niet terug.
          const weg = await p2.evaluate(async function () { const s = JSON.parse(localStorage.getItem('__srv')); delete s.custom_trainings.custom_X; localStorage.setItem('__srv', JSON.stringify(s)); await syncCustomTrainingsFromSupabase(); return customTrainings.map(function (t) { return t.id; }); });
          eq(weg, ['custom_Y'], 'Mijn trainingen: een bevestigde, elders verwijderde training wordt niet ten onrechte behouden');
        }
        await ctx.close();
      }
      // Eigenaarwissel wist de markering
      {
        const { ctx, p } = await nieuw();
        const r = await p.evaluate(function () { tkMarkeerTrainingOnbevestigd('custom_Z', true); const voor = tkTrainingenOnbevestigd(); wipePersonalCache(); return [voor, localStorage.getItem('tk_trainings_onbevestigd')]; });
        eq(r, [['custom_Z'], null], 'cross-account: wipePersonalCache wist tk_trainings_onbevestigd');
        await ctx.close();
      }

      // ── 7. sbPostQ zonder opties: de booleans per status ──
      {
        const { ctx, p } = await nieuw();
        const b = await p.evaluate(async function () {
          window.updateOfflineBadge = function () {}; const uit = {};
          for (const st of [201, 400, 403, 409, 422, 401, 429, 503]) {
            window.offlineQueueAdd = async function () { return true; };
            window.sbFetch = async function () { return { ok: st < 300, status: st, text: async function () { return ''; } }; };
            uit[st] = await sbPostQ('goals', { naam: 'x' });
          }
          window.offlineQueueAdd = async function () { return false; };
          uit.faalt503 = await sbPostQ('goals', { naam: 'x' });
          window.sbFetch = async function () { throw new TypeError('x'); };
          uit.faaltNetwerk = await sbPostQ('goals', { naam: 'x' });
          return uit;
        });
        eq(b, { 201: true, 400: false, 403: false, 409: false, 422: false, 401: true, 429: true, 503: true, faalt503: false, faaltNetwerk: false }, 'sbPostQ zonder opties: true alleen bij confirmed/queued');
        await ctx.close();
      }
    } catch (e) { ok(false, 'deel 2 onverwachte fout: ' + (e && e.stack || e)); }
    console.log('SCENARIO_JSON ' + JSON.stringify(SAMENVATTING));
    await browser.close();
  }
  msgs.forEach(function (m) { console.log(m); });
  console.log('fQueueFailHonestStatus: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail ? 1 : 0);
})();
