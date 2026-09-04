/* core/fInzichtV01ProductionDataRegression.test.js
 * Production Data Regression (HRV/Rusthartslag/Slaap) -- gericht op de exacte
 * root cause: 'dc' (DeviceCore-alias) bestond niet globaal binnen
 * inzichtRenderOverview(), wat een stille ReferenceError gaf (opgevangen door
 * try/catch) en altijd "--" liet tonen, ook met aantoonbaar bestaande data.
 * Deze test controleert op SOURCE-niveau dat de lokale dc-definitie aanwezig
 * blijft binnen inzichtRenderOverview() -- de meest directe garantie tegen
 * herhaling van exact deze regressieklasse. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) pass++; else { fail++; msgs.push('MISLUKT: ' + label); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const fnStart = html.indexOf('async function inzichtRenderOverview()');
const fnEnd = html.indexOf('\nasync function ', fnStart + 10);
const fnSrc = html.slice(fnStart, fnEnd > 0 ? fnEnd : fnStart + 4000);

ok(fnStart > -1, '1: inzichtRenderOverview() bestaat nog');
ok(/var dc\s*=\s*\(typeof DeviceCore!==['"]undefined['"]\)\?DeviceCore:null/.test(fnSrc),
  '2: inzichtRenderOverview() definieert lokaal "var dc=DeviceCore" -- EXACT hetzelfde, bewezen patroon als het oude, werkende Lichaam-scherm (renderLichaamPremium). Zonder deze regel is elke dc.*-aanroep in deze functie een stille ReferenceError.');
ok(fnSrc.includes('dc.healthSeries') && fnSrc.includes('dc.qualifySeries') && fnSrc.includes('dc.healthStats'),
  '3: de functie gebruikt nog steeds uitsluitend de bestaande, canonieke dc.healthSeries/qualifySeries/healthStats-keten (geen nieuwe, eigen berekening toegevoegd om de regressie op te lossen)');

// Bevestig dat GEEN ENKELE andere dc.*-aanroep binnen deze functie kan
// plaatsvinden zonder dat de lokale definitie eraan voorafgaat in de bron.
const dcDefIndex = fnSrc.indexOf('var dc=');
const firstDcUse = fnSrc.indexOf('dc.health');
ok(dcDefIndex > -1 && dcDefIndex < firstDcUse, '4: de lokale dc-definitie staat vóór het eerste, daadwerkelijke gebruik van dc.* binnen de functie');

console.log('fInzichtV01ProductionDataRegression: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
