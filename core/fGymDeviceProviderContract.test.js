/* fGymDeviceProviderContract.test.js — MS-F11-04 regressietest. Feasibility-
 * sprint: het testbare artifact is een architecturale grens-test. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const doc = fs.readFileSync(path.join(ROOT, 'docs/F11_GYM_DEVICE_VENDOR_FEASIBILITY.md'), 'utf8');

ok(doc.includes('canonical_exercise_id') && doc.includes('FK naar de bestaande Exercise Library (EX_CATALOG), NOOIT verzonnen'),
  'A1: canonical_exercise_id verwijst expliciet naar de bestaande Exercise Library, geen nieuwe identiteit');

ok(doc.includes('location_id') && doc.includes('FK naar F11 locations (MS-F11-01) -- NOOIT een los, vendor-eigen locatiebegrip'),
  'B1: location_id hergebruikt expliciet het bestaande F11-locatiemodel');

['EGYM', 'Technogym', 'Keiser', 'Wattbike', 'Life Fitness'].forEach(function (vendor) {
  const vendorSectie = doc.split(vendor)[1] || '';
  ok(!vendorSectie.slice(0, 400).includes('REEDS GEÏMPLEMENTEERD'),
    'C: ' + vendor + ' wordt niet ten onrechte als reeds-geimplementeerd voorgesteld');
});

ok(doc.includes('REEDS GEÏMPLEMENTEERD') && doc.includes('DEV-CONCEPT2-001'),
  'D1: Concept2 wordt correct onderscheiden als reeds-bestaande, eerder gesloten capability');

ok(doc.includes('UNKNOWN blijft UNKNOWN') && doc.includes('RESEARCH FURTHER'),
  'E1: een vendor zonder gevonden officiele bron krijgt expliciet UNKNOWN/RESEARCH FURTHER');
ok(!/Matrix Fitness[\s\S]{0,50}NOW/.test(doc) && !/Matrix Fitness[\s\S]{0,50}PARTNER DEPENDENT/.test(doc),
  'E2: Matrix Fitness krijgt geen voorbarige NOW/PARTNER DEPENDENT-classificatie zonder bewijs');

ok(doc.includes('geen vendor-specifieke calculation-logica in de Calculation Engine sluipt'),
  'F1: het document bevestigt expliciet dat er geen vendor-specifieke logica in de Calculation Engine hoort');

ok(!/APK-analyse als productiestrategie|reverse engineering.*aanbevolen/i.test(doc),
  'G1: geen reverse-engineering of APK-analyse wordt als aanbevolen strategie voorgesteld');
ok(doc.includes('Geen reverse engineering, geen APK-analyse toegepast'),
  'G2: het document bevestigt expliciet dat geen reverse engineering of APK-analyse is toegepast');

console.log('fGymDeviceProviderContract: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
