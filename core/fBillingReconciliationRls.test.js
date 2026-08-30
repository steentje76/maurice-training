/* fBillingReconciliationRls.test.js — MS-F12-04 regressietest. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const migratie = fs.readFileSync(path.join(ROOT, 'migratie_v524.sql'), 'utf8');

ok(!migratie.match(/create policy \w+ on public\.billing_events/i),
  'A1: geen enkele RLS-policy wordt aangemaakt op billing_events (volledige default-deny)');
ok(migratie.includes('alter table public.billing_events enable row level security'),
  'A2: RLS is expliciet ingeschakeld op billing_events');

ok(migratie.includes('provider text not null'),
  'B1: de provider-kolom is een vrije tekstwaarde, geen enum die aan Mollie gebonden is');

{
  const fnBlok = migratie.split('function public.reconcile_billing_event')[1].split('$$;')[0];
  ok(fnBlok.includes('p_provider') && fnBlok.includes('p_new_canonical_state'),
    'C1: de RPC accepteert provider en de reeds-gemapte canonical state als parameters');
  ok(!fnBlok.toLowerCase().includes('mollie'),
    'C2: de RPC-functiebody bevat geen enkele Mollie-specifieke logica (hoort uitsluitend in de adapter-laag)');
}

ok(migratie.includes('unique (provider, idempotency_key)'),
  'D1: een database-constraint dwingt idempotentie af op (provider, idempotency_key)');
{
  const fnBlok = migratie.split('function public.reconcile_billing_event')[1].split('$$;')[0];
  ok(fnBlok.includes('select * into v_bestaand_event') && fnBlok.includes('if v_bestaand_event is not null then'),
    'D2: de RPC controleert expliciet op een reeds bestaand event vóór enige mutatie');
  ok(fnBlok.includes('p_occurred_at < v_laatste_occurred_at'),
    'D3: de RPC bevat een expliciete out-of-order-conditie');
}

ok(migratie.includes('revoke execute on function public.reconcile_billing_event(text, text, text, text, text, text, timestamptz, text, timestamptz) from anon'),
  'E1: reconcile_billing_event() heeft geen EXECUTE-recht voor anon');
ok(migratie.includes('revoke execute on function public.reconcile_billing_event(text, text, text, text, text, text, timestamptz, text, timestamptz) from authenticated'),
  'E2: reconcile_billing_event() heeft geen EXECUTE-recht voor authenticated');
ok(migratie.includes('grant execute on function public.reconcile_billing_event(text, text, text, text, text, text, timestamptz, text, timestamptz) to service_role'),
  'E3: reconcile_billing_event() heeft wel expliciet EXECUTE voor service_role');

console.log('fBillingReconciliationRls: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
