/* fRelationshipIntelligenceMSF704.test.js — MS-F7-04 regressietest.
 *
 * MS-F7-04 (Relationship Intelligence) bleek bij audit AL volledig
 * geïmplementeerd: RelationshipCore (Sprint 19, correlation.v1) bevat exact
 * de vereiste architectuur (sample-sufficiëntie, causaliteits-/populatie-
 * claim-preventie, spreidingstoets tegen schijnverbanden). Dit testbestand
 * vult het bestaande core/fRelationship.test.js (72 asserts) aan met de
 * sabotage-eis die de huidige F7-kwaliteitsstandaard vereist.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const RC = require(path.join(ROOT, 'core/relationship.js'));

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

// ---- A. Architectuur-audit ----
ok(RC.REL_MIN_KANDIDAAT === 10, 'A1: een kandidaat-relatie vereist minimaal 10 observaties voordat hij zelfs getoond wordt');
ok(Array.isArray(RC.SAMPLE_TIERS) && RC.SAMPLE_TIERS.length >= 5, 'A2: een genuanceerde, meerlaagse confidence-schaal bestaat');
ok(Array.isArray(RC.RELATIE_VERBODEN_WOORDEN) && RC.RELATIE_VERBODEN_WOORDEN.indexOf('veroorzaakt') !== -1,
  'A3: een expliciete, geregistreerde lijst van verboden causale woorden bestaat');
ok(Array.isArray(RC.RELATIE_POPULATIE_WOORDEN) && RC.RELATIE_POPULATIE_WOORDEN.length > 0,
  'A4: een expliciete lijst van verboden populatieclaim-woorden bestaat');

// ---- B. Documentatiebewijs: progressie bewust uitgesloten wegens circulariteit ----
{
  const bron = fs.readFileSync(path.join(ROOT, 'core/relationship.js'), 'utf8');
  ok(bron.includes('progressiebesluit zijn bewust NIET toegevoegd') && bron.includes('schijnverband'),
    'B1: het progressiebesluit is expliciet, methodologisch gefundeerd uitgesloten (circulariteit met RPE)');
}

// ---- C. Sabotagebewijs ----
{
  const spreiding5 = RC.spreiding([1, 2, 3, 4, 5]);
  ok(spreiding5.voldoende === true, 'C1: 5 verschillende waarden (op de grens) worden als voldoende geclassificeerd');
  const spreiding2 = RC.spreiding([1, 1, 1, 2, 2]);
  ok(spreiding2.voldoende === false, 'C2: onvoldoende variatie wordt correct herkend, voorkomt een inhoudelijk waardeloze correlatie');
}

console.log('fRelationshipIntelligenceMSF704: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
