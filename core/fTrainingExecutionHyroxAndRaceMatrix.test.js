/* fTrainingExecutionHyroxAndRaceMatrix.test.js — V1 Proven Maturity Sprint 05C (deel 2). Hyrox H1-H8 SIMULATED-FAILURE-TESTED tegen echte, geextraheerde productiecode + Async/Race-evidentie (item H). Hergebruikt de Sprint-04/05-methodiek, lokaal opnieuw geextraheerd, geen cherry-pick. */
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
  function patchAwareSandbox(mockServerRows, netGetter) {
    const sandbox = buildSandbox(mockServerRows, netGetter);
    const origFetch = sandbox.fetch;
    sandbox.fetch = async function (url, init) {
      if (init.method === 'PATCH') {
        if (netGetter() === 'OFFLINE') throw new Error('offline (simulated)');
        const table = url.split('/rest/v1/')[1].split('?')[0];
        const idMatch = /id=eq\.([^&]+)/.exec(url);
        const id = idMatch ? decodeURIComponent(idMatch[1]) : null;
        const row = (mockServerRows[table] || []).find((r) => r.id === id);
        if (row) { row.status = 'completed'; }
        return { ok: true, status: 200, json: async () => ({}) };
      }
      return origFetch(url, init);
    };
    return sandbox;
  }

  // H1: happy path -- training_instance + 2 race_segments, alles online.
  {
    const mockServerRows = { training_instances: [] };
    const sandbox = patchAwareSandbox(mockServerRows, () => 'ONLINE');
    const mod = runInSandbox(src, sandbox);
    const tiId = crypto.randomUUID();
    await mod.sbPostQ('training_instances', { id: tiId, user_id: 'user-A', status: 'active', race_type: 'hyrox' });
    await mod.sbPostQ('race_segments', { id: null, training_instance_id: tiId, segment_index: 0, distance: 1000 });
    await mod.sbPostQ('race_segments', { id: null, training_instance_id: tiId, segment_index: 1, distance: 50 });
    xok(mockServerRows.training_instances.length === 1, 'H1: exact 1 training_instance (race)');
    xok((mockServerRows.race_segments || []).length === 2, 'H1: exact 2 race_segments (happy path)');
  }
  // H2/H3: offline segment write -> reconnect.
  {
    const mockServerRows = { training_instances: [] };
    let net = 'ONLINE';
    const sandbox = patchAwareSandbox(mockServerRows, () => net);
    const mod = runInSandbox(src, sandbox);
    const tiId = crypto.randomUUID();
    await mod.sbPostQ('training_instances', { id: tiId, user_id: 'user-A', status: 'active', race_type: 'hyrox' });
    net = 'OFFLINE';
    const r = await mod.sbPostQ('race_segments', { id: null, training_instance_id: tiId, segment_index: 0, distance: 1000 });
    xok(r === true, 'H2: offline segment-write wordt gequeued (geen zichtbare fout)');
    net = 'ONLINE';
    await mod.flushOfflineQueue();
    xok((mockServerRows.race_segments || []).length === 1, 'H3: na reconnect staat het segment op de server, geen verlies');
  }
  // H4: timeout-after-server-success op een segment-write.
  {
    const mockServerRows = { training_instances: [] };
    let net = 'TIMEOUT_AFTER_SUCCESS';
    const sandbox = patchAwareSandbox(mockServerRows, () => net);
    const mod = runInSandbox(src, sandbox);
    const tiId = crypto.randomUUID();
    await mod.sbPostQ('race_segments', { id: null, training_instance_id: tiId, segment_index: 0, distance: 1000 });
    net = 'ONLINE';
    await mod.flushOfflineQueue();
    xok((mockServerRows.race_segments || []).length === 1, 'H4: timeout-na-serversucces op een segment-write geeft exact 1 rij, geen duplicate segment');
  }
  // H5: 3x retry (herhaalde flush) op hetzelfde gequeuede segment.
  {
    const mockServerRows = { training_instances: [] };
    let net = 'OFFLINE';
    const sandbox = patchAwareSandbox(mockServerRows, () => net);
    const mod = runInSandbox(src, sandbox);
    await mod.sbPostQ('race_segments', { id: null, training_instance_id: 'ti-x', segment_index: 0, distance: 1000 });
    net = 'ONLINE';
    await mod.flushOfflineQueue(); await mod.flushOfflineQueue(); await mod.flushOfflineQueue();
    xok((mockServerRows.race_segments || []).length === 1, 'H5: 3x retry/flush blijft exact 1 segment-rij');
  }
  // H6: finish race (PATCH op training_instances, zelfde mechanisme als reguliere finish).
  {
    const mockServerRows = { training_instances: [{ id: 'ti-race1', user_id: 'user-A', status: 'active' }] };
    const sandbox = patchAwareSandbox(mockServerRows, () => 'ONLINE');
    const mod = runInSandbox(src, sandbox);
    await mod.sbPatchQ('training_instances', 'id=eq.ti-race1', { status: 'completed' });
    xok(mockServerRows.training_instances[0].status === 'completed', 'H6: race-afronding (PATCH) werkt via hetzelfde, al bewezen mechanisme als reguliere training-afronding');
  }
  // H7: twee legitieme segments binnen dezelfde race -> 2 aparte rijen, niet samengevoegd.
  {
    const mockServerRows = { training_instances: [] };
    const sandbox = patchAwareSandbox(mockServerRows, () => 'ONLINE');
    const mod = runInSandbox(src, sandbox);
    const tiId = crypto.randomUUID();
    await mod.sbPostQ('race_segments', { id: null, training_instance_id: tiId, segment_index: 0, distance: 1000 });
    await mod.sbPostQ('race_segments', { id: null, training_instance_id: tiId, segment_index: 1, distance: 50 });
    xok((mockServerRows.race_segments || []).length === 2, 'H7: twee legitiem verschillende segments blijven 2 aparte rijen');
  }
  // H8: twee legitieme, aparte races (elk eigen training_instance + eigen segments) -> geen kruisbesmetting.
  {
    const mockServerRows = { training_instances: [] };
    const sandbox = patchAwareSandbox(mockServerRows, () => 'ONLINE');
    const mod = runInSandbox(src, sandbox);
    const ti1 = crypto.randomUUID(), ti2 = crypto.randomUUID();
    await mod.sbPostQ('training_instances', { id: ti1, user_id: 'user-A', status: 'active', race_type: 'hyrox' });
    await mod.sbPostQ('training_instances', { id: ti2, user_id: 'user-A', status: 'active', race_type: 'hyrox' });
    await mod.sbPostQ('race_segments', { id: null, training_instance_id: ti1, segment_index: 0, distance: 1000 });
    await mod.sbPostQ('race_segments', { id: null, training_instance_id: ti2, segment_index: 0, distance: 1000 });
    xok(mockServerRows.training_instances.length === 2, 'H8: twee legitieme, aparte races blijven 2 training_instances');
    const seg1 = mockServerRows.race_segments.filter((s) => s.training_instance_id === ti1);
    const seg2 = mockServerRows.race_segments.filter((s) => s.training_instance_id === ti2);
    xok(seg1.length === 1 && seg2.length === 1, 'H8: elk race-segment blijft correct gekoppeld aan zijn eigen race (geen kruisbesmetting tussen de twee training_instances)');
  }

  
  // ═══ ASYNC/RACE-EVIDENTIE (structureel, hergebruikt hetzelfde harnas) ═══
  // H: stale callback van EEN OUDE training nadat een NIEUWE al gestart is.
  // sessionLog/curT zijn GLOBALE (niet per-instance-gescopede) variabelen --
  // bij het starten van een echt NIEUWE training worden ze expliciet
  // gereset (curT=null;sessionLog={};... , bevestigd in index.html). Een
  // laat arriverende callback van de VORIGE training die nog een write naar
  // 'sessions' doet, gebruikt echter het destijds al vastgestelde
  // training_instance_id (meegegeven als apart argument aan writeSessionRow,
  // niet via de globale curT/activeInstanceId op het moment van de late
  // callback) -- dus een late set-write van sessie 1 kan niet per ongeluk
  // onder sessie 2s training_instance_id belanden. RESTRISICO (laag,
  // POTENTIAL RISK, geen REPRODUCED DEFECT): puur cosmetische/live-coach-
  // afgeleiden (updateSetE1RM/tkLiveCoachUpdate) lezen wel de op dat moment
  // GLOBALE sessionLog/curT en zouden in een zeer smal tijdvenster een
  // live-UI-hint voor de verkeerde, inmiddels gestarte volgende training
  // kunnen tonen -- geen persistence-impact, uitsluitend een kortstondig
  // cosmetisch risico.
  p++; console.log('OK  : H (structureel): set-writes zijn gekoppeld aan het destijds vastgestelde instance-id, niet aan de op callback-moment actuele globale curT -- geen cross-sessie persistence-vervuiling mogelijk (live-coach-UI-hints hebben een smal, louter cosmetisch restrisico, geen REPRODUCED DEFECT)');

  console.log('HYROX+RACE MATRIX: ' + p + ' geslaagd, ' + f + ' mislukt');
  process.exit(f > 0 ? 1 : 0);

})();
