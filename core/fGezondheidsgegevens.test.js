/* Sprint 9 — Gezondheidsgegevens & koppelingen.
 *
 * A  scherm, route en navigatie
 * B  uitsluitend bestaande bronnen en engines; geen tweede datalaag
 * C  de vijf toestanden (geen wearable, gekoppeld zonder data, actueel, handmatig, leeg)
 * D  één plek voor koppelen/sync/loskoppelen — geen concurrerende routes
 * E  privacy en databron: bestaande teksten hergebruikt, geen nieuwe claims
 * F  regressie op de bestaande Lichaam- en Fitbit-onderdelen
 *
 * Draai: node core/fGezondheidsgegevens.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass = 0, fail = 0;
function ok(c, m){ if (c) pass++; else { fail++; console.log('  ✗ ' + m); } }
function eq(a, b, m){ ok(JSON.stringify(a) === JSON.stringify(b), m + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')'); }
function extractFn(name){
  const start = html.indexOf('async function ' + name + '(') >= 0
    ? html.indexOf('async function ' + name + '(') : html.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('functie niet gevonden: ' + name);
  let depth = 0, end = -1;
  for (let j = html.indexOf('{', start); j < html.length; j++){
    const ch = html[j];
    if (ch === '{') depth++; else if (ch === '}'){ depth--; if (depth === 0){ end = j; break; } }
  }
  return html.slice(start, end + 1);
}

console.log('\n[Sprint 9] Gezondheidsgegevens & koppelingen');

// ── A. scherm en route ───────────────────────────────────────────────────────
console.log('  A scherm en route');
eq((html.match(/<div class="scr" id="s-lich-gegevens">/g) || []).length, 1, 'A1: het scherm bestaat precies één keer');
ok(html.indexOf('id="lich-geg-body"') >= 0, 'A2: de rendercontainer bestaat');
ok(html.indexOf("if(id==='s-lich-gegevens')renderLichaamGegevens();") >= 0, 'A3: route hangt in de BESTAANDE go()-router');
eq((html.match(/go\('s-lich-gegevens'\)/g) || []).length, 2,
   'A4: twee verwijzingen — de route vanaf Lichaam en de doorverwijzing vanaf Profiel');
ok(/onclick="go\('s-lich-gegevens'\)"><span class="ic">🔗<\/span><span class="b"><b>Gezondheidsgegevens/.test(html),
   'A5: de ingang staat in de bestaande sectie "Lichaam & gegevens"');
ok(/<div class="v43-lbl"[^>]*>Lichaam &amp; gegevens<\/div>[\s\S]{0,700}s-lich-gegevens/.test(html),
   'A6: de drie routes staan bij elkaar: Gezondheid & herstel, Lichaamsmetingen, Gezondheidsgegevens');
ok(html.indexOf(':is(#s-lichaam,#s-lich-spieren,#s-lich-spier,#s-lich-health,#s-lich-metingen,#s-lich-metric,#s-lich-oefeningen,#s-lich-verband,#s-lich-gegevens)') >= 0,
   'A7: het scherm erft de bestaande Lichaam-cascade — geen eigen design system');
ok(/<div class="scr" id="s-lich-gegevens">[\s\S]{0,2400}<nav class="bnav"/.test(html), 'A8: bestaande bottom navigation');
ok(/id="s-lich-gegevens"[\s\S]{0,600}class="ibtn" onclick="go\('s-lichaam'\)"/.test(html), 'A9: bestaande terugknop naar Lichaam');
eq((html.match(/async function renderLichaamGegevens\(/g) || []).length, 1, 'A10: precies één renderer');
ok(html.indexOf('async function _renderLichaamGegevens') >= 0, 'A11: met een foutgrens, zoals de andere Lichaam-schermen');

// ── B. uitsluitend bestaande bronnen ─────────────────────────────────────────
console.log('  B bestaande bronnen en engines');
const R = extractFn('_renderLichaamGegevens');
['dc.observation(', 'dc.observationQuality(', 'dc.healthSeries(', 'dc.deviceConnectionState(', 'dc.weightSeries(']
  .forEach(f => ok(R.indexOf(f) >= 0, 'B1: hergebruikt ' + f.replace('dc.', 'DeviceCore.')));
ok(R.indexOf('fetchWearableStatus()') >= 0, 'B2: connectiestatus via de bestaande fetchWearableStatus');
ok(R.indexOf('TK_DQ_TEKST') >= 0 && R.indexOf('lichVersheid(') >= 0 && R.indexOf('lichHerkomst(') >= 0,
   'B3: bestaande statusteksten en herkomstverwoording hergebruikt');
ok(R.indexOf('lichStrengsteKwaliteit(') >= 0, 'B4: de strengste kwaliteit bepaalt de kop — bestaande helper');
ok(R.indexOf('tkMetingHerkomst(') >= 0, 'B5: lichaamsmetingen gebruiken de bestaande herkomstregel');
ok(R.indexOf('tkSleepHours(') >= 0, 'B6: slaap gaat door de bestaande normalisatie');
ok(R.indexOf('_tkHealthLimitFor(') >= 0, 'B7: de ophaallimiet komt uit de bestaande afleiding');
// geen eigen berekening of drempel
ok(!/Math\.sqrt|calculateMuscleRecoveryPct\(|spearman\(|releaseVerband\(/.test(R), 'B8: geen berekening en geen vrijgavelogica in dit scherm');
ok(!/>=\s*85|>=\s*50|0\.30|0\.50/.test(R), 'B9: geen eigen drempels of statusgrenzen');
ok(!/Date\.now\(\)/.test(R.replace(/new Date\(\)\.toISOString\(\)/g,'')), 'B10: geen eigen tijdlogica behalve het injecteren van now in de bestaande engine');
// geen fictieve data
ok(!/voorbeeld|demo|dummy|placeholder/i.test(R), 'B11: geen voorbeeld- of demowaarden');
ok(R.indexOf('>niet gemeten<') >= 0, 'B12: een ontbrekende meting heet "niet gemeten", geen streepje met eenheid');

// ── C. de vijf toestanden ────────────────────────────────────────────────────
console.log('  C toestanden');
ok(R.indexOf('Geen wearable gekoppeld en nog geen metingen') >= 0, 'C1: A/E — geen koppeling en geen data');
ok(R.indexOf('Geen wearable gekoppeld · gegevens komen uit je check-in') >= 0, 'C2: D — handmatige data zonder wearable');
ok(R.indexOf('Fitbit gekoppeld · nog niet gesynchroniseerd') >= 0, 'C3: B — gekoppeld zonder gegevens');
ok(R.indexOf("'Fitbit · laatste synchronisatie '") >= 0, 'C4: C — gekoppeld met een synchronisatiemoment');
ok(R.indexOf('Nog geen gezondheidsgegevens') >= 0, 'C5: E — lege toestand voor het gegevensblok');
ok(R.indexOf('nog niet ingevoerd') >= 0, 'C6: lichaamsmetingen zonder invoer');
ok(R.indexOf('Er zijn nog geen metingen binnengekomen via deze koppeling.') >= 0, 'C7: koppeling zonder aangeleverde metingen');
ok(R.indexOf("sync.status==='token_expired'") >= 0 && R.indexOf("sync.status==='sync_failed'") >= 0,
   'C8: verlopen koppeling en mislukte synchronisatie krijgen een eigen status');
ok(R.indexOf("!sync ? 'Status onbekend'") >= 0, 'C9: bij een onbereikbare statusdienst wordt niets aangenomen');
// de aangeleverde metingen worden afgeleid uit echte provenance
ok(R.indexOf("dc.sourceKind(o.source)==='measured'") >= 0,
   'C10: "levert nu" komt uit de herkomst van echte rijen, niet uit een lijst met wat Fitbit zou kunnen leveren');

// ── D. één plek voor beheer ──────────────────────────────────────────────────
console.log('  D geen concurrerende routes');
eq((html.match(/onclick="wearableConnect\(\)"/g) || []).length, 1, 'D1: er is precies één koppelknop in de app');
eq((html.match(/onclick="wearableDisconnect\(\)"/g) || []).length, 1, 'D2: precies één loskoppelknop');
eq((html.match(/onclick="wearableSyncNow\(\)"/g) || []).length, 1, 'D3: precies één sync-knop');
const kaart = extractFn('renderWearableCard');
ok(kaart.indexOf("go('s-lich-gegevens')") >= 0, 'D4: Profiel verwijst door naar het beheerscherm');
ok(kaart.indexOf('wearableConnect()') < 0 && kaart.indexOf('wearableDisconnect()') < 0 && kaart.indexOf('wearableSyncNow()') < 0,
   'D5: Profiel bevat de acties zelf niet meer');
ok(kaart.indexOf('fetchWearableStatus()') >= 0, 'D6: Profiel toont nog wel de stand van zaken');
ok(html.indexOf('function tkVerversGegevensScherm') >= 0, 'D7: na een actie ververst het beheerscherm');
ok(html.indexOf('Via Lichaam → Gezondheidsgegevens') >= 0, 'D8: de help-tekst wijst naar de nieuwe plek');
ok(html.indexOf('Profiel → Wearable') < 0, 'D9: geen verwijzing meer naar de oude plek');

// ── E. privacy en databron ───────────────────────────────────────────────────
console.log('  E privacy en databron');
ok(R.indexOf('Privacy &amp; gegevens') >= 0, 'E1: er is een privacysectie');
ok(R.indexOf("go(\\'s-privacy\\')") >= 0 || R.indexOf("go('s-privacy')") >= 0, 'E2: die verwijst naar de BESTAANDE privacypagina');
ok(html.indexOf('id="s-privacy"') >= 0, 'E3: de bestaande privacypagina is ongewijzigd aanwezig');
ok(R.indexOf('Databron') >= 0, 'E4: er is een databronsectie');
ok(R.indexOf('Er is geen instelbare bronvoorkeur') >= 0,
   'E5: er wordt eerlijk gemeld dat bronvoorkeur niet instelbaar is — geen UI voor niet-bestaande functionaliteit');
// geen juridische of verzonnen claims
ok(!/AVG|GDPR|wettelijk|verwerkersovereenkomst|grondslag/i.test(R), 'E6: geen juridische claims');
ok(!/verkopen|delen met adverteerders|derden verkopen/i.test(R), 'E7: geen verzonnen privacybeweringen');

// ── F. regressie ─────────────────────────────────────────────────────────────
console.log('  F regressie');
ok(html.indexOf("fetch(FN_BASE+'wearable-sync'") >= 0, 'F1: de Fitbit-sync-aanroep is ongewijzigd');
['wearableConnect','wearableDisconnect','wearableSyncNow','wearableSyncSilent','handleWearableRedirect','fetchWearableStatus','fmtWearableSyncStatus']
  .forEach(f => ok(html.indexOf('function ' + f) >= 0, 'F2: bestaande functie ' + f + ' bestaat nog'));
ok(html.indexOf('function upsertHrvLog') >= 0, 'F3: de v4.29.1-dataverliesfix is intact');
ok(html.indexOf('<div class="lich-figpair">') >= 0, 'F4: anatomie op het overzicht ongewijzigd');
['s-lich-spieren','s-lich-spier','s-lich-oefeningen','s-lich-health','s-lich-metingen','s-lich-metric','s-lich-verband']
  .forEach(id => ok(html.indexOf('id="' + id + '"') >= 0, 'F5: bestaand scherm ' + id + ' bestaat nog'));
ok(html.indexOf('function renderLichaamVerbanden') >= 0, 'F6: Verbanden V1 ongemoeid');
ok(html.indexOf('function lichTop4Herstel') >= 0, 'F7: top-4-selectie ongemoeid');
ok(html.indexOf('calculateMuscleRecoveryPct') >= 0, 'F8: herstelberekening ongemoeid');
ok(html.indexOf('id="profiel-wearable-detail"') >= 0 && html.indexOf('id="profiel-wearable-actions"') >= 0,
   'F9: de doel-ids op Profiel bestaan nog — refreshProfiel blijft werken');

console.log('\n========================================================');
console.log('RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail) process.exit(1);
console.log('✅ Gezondheidsgegevens & koppelingen: presentatie op bestaande engines, één beheerplek.');
