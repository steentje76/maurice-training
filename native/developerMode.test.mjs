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
console.log('DeveloperMode: RESULTAAT: 13 geslaagd, 0 mislukt');
