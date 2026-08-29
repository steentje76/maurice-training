/* fHrvConcurrencyClosure.test.js — F3 Closure Hotfix regressietest (GAP-P1-008).
 *
 * Deze test kan de live Postgres-atomiciteit van INSERT..ON CONFLICT..DO UPDATE niet
 * zelf reproduceren zonder een echte DB-verbinding (dat is al live geverifieerd via
 * Supabase tijdens deze sprint — zie docs/GAP_P1_008_CLOSURE_REPORT.md). Deze test
 * bewaakt in plaats daarvan: (A) dat de client/server-code daadwerkelijk de RPC
 * aanroept i.p.v. het oude read-then-decide-patroon, (B) dat de RPC zelf (SQL-tekst
 * in de migratie) de juiste per-veld-merge- en autorisatielogica bevat, (C) dat
 * pickLatestMetric() de nieuwe per-veld-kolommen prefereert boven de oude note-tag,
 * en (D) dat de migratie zelf de vereiste cleanup->constraint->RPC-volgorde bevat.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const wearableSync = fs.readFileSync(path.join(ROOT, 'netlify/functions/wearable-sync.js'), 'utf8');
const migratie = fs.readFileSync(path.join(ROOT, 'migratie_v500.sql'), 'utf8');
const deviceIntegration = require(path.join(ROOT, 'core/deviceIntegration.js'));

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

// ---- A. Client roept de atomaire RPC aan, niet het oude read-then-write-patroon ----
ok(html.includes("sbRpc('upsert_daily_health'"), 'index.html: upsertHrvLog() roept de atomaire RPC aan');
ok(!/const existing=await sbGet\('hrv_log','&date=eq\.'\+d\+'&order=created_at\.desc&limit=1'\);\s*\r?\n\s*const cur=existing\.length\?existing\[0\]:null;\s*\r?\n\s*const merged=tkMergeHealthRow\(cur,fields\);/.test(html),
  'index.html: het oude lees-dan-merge-dan-PATCH/POST-patroon in upsertHrvLog() bestaat niet meer');

// ---- B. Server roept de atomaire RPC aan ----
ok(wearableSync.includes('/rest/v1/rpc/upsert_daily_health'), 'wearable-sync.js: roept de atomaire RPC aan i.p.v. rechtstreeks POST/PATCH op hrv_log');
ok(!/const existingRes = await fetch\(`\$\{supabaseUrl\}\/rest\/v1\/hrv_log\?user_id=eq\.\$\{userId\}&date=eq\.\$\{date\}&order=created_at\.desc&limit=1`/.test(wearableSync),
  'wearable-sync.js: de oude content-lookup-vóór-write bestaat niet meer als basis voor de schrijfbeslissing');

// ---- C. Migratie bevat de vereiste, veilige volgorde ----
ok(migratie.indexOf('hrv_log_archive_v500') < migratie.indexOf('GROUP BY user_id, date HAVING count(*) > 1'),
  'migratie_v500.sql: archiveringstabel wordt aangemaakt vóór de duplicate-detectie wordt gebruikt om te reconciliëren');
ok(migratie.indexOf("RAISE EXCEPTION 'GAP-P1-008-cleanup onvolledig") < migratie.indexOf('hrv_log_user_date_unique'),
  'migratie_v500.sql: de zero-duplicates-verificatie staat VOOR de UNIQUE-constraint (geen constraint zonder bewezen schone data)');
ok(migratie.includes('ON CONFLICT (user_id, date) DO UPDATE'), 'migratie_v500.sql: de RPC gebruikt een atomaire INSERT..ON CONFLICT..DO UPDATE');
ok(migratie.includes("IF v_caller IS NOT NULL AND v_caller <> p_user_id THEN") && migratie.includes('RAISE EXCEPTION'),
  'migratie_v500.sql: de RPC weigert cross-user writes voor authenticated callers (sectie 27)');
ok(migratie.includes("IF p_source NOT IN ('manual','wearable','unknown') THEN"),
  'migratie_v500.sql: de RPC valideert de source-waarde, geen willekeurige string toegestaan');
ok(/hrv\s*=\s*COALESCE\(EXCLUDED\.hrv, public\.hrv_log\.hrv\)/.test(migratie),
  'migratie_v500.sql: hrv wordt per-veld gemerged (COALESCE), niet blind overschreven -- voorkomt het lost-update-scenario uit sectie 21');
ok(/hrv_source\s*=\s*CASE WHEN EXCLUDED\.hrv\s+IS NOT NULL THEN EXCLUDED\.hrv_source\s+ELSE public\.hrv_log\.hrv_source\s+END/.test(migratie),
  'migratie_v500.sql: hrv_source volgt de hrv-waarde (sectie 8: source moet de waarde volgen, nooit los raken)');

// ---- D. pickLatestMetric prefereert de nieuwe kolom, valt terug op de oude tag ----
{
  const nieuweKolom = deviceIntegration.pickLatestMetric(
    [{ date: '2026-08-20', hrv: 45, hrv_source: 'wearable', note: null }], 'hrv'
  );
  ok(nieuweKolom.source === 'Fitbit', 'pickLatestMetric: gebruikt de nieuwe hrv_source-kolom (wearable -> Fitbit-label) wanneer aanwezig');

  const manueleKolom = deviceIntegration.pickLatestMetric(
    [{ date: '2026-08-20', hrv: 45, hrv_source: 'manual', note: null }], 'hrv'
  );
  ok(manueleKolom.source === 'Check-in', 'pickLatestMetric: gebruikt de nieuwe hrv_source-kolom (manual -> Check-in-label)');

  const historischeRij = deviceIntegration.pickLatestMetric(
    [{ date: '2026-06-01', hrv: 30, hrv_source: null, note: '[src:fitbit]' }], 'hrv'
  );
  ok(historischeRij.source === 'Fitbit', 'pickLatestMetric: valt terug op de oude note-tag voor historische rijen zonder kolomwaarde (backward compatible)');

  // KRITIEK MIXED-SOURCE-SCENARIO (blijft correct na de leeskant-fix): één rij, note draagt
  // een wearable-tag, maar de kolom zegt expliciet dat RHR handmatig is -- de kolom moet winnen.
  const mixedRij = deviceIntegration.pickLatestMetric(
    [{ date: '2026-08-20', rhr: 58, rhr_source: 'manual', note: '[src:fitbit]' }], 'rhr'
  );
  ok(mixedRij.source === 'Check-in',
    'pickLatestMetric: bij een gemengde rij (note draagt wearable-tag, maar rhr_source zegt manual) wint de PRECIEZE per-veld-kolom -- exact de fout die de oude, rij-niveau tag-methode zou hebben gemaakt');
}

console.log('fHrvConcurrencyClosure: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
