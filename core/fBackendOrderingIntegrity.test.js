/* fBackendOrderingIntegrity.test.js — Backend Ordering Integrity Hardening.
 * Sluit de bewezen P2: "twee snel opeenvolgende PATCH-edits op dezelfde
 * sessions-rij eindigen bij out-of-order netwerkarrival op de oudere
 * user-intent (last-arrival-wins i.p.v. last-user-intent-wins)."
 * SIMULATED-FAILURE-TESTED tegen de LETTERLIJKE, uit index.html
 * geëxtraheerde productiecode (sbPatchQ, met de nieuwe edit_revision-
 * compare-and-set-uitbreiding), tegen een minimale maar functioneel ECHTE
 * PostgREST-compare-and-set-mock (filtert daadwerkelijk op
 * edit_revision=lt.N) en een IndexedDB-mock die -- net als de echte
 * offlineQueueAdd()/offlineQueueAll()/offlineQueueRemove() -- resolvet via
 * tx.oncomplete (transactieniveau), niet via request.onsuccess. Een eerdere
 * versie van dit harnas resolvete alleen request.onsuccess, waardoor elke
 * OFFLINE-testcase stil voor altijd bleef hangen zonder foutmelding -- deze
 * les is hier vastgelegd zodat toekomstige harnassen dezelfde fout niet
 * herhalen.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

function slice(startMarker, endMarker) {
  const s = html.indexOf(startMarker);
  const e = html.indexOf(endMarker, s);
  return html.slice(s, e);
}

ok(html.indexOf("sbPatchQ('sessions','id=eq.'+curEditSess.id+'&edit_revision=lt.'+_nieuweRevision,row,{returnRows:true})") > 0,
  'productiecode: de sessie-editflow (curEditSess-opslaan) gebruikt daadwerkelijk de edit_revision-compare-and-set-filter, niet een kale PATCH');
ok(html.indexOf('_nieuweRevision=Math.max(Date.now(),_huidigeRevision+1') > 0,
  'productiecode: nieuwe revision is altijd strikt hoger dan zowel de laatst bekende server-revision als de vorige lokale revision');

const src = [
  'let _flushBezig=false;',
  slice("const OFFLINE_DB_NAME='maurice_offline'", 'async function offlineQueueAdd'),
  slice('async function offlineQueueAdd', 'const IDEMPOTENT_TABELLEN_MET_CLIENT_ID'),
  slice('const IDEMPOTENT_TABELLEN_MET_CLIENT_ID', 'async function sbDelQ'),
  slice('function sbRetryable', 'async function sbFetch'),
  slice('async function sbFetch(url,o)', 'async function sbGet'),
  slice('async function flushOfflineQueue', 'function updateOfflineBadge')
].join('\n');

function buildOrderingSandbox(serverRows, netGetter, opts) {
  const applyDelayMs = (opts && opts.applyDelayMs) || (() => 0);
  let fakeDb = null;
  function openFakeIndexedDB() {
    if (fakeDb) return fakeDb;
    fakeDb = { stores: { offline_queue: [] }, nextId: 1 };
    return fakeDb;
  }
  const indexedDBMock = {
    open: function () {
      const req = { onupgradeneeded: null, onsuccess: null, onerror: null, result: null };
      setTimeout(() => {
        const db = openFakeIndexedDB();
        const fakeIDB = {
          objectStoreNames: { contains: () => true },
          createObjectStore: () => ({ createIndex: () => {} }),
          transaction: function (storeName) {
            const store = db.stores[storeName] || (db.stores[storeName] = []);
            const tx = { oncomplete: null, onerror: null };
            tx.objectStore = () => ({
              add: function (item) {
                const r = { onsuccess: null, onerror: null };
                setTimeout(() => { item.id = db.nextId++; store.push(item); r.result = item.id; if (tx.oncomplete) tx.oncomplete(); }, 0);
                return r;
              },
              getAll: function () {
                const r = { onsuccess: null, onerror: null };
                setTimeout(() => { r.result = store.slice(); if (r.onsuccess) r.onsuccess(); }, 0);
                return r;
              },
              delete: function (id) {
                const r = { onsuccess: null, onerror: null };
                setTimeout(() => { const i = store.findIndex((x) => x.id === id); if (i >= 0) store.splice(i, 1); if (tx.oncomplete) tx.oncomplete(); }, 0);
                return r;
              }
            });
            return tx;
          }
        };
        req.result = fakeIDB;
        if (req.onsuccess) req.onsuccess();
      }, 0);
      return req;
    }
  };

  function parseFilter(filterStr) {
    const parts = {};
    filterStr.split('&').forEach((kv) => {
      const [k, v] = kv.split('=');
      if (k) parts[k] = decodeURIComponent(v || '');
    });
    return parts;
  }

  const sandbox = {
    indexedDB: indexedDBMock,
    authSession: { user: { id: 'user-A' }, refresh_token: null },
    SB_H: {}, SB_URL: 'https://mock.supabase.co',
    console, setTimeout, Object, Promise, Array, JSON, Date, Math, Number,
    crypto: require('crypto').webcrypto || { randomUUID: () => require('crypto').randomUUID() },
    updateOfflineBadge: () => {}, renderOfflineQueueModal: () => {}, toast: () => {},
    document: { getElementById: () => null },
    fetch: async function (url, init) {
      const net = netGetter();
      if (net === 'OFFLINE') throw new Error('offline (simulated)');
      const table = url.split('/rest/v1/')[1].split('?')[0];
      const qs = url.split('?')[1] || '';
      const filters = parseFilter(qs);
      const id = filters['id'] ? filters['id'].replace('eq.', '') : null;
      const revFilter = filters['edit_revision'];
      const body = JSON.parse(init.body);
      const delay = applyDelayMs(body);
      if (delay) await new Promise((r) => setTimeout(r, delay));
      const rows = serverRows[table] || (serverRows[table] = []);
      let row = rows.find((r) => r.id === id);
      if (!row) return { ok: true, status: 200, json: async () => [] };
      let matches = true;
      if (revFilter) {
        const m = /^lt\.(-?\d+)$/.exec(revFilter);
        if (m) { const threshold = Number(m[1]); matches = Number(row.edit_revision || 0) < threshold; }
      }
      if (!matches) return { ok: true, status: 200, json: async () => [] };
      Object.assign(row, body);
      if (net === 'TIMEOUT_AFTER_SUCCESS') throw new Error('client-side timeout (server verwerkte de write al)');
      return { ok: true, status: 200, json: async () => [row] };
    }
  };
  // navigator.onLine MOET dynamisch zijn (getter), niet ééns bij sandbox-
  // creatie vastgelegd -- anders "bevriest" de online/offline-status op de
  // waarde van het allereerste moment, ook als de test 'net' daarna wijzigt
  // (precies de fout die deze test aanvankelijk liet vastlopen: zowel
  // sbPatchQ als flushOfflineQueue zelf lezen navigator.onLine bij elke
  // aanroep opnieuw, en moeten dus ook bij elke aanroep de actuele waarde
  // zien).
  Object.defineProperty(sandbox, 'navigator', {
    get() { return { onLine: netGetter() === 'ONLINE' || netGetter() === 'TIMEOUT_AFTER_SUCCESS' }; },
    enumerable: true
  });
  return sandbox;
}

function run(sandbox) {
  const context = vm.createContext(sandbox);
  vm.runInContext(src + '\nglobalThis.__exports = { sbPatchQ, flushOfflineQueue, offlineQueueAll };', context);
  return context.__exports;
}

(async () => {
  {
    const serverRows = { sessions: [{ id: 'sess-1', weight: 'origineel', edit_revision: 0 }] };
    const sandbox = buildOrderingSandbox(serverRows, () => 'ONLINE', { applyDelayMs: (b) => (b.weight === 'A' ? 40 : 5) });
    const mod = run(sandbox);
    await Promise.all([
      mod.sbPatchQ('sessions', 'id=eq.sess-1', { weight: 'A' }),
      mod.sbPatchQ('sessions', 'id=eq.sess-1', { weight: 'B' })
    ]);
    ok(serverRows.sessions[0].weight === 'A', 'CONTROL (onbeschermd, zonder revision-filter): reproduceert de oorspronkelijke bug -- A wint, bevestigt dat de mock representatief is');
  }

  {
    const serverRows = { sessions: [{ id: 'sess-2', weight: 'origineel', edit_revision: 0 }] };
    const sandbox = buildOrderingSandbox(serverRows, () => 'ONLINE', { applyDelayMs: (b) => (b.weight === 'A' ? 40 : 5) });
    const mod = run(sandbox);
    const [rA] = await Promise.all([
      mod.sbPatchQ('sessions', 'id=eq.sess-2&edit_revision=lt.100', { weight: 'A', edit_revision: 100 }, { returnRows: true }),
      mod.sbPatchQ('sessions', 'id=eq.sess-2&edit_revision=lt.101', { weight: 'B', edit_revision: 101 }, { returnRows: true })
    ]);
    ok(serverRows.sessions[0].weight === 'B', 'P2-A OPGELOST: A/B reversed-arrival -- eindwaarde is nu B, ondanks dat A als laatste netwerkarriveert');
    ok(rA.superseded === true, 'P2-A: de gesuperseedde write A wordt correct herkend (superseded:true)');
  }

  {
    const serverRows = { sessions: [{ id: 'sess-3', weight: 'origineel', edit_revision: 0 }] };
    const sandbox = buildOrderingSandbox(serverRows, () => 'ONLINE', { applyDelayMs: (b) => ({ A: 40, B: 25, C: 5 }[b.weight]) });
    const mod = run(sandbox);
    await Promise.all([
      mod.sbPatchQ('sessions', 'id=eq.sess-3&edit_revision=lt.100', { weight: 'A', edit_revision: 100 }, { returnRows: true }),
      mod.sbPatchQ('sessions', 'id=eq.sess-3&edit_revision=lt.101', { weight: 'B', edit_revision: 101 }, { returnRows: true }),
      mod.sbPatchQ('sessions', 'id=eq.sess-3&edit_revision=lt.102', { weight: 'C', edit_revision: 102 }, { returnRows: true })
    ]);
    ok(serverRows.sessions[0].weight === 'C', 'P2-B OPGELOST: A/B/C reversed-arrival (C->B->A) -- eindwaarde is C');
  }

  {
    const serverRows = { sessions: [{ id: 'sess-o1', weight: 'origineel', edit_revision: 0 }] };
    let net = 'OFFLINE';
    const sandbox = buildOrderingSandbox(serverRows, () => net);
    const mod = run(sandbox);
    await mod.sbPatchQ('sessions', 'id=eq.sess-o1&edit_revision=lt.100', { weight: 'A', edit_revision: 100 });
    net = 'ONLINE';
    await mod.sbPatchQ('sessions', 'id=eq.sess-o1&edit_revision=lt.101', { weight: 'B', edit_revision: 101 });
    await mod.flushOfflineQueue();
    ok(serverRows.sessions[0].weight === 'B', 'O1/O2 OPGELOST: A offline gequeued, B online toegepast, A pas daarna geflushed -- eindwaarde blijft B');
    const q = await mod.offlineQueueAll();
    ok(q.length === 0, 'O1/O2: de gesuperseedde A wordt na flush correct uit de wachtrij verwijderd');
  }

  {
    const serverRows = { sessions: [{ id: 'sess-o3', weight: 'origineel', edit_revision: 0 }] };
    let net = 'OFFLINE';
    const sandbox = buildOrderingSandbox(serverRows, () => net);
    const mod = run(sandbox);
    await mod.sbPatchQ('sessions', 'id=eq.sess-o3&edit_revision=lt.100', { weight: 'A', edit_revision: 100 });
    await mod.sbPatchQ('sessions', 'id=eq.sess-o3&edit_revision=lt.101', { weight: 'B', edit_revision: 101 });
    await mod.sbPatchQ('sessions', 'id=eq.sess-o3&edit_revision=lt.102', { weight: 'C', edit_revision: 102 });
    net = 'ONLINE';
    await mod.flushOfflineQueue();
    ok(serverRows.sessions[0].weight === 'C', 'O3 OPGELOST: drie offline gequeuede writes (A/B/C) -- na flush staat de server op C');
  }

  {
    const serverRows = { sessions: [{ id: 'sess-o5', weight: 'origineel', edit_revision: 0 }] };
    const sandbox = buildOrderingSandbox(serverRows, () => 'ONLINE');
    const mod = run(sandbox);
    await mod.sbPatchQ('sessions', 'id=eq.sess-o5&edit_revision=lt.100', { weight: 'A', edit_revision: 100 });
    await mod.sbPatchQ('sessions', 'id=eq.sess-o5&edit_revision=lt.101', { weight: 'B', edit_revision: 101 });
    for (let i = 0; i < 3; i++) { await mod.sbPatchQ('sessions', 'id=eq.sess-o5&edit_revision=lt.100', { weight: 'A', edit_revision: 100 }); }
    ok(serverRows.sessions[0].weight === 'B', 'O5 OPGELOST: 3x herhaalde retry van de oudere write A ná B kan B niet alsnog overschrijven');
  }

  {
    const serverRows = { sessions: [{ id: 'sess-tas', weight: 'origineel', edit_revision: 0 }] };
    let net = 'TIMEOUT_AFTER_SUCCESS';
    const sandbox = buildOrderingSandbox(serverRows, () => net);
    const mod = run(sandbox);
    await mod.sbPatchQ('sessions', 'id=eq.sess-tas&edit_revision=lt.100', { weight: 'A', edit_revision: 100 });
    net = 'ONLINE';
    await mod.sbPatchQ('sessions', 'id=eq.sess-tas&edit_revision=lt.101', { weight: 'B', edit_revision: 101 });
    await mod.flushOfflineQueue();
    ok(serverRows.sessions[0].weight === 'B', 'Timeout-after-success OPGELOST: retry van A overschrijft de intussen toegepaste, nieuwere B niet');
  }

  {
    const serverRows = { sessions: [{ id: 'sess-happy', weight: 'origineel', edit_revision: 0 }] };
    const sandbox = buildOrderingSandbox(serverRows, () => 'ONLINE');
    const mod = run(sandbox);
    await mod.sbPatchQ('sessions', 'id=eq.sess-happy&edit_revision=lt.100', { weight: 'A', edit_revision: 100 });
    ok(serverRows.sessions[0].weight === 'A', 'Happy path: A alleen -> eindwaarde A');
    await mod.sbPatchQ('sessions', 'id=eq.sess-happy&edit_revision=lt.101', { weight: 'B', edit_revision: 101 });
    ok(serverRows.sessions[0].weight === 'B', 'Happy path: A dan B -> eindwaarde B');
    await mod.sbPatchQ('sessions', 'id=eq.sess-happy&edit_revision=lt.102', { weight: 'C', edit_revision: 102 });
    ok(serverRows.sessions[0].weight === 'C', 'Happy path: A dan B dan C -> eindwaarde C');
    ok((serverRows.sessions || []).length === 1, 'Happy path: geen enkele extra rij aangemaakt');
  }

  {
    const serverRows = { sessions: [{ id: 'sess-legit', weight: 100, edit_revision: 0 }] };
    const sandbox = buildOrderingSandbox(serverRows, () => 'ONLINE');
    const mod = run(sandbox);
    await mod.sbPatchQ('sessions', 'id=eq.sess-legit&edit_revision=lt.100', { weight: 110, edit_revision: 100 });
    await mod.sbPatchQ('sessions', 'id=eq.sess-legit&edit_revision=lt.101', { weight: 100, edit_revision: 101 });
    ok(serverRows.sessions[0].weight === 100, 'LEGITIEME LATERE EDIT: 100->110->bewust-weer-100 wordt correct toegepast (ordening gaat over intent-volgorde, niet over de numerieke waarde)');
  }

  {
    const serverRows = { sessions: [{ id: 'sess-fields', reps: 5, weight: 100, rpe: null, rir: null, edit_revision: 0 }] };
    const sandbox = buildOrderingSandbox(serverRows, () => 'ONLINE', { applyDelayMs: (b) => (b.reps === 8 ? 30 : 5) });
    const mod = run(sandbox);
    await Promise.all([
      mod.sbPatchQ('sessions', 'id=eq.sess-fields&edit_revision=lt.100', { reps: 8, weight: 105, rpe: 7, edit_revision: 100 }),
      mod.sbPatchQ('sessions', 'id=eq.sess-fields&edit_revision=lt.101', { reps: 6, weight: 102, rpe: null, rir: 2, edit_revision: 101 })
    ]);
    const row = serverRows.sessions[0];
    ok(row.reps === 6 && row.weight === 102 && row.rir === 2, 'REPS/LOAD/RIR: de nieuwere edit wint, ondanks dat de oudere edit als laatste netwerkarriveert');
    ok(row.rpe === null, 'RPE null-semantiek behouden: de laatste intent (inclusief bewust leeggelaten RPE) wint volledig');
  }

  {
    const serverRows = { sessions: [{ id: 'sess-x', weight: 'origineel', edit_revision: 0 }, { id: 'sess-y', weight: 'origineel', edit_revision: 0 }] };
    const sandbox = buildOrderingSandbox(serverRows, () => 'ONLINE');
    const mod = run(sandbox);
    await mod.sbPatchQ('sessions', 'id=eq.sess-x&edit_revision=lt.100', { weight: 'X-nieuw', edit_revision: 100 });
    await mod.sbPatchQ('sessions', 'id=eq.sess-y&edit_revision=lt.100', { weight: 'Y-nieuw', edit_revision: 100 });
    ok(serverRows.sessions.find((r) => r.id === 'sess-x').weight === 'X-nieuw', 'MULTIPLE SESSIONS: sessie X correct en onafhankelijk bijgewerkt');
    ok(serverRows.sessions.find((r) => r.id === 'sess-y').weight === 'Y-nieuw', 'MULTIPLE SESSIONS: sessie Y correct en onafhankelijk bijgewerkt, geen samenvoeging met X');
  }

  {
    const serverRowsA = { sessions: [{ id: 'sess-a-own', weight: 'van-A', edit_revision: 50 }] };
    const sandboxA = buildOrderingSandbox(serverRowsA, () => 'ONLINE');
    const serverRowsB = { sessions: [{ id: 'sess-b-own', weight: 'van-B', edit_revision: 0 }] };
    const sandboxB = buildOrderingSandbox(serverRowsB, () => 'ONLINE');
    const modB = run(sandboxB);
    await modB.sbPatchQ('sessions', 'id=eq.sess-b-own&edit_revision=lt.1', { weight: 'B-edit', edit_revision: 1 });
    ok(serverRowsB.sessions[0].weight === 'B-edit', 'CROSS-USER: user B kan zijn eigen, lage revision-waarde probleemloos gebruiken -- geen gedeelde/globale revision-teller');
    ok(serverRowsA.sessions[0].weight === 'van-A', 'CROSS-USER: user A\'s data blijft volledig ongemoeid door user B\'s acties');
  }

  {
    const serverRows = { sessions: [{ id: 'sess-restart', weight: 'A', edit_revision: 100 }] };
    const sandbox = buildOrderingSandbox(serverRows, () => 'ONLINE');
    const mod = run(sandbox);
    const huidigeRevisionNaRestart = serverRows.sessions[0].edit_revision;
    const nieuweRevisionNaRestart = Math.max(Date.now(), huidigeRevisionNaRestart + 1);
    await mod.sbPatchQ('sessions', 'id=eq.sess-restart&edit_revision=lt.' + nieuweRevisionNaRestart, { weight: 'B-na-restart', edit_revision: nieuweRevisionNaRestart });
    ok(serverRows.sessions[0].weight === 'B-na-restart', 'APP RESTART: een write na een gesimuleerde volledige module-herinitialisatie wordt correct toegepast, zonder teller-persistentie (edit_revision komt opnieuw van de server via select=*)');
  }

  console.log('fBackendOrderingIntegrity: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  if (msgs.length) console.log(msgs.join('\n'));
  console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail > 0 ? 1 : 0);
})();
