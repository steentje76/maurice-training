/* fOrganizationContextRuntime.test.js — MS-F11-05 regressietest. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

function buildSandbox(overrides) {
  var store = {};
  var domEls = {};
  var sandbox = {
    document: {
      getElementById: function (id) { return domEls[id] || null; }
    },
    sessionStorage: {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem: function (k, v) { store[k] = v; },
      removeItem: function (k) { delete store[k]; }
    },
    authSession: null,
    sbGet: async function () { return []; },
    sbRpc: async function () { return []; },
    sbPatch: async function () { return true; },
    sbFetch: async function () { return { ok: true }; },
    SB_URL: 'https://example.supabase.co',
    console: console
  };
  Object.assign(sandbox, overrides || {});
  sandbox.window = sandbox;
  sandbox._domEls = domEls;
  return sandbox;
}

function loadModuleInSandbox(sandbox) {
  var code = fs.readFileSync(path.join(ROOT, 'core/organizationContextRuntime.js'), 'utf8');
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  return sandbox;
}

{
  var sb = loadModuleInSandbox(buildSandbox());
  var resolve = sb.OrganizationContextRuntime.resolveActiveOrganizationId;

  ok(resolve('U1', []) === null, 'A1: 0 memberships geeft null');
  ok(resolve('U1', [{ organization_id: 'O1' }]) === 'O1', 'A2: exact 1 membership wordt automatisch actief');

  var sbMulti = loadModuleInSandbox(buildSandbox());
  ok(sbMulti.OrganizationContextRuntime.resolveActiveOrganizationId('U1', [{ organization_id: 'O1' }, { organization_id: 'O2' }]) === null,
    'A3: meerdere memberships zonder geldige voorkeur geeft null');
}
{
  var sbPref = loadModuleInSandbox(buildSandbox());
  sbPref.sessionStorage.setItem('tk_active_org_pref_v1', 'O2');
  ok(sbPref.OrganizationContextRuntime.resolveActiveOrganizationId('U1', [{ organization_id: 'O1' }, { organization_id: 'O2' }]) === 'O2',
    'A4: een geldige, opgeslagen voorkeur wordt gebruikt');
}
{
  var sbStale = loadModuleInSandbox(buildSandbox());
  sbStale.sessionStorage.setItem('tk_active_org_pref_v1', 'O9');
  ok(sbStale.OrganizationContextRuntime.resolveActiveOrganizationId('U1', [{ organization_id: 'O1' }, { organization_id: 'O2' }]) === null,
    'A5: een verouderde/ongeldige voorkeur wordt genegeerd');
}

{
  var sb = loadModuleInSandbox(buildSandbox());
  sb.OrgRuntimeState.activeOrganizationId = 'O1';
  sb.OrgRuntimeState.memberships = [{ organization_id: 'O1' }];
  sb.sessionStorage.setItem('tk_active_org_pref_v1', 'O1');
  sb.OrganizationContextRuntime.resetOrgContext();
  ok(sb.OrgRuntimeState.activeOrganizationId === null, 'B1: resetOrgContext wist activeOrganizationId');
  ok(sb.OrgRuntimeState.memberships.length === 0, 'B2: resetOrgContext wist memberships');
  ok(sb.sessionStorage.getItem('tk_active_org_pref_v1') === null, 'B3: resetOrgContext wist de sessionStorage-hint');
}

{
  var poweredByEl = { textContent: '', style: {} };
  var sandbox = buildSandbox();
  sandbox._domEls['tenant-powered-by'] = poweredByEl;
  var sb = loadModuleInSandbox(sandbox);
  sb.OrganizationContextRuntime.applyBrandContext({ display_name: 'Gym X', primary_color: '#111111', accent_color: '#222222' });
  ok(poweredByEl.textContent === 'Powered by Trainingskompas', 'C1: applyBrandContext zet altijd de zichtbare co-branding-tekst');
  ok(poweredByEl.style.display === '', 'C2: het co-branding-element wordt zichtbaar gemaakt');
}

{
  var rootStyleCalls = [];
  var sandbox = buildSandbox();
  sandbox.document.documentElement = { style: { setProperty: function (k) { rootStyleCalls.push(k); } } };
  var sb = loadModuleInSandbox(sandbox);
  sb.OrganizationContextRuntime.applyBrandContext({ primary_color: '#111111', accent_color: '#222222' });
  ok(rootStyleCalls.length === 0, 'D1: applyBrandContext wijzigt nooit :root/documentElement-CSS-properties');
}

{
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  ok(html.includes('core/organizationCore.js') && html.includes('core/brandingCore.js') && html.includes('core/organizationContextRuntime.js'),
    'E1: alle drie F11-branding-modules zijn als <script src> ingeladen');
  ok(html.includes('OrganizationContextRuntime.initOrganizationContext()'),
    'E2: initOrganizationContext() wordt daadwerkelijk aangeroepen vanuit de app-runtime');
  ok(html.includes('OrganizationContextRuntime.resetOrgContext()'),
    'E3: resetOrgContext() wordt daadwerkelijk aangeroepen vanuit de logout-flow');
  ok(html.includes('id="tenant-brand-name"') && html.includes('id="tenant-brand-logo"') && html.includes('id="tenant-powered-by"'),
    'E4: de vereiste DOM-elementen bestaan daadwerkelijk in index.html');
  ok(html.includes('id="tenant-brand-admin-btn"'),
    'E5: de minimale admin-beheerknop bestaat daadwerkelijk in index.html');
}

{
  var OC = require(path.join(ROOT, 'core/organizationCore.js'));
  var sandbox = buildSandbox({ OrganizationCore: OC });
  var adminBtn = { style: {} };
  sandbox._domEls['tenant-brand-admin-btn'] = adminBtn;
  sandbox.authSession = { user: { id: 'U1' } };
  var sb = loadModuleInSandbox(sandbox);
  sb.OrgRuntimeState.activeOrganizationId = 'O1';
  sb.OrgRuntimeState.memberships = [{ user_id: 'U1', organization_id: 'O1', role: 'member', status: 'active' }];
  sb.OrgRuntimeState.organizations = [{ id: 'O1', owner_user_id: 'U9' }];
  sb.OrganizationContextRuntime.applyBrandContext({});
  ok(adminBtn.style.display === 'none', 'F1: een gewoon lid ziet de beheerknop niet');

  sb.OrgRuntimeState.memberships = [{ user_id: 'U1', organization_id: 'O1', role: 'admin', status: 'active' }];
  sb.OrganizationContextRuntime.applyBrandContext({});
  ok(adminBtn.style.display === '', 'F2: een admin ziet de beheerknop wel');
}

console.log('fOrganizationContextRuntime: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
