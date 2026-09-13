import assert from 'node:assert/strict';
import { buildDiagnosticsSnapshot, diagnosticsToText, __test } from './src/developerMode.mjs';

const transport = {
  VERSION: 'concept2_native.v1',
  getStatus: () => ({ state: 'scanning', deviceId: null, machineType: 'unknown' }),
  getPermissionState: () => 'granted',
  getLastDiscoveryDiagnostics: () => ({
    permissionState: 'granted',
    advertisementsSeen: 3,
    devices: [
      { deviceIdMasked: '…1234', name: 'PM5', rssi: -54, uuids: ['ce060030-x'], matched: true, reason: 'concept2_service_uuid' },
      { deviceIdMasked: '…5678', name: 'Other', rssi: -80, uuids: [], matched: false, reason: 'no_concept2_service_uuid' }
    ]
  })
};

const snap = buildDiagnosticsSnapshot(transport);
assert.equal(snap.transportAvailable, true);
assert.equal(snap.transportVersion, 'concept2_native.v1');
assert.equal(snap.status.state, 'scanning');
assert.equal(snap.permissionState, 'granted');
assert.equal(snap.advertisementsSeen, 3);
assert.equal(snap.matchedDevices, 1);
assert.equal(snap.devices[0].deviceIdMasked, '…1234');
assert.equal('deviceId' in snap.devices[0], false, 'raw device id must never be exposed');
const text = diagnosticsToText(snap);
assert.match(text, /BLE advertenties gezien: 3/);
assert.match(text, /Concept2 matches: 1/);
assert.match(text, /ce060030-x/);
assert.doesNotMatch(text, /AA:BB:CC/);
assert.equal(__test.HOLD_MS >= 2500, true);
assert.equal(__test.HOTSPOT_PX <= 100, true);
// Fase B (Connection Observability): verbindingsdiagnostiek in snapshot + tekst, zonder payload
const t2 = Object.assign({}, transport, {
  getConnectionDiagnostics() {
    return { state: 'disconnected', deviceIdMasked: '…1234', connectedAt: 1700000000000, disconnectedAt: 1700000060000,
      lastDisconnectReason: 'PLUGIN_DISCONNECT:unknown_native_disconnect',
      subscriptions: [{ uuid: 'ce060035-x', key: 'strokeData', attempted: true, ok: true, at: 1700000001000, error: null },
                      { uuid: 'ce06003c-x', key: 'forceCurve', attempted: true, ok: false, at: 1700000001100, error: 'Characteristic not found.' }],
      totals: { subscriptionsOk: 1, subscriptionsFailed: 1, notifications: 7 },
      notifications: { 'ce060035-x': { count: 7, lastAt: 1700000050000 } } };
  }
});
const snap2 = buildDiagnosticsSnapshot(t2);
assert.equal(snap2.connection.lastDisconnectReason, 'PLUGIN_DISCONNECT:unknown_native_disconnect');
assert.equal(snap2.connection.totals.notifications, 7);
const text2 = diagnosticsToText(snap2);
assert.match(text2, /--- Verbinding ---/);
assert.match(text2, /lastDisconnectReason: PLUGIN_DISCONNECT:unknown_native_disconnect/);
assert.match(text2, /Subscriptions ok\/failed: 1\/1/);
assert.match(text2, /FAIL forceCurve ce06003c-x — Characteristic not found\./);
assert.match(text2, /Notifications totaal: 7/);
assert.match(text2, /ce060035-x: 7x, laatste 2023-11-14T22:14:10\.000Z/);
assert.doesNotMatch(text2, /hex|payload|bytes/i, 'geen payload in developer-tekst');
assert.equal('connection' in buildDiagnosticsSnapshot(transport), true, 'snapshot zonder getConnectionDiagnostics blijft geldig (connection=null)');
assert.equal(buildDiagnosticsSnapshot(transport).connection, null);
console.log('DeveloperMode: RESULTAAT: 24 geslaagd, 0 mislukt');
