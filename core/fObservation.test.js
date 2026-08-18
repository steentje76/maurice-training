/* observation.v1 — de observatielaag van Lichaam Data Depth 1.0.
 *
 * Een observatie is een waarde MET herkomst, meetmoment, versheid en dekking. De UI mag
 * daar niets meer zelf van afleiden. Deze test bewaakt dat de laag:
 *   - deterministisch is (zelfde input, zelfde output; geen Date.now, geen random);
 *   - niets verzint (ontbrekende data blijft null, nooit 0);
 *   - gaten correct meetelt in dekking en volledigheid;
 *   - datakwaliteit veilig afleidt: bij twijfel nooit een geruststellende status.
 *
 * Draai: node core/fObservation.test.js
 */
const D = require('./deviceIntegration.js');

let pass = 0, fail = 0;
function ok(c, m){ if(c) pass++; else { fail++; console.log('  ✗ ' + m); } }
function eq(a, b, m){ ok(a === b, m + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')'); }

// Hulpje: een reeks van n dagen eindigend op `end`, met waarden uit `vals` (null = gat).
function serie(end, vals, bron){
  const out = [];
  for (let i = 0; i < vals.length; i++){
    const d = new Date(Date.parse(end + 'T00:00:00Z') - (vals.length - 1 - i) * 86400000);
    out.push({ date: d.toISOString().slice(0,10), value: vals[i],
               source: vals[i] == null ? null : (bron || 'Fitbit') });
  }
  return out;
}

console.log('\n[observation.v1] Observatielaag');

// ── 1. lege en ontbrekende input ─────────────────────────────────────────────
console.log('  lege input verzint niets');
const leeg = D.observation([], { today: '2026-08-17' });
eq(leeg.value, null, 'geen reeks → value null, geen 0');
eq(leeg.count, 0, 'geen metingen geteld');
eq(leeg.freshness, 'none', 'geen versheid zonder meting');
eq(leeg.coverage, 0, 'dekking 0');
eq(leeg.complete, false, 'niet volledig');
eq(leeg.date, null, 'geen meetmoment');
eq(leeg.version, 'observation.v1', 'versietag aanwezig');
eq(D.observation(null, { today: '2026-08-17' }).value, null, 'null-reeks levert geen waarde');
eq(D.observation(undefined).value, null, 'undefined-reeks levert geen waarde');
const alleenGaten = D.observation(serie('2026-08-17', [null, null, null]), { today: '2026-08-17' });
eq(alleenGaten.count, 0, 'een reeks met alleen gaten telt 0 metingen');
eq(alleenGaten.value, null, 'alleen gaten → geen waarde');
eq(alleenGaten.days, 3, 'het venster telt wel gewoon drie dagen');

// ── 2. waarde, herkomst en meetmoment ────────────────────────────────────────
console.log('  waarde, herkomst en meetmoment');
const vol = D.observation(serie('2026-08-17', [40, 42, 44, 46]), { today: '2026-08-17', unit: 'ms' });
eq(vol.value, 46, 'de meest recente meting is de waarde');
eq(vol.date, '2026-08-17', 'het meetmoment is de datum van die meting');
eq(vol.source, 'Fitbit', 'de bron komt uit het datapunt');
eq(vol.kind, 'measured', 'een wearable-bron telt als gemeten');
eq(vol.unit, 'ms', 'de eenheid wordt doorgegeven');
eq(vol.count, 4, 'vier metingen');
eq(vol.coverage, 1, 'volledige dekking');
eq(vol.complete, true, 'volledig');
eq(vol.first.value, 40, 'de eerste meting is bekend');
eq(vol.min.value, 40, 'minimum klopt');
eq(vol.max.value, 46, 'maximum klopt');
eq(vol.min.date, '2026-08-14', 'het minimum draagt zijn eigen datum');

const checkin = D.observation(serie('2026-08-17', [7.2], 'Check-in'), { today: '2026-08-17' });
eq(checkin.kind, 'entered', 'een check-in telt als ingevoerd, niet als gemeten');
eq(D.sourceKind('Fitbit'), 'measured', 'Fitbit is gemeten');
eq(D.sourceKind('Google Health'), 'measured', 'Google Health is gemeten');
eq(D.sourceKind('Check-in'), 'entered', 'Check-in is ingevoerd');
eq(D.sourceKind('handmatig'), 'entered', 'handmatig is ingevoerd');
eq(D.sourceKind(null), 'unknown', 'zonder bron is de herkomst onbekend, niet gemeten');
eq(D.observation(serie('2026-08-17', [80]), { today: '2026-08-17', kind: 'calculated' }).kind, 'calculated',
   'een expliciet meegegeven soort wint — berekende waarden blijven herkenbaar');

// ── 3. versheid is tijdgebonden en deterministisch ───────────────────────────
console.log('  versheid');
function vers(dagenOud){
  const end = new Date(Date.parse('2026-08-17T00:00:00Z') - dagenOud * 86400000).toISOString().slice(0,10);
  return D.observation([{ date: end, value: 42, source: 'Fitbit' }], { today: '2026-08-17' });
}
eq(vers(0).freshness, 'today', 'vandaag gemeten');
eq(vers(0).ageDays, 0, 'leeftijd 0 dagen');
eq(vers(1).freshness, 'yesterday', 'gisteren gemeten');
eq(vers(2).freshness, 'recent', 'twee dagen oud is recent');
eq(vers(6).freshness, 'recent', 'zes dagen oud is nog recent');
eq(vers(7).freshness, 'stale', 'zeven dagen oud is verouderd');
eq(vers(30).freshness, 'stale', 'dertig dagen oud is verouderd');
eq(vers(30).ageDays, 30, 'de leeftijd wordt exact geteld');
eq(D.FRESHNESS_RECENT_DAYS, 7, 'de grens tussen recent en verouderd staat op zeven dagen');
eq(D.observation([{ date: '2026-08-20', value: 42, source: 'Fitbit' }], { today: '2026-08-17' }).freshness, 'future',
   'een meting in de toekomst telt nooit als vers');
eq(D.observation([{ date: '2026-08-17', value: 42 }], {}).freshness, 'unknown',
   'zonder referentiedatum is de versheid onbekend, niet vers');

// determinisme: dezelfde input, tien keer, exact dezelfde uitkomst
const s1 = serie('2026-08-17', [40, null, 44, 46]);
const eerste = JSON.stringify(D.observation(s1, { today: '2026-08-17' }));
let stabiel = true;
for (let i = 0; i < 10; i++) if (JSON.stringify(D.observation(s1, { today: '2026-08-17' })) !== eerste) stabiel = false;
ok(stabiel, 'tien keer dezelfde input geeft tien keer dezelfde output');

// ── 4. gaten tellen mee in dekking ───────────────────────────────────────────
console.log('  gaten en dekking');
const half = D.observation(serie('2026-08-17', [40, null, 44, null]), { today: '2026-08-17' });
eq(half.count, 2, 'twee echte metingen');
eq(half.days, 4, 'venster van vier dagen');
eq(half.coverage, 0.5, 'dekking 0,5');
eq(half.complete, false, 'niet volledig');
eq(half.value, 44, 'een gat op de laatste dag verschuift de waarde naar de laatste echte meting');
eq(half.date, '2026-08-16', 'en het meetmoment schuift mee');
ok(half.value !== 0, 'een gat wordt nooit als 0 gepresenteerd');

// ── 5. datakwaliteit — bij twijfel nooit geruststellend ──────────────────────
console.log('  datakwaliteit');
const goed = D.observation(serie('2026-08-17', [40, 42, 44, 46]), { today: '2026-08-17' });
eq(D.observationQuality(goed, { status: 'connected' }), 'current', 'verse volledige data is actueel');
eq(D.observationQuality(goed, { status: 'syncing' }), 'syncing', 'een lopende sync wint van de waarde');
eq(D.observationQuality(goed, { status: 'sync_failed' }), 'sync_failed', 'een mislukte sync wint van de waarde');
eq(D.observationQuality(goed, { status: 'token_expired' }), 'sync_failed', 'een verlopen token telt als mislukte sync');
eq(D.observationQuality(goed, { status: 'stale' }), 'stale', 'een verouderde bron maakt de observatie verouderd');
eq(D.observationQuality(leeg, { status: 'not_connected' }), 'source_unavailable', 'geen bron gekoppeld is iets anders dan geen data');
eq(D.observationQuality(leeg, { status: 'connected' }), 'no_data', 'gekoppeld maar niets gemeten is geen data');
eq(D.observationQuality(leeg, {}), 'no_data', 'zonder syncinformatie blijft het geen data');
eq(D.observationQuality(vers(30), { status: 'connected' }), 'stale', 'een oude meting is verouderd, ook bij een gezonde koppeling');
eq(D.observationQuality(D.observation(serie('2026-08-17', [40, null, null, 46]), { today: '2026-08-17' }), { status: 'connected' }),
   'partial', 'lage dekking is gedeeltelijke data');
eq(D.observationQuality(half, { status: 'connected' }), 'partial',
   'de helft van de dagen gemeten is een gedeeltelijk beeld');
eq(D.PARTIAL_COVERAGE_MAX, 0.5, 'de grens voor gedeeltelijke data ligt expliciet op de helft');
eq(D.observationQuality(D.observation(serie('2026-08-17', [40, 42, null, 46]), { today: '2026-08-17' }), { status: 'connected' }),
   'current', 'driekwart dekking met een verse meting is gewoon actueel');
ok(D.QUALITY_STATES.indexOf('current') >= 0 && D.QUALITY_STATES.length === 7,
   'alle zeven datakwaliteit-toestanden zijn benoemd');
D.QUALITY_STATES.forEach(st => ok(typeof st === 'string' && st.length > 0, 'toestand "' + st + '" is benoemd'));

// geen enkele combinatie mag 'current' opleveren zonder echte, verse meting
let onterecht = 0;
[null, {}, {status:'not_connected'}, {status:'syncing'}, {status:'sync_failed'}, {status:'stale'}].forEach(sy => {
  if (D.observationQuality(leeg, sy) === 'current') onterecht++;
  if (D.observationQuality(vers(30), sy) === 'current') onterecht++;
});
eq(onterecht, 0, 'zonder verse meting is de status nooit "actueel"');

// ── 6. puurheid ──────────────────────────────────────────────────────────────
console.log('  puurheid');
const bron = require('fs').readFileSync(require('path').join(__dirname, 'deviceIntegration.js'), 'utf8');
const blok = bron.slice(bron.indexOf('var OBSERVATION_VERSION'), bron.indexOf('var DEVICE_STATUSES'));
ok(blok.indexOf('Date.now(') < 0, 'de observatielaag gebruikt geen Date.now()');
ok(blok.indexOf('Math.random') < 0, 'de observatielaag gebruikt geen random');
ok(blok.indexOf('document') < 0 && blok.indexOf('window') < 0, 'de observatielaag raakt de DOM niet');
ok(blok.indexOf('fetch(') < 0 && blok.indexOf('sbGet') < 0, 'de observatielaag doet zelf geen queries');
ok(!/correlat|pearson|regress|verband/i.test(blok), 'de observatielaag bevat geen correlatie- of verbandlogica');

console.log('\n  ' + pass + ' geslaagd, ' + fail + ' gefaald');
if (fail) process.exit(1);
