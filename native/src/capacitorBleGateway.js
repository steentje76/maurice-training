/*
 * CapacitorBleGateway — dunne binding van @capacitor-community/bluetooth-le (BleClient)
 * naar het BleGateway-interface dat NativeConcept2BleTransport verwacht.
 *
 * Bevat GEEN Concept2-specifieke parsing: alleen transport (scan/connect/notify/read).
 * Alle Concept2-UUID's, capture-mode en byte-parsers wonen in de adapter/core.
 *
 * Permissie-opmerking (Android): @capacitor-community/bluetooth-le vraagt de
 * runtime BLE-permissie bij de EERSTE scan (requestLEScan), niet bij app-start.
 * Een betrouwbare losse "permission granted?"-query bestaat niet in alle
 * plugin-versies; daarom rapporteert checkPermission() optimistisch 'granted'
 * en verschijnt de echte OS-dialoog bij scan. Een geweigerde permissie laat de
 * scan falen -> de adapter surft dat door als fout (nooit fake 'connected').
 */
import { BleClient } from '@capacitor-community/bluetooth-le';

function lc(u) { return String(u || '').toLowerCase(); }

export function makeCapacitorBleGateway(options) {
  options = options || {};
  let initialized = false;

  async function ensureInit() {
    if (initialized) return;
    // androidNeverForLocation: we scannen op service-UUID's, geen locatie-afleiding.
    await BleClient.initialize({ androidNeverForLocation: true });
    initialized = true;
  }

  return {
    async isEnabled() {
      try { await ensureInit(); return await BleClient.isEnabled(); }
      catch (e) { return false; }
    },
    async checkPermission() {
      // Zie module-comment: geen betrouwbare pre-check; echte prompt bij scan.
      try { await ensureInit(); return 'granted'; } catch (e) { return 'denied'; }
    },
    async requestPermission() {
      // De OS-permissie wordt door de plugin bij requestLEScan afgedwongen.
      try { await ensureInit(); return 'granted'; } catch (e) { return 'denied'; }
    },
    async scan(serviceUuids, onResult /*, opts */) {
      await ensureInit();
      const services = (serviceUuids || []).map(lc);
      await BleClient.requestLEScan(
        { services, allowDuplicates: false },
        (result) => {
          if (!result || !result.device) return;
          onResult({
            deviceId: result.device.deviceId,
            name: result.localName || result.device.name || null,
            rssi: (typeof result.rssi === 'number') ? result.rssi : null
          });
        }
      );
    },
    async stopScan() {
      try { await BleClient.stopLEScan(); } catch (e) { /* al gestopt */ }
    },
    async connect(deviceId, onDisconnect) {
      await ensureInit();
      await BleClient.connect(deviceId, (id) => { try { onDisconnect && onDisconnect(id); } catch (e) {} });
    },
    async disconnect(deviceId) {
      try { await BleClient.disconnect(deviceId); } catch (e) { /* mogelijk al weg */ }
    },
    async getServices(deviceId) {
      try { return await BleClient.getServices(deviceId); } catch (e) { return []; }
    },
    async startNotifications(deviceId, service, characteristic, onValue) {
      await BleClient.startNotifications(deviceId, lc(service), lc(characteristic), (value) => {
        // value is een DataView -> rechtstreeks door naar de adapter (capture/decoder).
        try { onValue(value); } catch (e) {}
      });
    },
    async stopNotifications(deviceId, service, characteristic) {
      try { await BleClient.stopNotifications(deviceId, lc(service), lc(characteristic)); } catch (e) {}
    },
    async read(deviceId, service, characteristic) {
      return await BleClient.read(deviceId, lc(service), lc(characteristic));
    },
    async readRssi(deviceId) {
      try { return await BleClient.getBondedDevices ? await BleClient.readRssi(deviceId) : null; }
      catch (e) { return null; }
    }
  };
}
