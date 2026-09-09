/* fWattProvenanceGapP2013.test.js — GAP-P2-013 Fix Verification.
 * Sluit het bewezen P2: sessions.watt kon zowel device-gemeten als
 * split-afgeleid vermogen bevatten zonder enige onderscheidende
 * metadata. Deze test bewijst, tegen de daadwerkelijke, geëxtraheerde
 * productiecode (niet een herimplementatie), dat de nieuwe
 * cardioWattSource-tracking correct werkt in alle relevante scenario's.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');

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

// ═══ Migratie-audit: kolom, constraint, commentaar ═══
const migratie = fs.readFileSync(path.join(ROOT, 'migratie_v548.sql'), 'utf8');
ok(migratie.indexOf('ADD COLUMN IF NOT EXISTS watt_source text NULL') > 0, 'MIGRATIE: watt_source-kolom correct toegevoegd (nullable, geen DEFAULT-afdwinging, geen backfill-gok)');
ok(migratie.indexOf("CHECK (watt_source IS NULL OR watt_source IN ('concept2_measured', 'concept2_derived'))") > 0, 'MIGRATIE: CHECK-constraint beperkt de kolom tot exact de twee toegestane waarden (of NULL)');
ok(migratie.indexOf('GAP-P2-013') > 0, 'MIGRATIE: traceerbaar naar het oorspronkelijke gap-nummer');

// ═══ Extractie van de ECHTE, geëxtraheerde productiecode ═══
const src = [
  'let sessionLog={};',
  slice('function getCardioVal', 'function round1'),
  'function round1(v){ return Math.round(v*10)/10; }',
  slice('function recomputeCardioFields', 'function numSplitsFor'),
  slice('function logCardio', '// ══════════════════════════════════════════════════════════\r\n// TUSSENTIJDS OPSLAAN'),
  slice('function cardioDataToRow', 'function newVasteTrainingId'),
  slice('function cardioPerfFromSession', 'function cardioProgressionMetrics')
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
      skierg: { fields: ['distance', 'time', 'watt'], calc: { distField: 'distance', basis: 500, type: 'split' }, rowMap: { distance: { col: 'distance', parse: 'float' }, time: { col: 'time_str', parse: 'string' }, watt: { col: 'watt', parse: 'int' } } }
    }
  };
}

function run(sandbox) {
  const context = vm.createContext(sandbox);
  vm.runInContext(src + '\nglobalThis.__exports = { recomputeCardioFields, logCardio, cardioDataToRow, cardioPerfFromSession, cardioWattSource, sessionLog };', context);
  return context.__exports;
}

(async () => {
  // ═══ Scenario 1: gebruiker typt DIRECT in het watt-veld -> concept2_measured ═══
  {
    const sandbox = buildSandbox();
    sandbox.__setDom('ex1-watt', '220');
    sandbox.__setDom('ex1-time', '');
    sandbox.__setDom('ex1-distance', '');
    sandbox.__setDom('ex1-split', '');
    const mod = run(sandbox);
    mod.recomputeCardioFields('ex1', 'rowing', 'watt');
    ok(mod.cardioWattSource['ex1'] === 'concept2_measured', 'SCENARIO 1: direct getypte watt-waarde wordt correct gemarkeerd als concept2_measured');
  }

  // ═══ Scenario 2: watt wordt AFGELEID uit afstand+tijd -> concept2_derived ═══
  {
    const sandbox = buildSandbox();
    sandbox.__setDom('ex2-distance', '2000');
    sandbox.__setDom('ex2-time', '8:00');
    sandbox.__setDom('ex2-split', '');
    sandbox.__setDom('ex2-watt', '');
    const mod = run(sandbox);
    mod.recomputeCardioFields('ex2', 'rowing', 'time');
    ok(mod.cardioWattSource['ex2'] === 'concept2_derived', 'SCENARIO 2: uit afstand+tijd afgeleide watt-waarde wordt correct gemarkeerd als concept2_derived');
  }

  // ═══ Scenario 3: logCardio neemt wattSource mee in de tussentijdse data,
  // maar UITSLUITEND voor apparaten waar watt daadwerkelijk een veld is ═══
  {
    const sandbox = buildSandbox();
    sandbox.__setDom('ex3-distance', '2000');
    sandbox.__setDom('ex3-time', '8:00');
    sandbox.__setDom('ex3-split', '');
    sandbox.__setDom('ex3-watt', '');
    const mod = run(sandbox);
    mod.recomputeCardioFields('ex3', 'rowing', 'time');
    mod.logCardio('ex3', 'rowing');
    ok(mod.sessionLog['ex3'].cardio.wattSource === 'concept2_derived', 'SCENARIO 3: logCardio() neemt de bijgehouden wattSource correct over in sessionLog[exId].cardio');
  }

  // ═══ Scenario 4: cardioDataToRow schrijft watt_source alleen weg als er
  // ECHT een watt-waarde EN een bekende bron is (nooit een verzonnen
  // 'measured'-default voor rijen zonder watt) ═══
  {
    const sandbox = buildSandbox();
    const mod = run(sandbox);
    const rowMetWatt = mod.cardioDataToRow('rowing', { distance: '2000', time: '8:00', watt: '220', wattSource: 'concept2_derived' });
    ok(rowMetWatt.watt === 220 && rowMetWatt.watt_source === 'concept2_derived', 'SCENARIO 4a: watt_source wordt correct meegeschreven wanneer watt EN wattSource beide aanwezig zijn');

    const rowZonderWatt = mod.cardioDataToRow('rowing', { distance: '2000', time: '8:00', watt: '', wattSource: 'concept2_derived' });
    ok(rowZonderWatt.watt === undefined && rowZonderWatt.watt_source === undefined, 'SCENARIO 4b: watt_source wordt NIET meegeschreven als er geen watt-waarde is (voorkomt een verzonnen bron zonder bijbehorend getal)');

    const rowZonderSource = mod.cardioDataToRow('rowing', { distance: '2000', time: '8:00', watt: '220' });
    ok(rowZonderSource.watt === 220 && rowZonderSource.watt_source === undefined, 'SCENARIO 4c: watt_source blijft ongezet (dus NULL in de database) wanneer de bron onbekend is -- geen verzonnen default');

    const rowOngeldigeSource = mod.cardioDataToRow('rowing', { distance: '2000', time: '8:00', watt: '220', wattSource: 'iets_anders' });
    ok(rowOngeldigeSource.watt_source === undefined, 'SCENARIO 4d: een onverwachte/ongeldige wattSource-waarde wordt NIET doorgeschreven (whitelist, geen open doorgifte)');
  }

  // ═══ Scenario 5: cardioPerfFromSession geeft wattsSource door zonder de
  // bestaande vergelijkingswaarde (watts) te wijzigen -- geen regressie op
  // de PR-/trendvergelijking zelf ═══
  {
    const sandbox = buildSandbox();
    const mod = run(sandbox);
    const perfMetBron = mod.cardioPerfFromSession({ exercise_id: 'roeien', date: '2026-01-01', distance: 2000, time_str: '8:00', watt: 220, watt_source: 'concept2_measured' }, 'rowing');
    ok(perfMetBron.watts === 220, 'SCENARIO 5a: de bestaande watts-waarde (gebruikt voor PR-vergelijking) blijft ONGEWIJZIGD -- geen regressie op isNewBest/trendBy');
    ok(perfMetBron.wattsSource === 'concept2_measured', 'SCENARIO 5b: wattsSource wordt correct doorgegeven vanuit de database-rij');

    const perfZonderBron = mod.cardioPerfFromSession({ exercise_id: 'roeien', date: '2026-01-01', distance: 2000, time_str: '8:00', watt: 220 }, 'rowing');
    ok(perfZonderBron.watts === 220 && perfZonderBron.wattsSource === null, 'SCENARIO 5c: historische rijen zonder watt_source (van vóór deze fix) geven correct null terug -- geen verzonnen bron');
  }

  // ═══ Scenario 6: SkiErg gebruikt exact hetzelfde mechanisme (geen
  // sport-specifieke afwijking, consistent met CALC-END-002's gelijke
  // applicability-claim voor RowErg/SkiErg/BikeErg) ═══
  {
    const sandbox = buildSandbox();
    sandbox.__setDom('ex6-watt', '180');
    sandbox.__setDom('ex6-time', '');
    sandbox.__setDom('ex6-distance', '');
    sandbox.__setDom('ex6-split', '');
    const mod = run(sandbox);
    mod.recomputeCardioFields('ex6', 'skierg', 'watt');
    ok(mod.cardioWattSource['ex6'] === 'concept2_measured', 'SCENARIO 6: SkiErg gebruikt exact hetzelfde provenance-mechanisme als Rowing (geen sport-specifieke afwijking)');
  }

  console.log('fWattProvenanceGapP2013: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  if (msgs.length) console.log(msgs.join('\n'));
  console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail > 0 ? 1 : 0);
})();
