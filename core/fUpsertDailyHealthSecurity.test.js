/* fUpsertDailyHealthSecurity.test.js — F13 Post-Audit Remediation P0-A.
 * Bewaakt dat upsert_daily_health() nooit door een anonieme aanroeper
 * of een cross-user authenticated aanroep gebruikt kan worden om
 * gezondheidsdata voor een willekeurige gebruiker te schrijven.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const migratie = fs.readFileSync(path.join(ROOT, 'migratie_v525.sql'), 'utf8');

ok(migratie.includes('revoke execute on function public.upsert_daily_health') && migratie.includes('from anon'),
  'A1: EXECUTE op upsert_daily_health() is expliciet ingetrokken van anon');
ok(migratie.includes('from public'),
  'A2: EXECUTE op upsert_daily_health() is expliciet ingetrokken van PUBLIC');

const fnBlok = migratie.split('as $function$')[1] ? migratie.split('as $function$')[1].split('$function$;')[0] : '';
ok(fnBlok.includes("auth.role() IS DISTINCT FROM 'service_role'"),
  'B1: de functie controleert expliciet op auth.role() = service_role -- niet langer "auth.uid() IS NULL" als (onveilige) proxy');
ok(!fnBlok.match(/IF\s+v_caller\s+IS\s+NOT\s+NULL\s+AND\s+v_caller\s*<>/i),
  'B2: het oude, onveilige patroon ("IF v_caller IS NOT NULL AND...") dat de check oversloeg bij een NULL auth.uid() bestaat niet meer');
ok(fnBlok.includes('v_caller IS NULL OR v_caller <> p_user_id'),
  'B3: voor elke niet-service-role-aanroeper wordt zowel een ontbrekende als een afwijkende auth.uid() geweigerd');

console.log('fUpsertDailyHealthSecurity: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
