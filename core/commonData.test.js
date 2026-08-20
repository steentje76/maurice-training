/* TrainingKompas — Common Data Model Core test suite (node, standalone).
 * Draai: node core/commonData.test.js */
const CommonDataCore = require('./commonData.js');

let pass = 0, fail = 0;
const T = (name, fn) => { try { fn(); console.log('  ✓ ' + name); pass++; } catch (e) { console.log('  ✗ ' + name + ' :: ' + e.message); fail++; } };
const eq = (a, b, m) => { if (!Object.is(a, b)) throw new Error((m || '') + ' verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a)); };
const ok = (c, m) => { if (!c) throw new Error(m || 'assert'); };

console.log('\n🔗 Common Data Model Core');

console.log('\n[A] normalizeDataPoint — vorm en validatie');
T('geldig punt -> volledige NormalizedDataPoint', () => {
  const p = CommonDataCore.normalizeDataPoint({
    source: 'google_health', sourceType: 'health_platform', athleteId: 'u1',
    timestamp: '2026-08-13T08:00:00Z', metric: 'hrv', value: 45, unit: 'ms'
  });
  ok(p, 'punt moet niet-null zijn');
  eq(p.source, 'google_health');
  eq(p.metric, 'hrv');
  eq(p.unit, 'ms');
  eq(p.value, 45);
  eq(p.provenance.version, CommonDataCore.VERSIONS.normalize);
});
T('ontbrekende verplichte velden -> null (fail-closed)', () => {
  eq(CommonDataCore.normalizeDataPoint({ source: 'x' }), null);
  eq(CommonDataCore.normalizeDataPoint(null), null);
  eq(CommonDataCore.normalizeDataPoint(undefined), null);
});
T('onbekende metric -> null, geen giswerk', () => {
  const p = CommonDataCore.normalizeDataPoint({ source: 'x', sourceType: 'wearable', timestamp: 't', metric: 'onbekend_veld', value: 1 });
  eq(p, null);
});
T('verkeerde eenheid t.o.v. canonieke eenheid -> null, geen stille foutconversie', () => {
  const p = CommonDataCore.normalizeDataPoint({ source: 'x', sourceType: 'wearable', timestamp: 't', metric: 'distance', value: 5, unit: 'km' });
  eq(p, null, 'distance verwacht meters, niet km — moet weigeren, niet zelf omrekenen');
});
T('geen unit meegegeven -> geaccepteerd, canonieke unit wordt toegekend', () => {
  const p = CommonDataCore.normalizeDataPoint({ source: 'x', sourceType: 'wearable', timestamp: 't', metric: 'distance', value: 5000 });
  ok(p);
  eq(p.unit, 'meters');
});
T('optionele velden blijven null als niet meegegeven', () => {
  const p = CommonDataCore.normalizeDataPoint({ source: 'x', sourceType: 'wearable', timestamp: 't', metric: 'heart_rate', value: 150 });
  eq(p.hrv, null);
  eq(p.loadKg, null);
  eq(p.deviceMetadata, null);
});

console.log('\n[B] convertUnit — expliciete, deterministische conversies');
T('km -> meters', () => { eq(CommonDataCore.convertUnit(5, 'km', 'meters'), 5000); });
T('lb -> kg', () => { ok(Math.abs(CommonDataCore.convertUnit(220, 'lb', 'kg') - 99.79) < 0.01); });
T('gelijke eenheden -> ongewijzigd', () => { eq(CommonDataCore.convertUnit(42, 'bpm', 'bpm'), 42); });
T('onbekend paar -> null, geen giswerk', () => { eq(CommonDataCore.convertUnit(1, 'furlong', 'meters'), null); });
T('ongeldige waarde -> null', () => { eq(CommonDataCore.convertUnit(null, 'km', 'meters'), null); eq(CommonDataCore.convertUnit(NaN, 'km', 'meters'), null); });

console.log('\n[C] mergeDataPoints — deduplicatie, deterministisch');
T('exact dezelfde source+metric+timestamp -> laatste wint', () => {
  const a = { source: 's', metric: 'hrv', timestamp: 't1', value: 1 };
  const b = { source: 's', metric: 'hrv', timestamp: 't1', value: 2 };
  const out = CommonDataCore.mergeDataPoints([a, b]);
  eq(out.length, 1);
  eq(out[0].value, 2);
});
T('verschillende timestamps blijven los', () => {
  const out = CommonDataCore.mergeDataPoints([
    { source: 's', metric: 'hrv', timestamp: 't1', value: 1 },
    { source: 's', metric: 'hrv', timestamp: 't2', value: 2 }
  ]);
  eq(out.length, 2);
});
T('verschillende sources bij zelfde timestamp blijven los', () => {
  const out = CommonDataCore.mergeDataPoints([
    { source: 'garmin', metric: 'hrv', timestamp: 't1', value: 1 },
    { source: 'google_health', metric: 'hrv', timestamp: 't1', value: 2 }
  ]);
  eq(out.length, 2);
});
T('lege/null-invoer -> lege lijst, geen crash', () => {
  eq(CommonDataCore.mergeDataPoints([]).length, 0);
  eq(CommonDataCore.mergeDataPoints(null).length, 0);
  eq(CommonDataCore.mergeDataPoints([null, undefined]).length, 0);
});

console.log('\n[D] groupByWindow — puur windowing, geen interpretatie');
T('punten binnen het venster komen in dezelfde groep', () => {
  const pts = [
    { timestamp: '2026-08-13T08:00:00Z' },
    { timestamp: '2026-08-13T08:00:30Z' },
    { timestamp: '2026-08-13T08:00:55Z' }
  ];
  const groups = CommonDataCore.groupByWindow(pts, 60);
  eq(groups.length, 1);
  eq(groups[0].length, 3);
});
T('punten buiten het venster komen in aparte groepen', () => {
  const pts = [
    { timestamp: '2026-08-13T08:00:00Z' },
    { timestamp: '2026-08-13T09:00:00Z' }
  ];
  const groups = CommonDataCore.groupByWindow(pts, 60);
  eq(groups.length, 2);
});
T('input-volgorde beïnvloedt uitkomst niet (intern gesorteerd op tijd)', () => {
  const pts = [
    { timestamp: '2026-08-13T08:01:00Z' },
    { timestamp: '2026-08-13T08:00:00Z' }
  ];
  const groups = CommonDataCore.groupByWindow(pts, 120);
  eq(groups.length, 1);
  eq(groups[0].length, 2);
});
T('lege invoer -> lege lijst', () => { eq(CommonDataCore.groupByWindow([], 60).length, 0); });

console.log('\n[E] Architecture guards');
T('common-data-core bevat geen DOM/DB/AI/network-afhankelijkheid', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, 'commonData.js'), 'utf8');
  ['document.', 'window.fetch', 'supabase', 'XMLHttpRequest', 'localStorage'].forEach(tok => {
    ok(src.indexOf(tok) === -1, 'verboden token gevonden: ' + tok);
  });
});
T('VERSIONS compleet voor alle publieke functies', () => {
  ['normalize', 'unitConvert', 'merge', 'grouping'].forEach(k => ok(CommonDataCore.VERSIONS[k], 'ontbreekt: ' + k));
});
T('CANONICAL_METRICS en CANONICAL_UNITS zijn consistent (elke metric heeft een eenheid)', () => {
  CommonDataCore.CANONICAL_METRICS.forEach(m => ok(CommonDataCore.canonicalUnitFor(m), 'geen eenheid voor ' + m));
});

console.log('\n========================================================');
console.log(`RESULTAAT: ${pass} geslaagd, ${fail} mislukt`);
if (fail === 0) console.log('✅ Alle Common Data Model-tests groen.');
else process.exit(1);
