/* fMovekitBatch001Integrity.test.js — MOVEKIT BATCH 001 IMPORT, INTEGRITEITSBEWAKING
 * Bewijst voor de uitbreiding 206 -> 226 (TK-000207..TK-000226):
 *  1. Alle catalog_id's uniek, contigu TK-000001..TK-000226.
 *  2. Alle source.provider_id's (movekit-slugs) uniek.
 *  3. Bestaande TK-000001..TK-000206 identity+source ongewijzigd t.o.v. bewezen baseline (206).
 *  4. exercise-catalog.json en de ingebedde EX_CATALOG in index.html zijn identiek
 *     (geen shadow catalog / geen tweede afwijkende bron van waarheid).
 *  5. Voor elke movekit-posters asset-entry komt ref exact overeen met source.provider_id
 *     (geen verwisselde slug->asset mapping).
 *  6. Elk nieuw record is bereikbaar via een catalog_id-index (ECS-achtige lookup simulatie).
 *
 * Draai: node core/fMovekitBatch001Integrity.test.js
 */
var assert = require('assert');
var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
var CATALOG_JSON = JSON.parse(fs.readFileSync(path.join(ROOT, 'exercise-catalog.json'), 'utf8'));
var BASELINE_206 = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'movekit_batch_001', 'baseline_206.json'), 'utf8'));

var pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.log('  \u2717 ' + m); } }

function extractExCatalog(html) {
  var m = html.match(/const EX_CATALOG = (\{[\s\S]*?\});\r?\n/);
  assert.ok(m, 'EX_CATALOG blok niet gevonden in index.html');
  return JSON.parse(m[1]);
}

var EX_CATALOG = extractExCatalog(HTML);

/* ==== 1. Uniciteit + contiguïteit ==== */
console.log('1. Catalog ID uniciteit en contiguiteit');
var ids = CATALOG_JSON.catalog.map(function (e) { return e.catalog_id; });
ok(ids.length === 226, '1a: catalog telt 226 records (kreeg ' + ids.length + ')');
ok(new Set(ids).size === ids.length, '1b: alle catalog_id\'s uniek');
var nums = ids.map(function (id) { return parseInt(id.replace('TK-', ''), 10); }).sort(function (a, b) { return a - b; });
var contig = true;
for (var i = 0; i < nums.length; i++) { if (nums[i] !== i + 1) { contig = false; break; } }
ok(contig, '1c: contigu TK-000001..TK-000226 zonder gaten');
ok(CATALOG_JSON.count === 226, '1d: count-veld klopt (226)');

/* ==== 2. Provider ID uniciteit ==== */
console.log('2. Provider ID (movekit slug) uniciteit');
var providerIds = CATALOG_JSON.catalog.map(function (e) { return e.source.provider_id; });
ok(new Set(providerIds).size === providerIds.length, '2a: alle source.provider_id\'s uniek');

/* ==== 3. Bestaande 206 ongewijzigd ==== */
console.log('3. Bestaande TK-000001..TK-000206 stabiliteit');
var byId = {};
CATALOG_JSON.catalog.forEach(function (e) { byId[e.catalog_id] = e; });
var stable = true, firstDrift = null;
BASELINE_206.catalog.forEach(function (baseEntry) {
  var cur = byId[baseEntry.catalog_id];
  if (!cur) { stable = false; firstDrift = baseEntry.catalog_id + ' (ontbreekt)'; return; }
  var curKey = JSON.stringify({ id: cur.catalog_id, src: cur.source, idt: cur.identity });
  var baseKey = JSON.stringify({ id: baseEntry.catalog_id, src: baseEntry.source, idt: baseEntry.identity });
  if (curKey !== baseKey && !firstDrift) { firstDrift = baseEntry.catalog_id; stable = false; }
});
ok(stable, '3a: identity/source van TK-000001..TK-000206 byte-identiek aan baseline (afwijking: ' + firstDrift + ')');
ok(BASELINE_206.catalog.length === 206, '3b: baseline-fixture bevat exact 206 (sanity check fixture zelf)');

/* ==== 4. Geen shadow catalog ==== */
console.log('4. exercise-catalog.json === EX_CATALOG (geen shadow catalog)');
ok(JSON.stringify(CATALOG_JSON) === JSON.stringify(EX_CATALOG), '4a: exercise-catalog.json en ingebedde EX_CATALOG zijn identiek');

/* ==== 5. Asset mapping integriteit ==== */
console.log('5. Poster asset ref === source.provider_id (geen verwisselde mapping)');
var assetMismatch = null;
CATALOG_JSON.catalog.forEach(function (e) {
  (e.assets || []).forEach(function (a) {
    if (a.type === 'poster' && a.provider === 'movekit-posters') {
      if (a.ref !== e.source.provider_id && !assetMismatch) {
        assetMismatch = e.catalog_id + ': ref=' + a.ref + ' != provider_id=' + e.source.provider_id;
      }
    }
  });
});
ok(assetMismatch === null, '5a: geen enkele poster-asset ref wijkt af van source.provider_id (' + assetMismatch + ')');

/* ==== 6. Nieuwe records bereikbaar via catalog_id-index (ECS-simulatie) ==== */
console.log('6. Nieuwe Batch 001-records bereikbaar via catalog_id-lookup');
var NEW_IDS = ['TK-000207', 'TK-000208', 'TK-000209', 'TK-000210', 'TK-000211', 'TK-000212', 'TK-000213', 'TK-000214', 'TK-000215', 'TK-000216', 'TK-000217', 'TK-000218', 'TK-000219', 'TK-000220', 'TK-000221', 'TK-000222', 'TK-000223', 'TK-000224', 'TK-000225', 'TK-000226'];
var allReachable = NEW_IDS.every(function (id) { return !!byId[id] && byId[id].source.provider === 'movekit'; });
ok(allReachable, '6a: alle 20 nieuwe TK-ID\'s bereikbaar met provider=movekit via catalog_id-index');
var expectedSlugs = ['cable-low-single-arm-lateral-raise', 'cable-low-to-high-fly', 'cable-pull-through', 'cable-rope-hammer-curl', 'cable-rope-overhead-tricep-extension', 'cable-rope-pullover', 'cable-single-leg-laying-leg-curl', 'cable-wrist-curl', 'captains-chair-knee-raise', 'chest-supported-dumbbell-row', 'chest-supported-t-bar-row', 'close-grip-barbell-curl', 'cossack-squat', 'cross-body-hammer-curl', 'cuban-press', 'cycling-cooldown', 'cycling-intervals', 'cycling-sprint', 'cycling-warmup', 'dead-bug'];
var slugMapOk = NEW_IDS.every(function (id, i) { return byId[id].source.provider_id === expectedSlugs[i]; });
ok(slugMapOk, '6b: slug -> TK-ID mapping komt exact overeen met de gerapporteerde toewijzing');

console.log('\n========================================================');
console.log('fMovekitBatch001Integrity.test.js \u2014 ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail > 0) process.exit(1);
