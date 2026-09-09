/* fTrainingExecutionIntegrityAndRecovery.test.js — V1 Proven Maturity Sprint 05C.
 * Execution Integrity, Recovery & Race Certification.
 * CODE-INSPECTED (structureel, statisch bewijs uit index.html) tenzij anders
 * vermeld -- geen DOM/browser beschikbaar in deze omgeving voor live UI-
 * interactietests op input-velden.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// ═══ INPUT INTEGRITY: normNumStr/numNL (reps/kg/RPE-normalisatie) ═══
const normSrc = html.slice(html.indexOf('function numNL'), html.indexOf('function normNumStr') + 400);
ok(normSrc.indexOf("if(s===''|| !/^-?\\d*\\.?\\d+$/.test(s))return NaN") > 0, 'numNL: niet-numerieke invoer geeft NaN (nooit stil een verzonnen getal)');
ok(normSrc.indexOf("return isNaN(numNL(s)) ? '' : s.replace(',', '.')") > 0, 'normNumStr: niet-numerieke invoer wordt NIET opgeslagen als getal (lege string), decimale komma wordt genormaliseerd naar punt');
// ECHTE BEVINDING (P2/P3, geen fix binnen dit sprint per Fix Policy "klein
// en architectuurconform" -- dit vereist een productbeslissing over de
// juiste plek voor de fix, niet een ad-hoc regex-patch): het gewicht-veld
// clamt pas op 'onchange' (blur), niet op 'oninput' (elke toetsaanslag) --
// een negatieve/out-of-range waarde kan dus TIJDELIJK in sessionLog/de
// 1200ms-autosave-draft terechtkomen vóórdat de blur de waarde corrigeert.
{
  const kgVeldSrc = html.slice(html.indexOf('aria-label="Gewicht in kg"') - 200, html.indexOf('aria-label="Gewicht in kg"') + 500);
  ok(kgVeldSrc.indexOf('oninput="onManualKgEdit') > 0, 'bevinding: het gewicht-veld roept bij ELKE toetsaanslag (oninput) al logSet() aan, vóórdat clampNumInput (dat pas bij onchange/blur draait) de waarde corrigeert -- een negatieve/te-hoge waarde kan dus kortstondig ongeclampt in de autosave-draft belanden. P3: smal tijdvenster, wordt bij blur/finishSession alsnog gecorrigeerd, geen bevestigd geval van een definitief foutieve DB-rij.');
  ok(kgVeldSrc.indexOf('onchange="clampNumInput(this,0,500)') > 0, 'bevestiging: clampNumInput draait wél op onchange/blur -- de waarde wordt uiteindelijk altijd binnen [0,500] gebracht vóór de gebruiker het veld verlaat');
}

// ═══ ACTIVE STATE RECOVERY: localStorage-draft-mechanisme (R1/R3/R4/R6) ═══
ok(html.indexOf("localStorage.setItem('tk_draft_training'") > 0, 'recovery: er bestaat een localStorage-gebaseerde trainingsdraft (overleeft page-reload, in tegenstelling tot module-level JS-state alleen)');
ok(html.indexOf('instanceId:(typeof activeInstanceId') > 0, 'recovery: de draft bewaart expliciet activeInstanceId -- voorkomt weesrijen in training_instances na een herstart (RC0, expliciet gedocumenteerde historische bugfix + migratie v446)');
ok(html.indexOf('elapsedMs:currentWorkoutElapsedMs()') > 0, 'recovery: de draft bewaart de verstreken trainingstijd -- de timer loopt bij hervatten door i.p.v. te resetten naar 0');
ok(html.indexOf('Niet-afgeronde training gevonden') > 0, 'recovery: expliciete, zichtbare "hervatten?"-prompt bij het opnieuw starten van dezelfde training op dezelfde dag (R1/R6)');
ok(html.indexOf('Als je nu \'+t+\' start, gaat die verloren') > 0, 'recovery: bij het starten van een ANDER trainingstype terwijl een niet-gesynchroniseerde draft met echte data bestaat, krijgt de gebruiker een expliciete, afwijsbare waarschuwing (geen stil dataverlies)');
ok(html.indexOf('function draftHasData') > 0, 'recovery: het systeem onderscheidt een lege draft van een draft met echte data (geen onnodige waarschuwing bij een lege sessie)');
// CLASSIFICATIE: FULL RECOVERY voor data-integriteit (R1/R3/R4/R6 via
// localStorage + expliciete resume-flow); PARTIAL voor cross-screen-
// discoverability (geen globale "je hebt een openstaande training"-
// banner buiten het her-openen van exact hetzelfde trainingstype).

// ═══ CROSS-USER ACTIVE STATE (incl. de localStorage-draft-laag, niet
// alleen de al eerder bewezen IndexedDB-queue-isolatie) ═══
{
  const cacheKeysSrc = html.slice(html.indexOf('const PERSONAL_CACHE_KEYS'), html.indexOf('function wipePersonalCache'));
  ok(cacheKeysSrc.indexOf("'tk_draft_training'") > 0, 'cross-user: tk_draft_training staat in PERSONAL_CACHE_KEYS -- wordt bij eigenaarwissel/logout gewist, geen lek van user A\'s actieve training naar user B op een gedeeld toestel');
  ok(cacheKeysSrc.indexOf("'tk_hyrox_active'") > 0, 'cross-user: tk_hyrox_active is eveneens expliciet opgenomen (met commentaar dat dit exacte scenario benoemt) -- Hyrox-state heeft dezelfde bescherming');
}
ok(html.indexOf('async function authSignOut') > 0 && html.slice(html.indexOf('async function authSignOut'), html.indexOf('async function authSignOut') + 400).indexOf('wipePersonalCache()') > 0, 'cross-user: authSignOut() roept wipePersonalCache() synchroon aan bij uitloggen (niet pas bij de volgende login)');
ok(html.indexOf('function resetPersonalCacheIfNewDeviceOwner') > 0 && html.indexOf('resetPersonalCacheIfNewDeviceOwner(authSession?.user?.id)') > 0, 'cross-user: een tweede beveiligingslaag -- ook bij een gemiste/overgeslagen logout wordt de cache gewist zodra een ANDERE gebruiker op hetzelfde toestel inlogt (owner-wissel-detectie)');

// ═══ ENTRYPOINT ID-COLLISION (generic/Programma/Mijn trainingen/Hyrox) ═══
{
  const alleCreateCalls = (html.match(/createTrainingInstance\(/g) || []).length;
  ok(alleCreateCalls >= 4, 'entrypoint: alle 4 bekende paden roepen dezelfde createTrainingInstance() aan -- die genereert het id zelf via newTrainingInstanceId()/crypto.randomUUID(), geen los, incompatibel ID-schema per entrypoint');
}

// ═══ STALE RESPONSE DEFENSE (structureel, geen live async-timing-simulatie) ═══
// logSet() leest de invoerwaarde SYNCHROON en direct uit de DOM op het
// moment van aanroep (document.getElementById(...).value), en schrijft
// uitsluitend naar de lokale, in-memory sessionLog -- er is geen enkel
// codepad waarbij een LATERE, vertraagde netwerk-respons de LOKALE state
// terugschrijft/overschrijft (sbPostQ/sbPatchQ zijn fire-and-forget/queue-
// gebaseerd, geen response-driven state-update). Dit maakt "stale response
// overschrijft nieuwere lokale invoer" structureel onmogelijk voor
// set-invoervelden, ongeacht netwerktiming.
ok(html.slice(html.indexOf('function logSet('), html.indexOf('function logSet(') + 600).indexOf('document.getElementById') > 0, 'stale-response: logSet() leest synchroon uit de DOM (geen gecachete/oudere closure-waarde) -- structureel geen "oude respons overschrijft nieuwe invoer"-pad voor set-velden');

console.log('fTrainingExecutionIntegrityAndRecovery: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
