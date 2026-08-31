/* fReproducibleDatasetExport.test.js — F14 MS-F14-02.
 * Bewaakt: server-authoritative export (geen user-id-parameter, dus
 * geen cross-user-risico op ontwerpniveau), consent-gate, dataminimalisatie
 * (geen notes/PII), volledige provenance per record, pseudonimisering
 * (nooit "anonymous" genoemd), least privilege.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const migratie = fs.readFileSync(path.join(ROOT, 'migratie_v531.sql'), 'utf8');
const netlifyFn = fs.readFileSync(path.join(ROOT, 'netlify/functions/research-export.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// ---- A. Geen user-id-parameter (architecturaal onmogelijk cross-user-export via parameter) ----
ok(migratie.includes('create or replace function public.export_research_dataset()') && migratie.includes('returns jsonb'),
  'A1: export_research_dataset() heeft GEEN parameters -- geen manipuleerbaar user-id-veld bestaat');
ok(migratie.includes('v_uid uuid := auth.uid()'),
  'A2: de functie gebruikt uitsluitend auth.uid() van de aanroepende sessie, geen client-input');
ok(migratie.includes('security invoker'),
  'A3: de functie draait als security invoker -- de RLS van sessions geldt als tweede, onafhankelijke beschermingslaag');

// ---- B. Consent-gate ----
ok(migratie.includes("consent_status', 'not_granted'") && migratie.includes("'records', '[]'::jsonb"),
  'B1: zonder geldige consent wordt een lege, expliciet gemarkeerde payload teruggegeven, geen trainingsdata');
ok(migratie.includes("rc.action = 'granted' and rc.consent_version = 'v1'"),
  'B2: de consent-check vereist zowel granted als de huidige, actieve versie (consistent met MS-F14-01)');

// ---- C. Dataminimalisatie: geen notes/PII, wel de proportionele velden ----
ok(!migratie.match(/'note'|s\.note\b/i),
  'C1: het notitieveld (vrije tekst, kan PII bevatten) wordt nergens in de export opgenomen');
ok(migratie.includes("'exercise_id', s.exercise_id") && migratie.includes("'weight_kg', s.weight"),
  'C2: de proportionele, functionele velden (exercise_id/weight/reps/date/training_type) zijn wel aanwezig');
ok(!migratie.match(/hrv_log|weight_log|cyclus/i),
  'C3: gezondheidsdata (HRV/lichaamsgewicht-log/cyclus) is expliciet buiten scope van deze eerste exportversie');

// ---- D. Provenance ----
['schema_version', 'export_generated_at', 'calculation_id', 'calculation_version', 'source_provenance', 'timezone', 'unit_weight'].forEach(function (veld) {
  ok(migratie.includes("'" + veld + "'"), 'D: provenance-veld "' + veld + '" is aanwezig in de export');
});

// ---- E. Pseudonimisering, correct benoemd (nooit "anonymous") ----
ok(migratie.includes('subject_id') && migratie.includes('digest('),
  'E1: een gehasht subject_id wordt gebruikt, nooit het rauwe user_id');
ok(!migratie.match(/\bis\s+anonymous\b|\bis\s+anoniem\b|\banonieme\s+export\b/i),
  'E2: de migratie claimt nergens dat dit "anonymous"/"anoniem" is -- correct als pseudonymous benoemd (de hash is omkeerbaar voor wie de salt+uid kent). Uitleg-tekst die dit expliciet uitsluit (bijv. "nooit anonymous genoemd") is toegestaan.');

// ---- F. Least privilege ----
ok(migratie.includes('revoke all on function public.export_research_dataset() from public, anon'),
  'F1: anon heeft geen enkele toegang tot de export-functie');
ok(migratie.includes('grant execute on function public.export_research_dataset() to authenticated'),
  'F2: alleen authenticated heeft EXECUTE');

// ---- G. Netlify Function gebruikt de eigen JWT, nooit service-role ----
ok(!netlifyFn.match(/SERVICE_ROLE/i),
  'G1: research-export.js gebruikt nergens de service-role-sleutel -- uitsluitend de doorgegeven, eigen user-JWT');
ok(netlifyFn.includes('Authorization: authHeader'),
  'G2: de RPC-aanroep geeft expliciet de eigen Authorization-header van de aanroeper door');

// ---- H. Client: download alleen zichtbaar/bruikbaar bij actieve consent ----
ok(html.includes("actief?'<button class=\"btn btn-o btn-sm\" style=\"margin-left:6px\" onclick=\"downloadResearchExport()\">"),
  'H1: de downloadknop wordt uitsluitend getoond wanneer consent actief is');

console.log('fReproducibleDatasetExport: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
