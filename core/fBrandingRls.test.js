/* fBrandingRls.test.js — MS-F11-05 regressietest. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const migratie = fs.readFileSync(path.join(ROOT, 'migratie_v520.sql'), 'utf8');

ok(!/using\s*\(\s*true\s*\)/i.test(migratie) && !/with check\s*\(\s*true\s*\)/i.test(migratie),
  'A1: geen enkele policy gebruikt een blanco USING(true)/WITH CHECK(true)-bypass');

{
  const updateBlok = migratie.split('create policy gyms_update_org_admin')[1].split(';')[0];
  ok(/array\['owner','admin'\]/.test(updateBlok) && !/staff/.test(updateBlok) && !/'member'/.test(updateBlok),
    'B1: de update-policy staat uitsluitend owner/admin toe, expliciet geen staff/member');
}

{
  const selectBlok = migratie.split('create policy gyms_select_org_member')[1].split(';')[0];
  ok(/'owner','admin','staff','member'/.test(selectBlok), 'C1: leestoegang geldt voor elk actief lid, ongeacht rol');
}

ok(migratie.includes("check (primary_color is null or primary_color ~ '^#[0-9A-Fa-f]{6}$')"),
  'D1: primary_color wordt met een echte HEX-regex-conditie afgedwongen');
ok(migratie.includes("check (accent_color is null or accent_color ~ '^#[0-9A-Fa-f]{6}$')"),
  'D2: accent_color wordt met een echte HEX-regex-conditie afgedwongen');
ok(migratie.includes("check (logo_url is null or logo_url ~ '^https://')"),
  'D3: logo_url wordt met een echte https-only-regex-conditie afgedwongen');

{
  const fnBlok = migratie.split('function public.prevent_gyms_organization_id_change()')[1].split('$$;')[0];
  ok(fnBlok.includes('if NEW.organization_id is distinct from OLD.organization_id then'),
    'E1: de immutabiliteit wordt afgedwongen door een echte conditie op de trigger-body');
}

ok(migratie.includes('gyms_owner_context_chk') && migratie.includes('organization_id is not null and owner_email is null'),
  'F1: een gyms-rij hoort mutueel exclusief bij Model A of Model B');

{
  const fnBlok = migratie.split('function public.set_gyms_updated_meta()')[1].split('$$;')[0];
  ok(fnBlok.includes('NEW.updated_by := auth.uid()') && fnBlok.includes('NEW.updated_at := now()'),
    'G1: updated_at/updated_by worden server-side geforceerd, niet client-input');
}

console.log('fBrandingRls: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
