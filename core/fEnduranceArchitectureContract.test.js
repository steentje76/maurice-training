/* fEnduranceArchitectureContract.test.js — F13 Post-Audit Remediation P1-10.
 * Bewaakt dat het endurance-architectuurcontract volledig, consistent
 * gedocumenteerd is, en dat het bewust NIET live is uitgevoerd (geen
 * nieuwe, ongebruikte tabellen aangemaakt zonder een concrete consumer).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const contract = fs.readFileSync(path.join(ROOT, 'docs/F13_POST_AUDIT_P1_10_ENDURANCE_ARCHITECTURE_CONTRACT.md'), 'utf8');
const gap = fs.readFileSync(path.join(ROOT, 'docs/GAP_ANALYSIS_V2.md'), 'utf8');

ok(contract.includes('Status: IMPLEMENTED (B9-01 Endurance Data Foundation'),
  'A1: het contract is bijgewerkt naar IMPLEMENTED sinds B9-01 het daadwerkelijk heeft gebouwd (migratie_v533.sql)');
['activities', 'activity_laps', 'athlete_endurance_profile'].forEach(function (tabel) {
  ok(contract.includes('### 2.') && contract.includes(tabel),
    'A2: tabel "' + tabel + '" is uitgewerkt in het contract');
});
ok(contract.includes('distance_meters') && contract.includes('duration_seconds'),
  'A3: SI-canonical units zijn expliciet in kolomnamen verwerkt (geen ongemarkeerd "distance")');
ok(contract.includes('source_provenance') && contract.includes('dedupe_key'),
  'A4: provenance en dedupe-strategie zijn expliciet uitgewerkt');
ok(contract.includes('idx_activities_user_recorded on activities(user_id, recorded_at desc)'),
  'A5: de kritieke (user_id, date)-achtige index (lering uit P1-12) is vanaf dag 1 in het ontwerp opgenomen');
ok(contract.match(/sessions\.distance.*ONGEWIJZIGD blijven bestaan|blijven ONGEWIJZIGD bestaan/),
  'A6: het bestaande, huidige sessions-schema blijft expliciet ongewijzigd (geen destructieve migratie)');

ok(gap.includes('GAP-P2-025') && gap.includes('F13_POST_AUDIT_P1_10_ENDURANCE_ARCHITECTURE_CONTRACT.md'),
  'B1: het contract is traceerbaar vastgelegd als GAP-P2-025 in GAP_ANALYSIS_V2.md, met verwijzing naar het volledige document');

// B9-01: het contract IS nu daadwerkelijk geimplementeerd -- deze assertie
// bevestigt het omgekeerde van de oorspronkelijke F13-P1-10-verwachting
// (die controleerde dat er NOG GEEN migratie bestond). Zie migratie_v533.sql.
const migratieBestanden = fs.readdirSync(ROOT).filter(function (f) { return /^migratie_v5(2[89]|3[0-9]|[4-9]\d)\.sql$/.test(f); });
const bevatEnduranceTabellen = migratieBestanden.some(function (f) {
  const inhoud = fs.readFileSync(path.join(ROOT, f), 'utf8');
  return /create table[^;]*\bactivity_laps\b/i.test(inhoud) || /create table[^;]*\bathlete_endurance_profile\b/i.test(inhoud);
});
ok(bevatEnduranceTabellen,
  'C1: een migratie (B9-01, migratie_v533.sql) maakt de endurance-tabellen inmiddels daadwerkelijk aan -- het contract is niet langer ontwerp-only');

console.log('fEnduranceArchitectureContract: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
