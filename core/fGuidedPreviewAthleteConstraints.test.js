/* Trainingscontext op ALLE vervangpaden (v4.70.19).
 *
 * Bevinding (onafhankelijke PR-audit, 8 okt 2026; runtime gereproduceerd op main fde8b5de):
 *   1. De knop "Alternatief" in de begeleide workout (GWUI.alt) koos het eerste canonieke
 *      alternatief zonder AthleteConstraints: een thuisatleet met alleen dumbbells kreeg
 *      "Barbell Curl", en een expliciet vermeden oefening werd gewoon gekozen.
 *   2. De Preview-swap-picker gaf catalogusentries door met `naam:a.name`. Zo'n entry heeft
 *      alleen identity.name, dus de naam was leeg: een avoid-term kon nooit matchen en de
 *      picker toonde lege namen.
 * Oplossing: één helper, applyAthleteConstraintsCatalog(), die catalogusentries met hun
 * canonieke naam aan de bestaande applyAthleteConstraints() geeft. Geen nieuwe filterregel;
 * de "nooit leeg"-fallback van de core blijft.
 *
 * Deel 1 (altijd): de echte functies uit index.html met de echte AthleteConstraints-core.
 * Deel 2 (Chromium, anders SKIP): de echte pagina, echte catalogus, GWUI.alt() en de Preview-picker.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
const AthleteConstraints = require('./athleteConstraints.js');

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
function blok(src, van, tot) { const i = src.indexOf(van); if (i < 0) throw new Error('niet gevonden: ' + van); const j = src.indexOf(tot, i); return src.slice(i, j); }

// ══ BRON ══
const HELPER = extractFn(HTML, 'applyAthleteConstraintsCatalog');
const PREVIEW = extractFn(HTML, 'previewRenderSwapPicker');
const GW_ALT = blok(HTML, '  function alt(){\n    var it=GW.cur();', '  function quit(){');
eq((HTML.match(/function applyAthleteConstraintsCatalog\(/g) || []).length, 1, 'bron: één helper');
ok(/applyAthleteConstraints\(wrapped\)/.test(HELPER), 'bron: de helper gebruikt de bestaande applyAthleteConstraints()');
ok(/c\.identity&&c\.identity\.name/.test(HELPER), 'bron: de helper geeft de canonieke naam (identity.name) door');
ok(!/allowedByEquipment|avoidMatch|normalizeEquipment/.test(HELPER), 'bron: geen eigen filterregel in de helper');
ok(/alts=applyAthleteConstraintsCatalog\(alts\);/.test(GW_ALT), 'bron: GWUI.alt() past de constraints toe');
ok(GW_ALT.indexOf('applyAthleteConstraintsCatalog(alts)') < GW_ALT.indexOf('alts[0].catalog_id'), 'bron: GWUI.alt() filtert vóór de keuze van alts[0]');
ok(/alts=applyAthleteConstraintsCatalog\(alts\);/.test(PREVIEW), 'bron: de Preview-picker gebruikt dezelfde helper');
ok(!/naam:a\.name/.test(PREVIEW) && !/escHtml\(a\.name\)/.test(PREVIEW), 'bron: de Preview-picker leest geen niet-bestaand a.name meer');
ok(/escHtml\(previewExerciseName\(a\.catalog_id\)\)/.test(PREVIEW), 'bron: de Preview-picker toont de naam via previewExerciseName()');
ok(!/AthleteConstraints\.applyConstraints/.test(GW_ALT + PREVIEW), 'bron: geen tweede aanroeppad naar de core');

// ══ DEEL 1 — echte functies, echte core, synthetische catalogus ══
function cat(id, naam, equip) { return { catalog_id: id, identity: { name: naam, equipment: equip }, relations: {} }; }
const BAR = cat('TK-1', 'Barbell Curl', ['barbell']);
const DB = cat('TK-2', 'Dumbbell Concentration Curl', ['dumbbell']);
const CAB = cat('TK-3', 'Cable Bar Curl', ['cable']);
const BW = cat('TK-4', 'Chin-up', ['bodyweight']);
const ONB = cat('TK-5', 'Onbekend Apparaat Curl', []);
const ALLE = [BAR, DB, CAB, BW, ONB];
const PROD = ['athleteEquipmentSet', 'athleteAvoidTerms', 'resolveExerciseEquipment', 'applyAthleteConstraints', 'applyAthleteConstraintsCatalog']
  .map(function (n) { return extractFn(HTML, n); }).join('\n');
function sandbox(ctx) {
  const sb = { window: { AthleteConstraints: AthleteConstraints }, AthleteConstraints: AthleteConstraints, tkTrainingCtx: ctx,
    ExerciseCatalogService: { byId: function (id) { return ALLE.find(function (c) { return c.catalog_id === id; }) || null; }, all: function () { return ALLE; } } };
  vm.createContext(sb); vm.runInContext(PROD, sb); return sb;
}
function namen(l) { return l.map(function (c) { return c.identity.name; }); }

eq(namen(sandbox(null).applyAthleteConstraintsCatalog(ALLE)), namen(ALLE), 'zonder trainingscontext: lijst ongewijzigd');
eq(namen(sandbox({ location: 'gym', equipment: ['barbell'], avoid_exercises: [] }).applyAthleteConstraintsCatalog(ALLE)), namen(ALLE), 'gym zonder avoid: geen filter (bestaand gedrag)');
const thuis = sandbox({ location: 'thuis', equipment: ['dumbbell'], avoid_exercises: [] }).applyAthleteConstraintsCatalog(ALLE);
eq(namen(thuis), ['Dumbbell Concentration Curl', 'Chin-up', 'Onbekend Apparaat Curl'], 'thuis met dumbbells: barbell en cable vallen af, bodyweight en onbekend blijven');
const vermijd = sandbox({ location: 'gym', equipment: [], avoid_exercises: ['Barbell Curl'] }).applyAthleteConstraintsCatalog(ALLE);
ok(namen(vermijd).indexOf('Barbell Curl') < 0, 'avoid-term: de vermeden oefening valt af (werkte niet zonder naam)');
eq(vermijd.length, 4, 'avoid-term: alleen de vermeden oefening valt af');
const allesWeg = sandbox({ location: 'thuis', equipment: ['dumbbell'], avoid_exercises: [] }).applyAthleteConstraintsCatalog([BAR, CAB]);
eq(namen(allesWeg), ['Barbell Curl', 'Cable Bar Curl'], 'alles uitgesloten: de bestaande "nooit leeg"-fallback van de core');
eq(sandbox({ location: 'thuis', equipment: ['dumbbell'] }).applyAthleteConstraintsCatalog([]), [], 'lege lijst blijft leeg');
ok(sandbox({ location: 'thuis', equipment: ['dumbbell'] }).applyAthleteConstraintsCatalog(thuis)[0] === DB, 'de helper geeft de oorspronkelijke objecten terug');
// Gelijk aan wat de core zelf zou beslissen met dezelfde naam en hetzelfde materiaal.
const kern = AthleteConstraints.applyConstraints(ALLE.map(function (c) { return { name: c.identity.name, equipment: c.identity.equipment, _c: c }; }),
  { availableSet: AthleteConstraints.normalizeEquipment(['dumbbell']), avoidTerms: ['Chin-up'] }).kept.map(function (w) { return w._c.identity.name; });
eq(namen(sandbox({ location: 'hybride', equipment: ['dumbbell'], avoid_exercises: ['Chin-up'] }).applyAthleteConstraintsCatalog(ALLE)), kern, 'zelfde uitkomst als de core rechtstreeks');

// ══ DEEL 2 — de echte pagina ══
let chromium;
try { chromium = require('playwright').chromium; } catch (e) { chromium = null; }
(async function () {
  let browser = null;
  if (chromium) { try { browser = await chromium.launch(); } catch (e) { browser = null; } }
  if (!browser) {
    console.log('fGuidedPreviewAthleteConstraints: deel 2 SKIP (Chromium niet beschikbaar in deze omgeving)');
  } else {
    try {
      const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
      await page.goto('file://' + path.join(ROOT, 'index.html'));
      await page.waitForTimeout(800);
      const R = await page.evaluate(async function () {
        const E = ExerciseCatalogService;
        const basis = E.all().find(function (e) { return e.identity.name === 'Band Curl'; });
        if (!basis) return { fout: 'Band Curl niet in de catalogus' };
        const alts = WB.altList(basis.catalog_id).map(function (a) { return a.identity.name; });
        window.toast = function () {}; window.go = function () {}; GWUI.render = function () {};
        async function guided(ctx) {
          tkTrainingCtx = ctx;
          GW.start({ items: [{ id: basis.catalog_id, block: 'main', label: 'A', pick: 'main', sets: 3 }] }, { goal: 'kracht' }, {});
          GWUI.alt();
          await new Promise(function (r) { setTimeout(r, 500); });
          const n = E.byId(GW.cur().id).identity; GW.abort(); return { naam: n.name, materiaal: n.equipment };
        }
        function preview(ctx) {
          tkTrainingCtx = ctx;
          previewCtx = { def: { exercises: [{ exercise_id: basis.catalog_id }] }, order: [basis.catalog_id], removedIds: new Set(), swaps: {}, swapPickerFor: basis.catalog_id };
          const h = previewRenderSwapPicker();
          return {
            namen: Array.from(h.matchAll(/<div style="flex:1;font-size:13px">([^<]*)<\/div>/g)).map(function (m) { return m[1]; }),
            ids: Array.from(h.matchAll(/previewApplySwap\('[^']*','([^']*)'\)/g)).map(function (m) { return E.byId(m[1]).identity.name; })
          };
        }
        return {
          alts: alts,
          gThuis: await guided({ location: 'thuis', equipment: ['dumbbell'], avoid_exercises: [] }),
          gVermijd: await guided({ location: 'gym', equipment: [], avoid_exercises: [alts[0]] }),
          gGeen: await guided(false),
          pVermijd: preview({ location: 'gym', equipment: [], avoid_exercises: [alts[0]] }),
          pThuis: preview({ location: 'thuis', equipment: ['dumbbell'], avoid_exercises: [] }),
          pGeen: preview(false)
        };
      });
      if (R.fout) { ok(false, 'deel 2: ' + R.fout); }
      else {
        ok(R.alts.length >= 3 && R.alts[0] === 'Barbell Curl', 'deel 2: testgeval — eerste canoniek alternatief voor Band Curl is Barbell Curl (' + R.alts.join(', ') + ')');
        ok(R.gThuis.materiaal.every(function (m) { return m === 'dumbbell' || m === 'bodyweight'; }), 'Guided thuis met dumbbells: gekozen alternatief is uitvoerbaar (' + R.gThuis.naam + ')');
        ok(R.gThuis.naam !== 'Barbell Curl', 'Guided thuis met dumbbells: niet langer Barbell Curl');
        ok(R.gVermijd.naam !== R.alts[0], 'Guided met avoid-term: de vermeden oefening wordt niet gekozen (' + R.gVermijd.naam + ')');
        eq(R.gGeen.naam, R.alts[0], 'Guided zonder trainingscontext: ongewijzigd het eerste alternatief');
        ok(R.pVermijd.namen.length === R.alts.length - 1 && R.pVermijd.ids.indexOf(R.alts[0]) < 0, 'Preview met avoid-term: de vermeden oefening staat niet meer in de picker');
        ok(R.pVermijd.namen.every(function (n) { return n && n.length > 0; }), 'Preview: elke optie toont een naam (was leeg)');
        eq(R.pVermijd.namen, R.pVermijd.ids, 'Preview: getoonde naam hoort bij de gekozen oefening');
        ok(R.pThuis.ids.length >= 1 && R.pThuis.ids.indexOf('Barbell Curl') < 0, 'Preview thuis met dumbbells: materiaalfilter werkt nog');
        eq(R.pGeen.ids, R.alts, 'Preview zonder trainingscontext: alle alternatieven, zelfde volgorde');
      }
    } catch (e) { ok(false, 'deel 2 onverwachte fout: ' + (e && e.message)); }
    await browser.close();
  }
  msgs.forEach(function (m) { console.log(m); });
  console.log('fGuidedPreviewAthleteConstraints: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail ? 1 : 0);
})();
