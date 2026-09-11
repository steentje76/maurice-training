/* fTeamAccessRoleGateHotfix.test.js — HOTFIX na PR #323
 *
 * AANLEIDING. checkTeamAccess() verwees naar het verwijderde element
 * profiel-team-card (vervangen door #pf-org-team-row in de canonical IA).
 * Daardoor werd whoami nooit meer uitgevoerd: teamRoleLevel bleef permanent op
 * de init-waarde -1 staan, ononderscheidbaar van een BEVESTIGDE solo-status,
 * en "Organisatie & team" was onvoorwaardelijk zichtbaar voor iedereen.
 *
 * Deze suite draait de echte client-code uit index.html (checkTeamAccess,
 * canEditEquipmentCatalog, canCreatePersonalExercise, openBeheer) in een
 * zandbak met een nagebouwde DOM/fetch, en legt vast:
 *   1. UNRESOLVED (vóór whoami / whoami mislukt) geeft NOOIT editrechten en
 *      NOOIT een bevestigde solo-status — fail closed.
 *   2. RESOLVED + solo/member/coach/manager/owner geven exact de bedoelde
 *      capabilities.
 *   3. #pf-org-team-row volgt de echte, opgehaalde rol (coach+), niet de
 *      afwezigheid van teamcontext.
 *   4. openBeheer() blijft consistent met dezelfde RESOLVED/UNRESOLVED-regel.
 *
 * Draai: node core/fTeamAccessRoleGateHotfix.test.js
 */
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
var pass = 0, fail = 0;
function ok(c, m) { if (c) { pass++; } else { fail++; console.log('  \u2717 ' + m); } }

function sliceTussen(startMarker, eindMarker, vanaf) {
  var s = HTML.indexOf(startMarker, vanaf || 0);
  assert.ok(s >= 0, 'startmarker niet gevonden: ' + startMarker);
  var e = HTML.indexOf(eindMarker, s + startMarker.length);
  assert.ok(e > s, 'eindmarker niet gevonden: ' + eindMarker);
  return HTML.slice(s, e);
}

// Exacte blokken uit de uitgeleverde code — geen herschreven kopie.
var blokAuthHeaders = sliceTussen('function wearableAuthHeaders(){', 'async function fetchWearableStatus(){');
var blokTeamState = sliceTussen("let teamRoleLevel=-1, teamPin='';", 'function openTeamPinModal(){');
var blokOpenBeheer = sliceTussen('function openBeheer(){', 'SPRINT 1');
var mCanEdit = HTML.match(/function canEditEquipmentCatalog\(\)\{[^\n\r]*\}/);
var mCanCreate = HTML.match(/function canCreatePersonalExercise\(\)\{[^\n\r]*\}/);
assert.ok(mCanEdit, 'canEditEquipmentCatalog() niet gevonden');
assert.ok(mCanCreate, 'canCreatePersonalExercise() niet gevonden');

var bron = [blokAuthHeaders, blokTeamState, blokOpenBeheer, mCanEdit[0], mCanCreate[0]]
  .join('\n')
  .replace(/^let /gm, 'var ')
  .replace(/^const /gm, 'var ');

ok(bron.indexOf("getElementById('profiel-team-card')") === -1, 'checkTeamAccess() doet geen DOM-lookup meer op het verwijderde profiel-team-card (alleen nog genoemd in een verklarende comment)');
ok(bron.indexOf('pf-org-team-row') !== -1, 'checkTeamAccess() verwijst naar het canonical element #pf-org-team-row');

/* ── Nagebouwde DOM / fetch-zandbak ──────────────────────────────────────── */
function nepRow() { return { id: 'pf-org-team-row', _display: 'none', set display(v) { this._display = v; }, get display() { return this._display; }, style: undefined }; }

function zandbak(opts) {
  opts = opts || {};
  var row = nepRow();
  row.style = row; // .style.display === .display, zoals in de echte DOM-node
  var doc = {
    getElementById: function (id) { return id === 'pf-org-team-row' ? row : null; }
  };
  var toasts = [];
  var gos = [];
  var ctx = {
    console: console,
    document: doc,
    authSession: opts.loggedIn === false ? null : { access_token: 'tok-123' },
    fetch: opts.fetchImpl || function () { return Promise.reject(new Error('geen fetchImpl in test-opzet')); },
    toast: function (m) { toasts.push(m); },
    go: function (id) { gos.push(id); }
  };
  vm.createContext(ctx);
  new vm.Script(bron, { filename: 'team-access-hotfix-bron.js' }).runInContext(ctx);
  return { ctx: ctx, row: row, toasts: toasts, gos: gos };
}

function fetchOk(gymRoleLevel) {
  return function () {
    return Promise.resolve({ ok: true, json: function () { return Promise.resolve({ gymRoleLevel: gymRoleLevel }); } });
  };
}
function fetchHttpFout() {
  return function () { return Promise.resolve({ ok: false, status: 500, json: function () { return Promise.resolve({}); } }); };
}
function fetchNetwerkfout() {
  return function () { return Promise.reject(new Error('network down')); };
}

async function run() {

  // ── 1. Initial state vóór whoami ──────────────────────────────────────
  {
    var z = zandbak();
    ok(z.ctx.teamAccessResolved === false, '1. initial: teamAccessResolved=false vóór whoami');
    ok(z.ctx.teamRoleLevel === -1, '1. initial: teamRoleLevel start op -1 (init-waarde, nog geen betekenis)');
    ok(z.ctx.canEditEquipmentCatalog() === false, '1. initial: canEditEquipmentCatalog() geeft GEEN editrechten vóór whoami');
    ok(z.ctx.canCreatePersonalExercise() === false, '1. initial: canCreatePersonalExercise() geeft GEEN rechten vóór whoami');
    ok(z.row.display === 'none', '1. initial: #pf-org-team-row blijft verborgen vóór whoami');
  }

  // ── 2. Confirmed solo (whoami slaagt, gymRoleLevel null/undefined) ────
  {
    var z = zandbak({ fetchImpl: fetchOk(null) });
    await z.ctx.checkTeamAccess();
    ok(z.ctx.teamAccessResolved === true, '2. solo: teamAccessResolved=true na geslaagde whoami');
    ok(z.ctx.teamRoleLevel === -1, '2. solo: teamRoleLevel=-1 (bevestigd, whoami zegt geen gym)');
    ok(z.ctx.canEditEquipmentCatalog() === true, '2. solo: canEditEquipmentCatalog() true (losse atleet beheert eigen lijst)');
    ok(z.ctx.canCreatePersonalExercise() === true, '2. solo: canCreatePersonalExercise() true');
    ok(z.row.display === 'none', '2. solo: #pf-org-team-row blijft verborgen (geen team-context)');
  }

  // ── 3. Member (rol 0) ───────────────────────────────────────────────────
  {
    var z = zandbak({ fetchImpl: fetchOk(0) });
    await z.ctx.checkTeamAccess();
    ok(z.ctx.teamAccessResolved === true, '3. member: teamAccessResolved=true');
    ok(z.ctx.teamRoleLevel === 0, '3. member: teamRoleLevel=0');
    ok(z.ctx.canEditEquipmentCatalog() === false, '3. member: canEditEquipmentCatalog() false (gewoon lid mag niet)');
    ok(z.ctx.canCreatePersonalExercise() === false, '3. member: canCreatePersonalExercise() false (kiest uit catalogus)');
    ok(z.row.display === 'none', '3. member: #pf-org-team-row verborgen onder coach-drempel');
  }

  // ── 4. Coach (rol 1) ─────────────────────────────────────────────────────
  {
    var z = zandbak({ fetchImpl: fetchOk(1) });
    await z.ctx.checkTeamAccess();
    ok(z.ctx.teamRoleLevel === 1, '4. coach: teamRoleLevel=1');
    ok(z.ctx.canEditEquipmentCatalog() === false, '4. coach: canEditEquipmentCatalog() false (alleen owner/solo)');
    ok(z.ctx.canCreatePersonalExercise() === true, '4. coach: canCreatePersonalExercise() true');
    ok(z.row.display === '', '4. coach: #pf-org-team-row zichtbaar (coach+)');
  }

  // ── 5. Manager (rol 2) ───────────────────────────────────────────────────
  {
    var z = zandbak({ fetchImpl: fetchOk(2) });
    await z.ctx.checkTeamAccess();
    ok(z.ctx.teamRoleLevel === 2, '5. manager: teamRoleLevel=2');
    ok(z.ctx.canEditEquipmentCatalog() === false, '5. manager: canEditEquipmentCatalog() false');
    ok(z.ctx.canCreatePersonalExercise() === true, '5. manager: canCreatePersonalExercise() true');
    ok(z.row.display === '', '5. manager: #pf-org-team-row zichtbaar');
  }

  // ── 6. Owner/admin (rol >=3) ─────────────────────────────────────────────
  {
    var z = zandbak({ fetchImpl: fetchOk(3) });
    await z.ctx.checkTeamAccess();
    ok(z.ctx.teamRoleLevel === 3, '6. owner: teamRoleLevel=3');
    ok(z.ctx.canEditEquipmentCatalog() === true, '6. owner: canEditEquipmentCatalog() true');
    ok(z.ctx.canCreatePersonalExercise() === true, '6. owner: canCreatePersonalExercise() true');
    ok(z.row.display === '', '6. owner: #pf-org-team-row zichtbaar');
  }

  // ── 7. whoami failure (HTTP-fout en netwerkfout) — NOOIT als solo ───────
  {
    var z = zandbak({ fetchImpl: fetchHttpFout() });
    await z.ctx.checkTeamAccess();
    ok(z.ctx.teamAccessResolved === false, '7a. HTTP-fout: teamAccessResolved blijft false');
    ok(z.ctx.teamRoleLevel === -1, '7a. HTTP-fout: teamRoleLevel blijft op init-waarde (niet aangeraakt)');
    ok(z.ctx.canEditEquipmentCatalog() === false, '7a. HTTP-fout: GEEN editrechten via de -1 (fail closed, niet behandeld als solo)');
    ok(z.ctx.canCreatePersonalExercise() === false, '7a. HTTP-fout: GEEN rechten via de -1');
    ok(z.row.display === 'none', '7a. HTTP-fout: #pf-org-team-row blijft verborgen, niet onterecht getoond of verondersteld');
  }
  {
    var z = zandbak({ fetchImpl: fetchNetwerkfout() });
    await z.ctx.checkTeamAccess();
    ok(z.ctx.teamAccessResolved === false, '7b. netwerkfout: teamAccessResolved blijft false');
    ok(z.ctx.canEditEquipmentCatalog() === false, '7b. netwerkfout: GEEN editrechten (fail closed)');
    ok(z.row.display === 'none', '7b. netwerkfout: #pf-org-team-row blijft verborgen');
  }
  {
    // geen sessie (uitgelogd) -- checkTeamAccess() mag whoami niet eens proberen
    var pogingen = 0;
    var z = zandbak({ loggedIn: false, fetchImpl: function () { pogingen++; return fetchOk(null)(); } });
    await z.ctx.checkTeamAccess();
    ok(pogingen === 0, '7c. geen sessie: whoami wordt niet aangeroepen zonder auth-token');
    ok(z.ctx.teamAccessResolved === false, '7c. geen sessie: blijft UNRESOLVED');
    ok(z.ctx.canEditEquipmentCatalog() === false, '7c. geen sessie: GEEN editrechten');
  }

  // ── 8. Organisatie & team-zichtbaarheid: samengevat over alle rollen ────
  ok(true, '8. zie scenario 1-7 hierboven: solo/UNRESOLVED verborgen, coach+ zichtbaar, member verborgen -- expliciet per scenario gedekt');

  // ── 9 & 10. canEditEquipmentCatalog() / canCreatePersonalExercise() ─────
  // Expliciete boundary-check los van checkTeamAccess(), voor het geval de
  // vlaggen op een andere manier gezet worden (bv. toekomstige refactor).
  {
    var z = zandbak();
    z.ctx.teamAccessResolved = true; z.ctx.teamRoleLevel = -1;
    ok(z.ctx.canEditEquipmentCatalog() === true && z.ctx.canCreatePersonalExercise() === true, '9/10. RESOLVED + solo (-1): beide capabilities true');
    z.ctx.teamRoleLevel = 0;
    ok(z.ctx.canEditEquipmentCatalog() === false && z.ctx.canCreatePersonalExercise() === false, '9/10. RESOLVED + member (0): beide false');
    z.ctx.teamRoleLevel = 3;
    ok(z.ctx.canEditEquipmentCatalog() === true && z.ctx.canCreatePersonalExercise() === true, '9/10. RESOLVED + owner (3): beide true');
    z.ctx.teamAccessResolved = false; z.ctx.teamRoleLevel = -1;
    ok(z.ctx.canEditEquipmentCatalog() === false && z.ctx.canCreatePersonalExercise() === false, '9/10. UNRESOLVED, ook al staat teamRoleLevel toevallig op -1: beide false (fail closed)');
  }

  // ── 11. openBeheer() blijft consistent met dezelfde semantiek ───────────
  {
    var z = zandbak(); // UNRESOLVED
    z.ctx.openBeheer();
    ok(z.gos[0] === 's-admin-pin', '11a. UNRESOLVED: openBeheer() valt terug op PIN-scherm (rol nog onbekend), niet direct s-admin');
  }
  {
    var z = zandbak({ fetchImpl: fetchOk(null) }); // resolved solo
    await z.ctx.checkTeamAccess();
    z.ctx.openBeheer();
    ok(z.gos[0] === 's-admin', '11b. RESOLVED solo: openBeheer() gaat direct naar s-admin');
  }
  {
    var z = zandbak({ fetchImpl: fetchOk(1) }); // resolved coach
    await z.ctx.checkTeamAccess();
    z.ctx.openBeheer();
    ok(z.gos.length === 0 && z.toasts.length === 1, '11c. RESOLVED coach (geen owner): openBeheer() weigert met toast, geen navigatie');
  }
  {
    var z = zandbak({ fetchImpl: fetchOk(3) }); // resolved owner
    await z.ctx.checkTeamAccess();
    z.ctx.openBeheer();
    ok(z.gos[0] === 's-admin', '11d. RESOLVED owner: openBeheer() gaat direct naar s-admin');
  }

  console.log('RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail ? 1 : 0);
}

run();
