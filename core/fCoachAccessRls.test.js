/* fCoachAccessRls.test.js — MS-F10-01 regressietest. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const migratie = fs.readFileSync(path.join(ROOT, 'migratie_v507.sql'), 'utf8');

['coach_reads_training_core_sessions', 'coach_reads_recovery_health_hrv',
 'coach_reads_womens_performance_cycle_periods', 'coach_reads_womens_performance_symptom_logs'
].forEach(function (naam) {
  ok(new RegExp('create policy ' + naam + '[\\s\\S]{0,150}coach_has_scope\\(').test(migratie),
    'A: ' + naam + ' gebruikt coach_has_scope()');
});

ok(migratie.includes("coach_reads_womens_performance_cycle_periods") && migratie.includes("'WOMENS_PERFORMANCE'"),
  'B1: Womens Performance-policies verwijzen naar de WOMENS_PERFORMANCE-scope');
{
  const wpBlok = migratie.split('coach_reads_womens_performance_cycle_periods')[1] || '';
  ok(!/TRAINING_CORE|RECOVERY_HEALTH/.test(wpBlok.split(';')[0]),
    'B2: de Womens Performance-policy zelf noemt geen andere scope');
}

ok(migratie.includes('coach_relationship_set_default_scopes') && migratie.includes('security definer'),
  'C1: default-scopes worden uitsluitend server-side ingesteld');
ok(!/create policy coach_access_scopes[\s\S]{0,80}for insert/i.test(migratie),
  'C2: geen insert-policy voor authenticated op coach_access_scopes');
ok(migratie.includes('coach_access_scopes_athlete_wijzigt') && migratie.includes('is_relationship_athlete(relationship_id)'),
  'C3: uitsluitend de athlete mag scopes wijzigen');
{
  const policyBlokken = migratie.split(/(?=create policy)/);
  const coachUpdatePolicy = policyBlokken.find(function (blok) {
    return blok.startsWith('create policy') && /for update/i.test(blok) && /is_relationship_coach\(/.test(blok);
  });
  ok(!coachUpdatePolicy, 'C4: geen enkele UPDATE-policy die de coach zelf toestaat scopes te wijzigen (per policy-blok gecontroleerd)');
}

['is_relationship_athlete', 'is_relationship_coach', 'is_relationship_active', 'coach_has_scope'].forEach(function (fn) {
  ok(new RegExp('revoke execute on function public\\.' + fn + '\\([^)]*\\) from anon').test(migratie),
    'D: ' + fn + '() heeft geen EXECUTE-recht voor anon');
});
ok((migratie.match(/set search_path\s*=\s*public/gi) || []).length >= 5,
  'D5: alle vijf SECURITY DEFINER-functies hebben een vastgezette search_path');

ok(migratie.includes('CASCADE-DOCUMENTATIE-CORRECTIE') && migratie.toLowerCase().includes('feitelijk onjuist'),
  'E1: de eerdere, te brede CASCADE-aanname is expliciet als onjuist gedocumenteerd');

console.log('fCoachAccessRls: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
