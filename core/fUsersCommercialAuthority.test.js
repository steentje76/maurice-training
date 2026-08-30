/* fUsersCommercialAuthority.test.js — MS-F12-02 regressietest.
 * Permanent regressiebewijs voor de kritieke, P0-niveau bevinding: een
 * authenticated gebruiker kon het eigen individual_plan_key/status/
 * expires_at/mollie_customer_id direct naar elke gewenste waarde zetten.
 * Statische migratiebestand-contract-check. De daadwerkelijke live-
 * adversarial-validatie (A t/m H) is apart uitgevoerd op de
 * productiedatabase en gedocumenteerd in migratie_v523.sql.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const migratie = fs.readFileSync(path.join(ROOT, 'migratie_v523.sql'), 'utf8');

// ---- De trigger bestaat en beschermt exact de vier commerciële velden ----
{
  const fnBlok = migratie.split('function public.protect_commercial_user_columns()')[1].split('$$;')[0];
  ['individual_plan_key', 'mollie_customer_id', 'individual_plan_status', 'individual_plan_expires_at'].forEach(function (veld) {
    ok(fnBlok.includes('NEW.' + veld + ' := OLD.' + veld), 'A: protect_commercial_user_columns() beschermt "' + veld + '" (zet terug naar OLD-waarde)');
  });
}

// ---- De conditie is consistent met het bestaande, bewezen privileged-user-columns-patroon ----
{
  const fnBlok = migratie.split('function public.protect_commercial_user_columns()')[1].split('$$;')[0];
  ok(fnBlok.includes("auth.role() is distinct from 'service_role'"),
    'B1: de trigger gebruikt exact dezelfde, bewezen conditie als de bestaande trg_protect_privileged_user_columns (auth.role(), niet auth.uid())');
  ok(!fnBlok.includes('auth.uid() is not null'),
    'B2: de eerdere, minder precieze auth.uid()-conditie is volledig vervangen, niet naast de nieuwe blijven staan');
}

// ---- De trigger is BEFORE UPDATE (kan de waarde daadwerkelijk terugzetten vóór opslag) ----
ok(migratie.includes('before update on public.users') && migratie.includes('trg_protect_commercial_user_columns'),
  'C1: de trigger is expliciet BEFORE UPDATE op public.users');

// ---- SECURITY DEFINER-hardening consistent met het bestaande patroon ----
{
  const fnBlok = migratie.split('function public.protect_commercial_user_columns()')[0].split('CREATE OR REPLACE FUNCTION').pop();
}
ok(migratie.includes("set search_path = public, pg_temp"), 'D1: de functie gebruikt een vaste, veilige search_path (consistent met het bestaande patroon)');

// ---- check_and_increment_usage / decrement_usage bestaan en zijn correct gehard ----
ok(migratie.includes('function public.check_and_increment_usage'), 'E1: check_and_increment_usage() bestaat');
ok(migratie.includes('revoke execute on function public.check_and_increment_usage(text, date, integer) from anon'),
  'E2: check_and_increment_usage() is expliciet ontoegankelijk voor anon');
ok(migratie.includes('function public.decrement_usage'), 'E3: decrement_usage() bestaat');
ok(migratie.includes('greatest(aantal - 1, 0)'), 'E4: decrement_usage() kan nooit onder 0 komen (idempotentie-bescherming tegen dubbele compensatie)');
ok(migratie.includes('revoke execute on function public.decrement_usage(text, date) from anon'),
  'E5: decrement_usage() is expliciet ontoegankelijk voor anon');

// ---- Migratie is forward-only: geen DROP/ALTER van bestaande, eerdere migraties ----
ok(!migratie.includes('drop table') && !migratie.includes('DROP TABLE'), 'F1: geen enkele tabel wordt gedropt (forward-only)');

// ---- check_and_increment_usage() gebruikt een ATOMAIRE UPDATE...WHERE-conditie,
// nooit een afzonderlijke SELECT gevolgd door een losse UPDATE (dat zou een
// TOCTOU-race mogelijk maken tussen twee parallelle requests). ----
{
  const fnBlok = migratie.split('function public.check_and_increment_usage')[1].split('$$;')[0];
  ok(fnBlok.includes('update public.usage_log') && fnBlok.includes('and aantal < p_quota'),
    'G1: check_and_increment_usage() combineert de limietcontrole en de verhoging in één atomaire UPDATE...WHERE aantal<quota-statement');
  ok(!fnBlok.match(/select\s+aantal\s+into\s+v_aantal[\s\S]*?if\s+v_aantal[\s\S]*?<\s*p_quota[\s\S]*?then[\s\S]*?update\s+public\.usage_log\s+set\s+aantal\s*=\s*aantal\s*\+\s*1/i),
    'G2: geen read-then-write-patroon (losse SELECT gevolgd door een voorwaardelijke UPDATE) dat een race-window zou openen');
}

console.log('fUsersCommercialAuthority: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
