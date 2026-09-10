/* fWearableSyncActivitiesUIWiring.test.js — B9-H3B afronding.
 * Bewaakt: de client roept wearable-sync-activities.js daadwerkelijk aan
 * (het bestond al server-side, maar werd nergens vanuit de UI gebruikt),
 * en dat dit STRIKT geïsoleerd gebeurt van de hoofd-sync (wearable-sync.js)
 * -- een storing/scope_missing in de aanvullende activity-sync mag de
 * al-succesvolle HRV/RHR/slaap/stappen-toast niet overschrijven of laten
 * falen (failure isolation, zelfde principe als sectie 15 van
 * fB9_H3BCloudProviderIntegration.test.js).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push(label); } }

console.log('B9-H3B afronding — UI-koppeling wearable-sync-activities.js');

const fnBlock = html.split('async function wearableSyncNow(){')[1].split('\n// Verwerkt de terugkeer van Google')[0];

ok(fnBlock.includes("fetch('/.netlify/functions/wearable-sync-activities'"),
  'A1: wearableSyncNow() roept nu daadwerkelijk wearable-sync-activities.js aan (voorheen server-side klaar maar nergens client-side gebruikt)');

ok(fnBlock.includes("fetch('/.netlify/functions/wearable-sync'") && fnBlock.indexOf("fetch('/.netlify/functions/wearable-sync'") < fnBlock.indexOf("fetch('/.netlify/functions/wearable-sync-activities'"),
  'A2: de hoofd-sync (wearable-sync.js, HRV/RHR/slaap/stappen) wordt eerst aangeroepen en afgehandeld, de activity-sync komt daarna, als aanvulling');

{
  // De activity-sync-aanroep moet in een EIGEN try/catch staan, NA de
  // hoofd-toast/renderWearableCard-afhandeling -- niet vóór of vermengd
  // met de foutafhandeling van de hoofd-sync. renderWearableCard() komt
  // twee keer voor (ook in het vroege foutpad); de LAATSTE (succespad-)
  // positie is waar de activity-sync na moet volgen.
  const parts = fnBlock.split('renderWearableCard();');
  const afterMainToast = parts[parts.length - 1] || '';
  ok(afterMainToast.includes('try{') && afterMainToast.includes("wearable-sync-activities") && afterMainToast.includes('}catch(_){'),
    'A3: de activity-sync-aanroep staat in een eigen try/catch, na de hoofd-synclogica -- een fout daarin kan de hoofdafhandeling niet meer beïnvloeden (die is al voltooid)');
}

ok(fnBlock.includes('scope_missing') || fnBlock.match(/status\s*'scope_missing'/) || fnBlock.includes("bewust stil"),
  'A4: een scope_missing/provider_error-status van de activity-sync wordt bewust stil afgehandeld -- geen storingsmelding boven op een al-succesvolle hoofdsync-toast (de externe OAuth-scope-configuratie is een gedocumenteerd, apart aandachtspunt, geen gebruikersfout)');

ok(fnBlock.includes('ad.imported>0') && fnBlock.includes("bijgewerkt vanaf Google Health"),
  'A5: bij daadwerkelijk geïmporteerde trainingen krijgt de gebruiker alsnog een eigen, aanvullende bevestiging');

console.log('\n========================================================');
console.log('fWearableSyncActivitiesUIWiring.test.js — ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail) { msgs.forEach(m => console.error('MISLUKT: ' + m)); process.exitCode = 1; }
