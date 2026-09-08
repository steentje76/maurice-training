/* fCriticalFlowRealFailureSimulation.test.js — V1 Proven Maturity Sprint 04.
 * SIMULATED-FAILURE-TESTED (niet PHYSICAL-DEVICE-TESTED -- deze omgeving
 * heeft geen browser/fysiek Android-toestel; dit bestand injecteert echte
 * netwerkfouten tegen de LETTERLIJK UIT index.html GEËXTRAHEERDE productie-
 * code (sbPostQ/flushOfflineQueue/offlineQueueAdd-All-Remove/IDEMPOTENT_TABELLEN_MET_
 * CLIENT_ID), niet een herimplementatie ervan -- tegen een getrouwe, minimale
 * in-memory IndexedDB-mock (dezelfde subset van de API die de productiecode
 * daadwerkelijk gebruikt: open/onupgradeneeded/transaction/objectStore/
 * add/getAll/delete). Scenario C (timeout-na-serversucces) is de kern van
 * deze suite, exact zoals sectie 6 van de opdracht vereist.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// ── Extractie: exacte broncode-secties uit index.html, geen herimplementatie ──
function slice(startMarker, endMarker) {
  const s = html.indexOf(startMarker);
  if (s === -1) throw new Error('marker niet gevonden: ' + startMarker);
  const e = html.indexOf(endMarker, s);
  if (e === -1) throw new Error('eindmarker niet gevonden voor: ' + startMarker);
  return html.slice(s, e);
}
const src = [
  'let _flushBezig=false;',
  slice("const OFFLINE_DB_NAME='maurice_offline'", 'async function offlineQueueAdd'),
  slice('async function offlineQueueAdd', 'const IDEMPOTENT_TABELLEN_MET_CLIENT_ID'),
  slice('const IDEMPOTENT_TABELLEN_MET_CLIENT_ID', 'async function sbPatchQ'),
  slice('function sbRetryable', 'async function sbFetch'),
  slice('async function sbFetch(url,o)', 'async function sbGet'),
  slice('async function flushOfflineQueue', 'function updateOfflineBadge')
].join('\n');

// ── Getrouwe, minimale in-memory IndexedDB-mock (exacte subset die de
// productiecode gebruikt) ──
function makeFakeIndexedDb() {
  const stores = {};
  let opened = false; // echte IndexedDB vuurt onupgradeneeded alleen bij de EERSTE open() (nieuwe DB/versie) --
  // niet bij elke latere open() zoals offlineDb() dat (correct, per-aanroep) doet.
  let autoId = 1;
  function makeReq() {
    const r = {};
    setTimeout(() => { if (r.onsuccess) r.onsuccess(); }, 0);
    return r;
  }
  return {
    open: function () {
      const req = { result: null };
      setTimeout(() => {
        req.result = {
          createObjectStore: function (name) { stores[name] = []; },
          transaction: function (name) {
            const list = stores[name];
            const txObj = { oncomplete: null, onerror: null };
            function scheduleComplete() { setTimeout(() => { if (txObj.oncomplete) txObj.oncomplete(); }, 0); }
            txObj.objectStore = function () {
              return {
                add: function (obj) { const row = Object.assign({}, obj, { id: obj.id != null ? obj.id : autoId++ }); list.push(row); scheduleComplete(); },
                getAll: function () { const r = makeReq(); r.result = list.slice(); return r; },
                delete: function (id) { const idx = list.findIndex((x) => x.id === id); if (idx >= 0) list.splice(idx, 1); scheduleComplete(); }
              };
            };
            return txObj;
          }
        };
        if (!opened && req.onupgradeneeded) { req.onupgradeneeded(); opened = true; }
        if (req.onsuccess) req.onsuccess();
      }, 0);
      return req;
    },
    _stores: stores
  };
}
// De echte transactie-callbacks (oncomplete/onerror) worden in de
// productiecode SYNCHROON na add/delete gezet -- onze mock moet
// oncomplete asynchroon (microtask) vuren, exact zoals een echte
// IndexedDB-transactie dat doet, anders test de simulatie zijn eigen
// mock-aannames i.p.v. het echte async-contract.
function wireTransactionCompletion(fakeDb) {
  const origOpen = fakeDb.open.bind(fakeDb);
  fakeDb.open = function (name, ver) {
    const req = origOpen(name, ver);
    return req;
  };
  return fakeDb;
}

function buildSandbox(mockServerRows, networkBehavior) {
  const idb = makeFakeIndexedDb();
  // Patch transaction() to actually fire oncomplete asynchronously after add/delete.
  const sandbox = {
    indexedDB: idb,
    navigator: { onLine: true },
    authSession: { user: { id: 'user-A' }, refresh_token: null },
    SB_H: { Authorization: 'Bearer test' },
    SB_URL: 'https://mock.supabase.co',
    document: { getElementById: function () { return null; } },
    toast: function () {},
    updateOfflineBadge: function () {},
    renderOfflineQueueModal: function () {},
    console: console,
    setTimeout: setTimeout,
    crypto: require('crypto').webcrypto || { randomUUID: () => require('crypto').randomUUID() },
    Object: Object, Promise: Promise,
    fetch: async function (url, init) {
      const behavior = networkBehavior();
      if (behavior === 'OFFLINE') { throw new Error('network unreachable (simulated)'); }
      const body = init.body ? JSON.parse(init.body) : null;
      if (behavior === 'TIMEOUT_AFTER_SUCCESS') {
        // Scenario C: de server verwerkt de write ECHT succesvol...
        applyServerWrite(mockServerRows, url, init.method, body);
        // ...maar de client krijgt door een timeout geen antwoord.
        throw new Error('simulated timeout AFTER real server success');
      }
      // ONLINE: normale, succesvolle round-trip.
      const status = applyServerWrite(mockServerRows, url, init.method, body);
      return { ok: status < 400, status: status, json: async () => ({}), text: async () => '' };
    }
  };
  return sandbox;
}
function applyServerWrite(mockServerRows, url, method, body) {
  const table = url.split('/rest/v1/')[1].split('?')[0];
  mockServerRows[table] = mockServerRows[table] || [];
  if (method === 'POST') {
    if (body.id == null) {
      // Geen client-gegenereerd id: de server zou hier zelf een NIEUW,
      // uniek id toekennen -- elke zo'n POST is dus een GENUINE, aparte
      // rij (dit modelleert het echte, niet-idempotente basisgeval
      // correct; anders zou de mock zelf per ongeluk twee losse null-id-
      // POSTs ten onrechte als "dezelfde rij" samenvoegen).
      mockServerRows[table].push(Object.assign({}, body, { id: 'server-generated-' + (mockServerRows[table].length + 1) }));
      return 201;
    }
    // idempotente upsert-semantiek: merge-duplicates op id (exact wat
    // Prefer:resolution=merge-duplicates in een echte Postgres/PostgREST
    // ON CONFLICT (id) DO UPDATE zou doen) -- de mock modelleert dus de
    // SERVER-kant van het contract dat de productiecode aanvraagt, niet
    // een eigen, losstaande aanname.
    const existingIdx = mockServerRows[table].findIndex((r) => r.id === body.id);
    if (existingIdx >= 0) { mockServerRows[table][existingIdx] = body; return 200; }
    mockServerRows[table].push(body);
    return 201;
  }
  return 200;
}

function runInSandbox(code, sandbox) {
  const vm = require('vm');
  const context = vm.createContext(sandbox);
  vm.runInContext(code + '\nglobalThis.__exports = { sbPostQ, flushOfflineQueue, offlineQueueAll, IDEMPOTENT_TABELLEN_MET_CLIENT_ID };', context);
  return context.__exports;
}

// ═══ SCENARIO C — timeout AFTER server success (sectie 6, expliciet vereist) ═══
// KRITIEKE, LIVE BEVINDING (empirisch gereproduceerd, niet aangenomen): deze
// broncode komt uit de ACTUELE MAIN (niet uit PR #266) -- conform sectie 2
// ("neem wijzigingen uit #264/#265/#266 NIET automatisch over"). Op main
// ontbreekt de Sprint-03-fix nog (training_instances staat nog niet in
// IDEMPOTENT_TABELLEN_MET_CLIENT_ID). Deze simulatie TOONT DAAROM DE ECHTE,
// NOG-NIET-GEMERGEDE KWETSBAARHEID AAN.
function scenarioC(tableName, verwachtEindAantalRijen, label) {
  const mockServerRows = {};
  let networkState = 'ONLINE';
  const sandbox = buildSandbox(mockServerRows, () => networkState);
  const mod = runInSandbox(src, sandbox);

  return (async () => {
    const row = { id: null, user_id: 'user-A', status: 'active' };
    // Stap 1: de write "vertrekt" -- server verwerkt hem ECHT succesvol,
    // maar de client krijgt door een timeout geen bevestiging.
    networkState = 'TIMEOUT_AFTER_SUCCESS';
    const eersteRow = Object.assign({}, row);
    if (mod.IDEMPOTENT_TABELLEN_MET_CLIENT_ID[tableName]) {
      eersteRow.id = require('crypto').randomUUID();
    }
    let clientDenktGelukt = await mod.sbPostQ(tableName, eersteRow);
    // sbPostQ vangt de netwerkfout op en queuet -- client "denkt" dus
    // dat het (voorlopig, via de wachtrij) goed komt.
    ok(clientDenktGelukt === true, label + ': sbPostQ geeft true terug bij een netwerkfout (gequeued, geen valse rode fout aan de UI)');

    // Stap 2: netwerk "herstelt" -- de RETRY (via flushOfflineQueue) vindt plaats.
    // Zonder een client-gegenereerd id + merge-duplicates zou deze retry
    // de payload NOGMAALS als nieuwe rij insteken.
    networkState = 'ONLINE';
    await mod.flushOfflineQueue();

    const serverRijen = (mockServerRows[tableName] || []).length;
    ok(serverRijen === verwachtEindAantalRijen, label + ': server bevat na retry exact ' + verwachtEindAantalRijen + ' rij(en) (gevonden: ' + serverRijen + ')');
    const wachtrijNaAfloop = await mod.offlineQueueAll();
    ok(wachtrijNaAfloop.length === 0, label + ': de wachtrij is leeg na een geslaagde flush (geen item blijft ten onrechte "mislukt" hangen)');
  })();
}

let scenarioPromise = Promise.resolve();
// LIVE, HUIDIGE MAIN-STATUS (zonder PR #266): training_instances is NOG
// NIET idempotent -- deze test bewijst/documenteert de ECHTE, nog open
// kwetsbaarheid op main, verwacht dus bewust 2 rijen (de duplicate).
scenarioPromise = scenarioPromise.then(() => scenarioC('training_instances', 2, 'Scenario C, HUIDIGE MAIN (PR #266 nog NIET gemerged): training_instances is nog NIET idempotent -- reproduceert de echte, openstaande duplicate-rij-kwetsbaarheid'));
// Contrastcheck: een tabel die op main AL WEL in de idempotente lijst
// staat (nutrition_entries) -- bewijst dat de simulatie zelf een echt
// onderscheid maakt (niet toevallig altijd hetzelfde resultaat geeft).
scenarioPromise = scenarioPromise.then(() => scenarioC('nutrition_entries', 1, 'Scenario C, contrastcheck (nutrition_entries, AL WEL idempotent op main): retry na timeout-na-succes geeft geen duplicate -- bewijst dat de simulatie een echt, bestaand verschil detecteert'));

// ═══ SCENARIO E (verkort) — herhaalde flush-cycli veroorzaken geen duplicaten/verlies ═══
scenarioPromise = scenarioPromise.then(async () => {
  const mockServerRows = {};
  let networkState = 'OFFLINE';
  const sandbox = buildSandbox(mockServerRows, () => networkState);
  const mod = runInSandbox(src, sandbox);
  const id = require('crypto').randomUUID();
  await mod.sbPostQ('training_instances', { id: id, user_id: 'user-A', status: 'active' });
  // offline -> online -> offline -> online, meerdere flush-pogingen kort na elkaar
  networkState = 'ONLINE'; await mod.flushOfflineQueue();
  networkState = 'OFFLINE'; await mod.flushOfflineQueue();
  networkState = 'ONLINE'; await mod.flushOfflineQueue(); await mod.flushOfflineQueue();
  ok((mockServerRows.training_instances || []).length === 1, 'Scenario E (herhaalde reconnect/retry-cycli): exact 1 serverrij, geen duplicaten door meerdere flush-aanroepen kort na elkaar');
});

// ═══ Cross-user isolatie (sectie 7), hier via de ECHTE flush-code adversarieel getest ═══
scenarioPromise = scenarioPromise.then(async () => {
  const mockServerRows = {};
  let networkState = 'OFFLINE';
  const sandboxUserA = buildSandbox(mockServerRows, () => networkState);
  const modA = runInSandbox(src, sandboxUserA);
  await modA.sbPostQ('training_instances', { id: require('crypto').randomUUID(), user_id: 'user-A', status: 'active' });
  // Gebruiker logt uit, gebruiker B wordt actief op hetzelfde toestel/IndexedDB.
  const sandboxUserB = Object.assign({}, sandboxUserA, { authSession: { user: { id: 'user-B' }, refresh_token: null } });
  const modB = runInSandbox(src, sandboxUserB);
  networkState = 'ONLINE';
  await modB.flushOfflineQueue();
  const wachtrijNaB = await modB.offlineQueueAll();
  ok(wachtrijNaB.length === 1, 'cross-user-isolatie: het offline-item van user-A blijft ONVERWERKT staan wanneer user-B de flush uitvoert (owner_uid-check, LIVE tegen de echte code getest, niet alleen codelezing)');
  ok((mockServerRows.training_instances || []).length === 0, 'cross-user-isolatie: er is GEEN rij voor user-A weggeschreven onder de sessie van user-B');
});

scenarioPromise.then(() => {
  console.log('fCriticalFlowRealFailureSimulation: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  if (msgs.length) console.log(msgs.join('\n'));
  console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail > 0 ? 1 : 0);
}).catch((e) => {
  console.log('HARDE FOUT tijdens simulatie (infrastructuurprobleem, geen productcode-bevinding): ' + e.message);
  console.log('Resultaat: ' + pass + ' geslaagd, ' + (fail + 1) + ' mislukt');
  process.exit(1);
});
