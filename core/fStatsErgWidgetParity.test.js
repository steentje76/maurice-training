/* fStatsErgWidgetParity.test.js — Endurance/Erg Statistics Parity.
 * Sluit het bevonden P3: het Statistieken-scherm had een hardcoded
 * "Roei progressie"-kaart (laatste 8 sessies + split/500m), maar geen
 * equivalente SkiErg/BikeErg-kaart -- terwijl CALC-END-001/002 expliciet
 * gelijke applicability claimen voor RowErg/SkiErg/BikeErg. Dit was geen
 * wetenschappelijk gemotiveerde uitsluiting (zoals decoupling/HR-zones),
 * maar een eerlijke productinconsistentie. Deze test bevestigt dat de
 * HTML-kaarten en de bijbehorende fetch/render-logica nu symmetrisch zijn
 * voor alle drie de ergometers.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// ═══ HTML-kaarten: alle drie de ergometers hebben nu een eigen kaart ═══
ok(html.indexOf('id="stats-row-list"') > 0, 'HTML: bestaande Roei-kaart blijft aanwezig (geen regressie)');
ok(html.indexOf('id="stats-skierg-list"') > 0, 'HTML: nieuwe SkiErg-progressiekaart aanwezig');
ok(html.indexOf('id="stats-bikeerg-list"') > 0, 'HTML: nieuwe BikeErg-progressiekaart aanwezig');
ok(html.indexOf('SkiErg progressie') > 0, 'HTML: SkiErg-kaart heeft een eigen, herkenbare titel');
ok(html.indexOf('BikeErg progressie') > 0, 'HTML: BikeErg-kaart heeft een eigen, herkenbare titel');

// ═══ JS-fetchlogica: correcte, canonieke exercise_id-waarden ═══
ok(html.indexOf("exercise_id=eq.skierg&order=date.desc,created_at.desc&limit=8") > 0,
  "JS: SkiErg-fetch gebruikt de canonieke exercise_id 'skierg' (bevestigd tegen de bestaande exercise-catalogus-entry id:'skierg'), zelfde limiet/sortering als Roeien");
ok(html.indexOf("exercise_id=eq.bikeerg&order=date.desc,created_at.desc&limit=8") > 0,
  "JS: BikeErg-fetch gebruikt de canonieke exercise_id 'bikeerg', zelfde limiet/sortering als Roeien");

// ═══ Eigen, onderscheidende lege-staat-tekst per sport (geen kopie-plak
// zonder aanpassing, geen misleidende "roeisessie"-tekst voor SkiErg) ═══
ok(html.indexOf('Nog geen SkiErg-sessies gelogd.') > 0, 'JS: SkiErg heeft een eigen, correcte lege-staat-tekst (niet de Roeien-tekst hergebruikt)');
ok(html.indexOf('Nog geen BikeErg-sessies gelogd.') > 0, 'JS: BikeErg heeft een eigen, correcte lege-staat-tekst');
ok(html.indexOf('⛷️') > 0, 'JS: SkiErg heeft een eigen, onderscheidend emoji voor de lege staat');
ok(html.indexOf('Nog geen BikeErg-sessies gelogd.') > 0 && html.indexOf('🚴') > 0, 'JS: BikeErg heeft een eigen, onderscheidend emoji voor de lege staat');

// ═══ Render-doelen: elke fetch schrijft naar zijn EIGEN element-ID, geen
// kruisbesmetting (bv. SkiErg-data die per ongeluk in de Roeien-kaart
// terechtkomt) ═══
ok(html.indexOf("document.getElementById('stats-skierg-list')") > 0, "JS: SkiErg-resultaat wordt naar het EIGEN element 'stats-skierg-list' geschreven");
ok(html.indexOf("document.getElementById('stats-bikeerg-list')") > 0, "JS: BikeErg-resultaat wordt naar het EIGEN element 'stats-bikeerg-list' geschreven");

// ═══ Bestaande, generieke "Cardio records"-kaart blijft ongewijzigd
// aanwezig (complementair, geen duplicatie: PR-per-apparaat versus
// recente-sessies-geschiedenis) ═══
ok(html.indexOf('id="stats-cardio-list"') > 0, 'HTML: de bestaande, generieke, machine-aware "Cardio records"-kaart blijft ongewijzigd bestaan (complementair, geen vervanging)');

// ═══ Split/500m-berekeningslogica is letterlijk identiek gerepliceerd
// (zelfde formule als Roeien, geen losse, mogelijk-afwijkende
// herimplementatie) ═══
{
  const skiergBlok = html.slice(html.indexOf('// SkiErg —'), html.indexOf('// BikeErg —'));
  ok(skiergBlok.indexOf('(sec/s.distance)*500') > 0, 'JS: SkiErg gebruikt exact dezelfde split/500m-formule als Roeien (geen losse, potentieel afwijkende herimplementatie)');
}
{
  const bikeergBlok = html.slice(html.indexOf('// BikeErg —'), html.indexOf("const elbk=document.getElementById('stats-bikeerg-list')") + 100);
  ok(bikeergBlok.indexOf('(sec/s.distance)*500') > 0, 'JS: BikeErg gebruikt exact dezelfde split/500m-formule als Roeien en SkiErg');
}

console.log('fStatsErgWidgetParity: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
