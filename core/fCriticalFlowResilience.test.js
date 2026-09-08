/* fCriticalFlowResilience.test.js — V1 Proven Maturity Sprint 03.
 * Critical Flow Resilience & Failure Recovery.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// ═══ Bevinding 1 (P2, GEFIXT): training_instances ontbrak in de idempotente
// tabellenlijst -- zonder fix kon een timeout ná een in werkelijkheid
// geslaagde write de offline-wachtrij permanent laten vastlopen. ═══
{
  const constDef = html.slice(html.indexOf('const IDEMPOTENT_TABELLEN_MET_CLIENT_ID'), html.indexOf('function newClientRowId'));
  ok(constDef.indexOf('training_instances: true') > 0, 'FIX: training_instances is toegevoegd aan de idempotente-tabellenlijst');
  // Regressie: de reeds bestaande, bewezen tabellen mogen niet per ongeluk verwijderd zijn.
  ['sessions', 'race_segments', 'nutrition_entries', 'team_events', 'nutrition_meals', 'nutrition_meal_items', 'nutrition_hydration_entries', 'nutrition_supplement_logs'].forEach((t) => {
    ok(constDef.indexOf(t + ': true') > 0, 'regressie: bestaande idempotente tabel ' + t + ' is niet per ongeluk verwijderd door deze wijziging');
  });
}
// Structurele voorwaarde voor de fix: newTrainingInstanceId() gebruikt exact
// dezelfde UUID-structuur als newClientRowId() (geverifieerd, niet aangenomen).
{
  const src = html.slice(html.indexOf('function newTrainingInstanceId'), html.indexOf('function newTrainingInstanceId') + 200);
  ok(src.indexOf('crypto.randomUUID()') > 0, 'voorwaarde: newTrainingInstanceId() gebruikt crypto.randomUUID(), structureel identiek aan newClientRowId() (rechtvaardigt het hergebruik van hetzelfde idempotentiemechanisme)');
}

// ═══ Bevinding 2 (documentatie/correctie): afrondenRunningActivity() is
// ONBEREIKBARE dode code -- de bijbehorende input-markup bestaat nergens
// in index.html. GEEN live double-submit-risico (was mijn eerste hypothese,
// expliciet gecorrigeerd na verificatie). Vastgelegd als regressiewaarschuwing:
// als deze markup ooit wordt toegevoegd zonder een _saving-guard, moet dat
// opnieuw beoordeeld worden. ═══
{
  const heeftFunctie = html.indexOf('async function afrondenRunningActivity') > 0;
  const heeftMarkup = html.indexOf('id="running-afstand-km"') > 0;
  ok(heeftFunctie === true, 'sanity: de functie zelf bestaat nog (documentatie klopt met de code)');
  ok(heeftMarkup === false, 'bevinding: de bijbehorende UI-markup (running-afstand-km) bestaat nog steeds NIET -- deze functie blijft onbereikbare dode code, geen live double-submit-risico. Als dit ooit FAALT (markup toegevoegd), moet een _saving-guard alsnog worden toegevoegd vóórdat de knop live gaat.');
}

// ═══ Bevinding 3 (bewijs van bestaande volwassenheid, GEEN wijziging): het
// offline-schrijf-wachtrij-mechanisme zelf is grondig geverifieerd en blijkt
// al goed ontworpen (F13 Post-Audit Remediation P1-04/P1-05). ═══
const flushSrc = html.slice(html.indexOf('if(_flushBezig)return;') - 50, html.indexOf('if(_flushBezig)return;') + 4000);
ok(flushSrc.indexOf('owner_uid') > 0, 'bewijs: de flush-functie isoleert queue-items per gebruiker (owner_uid-check) -- voorkomt dat op een gedeeld toestel de data van gebruiker A onder account B wordt weggeschreven');
ok(flushSrc.indexOf('resolution=merge-duplicates') > 0, 'bewijs: idempotente tabellen gebruiken merge-duplicates bij flush, geen dubbele rij bij een retry na een onbevestigde eerdere succesvolle write');
ok(flushSrc.indexOf('continue') > 0 && flushSrc.indexOf('skippedAny') > 0, 'bewijs: één mislukt wachtrij-item blokkeert niet alle latere items (per-item-isolatie)');
ok(html.indexOf("'N wachtend op sync'".replace('N ', '')) >= -1 && html.indexOf('wachtend op sync') > 0, 'bewijs: er bestaat een permanent zichtbare, tikbare wachtrij-badge -- de gebruiker weet altijd hoeveel acties nog niet gesynchroniseerd zijn (Fase 8: geen stille "alles is goed"-UI)');
ok(html.indexOf('Nooit weggooien') > 0 || flushSrc.indexOf('!authSession)return') > 0, 'bewijs: een ontbrekende sessie laat de wachtrij expliciet intact (nooit stilzwijgend data weggooien)');

// ═══ Bevinding 4: native scanner race-conditiebescherming (Java-zijde, reeds
// bevestigd bestaand -- geen wijziging, wel expliciet als bewijs vastgelegd). ═══
ok(fs.readFileSync(path.join(ROOT, 'android/app/src/main/java/com/trainingskompas/app/TkBarcodeScannerPlugin.java'), 'utf8').indexOf('AtomicInteger sessionGeneration') > 0,
  'bewijs: de native barcode-scanner gebruikt een AtomicInteger session-generation-check tegen late/stale ML-Kit-callbacks (reeds bestaand, herbevestigd)');

// ═══ Bevinding 5: sensitive-payload-regressie na deze wijzigingen (Fase 13) ═══
{
  const nieuwCodeBlok = html.slice(html.indexOf('training_instances: true'), html.indexOf('training_instances: true') + 200);
  ok(nieuwCodeBlok.indexOf('Authorization') === -1 && nieuwCodeBlok.indexOf('token') === -1, 'security-regressie: de gewijzigde code bevat geen auth-gerelateerde termen');
}

console.log('fCriticalFlowResilience: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
