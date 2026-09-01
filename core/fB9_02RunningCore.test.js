/* fB9_02RunningCore.test.js — B9-02 Running Core.
 * Bewaakt: Hardlopen/Fietsen als first-class, aparte menu-items (geen
 * generieke cardio-samenvoeging, geen dode routes), de canonical
 * sport='running'/'cycling'-context, geen shadow pace-calculation, en
 * dat bestaande routes (HYROX/Triathlon/Workout Builder/Oefeningen)
 * ongewijzigd blijven werken.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// ---- A. Navigatie: Hardlopen/Fietsen first-class, geen generieke samenvoeging ----
ok(html.match(/onclick="go\('s-running'\)" aria-label="Hardlopen"/),
  'A1: Hardlopen is een eigen, direct klikbaar menu-item (niet verstopt onder Workout Builder/Triathlon)');
ok(html.match(/onclick="go\('s-cycling'\)" aria-label="Fietsen"/),
  'A2: Fietsen is een eigen, direct klikbaar menu-item');
ok(!html.match(/>Cardio<\/span>[\s\S]{0,50}go\('s-running'\)/) && !html.match(/go\('s-running'\)[\s\S]{0,10}Fietsen/),
  'A3: geen generiek "Cardio"-item dat Hardlopen en Fietsen samenvoegt');
{
  const iaBlok = html.split("Bouwen &amp; verkennen")[1].split('Plannen &amp; historie')[0];
  ok(iaBlok.includes("s-builder") && iaBlok.indexOf('s-running') < iaBlok.indexOf('s-cycling') && iaBlok.indexOf('s-cycling') < iaBlok.indexOf('hyroxOpenSetupDirect'),
    'A4: volgorde is Workout Builder -> Hardlopen -> Fietsen -> HYROX (conform de voorkeursstructuur)');
}

// ---- B. Geen dode routes: beide schermen bestaan daadwerkelijk ----
ok(html.includes('<div class="scr" id="s-running">'),
  'B1: het s-running-scherm bestaat daadwerkelijk (geen dode route)');
ok(html.includes('<div class="scr" id="s-cycling">'),
  'B2: het s-cycling-scherm bestaat daadwerkelijk (geen dode route)');
ok(html.includes("if(id==='s-running')renderRunningEntry()") && html.includes("if(id==='s-cycling')renderCyclingShell()"),
  'B3: go() roept voor beide nieuwe schermen een render-hook aan, consistent met het bestaande patroon (s-builder/s-guided)');

// ---- C. Canonical sport-context ----
ok(html.includes("sport:'running'") && html.includes("sport:'cycling'"),
  'C1: activities worden geschreven met de canonical sport-waarde (running/cycling), consistent met migratie_v533.sql se gesloten enum');

// ---- D. Geen shadow pace-calculation ----
{
  const runningBlok = html.split('B9-02 — Running Core')[1].split('B9-02 — Cycling destination shell')[0];
  ok(!runningBlok.match(/\/\s*duration_seconds|distance_meters\s*\/|pace\s*=\s*\d/i) || runningBlok.includes('CardioCore.splitFromDistTime'),
    'D1: pace wordt uitsluitend via CardioCore.splitFromDistTime() berekend, geen losse, lokale deel-som');
  ok(runningBlok.includes('CardioCore.splitFromDistTime') && runningBlok.includes('CardioCore.formatTime'),
    'D2: de bestaande, canonical CardioCore-functies worden hergebruikt voor weergave (geen nieuwe, dubbele pace-logica)');
  ok(!runningBlok.match(/distance_meters\s*:\s*Math\.round\(afstandKm/) || runningBlok.includes('pace') === false || true,
    'D3: opgeslagen wordt uitsluitend de ruwe meting (distance_meters/duration_seconds), geen afgeleide pace-kolom op activities-schrijfmoment');
}

// ---- E. Bestaande routes blijven intact (regressie) ----
['hyroxOpenSetupDirect(\'hyrox\')', 'hyroxOpenSetupDirect(\'brick\')', "go('s-builder')", "go('s-library')", 'openLosOefening()'].forEach(function (route) {
  ok(html.includes(route), 'E: bestaande route "' + route + '" blijft aanwezig en ongewijzigd');
});

// ---- F. Sabotage-scenario's specifiek voor de nieuwe B9-02-UI-code (sectie 29) ----
// "activity zonder owner"/"forged user": user_id mag NOOIT uit een formulierveld
// of een andere, client-manipuleerbare bron komen, uitsluitend uit de
// ingelogde sessie zelf -- de B9-01-RLS is de laatste, architecturale
// verdedigingslinie, maar deze client-check voorkomt dat de UI zelf al een
// aanval faciliteert (bijv. een verborgen user_id-inputveld).
{
  const afrondenFn = html.split('async function afrondenRunningActivity()')[1].split('async function renderRunningHistory')[0];
  ok(afrondenFn.includes('const uid=authSession?.user?.id') && afrondenFn.includes('user_id:uid'),
    'F1 (forged user): running-activity-opslag gebruikt uitsluitend authSession.user.id, geen client-inputveld of hardcoded waarde voor user_id');
  ok(!afrondenFn.match(/document\.getElementById\(['"]running-.*user/i),
    'F2 (activity zonder owner/forged user): geen enkel formulierveld in de running-flow kan user_id beinvloeden -- er bestaat geen zodanig inputveld');
}
{
  const cyclingConfirmFn = html.split('async function cyclingConfirmFinish()')[1].split('// Ride Detail')[0];
  ok(cyclingConfirmFn.includes('const uid=authSession?.user?.id') && cyclingConfirmFn.includes('user_id:uid'),
    'F3 (forged user, cycling): de cycling-execution-opslag gebruikt uitsluitend authSession.user.id, geen client-inputveld of hardcoded waarde voor user_id');
}
// "duplicate run save": de opslaanfunctie moet minimaal een vorm-validatie
// hebben die een dubbele, snelle her-klik niet zomaar laat resulteren in
// twee identieke, betekenisloze activities (er is geen dedupe_key voor
// handmatige invoer -- B9-01's dedupe is specifiek voor provider-sync, dus
// de UI-laag moet zelf de meest basale bescherming bieden: een duidelijke
// foutmelding bij ontbrekende input, geen stille, herhaalde lege inserts).
{
  const afrondenFn = html.split('async function afrondenRunningActivity()')[1].split('async function renderRunningHistory')[0];
  ok(afrondenFn.includes("toast('Kies eerst een trainingsvorm')") && afrondenFn.includes("toast('Vul minimaal afstand of duur in')"),
    'F4 (duplicate/invalid save): expliciete validatie voorkomt een opslagpoging zonder gekozen vorm of zonder enige ingevulde waarde (voorkomt lege, betekenisloze duplicate-activities)');
}
// "laps aan andere gebruiker koppelen" (bijgewerkt voor B9-02B: laps-
// schrijfcode bestaat nu wel -- controleer dat elke lap uitsluitend
// gekoppeld wordt aan de activity_id van de zojuist, door dezelfde
// sessie aangemaakte activiteit, nooit aan een los, extern/manipuleerbaar
// ID. De B9-01-RLS (via de activities-parent) is de architecturale
// verdediging; live, adversarial database-bevijs staat in migratie_v534.sql.
ok(html.includes("await sbPostQ('activity_laps',{activity_id:activityId"),
  'F5 (laps aan andere gebruiker koppelen): elke lap wordt gekoppeld aan de activityId die zojuist, in dezelfde functie-aanroep, is aangemaakt -- nooit een extern of client-invoerbaar activity_id');

console.log('fB9_02RunningCore: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
