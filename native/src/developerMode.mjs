const STORAGE_KEY = 'tk.developerMode.enabled.v1';
const HOLD_MS = 2600;
const HOTSPOT_PX = 96;

function safeJsonClone(value) {
  try { return JSON.parse(JSON.stringify(value)); } catch (_) { return null; }
}

let programmingSource = null;
/* index.html registreert hier de ACTIEVE programming-controller, zodat Developer
   Mode de echte diagnostiek leest en nooit een statisch object. */
export function setProgrammingSource(fn) { programmingSource = (typeof fn === 'function') ? fn : null; }

let lifecycleSource = null;
/* Real-device diagnostic instrumentation: index.html levert een READ-ONLY lifecycle-snapshot.
   Fallback op window.tkC2LifecycleSnapshot, zodat laadvolgorde geen rol speelt. */
export function setLifecycleSource(fn) { lifecycleSource = (typeof fn === 'function') ? fn : null; }
function readLifecycle() {
  try {
    const fn = lifecycleSource || ((typeof window !== 'undefined' && typeof window.tkC2LifecycleSnapshot === 'function') ? window.tkC2LifecycleSnapshot : null);
    return fn ? safeJsonClone(fn()) : null;
  } catch (_) { return null; }
}

export function buildDiagnosticsSnapshot(transport) {
  const out = {
    generatedAt: new Date().toISOString(),
    transportAvailable: !!transport,
    transportVersion: transport && transport.VERSION ? String(transport.VERSION) : null,
    status: null,
    permissionState: null,
    advertisementsSeen: 0,
    matchedDevices: 0,
    devices: [],
    connection: null,
      // Gate B: diagnostiek van de actieve PM5-programmeercontroller.
      programming: null,
    // Real-device diagnostics: multiplexed packets (transport) en lifecycle (index.html), read-only.
    multiplexed: null,
    lifecycle: null
  };
  out.lifecycle = readLifecycle();
  try {
    const src = programmingSource && programmingSource();
    if (src && typeof src.getDiagnostics === 'function') out.programming = src.getDiagnostics();
  } catch (e) { /* diagnostiek mag de rest nooit blokkeren */ }
  if (!transport) return out;
  try {
    // Fase B: verbindingsdiagnostiek (geen payload, geen persoonsgegevens; device-id gemaskeerd door het transport)
    if (typeof transport.getConnectionDiagnostics === 'function') out.connection = safeJsonClone(transport.getConnectionDiagnostics());
  } catch (_) {}
  try {
    if (typeof transport.getMultiplexedDiagnostics === 'function') out.multiplexed = safeJsonClone(transport.getMultiplexedDiagnostics());
  } catch (_) {}

  try {
    if (typeof transport.getStatus === 'function') out.status = safeJsonClone(transport.getStatus());
  } catch (_) {}
  try {
    if (typeof transport.getPermissionState === 'function') out.permissionState = transport.getPermissionState();
  } catch (_) {}
  try {
    if (typeof transport.getLastDiscoveryDiagnostics === 'function') {
      const d = transport.getLastDiscoveryDiagnostics() || {};
      out.permissionState = d.permissionState != null ? d.permissionState : out.permissionState;
      out.advertisementsSeen = Number(d.advertisementsSeen) || 0;
      out.devices = Array.isArray(d.devices) ? d.devices.map((device) => ({
        deviceIdMasked: device && device.deviceIdMasked ? String(device.deviceIdMasked) : null,
        name: device && device.name ? String(device.name) : null,
        rssi: device && typeof device.rssi === 'number' ? device.rssi : null,
        uuids: device && Array.isArray(device.uuids) ? device.uuids.map(String) : [],
        matched: !!(device && device.matched),
        reason: device && device.reason ? String(device.reason) : null
      })) : [];
      out.matchedDevices = out.devices.filter((dvc) => dvc.matched).length;
    }
  } catch (_) {}
  return out;
}

export function diagnosticsToText(snapshot) {
  const s = snapshot || {};
  const lines = [
    'Trainingskompas Developer Mode',
    'Concept2 BLE diagnostics',
    '',
    'Transport: ' + (s.transportAvailable ? 'beschikbaar' : 'niet beschikbaar'),
    'Versie: ' + (s.transportVersion || '-'),
    'Status: ' + ((s.status && s.status.state) || '-'),
    'Permissie: ' + (s.permissionState || '-'),
    'BLE advertenties gezien: ' + (Number(s.advertisementsSeen) || 0),
    'Concept2 matches: ' + (Number(s.matchedDevices) || 0),
    ''
  ];
  const c = s.connection;
  if (c) {
    const iso = (t) => (typeof t === 'number' ? new Date(t).toISOString() : '-');
    lines.push('--- Verbinding ---');
    lines.push('State: ' + (c.state || '-'));
    lines.push('Device: ' + (c.deviceIdMasked || '-'));
    lines.push('connectedAt: ' + iso(c.connectedAt));
    lines.push('disconnectedAt: ' + iso(c.disconnectedAt));
    lines.push('Duur: ' + (typeof c.connectionDurationMs === 'number' ? Math.round(c.connectionDurationMs / 1000) + ' s' : '-'));
    lines.push('lastDisconnectReason: ' + (c.lastDisconnectReason || '-'));
    lines.push('lastLifecycleEvent: ' + (c.lastLifecycleEvent ? (c.lastLifecycleEvent.event + (c.lastLifecycleEvent.detail ? ' (' + c.lastLifecycleEvent.detail + ')' : '') + ' @ ' + iso(c.lastLifecycleEvent.at)) : '-'));
    lines.push('Laatste geslaagde subscription vóór disconnect: ' + (c.lastSubscriptionBeforeDisconnect || '-'));
    const st = c.strategy;
    lines.push('Strategie: ' + (st ? (st.mode + ' → ' + st.selected + ' (' + st.reason + ')') : '-'));
    lines.push('Volgorde: ' + (st && Array.isArray(st.order) && st.order.length ? st.order.join(' → ') : '-'));
    const dc = c.discovery;
    lines.push('Service discovery: ' + (dc ? (dc.ok ? 'ok, ' + dc.serviceCount + ' services' : 'niet beschikbaar') : '-'));
    (Array.isArray(c.discoveredServices) ? c.discoveredServices : []).forEach((sv) => {
      lines.push('  svc ' + sv.uuid);
      (sv.characteristics || []).forEach((ch) => { lines.push('    ' + ch.uuid + (ch.notify ? ' [notify]' : '') + (ch.read ? ' [read]' : '') + (ch.write ? ' [write]' : '')); });
    });
    const t = c.totals || {};
    lines.push('Subscriptions ok/failed: ' + (t.subscriptionsOk || 0) + '/' + (t.subscriptionsFailed || 0));
    (Array.isArray(c.subscriptions) ? c.subscriptions : []).forEach((r) => {
      lines.push('  ' + (r.order != null ? '#' + r.order + ' ' : '') + (r.ok === true ? 'OK   ' : r.ok === false ? 'FAIL ' : '...  ') + (r.key || '-') + ' ' + (r.uuid || '-') + (r.error ? ' — ' + r.error : ''));
    });
    lines.push('Notifications totaal: ' + (t.notifications || 0));
    const n = c.notifications || {};
    Object.keys(n).forEach((u) => { lines.push('  ' + u + ': ' + n[u].count + 'x, eerste ' + iso(n[u].firstAt) + ', laatste ' + iso(n[u].lastAt)); });
    lines.push('');
    // ── PM5 workoutprogrammering (Gate B) — leest uit de actieve controller ──
    const pg = s.programming;
    if (pg) {
      lines.push('--- Workout control (PM5 programmering) ---');
      lines.push('Requested: ' + (pg.requestedWorkoutType != null ? 'fixed distance (type ' + pg.requestedWorkoutType + ')' : '-'));
      lines.push('Target: ' + (pg.requestedDistanceM != null ? pg.requestedDistanceM + ' m' : '-'));
      lines.push('State: ' + (pg.state || '-'));
      lines.push('Generation/sessie: ' + (pg.generation != null ? pg.generation : '-'));
      lines.push('CE060021 write attempted: ' + (pg.writeAttempted || 0));
      lines.push('CE060021 write completed: ' + (pg.writeCompleted || 0));
      lines.push('CE060021 write failed: ' + (pg.writeFailed || 0) + (pg.lastWriteError ? ' (' + pg.lastWriteError + ')' : ''));
      lines.push('Laatste uitgaand frame: ' + (pg.lastFrameHex || '-'));
      lines.push('CE060022 responses seen: ' + (pg.responsesSeen || 0));
      lines.push('CE060022 responses ignored: ' + (pg.responsesIgnored || 0));
      lines.push('Laatste response: ' + (pg.lastResponseHex || '-'));
      lines.push('Parse: ' + (pg.lastParse || '-'));
      lines.push('Previous Frame Status: ' + (pg.previousFrameStatus || '-'));
      lines.push('PM state-machine: ' + (pg.pmStateMachineState || '-'));
      lines.push('Laatste resultaat: ' + (pg.lastResult && pg.lastResult.state ? pg.lastResult.state + (pg.lastResult.reason ? ' (' + pg.lastResult.reason + ')' : '') : '-'));
      lines.push('Laatste event: ' + (pg.startedAt != null ? iso(pg.startedAt) : '-'));
      lines.push('--- Programming verification ---');
      lines.push('Requested workout type: ' + v(pg.requestedWorkoutType));
      lines.push('Requested distance: ' + (pg.requestedDistanceM != null ? pg.requestedDistanceM + ' m' : '-'));
      lines.push('Requested time: - (geen fixed-time programmeerpad aanwezig)');
      lines.push('Frame hex: ' + v(pg.frameHex));
      lines.push('Frame accepted at: ' + iso(pg.frameAcceptedAt));
      lines.push('Verification started at: ' + iso(pg.verificationStartedAt));
      lines.push('Verification telemetry at: ' + iso(pg.verificationTelemetryAt));
      lines.push('readbackWorkoutType: ' + v(pg.readbackWorkoutType));
      lines.push('readbackWorkoutDuration: ' + v(pg.readbackWorkoutDuration));
      lines.push('readbackDurationType: ' + v(pg.readbackDurationType));
      lines.push('verifyFromTelemetry attempts: ' + (pg.verifyAttempts || 0));
      lines.push('Laatste verify reason: ' + v(pg.lastVerifyReason) + (pg.lastVerifyAt != null ? ' @ ' + iso(pg.lastVerifyAt) : ''));
      lines.push('Verify tijdens operatie: ' + (pg.verifyAttemptsWhilePending || 0) + 'x · laatste reason ' + v(pg.lastPendingVerifyReason) + ' (seq ' + v(pg.lastPendingVerifyTelemetrySeq) + ')' + (pg.lastPendingVerifyAt != null ? ' @ ' + iso(pg.lastPendingVerifyAt) : ''));
      lines.push('Verify reasons: ' + fmtCounts(pg.verifyReasonCounts));
      lines.push('Controller telemetry seq (acceptatie / laatst beoordeeld): ' + v(pg.frameAcceptedTelemetrySeq) + ' / ' + v(pg.lastVerifyTelemetrySeq));
      lines.push('Eindstate/reason: ' + v(pg.state) + (pg.lastResult && pg.lastResult.reason ? ' (' + pg.lastResult.reason + ')' : ''));
      lines.push('');
    } else {
      lines.push('--- Workout control (PM5 programmering) ---');
      lines.push('Controller: niet actief (geen verbinding of module niet geladen)');
      lines.push('');
    }
  }
  appendRealDeviceBlocks(lines, s);
  const devices = Array.isArray(s.devices) ? s.devices : [];
  if (!devices.length) lines.push('Geen BLE-advertenties in de laatste Concept2-scan geregistreerd.');
  devices.forEach((d, i) => {
    lines.push('#' + (i + 1) + ' ' + (d.matched ? 'MATCH' : 'geen match'));
    lines.push('  ID: ' + (d.deviceIdMasked || '-'));
    lines.push('  Naam: ' + (d.name || '-'));
    lines.push('  RSSI: ' + (d.rssi == null ? '-' : d.rssi + ' dBm'));
    lines.push('  Reden: ' + (d.reason || '-'));
    lines.push('  UUIDs: ' + ((d.uuids && d.uuids.length) ? d.uuids.join(', ') : '(geen UUIDs door Android/plugin doorgegeven)'));
  });
  return lines.join('\n');
}

function v(x) { return (x === null || x === undefined || x === '') ? '-' : String(x); }
function iso(t) { return (typeof t === 'number' && isFinite(t)) ? new Date(t).toISOString() : '-'; }
function fmtCounts(o) {
  if (!o || typeof o !== 'object') return '-';
  const k = Object.keys(o);
  return k.length ? k.map((x) => x + '=' + o[x]).join(', ') : '-';
}
/* Real-device diagnostic blokken. Alleen weergave van reeds bestaande waarden. Fail-open. */
export function appendRealDeviceBlocks(lines, s) {
  try {
    const m = s && s.multiplexed;
    lines.push('--- Multiplexed packets (CE060080) ---');
    if (!m) { lines.push('Geen multiplexed diagnostiek beschikbaar'); }
    else {
      lines.push('Totaal multiplexed notifications: ' + (m.totalNotifications || 0));
      lines.push('Globale multiplexed seq: ' + v(m.globalSeq));
      const by = m.byId || {};
      const e31 = by['0x31'], e32 = by['0x32'];
      lines.push('0x31: ' + (e31 ? e31.count : 0) + 'x · laatste seq ' + v(e31 && e31.lastSeq) + ' · laatste ' + iso(e31 && e31.lastAt));
      lines.push('0x32: ' + (e32 ? e32.count : 0) + 'x · laatste seq ' + v(e32 && e32.lastSeq) + ' · laatste ' + iso(e32 && e32.lastAt));
      Object.keys(by).filter((k) => k !== '0x31' && k !== '0x32').forEach((k) => {
        lines.push('Overig ' + k + ': ' + by[k].count + 'x · laatste seq ' + v(by[k].lastSeq));
      });
      lines.push('Decoded/failures/unknown: ' + (m.decoded || 0) + '/' + (m.decodeFailures || 0) + '/' + (m.unknownIds || 0));
      lines.push('--- Laatste echte 0x31 General Status ---');
      const l = m.last31;
      if (!l) lines.push('Nog geen 0x31 gedecodeerd');
      else {
        const f = l.fields || {};
        lines.push('seq ' + v(l.seq) + ' · ontvangen ' + iso(l.at));
        ['elapsedTimeS', 'distanceM', 'workoutType', 'workoutState', 'rowingState', 'workoutDuration', 'workoutDurationType', 'intervalType', 'dragFactor']
          .forEach((k) => lines.push('  ' + k + ': ' + v(f[k])));
      }
      const l2 = m.last32;
      lines.push('Laatste echte 0x32: ' + (l2 ? ('seq ' + v(l2.seq) + ' · ' + iso(l2.at)) : '-'));
    }
    lines.push('');
    const lc = s && s.lifecycle;
    const vc = lc && lc.verify;
    lines.push('--- Verify-aanroepen (sequence-correlatie) ---');
    if (!vc) lines.push('-');
    else {
      lines.push('Aanroepen: ' + (vc.calls || 0) + ' · waarvan laatste 0x31 vóór frame-acceptatie: ' + (vc.callsWith31BeforeAcceptance || 0));
      const x = vc.last;
      if (x) {
        lines.push('Laatste aanroep: ' + iso(x.at) + ' · getriggerd door ' + v(x.triggeredByPacket));
        lines.push('  mux global seq bij aanroep: ' + v(x.muxGlobalSeqAtCall));
        lines.push('  laatste 0x31 seq / 0x32 seq bij aanroep: ' + v(x.last31SeqAtCall) + ' / ' + v(x.last32SeqAtCall));
        lines.push('  laatste 0x31 vóór frame-acceptatie: ' + v(x.last31BeforeFrameAcceptance));
        lines.push('  controller telemetry seq: ' + v(x.controllerTelemetrySeq) + ' · resultaat: ' + v(x.reason));
      }
    }
    lines.push('');
    const cn = lc && lc.canonical;
    lines.push('--- Canonical measurement → execution ---');
    lines.push('tkErgOnCanonicalMeasurement bereikt: ' + (cn ? (cn.totalReached || 0) : 0) + 'x');
    const c = cn && cn.last;
    if (c) {
      lines.push('Laatste: seq ' + v(c.seq) + ' · ' + iso(c.at) + ' · ex ' + v(c.exId));
      lines.push('  machineType ' + v(c.machineType) + ' · distanceM ' + v(c.distanceM) + ' · elapsedTimeS ' + v(c.elapsedTimeS));
      lines.push('  pace500 ' + v(c.pace500M) + ' · pace1000 ' + v(c.pace1000M) + ' · watts ' + v(c.watts) + ' · strokeRate ' + v(c.strokeRateSPM));
      lines.push('  workoutState ' + v(c.workoutState) + ' · intervalNumber ' + v(c.intervalNumber));
    }
    lines.push('');
    lines.push('--- Lifecycle (observatie) ---');
    if (!lc) lines.push('Geen lifecycle-bron beschikbaar');
    else {
      const ex = lc.execution || {};
      lines.push('Execution: training ' + v(ex.trainingRunning) + ' · curT ' + v(ex.curT) + ' · instance ' + v(ex.activeInstanceId) + ' · finishBusy ' + v(ex.finishSessionBusy));
      Object.keys(lc.exercises || {}).forEach((id) => {
        const e = lc.exercises[id] || {};
        const cx = e.connection, rt = e.runtime || {}, pr = e.protocol || {};
        lines.push('Oefening ' + id + ':');
        lines.push('  Concept2 connection: ' + (cx ? ((cx.connected ? 'connected' : (cx.connecting ? 'connecting' : 'disconnected')) + ' · ' + v(cx.machineType)) : '-'));
        lines.push('  Concept2 live/session state: ' + v(e.concept2SessionState));
        lines.push('  Runtime: ' + (rt.present ? ('gen ' + v(rt.generation) + ' · prog ' + v(rt.programmingState)) : 'afwezig'));
        lines.push('  Protocol: ' + v(pr.type) + ' · target ' + v(pr.target) + ' · instance ' + v(pr.instanceId) + ' · vergrendeld ' + v(pr.locked));
        lines.push('  sessionLog.c2: ' + (e.sessionLogC2Exists ? 'ja' : 'nee') + ' · laatste update ' + iso(e.sessionLogC2LastUpdateAt) + ' · cm bereikt ' + v(e.canonicalMeasurementsReached));
      });
      const fi = lc.finish || {};
      lines.push('finishSession() aangeroepen: ' + (fi.calls || 0) + 'x' + (fi.lastCalledAt ? ' · laatst ' + iso(fi.lastCalledAt) : ''));
      Object.keys(fi.perEx || {}).forEach((id) => {
        const f = fi.perEx[id];
        lines.push('  ' + id + ': reden ' + v(f.reason) + ' · pad ' + ((f.path && f.path.length) ? f.path.join(' → ') : '-') + ' · c2 ' + v(f.hasC2) + ' · formulier ' + v(f.hasCardioForm) + (f.cardioFormHas ? ' (' + fmtCounts(f.cardioFormHas) + ')' : ''));
        lines.push('    liveWorkoutToActual bereikt: ' + ((f.path || []).indexOf('liveWorkoutToActual_reached') !== -1 ? 'ja' : 'nee'));
      });
    }
    lines.push('');
  } catch (_) { lines.push('(diagnostiek-blok kon niet worden opgebouwd)'); }
  return lines;
}

export function installDeveloperMode(options = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;
  const getTransport = typeof options.getTransport === 'function'
    ? options.getTransport
    : () => window.TKDeviceTransport || null;
  let enabled = false;
  let panel = null;
  let button = null;
  let output = null;
  let refreshTimer = null;
  let holdTimer = null;

  try { enabled = window.localStorage.getItem(STORAGE_KEY) === '1'; } catch (_) {}

  function persist() {
    try {
      if (enabled) window.localStorage.setItem(STORAGE_KEY, '1');
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
  }

  function currentText() {
    return diagnosticsToText(buildDiagnosticsSnapshot(getTransport()));
  }

  function refresh() {
    if (output) output.textContent = currentText();
  }

  async function copyDiagnostics() {
    const text = currentText();
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        return true;
      } catch (_) { return false; }
    }
  }

  function closePanel() {
    if (panel) panel.style.display = 'none';
    if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; }
  }

  function openPanel() {
    if (!enabled) return;
    ensureUi();
    panel.style.display = 'flex';
    refresh();
    if (!refreshTimer) refreshTimer = setInterval(refresh, 500);
  }

  function ensureUi() {
    if (!enabled || button) return;
    button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'DEV';
    button.setAttribute('aria-label', 'Developer diagnostics');
    Object.assign(button.style, {
      position: 'fixed', right: '12px', bottom: '84px', zIndex: '2147483645',
      border: '0', borderRadius: '999px', padding: '9px 12px', fontWeight: '800',
      fontSize: '12px', background: '#111827', color: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,.28)'
    });
    button.addEventListener('click', openPanel);

    panel = document.createElement('div');
    Object.assign(panel.style, {
      display: 'none', position: 'fixed', inset: '0', zIndex: '2147483646',
      background: 'rgba(0,0,0,.55)', alignItems: 'flex-end', justifyContent: 'center'
    });
    const card = document.createElement('div');
    Object.assign(card.style, {
      width: '100%', maxHeight: '82vh', overflow: 'hidden', background: '#fff', color: '#111827',
      borderRadius: '22px 22px 0 0', padding: '18px', boxSizing: 'border-box',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    });
    const header = document.createElement('div');
    Object.assign(header.style, { display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' });
    const title = document.createElement('strong');
    title.textContent = 'Developer mode · Concept2 BLE';
    title.style.flex = '1';
    const refreshBtn = document.createElement('button');
    refreshBtn.textContent = 'Ververs';
    const copyBtn = document.createElement('button');
    copyBtn.textContent = 'Kopieer';
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Sluit';
    [refreshBtn, copyBtn, closeBtn].forEach((b) => Object.assign(b.style, {
      border: '1px solid #d1d5db', borderRadius: '10px', padding: '8px 10px', background: '#fff', fontWeight: '700'
    }));
    refreshBtn.addEventListener('click', refresh);
    copyBtn.addEventListener('click', async () => {
      const ok = await copyDiagnostics();
      copyBtn.textContent = ok ? 'Gekopieerd' : 'Kopiëren mislukt';
      setTimeout(() => { copyBtn.textContent = 'Kopieer'; }, 1400);
    });
    closeBtn.addEventListener('click', closePanel);
    header.append(title, refreshBtn, copyBtn, closeBtn);

    const hint = document.createElement('div');
    hint.textContent = 'Start in Trainingskompas normaal “Apparaat koppelen”. Dit scherm leest alleen diagnostiek uit en start zelf geen scan.';
    Object.assign(hint.style, { fontSize: '13px', lineHeight: '1.4', color: '#4b5563', marginBottom: '10px' });

    output = document.createElement('pre');
    Object.assign(output.style, {
      margin: '0', padding: '12px', borderRadius: '12px', background: '#f3f4f6',
      fontSize: '12px', lineHeight: '1.45', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      overflow: 'auto', maxHeight: '58vh', userSelect: 'text'
    });
    card.append(header, hint, output);
    panel.appendChild(card);
    panel.addEventListener('click', (e) => { if (e.target === panel) closePanel(); });
    document.body.append(button, panel);
  }

  function destroyUi() {
    closePanel();
    if (button) button.remove();
    if (panel) panel.remove();
    button = null; panel = null; output = null;
  }

  function setEnabled(value) {
    enabled = !!value;
    persist();
    if (enabled) ensureUi(); else destroyUi();
    return enabled;
  }

  function toggle() { return setEnabled(!enabled); }

  // Geheime, niet-interceptende gesture: houd de rechterbovenhoek 2,6 s ingedrukt.
  // Normale tikken blijven onaangetast; alleen een lange hold toggelt developer mode.
  document.addEventListener('pointerdown', (e) => {
    if (e.clientX < window.innerWidth - HOTSPOT_PX || e.clientY > HOTSPOT_PX) return;
    if (holdTimer) clearTimeout(holdTimer);
    holdTimer = setTimeout(() => { holdTimer = null; toggle(); }, HOLD_MS);
  }, { passive: true });
  function cancelHold() { if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; } }
  document.addEventListener('pointerup', cancelHold, { passive: true });
  document.addEventListener('pointercancel', cancelHold, { passive: true });
  document.addEventListener('pointermove', (e) => {
    if (!holdTimer) return;
    if (e.clientX < window.innerWidth - HOTSPOT_PX || e.clientY > HOTSPOT_PX) cancelHold();
  }, { passive: true });

  const api = {
    isEnabled: () => enabled,
    enable: () => setEnabled(true),
    disable: () => setEnabled(false),
    toggle,
    open: openPanel,
    close: closePanel,
    snapshot: () => buildDiagnosticsSnapshot(getTransport()),
    text: currentText,
      // Gate B.5: index.html registreert hier de ACTIEVE programming-controller.
      setProgrammingSource,
    setLifecycleSource
  };
  window.TKDeveloperMode = api;
  if (enabled) ensureUi();
  return api;
}

export const __test = { STORAGE_KEY, HOLD_MS, HOTSPOT_PX };

function autoInstallDeveloperMode() {
  try {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (window.TKDeveloperMode) return;
    installDeveloperMode({ getTransport: () => window.TKDeviceTransport || null });
  } catch (_) {}
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'complete' || document.readyState === 'interactive') autoInstallDeveloperMode();
  else document.addEventListener('DOMContentLoaded', autoInstallDeveloperMode, { once: true });
}
