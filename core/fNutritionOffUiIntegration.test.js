/* fNutritionOffUiIntegration.test.js — NUT-OFF-UI-01.
 *
 * Statische contract-check (geen netwerk/DOM nodig) op de nieuwe
 * client-side glue in index.html. De onderliggende pure logica
 * (OpenFoodFactsAdapter, NutritionIngestService, de Netlify-functie)
 * is al apart getest en blijft in deze sprint ongewijzigd -- dit
 * bestand bewaakt uitsluitend de NIEUWE bedrading:
 *  - local-first (OFF wordt nooit vóór de lokale lookup aangeroepen);
 *  - elke OFF-hit gaat via de bestaande resolveIngestDecision, nooit
 *    direct naar een meal_item;
 *  - retry/dubbel-scan levert geen dubbele canonical rij op;
 *  - UNKNOWN blijft UNKNOWN (geen ||0-fallback op nutrientvelden);
 *  - geen dead end bij een miss (modal, geen alert/confirm/prompt);
 *  - nutrition_entries komt nergens in de nieuwe code voor;
 *  - de Portion Engine (portionToNutrients) blijft de enige
 *    quantity->nutrient-rekenroute -- de ingest-functies roepen hem
 *    zelf niet aan.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r/g, '');

function functionBody(name) {
  const re = new RegExp('(?:async )?function ' + name + '\\([^)]*\\)\\{([\\s\\S]*?)\\n\\}\\n');
  const m = html.match(re);
  return m ? m[1] : null;
}

const resolveBody = functionBody('voedingResolveBarcode');
const ingestBody = functionBody('voedingIngestOffCandidate');
const lookupBody = functionBody('voedingOffLookup');
const missBody = functionBody('voedingOpenBarcodeMiss');
const scanLoopBody = functionBody('voedingRunScanLoop');
const manualBody = functionBody('voedingLookupBarcodeValue');

ok(!!resolveBody, 'setup: voedingResolveBarcode gevonden');
ok(!!ingestBody, 'setup: voedingIngestOffCandidate gevonden');
ok(!!lookupBody, 'setup: voedingOffLookup gevonden');
ok(!!missBody, 'setup: voedingOpenBarcodeMiss gevonden');

// ---- LOCAL-FIRST ----
ok(!!resolveBody && resolveBody.indexOf("sbGet('nutrition_product_identifiers'") < resolveBody.indexOf('voedingOffLookup('),
  'A1: de lokale identifier-lookup staat vóór de OFF-aanroep in de broncode (structurele volgorde)');
ok(!!resolveBody && /if\(localMatch&&localMatch\.length\) return \{status:'FOUND_LOCAL'/.test(resolveBody),
  'A2: een lokale hit retourneert direct, zonder ooit voedingOffLookup te bereiken');

// ---- CANONICAL INGEST, NOOIT DIRECT NAAR EEN MEAL_ITEM ----
ok(!!ingestBody && ingestBody.includes('NutritionIngestService.resolveIngestDecision('),
  'B1: elke OFF-candidate gaat door de bestaande NutritionIngestService.resolveIngestDecision');
ok(!!ingestBody && !ingestBody.includes('nutrition_meal_items'),
  'B2: de ingest-functie schrijft zelf nooit naar nutrition_meal_items (blijft aan de bestaande quantity/add-flow)');
ok(!!resolveBody && !resolveBody.includes('nutrition_meal_items'),
  'B3: voedingResolveBarcode schrijft zelf nooit naar nutrition_meal_items');

// ---- RETRY-VEILIGHEID ----
const ingestLines = (ingestBody || '').split('\n').map((l) => l.trim()).filter(Boolean);
const firstRealStatementIdx = ingestLines.findIndex((l) => l.indexOf('existingIdentifiers') >= 0 || l.indexOf('try{') >= 0);
const createIdx = ingestBody ? ingestBody.indexOf("action==='CREATE_NEW'") : -1;
const existingLookupIdx = ingestBody ? ingestBody.indexOf('existingIdentifiers=await sbGet') : -1;
ok(existingLookupIdx >= 0 && (createIdx < 0 || existingLookupIdx < createIdx),
  'C1: de her-lookup van een bestaande identifier staat structureel vóór de CREATE_NEW-tak');
ok(!!ingestBody && /existingIdentifiers=await sbGet\('nutrition_product_identifiers'/.test(ingestBody),
  'C2: opnieuw opzoeken op exacte barcode-identity vóór schrijven (dekt de "response verloren, actie wel gelukt"-retry)');
ok(!!ingestBody && /catch\(e\)\{[\s\S]{0,300}raceWinner=await sbGet\('nutrition_product_identifiers'/.test(ingestBody),
  'C3: een unique-constraint-conflict op de identifier (gelijktijdige eerste scan) hergebruikt de winnaar i.p.v. een weesrij te laten hangen');

// ---- UNKNOWN BLIJFT UNKNOWN ----
ok(!!ingestBody && !/nutrients\.\w+\s*\|\|\s*0/.test(ingestBody),
  'D1: geen enkel nutrientveld krijgt een ||0-fallback (missing blijft null, nooit 0)');
ok(!!ingestBody && ingestBody.includes('candidate.nutrients.status'),
  "D2: nutrientwaarden worden alleen weggeschreven als de adapter status:'valid' meldt, nooit gegokt");

// ---- GEEN NIEUWE NUTRIENT-ARITHMETIC / PORTION ENGINE BLIJFT ENIG REKENPUNT ----
ok(!!ingestBody && !/portionToNutrients/.test(ingestBody),
  'E1: de ingest-functie roept portionToNutrients niet aan -- dat blijft exclusief het bestaande hoeveelheid-scherm');
ok(!!ingestBody && !/[a-zA-Z_]\)\s*[*+]\s*[a-zA-Z_(]/.test(ingestBody.replace(/\/\*[\s\S]*?\*\//g, '')),
  'E2: geen optel-/vermenigvuldig-uitdrukking op nutrientwaarden in de nieuwe UI-laag');

// ---- GEEN DEAD END, GEEN ALERT/CONFIRM/PROMPT ----
ok(!!missBody && missBody.includes("openModal('m-voeding-off-miss')"),
  'F1: een miss (lokaal én extern) opent een keuzemodal, geen toast-en-klaar');
ok(html.includes('id="m-voeding-off-miss"'), 'F2: de miss-modal bestaat in de markup');
ok(html.includes("onclick=\"closeModal('m-voeding-off-miss');voedingOpenPhotoUnavailable()\""),
  'F3: de modal biedt "Foto etiket" aan (hergebruikt de bestaande, ongewijzigde fotoflow)');
ok(html.includes("onclick=\"closeModal('m-voeding-off-miss');voedingOpenCustomProductForm()\""),
  'F4: de modal biedt "Zelf product toevoegen" aan (hergebruikt de bestaande, ongewijzigde customflow)');
const missModalBlock = (html.match(/id="m-voeding-off-miss"[\s\S]*?<\/div>\s*<\/div>/) || [''])[0];
ok(!/alert\(|confirm\(|prompt\(/.test(missModalBlock), 'F5: geen alert()/confirm()/prompt() in de miss-modal');
ok(!/alert\(|confirm\(|prompt\(/.test(resolveBody || '') && !/alert\(|confirm\(|prompt\(/.test(ingestBody || ''),
  'F6: geen alert()/confirm()/prompt() in de nieuwe resolutie-/ingest-logica');

// ---- GEEN nutrition_entries IN DE NIEUWE CODE ----
[resolveBody, ingestBody, lookupBody, missBody].forEach((body, i) => {
  ok(!body || !body.includes('nutrition_entries'), 'G' + (i + 1) + ': geen verwijzing naar nutrition_entries in de nieuwe functie #' + (i + 1));
});

// ---- BEIDE BESTAANDE AANROEPPUNTEN GEBRUIKEN NU DEZELFDE GEDEELDE RESOLUTIE (geen twee losse implementaties meer) ----
ok(!!scanLoopBody && scanLoopBody.includes('voedingResolveBarcode('), 'H1: de live scanner gebruikt de gedeelde voedingResolveBarcode');
ok(!!manualBody && manualBody.includes('voedingResolveBarcode('), 'H2: handmatige invoer gebruikt dezelfde gedeelde voedingResolveBarcode');
ok(!!scanLoopBody && !/sbGet\('nutrition_product_identifiers'/.test(scanLoopBody),
  'H3: de scanner doet geen eigen, dubbele lokale-lookup meer (uitsluitend via voedingResolveBarcode)');

// ---- SECURITY: geen client-side secret, verkeer via de bestaande, geauthenticeerde Netlify-functie ----
ok(!!lookupBody && lookupBody.includes("Authorization:'Bearer '+authSession.access_token"),
  'I1: OFF-verkeer loopt via de bestaande sessie-JWT, geen los, hardcoded secret');
ok(!!lookupBody && lookupBody.includes("'/.netlify/functions/nutrition-off-lookup'"),
  'I2: uitsluitend de bestaande, server-side Netlify-functie wordt aangeroepen -- geen directe fetch naar openfoodfacts.org vanuit de client');
ok(!html.includes('world.openfoodfacts.org'), 'I3: geen directe OFF-URL in de client (blijft server-side, User-Agent-eis)');

console.log('fNutritionOffUiIntegration: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
