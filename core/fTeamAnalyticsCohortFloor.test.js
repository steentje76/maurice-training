/* fTeamAnalyticsCohortFloor.test.js — F11 Tenant Escape Final Matrix
 * regressietest voor de kritieke privacy-fix in migratie_v519.sql. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const migratie = fs.readFileSync(path.join(ROOT, 'migratie_v519.sql'), 'utf8');

{
  const fnBlok = migratie.split('as $$')[1].split('$$;')[0];
  ok(fnBlok.includes('v_effective_min_cohort := greatest(coalesce(p_min_cohort_size, 5), 5)'),
    'A1: het effectieve minimum wordt berekend met GREATEST(..., 5) -- kan nooit verlaagd worden door de client');
  ok(fnBlok.includes('if coalesce(v_response_count, 0) < v_effective_min_cohort then'),
    'A2: de privacy-gate toetst tegen het effectieve minimum, niet tegen de rauwe client-parameter');
  ok(!fnBlok.includes('< p_min_cohort_size'),
    'A3: nergens wordt nog direct tegen de onbeschermde, rauwe p_min_cohort_size vergeleken');
}

ok(migratie.includes('greatest(coalesce(p_min_cohort_size, 5), 5)'),
  'B1: GREATEST staat een hogere, door de client opgegeven waarde nog steeds toe');

console.log('fTeamAnalyticsCohortFloor: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
