/*
 * bootstrap.js — native entry (esbuild-bundeltarget -> www/native-transport.js)
 *
 * Registreert window.TKDeviceTransport UITSLUITEND wanneer de app echt native
 * draait (Capacitor native platform) en de BLE-plugin beschikbaar is.
 * Op web/PWA gebeurt NIETS -> de bestaande eerlijke melding ("live koppeling in
 * de app-versie") blijft staan. GEEN fake transport, GEEN fake connection.
 *
 * Concept2Live komt als UMD-global (window.Concept2Live) uit core/concept2Live.js,
 * dat al via <script> in index.html geladen wordt. De adapter wordt hier
 * gebundeld en gekoppeld aan de Capacitor BLE-gateway.
 */
import { Capacitor } from '@capacitor/core';
import { makeCapacitorBleGateway } from './capacitorBleGateway.js';
import NT from './nativeConcept2BleTransport.js';

function registerTransport() {
  try {
    if (!Capacitor || typeof Capacitor.isNativePlatform !== 'function' || !Capacitor.isNativePlatform()) {
      // web/PWA: geen native BLE -> niets registreren (eerlijke UI blijft).
      return;
    }
    var CL = (typeof window !== 'undefined') ? window.Concept2Live : null;
    if (!CL) {
      // concept2Live nog niet geladen -> kort opnieuw proberen.
      if (typeof setTimeout !== 'undefined') setTimeout(registerTransport, 150);
      return;
    }
    if (window.TKDeviceTransport && window.TKDeviceTransport.__native) return; // idempotent

    var gateway = makeCapacitorBleGateway();
    var transport = NT.makeNativeConcept2BleTransport({ gateway: gateway, concept2Live: CL });
    transport.__native = true;

    window.TKDeviceTransport = transport;
    // capture-mode is bereikbaar via hetzelfde object (debug-scherm kan
    // transport.enableCapture()/exportCapture() aanroepen).
    window.TKDeviceCapture = transport;

    // ververs de sync permissie-cache alvast (bluetooth aan/uit + permissie),
    // zodat getPermissionState() bij [Apparaat koppelen] accuraat is.
    try { if (typeof transport.refreshPermissionState === 'function') transport.refreshPermissionState(); } catch (e) {}

    try { window.dispatchEvent(new Event('tk-transport-ready')); } catch (e) {}
    // eslint-disable-next-line no-console
    if (window.TK_DEBUG) console.log('[TK] NativeConcept2BleTransport geregistreerd (' + transport.VERSION + ')');
  } catch (e) {
    // Nooit de app breken door bootstrap-fouten; web-fallback blijft geldig.
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'complete' || document.readyState === 'interactive') registerTransport();
  else document.addEventListener('DOMContentLoaded', registerTransport);
} else {
  registerTransport();
}
