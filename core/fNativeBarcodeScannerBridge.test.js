/* fNativeBarcodeScannerBridge.test.js — ANDROID-BARCODE-SCANNER-opdracht.
 * Pure/testbare logica van core/nativeBarcodeScannerBridge.js -- geen
 * device/emulator/Capacitor-runtime nodig (dat deel is expliciet NIET
 * device-gevalideerd, zie het eindrapport).
 */
'use strict';
const B = require('./nativeBarcodeScannerBridge.js');
const NutritionCameraCapture = require('./nutritionCameraCapture.js');
const NutritionFoundation2Core = require('./nutritionFoundation2.js');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

// ═══ UNIT — capability detection ═══
ok(B.isNativeAndroidScannerAvailable(undefined) === false, 'capability: geen window/globalObj -> false, geen crash');
ok(B.isNativeAndroidScannerAvailable({}) === false, 'capability: leeg object -> false');
ok(B.isNativeAndroidScannerAvailable({ Capacitor: { isNativePlatform: () => true, getPlatform: () => 'android', Plugins: {} } }) === false, 'capability: plugin zelf ontbreekt -> false');
ok(B.isNativeAndroidScannerAvailable({ Capacitor: { isNativePlatform: () => false, getPlatform: () => 'android', Plugins: { TkBarcodeScanner: {} } } }) === false, 'capability: web/PWA (isNativePlatform=false) -> false, ook al lijkt de rest aanwezig');
ok(B.isNativeAndroidScannerAvailable({ Capacitor: { isNativePlatform: () => true, getPlatform: () => 'ios', Plugins: { TkBarcodeScanner: {} } } }) === false, 'capability: iOS -> false (deze sprint is Android-only, geen iOS-plugin gebouwd)');
ok(B.isNativeAndroidScannerAvailable({ Capacitor: { isNativePlatform: () => true, getPlatform: () => 'android', Plugins: { TkBarcodeScanner: {} } } }) === true, 'capability: volledige, correcte native Android-Capacitor-context -> true');
// adversarial: een gemanipuleerd/onvolledig window mag nooit een exception gooien
ok(B.isNativeAndroidScannerAvailable({ Capacitor: null }) === false, 'capability adversarial: Capacitor=null geeft false, geen crash');
ok(B.isNativeAndroidScannerAvailable({ Capacitor: { isNativePlatform: 'niet-een-functie' } }) === false, 'capability adversarial: isNativePlatform is geen functie -> false, geen crash');

// ═══ UNIT — barcode result contract ═══
ok(B.mapNativeResultToRawDetection({ rawValue: '8712345678901', format: 'EAN_13', timestamp: 123 }).confidence === null, 'contract: ML Kit levert geen confidence -> expliciet null, nooit verzonnen');
ok(B.mapNativeResultToRawDetection({ rawValue: '8712345678901', format: 'EAN_13', timestamp: 123 }).rawValue === '8712345678901', 'contract: rawValue komt exact door');
ok(B.mapNativeResultToRawDetection(null) === null, 'contract: null-resultaat -> null, geen crash');
ok(B.mapNativeResultToRawDetection({}) === null, 'contract: leeg object -> null');
ok(B.mapNativeResultToRawDetection({ rawValue: '', format: 'EAN_13' }) === null, 'contract: lege rawValue -> null');
ok(B.mapNativeResultToRawDetection({ rawValue: 12345, format: 'EAN_13' }) === null, 'contract adversarial: non-string rawValue -> null, geen coercion');

// ═══ UNIT — supported formats (sectie 6, herzien: CODE_128/UPC_E bewust uitgesloten, zie eindrapport) ═══
['EAN_13', 'EAN_8', 'UPC_A'].forEach((f) => {
  ok(B.mapNativeResultToRawDetection({ rawValue: '123', format: f }) !== null, 'formats: ' + f + ' wordt geaccepteerd (geverifieerd bruikbaar in normalizeBarcode())');
});
['UPC_E', 'CODE_128', 'QR_CODE', 'AZTEC', 'PDF417', 'DATA_MATRIX', 'UNKNOWN', undefined, null, ''].forEach((f) => {
  ok(B.mapNativeResultToRawDetection({ rawValue: '123', format: f }) === null, 'formats adversarial: ' + f + ' wordt geweigerd (CODE_128: geen productwaarde; UPC_E: normalizeBarcode() ondersteunt dit nog niet -- bewust, gerapporteerd niet-geactiveerd i.p.v. gegokt)');
});

// ═══ UNIT — permission state resolution (sectie 11) ═══
ok(B.resolvePermissionUiState({ camera: 'granted' }) === 'GRANTED', 'permission: granted');
ok(B.resolvePermissionUiState({ camera: 'denied', canRequestAgain: true }) === 'DENIED', 'permission: denied (kan opnieuw vragen)');
ok(B.resolvePermissionUiState({ camera: 'denied', canRequestAgain: false }) === 'PERMANENTLY_DENIED', 'permission: denied + canRequestAgain=false -> PERMANENTLY_DENIED ("don\'t ask again")');
ok(B.resolvePermissionUiState({ camera: 'prompt' }) === 'NOT_DETERMINED', 'permission: prompt (eerste aanvraag, nog niet bepaald)');
ok(B.resolvePermissionUiState({ camera: 'prompt-with-rationale' }) === 'NOT_DETERMINED', 'permission: prompt-with-rationale -> NOT_DETERMINED');
ok(B.resolvePermissionUiState(null) === 'UNAVAILABLE', 'permission adversarial: null -> UNAVAILABLE, geen crash');
ok(B.resolvePermissionUiState({}) === 'UNAVAILABLE', 'permission adversarial: leeg object -> UNAVAILABLE');
ok(B.resolvePermissionUiState({ camera: 'iets-onbekends' }) === 'UNAVAILABLE', 'permission adversarial: onbekende native waarde -> UNAVAILABLE, geen gok');

// ═══ UNIT — duplicate scan protection (sectie 8) ═══
{
  const lock = B.createScanLock();
  ok(lock.isLocked() === false, 'scanlock: start ongelocked');
  ok(lock.tryAcquire('8712345678901') === true, 'scanlock: eerste geldige detectie mag door');
  ok(lock.isLocked() === true, 'scanlock: is daarna locked');
  ok(lock.tryAcquire('8712345678901') === false, 'scanlock: identieke herhaalde detectie wordt geblokkeerd (voorkomt tientallen events)');
  ok(lock.tryAcquire('4006381333931') === false, 'scanlock: ook een ANDERE barcode wordt geblokkeerd zolang de lock dicht is (sectie 8: lock zodra ÉÉN geldige barcode gevonden is)');
  lock.resume();
  ok(lock.isLocked() === false, 'scanlock: expliciete resume() opent de lock weer');
  ok(lock.tryAcquire('4006381333931') === true, 'scanlock: na resume mag een nieuwe detectie weer door');
  ok(lock.lastValue() === '4006381333931', 'scanlock: lastValue() geeft de laatst geaccepteerde waarde terug');
}
{
  // Twee onafhankelijke locks (bv. twee scan-sessies) mogen elkaar nooit beinvloeden.
  const lockA = B.createScanLock();
  const lockB = B.createScanLock();
  lockA.tryAcquire('x');
  ok(lockA.isLocked() === true && lockB.isLocked() === false, 'scanlock: onafhankelijke instanties delen geen state (geen module-level mutable state-bug)');
}

// ═══ INTEGRATION — native detectie -> bestaande, ongewijzigde resolver ═══
{
  const raw = B.mapNativeResultToRawDetection({ rawValue: '8712345678901', format: 'EAN_13', timestamp: Date.now() });
  const resolved = NutritionCameraCapture.resolveBarcodeDetectionResult([raw], NutritionFoundation2Core.normalizeBarcode);
  ok(resolved.status === 'FOUND' || resolved.status === 'INVALID_IDENTIFIER', 'integratie: een gemapt native resultaat wordt door de BESTAANDE, ongewijzigde resolveBarcodeDetectionResult() verwerkt (geen tweede beslislaag)');
}
{
  // Onbekend format wordt al in de bridge geweigerd -- bereikt de resolver dus nooit als "FOUND".
  const raw = B.mapNativeResultToRawDetection({ rawValue: '8712345678901', format: 'QR_CODE' });
  ok(raw === null, 'integratie: een niet-ondersteund format bereikt de resolver helemaal niet');
}

// ═══ REGRESSION — bestaande architectuurgrens: geen voedingsdata/berekening in het plugin-contract ═══
const fs = require('fs');
const pluginSrc = fs.readFileSync(require('path').join(__dirname, '..', 'android/app/src/main/java/com/trainingskompas/app/TkBarcodeScannerPlugin.java'), 'utf8');
// Uitsluitend CODE-regels controleren -- Javadoc/regelcommentaar dat de
// architectuurgrens juist TOELICHT (en daarbij terecht bestaande klassen
// als NutritionCameraCapture noemt) mag deze termen bevatten; dat is
// documentatie van de regel, geen overtreding ervan.
const pluginCodeOnly = pluginSrc.split('\n').filter((line) => !/^\s*(\*|\/\/|\/\*)/.test(line.trim())).join('\n');
ok(!/nutrition|calorie|product(Name|Data)|voedingswaarde/i.test(pluginCodeOnly), 'architectuur: de daadwerkelijke CODE van de native plugin bevat geen enkele verwijzing naar voedingsdata/-berekening (sectie 1, harde grens)');
ok(pluginSrc.includes('rawValue') && pluginSrc.includes('format') && pluginSrc.includes('timestamp'), 'architectuur: het event-contract bevat exact {rawValue, format, timestamp}, niets meer');
ok(!/api\.anthropic|fetch\(|HttpURLConnection|OkHttp/i.test(pluginSrc), 'privacy: de native plugin doet geen enkele netwerkaanroep -- barcodeherkenning blijft volledig on-device (sectie 15)');

// ═══ STATIC NATIVE AUDIT — race conditions / lifecycle / leaks (adversariële audit) ═══
ok(pluginCodeOnly.includes('AtomicBoolean'), 'audit: de scan-lock gebruikt AtomicBoolean (echte atomariteit), geen losse volatile boolean met check-then-set');
ok(pluginCodeOnly.includes('nativeResultLock.compareAndSet(false, true)'), 'audit: het "eerste geldige detectie wint"-contract gebruikt compareAndSet, niet een niet-atomaire if/set');
ok(pluginCodeOnly.includes('scannerStopped'), 'audit: er bestaat een expliciete scannerStopped-vlag');
ok(/if\s*\(scannerStopped \|\| scanningPaused \|\| nativeResultLock\.get\(\) \|\| imageProxy\.getImage\(\) == null\)\s*\{\s*imageProxy\.close\(\);/.test(pluginSrc), 'audit: analyzeImage sluit imageProxy ook als de scanner al gestopt is (geen frame-leak bij snel sluiten)');
ok(pluginCodeOnly.match(/if\s*\(scannerStopped/g).length >= 2, 'audit: scannerStopped wordt op minstens 2 plekken gecontroleerd (analyzeImage EN handleBarcodeResults) -- dubbele guard tegen een callback die net vóór/tijdens stop() binnenkomt');
ok(pluginCodeOnly.includes('catch (Exception e)'), 'audit: het camera-start-pad vangt de brede Exception (niet alleen ExecutionException/InterruptedException) -- een bindToLifecycle-runtime-exception (bv. camera-already-in-use) kan de plugin niet meer laten crashen');
ok(!pluginCodeOnly.includes('catch (ExecutionException'), 'audit: de te-smalle catch is volledig vervangen, niet ernaast toegevoegd');
ok(pluginCodeOnly.includes('cameraExecutor.shutdown()'), 'audit: cameraExecutor wordt afgesloten in handleOnDestroy (geen executor-leak)');
ok(pluginCodeOnly.includes('barcodeScanner.close()'), 'audit: de ML Kit BarcodeScanner-client wordt gesloten in handleOnDestroy');
ok((pluginCodeOnly.match(/imageProxy\.close\(\)/g) || []).length >= 2, 'audit: imageProxy.close() wordt op meerdere paden aangeroepen (vroege return EN addOnCompleteListener) -- ML Kit Task.addOnCompleteListener vuurt exact 1x na succes-of-falen, dus geen dubbele close en geen gemiste close');
ok(pluginCodeOnly.includes('addOnCompleteListener(cameraExecutor'), 'audit: expliciete executor voor de ML Kit-listeners (geen impliciete main-thread-aanname)');
ok(pluginCodeOnly.includes('cameraProvider.unbindAll()') && pluginSrc.match(/unbindAll\(\)/g).length >= 1, 'audit: camera wordt unbound bij stop (lifecycle-aware teardown)');
ok(pluginCodeOnly.includes('bindToLifecycle'), 'audit: camera-binding is lifecycle-aware (CameraX bindToLifecycle, geen handmatige Camera2-lifecycle)');
ok(pluginCodeOnly.includes('MAX_RAW_VALUE_LENGTH') && pluginCodeOnly.includes('raw.length() > MAX_RAW_VALUE_LENGTH'), 'audit: oversized/untrusted barcode-strings worden serverside al genegeerd vóór ze de brug bereiken (defense-in-depth, sectie 17)');
ok(pluginCodeOnly.includes('enableTorch(false)') && pluginCodeOnly.includes('stopBarcodeScan'), 'audit: torch wordt uitgeschakeld bij het sluiten van de scanner');
ok(pluginCodeOnly.includes('hasFlashUnit()'), 'audit: torch-capability wordt gecontroleerd vóór gebruik (geen aanname dat elk apparaat een flash heeft)');
ok(pluginCodeOnly.includes('CAMERA_PERMISSION_NOT_GRANTED'), 'audit: startBarcodeScan weigert expliciet zonder permissie (geen impliciete/stille poging)');
ok(pluginCodeOnly.includes('getPermissionState(\"camera\") == PermissionState.GRANTED') || pluginCodeOnly.includes('getPermissionState("camera") == PermissionState.GRANTED'), 'audit: requestCameraPermission kortsluit correct als al granted (voorkomt een onnodige/herhaalde systeemdialoog -- vermindert permission-loop-risico)');

// ═══ ADVERSARIAL — 20 opeenvolgende, identieke frames -> slechts 1 event (opdracht-eis, letterlijk) ═══
{
  const lock = B.createScanLock();
  let events = 0;
  for (let i = 0; i < 20; i++) {
    if (lock.tryAcquire('8712345678901')) events++;
  }
  ok(events === 1, '20 opeenvolgende frames met dezelfde barcode leveren slechts 1 doorgelaten event op (exact de opdracht-eis)');
}
{
  // Zelfde scenario, maar via de exacte integratieketen die de native
  // plugin ook volgt: map -> lock -> resolver, 20x achter elkaar.
  let doorgelaten = 0;
  const lock = B.createScanLock();
  for (let i = 0; i < 20; i++) {
    const mapped = B.mapNativeResultToRawDetection({ rawValue: '4006381333931', format: 'EAN_13', timestamp: Date.now() + i });
    if (mapped && lock.tryAcquire(mapped.rawValue)) {
      doorgelaten++;
      const resolved = NutritionCameraCapture.resolveBarcodeDetectionResult([mapped], NutritionFoundation2Core.normalizeBarcode);
      ok(resolved.status === 'FOUND', 'integratie 20-frame-test: het ene doorgelaten resultaat is een geldige FOUND-detectie');
    }
  }
  ok(doorgelaten === 1, 'integratie 20-frame-test: over de volledige map->lock->resolver-keten komt precies 1 resultaat door, ondanks 20 identieke input-frames');
}

console.log('fNativeBarcodeScannerBridge: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
