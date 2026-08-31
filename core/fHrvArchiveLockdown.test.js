/* fHrvArchiveLockdown.test.js — F13 Post-Audit Remediation P0-B.
 * Bewaakt dat hrv_log_archive_v500 (een permanent, passief audit-archief
 * met HRV/RHR/slaap/cyclus/notities) nooit toegankelijk is voor anon/
 * authenticated -- geen client-rol mag deze historische, gevoelige
 * gezondheidsdata ooit kunnen lezen of muteren.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const migratie = fs.readFileSync(path.join(ROOT, 'migratie_v525.sql'), 'utf8');

ok(migratie.includes('alter table public.hrv_log_archive_v500 enable row level security'),
  'A1: RLS wordt expliciet ingeschakeld op hrv_log_archive_v500');
ok(!migratie.match(/create policy \w+ on public\.hrv_log_archive_v500/i),
  'A2: geen enkele client-policy wordt aangemaakt (volledige default-deny)');
ok(migratie.includes('revoke all on public.hrv_log_archive_v500 from anon'),
  'B1: alle rechten op hrv_log_archive_v500 zijn expliciet ingetrokken van anon');
ok(migratie.includes('revoke all on public.hrv_log_archive_v500 from authenticated'),
  'B2: alle rechten op hrv_log_archive_v500 zijn expliciet ingetrokken van authenticated');

// ---- C. Bevestig dat de tabel nergens in de applicatiecode wordt gebruikt
// (regressie-anker: als dit ooit verandert, moet deze aanname herzien worden) ----
{
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  ok(!html.includes('hrv_log_archive'), 'C1: index.html bevat geen enkele verwijzing naar hrv_log_archive_v500 (bevestigt: puur archief, geen actieve functionaliteit die door de lockdown zou kunnen breken)');
}

console.log('fHrvArchiveLockdown: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
