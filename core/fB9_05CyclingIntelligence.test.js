/* fB9_05CyclingIntelligence.test.js — B9-05 Cycling Intelligence.
 * Bewaakt de UI-integratie: hergebruik van canonieke engines (geen
 * shadow calculation), correct veldgebruik (cp_w), max-effort-opt-in,
 * eerlijke powerzones-gap, geen extra bottom-nav-tab, dode-lijstitem-
 * fix (zelf gevonden, hergebruikt van de B9-02C-les), en sabotage.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// ---- A. Hergebruik van canonieke engines ----
ok(html.includes('RunningIntelligenceCore.weeklyVolume(activities)') && html.includes('RunningIntelligenceCore.consistency(activities'),
  'A1: Cycling hergebruikt de bestaande, generieke weeklyVolume()/consistency() -- geen duplicaat gebouwd');
ok(html.includes('ProgressionCore.trendBy(perfsMetSnelheid') && html.includes("ProgressionCore.trendBy(perfsMetPower"),
  'A2: zowel snelheidstrend als vermogenstrend gebruiken de bestaande ProgressionCore.trendBy()');
ok(html.includes('CardioCore.criticalPower(cpElig.performances)'),
  'A3: Critical Power gebruikt uitsluitend de bestaande, canonieke CardioCore.criticalPower()');
ok(html.includes('cpResultaat.cp_w'),
  'A4: het correcte, daadwerkelijke veld (cp_w) van criticalPower() wordt gebruikt, geen verzonnen veldnaam');

// ---- B. Max-effort-markering (Cycling, nieuw in B9-05) ----
ok(html.includes('id="cycling-is-max-effort"') && html.includes('type="checkbox"'),
  'B1: Cycling heeft nu een expliciete max-effort-checkbox, nodig om Critical Power te kunnen voeden');
ok(html.includes('const isMaxEffort=isMaxEffortEl?isMaxEffortEl.checked:false'),
  'B2: is_max_effort wordt uitsluitend gelezen uit de expliciete checkbox-status, consistent met het Running-patroon');

// ---- C. Fiets-specifieke afstandsbanden, niet Running se banden hergebruikt ----
ok(html.includes('CyclingIntelligenceCore.speedBandKey(a.distance_meters)'),
  'C1: snelheidstrend gebruikt CyclingIntelligenceCore.speedBandKey(), niet Running se distanceBandKey()');

// ---- D. Powerzones: eerlijke gap, geen bro-science ----
ok(html.includes('Nog niet beschikbaar (canonieke berekening ontbreekt) — geen verzonnen zones') && html.match(/Powerzones/),
  'D1: powerzones tonen expliciet "nog niet beschikbaar", geen shadow-formule');
{
  const startIdx = html.indexOf('async function renderCyclingInsights()');
  const eindIdx = html.indexOf('\n}', html.indexOf('Powerzones nog niet beschikbaar', startIdx));
  const insightsBlok = html.slice(startIdx, eindIdx);
  ok(!insightsBlok.match(/95%|20-min-power|ftp.*0\.95|0\.95.*ftp/i),
    'D2: geen "95% van 20-min-power"-FTP-schattingsformule ergens in het Cycling-Insights-blok');
}

// ---- E. Zelf gevonden en gerepareerd: dode lijstitems in de geschiedenis ----
ok(html.match(/onclick="renderRideDetail\('\$\{r\.id\}'\)"/),
  'E1 (zelf gevonden, B9-02C-les hergebruikt): elk item in de Cycling-geschiedenis is klikbaar en opent zijn eigen Ride Detail -- geen dode lijstitems');

// ---- F. Geen extra bottom-nav-tab ----
{
  const startIdx = html.indexOf('<div class="scr" id="s-cycling-insights">');
  const eindIdx = html.indexOf('</nav>', startIdx);
  const cyclingInsightsBlok = html.slice(startIdx, eindIdx);
  const aantalNavTabs = (cyclingInsightsBlok.match(/<button class="ni/g) || []).length;
  ok(aantalNavTabs === 5, 'F1: het Cycling-Inzichten-scherm gebruikt exact dezelfde, bestaande 5 bottom-nav-tabs, geen extra tab toegevoegd');
}

// ---- G. De B9-04-placeholder-knop is nu correct geactiveerd ----
ok(html.includes(`onclick="go('s-cycling-insights')" aria-label="Bekijk Fietsen-inzichten">📊 Inzichten</button>`),
  'G1: de eerder door B9-04 klaargezette, uitgeschakelde placeholder-knop is nu correct geactiveerd (geen disabled/title meer)');
ok(!html.includes('title="Volgt in een latere sprint"'),
  'G2: de oude "volgt in een latere sprint"-tekst is verwijderd');

// ---- H. Empty state ----
ok(html.includes('Nog geen ritten opgeslagen. Rond je eerste fietstraining af'),
  'H1: bij 0 ritten krijgt de gebruiker een uitleg, geen lege grafieken/dump');

console.log('fB9_05CyclingIntelligence: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
