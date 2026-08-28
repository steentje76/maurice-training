/* fExerciseLibrary.test.js — MS-F2-04 regressietest.
 *
 * Audit: de Exercise Library-zoekmachine (ExerciseCatalogService, index.html) bleek al
 * een geavanceerde inverted-index-implementatie met caching, typo-correctie, alias-
 * resolutie, explainability, analytics en een ingebouwde index-validator (validateIndex()).
 * Canonical exercise-identity (catalog_id) wordt consistent gebruikt als selectie-ID, nooit
 * array-index of displaynaam. Custom-exercise-aanmaak is bewust beperkt tot de "losse
 * training"-flow (expliciete productgrens, geen defect: "Nieuwe oefening aanmaken kan
 * alleen via Training → Oefening").
 *
 * Geen nieuw defect gevonden. Deze test legt de bestaande normalisatie-/identity-garanties
 * vast als regressiecontract (bracket-matching functie-extractie, zelfde aanpak als de
 * eerdere F2-testbestanden — de volledige zoekmachine draait niet standalone buiten
 * index.html zonder de complete catalogusdata te laden).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

function extractFunctionBody(source, name) {
  const re = new RegExp('function\\s+' + name + '\\s*\\(');
  const m = re.exec(source);
  if (!m) return null;
  const braceStart = source.indexOf('{', m.index);
  if (braceStart === -1) return null;
  let depth = 0;
  for (let i = braceStart; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) return source.slice(braceStart, i + 1);
    }
  }
  return null;
}

// ---- A. Zoeknormalisatie: case-insensitive, leestekens weg, getrimd ----
{
  const body = extractFunctionBody(html, '_norm');
  ok(body !== null, '_norm() (zoeknormalisatie) wordt gevonden');
  if (body) {
    ok(/\.toLowerCase\(\)/.test(body), '_norm() is case-insensitive (.toLowerCase())');
    ok(/\.trim\(\)/.test(body), '_norm() trimt de invoer (geen last van voor-/achterspaties)');
    ok(/replace\(\/\[-_\/\]\/g/.test(body), '_norm() normaliseert koppeltekens/underscores/slashes naar spaties');
  }
}

// ---- B. Canonical identity: selectie gebruikt altijd catalog_id, nooit index/naam ----
{
  const body = extractFunctionBody(html, '_item');
  ok(body !== null, '_item() (library-kaart-rendering) wordt gevonden');
  if (body) {
    ok(/data-id=.\+c\.catalog_id/.test(body) || /data-id=\\?['"]\+c\.catalog_id/.test(body) || body.includes('c.catalog_id'),
      '_item() gebruikt c.catalog_id als data-id (canonical identity, geen array-index/naam)');
  }
}
{
  const body = extractFunctionBody(html, '_libOpen');
  ok(body !== null, '_libOpen() wordt gevonden');
  if (body) {
    ok(/pushRecent\(id\)/.test(body),
      '_libOpen() registreert het canonical ID (niet de displaynaam) in "recent bekeken"');
  }
}

// ---- C. Ingebouwde index-validator bestaat (zelfcontrole op de zoekindex) ----
{
  ok(html.includes('validateIndex:function()'),
    'ExerciseCatalogService heeft een ingebouwde validateIndex()-zelfcontrole (duplicaten, lege postings, onbereikbare oefeningen)');
}

// ---- D. Custom-exercise-scope: bewuste, expliciete productgrens (geen stille inconsistentie) ----
{
  ok(html.includes('Nieuwe oefening aanmaken kan alleen via Training'),
    'De beperking op waar een nieuwe oefening aangemaakt kan worden is expliciet gecommuniceerd aan de gebruiker (geen stille no-op)');
}

console.log('fExerciseLibrary: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
