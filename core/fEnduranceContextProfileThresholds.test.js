/* fEnduranceContextProfileThresholds.test.js — ENDURANCE → CONTEXT, FASE B1 (Gap 1a)
 * Bewijst dat buildCtx() de persisted profiel-drempels (threshold_pace_seconds_per_km,
 * ftp_watts_user_entered) uit athlete_endurance_profile doorgeeft: sport-geïsoleerd,
 * met provenance, expliciet 'niet ingesteld' bij ontbreken, zonder berekening en zonder
 * verwarring met Critical Speed/Power (Gap 1b blijft NOT CONNECTED).
 *
 * Draai: node core/fEnduranceContextProfileThresholds.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const CardioCore = require(path.join(ROOT, 'core/cardio.js'));

let pass = 0, fail = 0; const msgs = [];
function ok(c, l) { if (c) pass++; else { fail++; msgs.push('MISLUKT: ' + l); } }

function extractFunctionBody(source, name) {
  const re = new RegExp('(?:async\\s+)?function\\s+' + name + '\\s*\\(');
  const m = re.exec(source); if (!m) return null;
  let i = source.indexOf('{', m.index), d = 0;
  for (let j = i; j < source.length; j++) {
    if (source[j] === '{') d++; else if (source[j] === '}') { d--; if (d === 0) return source.slice(m.index, j + 1); }
  }
  return null;
}
const body = extractFunctionBody(html, 'buildCtx');
ok(body, 'buildCtx() gevonden');

// ---- Statisch: verbinding, bron, isolatie, geen berekening ----
ok(/sbGet\('athlete_endurance_profile','&sport=in\.\(running,cycling\)&limit=2'\)/.test(body),
  'S1: exact één begrensde query op athlete_endurance_profile (running,cycling, max 2 rijen) in buildCtx()');
ok(/enduranceProfileRows(,[A-Za-z]+)*\] = await Promise\.all/.test(body), 'S2: profielrijen worden in de bestaande Promise.all opgehaald (geen extra sequentiële roundtrip)');
ok(/threshold_pace_seconds_per_km/.test(body) && /ftp_watts_user_entered/.test(body), 'S3: uitsluitend de twee persisted kolommen worden gelezen');
ok(!/criticalSpeed\(|criticalPower\(|criticalSpeedEligible|criticalPowerEligible/.test(body),
  'I: geen CardioCore.criticalSpeed/criticalPower- of eligibility-aanroep in buildCtx() (Gap 1b blijft NOT CONNECTED)');
ok(/CardioCore\.formatTime\(Math\.round\(_tp\)\)/.test(body), 'S4: pace-formattering via de bestaande canonieke CardioCore.formatTime(), geen eigen conversie');
ok(!/1000\s*\/|\/\s*1000|\*\s*3\.6|\/\s*3\.6|60\s*\*\s*60|Math\.pow|\bexp\(|regress|slope/.test(body.slice(body.indexOf('enduranceProfielTekst'))),
  'J: geen nieuwe formule/conversie in het endurance-profielblok (alleen Number/isFinite/round/formatTime)');
ok(/geen Critical Speed\)/.test(body) && /geen Critical Power\)/.test(body), 'E/F: de contexttekst labelt expliciet "geen Critical Speed" / "geen Critical Power"');
ok(/bron: door de sporter ing(esteld|evoerd) in het profiel/.test(body), 'P: provenance "door de sporter ingesteld/ingevoerd in het profiel" is expliciet');
ok(/niet ingesteld \(geen waarde beschikbaar; niet schatten\)/.test(body), 'B/D: ontbrekende waarde wordt expliciet "niet ingesteld ... niet schatten" (geen default, geen fallback)');
ok(/_wantRun=\(_sp==='running'\|\|_sp==='hardlopen'\|\|_sp==='triathlon'\)/.test(body) && /_wantBike=\(_sp==='cycling'\|\|_sp==='wielrennen'\|\|_sp==='triathlon'\)/.test(body),
  'G/H: sportisolatie op actieve sport (running/hardlopen vs cycling/wielrennen; triathlon beide)');
ok(/catch\(e\)\{ enduranceProfielTekst=''; \}/.test(body), 'F-S: fail-safe — elke fout levert een leeg blok, nooit een crash van buildCtx()');
ok(/\$\{enduranceProfielTekst\}/.test(body), 'S5: het blok wordt daadwerkelijk in de systeemprompt-tekst opgenomen');

// ---- Functionele simulatie van exact het geïmplementeerde blok ----
const start = body.indexOf("  let enduranceProfielTekst='';");
const end = body.indexOf("}catch(e){ enduranceProfielTekst=''; }") + "}catch(e){ enduranceProfielTekst=''; }".length;
ok(start > 0 && end > start, 'SIM0: profielblok geïsoleerd uit buildCtx()');
const snippet = (start > 0 && end > start) ? body.slice(start, end) : null;
function simulate(activeSport, rows) {
  if (!snippet) return '__VERBINDING_ONTBREEKT__';
  try {
    const fn = new Function('getActiveSport', 'enduranceProfileRows', 'CardioCore', snippet + '\nreturn enduranceProfielTekst;');
    return fn(() => activeSport, rows, CardioCore);
  } catch (e) { return '__SIMULATIE_FOUT__' + e.message; }
}
const RUN = { sport: 'running', threshold_pace_seconds_per_km: 285 };   // 4:45/km
const BIKE = { sport: 'cycling', ftp_watts_user_entered: 245 };
// A
let t = simulate('running', [RUN, BIKE]);
ok(/Hardlopen · drempeltempo \(pace-doel\): 4:45\/km/.test(t), 'A: running + threshold aanwezig → 4:45/km in context (via CardioCore.formatTime)');
ok(/eenheid: sec\/km/.test(t) && /bron: door de sporter ingesteld/.test(t), 'A: eenheid + provenance aanwezig');
ok(!/Fietsen · FTP|\d+ W \(eenheid: watt/.test(t), 'G: running-context lekt geen cycling FTP-regel of watt-waarde');
ok(/geen Critical Speed/.test(t), 'F: threshold pace wordt niet als Critical Speed gepresenteerd');
// B
t = simulate('hardlopen', [{ sport: 'running', threshold_pace_seconds_per_km: null }, BIKE]);
ok(/drempeltempo \(pace-doel\): niet ingesteld \(geen waarde beschikbaar; niet schatten\)/.test(t), 'B: running + threshold ontbreekt → expliciet niet ingesteld, geen default');
t = simulate('running', []);
ok(/niet ingesteld/.test(t) && !/\d+:\d\d\/km/.test(t), 'B2: geen profielrij → niet ingesteld, geen verzonnen pace');
// C
t = simulate('cycling', [RUN, BIKE]);
ok(/Fietsen · FTP: 245 W/.test(t) && /eenheid: watt/.test(t) && /bron: door de sporter ingevoerd/.test(t), 'C: cycling + FTP aanwezig → 245 W + eenheid + provenance');
ok(!/Hardlopen · drempeltempo|\d+:\d\d\/km|sec\/km/.test(t), 'H: cycling-context lekt geen running threshold-regel of pace-waarde');
ok(/geen Critical Power/.test(t), 'E: FTP wordt niet als Critical Power gepresenteerd');
// D
t = simulate('wielrennen', [RUN, { sport: 'cycling', ftp_watts_user_entered: null }]);
ok(/FTP: niet ingesteld \(geen waarde beschikbaar; niet schatten\)/.test(t), 'D: cycling + FTP ontbreekt → expliciet niet ingesteld');
// randgevallen
t = simulate('cycling', [{ sport: 'cycling', ftp_watts_user_entered: 0 }]);
ok(/FTP: niet ingesteld/.test(t), 'D2: FTP 0 (ongeldig) → niet ingesteld, niet "0 W"');
t = simulate('running', [{ sport: 'running', threshold_pace_seconds_per_km: 'abc' }]);
ok(/niet ingesteld/.test(t), 'B3: niet-numerieke waarde → niet ingesteld (geen NaN in context)');
t = simulate('triathlon', [RUN, BIKE]);
ok(/4:45\/km/.test(t) && /245 W/.test(t), 'T: triathlon krijgt beide sportwaarden, elk met eigen sportlabel');
t = simulate('kracht', [RUN, BIKE]);
ok(t === '', 'N: niet-endurance sport (kracht) → geen endurance-profielblok (geen verkeerde sportcontext)');
t = simulate('crossfit', [RUN, BIKE]);
ok(t === '', 'N2: crossfit → geen blok');
ok(!/confidence/i.test(simulate('triathlon', [RUN, BIKE])), 'Q: geen verzonnen confidence (profieldata heeft er geen)');

if (msgs.length) console.log(msgs.join('\n'));
console.log('fEnduranceContextProfileThresholds: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail ? 1 : 0);
