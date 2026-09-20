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
      programming: null
  };
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
      lines.push('');
    } else {
      lines.push('--- Workout control (PM5 programmering) ---');
      lines.push('Controller: niet actief (geen verbinding of module niet geladen)');
      lines.push('');
    }
  }
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
    text: currentText
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
