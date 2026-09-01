/* fB9_03RunningIntelligence.test.js — B9-03 Running Intelligence.
 * Bewaakt de UI-integratie: hergebruik van canonieke engines (geen
 * shadow calculation), progressive disclosure, empty states, max-effort-
 * markering (opt-in, geen automatische aanname), eerlijke HR-zones-gap,
 * geen extra bottom-nav-tab, en de resterende, verplichte sabotage-
 * scenario's uit de opdracht (1: lokale pace, 3: HR-zone-default,
 * 4: CS door normale run, 9: ACWR-als-blessurewaarschuwing, 10: missing
 * data als 0).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const migratie = fs.readFileSync(path.join(ROOT, 'migratie_v534.sql'), 'utf8');

// ---- A. Hergebruik van canonieke engines, geen tweede trend-/load-engine ----
ok(html.includes('ProgressionCore.trendBy(perfsMetPace') && html.includes('CardioCore.splitFromDistTime'),
  'A1: pace-trend gebruikt de bestaande ProgressionCore.trendBy() en CardioCore, geen nieuwe trend-berekening');
ok(html.includes('TrainingLoadCore.sessionLoadSRPE') && html.includes('TrainingLoadCore.rollingLoadSum'),
  'A2: load gebruikt de bestaande, canonieke TrainingLoadCore (Foster-methode), geen tweede load-engine');
ok(html.includes('CardioCore.criticalSpeed(csElig.performances)'),
  'A3: Critical Speed gebruikt uitsluitend de bestaande, canonieke CardioCore.criticalSpeed()');
{
  // Sabotage-scenario 1: de pace-waarde voor de trend moet exact via
  // CardioCore.splitFromDistTime() lopen -- een positieve, robuuste check
  // (een negatieve regex op "distance/duration" is te makkelijk te omzeilen
  // met een equivalente, herschreven formule zoals duration/(distance/1000)).
  const perfsRegel = html.match(/const split=([^;]+);\s*\n\s*return band&&split!=null/);
  ok(perfsRegel && perfsRegel[1].trim() === 'CardioCore.splitFromDistTime(a.distance_meters,a.duration_seconds,1000)',
    'A4 (sabotage 1): de pace-waarde voor de trend komt exact en uitsluitend uit CardioCore.splitFromDistTime() -- geen eigen, lokale of herschreven formule');
}

// ---- B. Max-effort-markering: opt-in, geen automatische aanname ----
ok(html.includes('id="running-is-max-effort"') && html.includes('type="checkbox"'),
  'B1: max-effort is een expliciete checkbox, standaard niet aangevinkt (default false in HTML)');
ok(html.includes('const isMaxEffort=isMaxEffortEl?isMaxEffortEl.checked:false'),
  'B2: is_max_effort wordt uitsluitend gelezen uit de expliciete checkbox-status, nooit automatisch afgeleid uit afstand/tijd/pace');

// ---- C. HR-zones: eerlijke, expliciete gap, geen "220-leeftijd" (sabotage 3) ----
ok(html.includes('Nog niet beschikbaar (canonieke berekening ontbreekt) — geen verzonnen zones'),
  'C1: HR-zones tonen expliciet "nog niet beschikbaar", geen shadow-formule');
{
  const insightsBlok = html.split('async function renderRunningInsights()')[1].split('// ══════════════════════════════════════════════════════════\n// B9-02 — Cycling destination shell')[0];
  ok(!insightsBlok.match(/220\s*-|karvonen/i),
    'C2 (sabotage 3): geen "220-leeftijd" of Karvonen-formule ergens in het Insights-codeblok');
}

// ---- D. Consistency: geen performance-voorspelling (sectie 9) ----
ok(html.includes('Technische, afgeleide indicator (Evidence Level E) — zegt niets over verwachte prestaties'),
  'D1: consistency draagt expliciet Evidence Level E en een disclaimer, geen performance-claim');

// ---- E. ACWR/load: nooit als blessurewaarschuwing gepresenteerd (sabotage 9) ----
{
  const insightsBlok = html.split('async function renderRunningInsights()')[1].split('// ══════════════════════════════════════════════════════════\n// B9-02 — Cycling destination shell')[0];
  ok(!insightsBlok.match(/blessure|injury|geblesseerd|rustdag|rust nemen/i),
    'E1 (sabotage 9): geen enkele blessure-gerelateerde term of automatische rustdag-suggestie in het Insights-blok -- load is uitsluitend een neutraal cijfer');
}

// ---- F. Empty states: 0 runs geeft een uitleg, geen lege datadump ----
ok(html.includes('Nog geen runs opgeslagen. Rond je eerste hardlooptraining af'),
  'F1: bij 0 runs krijgt de gebruiker een uitleg, geen lege grafieken/dump');
ok(html.includes("if(n===0){") ,
  'F2: het aantal activiteiten wordt expliciet gecontroleerd vóór enige berekening (geen crash/misleiding bij 0 data)');

// ---- G. Geen missing data als 0 behandeld (sabotage 10) ----
ok(html.includes('if(!a||!a.recorded_at)return') || fs.readFileSync(path.join(ROOT,'core/runningIntelligence.js'),'utf8').includes('if (!a || !a.recorded_at) return'),
  'G1 (sabotage 10): een activiteit zonder geldige datum wordt genegeerd, niet als een 0-waarde meegeteld in de weekaggregatie');

// ---- H. Geen extra bottom-nav-tab, geen sportsamenvoeging ----
ok(html.includes('id="s-running-insights"') && !html.match(/id="s-running-insights"[\s\S]{0,50}bnav[\s\S]{0,300}Inzichten/),
  'H1: het nieuwe Inzichten-scherm heeft een eigen route zonder een nieuw, apart bottom-nav-item ervoor');
{
  const insightsScreenBlok = html.split('<div class="scr" id="s-running-insights">')[1].split('<div class="scr" id="s-cycling">')[0];
  const aantalNavTabs = (insightsScreenBlok.match(/<button class="ni/g) || []).length;
  ok(aantalNavTabs === 5, 'H2: het Inzichten-scherm gebruikt exact dezelfde, bestaande 5 bottom-nav-tabs, geen extra tab toegevoegd');
}

// ---- I. Schema: rpe/is_max_effort correct gevalideerd ----
ok(migratie.includes('rpe numeric check (rpe >= 0 and rpe <= 10)'),
  'I1: rpe is begrensd tot de geldige 0-10 Borg CR10-schaal op databaseniveau');
ok(migratie.includes('is_max_effort boolean not null default false'),
  'I2: is_max_effort heeft een veilige, expliciete default van false (nooit stilzwijgend true)');

console.log('fB9_03RunningIntelligence: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
