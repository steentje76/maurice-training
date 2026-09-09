/* fWattProvenanceGapP2013.test.js — GAP-P2-013 Fix Verification (v2,
 * na Hard Gate-correctie).
 *
 * Corrigeert twee bevindingen uit de eerste versie:
 * AFWIJKING 1: directe gebruikersinvoer werd fout als 'concept2_measured'
 *   gemarkeerd. Correctie: 'manual' (bewijst geen devicemeting).
 * AFWIJKING 2: provenance werd alleen OPGESLAGEN, niet gebruikt om
 *   vergelijkbaarheid af te dwingen. Correctie: wattComparableHistory()
 *   filtert nu de geschiedenis vóór iedere watt-gebaseerde PB/trend-check.
 *
 * Test tegen de daadwerkelijke, geëxtraheerde productiecode (index.html)
 * EN de echte ProgressionCore-module (core/progression.js) -- geen
 * herimplementatie van isNewBest/trendBy als eigen oracle.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const ProgressionCore = require(path.join(ROOT, 'core', 'progression.js'));

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

function slice(startMarker, endMarker) {
  const s = html.indexOf(startMarker);
  const e = html.indexOf(endMarker, s);
  if (s < 0 || e < 0) throw new Error('marker niet gevonden: ' + startMarker + ' / ' + endMarker);
  return html.slice(s, e);
}

// ═══ Migratie-audit (bijgewerkte vocabulaire) ═══
const migratie = fs.readFileSync(path.join(ROOT, 'migratie_v548.sql'), 'utf8');
ok(migratie.indexOf("CHECK (watt_source IS NULL OR watt_source IN ('concept2_measured', 'concept2_derived', 'manual', 'imported_unknown', 'unknown'))") > 0,
  'MIGRATIE (gecorrigeerd): CHECK-constraint bevat nu alle vijf benodigde states (concept2_measured/concept2_derived/manual/imported_unknown/unknown)');
ok(migratie.indexOf('NOT REACHABLE') > 0 || migratie.indexOf('nergens reachable') > 0,
  'MIGRATIE: documenteert expliciet dat concept2_measured momenteel nergens door een bestaand datapad wordt gezet');

// ═══ Extractie van de ECHTE, gecorrigeerde productiecode ═══
const src = [
  'let sessionLog={};',
  slice('function getCardioVal', 'function round1'),
  'function round1(v){ return Math.round(v*10)/10; }',
  slice('function recomputeCardioFields', 'function numSplitsFor'),
  slice('function logCardio', '// ══════════════════════════════════════════════════════════\r\n// TUSSENTIJDS OPSLAAN'),
  slice('function cardioDataToRow', 'function newVasteTrainingId'),
  slice('function cardioPerfFromSession', 'function cardioProgressionMetrics'),
  slice('function cardioBestMetric', '// F4.4/F4.11')
].join('\n');

function buildSandbox() {
  const domValues = {};
  const elCache = {};
  const cardioEngineImpl = {
    parseTime: function (s) { if (!s) return null; const p = String(s).split(':'); if (p.length !== 2) return null; return parseFloat(p[0]) * 60 + parseFloat(p[1]); },
    formatTime: function (sec) { if (sec == null || !isFinite(sec)) return ''; const m = Math.floor(sec / 60), r = Math.round(sec % 60); return m + ':' + (r < 10 ? '0' : '') + r; },
    splitFromWatt500: function (w) { return 500 * Math.pow(2.80 / w, 1 / 3); },
    wattFromSplit500: function (splitSec) { return 2.80 / Math.pow(splitSec / 500, 3); },
    splitFromDistTime: function (dist, time, basis) { return (time / dist) * basis; },
    distFromTimeSplit: function (time, split, basis) { return (time / split) * basis; },
    timeFromDistSplit: function (dist, split, basis) { return (dist / basis) * split; }
  };
  return {
    console, Math, Number, String, Object, JSON, isFinite, parseInt, parseFloat,
    localStorage: { getItem: () => '', setItem: () => {} },
    document: {
      getElementById: function (id) {
        if (!(id in domValues)) return null;
        if (!elCache[id]) elCache[id] = { value: domValues[id], classList: { toggle: () => {} }, setAttribute: () => {}, title: '' };
        return elCache[id];
      }
    },
    __setDom: function (id, value) { domValues[id] = value; if (elCache[id]) elCache[id].value = value; },
    numNL: function (v) { if (v == null) return NaN; const s = String(v).trim().replace(',', '.'); if (s === '' || !/^-?\d*\.?\d+$/.test(s)) return NaN; return parseFloat(s); },
    updateProgress: function () {},
    curT: 'test',
    scheduleAutosave: undefined,
    CardioEngine: cardioEngineImpl,
    CardioCore: cardioEngineImpl,
    CARDIO_TYPES: {
      rowing: { fields: ['distance', 'time', 'watt'], calc: { distField: 'distance', basis: 500, type: 'split' }, rowMap: { distance: { col: 'distance', parse: 'float' }, time: { col: 'time_str', parse: 'string' }, watt: { col: 'watt', parse: 'int' } } },
      skierg: { fields: ['distance', 'time', 'watt'], calc: { distField: 'distance', basis: 500, type: 'split' }, rowMap: { distance: { col: 'distance', parse: 'float' }, time: { col: 'time_str', parse: 'string' }, watt: { col: 'watt', parse: 'int' } } },
      bikeerg: { fields: ['distance', 'time', 'watt'], calc: { distField: 'distance', basis: 500, type: 'split' }, rowMap: { distance: { col: 'distance', parse: 'float' }, time: { col: 'time_str', parse: 'string' }, watt: { col: 'watt', parse: 'int' } } },
      assaultbike: { fields: ['cals', 'time', 'watt'], calc: null, rowMap: { cals: { col: 'calories', parse: 'float' }, time: { col: 'time_str', parse: 'string' }, watt: { col: 'watt', parse: 'float' } } }
    }
  };
}

function run(sandbox) {
  const context = vm.createContext(sandbox);
  vm.runInContext(src + '\nglobalThis.__exports = { recomputeCardioFields, logCardio, cardioDataToRow, cardioPerfFromSession, cardioBestMetric, wattComparableHistory, cardioWattSource, sessionLog };', context);
  return context.__exports;
}

(async () => {
  // ═══ 1. Manual -> manual (AFWIJKING 1 gecorrigeerd) ═══
  {
    const sandbox = buildSandbox();
    sandbox.__setDom('ex1-watt', '220'); sandbox.__setDom('ex1-time', ''); sandbox.__setDom('ex1-distance', ''); sandbox.__setDom('ex1-split', '');
    const mod = run(sandbox);
    mod.recomputeCardioFields('ex1', 'rowing', 'watt');
    ok(mod.cardioWattSource['ex1'] === 'manual', '1. Directe watt-invoer -> manual (NIET meer concept2_measured, AFWIJKING 1 gecorrigeerd)');
  }

  // ═══ 2. Split-afleiding -> concept2_derived (ongewijzigd correct) ═══
  {
    const sandbox = buildSandbox();
    sandbox.__setDom('ex2-distance', '2000'); sandbox.__setDom('ex2-time', '8:00'); sandbox.__setDom('ex2-split', ''); sandbox.__setDom('ex2-watt', '');
    const mod = run(sandbox);
    mod.recomputeCardioFields('ex2', 'rowing', 'time');
    ok(mod.cardioWattSource['ex2'] === 'concept2_derived', '2. Uit afstand+tijd afgeleide watt -> concept2_derived');
  }

  // ═══ 3. Device-measured pad: NOT REACHABLE (expliciet gerapporteerd, geen fictieve test) ═══
  ok(true === true, '3. PERSISTED CONCEPT2_MEASURED PATH: NOT REACHABLE -- geen bestaande, gepersisteerde PM5/native-schrijfroute gevonden (tkRenderConcept2Actual/DeviceCore.resolveConcept2Watts worden nergens vanuit een save-flow aangeroepen); geen fictieve test gemaakt, conform opdracht sectie 5/40.');

  // ═══ 4. Legacy NULL blijft veilig unknown (geen fout geclassificeerd) ═══
  {
    const sandbox = buildSandbox();
    const mod = run(sandbox);
    const perf = mod.cardioPerfFromSession({ exercise_id: 'roeien', date: '2026-01-01', distance: 2000, time_str: '8:00', watt: 220 }, 'rowing');
    ok(perf.wattsSource === null, '4. Legacy rij zonder watt_source geeft null (unknown) terug -- nooit een verzonnen manual/measured/derived-classificatie');
  }

  // ═══ 5. Manual overwrite: derived -> gebruiker overschrijft handmatig -> manual ═══
  {
    const sandbox = buildSandbox();
    sandbox.__setDom('ex5-distance', '2000'); sandbox.__setDom('ex5-time', '8:00'); sandbox.__setDom('ex5-split', ''); sandbox.__setDom('ex5-watt', '');
    const mod = run(sandbox);
    mod.recomputeCardioFields('ex5', 'rowing', 'time');
    ok(mod.cardioWattSource['ex5'] === 'concept2_derived', '5a. Startpunt: derived na tijd-invoer');
    sandbox.__setDom('ex5-watt', '250');
    mod.recomputeCardioFields('ex5', 'rowing', 'watt');
    ok(mod.cardioWattSource['ex5'] === 'manual', '5b. Gebruiker overschrijft de afgeleide watt handmatig -> bron wordt manual (niet langer derived)');
  }

  // ═══ 6. Derived overwrite: manual -> gebruiker wijzigt split -> opnieuw derived ═══
  {
    const sandbox = buildSandbox();
    sandbox.__setDom('ex6-watt', '220'); sandbox.__setDom('ex6-time', ''); sandbox.__setDom('ex6-distance', ''); sandbox.__setDom('ex6-split', '');
    const mod = run(sandbox);
    mod.recomputeCardioFields('ex6', 'rowing', 'watt');
    ok(mod.cardioWattSource['ex6'] === 'manual', '6a. Startpunt: manual na directe watt-invoer');
    sandbox.__setDom('ex6-distance', '2000'); sandbox.__setDom('ex6-time', '8:00');
    mod.recomputeCardioFields('ex6', 'rowing', 'time');
    ok(mod.cardioWattSource['ex6'] === 'concept2_derived', '6b. Gebruiker wijzigt vervolgens tijd -> watt wordt herberekend -> bron wordt concept2_derived (niet langer manual)');
  }

  // ═══ 7. Clear watt clears source (via cardioDataToRow: geen watt = geen watt_source) ═══
  {
    const sandbox = buildSandbox();
    const mod = run(sandbox);
    const row = mod.cardioDataToRow('rowing', { distance: '2000', time: '8:00', watt: '', wattSource: 'manual' });
    ok(row.watt === undefined && row.watt_source === undefined, '7. Watt-veld leeggemaakt -> zowel watt als watt_source blijven ongezet (geen orphaned source zonder waarde)');
  }

  // ═══ 8/9. NEGATIVE CONTROLS (verplicht, AFWIJKING 2 gecorrigeerd) ═══
  {
    const sandbox = buildSandbox();
    const mod = run(sandbox);
    const oud = { key: 'k', date: '2026-01-01', watts: 200, wattsSource: 'manual' };
    const nieuw = { key: 'k', date: '2026-01-10', watts: 250, wattsSource: 'concept2_derived' };
    const gefilterdVoorNieuw = mod.wattComparableHistory([oud], nieuw.wattsSource);
    ok(gefilterdVoorNieuw.length === 0, '8. NEGATIVE CONTROL: manual-historie (200W) wordt UITGESLOTEN bij het beoordelen van een nieuwe concept2_derived-waarde (250W) -- geen kunstmatige cross-provenance-PB');
    const echtIsNewBest8 = ProgressionCore.isNewBest([oud], nieuw.key, nieuw, 'watts', 'max');
    const gefilterdIsNewBest8 = ProgressionCore.isNewBest(gefilterdVoorNieuw, nieuw.key, nieuw, 'watts', 'max');
    ok(echtIsNewBest8 === true && gefilterdIsNewBest8 === false, '8b. Bewijs dat de bug ZONDER het filter daadwerkelijk zou optreden (echtIsNewBest8=true), en MET het filter correct wordt voorkomen (gefilterdIsNewBest8=false) -- geen tautologische test');

    const oud2 = { key: 'k', date: '2026-01-01', watts: 200, wattsSource: 'concept2_derived' };
    const nieuw2 = { key: 'k', date: '2026-01-10', watts: 210, wattsSource: 'manual' };
    const gefilterd9 = mod.wattComparableHistory([oud2], nieuw2.wattsSource);
    ok(gefilterd9.length === 0, '9. OMGEKEERDE NEGATIVE CONTROL: derived-historie (200W) en een nieuwe manual-waarde (210W) worden niet stil tot één homogene reeks samengevoegd');
  }

  // ═══ 10/11. POSITIVE CONTROLS: same-source blijft normaal werken ═══
  {
    const sandbox = buildSandbox();
    const mod = run(sandbox);
    const oudM = { key: 'k', date: '2026-01-01', watts: 200, wattsSource: 'manual' };
    const nieuwM = { key: 'k', date: '2026-01-10', watts: 210, wattsSource: 'manual' };
    const gefM = mod.wattComparableHistory([oudM], nieuwM.wattsSource);
    ok(gefM.length === 1 && ProgressionCore.isNewBest(gefM, nieuwM.key, nieuwM, 'watts', 'max') === true, '10. POSITIVE CONTROL: manual<->manual (200W->210W) geeft normaal een nieuwe PB (bewuste V1-keuze A, sectie 8)');

    const oudD = { key: 'k', date: '2026-01-01', watts: 200, wattsSource: 'concept2_derived' };
    const nieuwD = { key: 'k', date: '2026-01-10', watts: 210, wattsSource: 'concept2_derived' };
    const gefD = mod.wattComparableHistory([oudD], nieuwD.wattsSource);
    ok(gefD.length === 1 && ProgressionCore.isNewBest(gefD, nieuwD.key, nieuwD, 'watts', 'max') === true, '11. POSITIVE CONTROL: derived<->derived (200W->210W) geeft normaal een nieuwe PB');
  }

  // ═══ 12. MIXED TREND: een enkele afwijkende derived-waarde mag een measured-trend niet kunstmatig optrekken ═══
  {
    const sandbox = buildSandbox();
    const mod = run(sandbox);
    const reeks = [
      { key: 'k', date: '2026-01-01', watts: 190, wattsSource: 'manual' },
      { key: 'k', date: '2026-01-05', watts: 240, wattsSource: 'concept2_derived' },
      { key: 'k', date: '2026-01-10', watts: 195, wattsSource: 'manual' }
    ];
    const huidige = { key: 'k', date: '2026-01-15', watts: 198, wattsSource: 'manual' };
    const gefilterd = mod.wattComparableHistory(reeks, huidige.wattsSource);
    ok(gefilterd.length === 2 && gefilterd.every(function (p) { return p.wattsSource === 'manual'; }), '12. MIXED TREND: de 240W-derived-uitschieter wordt uit de manual-trendreeks gefilterd (blijven over: 190 en 195, beide manual)');
  }

  // ═══ 13. Rowing, 14. SkiErg, 15. BikeErg — zelfde mechanisme, apart bewezen ═══
  {
    const sandbox = buildSandbox();
    sandbox.__setDom('row-watt', '210'); sandbox.__setDom('row-time', ''); sandbox.__setDom('row-distance', ''); sandbox.__setDom('row-split', '');
    const mod = run(sandbox);
    mod.recomputeCardioFields('row', 'rowing', 'watt');
    ok(mod.cardioWattSource['row'] === 'manual', '13. Rowing: directe invoer -> manual');
  }
  {
    const sandbox = buildSandbox();
    sandbox.__setDom('ski-distance', '1500'); sandbox.__setDom('ski-time', '6:00'); sandbox.__setDom('ski-split', ''); sandbox.__setDom('ski-watt', '');
    const mod = run(sandbox);
    mod.recomputeCardioFields('ski', 'skierg', 'time');
    ok(mod.cardioWattSource['ski'] === 'concept2_derived', '14. SkiErg: afleiding uit afstand+tijd -> concept2_derived (zelfde mechanisme als Rowing, geen sport-specifieke afwijking)');
  }
  {
    const sandbox = buildSandbox();
    sandbox.__setDom('bike-watt', '180'); sandbox.__setDom('bike-time', ''); sandbox.__setDom('bike-distance', ''); sandbox.__setDom('bike-split', '');
    const mod = run(sandbox);
    mod.recomputeCardioFields('bike', 'bikeerg', 'watt');
    ok(mod.cardioWattSource['bike'] === 'manual', '15. BikeErg-regressie: zelfde mechanisme werkt onveranderd (directe invoer -> manual)');
  }

  // ═══ Assault Bike: cfg.calc===null, watt-tracking moet ALSNOG werken
  // (dit was de kritieke early-return-bug die de eerste versie miste) ═══
  {
    const sandbox = buildSandbox();
    sandbox.__setDom('ab-watt', '150'); sandbox.__setDom('ab-time', '10:00'); sandbox.__setDom('ab-cals', '120');
    const mod = run(sandbox);
    mod.recomputeCardioFields('ab', 'assaultbike', 'watt');
    ok(mod.cardioWattSource['ab'] === 'manual', 'AANVULLEND: Assault Bike (cfg.calc===null, vóór-early-return-bugfix) markeert directe watt-invoer alsnog correct als manual -- zonder deze fix zou dit pad de watt-herkomst nooit bijhouden');
    ok(mod.cardioBestMetric('assaultbike', { watts: 150 }).field === 'watts', 'AANVULLEND: bevestigt dat Assault Bike daadwerkelijk \'watts\' als PB-veld gebruikt (enige sport waar dit filter praktisch relevant is)');
  }

  // ═══ cardioPerfFromSession blijft watts + wattsSource beide leveren ═══
  {
    const sandbox = buildSandbox();
    const mod = run(sandbox);
    const perf = mod.cardioPerfFromSession({ exercise_id: 'roeien', date: '2026-01-01', distance: 2000, time_str: '8:00', watt: 220, watt_source: 'manual' }, 'rowing');
    ok(perf.watts === 220 && perf.wattsSource === 'manual', '16. cardioPerfFromSession() blijft watts + wattsSource beide leveren');
  }

  console.log('fWattProvenanceGapP2013: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  if (msgs.length) console.log(msgs.join('\n'));
  console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail > 0 ? 1 : 0);
})();
