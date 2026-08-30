/* fBrandingCore.test.js — MS-F11-05 regressietest. */
'use strict';
const path = require('path');
const ROOT = path.join(__dirname, '..');
const BC = require(path.join(ROOT, 'core/brandingCore.js'));

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const orgs = [{ id: 'O1', owner_user_id: 'U1' }, { id: 'O2', owner_user_id: 'U9' }];
const mems = [
  { user_id: 'U2', organization_id: 'O1', role: 'member', status: 'active' },
  { user_id: 'U3', organization_id: 'O1', role: 'member', status: 'removed' }
];
const gymsA = [{ organization_id: 'O1', branding_enabled: true, display_name: 'Gym A', logo_url: 'https://example.com/a.png', primary_color: '#123456', accent_color: '#abcdef' }];
const gymsB = [{ organization_id: 'O2', branding_enabled: true, display_name: 'Gym B', primary_color: '#654321' }];

ok(BC.resolveBrandContext(null).source === 'trainingskompas_default', 'A1: null-session geeft veilig de TK-default');
ok(BC.resolveBrandContext({ authenticated: false }).source === 'trainingskompas_default', 'A2: niet-geauthenticeerd geeft de TK-default');
ok(BC.resolveBrandContext({ authenticated: true, userId: 'U2' }).source === 'trainingskompas_default', 'A3: geen actieve organisatie geeft de TK-default');

ok(BC.resolveBrandContext({ authenticated: true, userId: 'U2', activeOrganizationId: 'O1', memberships: mems, organizations: orgs, gymsBranding: gymsA }).source === 'organization',
  'B1: een daadwerkelijk lid van O1 krijgt de branding van O1');
ok(BC.resolveBrandContext({ authenticated: true, userId: 'U9', activeOrganizationId: 'O1', memberships: mems, organizations: orgs, gymsBranding: gymsA }).source === 'trainingskompas_default',
  'B2: een willekeurige, niet-gerelateerde gebruiker krijgt nooit organization-branding');
ok(BC.resolveBrandContext({ authenticated: true, userId: 'U3', activeOrganizationId: 'O1', memberships: mems, organizations: orgs, gymsBranding: gymsA }).source === 'trainingskompas_default',
  'B3: een removed member krijgt geen branding meer');

{
  const result = BC.resolveBrandContext({ authenticated: true, userId: 'U2', activeOrganizationId: 'O1', memberships: mems, organizations: orgs, gymsBranding: gymsB });
  ok(result.source === 'trainingskompas_default', 'C1: O1-lid krijgt nooit O2-branding, ook niet als O2-data aanwezig is in de payload');
}
{
  const result = BC.resolveBrandContext({ authenticated: true, userId: 'U2', activeOrganizationId: 'O1', memberships: mems, organizations: orgs, gymsBranding: gymsA.concat(gymsB) });
  ok(result.display_name === 'Gym A', 'C2: bij meerdere branding-rijen wordt uitsluitend die van de actieve organisatie gekozen');
}

ok(BC.resolveBrandContext({ authenticated: true, userId: 'U2', activeOrganizationId: 'O1', memberships: mems, organizations: orgs, gymsBranding: [{ organization_id: 'O1', branding_enabled: false, primary_color: '#123456' }] }).source === 'trainingskompas_default',
  'D1: branding_enabled=false geeft de TK-default, ongeacht overige velden');

ok(BC.resolveBrandContext({ authenticated: true, userId: 'U2', activeOrganizationId: 'O1', memberships: mems, organizations: orgs, gymsBranding: gymsA }).powered_by_visible === true,
  'E1: powered_by_visible is altijd true bij actieve organization-branding');
ok(BC.TK_DEFAULT.powered_by_visible === true, 'E2: de TK-default zelf heeft powered_by_visible=true');

{
  const kwaad = [{ organization_id: 'O1', branding_enabled: true, primary_color: 'javascript:alert(1)', logo_url: 'data:text/html,<svg onload=alert(1)>' }];
  const result = BC.resolveBrandContext({ authenticated: true, userId: 'U2', activeOrganizationId: 'O1', memberships: mems, organizations: orgs, gymsBranding: kwaad });
  ok(result.primary_color === BC.TK_DEFAULT.primary_color, 'F1: een ongeldige primary_color valt terug op de TK-default');
  ok(result.logo_url === null, 'F2: een niet-https logo_url wordt volledig genegeerd (null)');
}
ok(BC.validateBrandingRow({ primary_color: '#GGGGGG' }).primary_color === undefined, 'F3: validateBrandingRow wijst een ongeldige HEX-waarde direct af');
ok(BC.validateBrandingRow({ logo_url: 'javascript:alert(1)' }).logo_url === undefined, 'F4: validateBrandingRow wijst een niet-https logo_url direct af');
ok(BC.validateBrandingRow({ primary_color: '#123abc' }).primary_color === '#123abc', 'F5: een geldige HEX-waarde wordt correct doorgelaten');

console.log('fBrandingCore: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
