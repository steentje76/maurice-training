/* MASTER SPRINT v4.54.0 — MENSTRUATIECYCUS/TRAINING
 *
 * Dekt:
 *  A  cycle_prediction.v1 (puur, Calculation Core): starts/cycli/voorspelling
 *  B  plausibiliteitsfilter (te korte/te lange "cyclus" telt niet mee in het gemiddelde)
 *  C  onvoldoende data -> nooit een gok
 *  D  tkAtleetSyncVeld() strip cyclus_consent altijd (regressie-bescherming: de 4
 *     bestaande generieke atleet_profiel-syncs mogen dit veld nooit meesturen)
 *  E  broncode-audit: architectuurgrens (AI raakt cyclus_fase nergens rechtstreeks aan)
 *  F  broncode-audit: consent-gate aanwezig vóór render van cyclusgeschiedenis
 *  G  broncode-audit: delete wist alleen het cyclusveld, niet de hele check-in-rij
 *
 * Draai: node core/fMenstruatieCyclus.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const CalcCore = require('./calculation.js');

let pass = 0, fail = 0;
function ok(c, m){ if (c) pass++; else { fail++; console.log('  ✗ ' + m); } }
function eq(a, b, m){ ok(JSON.stringify(a) === JSON.stringify(b), m + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')'); }

function extractFn(name){
  const start = html.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('functie niet gevonden: ' + name);
  let depth = 0, end = -1;
  for (let j = html.indexOf('{', start); j < html.length; j++){
    const ch = html[j];
    if (ch === '{') depth++; else if (ch === '}'){ depth--; if (depth === 0){ end = j; break; } }
  }
  return html.slice(start, end + 1);
}

console.log('\n[MASTER SPRINT v4.54.0] Menstruatiecyclus/Training');

/* ── A. cycle_prediction.v1 — kernregels ─────────────────────────────────────────── */
console.log('\nA. CalcCore.cycleStarts / completedCycles / predictNextCycleStart');
const drieMaal28 = [
  { date: '2026-01-01', cyclus_fase: 'menstruatie' }, { date: '2026-01-02', cyclus_fase: 'menstruatie' },
  { date: '2026-01-08', cyclus_fase: 'folliculair' }, { date: '2026-01-14', cyclus_fase: 'ovulatie' },
  { date: '2026-01-20', cyclus_fase: 'luteaal' },
  { date: '2026-01-29', cyclus_fase: 'menstruatie' }, { date: '2026-01-30', cyclus_fase: 'menstruatie' },
  { date: '2026-02-26', cyclus_fase: 'menstruatie' }
];
eq(CalcCore.cycleStarts(drieMaal28), ['2026-01-01', '2026-01-29', '2026-02-26'],
  'A1: opeenvolgende menstruatie-dagen tellen als ÉÉN start, niet als meerdere');
const cycli = CalcCore.completedCycles(drieMaal28);
eq(cycli.length, 2, 'A2: 3 starts -> 2 voltooide cycli');
eq(cycli[0].lengteDagen, 28, 'A3: eerste cycluslengte correct berekend');
const voorsp = CalcCore.predictNextCycleStart(drieMaal28);
ok(voorsp.beschikbaar === true, 'A4: voorspelling beschikbaar met 2 volledige cycli');
eq(voorsp.gemiddeldeLengteDagen, 28, 'A5: gemiddelde lengte correct');
eq(voorsp.voorspeldeDatum, '2026-03-26', 'A6: voorspelde datum = laatste start + gemiddelde lengte');
ok(voorsp.versie === 'cycle_prediction.v1', 'A7: versie vastgelegd (auditeerbaar)');

/* ── B. Plausibiliteitsfilter ─────────────────────────────────────────────────────── */
console.log('\nB. Plausibiliteitsfilter (te korte/te lange interval telt niet mee)');
const metLogfout = [
  { date: '2026-01-01', cyclus_fase: 'menstruatie' },
  { date: '2026-01-05', cyclus_fase: 'menstruatie' },   // 4 dagen later "opnieuw menstruatie" -> logfout, te kort
  { date: '2026-02-02', cyclus_fase: 'menstruatie' }
];
const cycliMetFout = CalcCore.completedCycles(metLogfout);
ok(cycliMetFout[0].plausibel === false, 'B1: interval van 4 dagen wordt als implausibel gemarkeerd');
ok(cycliMetFout[1].plausibel === true, 'B2: het normale interval blijft plausibel');
const voorspMetFout = CalcCore.predictNextCycleStart(metLogfout);
ok(voorspMetFout.aantalCycliGebruikt === 1, 'B3: alleen het plausibele interval telt mee in de voorspelling');

/* ── C. Onvoldoende data -> nooit een gok ─────────────────────────────────────────── */
console.log('\nC. Onvoldoende data');
eq(CalcCore.predictNextCycleStart([]).beschikbaar, false, 'C1: lege invoer -> geen voorspelling');
eq(CalcCore.predictNextCycleStart([{ date: '2026-01-01', cyclus_fase: 'menstruatie' }]).beschikbaar, false,
  'C2: één losse start -> geen voorspelling (geen educated guess)');
eq(CalcCore.predictNextCycleStart([{ date: '2026-01-01', cyclus_fase: 'foutieve_waarde' }]).beschikbaar, false,
  'C3: onbekende fase-waarde wordt genegeerd, geen crash');
eq(CalcCore.predictNextCycleStart([{ date: '2026-01-01', cyclus_fase: null }]).beschikbaar, false,
  'C4: null-fase wordt genegeerd');
ok(CalcCore.predictNextCycleStart(drieMaal28).voorspeldeDatum === CalcCore.predictNextCycleStart(drieMaal28).voorspeldeDatum,
  'C5: deterministisch bij identieke invoer');

/* ── D. tkAtleetSyncVeld — regressiebescherming voor de 4 bestaande syncs ────────── */
console.log('\nD. tkAtleetSyncVeld() strip cyclus_consent altijd');
const tkAtleetSyncVeld = new Function(extractFn('tkAtleetSyncVeld') + '; return tkAtleetSyncVeld;')();
const metConsent = { naam: 'Test', geslacht: 'vrouw', cyclus_consent: true };
const gestript = tkAtleetSyncVeld(metConsent);
ok(!('cyclus_consent' in gestript), 'D1: cyclus_consent is verwijderd uit de payload');
eq(gestript.naam, 'Test', 'D2: overige velden blijven intact');
eq(gestript.geslacht, 'vrouw', 'D3: geslacht blijft intact');
ok(metConsent.cyclus_consent === true, 'D4: het origineel (atleet zelf) wordt niet gemuteerd');

console.log('\nD-audit. Alle 4 bestaande generieke atleet_profiel-syncs gebruiken tkAtleetSyncVeld()');
const syncCalls = (html.match(/sbUpsert\('atleet_profiel',\s*\{\.\.\.(?:tkAtleetSyncVeld\(atleet\)|atleet)/g) || []);
const onbeschermd = (html.match(/sbUpsert\('atleet_profiel',\s*\{\.\.\.atleet[,}]/g) || []);
ok(syncCalls.length >= 4, `D5: minstens 4 atleet_profiel-syncs gevonden (${syncCalls.length})`);
eq(onbeschermd.length, 0, 'D6: geen enkele generieke sync stuurt {...atleet,...} rechtstreeks mee (allemaal via tkAtleetSyncVeld)');

/* ── E. Architectuurcontrole — AI raakt cyclus_fase nergens rechtstreeks aan ─────── */
console.log('\nE. Architectuurcontrole (RAW DATA -> Calculation -> Decision -> AI Coach)');
ok(!/cyclus_fase/i.test(html.match(/coach.{0,400}/gi)?.join('') || ''), 'E1: (indicatief) geen coach-nabije context met cyclus_fase in de directe omgeving');
ok(!/prompt.*cyclus_fase|cyclus_fase.*prompt/i.test(html), 'E2: cyclus_fase komt nergens in de buurt van "prompt" voor — AI krijgt het nooit ruw aangeleverd');
ok(typeof CalcCore.cyclusDagFactor === 'function' && typeof CalcCore.predictNextCycleStart === 'function',
  'E3: alle cyclusberekening leeft in de Calculation Core, niet in de UI-laag');

/* ── F. Consent-gate vóór de UI ───────────────────────────────────────────────────── */
console.log('\nF. Consent-gate: renderCyclusSectie() toont nooit iets zonder expliciete ja');
const renderCyclusSrc = extractFn('renderCyclusSectie');
ok(/geslacht!=='vrouw'\)\s*return\s*''/.test(renderCyclusSrc), 'F1: niets getoond bij geslacht !== vrouw');
ok(/cyclus_consent!==true\)/.test(renderCyclusSrc), 'F2: consent expliciet gecontroleerd (true, niet "truthy")');
ok(/Cyclus bijhouden\?/.test(renderCyclusSrc), 'F3: apart consentmoment wordt getoond zolang er geen keuze is');
ok(/geen diagnose|geen claims over vruchtbaarheid/i.test(renderCyclusSrc), 'F4: expliciete disclaimer aanwezig (geen medische claim)');

/* ── G. Verwijderen raakt alleen het cyclusveld, niet de hele dag-rij ────────────── */
console.log('\nG. Verwijderen is gericht — HRV/RHR/slaap van dezelfde dag blijven intact');
const deleteSrc = extractFn('tkCyclusEntryDelete');
ok(/cyclus_fase:null/.test(deleteSrc), 'G1: delete zet cyclus_fase op null...');
ok(!/sbDel\(|method:\s*['"]DELETE['"]/i.test(deleteSrc), 'G2: ...en verwijdert NIET de hele hrv_log-rij (geen sbDel()-aanroep of HTTP DELETE)');

console.log('\n========================================================');
console.log(`RESULTAAT: ${pass} geslaagd, ${fail} mislukt`);
console.log(fail === 0 ? '✅ Menstruatiecyclus/Training: puur, consent-gated, geen dubbele opslag.' : '❌ NIET groen.');
process.exitCode = fail === 0 ? 0 : 1;
