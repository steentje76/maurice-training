/* fTriathlonBrickWorkflows.test.js — MS-F6-05 regressietest.
 *
 * A. Bewijst vanuit code dat triathlon/brick hetzelfde parent/child-segmentcontract
 *    gebruikt als HYROX (geen tweede multisportmodel).
 * B. Bevestigt dat er geen actief load-dubbeltellingsrisico bestaat: sessionLoad()/
 *    unifiedLoad() zijn nog niet in de runtime gewired.
 * C. Regressie-lock op de gecorrigeerde taper-AI-boundary-teksten.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

// ---- A. Gedeeld parent/child-contract, geen tweede multisportmodel ----
ok(html.includes("else if(instanceRow && instanceRow.race_type==='brick') sport='triathlon';"),
  'A1: hyroxReconstructPerformance() behandelt brick/triathlon via HETZELFDE race_type-veld als HYROX -- geen apart triathlonReconstructPerformance()');
ok(html.includes("raceIsOfficial: !!isOfficial, raceType: 'brick'"),
  'A2: hyroxStart() schrijft brick-triathlon via dezelfde createTrainingInstance()-aanroep als HYROX -- één parent-identiteit');
ok(html.includes("segment_index:1, exercise_id:null, cardio_type:'swimming'") &&
   html.includes("segment_index:3, exercise_id:null, cardio_type:'cycling'") &&
   html.includes("segment_index:5, exercise_id:null, cardio_type:'running'"),
  'A3: de drie brick-segmenten zijn elk aparte kind-sessierijen met een vast segment_index, geen drie losse workouts');

// ---- B. Geen actief dubbeltellingsrisico ----
ok(!/\bsessionLoad\(|\bunifiedLoad\(/.test(html.replace(/data:image[^"]*/g, '')),
  'B1: AthleteCore.sessionLoad()/unifiedLoad() worden nergens in de runtime aangeroepen -- geen live aggregatiepad dat parent+kind-belasting dubbel zou kunnen tellen');

// ---- C. Regressie-lock op de taper-AI-boundary-fix ----
ok(!html.includes('stel taper automatisch op'),
  'C1: de triathlon-coachingtekst instrueert de AI niet langer om zelfstandig een taper-schema op te stellen');
ok(html.includes('AI stelt zelf geen tapering-schema op'),
  'C2: de triathlon-coachingtekst bevat nu de expliciete taper-grens');
ok(html.includes('AI plant zelf geen taper-schema'),
  'C3: de running-coachingtekst bevat nu de expliciete taper-grens');

console.log('fTriathlonBrickWorkflows: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
