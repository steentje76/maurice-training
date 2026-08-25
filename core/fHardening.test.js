/* Sprint 15 — HARDENING & REGRESSION PROTECTION.
 *
 * Deze suite bouwt niets nieuws. Hij legt vast wat er is, zodat een volgende sprint niet
 * per ongeluk sportlogica, het AI-contract of bestaande schermen wijzigt zonder dat iemand
 * het merkt. Elke controle is een invariant, geen momentopname van een versienummer.
 *
 * A  Readiness-datakwaliteit: geldig, ongeldig, ontbrekend, gedeeltelijk
 * B  Live coach uit Sprint 13 blijft deterministisch en ongewijzigd
 * C  Het AI-contract kan niet ongemerkt groeien
 * D  Home en Training: bestaande onderdelen verdwijnen niet ongemerkt
 * E  Architectuurgrenzen: gedupliceerde drempels blijven in de pas met de engines
 * F  Service worker en cache: de invariant zelf
 *
 * Draai: node core/fHardening.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const C = require('./calculation.js');
const D = require('./decision.js');
const K = require('./coaching.js');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');

let pass = 0, fail = 0;
function ok(c, m){ if (c) pass++; else { fail++; console.log('  ✗ ' + m); } }
function eq(a, b, m){ ok(JSON.stringify(a) === JSON.stringify(b), m + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')'); }

console.log('\n[Sprint 15] Hardening & regression protection');

/* ── A. READINESS-DATAKWALITEIT ──────────────────────────────────────────── */
console.log('\nA. Readiness-datakwaliteit');
// DEFECT (Sprint 14, gevonden bij de Sprint 15-audit): de datakwaliteit werd bepaald VOORDAT
// onbetrouwbare signalen uit `beschikbaar` waren verwijderd. Een dag waarop drie van de zes
// signalen niet gesynchroniseerd waren noemde zichzelf daardoor nog steeds 'volledig'.
function basis(){
  return { dagfactor: 0.99, herstel: { score: 70, band: 'gemiddeld', confidence: 'hoog' },
    signalen: { hrv: { waarde: 28 }, rhr: { waarde: 57 }, slaap: { waarde: 7 },
                spierherstel: [{ muscle: 'Rug', pct: 90 }], gevoel: 'goed', trainingsdagen7: 2 } };
}
function metSignalen(over){ const i = basis(); Object.assign(i.signalen, over); return D.readinessDay(i); }

let r = metSignalen({});
eq(r.datakwaliteit, 'volledig', 'A1: zes geldige signalen -> volledig');
eq(r.beschikbaar.length, 6, 'A2: en zes beschikbaar');
eq(r.ontbreekt, [], 'A3: niets ontbreekt');

r = metSignalen({ hrv: { waarde: 28, kwaliteit: 'sync_failed' } });
eq(r.beschikbaar.length, 5, 'A4: één mislukte synchronisatie telt niet mee als aanwezig');
eq(r.datakwaliteit, 'volledig', 'A5: vijf geldige signalen is nog steeds volledig');
ok(r.ontbreekt.indexOf('hrv') >= 0, 'A6: en het signaal staat bij ontbreekt');

r = metSignalen({ hrv: { waarde: 28, kwaliteit: 'sync_failed' }, rhr: { waarde: 57, kwaliteit: 'sync_failed' } });
eq(r.beschikbaar.length, 4, 'A7: twee mislukte synchronisaties');
eq(r.datakwaliteit, 'gedeeltelijk', 'A8: vier geldige signalen -> gedeeltelijk (dit was het defect)');

r = metSignalen({ hrv: { waarde: 28, kwaliteit: 'no_data' }, rhr: { waarde: 57, kwaliteit: 'no_data' },
                  slaap: { waarde: 7, kwaliteit: 'no_data' } });
eq(r.beschikbaar.length, 3, 'A9: drie keer no_data');
eq(r.datakwaliteit, 'gedeeltelijk', 'A10: drie geldige signalen -> gedeeltelijk, nooit volledig');
ok(['hrv','rhr','slaap'].every(function(k){ return r.ontbreekt.indexOf(k) >= 0; }), 'A11: alle drie staan bij ontbreekt');

// de kwaliteit volgt ALTIJD het aantal uiteindelijk geldige signalen
[[6,'volledig'],[5,'volledig'],[4,'gedeeltelijk'],[3,'gedeeltelijk'],[2,'gedeeltelijk'],[1,'onvoldoende'],[0,'onvoldoende']]
  .forEach(function(p){
    const alle = ['hrv','rhr','slaap','spierherstel','gevoel','trainingsdagen7'];
    const i = basis();
    alle.slice(p[0]).forEach(function(k){ delete i.signalen[k]; });
    const uit = D.readinessDay(i);
    eq(uit.beschikbaar.length, p[0], 'A12: ' + p[0] + ' signalen aanwezig');
    eq(uit.datakwaliteit, p[1], 'A13: ' + p[0] + ' geldige signalen -> ' + p[1]);
  });
// gemengd: aanwezig maar onbetrouwbaar telt hetzelfde als afwezig
const gemengd = basis(); delete gemengd.signalen.gevoel; gemengd.signalen.trainingsdagen7 = null;
gemengd.signalen.hrv = { waarde: 28, kwaliteit: 'sync_failed' };
const uitGemengd = D.readinessDay(gemengd);
eq(uitGemengd.beschikbaar.length, 3, 'A14: ontbrekend en onbetrouwbaar tellen even zwaar');
eq(uitGemengd.datakwaliteit, 'gedeeltelijk', 'A15: en leveren dezelfde kwaliteit op');
// geldige kwaliteitslabels blijven meetellen
r = metSignalen({ hrv: { waarde: 28, kwaliteit: 'current' }, rhr: { waarde: 57, kwaliteit: 'partial' },
                  slaap: { waarde: 7, kwaliteit: 'stale' } });
eq(r.datakwaliteit, 'volledig', 'A16: current/partial/stale zijn wél bruikbaar');
eq(r.beschikbaar.length, 6, 'A17: en tellen dus mee');
// ontbrekende afzonderlijke signalen
['hrv','rhr','slaap'].forEach(function(k){
  const i = basis(); delete i.signalen[k];
  ok(D.readinessDay(i).ontbreekt.indexOf(k) >= 0, 'A18: ontbrekende ' + k + ' wordt gemeld');
  ok(D.readinessDay(i).bruikbaar, 'A19: maar de beslissing blijft mogelijk zonder ' + k);
});
// geen dubbele vermeldingen
r = metSignalen({ hrv: { waarde: 28, kwaliteit: 'no_data' } });
eq(r.ontbreekt.filter(function(k){ return k === 'hrv'; }).length, 1, 'A20: geen dubbele vermelding in ontbreekt');
// determinisme
const refA = JSON.stringify(metSignalen({ rhr: { waarde: 57, kwaliteit: 'sync_failed' } }));
let stabielA = true;
for (let i = 0; i < 40; i++) if (JSON.stringify(metSignalen({ rhr: { waarde: 57, kwaliteit: 'sync_failed' } })) !== refA) stabielA = false;
ok(stabielA, 'A21: deterministisch over veertig aanroepen');
// de volgorde in de bron: filteren vóór tellen
const decSrc = fs.readFileSync(path.join(__dirname, 'decision.js'), 'utf8');
const rdBlok = decSrc.slice(decSrc.indexOf('function readinessDay(input)'), decSrc.indexOf('function restForSet'));
ok(rdBlok.indexOf('ONBETROUWBAAR.indexOf') < rdBlok.indexOf('var kwaliteit = beschikbaar.length'),
   'A22: onbetrouwbare signalen worden verwijderd VOORDAT de kwaliteit wordt bepaald');

/* ── B. LIVE COACH (SPRINT 13) ───────────────────────────────────────────── */
console.log('\nB. Live coach blijft intact');
function set(rpe, extra){
  const uitgevoerd = Object.assign({ kg: 100, reps: 5, rpe: rpe }, extra || {});
  return D.setOutcome({ voorgeschreven: { kg: 100, reps: 5, rpe: 8 }, uitgevoerd: uitgevoerd,
                        restBasisSec: 120, dynamischeRust: true });
}
[[6,'verhogen'],[7,'verhogen'],[7.5,'verhogen'],[8,'gelijk'],[8.5,'gelijk'],[9,'verlagen'],[10,'verlagen']]
  .forEach(function(p){
    const b = set(p[0]);
    eq(b.actie.soort, p[1], 'B1: RPE ' + p[0] + ' -> ' + p[1]);
    eq(b.actie.deltaKg, D.progressionDecision(p[0], 100).deltaKg, 'B2: RPE ' + p[0] + ': delta komt uit progressionDecision');
  });
const zonderRpe = D.setOutcome({ voorgeschreven: { kg: 100, reps: 5, rpe: 8 }, uitgevoerd: { kg: 100, reps: 5 },
                                 restBasisSec: 120, dynamischeRust: true });
ok(zonderRpe.actie.soort !== 'verhogen' && zonderRpe.actie.soort !== 'verlagen' && zonderRpe.actie.soort !== 'gelijk',
   'B3: zonder RPE geen gewichtsbeslissing');
eq(zonderRpe.actie.kg, null, 'B4: en geen verzonnen gewicht');
const ctxZonder = K.buildLiveContext({ oefening: { id: 'sq', naam: 'Squat' }, besluit: zonderRpe });
ok(!/\d+(,\d+)? kg/.test(K.liveCoachMessage(ctxZonder).actie || ''), 'B5: de coach noemt dan geen kilo');
const zonderVoorschrift = D.setOutcome({ uitgevoerd: { kg: 100, reps: 5, rpe: 8 }, restBasisSec: 120 });
eq(zonderVoorschrift.afwijkingen, [], 'B6: zonder voorschrift geen afwijkingsclaim');
ok(zonderVoorschrift.doelGehaald === null, 'B7: en "doel gehaald" blijft onbekend');
const zonderRust = D.setOutcome({ voorgeschreven: { kg: 100, reps: 5, rpe: 8 }, uitgevoerd: { kg: 100, reps: 5, rpe: 8 },
                                  restBasisSec: null });
eq(zonderRust.rust.seconden, null, 'B8: zonder rustinstelling geen verzonnen rusttijd');
ok(!/[Rr]ust/.test(K.liveCoachMessage(K.buildLiveContext({ oefening: { naam: 'Squat' }, besluit: zonderRust })).actie || ''),
   'B9: en er wordt niet over rust gesproken');
const coachSrc = fs.readFileSync(path.join(__dirname, 'coaching.js'), 'utf8');
const liveCode = coachSrc.slice(coachSrc.indexOf('LIVE COACH TIJDENS DE TRAINING'), coachSrc.indexOf('READINESS VAN DE DAG — VERWOORDING'))
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
ok(!/fetch\(|netlify|DecisionCore\.|readinessDay\(/.test(liveCode), 'B10: de live coach roept geen AI en geen engine aan');
const refB = JSON.stringify(K.liveCoachMessage(K.buildLiveContext({ oefening: { naam: 'Squat' }, besluit: set(9.5) })));
let stabielB = true;
for (let i = 0; i < 30; i++) if (JSON.stringify(K.liveCoachMessage(K.buildLiveContext({ oefening: { naam: 'Squat' }, besluit: set(9.5) }))) !== refB) stabielB = false;
ok(stabielB, 'B11: deterministisch zonder AI');

/* ── C. HET AI-CONTRACT KAN NIET ONGEMERKT GROEIEN ───────────────────────── */
console.log('\nC. AI-contract vastgelegd');
eq(K.AI_FIELDS, ['exercise','domain','status','signals','priority','metric','current','previous','best','nextAction'],
   'C1: de per-oefening whitelist is exact vastgelegd');
eq(K.LIVE_AI_FIELDS, ['oefening','setNummer','totaalSets','voorgeschreven','uitgevoerd','afwijkingen','doelGehaald',
                      'actie','rust','herstel','readiness','datakwaliteit','ontbreekt','herkomst'],
   'C2: de live-whitelist is exact vastgelegd');
eq(K.READINESS_AI_FIELDS, ['zone','zoneLabel','zoneBetekenis','herstel','trainingsadvies','redenen','datakwaliteit',
                           'ontbreekt','herkomst','geplandeTraining','dagthema'],
   'C3: de readiness-whitelist is exact vastgelegd');
// een payload kan nooit meer velden bevatten dan de whitelist
const liveCtx = K.buildLiveContext({ oefening: { id: 'sq', naam: 'Squat' }, besluit: set(9.5),
  readiness: { zone: 'caution', zoneLabel: 'Voorzichtig vandaag', trainingsadvies: { soort: 'ongewijzigd' } },
  geheimeSleutel: 'mag niet lekken', sessionLog: { sq: { sets: [] } } });
const livePayload = K.liveAiPayload(liveCtx);
ok(Object.keys(livePayload).every(function(k){ return K.LIVE_AI_FIELDS.indexOf(k) >= 0; }), 'C4: live-payload blijft binnen de whitelist');
ok(!JSON.stringify(livePayload).includes('geheimeSleutel'), 'C5: onbekende velden lekken niet');
ok(!JSON.stringify(livePayload).includes('sessionLog'), 'C6: ruwe sessiestaat lekt niet');
const readyCtx = K.buildReadinessContext({ besluit: D.readinessDay(basis()), geheim: 'x' });
const readyPayload = K.readinessAiPayload(readyCtx);
ok(Object.keys(readyPayload).every(function(k){ return K.READINESS_AI_FIELDS.indexOf(k) >= 0; }), 'C7: readiness-payload blijft binnen de whitelist');
ok(readyPayload.dagfactor === undefined, 'C8: geen dagfactor');
['hrv','rhr','slaap','signalen'].forEach(function(k){ ok(readyPayload[k] === undefined, 'C9: geen ruw signaal "' + k + '"'); });
ok(K.aiPayload({ a: { exercise: 'sq', geheim: 1, nextAction: 'x' } })[0].geheim === undefined,
   'C10: ook de bestaande aiPayload strip onbekende velden');

/* ── D. HOME EN TRAINING — PRODUCTCONTRACT ───────────────────────────────── */
console.log('\nD. Home en Training: bestaande onderdelen blijven bestaan');
// Deze controles ontwerpen NIETS. Ze leggen vast wat er vandaag staat, zodat verwijderen of
// herstructureren opvalt. Ze zeggen niets over volgorde, styling of opmaak.
const HOME_ONDERDELEN = [
  ['id="home-hero"', 'hero'], ['id="home-coach-vandaag"', 'coach vandaag'],
  ['id="home-readiness"', 'readiness (Sprint 14)'], ['id="home-plan"', 'plan'],
  ['id="home-today-cta"', 'training van vandaag'], ['id="home-quick"', 'snelacties-container'],
  ['id="home-context"', 'jouw ritme-container'], ['>Snelacties<', 'label Snelacties'],
  ['Jouw ritme', 'kaart Jouw ritme'], ['Vandaag gepland', 'label Vandaag gepland'],
  ['id="home-theme"', 'dagthema-container']
];
HOME_ONDERDELEN.forEach(function(p){ ok(html.indexOf(p[0]) >= 0, 'D1: Home bevat nog steeds ' + p[1]); });
const TRAINING_ONDERDELEN = [
  ['Mijn trainingen', 'Mijn trainingen'], ['Programma', 'Programma’s'],
  ['Workout Builder', 'Workout Builder'], ['Oefeningen', 'Oefeningen'],
  ['Losse oefening', 'Losse oefening'], ['Kalender', 'Kalender'],
  ['Logboek', 'Logboek'], ['id="s-train-mgr"', 'trainingsbeheer-scherm']
];
TRAINING_ONDERDELEN.forEach(function(p){ ok(html.indexOf(p[0]) >= 0, 'D2: Training bevat nog steeds ' + p[1]); });
// De vijf bestemmingen in de bottom navigation blijven vijf.
const NAV = ['s-home', 's-train-mgr', 's-lichaam', 's-coach', 's-stats'];
NAV.forEach(function(id){ ok(html.indexOf("go('" + id + "')") >= 0, 'D3: bottom navigation bevat ' + id); });
ok((html.match(/class="bnav"/g) || []).length >= 10, 'D4: de bottom navigation staat op alle schermen');
// De actieve trainingsweergave: bestaande onderdelen uit de screenshots.
['Coach cues', 'Veelgemaakte fouten', 'Terug naar training', 'exfocus-today', 'exfocus-setwrap']
  .forEach(function(t){ ok(html.indexOf(t) >= 0, 'D5: trainingsweergave bevat nog steeds "' + t + '"'); });
// Sprint 13/14 voegden precies twee zichtbare onderdelen toe; meer niet.
eq((html.match(/id="livecoach-'/g) || html.match(/livecoach-'\+cur\.id/g) || []).length, 1,
   'D6: precies één live-coachcontainer');
eq((html.match(/id="home-readiness"/g) || []).length, 1, 'D7: precies één readiness-container');

/* ── E. GEDUPLICEERDE DREMPELS BLIJVEN IN DE PAS ─────────────────────────── */
console.log('\nE. Drempels in de UI blijven gelijk aan de engines');
// BEKENDE, PRE-EXISTENTE DUPLICATIE. Deze grenzen staan zowel in de engine als, als
// afgeleide tekst/kleur, in index.html. Ze worden hier NIET verplaatst (dat zou de bevroren
// UI raken), maar wél vastgepind: wijzigt de engine, dan faalt deze test en moet de UI mee.
eq(D.computeProgression(7.5, 100).delta, 2.5, 'E1: bovengrens "verhogen" is 7,5');
eq(D.computeProgression(7.6, 100).delta, 0, 'E2: daarboven is het gelijk houden');
eq(D.computeProgression(8.5, 100).delta, 0, 'E3: bovengrens "gelijk" is 8,5');
eq(D.computeProgression(8.6, 100).delta, -7.5, 'E4: daarboven is het deload');
ok(/if\(rpe<=7\.5\)return 'Sterke marge'/.test(html), 'E5: de UI-duiding gebruikt dezelfde grens 7,5');
ok(/if\(rpe<=8\.5\)return 'Goede trainingsprikkel'/.test(html), 'E6: en dezelfde grens 8,5');
eq(D.trainReadiness({ factor: 1.00 }).cls, 'g', 'E7: readiness-bovengrens is 1,00');
eq(D.trainReadiness({ factor: 0.93 }).cls, 'y', 'E8: middengrens is 0,93');
eq(D.trainReadiness({ factor: 0.92 }).cls, 'r', 'E9: daaronder is het licht houden');
ok(/factor>=1\?'g':factor>=0\.93\?'y':'r'/.test(html), 'E10: de hero-kleur gebruikt exact dezelfde grenzen');
ok(html.indexOf('r.pct<70') >= 0, 'E11: de UI gebruikt de spierherstelgrens van 70%');
ok(/r\.pct < 70/.test(decSrc) || /pct < 70/.test(decSrc), 'E12: en die grens staat ook in de Decision Engine');
// er is precies één implementatie van elke engine-regel
['function computeProgression','function trainReadiness','function readinessDay','function setOutcome',
 'function restForSet','function releaseRecord','function dayZone']
  .forEach(function(f){ eq((decSrc.match(new RegExp(f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length, 1,
    'E13: ' + f.replace('function ', '') + ' bestaat precies één keer'); });
// In index.html mag zo'n naam alleen voorkomen als PURE DOORGEEFWRAPPER van één regel.
// Een echte tweede implementatie zou hier direct opvallen.
['readinessDay','setOutcome','releaseRecord','releaseVerband','computeProgression','restForSet','dayZone']
  .forEach(function(f){
    const i = html.indexOf('function ' + f + '(');
    if (i < 0) { pass++; return; }                       // helemaal niet in de UI: ook goed
    const regel = html.slice(i, html.indexOf('\n', i));
    ok(/\{ return (DecisionCore|CalcCore|CoachingCore)\./.test(regel),
       'E14: ' + f + ' in de UI is een doorgeefwrapper, geen tweede implementatie');
  });

/* ── E-vervolg. VOLLEDIGE-ARCHITECTUURAUDIT (master sprint) — resterende
 * tonnage-/percentage-formuleduplicaten buiten de Calculation Engine gevonden en
 * geconsolideerd. "Er mag maar één calculation source of truth zijn" (Fase 2).
 * Deze tests bewijzen dat de vier gevonden plekken nu CalcCore hergebruiken i.p.v.
 * de rekenformule zelf te herhalen. ──────────────────────────────────────────── */
ok(!/\(s\.sets\|\|1\)\*\(s\.reps\|\|1\)\*\(s\.weight\|\|0\)/.test(html),
  'E15: de losse tonnage-kopie in de doelvoortgangsfunctie (case \'volume\') is verwijderd');
ok(/CalcCore\.calculateVolume\(\{sets:s\.sets\|\|1,reps:s\.reps\|\|1,weight:s\.weight\|\|0\}\)/.test(html),
  'E16: die functie gebruikt nu CalcCore.calculateVolume() (volume.v1), niet een eigen kopie');
ok(!/a\+\(\(x\.weight&&x\.reps&&x\.sets\)\?x\.weight\*x\.reps\*x\.sets:0\)/.test(html),
  'E17: de losse tonnage-kopie in de recente-sessies-strip (loadHistory) is verwijderd');
ok(!/if\(x\.weight&&x\.reps&&x\.sets\)s\+=x\.weight\*x\.reps\*x\.sets/.test(html),
  'E18: de losse tonnage-kopie in de dag-totalen (loadHistory) is verwijderd');
ok((html.match(/CalcCore\.calculateVolume\(\{sets:x\.sets,reps:x\.reps,weight:x\.weight\}\)/g) || []).length === 2,
  'E19: beide loadHistory-tonnageplekken gebruiken nu CalcCore.calculateVolume(), niet elk hun eigen kopie');
ok(!/const target=roundKg\(rm\*pct\/100\)/.test(html),
  'E20: de losse percentage-kopie in applyPct() is verwijderd');
ok(/const target=roundKg\(CalcCore\.applyPercentage\(rm,pct\)\)/.test(html),
  'E21: applyPct() gebruikt nu CalcCore.applyPercentage() (percentage.v1), niet een eigen kopie');

/* ── F. SERVICE WORKER ───────────────────────────────────────────────────── */
console.log('\nF. Service worker en cache');
const crypto = require('crypto');
/* CORE_FILES komt uit EEN bron: core/sw-guard.test.js. Deze test hield tot v4.40.0 een
 * eigen kopie van die lijst bij, en dat is precies hoe de twee uit elkaar liepen zodra er
 * een core-bestand bijkwam. Door de lijst hier uit te lezen kan dat niet meer gebeuren:
 * een nieuw core-bestand wordt automatisch meegenomen in de handtekening. */
function tkCoreFiles() {
  const guard = fs.readFileSync(path.join(__dirname, 'sw-guard.test.js'), 'utf8');
  const m = guard.match(/const CORE_FILES\s*=\s*\[([\s\S]*?)\];/);
  if (!m) throw new Error('CORE_FILES niet gevonden in sw-guard.test.js');
  return m[1].split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
}
const CORE_FILES = tkCoreFiles();
const sig = crypto.createHash('sha256').update(
  CORE_FILES.map(function(f){ return fs.readFileSync(path.join(__dirname, '..', f), 'utf8').replace(/\r/g, ''); }).join('\n')
).digest('hex').slice(0, 16);
const mSig = sw.match(/CORE_SIG\s*=\s*'([0-9a-f]+)'/);
ok(!!mSig && mSig[1] === sig, 'F1: CORE_SIG hoort bij de huidige core (' + (mSig ? mSig[1] : '?') + ' moet ' + sig + ')');
const mNaam = sw.match(/CACHE_NAME\s*=\s*'trainingskompas-(v\d+)'/);
const mStat = sw.match(/CACHE_STATIC\s*=\s*'trainingskompas-static-(v\d+)'/);
ok(!!mNaam && !!mStat && mNaam[1] === mStat[1], 'F2: CACHE_NAME en CACHE_STATIC dragen dezelfde versie');
CORE_FILES.forEach(function(f){ ok(sw.indexOf("'/" + f + "'") >= 0, 'F3: ' + f + ' wordt geprecached'); });
['core/deviceIntegration.js','core/concept2Live.js','core/weather.js']
  .forEach(function(f){ ok(sw.indexOf("'/" + f + "'") >= 0, 'F4: ' + f + ' wordt geprecached'); });
ok(/k\s*!==\s*CACHE_STATIC/.test(sw), 'F5: oude caches worden bij activatie opgeruimd — geen stale engine');
const mVer = html.match(/const APP_VER = '(v\d+\.\d+\.\d+)'/);
ok(!!mVer, 'F6: de applicatieversie heeft de vorm vX.Y.Z');

/* ── G. ROADMAP POST-V1 #1 — duration_s per sessie (RAW DATA) ──────────────
 * "duration_s per sessie vastleggen" ontsluit 105 van de 187 kenbare relaties
 * (VARIABLE_REGISTRY 'duur'/'cardio_split', beide beschikbaarheid:'toekomstig')
 * en is de voorwaarde voor athlete.unifiedLoad(), dat vandaag bewust
 * {beschikbaar:false} teruggeeft. Deze milestone levert UITSLUITEND de raw-
 * datavastlegging (de kolom bestond al, ongevuld); het activeren van de
 * registry-vlaggen in relationship.js/athlete.js is een aparte, apart te
 * rechtvaardigen protected-core-wijziging (nog niet in deze milestone). ── */
console.log('\nG. duration_s wordt vastgelegd bij het afronden van een sessie');
const finishSrc = html.slice(html.indexOf('async function finishSession('), html.indexOf('async function finishSession(') + 4000);
ok(/const _duurS = trainStart \? Math\.max\(0, Math\.round\(\(Date\.now\(\)-trainStart-\(pausedAccumMs\|\|0\)\)\/1000\)\) : null;/.test(finishSrc),
  'G1: duration_s hergebruikt EXACT dezelfde formule als de al bestaande live-klok (startTrainTimer) -- geen tweede, losse tijdsberekening');
ok(/duration_s:_duurS/.test(finishSrc), 'G2: het cardio-schrijfpad geeft duration_s mee');
ok(/row\.duration_s=_duurS/.test(finishSrc), 'G3: het krachtschrijfpad geeft duration_s mee');
(function(){
  function berekenDuurS(trainStart, pausedAccumMs, now){
    return trainStart ? Math.max(0, Math.round((now-trainStart-(pausedAccumMs||0))/1000)) : null;
  }
  const t0 = 1_800_000_000_000;
  eq(berekenDuurS(t0, 0, t0+45*60*1000), 2700, 'G4: 45 minuten zonder pauze -> 2700 seconden');
  eq(berekenDuurS(t0, 5*60*1000, t0+45*60*1000), 2400, 'G5: 45 minuten wall-clock met 5 minuten pauze -> 2400 seconden (pauze telt niet mee)');
  eq(berekenDuurS(null, 0, t0), null, 'G6: geen trainStart -> null, geen crash, geen verzonnen waarde');
})();

console.log('\n' + '='.repeat(56));
console.log('RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail) { console.log('❌ Hardening niet groen.'); process.exit(1); }
console.log('✅ Datakwaliteit klopt, de engines zijn enkelvoudig en Home/Training zijn vastgelegd.');
