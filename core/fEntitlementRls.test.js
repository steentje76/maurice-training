/* fEntitlementRls.test.js — MS-F12-01 regressietest. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const migratie = fs.readFileSync(path.join(ROOT, 'migratie_v522.sql'), 'utf8');

ok(migratie.includes('drop policy if exists credit_purchases_own_data on public.user_credit_purchases'),
  'A1: de kritieke, brede FOR ALL-policy op user_credit_purchases is expliciet verwijderd');
ok(migratie.includes('drop policy if exists usage_log_own_data on public.usage_log'),
  'A2: de kritieke, brede FOR ALL-policy op usage_log is expliciet verwijderd');

ok(!migratie.match(/for all\s+using[^;]*;/i),
  'A3: geen enkele nieuwe policy in deze migratie gebruikt FOR ALL zonder expliciete WITH CHECK');

{
  const fnBlok = migratie.split('function public.consume_credit')[1].split('$$;')[0];
  ok(fnBlok.includes('if p_aantal <= 0 then') && fnBlok.includes('raise exception'),
    'B1: consume_credit() weigert negatieve/nul input expliciet');
  ok(fnBlok.includes('and user_id = auth.uid()'),
    'B2: consume_credit() is scoped op auth.uid() -- geen cross-user-consumptie mogelijk');
  ok(fnBlok.includes('and credits_resterend >= p_aantal'),
    'B3: consume_credit() gebruikt een atomaire WHERE-conditie die overconsumptie en race-conditions voorkomt');
}

{
  const fnBlok = migratie.split('function public.increment_usage')[1].split('$$;')[0];
  ok(fnBlok.includes('on conflict (user_id, feature_key, periode)') && fnBlok.includes('do update set aantal = usage_log.aantal + excluded.aantal'),
    'C1: increment_usage() gebruikt een atomaire upsert-increment (geen read-then-write race-conditie)');
}

{
  const fnBlok = migratie.split('function public.grant_credit_purchase')[1].split('$$;')[0];
  ok(fnBlok.includes('select feature_key, aantal_credits into v_pack from public.credit_packs'),
    'D1: grant_credit_purchase() leidt credits_resterend af uit credit_packs, nooit uit client-input');
  ok(fnBlok.includes('select id into v_id from public.user_credit_purchases where mollie_payment_id'),
    'D2: grant_credit_purchase() controleert op idempotentie via mollie_payment_id vóór het aanmaken van een nieuwe rij');
}
ok(migratie.includes('revoke execute on function public.grant_credit_purchase(uuid, text, text) from authenticated'),
  'D3: grant_credit_purchase() is expliciet ontoegankelijk voor authenticated -- uitsluitend service_role');
ok(migratie.includes('grant execute on function public.grant_credit_purchase(uuid, text, text) to service_role'),
  'D4: grant_credit_purchase() heeft expliciet wel EXECUTE voor service_role');

ok(migratie.includes('unique (mollie_payment_id)'),
  'E1: een unieke database-constraint op mollie_payment_id dwingt idempotentie ook op schemaniveau af');

['plans_select_all', 'features_select_all', 'plan_features_select_all', 'plan_feature_quota_select_all', 'credit_packs_select_all'].forEach(function (naam) {
  ok(migratie.includes('create policy ' + naam), 'F: read-only policy "' + naam + '" bestaat voor het plan/feature-catalogusmodel');
});
ok(!migratie.match(/create policy (plans|features|plan_features|plan_feature_quota|credit_packs)_(insert|update|delete)/i),
  'F: geen enkele INSERT/UPDATE/DELETE-policy voor het catalogusmodel -- mutatie blijft uitsluitend service-role');

console.log('fEntitlementRls: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
