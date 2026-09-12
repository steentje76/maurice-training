/* routeMap.test.js — validator voor docs/architecture/TRAININGSKOMPAS_ROUTE_MAP.json.
 * Puur een documentatie-validator: geen applicatielogica, geen navigatiegedrag.
 * Controleert alleen structurele integriteit van de canonical Route Map, zodat
 * een toekomstige PR die het JSON-bestand aanpast niet stilzwijgend een kapotte
 * of inconsistente Route Map kan mergen.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const ROUTE_MAP_PATH = path.join(ROOT, 'docs/architecture/TRAININGSKOMPAS_ROUTE_MAP.json');

// ---- 1. JSON moet bestaan en parsebaar zijn ----
let raw = null, data = null, parseError = null;
try { raw = fs.readFileSync(ROUTE_MAP_PATH, 'utf8'); } catch (e) { parseError = e; }
ok(raw != null, 'ROUTE_MAP.json bestaat op het verwachte pad');
if (raw != null) {
  try { data = JSON.parse(raw); } catch (e) { parseError = e; }
}
ok(data != null, 'ROUTE_MAP.json is geldig, parsebaar JSON' + (parseError ? (' (' + parseError.message + ')') : ''));

if (data) {
  const NAV_STATUS_ENUM = ['GREEN', 'AMBER', 'RED', 'UNKNOWN'];
  const ACTIVE_STATUS_PREFIXES = ['ACTIVE', 'CONDITIONAL', 'DEAD', 'NON-EXISTENT']; // sommige velden bevatten toelichting achter de status
  const SEVERITY_ENUM = ['P0', 'P1', 'P2', 'P3', 'P4', null, undefined];

  // ---- 2. metadata ----
  ok(data.metadata && typeof data.metadata === 'object', 'metadata-object aanwezig');
  ok(!!(data.metadata && data.metadata.last_verified_sha), 'metadata bevat last_verified_sha');
  ok(!!(data.metadata && /^[0-9a-f]{7,40}$/i.test(data.metadata.last_verified_sha || '')),
    'last_verified_sha ziet eruit als een geldige (deel-)commit-SHA');

  // ---- 3. bekende geauditeerde domeinen aanwezig ----
  const verwachteDomeinen = ['A', 'B', 'D', 'E', 'F', 'G'];
  const audited = (data.metadata && data.metadata.audited_domains) || [];
  verwachteDomeinen.forEach(function (dom) {
    ok(audited.indexOf(dom) !== -1, 'audited_domains bevat domein ' + dom);
  });

  // ---- 4. actions: array, unieke IDs, geldige enums ----
  ok(Array.isArray(data.actions), 'actions is een array');
  if (Array.isArray(data.actions)) {
    const ids = data.actions.map(function (a) { return a.action_id; });
    const uniekeIds = new Set(ids);
    ok(uniekeIds.size === ids.length, 'alle action_id-waarden zijn uniek (' + ids.length + ' acties, ' + uniekeIds.size + ' uniek)');

    let alleNavStatusGeldig = true, alleSeverityGeldig = true, alleHebbenEvidence = true;
    data.actions.forEach(function (act) {
      if (NAV_STATUS_ENUM.indexOf(act.nav_status) === -1) alleNavStatusGeldig = false;
      if (SEVERITY_ENUM.indexOf(act.severity) === -1) alleSeverityGeldig = false;
      if (!act.code_evidence) alleHebbenEvidence = false;
    });
    ok(alleNavStatusGeldig, 'elke action heeft een geldige nav_status (GREEN/AMBER/RED/UNKNOWN)');
    ok(alleSeverityGeldig, 'elke action heeft een geldige severity (P0-P4 of leeg)');
    ok(alleHebbenEvidence, 'elke action heeft een code_evidence-veld');

    // R-008: UNKNOWN mag nooit als GREEN geregistreerd staan — check dat geen enkele
    // action tegelijk een UNKNOWN-achtige evidence-noot heeft terwijl nav_status GREEN is.
    const verdachte = data.actions.filter(function (a) {
      return a.nav_status === 'GREEN' && /vermoedelijk|waarschijnlijk|UNKNOWN/i.test(a.code_evidence || '');
    });
    ok(verdachte.length === 0, 'R-008: geen enkele GREEN-actie draagt een "vermoedelijk/UNKNOWN"-aantekening in de evidence (' + verdachte.map(function (a) { return a.action_id; }).join(', ') + ')');

    // ---- totals moeten kloppen met de daadwerkelijke actions-array ----
    const counts = { GREEN: 0, AMBER: 0, RED: 0, UNKNOWN: 0 };
    data.actions.forEach(function (a) { if (counts.hasOwnProperty(a.nav_status)) counts[a.nav_status]++; });
    if (data.totals) {
      ok(data.totals.navigation_action_contracts === data.actions.length,
        'totals.navigation_action_contracts (' + data.totals.navigation_action_contracts + ') komt overeen met aantal actions (' + data.actions.length + ')');
      ok(data.totals.green === counts.GREEN, 'totals.green klopt (' + data.totals.green + ' vs geteld ' + counts.GREEN + ')');
      ok(data.totals.amber === counts.AMBER, 'totals.amber klopt (' + data.totals.amber + ' vs geteld ' + counts.AMBER + ')');
      ok(data.totals.red === counts.RED, 'totals.red klopt (' + data.totals.red + ' vs geteld ' + counts.RED + ')');
      ok(data.totals.unknown === counts.UNKNOWN, 'totals.unknown klopt (' + data.totals.unknown + ' vs geteld ' + counts.UNKNOWN + ')');
      ok(data.totals.green + data.totals.amber + data.totals.red + data.totals.unknown === data.totals.navigation_action_contracts,
        'GREEN + AMBER + RED + UNKNOWN = navigation_action_contracts (sluitende telling)');
    } else {
      fail++; msgs.push('MISLUKT: data.totals ontbreekt');
    }
  }

  // ---- 5. root_causes: array, unieke IDs, elke instance verwijst naar een bestaand action_id (waar van toepassing) ----
  ok(Array.isArray(data.root_causes), 'root_causes is een array');
  if (Array.isArray(data.root_causes) && Array.isArray(data.actions)) {
    const rcIds = data.root_causes.map(function (r) { return r.id; });
    ok(new Set(rcIds).size === rcIds.length, 'alle root-cause-IDs zijn uniek');

    const actionIdSet = new Set(data.actions.map(function (a) { return a.action_id; }));
    let alleInstancesBekend = true;
    const onbekendeInstances = [];
    data.root_causes.forEach(function (rc) {
      (rc.instances || []).forEach(function (inst) {
        // .exec-overlay-instanties zijn geen action_id's uit de matrix (het zijn sheet-namen) — die overslaan.
        if (actionIdSet.has(inst)) return;
        if (/^exec-/.test(inst)) return;
        alleInstancesBekend = false;
        onbekendeInstances.push(rc.id + ':' + inst);
      });
    });
    ok(alleInstancesBekend, 'elke root-cause-instance verwijst naar een bestaand action_id of een bekend exec-overlay-sheet (' + onbekendeInstances.join(', ') + ')');

    // elke RED action met een root_cause_id moet corresponderen met een bestaande root cause
    const knownRcIds = new Set(rcIds);
    const missendeRc = data.actions.filter(function (a) { return a.nav_status === 'RED' && a.root_cause_id && !knownRcIds.has(a.root_cause_id); });
    ok(missendeRc.length === 0, 'elke RED-actie met root_cause_id verwijst naar een bestaande root cause (' + missendeRc.map(function (a) { return a.action_id; }).join(', ') + ')');
  }

  // ---- 6. overige secties minimaal aanwezig als array ----
  ['functional_issues', 'po_decisions', 'open_evidence', 'dead_unreachable', 'non_existent', 'presentation_debt', 'invariants'].forEach(function (key) {
    ok(Array.isArray(data[key]), key + ' is een array');
  });

  // ---- 7. open_evidence-items mogen nooit GREEN in de actions-array staan ----
  if (Array.isArray(data.open_evidence) && Array.isArray(data.actions)) {
    const actionsById = {};
    data.actions.forEach(function (a) { actionsById[a.action_id] = a; });
    let evidenceConsistent = true;
    data.open_evidence.forEach(function (ev) {
      const act = actionsById[ev.action_id];
      if (act && act.nav_status !== ev.nav_status) evidenceConsistent = false;
      if (act && act.nav_status === 'GREEN') evidenceConsistent = false;
    });
    ok(evidenceConsistent, 'open_evidence-items zijn consistent met hun action en staan nooit als GREEN geregistreerd');
  }
}

console.log(msgs.length ? msgs.join('\n') : '');
console.log('routeMap.test.js: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail > 0) process.exit(1);
