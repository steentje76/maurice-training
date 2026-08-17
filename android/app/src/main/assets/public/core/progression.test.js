/* TrainingKompas — Progression Core test suite (node, standalone).
 * Draai: node core/progression.test.js
 * Bewijst: deterministische vergelijking, metric-semantiek, data-sufficiency, purity. */
const fs = require('fs');
const path = require('path');
const P = require('./progression.js');

let pass = 0, fail = 0;
const T = (n, fn) => { try { fn(); console.log('  ✓ ' + n); pass++; } catch (e) { console.log('  ✗ ' + n + ' :: ' + e.message); fail++; } };
const eq = (a, b, m) => { if (!Object.is(a, b)) throw new Error((m || '') + ' verwacht ' + b + ', kreeg ' + a); };
const ok = (c, m) => { if (!c) throw new Error(m || 'assert'); };

// RowErg 2000m historie (splitSec lager = beter, watts hoger = beter)
const row2k = [
  { key: 'roeien@2000', date: '2026-07-01', durationSec: 505, splitSec: 126.25, watts: 175 },
  { key: 'roeien@2000', date: '2026-07-10', durationSec: 501, splitSec: 125.25, watts: 178 },
  { key: 'roeien@2000', date: '2026-07-20', durationSec: 494, splitSec: 123.5, watts: 185 },
];
const row5k = [{ key: 'roeien@5000', date: '2026-07-05', durationSec: 1300, splitSec: 130, watts: 170 }];
const current2k = { key: 'roeien@2000', date: '2026-08-01', durationSec: 492, splitSec: 123, watts: 187 };
const ROW_METRICS = [
  { field: 'durationSec', dir: 'min', unit: 's', label: 'Tijd' },
  { field: 'splitSec', dir: 'min', unit: '/500m', label: 'Split' },
  { field: 'watts', dir: 'max', unit: 'W', label: 'Vermogen' },
];

// ================= A. sufficiency =================
console.log('\n[A] sufficiency (data-sufficiency status)');
T('0 -> first (geen vergelijking/trend)', () => { const s = P.sufficiency(0); eq(s.status, 'first'); eq(s.canCompare, false); eq(s.canTrend, false); });
T('1 -> one_previous (wel vergelijking, geen trend)', () => { const s = P.sufficiency(1); eq(s.status, 'one_previous'); eq(s.canCompare, true); eq(s.canTrend, false); });
T('2 -> comparison', () => { eq(P.sufficiency(2).status, 'comparison'); eq(P.sufficiency(2).canTrend, false); });
T('3+ -> trend', () => { const s = P.sufficiency(3); eq(s.status, 'trend'); eq(s.canTrend, true); eq(P.sufficiency(9).canTrend, true); });

// ================= B. comparablePrevious =================
console.log('\n[B] comparablePrevious (vorige vergelijkbare prestatie)');
T('vindt meest recente eerdere prestatie met zelfde key', () => {
  const prev = P.comparablePrevious(row2k, 'roeien@2000', '2026-08-01');
  eq(prev.date, '2026-07-20'); eq(prev.splitSec, 123.5);
});
T('geen vergelijkbare -> null', () => eq(P.comparablePrevious(row2k, 'roeien@9999', '2026-08-01'), null));
T('geen appels/peren: 2000m vindt geen 5000m', () => {
  const all = row2k.concat(row5k);
  eq(P.comparablePrevious(all, 'roeien@2000', '2026-08-01').key, 'roeien@2000');
  eq(P.comparablePrevious(all, 'roeien@5000', '2026-08-01').key, 'roeien@5000');
});
T('respecteert date-grens (before)', () => eq(P.comparablePrevious(row2k, 'roeien@2000', '2026-07-05').date, '2026-07-01'));

// ================= C. bestBy (metric-semantiek) =================
console.log('\n[C] bestBy (beste prestatie per metric)');
T('RowErg: laagste split = beste (dir min)', () => { const b = P.bestBy(row2k, 'roeien@2000', 'splitSec', 'min'); eq(b.date, '2026-07-20'); eq(b.splitSec, 123.5); });
T('RowErg: hoogste watt = beste (dir max)', () => { const b = P.bestBy(row2k, 'roeien@2000', 'watts', 'max'); eq(b.watts, 185); });
T('geen numerieke waarden -> null', () => eq(P.bestBy([{ key: 'x', date: '2026-01-01', splitSec: null }], 'x', 'splitSec', 'min'), null));
T('AssaultBike: hoogste cal/min = beste (dir max)', () => {
  const ab = [{ key: 'ab', date: '2026-07-01', calPerMin: 9.5 }, { key: 'ab', date: '2026-07-10', calPerMin: 10.5 }];
  eq(P.bestBy(ab, 'ab', 'calPerMin', 'max').calPerMin, 10.5);
});

// ================= C2. isNewBest (nieuwe-beste-detectie, F3.3) =================
console.log('\n[C2] isNewBest (nieuwe beste vs eerdere vergelijkbare)');
T('L: snellere split dan eerdere beste -> nieuwe beste (dir min)', () => {
  // eerdere beste split = 123.5; current 123 is sneller
  ok(P.isNewBest(row2k, 'roeien@2000', current2k, 'splitSec', 'min'), 'moet nieuwe beste zijn');
});
T('L: hoger watt dan eerdere beste -> nieuwe beste (dir max)', () => {
  ok(P.isNewBest(row2k, 'roeien@2000', current2k, 'watts', 'max'));
});
T('M: gelijk aan eerdere beste -> geen nieuwe beste', () => {
  eq(P.isNewBest(row2k, 'roeien@2000', { key: 'roeien@2000', splitSec: 123.5 }, 'splitSec', 'min'), false);
});
T('M: langzamer dan eerdere beste -> geen nieuwe beste', () => {
  eq(P.isNewBest(row2k, 'roeien@2000', { key: 'roeien@2000', splitSec: 130 }, 'splitSec', 'min'), false);
});
T('geen eerdere vergelijkbare -> geen nieuwe beste (eerste registratie apart)', () => {
  eq(P.isNewBest([], 'roeien@2000', current2k, 'splitSec', 'min'), false);
  eq(P.isNewBest(row5k, 'roeien@2000', current2k, 'splitSec', 'min'), false); // andere afstand telt niet mee
});
T('ontbrekende current-waarde -> geen valse beste', () => {
  eq(P.isNewBest(row2k, 'roeien@2000', { key: 'roeien@2000', splitSec: null }, 'splitSec', 'min'), false);
});

// ================= C3. recordsBy (meerdere records per key, F7.3) =================
console.log('\n[C3] recordsBy (cardio-records: best per metric)');
T('RowErg 2000m: beste tijd (min) + hoogste watt (max) samen', () => {
  const r = P.recordsBy(row2k, 'roeien@2000', [{ field: 'durationSec', dir: 'min' }, { field: 'watts', dir: 'max' }]);
  eq(r.durationSec.durationSec, 494); eq(r.watts.watts, 185);
});
T('geen data voor metric -> null (geen fake record)', () => {
  const r = P.recordsBy(row2k, 'roeien@2000', [{ field: 'calPerMin', dir: 'max' }]);
  eq(r.calPerMin, null);
});
T('respecteert key (2000m mengt niet met 5000m)', () => {
  const all = row2k.concat(row5k);
  eq(P.recordsBy(all, 'roeien@5000', [{ field: 'durationSec', dir: 'min' }]).durationSec.durationSec, 1300);
});

// ================= D. deltaReport (deterministisch verschil) =================
console.log('\n[D] deltaReport (verschil huidige vs vorige)');
T('split sneller -> better=true (dir min, negatieve delta)', () => {
  const prev = P.comparablePrevious(row2k, 'roeien@2000', '2026-08-01');
  const rep = P.deltaReport(current2k, prev, ROW_METRICS);
  eq(rep.splitSec.delta, 123 - 123.5); eq(rep.splitSec.better, true); // -0.5s/500m sneller
  eq(rep.durationSec.better, true); // 492 < 494
  eq(rep.watts.delta, 187 - 185); eq(rep.watts.better, true); // +2W
});
T('gelijk -> better=null', () => {
  const rep = P.deltaReport({ splitSec: 123 }, { splitSec: 123 }, [{ field: 'splitSec', dir: 'min' }]);
  eq(rep.splitSec.delta, 0); eq(rep.splitSec.better, null);
});
T('slechter -> better=false (dir max, negatieve delta)', () => {
  const rep = P.deltaReport({ watts: 170 }, { watts: 185 }, [{ field: 'watts', dir: 'max' }]);
  eq(rep.watts.better, false); eq(rep.watts.delta, -15);
});
T('ontbrekende waarde -> delta null, better null (geen valse conclusie)', () => {
  const rep = P.deltaReport({ watts: 187 }, { watts: null }, [{ field: 'watts', dir: 'max' }]);
  eq(rep.watts.delta, null); eq(rep.watts.better, null);
});

// ================= E. trendBy =================
console.log('\n[E] trendBy (eenvoudige trend, min 3 vergelijkbare)');
T('<3 vergelijkbare -> insufficient (geen valse trend)', () => {
  const t = P.trendBy(row2k.slice(0, 2), 'roeien@2000', 'splitSec', 'min', 3);
  eq(t.status, 'insufficient');
});
T('>=3 -> trend met richting (split daalt = improving)', () => {
  const t = P.trendBy(row2k, 'roeien@2000', 'splitSec', 'min', 3);
  eq(t.status, 'trend'); eq(t.n, 3); eq(t.improving, true); ok(t.avgStep < 0, 'split moet dalen');
});
T('watts stijgt over 3 sessies -> improving (dir max)', () => {
  const t = P.trendBy(row2k, 'roeien@2000', 'watts', 'max', 3);
  eq(t.improving, true); ok(t.avgStep > 0);
});
T('deterministisch', () => eq(JSON.stringify(P.trendBy(row2k, 'roeien@2000', 'splitSec', 'min', 3)), JSON.stringify(P.trendBy(row2k, 'roeien@2000', 'splitSec', 'min', 3))));

// ================= F. Architecture guards (purity) =================
console.log('\n[F] Architecture guards');
const RAWSRC = fs.readFileSync(path.join(__dirname, 'progression.js'), 'utf8');
const SRC = RAWSRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
['document', 'supabase', 'fetch(', 'localStorage', 'sessionStorage', 'querySelector', '.from(', 'XMLHttpRequest'].forEach(function () {});
T('progression-core bevat geen DOM/DB/AI/network-afhankelijkheid', () => {
  ['document', 'supabase', 'fetch(', 'localStorage', 'sessionStorage', 'querySelector', '.from(', 'XMLHttpRequest'].forEach(tok => ok(!SRC.includes(tok), 'verboden token: ' + tok));
});
T('geen Date-nondeterminisme (sorteert op string-date, geen new Date)', () => ok(SRC.indexOf('new Date') === -1 && SRC.indexOf('Date.now') === -1, 'Date-gebruik in core'));
T('VERSIONS compleet', () => { eq(P.VERSIONS.compare, 'progression_compare.v1'); eq(P.VERSIONS.trend, 'progression_trend.v1'); eq(P.VERSIONS.sufficiency, 'progression_sufficiency.v1'); });

console.log('\n' + '='.repeat(56));
console.log('RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail > 0) { console.log('⚠ STOP: progression-core faalt.'); process.exit(1); }
console.log('✅ Alle progression-tests groen.');
