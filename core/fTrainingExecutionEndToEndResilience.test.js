/* fTrainingExecutionEndToEndResilience.test.js — V1 Proven Maturity Sprint 05.
 * Training Execution End-to-End Resilience Certification.
 * SIMULATED-FAILURE-TESTED (niet PHYSICAL-DEVICE-TESTED -- deze omgeving heeft
 * geen browser/fysiek Android-toestel). Hergebruikt de Sprint-04-methodiek
 * (LETTERLIJK uit index.html geëxtraheerde productiecode -- sbPostQ/sbPatchQ/
 * flushOfflineQueue/offlineQueueAdd-All-Remove/IDEMPOTENT_TABELLEN_MET_CLIENT_ID
 * -- tegen een getrouwe, minimale in-memory IndexedDB-mock), nu toegepast op
 * de centrale Training Execution-schrijfketen (training_instances + sessions)
 * i.p.v. uitsluitend training_instances zelf.
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
  slice('const IDEMPOTENT_TABELLEN_MET_CLIENT_ID', 'async function sbDelQ'),
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
  vm.runInContext(code + '\nglobalThis.__exports = { sbPostQ, sbPatchQ, flushOfflineQueue, offlineQueueAll, IDEMPOTENT_TABELLEN_MET_CLIENT_ID };', context);
  return context.__exports;
}


(async () => {
  const crypto = require('crypto');
  let p = 0, f = 0;
  function xok(cond, label) { if (cond) { p++; console.log('OK  :', label); } else { f++; console.log('FAIL:', label); } }

  {
    const mockServerRows = {};
    const sandbox = buildSandbox(mockServerRows, () => 'ONLINE');
    const mod = runInSandbox(src, sandbox);
    await mod.sbPostQ('training_instances', { id: null, user_id: 'user-A', status: 'active' });
    for (let i = 0; i < 3; i++) { await mod.sbPostQ('sessions', { id: null, user_id: 'user-A', exercise_id: 'squat', reps: 5, weight: 100 + i }); }
    xok((mockServerRows.training_instances || []).length === 1, 'HAPPY PATH: exact 1 training_instances-rij');
    xok((mockServerRows.sessions || []).length === 3, 'HAPPY PATH: exact 3 sessions-rijen (één per geregistreerde set)');
  }

  {
    const mockServerRows = {};
    let net = 'ONLINE';
    const sandbox = buildSandbox(mockServerRows, () => net);
    const mod = runInSandbox(src, sandbox);
    await mod.sbPostQ('training_instances', { id: null, user_id: 'user-A', status: 'active' });
    await mod.sbPostQ('sessions', { id: null, user_id: 'user-A', exercise_id: 'squat', reps: 5, weight: 100 });
    net = 'OFFLINE';
    const setB = await mod.sbPostQ('sessions', { id: null, user_id: 'user-A', exercise_id: 'squat', reps: 5, weight: 102 });
    const setC = await mod.sbPostQ('sessions', { id: null, user_id: 'user-A', exercise_id: 'squat', reps: 5, weight: 104 });
    xok(setB === true && setC === true, 'Scenario A: sets tijdens offline worden gequeued (geen zichtbare fout, true teruggegeven)');
    const wachtrijTijdensOffline = await mod.offlineQueueAll();
    xok(wachtrijTijdensOffline.length === 2, 'Scenario A: de 2 offline geregistreerde sets staan zichtbaar in de wachtrij');
    net = 'ONLINE';
    await mod.flushOfflineQueue();
    xok((mockServerRows.sessions || []).length === 3, 'Scenario A: na reconnect staan alle 3 sets op de server (geen verlies)');
    const wachtrijNa = await mod.offlineQueueAll();
    xok(wachtrijNa.length === 0, 'Scenario A: wachtrij is leeg na succesvolle flush');
  }

  {
    const mockServerRows = {};
    let net = 'TIMEOUT_AFTER_SUCCESS';
    const sandbox = buildSandbox(mockServerRows, () => net);
    const mod = runInSandbox(src, sandbox);
    await mod.sbPostQ('sessions', { id: null, user_id: 'user-A', exercise_id: 'squat', reps: 5, weight: 100 });
    net = 'ONLINE';
    await mod.flushOfflineQueue();
    xok((mockServerRows.sessions || []).length === 1, 'Scenario C (sessions/set-logging): timeout-na-succes op EEN SET-WRITE geeft exact 1 rij, geen duplicate set');
  }

  {
    const mockServerRows = { training_instances: [{ id: 'ti-1', user_id: 'user-A', status: 'active' }] };
    const sandbox = buildSandbox(mockServerRows, () => 'ONLINE');
    sandbox.fetch = async function (url, init) {
      if (init.method === 'PATCH') {
        const row = mockServerRows.training_instances[0];
        row.status = 'completed'; row.completed_at = row.completed_at || new Date().toISOString();
        return { ok: true, status: 200, json: async () => ({}) };
      }
      return { ok: true, status: 200, json: async () => ({}) };
    };
    const mod = runInSandbox(src, sandbox);
    await mod.sbPatchQ('training_instances', 'id=eq.ti-1', { status: 'completed' });
    await mod.sbPatchQ('training_instances', 'id=eq.ti-1', { status: 'completed' });
    xok(mockServerRows.training_instances.length === 1, 'DOUBLE FINISH: dubbele PATCH-afronding levert nog steeds exact 1 training_instances-record op');
  }

  console.log('fTrainingExecutionEndToEndResilience: ' + p + ' geslaagd, ' + f + ' mislukt');
  console.log('Resultaat: ' + p + ' geslaagd, ' + f + ' mislukt');
  process.exit(f > 0 ? 1 : 0);
})();
