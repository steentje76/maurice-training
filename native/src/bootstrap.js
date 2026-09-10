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
import { makeNativeHeartRateBleTransport } from './nativeHeartRateBleTransport.js';
import { makeNativeCyclingPowerBleTransport } from './nativeCyclingPowerBleTransport.js';
import { makeNativeCyclingSpeedCadenceBleTransport } from './nativeCyclingSpeedCadenceBleTransport.js';

function registerCscTransport() {
  try {
    if (!Capacitor || typeof Capacitor.isNativePlatform !== 'function' || !Capacitor.isNativePlatform()) return;
    var CSCCore = (typeof window !== 'undefined') ? window.BleCyclingSpeedCadenceCore : null;
    if (!CSCCore) {
      if (typeof setTimeout !== 'undefined') setTimeout(registerCscTransport, 150);
      return;
    }
    if (window.TKCyclingCadenceTransport && window.TKCyclingCadenceTransport.__native) return; // idempotent

    var gateway = makeCapacitorBleGateway();
    window.TKCyclingCadenceTransport = makeNativeCyclingSpeedCadenceBleTransport({ gateway: gateway, bleCscCore: CSCCore });
    if (window.TK_DEBUG) console.log('[TK] NativeCyclingSpeedCadenceBleTransport geregistreerd');
  } catch (e) {
    // Nooit de app breken door bootstrap-fouten; web-fallback blijft geldig.
  }
}

function registerCyclingPowerTransport() {
  try {
    if (!Capacitor || typeof Capacitor.isNativePlatform !== 'function' || !Capacitor.isNativePlatform()) return;
    var CPCore = (typeof window !== 'undefined') ? window.BleCyclingPowerCore : null;
    if (!CPCore) {
      if (typeof setTimeout !== 'undefined') setTimeout(registerCyclingPowerTransport, 150);
      return;
    }
    if (window.TKCyclingPowerTransport && window.TKCyclingPowerTransport.__native) return; // idempotent

    var gateway = makeCapacitorBleGateway();
    window.TKCyclingPowerTransport = makeNativeCyclingPowerBleTransport({ gateway: gateway, bleCyclingPowerCore: CPCore });
    if (window.TK_DEBUG) console.log('[TK] NativeCyclingPowerBleTransport geregistreerd');
  } catch (e) {
    // Nooit de app breken door bootstrap-fouten; web-fallback blijft geldig.
  }
}

function registerHeartRateTransport() {
  try {
    if (!Capacitor || typeof Capacitor.isNativePlatform !== 'function' || !Capacitor.isNativePlatform()) {
      // Web/PWA: geen native BLE -> niets registreren (eerlijke UI blijft, zelfde
      // patroon als het Concept2-transport hieronder).
      return;
    }
    var HRCore = (typeof window !== 'undefined') ? window.BleHeartRateCore : null;
    if (!HRCore) {
      if (typeof setTimeout !== 'undefined') setTimeout(registerHeartRateTransport, 150);
      return;
    }
    if (window.TKHeartRateTransport && window.TKHeartRateTransport.__native) return; // idempotent

    var gateway = makeCapacitorBleGateway();
    window.TKHeartRateTransport = makeNativeHeartRateBleTransport({ gateway: gateway, bleHeartRateCore: HRCore });
    if (window.TK_DEBUG) console.log('[TK] NativeHeartRateBleTransport geregistreerd');
  } catch (e) {
    // Nooit de app breken door bootstrap-fouten; web-fallback blijft geldig.
  }
}

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
  if (document.readyState === 'complete' || document.readyState === 'interactive') { registerTransport(); registerHeartRateTransport(); registerCyclingPowerTransport(); registerCscTransport(); }
  else document.addEventListener('DOMContentLoaded', function () { registerTransport(); registerHeartRateTransport(); registerCyclingPowerTransport(); registerCscTransport(); });
} else {
  registerTransport();
  registerHeartRateTransport();
  registerCyclingPowerTransport();
  registerCscTransport();
}
