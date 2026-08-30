/* fCommercialUxDarkPatternsAudit.test.js — MS-F12-03 regressietest. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

ok(html.includes('core/commercialUxCore.js') && html.includes('core/entitlementCore.js'),
  'A1: beide nieuwe modules zijn daadwerkelijk als <script src> ingeladen');
ok(html.includes('CommercialUxCore.buildPlanComparisonViewModel'),
  'A2: buildPlanComparisonViewModel() wordt daadwerkelijk vanuit de runtime aangeroepen');
ok(html.includes('CommercialUxCore.buildDowngradeStateViewModel'),
  'A3: buildDowngradeStateViewModel() wordt daadwerkelijk vanuit de runtime aangeroepen');
ok(html.includes('refreshMijnAbonnementCard()') && html.includes('function refreshMijnAbonnementCard'),
  'A4: refreshMijnAbonnementCard() wordt zowel gedefinieerd als daadwerkelijk aangeroepen');
ok(html.includes('id="plan-huidig-card"') && html.includes('id="m-plan-overzicht"'),
  'A5: de vereiste DOM-elementen voor de commerciële UX bestaan daadwerkelijk');

{
  const renderBlok = html.split('function renderPlanOverzicht')[1].split('function commercialErrorMessage')[0];
  ok(renderBlok.includes('p.prijsCent===null') && renderBlok.includes("'Prijs wordt nog bekendgemaakt'"),
    'B1: bij een NULL-prijs wordt expliciet "Prijs wordt nog bekendgemaakt" getoond, geen verzonnen bedrag');
}

ok(!/checked(?!=false)[^>]*type="checkbox"[^>]*(plan|abonnement|premium|marketing|nieuwsbrief)/i.test(html),
  'C1: geen vooraf aangevinkte commerciële/marketing-checkbox gevonden');
ok(!html.match(/aftellen.*(korting|deal|aanbieding)|countdown.*(korting|deal|aanbieding|aanbod)/i),
  'C2: geen countdown-gebaseerde nep-urgentie rond een commerciële aanbieding (de bestaande trainingsinterval-aftelling is hiervan uitgesloten)');
ok(!html.match(/laatste kans|nog maar \d+ (plekken|dagen) over/i),
  'C3: geen nep-schaarste-taal ("laatste kans", "nog maar N plekken over")');
ok(html.includes("closeModal('m-plan-overzicht')") && html.includes('btn-primary'),
  'C4: de modal heeft een duidelijke, primaire sluitknop -- geen verstopte cancel/close-actie');

const uxSrc = fs.readFileSync(path.join(ROOT, 'core/commercialUxCore.js'), 'utf8');
['delete-account', 'privacy', 'consent', 'data-export', 'exporteren'].forEach(function (term) {
  ok(!uxSrc.toLowerCase().includes(term), 'D: commercialUxCore.js bevat geen verwijzing naar "' + term + '" -- veiligheidsfuncties worden hier nooit als gateable capability gemodelleerd');
});

ok(!html.match(/je\s+hrv[-\s]?data\s+is\s+(pro|premium)/i),
  'E1: nergens de tekst "je HRV-data is Pro/Premium" -- brondata wordt nooit als betaalmuur gepresenteerd');

ok(!html.match(/individual_plan_key\s*=[^=]/i),
  'F1: index.html bevat nergens een directe client-side toewijzing aan individual_plan_key (blijft uitsluitend server-side, MS-F12-02)');

console.log('fCommercialUxDarkPatternsAudit: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
