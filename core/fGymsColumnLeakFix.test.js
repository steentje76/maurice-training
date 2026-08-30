/* fGymsColumnLeakFix.test.js — F11 Final Audit regressietest. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const v521 = fs.readFileSync(path.join(ROOT, 'migratie_v521.sql'), 'utf8');

ok(v521.includes('drop policy if exists gyms_select_org_member on public.gyms'),
  'A1: de brede gyms_select_org_member-policy is expliciet verwijderd');

{
  const policyBlok = v521.split('create policy gyms_select_org_admin_only')[1].split(';')[0];
  ok(/array\['owner','admin'\]/.test(policyBlok) && !/staff/.test(policyBlok) && !/'member'/.test(policyBlok),
    'B1: directe SELECT-toegang is beperkt tot uitsluitend owner/admin');
}

{
  const fnBlok = v521.split('function public.get_organization_branding')[1].split('$$;')[0];
  var verbodenVelden = ['coach_pin_hash', 'plan_key', 'mollie_customer_id', 'owner_email'];
  verbodenVelden.forEach(function (veld) {
    ok(!fnBlok.includes(veld), 'C: get_organization_branding() selecteert nergens het gevoelige veld "' + veld + '"');
  });
  ok(fnBlok.includes('g.name') && fnBlok.includes('g.short_name') && fnBlok.includes('g.logo_url') &&
     fnBlok.includes('g.primary_color') && fnBlok.includes('g.accent_color') && fnBlok.includes('g.branding_enabled'),
    'C: get_organization_branding() bevat alle toegestane, veilige velden');
}

{
  const fnBlok = v521.split('function public.get_organization_branding')[1].split('$$;')[0];
  ok(fnBlok.includes("org_has_role(p_organization_id, array['owner','admin','staff','member'])"),
    'D1: de RPC voert een eigen, expliciete autorisatiecheck uit voor alle actieve rollen');
}
ok(v521.includes('language sql\nsecurity definer'), 'D2: get_organization_branding() is expliciet SECURITY DEFINER');

ok(v521.includes('revoke execute on function public.get_organization_branding(text) from anon'),
  'E1: get_organization_branding() heeft geen EXECUTE-recht voor anon');

ok(v521.toLowerCase().includes('bleek onjuist') && v521.toLowerCase().includes('security_invoker'),
  'F1: de eerdere, onjuiste tussenstap wordt eerlijk gedocumenteerd als fout, niet verzwegen');

console.log('fGymsColumnLeakFix: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
