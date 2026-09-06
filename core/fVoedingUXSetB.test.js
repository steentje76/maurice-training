'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

let pass = 0, fail = 0;
function t(label, fn) {
  try { fn(); pass++; }
  catch (e) { fail++; console.log('MISLUKT:', label, '-', e.message); }
}

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const setBStart = html.indexOf('VOEDING SET B');
const setBJsStart = html.indexOf('VOEDING SET B', html.indexOf('async function voedingRenderOverview'));
const setBJsEnd = html.indexOf('function voedingConfirmGoToMeal');
const jsBlock = html.slice(setBJsStart, setBJsEnd);

// -- Vendor-integriteit (geen node_modules-referenties, geen CDN) -----------
t('Vendor-bestanden bestaan: zxing.min.js, tesseract.min.js', () => {
  assert.strictEqual(fs.existsSync(path.join(__dirname, 'vendor', 'zxing.min.js')), true);
  assert.strictEqual(fs.existsSync(path.join(__dirname, 'vendor', 'tesseract.min.js')), true);
});
t('index.html verwijst niet naar node_modules (productie-build zou dit breken, adversarial)', () => {
  assert.strictEqual(html.includes('node_modules'), false);
});
t('index.html gebruikt uitsluitend lokale core/vendor-paden voor Tesseract-configuratie (geen impliciete CDN-fallback in de wiring)', () => {
  const fnStart = html.indexOf('async function voedingRunRecognitionOnEnter');
  const fnEnd = html.indexOf('function voedingRenderMatch', fnStart);
  const fnBody = html.slice(fnStart, fnEnd);
  assert.strictEqual(fnBody.includes('core/vendor'), true);
});

// -- Geen duplicate runtime: hergebruik van Wave 3/4-modules, geen nieuwe implementatie ----
t('Barcode-scanner hergebruikt NutritionBarcodeRuntime.decodeBarcodeFromImage (geen tweede decoder)', () => {
  const fnStart = html.indexOf('async function voedingRunScanLoop');
  const fnEnd = html.indexOf('\nfunction voedingScannerRetry', fnStart);
  const fnBody = html.slice(fnStart, fnEnd);
  assert.strictEqual(fnBody.includes('NutritionBarcodeRuntime.decodeBarcodeFromImage'), true);
  assert.strictEqual(fnBody.includes('NutritionFoundation2Core.normalizeBarcode'), true);
});
t('OCR-flow hergebruikt NutritionOcrRuntime.extractStructuredNutrientsFromImage + NutritionLabelParser (geen tweede parser)', () => {
  assert.strictEqual(jsBlock.includes('NutritionOcrRuntime.extractStructuredNutrientsFromImage'), true);
  assert.strictEqual(jsBlock.includes('labelParser:NutritionLabelParser'), true);
});
t('Match/conflict-logica hergebruikt NutritionLabelIngestBridge + NutritionMultiSourceVerification (geen eigen vergelijkingslogica)', () => {
  assert.strictEqual(jsBlock.includes('NutritionLabelIngestBridge.processLabelScanAgainstExisting'), true);
  assert.strictEqual(jsBlock.includes('multiSourceVerification:NutritionMultiSourceVerification'), true);
});
t('Custom product/duplicate-detectie hergebruikt NutritionCustomProductService (geen eigen duplicate-logica)', () => {
  assert.strictEqual(jsBlock.includes('NutritionCustomProductService.validateCustomProduct'), true);
  assert.strictEqual(jsBlock.includes('NutritionCustomProductService.detectDuplicateCandidates'), true);
});
t('Correctie-workflow hergebruikt NutritionCrossDomainContract.evaluateCorrectionRequest + canModifyCanonicalRecord (geen eigen VERIFIED-check)', () => {
  assert.strictEqual(jsBlock.includes('NutritionCrossDomainContract.evaluateCorrectionRequest'), true);
  assert.strictEqual(jsBlock.includes('NutritionFoundation2Core.canModifyCanonicalRecord'), true);
});

// -- Geen shadow calculation ------------------------------------------------
t('Nieuw-product-opslag kopieert observaties 1-op-1 uit de OCR-runtime, geen eigen (her)berekening (adversarial)', () => {
  const fnStart = html.indexOf('async function voedingSaveNewProductFromLabel');
  const fnEnd = html.indexOf('\n}', fnStart);
  const fnBody = html.slice(fnStart, fnEnd);
  assert.strictEqual(/[a-z_]+\s*\*\s*\d/i.test(fnBody), false, 'geen vermenigvuldiging/eigen berekening in de persistence-functie');
});

// -- Correctie: additief, geen UPDATE-in-place op bestaande nutrient-waarden --
t('Correctie voegt altijd een NIEUWE nutrient_values-rij toe (additief), nooit een UPDATE op een bestaande rij (KERN, historische reproduceerbaarheid)', () => {
  const fnStart = html.indexOf('async function voedingSubmitCorrection');
  const fnEnd = html.indexOf('\n}', fnStart);
  const fnBody = html.slice(fnStart, fnEnd);
  assert.strictEqual(fnBody.includes('sbPostQ'), true);
  assert.strictEqual(fnBody.includes('sbPatchQ'), false, 'correctie mag nooit een bestaande nutrient-rij patchen/overschrijven');
});

// -- VERIFIED-precedence in de UI --------------------------------------------
t('Correctie-UI toont een expliciete VERIFIED-beschermingsmelding, biedt geen directe overschrijf-actie aan (structurele UI-check)', () => {
  const fnStart = html.indexOf('async function voedingRenderCorrectieForm');
  const fnEnd = html.indexOf('\n}', fnStart);
  const fnBody = html.slice(fnStart, fnEnd);
  assert.strictEqual(fnBody.includes('VERIFIED_PROTECTED'), true);
  assert.strictEqual(fnBody.includes('canonical gegevens worden niet automatisch overschreven') || fnBody.includes('canonical blijft ongewijzigd'), true);
});

// -- Real-device closure: geen browser-native dialogen meer (Blocker 1) ----
t('Nutrition UX bevat GEEN enkele alert()/prompt()/confirm()-aanroep (KERN, adversarial regressie-check tegen browser-popups op een echt Android-toestel)', () => {
  const htmlStart = html.indexOf('VOEDING (Nutrition UX v1)');
  const htmlEnd = html.indexOf('<!-- ═══ TRAINING HUB');
  const htmlBlock = html.slice(htmlStart, htmlEnd);
  const jsBlockFull = html.slice(setBJsStart, html.indexOf('async function voedingSaveManualEntry') + 3000);
  const combined = htmlBlock + jsBlockFull;
  const found = combined.match(/\b(alert|prompt|confirm)\(/g) || [];
  assert.deepStrictEqual(found, [], 'gevonden browser-native dialoog-aanroepen: ' + JSON.stringify(found));
});

// -- Blocker 2: OCR-lege-staat mag nooit een bruikbare 'Volgende' tonen ----
t('OCR-herkenning blokkeert Volgende wanneer geen enkel kernveld herkend is (Blocker 2, structurele check)', () => {
  const fnStart = html.indexOf('async function voedingRunRecognitionOnEnter');
  const fnEnd = html.indexOf('async function voedingRenderMatch', fnStart);
  const fnBody = html.slice(fnStart, fnEnd);
  assert.strictEqual(fnBody.includes('anyUsableValue'), true);
  assert.strictEqual(fnBody.includes('Geen gegevens herkend'), true);
  assert.strictEqual(fnBody.includes("go('s-voeding-handmatig')") || fnBody.includes('go(\\\'s-voeding-handmatig\\\')'), true);
});

// -- Blocker 3: elk product-aanmaakpad moet naar de portion-flow leiden, nooit direct loggen --
t('Custom product-flow leidt naar de portion-flow, niet direct naar bevestiging (Blocker 3, structurele check)', () => {
  const fnStart = html.indexOf('async function voedingPersistCustomProduct');
  const fnEnd = html.indexOf('\n}', fnStart);
  const fnBody = html.slice(fnStart, fnEnd);
  assert.strictEqual(fnBody.includes("go('s-voeding-hoeveelheid')"), true);
});
t('Label-naar-nieuw-product-flow leidt naar de portion-flow, niet direct naar bevestiging (Blocker 3, structurele check)', () => {
  const fnStart = html.indexOf('async function voedingSaveNewProductFromLabel');
  const fnEnd = html.indexOf('\n}', fnStart);
  const fnBody = html.slice(fnStart, fnEnd);
  assert.strictEqual(fnBody.includes("go('s-voeding-hoeveelheid')"), true);
});
t('Handmatige-invoer-flow (na mislukte OCR) leidt naar de portion-flow (Blocker 3, structurele check)', () => {
  const fnStart = html.indexOf('async function voedingSaveManualEntry');
  const fnEnd = html.indexOf('\n}', fnStart);
  const fnBody = html.slice(fnStart, fnEnd);
  assert.strictEqual(fnBody.includes("go('s-voeding-hoeveelheid')"), true);
});
t('renderVoedingHoeveelheid haalt zelf ontbrekende productdata op (fix voor het echte, op een Android-toestel gevonden defect: leeg hoeveelheid-scherm na foto/custom product)', () => {
  const fnStart = html.indexOf('async function renderVoedingHoeveelheid');
  const fnEnd = html.indexOf('async function voedingConfirmAddToMeal', fnStart);
  const fnBody = html.slice(fnStart, fnEnd);
  assert.strictEqual(fnBody.includes('nutrition_nutrient_values'), true);
  assert.strictEqual(fnBody.includes('!voedingSelectedProduct.nutrientRow'), true);
});

// -- Fase 6: geen vooraf ingevulde supplementdosering (real device blocker) --
t('Supplement-dosering-veld heeft GEEN placeholder/value van "5" meer (KERN, adversarial regressie tegen de gerapporteerde, ongewenste default)', () => {
  const inputStart = html.indexOf('id="voeding-supp-dose"');
  const inputEnd = html.indexOf('>', inputStart);
  const inputTag = html.slice(inputStart - 20, inputEnd);
  assert.strictEqual(/placeholder=\\?"5\\?"/.test(inputTag), false);
  assert.strictEqual(/\svalue=\\?"5\\?"/.test(inputTag), false);
  assert.strictEqual(inputTag.includes('placeholder="Hoeveelheid"'), true);
});

// -- Fase 7: geen impliciete ingrediënten-claim -------------------------------
t('Foto-etiket-copy claimt geen ingrediënten-ondersteuning die niet functioneel bestaat', () => {
  assert.strictEqual(html.includes('Voor voedingswaarden en ingrediënten.'), false);
  assert.strictEqual(html.includes('Voor voedingswaarden en productinformatie.'), true);
});

// -- Fase 3: camera-resolutie-hardening (forensische root-cause-fix) --------
t('voedingCapturePhoto vraagt expliciete ideal-resolutie-constraints (forensische fix, geen hardcoded exact-waarden)', () => {
  const fnStart = html.indexOf('async function voedingCapturePhoto');
  const fnEnd = html.indexOf('function voedingClosePhotoFlow', fnStart);
  const fnBody = html.slice(fnStart, fnEnd);
  assert.strictEqual(fnBody.includes('width:{ideal:1920}'), true);
  assert.strictEqual(fnBody.includes('height:{ideal:1080}'), true);
  assert.strictEqual(/exact:/.test(fnBody), false, 'geen harde exact-constraints die op specifieke devices kunnen falen');
});
t('voedingCapturePhoto wacht op focus-stabilisatie vóór capture (forensische fix)', () => {
  const fnStart = html.indexOf('async function voedingCapturePhoto');
  const fnEnd = html.indexOf('function voedingClosePhotoFlow', fnStart);
  const fnBody = html.slice(fnStart, fnEnd);
  assert.strictEqual(fnBody.includes('setTimeout(res,400)'), true);
});
t('voedingCapturePhoto past de deterministische image-quality-gate toe VOORDAT de foto geaccepteerd wordt (Fase 4, KERN)', () => {
  const fnStart = html.indexOf('async function voedingCapturePhoto');
  const fnEnd = html.indexOf('function voedingClosePhotoFlow', fnStart);
  const fnBody = html.slice(fnStart, fnEnd);
  assert.strictEqual(fnBody.includes('NutritionImageQualityGate.evaluateImageQuality'), true);
  // De quality-check moet VOOR de voedingPhotoCaptures[which]=dataUrl-toewijzing staan.
  const qualityIdx = fnBody.indexOf('NutritionImageQualityGate.evaluateImageQuality');
  const acceptIdx = fnBody.indexOf('voedingPhotoCaptures[which]=dataUrl');
  assert.strictEqual(qualityIdx < acceptIdx, true);
});
t('Bij FAIL_BLUR/FAIL_TOO_DARK/FAIL_TOO_BRIGHT wordt de foto NIET geaccepteerd (return vóór voedingPhotoCaptures-toewijzing, geen silent doorgang, adversarial)', () => {
  const fnStart = html.indexOf('async function voedingCapturePhoto');
  const fnEnd = html.indexOf('function voedingClosePhotoFlow', fnStart);
  const fnBody = html.slice(fnStart, fnEnd);
  assert.strictEqual(fnBody.includes("quality.status!=='PASS' && quality.status!=='UNKNOWN'"), true);
  assert.strictEqual(fnBody.includes('Foto niet scherp genoeg'), true);
});
t('Geen AI-beoordeling van beeldkwaliteit -- uitsluitend de deterministische NutritionImageQualityGate-module (adversarial, structurele check)', () => {
  const fnStart = html.indexOf('async function voedingCapturePhoto');
  const fnEnd = html.indexOf('function voedingClosePhotoFlow', fnStart);
  const fnBody = html.slice(fnStart, fnEnd);
  assert.strictEqual(/\b(ai|gpt|llm|vision api)\b/i.test(fnBody), false);
});

// -- Real device ronde 2: ImageCapture.takePhoto() progressive enhancement --
t('voedingCapturePhoto probeert ImageCapture.takePhoto() als progressive enhancement (echte still-capture i.p.v. videoframe, KERN forensische fix)', () => {
  const fnStart = html.indexOf('async function voedingCapturePhoto');
  const fnEnd = html.indexOf('function voedingUseNativeCameraCapture', fnStart);
  const fnBody = html.slice(fnStart, fnEnd);
  assert.strictEqual(fnBody.includes("typeof ImageCapture!=='undefined'"), true);
  assert.strictEqual(fnBody.includes('imageCapture.takePhoto()'), true);
});
t('ImageCapture-pad heeft een werkende fallback naar de bestaande video-frame-methode (progressive enhancement, geen harde afhankelijkheid)', () => {
  const fnStart = html.indexOf('async function voedingCapturePhoto');
  const fnEnd = html.indexOf('function voedingUseNativeCameraCapture', fnStart);
  const fnBody = html.slice(fnStart, fnEnd);
  assert.strictEqual(fnBody.includes("captureMechanism='VIDEO_FRAME'"), true);
  assert.strictEqual(fnBody.includes('ctx.drawImage(video,0,0)'), true);
});
t('Diagnostiek logt actual stream settings (Fase 2), geen gevoelige deviceId-informatie naar de gebruiker', () => {
  const fnStart = html.indexOf('async function voedingCapturePhoto');
  const fnEnd = html.indexOf('function voedingUseNativeCameraCapture', fnStart);
  const fnBody = html.slice(fnStart, fnEnd);
  assert.strictEqual(fnBody.includes('track.getSettings'), true);
  assert.strictEqual(fnBody.includes('deviceId'), false);
});

// -- Native camera fallback (Fase 16) ----------------------------------------
t('voedingUseNativeCameraCapture bestaat als alternatief, gebruikt input capture="environment" (native still-capture-fallback)', () => {
  const fnStart = html.indexOf('function voedingUseNativeCameraCapture');
  const fnEnd = html.indexOf('function voedingClosePhotoFlow', fnStart);
  const fnBody = html.slice(fnStart, fnEnd);
  assert.strictEqual(fnBody.includes("input.capture='environment'"), true);
  assert.strictEqual(fnBody.includes("input.accept='image/*'"), true);
});
t('Native-camera-knop is een alternatief naast de bestaande live-cameraflow, niet een vervanging (structurele UI-check)', () => {
  assert.strictEqual(html.includes('voedingUseNativeCameraCapture'), true);
  assert.strictEqual(html.includes("onclick=\"voedingCapturePhoto('label')\""), true); // bestaande knop blijft
});

// -- Barcode: expliciete bevestiging + altijd-zichtbare retry-actie ---------
t('Barcode-detectie toont een expliciete, zichtbare bevestiging ("Barcode gevonden: <waarde>") voordat de lookup start (KERN, Fase 12)', () => {
  const fnStart = html.indexOf('async function voedingRunScanLoop');
  const fnEnd = html.indexOf('function voedingScannerRetry', fnStart);
  const fnBody = html.slice(fnStart, fnEnd);
  assert.strictEqual(fnBody.includes("'Barcode gevonden: '+result.identifier.value"), true);
});
t('Scanner-scherm heeft een altijd-zichtbare "Opnieuw scannen"-actie tijdens actief scannen (adversarial tegen de gerapporteerde dead-end)', () => {
  assert.strictEqual(html.includes('id="voeding-scanner-rescan-btn"'), true);
  assert.strictEqual(html.includes('>Opnieuw scannen<'), true);
});
t('Scanner-resolutie verhoogd naar hetzelfde niveau als de foto-capture (1920x1080) voor betere barcode-leesbaarheid', () => {
  const fnStart = html.indexOf('async function voedingStartScanner');
  const fnEnd = html.indexOf('catch(e)', fnStart);
  const fnBody = html.slice(fnStart, fnEnd);
  assert.strictEqual(fnBody.includes('ideal:1920'), true);
  assert.strictEqual(fnBody.includes('ideal:1080'), true);
});
t('Instructietekst wordt correct gereset naar "Houd de barcode binnen het kader" bij starten/opnieuw scannen (adversarial, geen blijvende "Barcode gevonden"-tekst)', () => {
  const startFn = html.slice(html.indexOf('async function voedingStartScanner'), html.indexOf('catch(e)', html.indexOf('async function voedingStartScanner')));
  const retryFn = html.slice(html.indexOf('function voedingScannerRetry'), html.indexOf('function voedingCloseScanner'));
  assert.strictEqual(startFn.includes("textContent='Houd de barcode binnen het kader'"), true);
  assert.strictEqual(retryFn.includes("textContent='Houd de barcode binnen het kader'"), true);
});

// -- Real-device parity (deze ronde) ----------------------------------------
function fnBodyOf(startSig, endSig){ const a=html.indexOf(startSig); const b=html.indexOf(endSig,a); return html.slice(a,b); }
t('Foto-capture gebruikt ImageCapture.takePhoto() als progressive enhancement met video-frame-fallback (Fase 4/7)', () => {
  const b=fnBodyOf('async function voedingCapturePhoto','function voedingUseNativeCameraCapture');
  assert.strictEqual(b.includes("typeof ImageCapture!=='undefined'"), true);
  assert.strictEqual(b.includes('imageCapture.takePhoto()'), true);
  assert.strictEqual(b.includes("captureMechanism='VIDEO_FRAME'"), true, 'expliciete fallback naar video-frame');
  assert.strictEqual(b.includes('ctx.drawImage(video,0,0)'), true, 'video-frame-fallback bestaat nog');
});
t('Native camera-app-fallback bestaat voor ZOWEL voorkant als etiket (Fase 16)', () => {
  const n=(html.match(/onclick="voedingUseNativeCameraCapture\('(front|label)'\)"/g)||[]).length;
  assert.strictEqual(n, 2);
  assert.strictEqual(html.includes("input.capture='environment'"), true);
});
t('Native-fallback loopt door DEZELFDE quality gate en respecteert EXIF-orientatie (geen omweg om het veiligheidsnet)', () => {
  const b=fnBodyOf('function voedingUseNativeCameraCapture','function voedingClosePhotoFlow');
  assert.strictEqual(b.includes('NutritionImageQualityGate.evaluateImageQuality'), true);
  assert.strictEqual(b.includes("imageOrientation:'from-image'"), true);
  assert.strictEqual(b.includes('NATIVE_CAPTURE'), true);
});
t('Focus-enhancement is progressive: alleen bij gerapporteerde continuous-capability, nooit blind, fouten genegeerd (Fase 3)', () => {
  const b=fnBodyOf('async function voedingApplyFocusEnhancement','async function voedingCapturePhoto');
  assert.strictEqual(b.includes("caps.focusMode.indexOf('continuous')!==-1"), true);
  assert.strictEqual(b.includes('applyConstraints'), true);
  assert.strictEqual(b.includes('if(!track||!track.getCapabilities||!track.applyConstraints) return result;'), true);
});
t('Diagnostiek logt gemeten stream-settings + capture-mechanisme, geen apparaat-identifier (Fase 2/5)', () => {
  const b=fnBodyOf('async function voedingCapturePhoto','function voedingUseNativeCameraCapture');
  assert.strictEqual(b.includes('track.getSettings'), true);
  assert.strictEqual(b.includes('capture mechanism used'), true);
  assert.strictEqual(/deviceId/.test(b), false);
});
t('Barcode FOUND toont zichtbare bevestiging met de barcodewaarde vóór de lookup (Fase 12); BARCODE_DETECTED stopt de scan-loop', () => {
  const b=fnBodyOf('async function voedingRunScanLoop','function voedingScannerRetry');
  assert.strictEqual(b.includes("'Barcode gevonden: '+result.identifier.value"), true);
  assert.strictEqual(b.includes('voedingScannerActive=false;'), true);
});
t('Scanner heeft een expliciete, altijd zichtbare "Opnieuw scannen"-actie (geen dead-end, Fase 8)', () => {
  assert.strictEqual(html.includes('id="voeding-scanner-rescan-btn"'), true);
});
t('Geen "Barcode gebruiken"-knop zonder gedetecteerde barcode: er bestaat geen knop die een niet-gedetecteerde waarde doorgeeft (adversarial)', () => {
  assert.strictEqual(/Barcode gebruiken/.test(html), false);
});

// -- Nutrition Targets V1 (stacked sprint) -----------------------------------
t('Targets: doelen-scherm bestaat, 4 onafhankelijke velden, geen prompt/alert/confirm', () => {
  assert.strictEqual(html.includes('id="s-voeding-doelen"'), true);
  ['kcal','protein','carbs','fat'].forEach(k=>assert.strictEqual(html.includes('id="voeding-doel-'+k+'"'), true));
  const b=fnBodyOf('async function voedingRenderDoelen','function voedingProgressRow'); assert.deepStrictEqual(b.match(/\b(alert|prompt|confirm)\(/g)||[],[]);
});
t('Targets: UI rekent remaining/progress NIET zelf -- alles via NutritionTargetService (geen shadow calculation, adversarial)', () => {
  const b=fnBodyOf('function voedingProgressRow','async function voedingRenderOverview');
  assert.strictEqual(b.includes('NutritionTargetService.formatRemaining'), true);
  assert.strictEqual(/fr\.target\s*-\s*fr\.consumed/.test(b), false, 'geen ad-hoc target-consumed in UI');
  const o=fnBodyOf('async function voedingRenderOverview','function voedingOpenWaterEntry');
  assert.strictEqual(o.includes('NutritionTargetService.computeDailyProgress'), true);
});
t('Targets: opslaan is altijd een NIEUWE rij (sbPostQ), nooit UPDATE-in-place -- historie/effective_from (Fase 9)', () => {
  const b=fnBodyOf('async function voedingSaveTargets','function voedingProgressRow');
  assert.strictEqual(b.includes("sbPostQ('nutrition_targets'"), true); assert.strictEqual(b.includes('sbPatchQ'), false);
  assert.strictEqual(b.includes('NutritionTargetService.toCanonicalRow'), true);
});
t('Targets: no-target empty state met actie "Doelen instellen", geen nep-progress', () => {
  const o=fnBodyOf('async function voedingRenderOverview','function voedingOpenWaterEntry');
  assert.strictEqual(o.includes('Stel je voedingsdoelen in'), true); assert.strictEqual(o.includes('has_any_target'), true);
});
t('Targets: extreme waarde vraagt bevestiging (CHECK_VALUE), geen stille correctie, geen medische claim', () => {
  const b=fnBodyOf('async function voedingSaveTargets','function voedingProgressRow');
  assert.strictEqual(b.includes('needsConfirmation'), true); assert.strictEqual(b.includes('Controleer deze waarde'), true); assert.strictEqual(/ongezond/i.test(b), false);
});

// -- UX Hardening (unattended sprint) ----------------------------------------
t('A11y: elk statisch Nutrition-input/select heeft een <label for> of aria-label (geen placeholder-als-enig-label)', () => {
  const start=html.indexOf('id="s-voeding"'); const end=html.indexOf('<!-- ═══ TRAINING HUB');
  const block=html.slice(start,end);
  const inputs=[...block.matchAll(/<(input|select)\s[^>]*id="([^"]+)"[^>]*>/g)];
  const missing=inputs.filter(m=>!/aria-label=/.test(m[0]) && !block.includes('for="'+m[2]+'"')).map(m=>m[2]);
  assert.deepStrictEqual(missing, []);
});
t('A11y: JS-gerenderde inputs (qty-unit, correctie, nieuw-product, water) hebben een toegankelijke naam', () => {
  ['voeding-qty-unit','voeding-correctie-value','voeding-newproduct-name'].forEach(id=>assert.strictEqual(new RegExp('id="'+id+'" aria-label=').test(html), true, id));
  assert.strictEqual(html.includes('for="m-voeding-water-input"'), true);
});
t('A11y: async feedback-regio\'s zijn aria-live (overzicht, zoekresultaten, scanner-status, fouten)', () => {
  ['voeding-overview-body','voeding-search-results','voeding-scanner-status','voeding-supp-error','voeding-custom-error'].forEach(id=>{
    const m=html.match(new RegExp('id="'+id+'"[^>]*')); assert.strictEqual(!!m && /aria-live=/.test(m[0]), true, id);
  });
});
t('Gedeelde input-primitive .vd-input: 44px min-height, focus-visible, aria-invalid-styling (geen nieuw design system, hergebruik)', () => {
  assert.strictEqual(html.includes('.vd-input{width:100%;box-sizing:border-box;min-height:44px'), true);
  assert.strictEqual(html.includes('.vd-input:focus-visible'), true);
  assert.strictEqual(html.includes('.vd-input[aria-invalid="true"]'), true);
});
t('Dubbele-submit: alle async save-paden gebruiken voedingWithBusy (disabled + aria-busy), incl. label-naar-nieuw-product', () => {
  ['#voeding-doel-save-btn','#m-voeding-water .tk-btn-primary','#voeding-portion-body .tk-btn-primary','#s-voeding-supplement .tk-btn-primary','#s-voeding-custom .tk-btn-primary','#s-voeding-handmatig .tk-btn-primary','#voeding-new-product-body .tk-btn-primary'].forEach(sel=>assert.strictEqual(html.includes("voedingWithBusy(document.querySelector('"+sel+"')"), true, sel));
  const h=fnBodyOf('function voedingWithBusy','function voedingMarkInvalid'); assert.strictEqual(h.includes("setAttribute('aria-busy','true')"), true);
});
t('Copy: geen "optimale/aanbevolen/ideale behoefte", geen schuld-/straftaal in de Nutrition UX (USER_DEFINED-wording)', () => {
  const start=html.indexOf('id="s-voeding"'); const end=html.indexOf('function voedingRenderManualForm');
  const block=html.slice(start,end);
  assert.strictEqual(/optima(le|al)\s+behoefte|aanbevolen\s+behoefte|ideale\s+macro/i.test(block), false);
  assert.strictEqual(/\b(zondig|schuldig|slecht bezig|te veel gegeten|gefaald)\b/i.test(block), false);
  assert.strictEqual(block.includes('Je ingestelde doelen'), true);
});
t('Empty states zijn functioneel (tekst + één vervolgactie): maaltijden, targets, zoeken', () => {
  assert.strictEqual(html.includes('Geen producten gevonden'), true);
  assert.strictEqual(html.includes('Stel je voedingsdoelen in'), true);
  assert.strictEqual(/Nog niets toegevoegd|nog niets toegevoegd/.test(html), true);
});
t('Save-failure: netwerkfout geeft een menselijke inline-melding, geen stille failure, geen technische details in copy', () => {
  ['async function voedingSaveTargets','async function voedingSaveNewProductFromLabel'].forEach(sig=>{
    const b=html.slice(html.indexOf(sig), html.indexOf('\n}', html.indexOf(sig)));
    assert.strictEqual(/catch\(e\)\{[^}]*Opslaan mislukt/.test(b), true, sig);
    assert.strictEqual(/e\.message|stack|status ?\d{3}/.test(b.split('catch')[1]||''), false, sig+' geen technische details');
  });
});

console.log(`fVoedingUXSetB: ${pass} geslaagd, ${fail} mislukt`);
console.log(`Resultaat: ${pass} geslaagd, ${fail} mislukt`);
if (fail > 0) process.exit(1);
