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
// ROADMAP POST-V1 #6 (accessibility) — pinch-zoom mag niet uitgeschakeld zijn
// (WCAG 2.1, 1.4.4/1.4.10). viewport-fit=cover blijft behouden (edge-to-edge).
const viewportTag = (html.match(/<meta name="viewport"[^>]*>/) || [''])[0];
ok(!/user-scalable=no/.test(viewportTag) && !/maximum-scale=1/.test(viewportTag), 'F7: pinch-zoom is niet uitgeschakeld (geen user-scalable=no/maximum-scale=1 in de DAADWERKELIJKE viewport-meta-tag, niet alleen in een verklarend commentaar)');
ok(/viewport-fit=cover/.test(viewportTag), 'F8: viewport-fit=cover blijft behouden (edge-to-edge/safe-area, ongerelateerd aan de zoom-restrictie)');

/* ── G. ROADMAP POST-V1 #1 — duration_s per sessie (RAW DATA) ──────────────
 * "duration_s per sessie vastleggen" ontsluit 105 van de 187 kenbare relaties
 * (VARIABLE_REGISTRY 'duur'/'cardio_split', beide beschikbaarheid:'toekomstig')
 * en is de voorwaarde voor athlete.unifiedLoad(), dat vandaag bewust
 * {beschikbaar:false} teruggeeft. Deze milestone levert UITSLUITEND de raw-
 * datavastlegging (de kolom bestond al, ongevuld); het activeren van de
 * registry-vlaggen in relationship.js/athlete.js is een aparte, apart te
 * rechtvaardigen protected-core-wijziging (nog niet in deze milestone). ── */
console.log('\nG. duration_s wordt vastgelegd bij het afronden van een sessie');
const finishSrc = html.slice(html.indexOf('async function finishSession('), html.indexOf('async function finishSession(') + 5200);
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

/* ── H. ROADMAP POST-V1 #2 — rustduur per set (RAW DATA) ────────────────────
 * "Rustduur per set vastleggen in sets_detail" -- de VARIABLE_REGISTRY-variabele
 * 'rust' (inputs:['rest_sec'], beschikbaarheid:'toekomstig') wacht op precies
 * deze data. Geen relatie met de bestaande, VOORGESCHREVEN rest_seconds-aftel-
 * klok (autoRestAfterSet/openRestTimer) -- dat blijft ongewijzigd. ─────────── */
console.log('\nH. Rustduur per set wordt gemeten en meegegeven aan sets_detail');
ok(/lastSetDoneAt\[exId\]/.test(html), 'H1: toggleSetDone() houdt per oefening het laatst-afgevinkte-set-moment bij');
ok(/sessionLog\[exId\]\.sets\[setNum-1\]\.rest_sec=_rustSec/.test(html), 'H2: de gemeten rust wordt in sessionLog opgeslagen, direct op de set zelf');
ok(/rest_sec:s\.rest_sec/.test(html), 'H3: buildStrengthSessionRow() geeft rest_sec door aan setsDetail (de jsonb-kolom die de Relationship Engine leest)');
(function(){
  const html2 = html;
  function extractFn(name){
    const s = html2.indexOf('async function '+name+'(') >= 0 ? html2.indexOf('async function '+name+'(') : html2.indexOf('function '+name+'(');
    const parenStart = html2.indexOf('(', s);
    let pd=0, parenEnd=-1;
    for(let j=parenStart; j<html2.length; j++){ if(html2[j]==='(') pd++; else if(html2[j]===')'){ pd--; if(pd===0){ parenEnd=j; break; } } }
    const bodyStart = html2.indexOf('{', parenEnd);
    let d=0,e=-1;
    for(let j=bodyStart; j<html2.length; j++){ if(html2[j]==='{')d++; else if(html2[j]==='}'){d--; if(d===0){e=j;break;}} }
    return html2.slice(s,e+1);
  }
  let sessionLog = {}, lastSetDoneAt = {};
  const toggleSrc = extractFn('toggleSetDone');
  const mod = new Function('sessionLog','lastSetDoneAt','document','updateProgress','updateSummary','scheduleAutosave','refreshActiveSetBanner','unlockAudio','showPostSetAdvice','showSetCompletionFeedback','autoRestAfterSet','curT',
    toggleSrc + '\nreturn toggleSetDone;'
  )(sessionLog, lastSetDoneAt,
    { getElementById: () => ({ classList: { contains:()=>false, toggle:()=>{}, add:()=>{}, remove:()=>{} } }) },
    ()=>{}, ()=>{}, ()=>{}, ()=>{}, ()=>{}, ()=>{}, ()=>{}, ()=>{}, 'Kracht');

  mod('bankdrukken', 1);
  eq(sessionLog['bankdrukken'].sets[0].rest_sec, null, 'H4: eerste set van een oefening in de sessie heeft geen zinvolle referentie -> null');
  const origNow = Date.now;
  let fakeNow = Date.now()+90000;
  Date.now = () => fakeNow;
  mod('bankdrukken', 2);
  eq(sessionLog['bankdrukken'].sets[1].rest_sec, 90, 'H5: 90 seconden wall-clock tussen twee afgevinkte sets van dezelfde oefening -> rest_sec=90');
  mod('squat', 1);
  eq(sessionLog['squat'].sets[0].rest_sec, null, 'H6: een andere oefening deelt NIET de rust-referentie -> null, geen vermenging tussen oefeningen');
  Date.now = origNow;
})();

/* ── I. ROADMAP POST-V1 #3 — weer per sessie (RAW DATA) ─────────────────────
 * "Weer per sessie vastleggen — ontsluit temperatuur, luchtvochtigheid en wind."
 * VARIABLE_REGISTRY heeft al drie geregistreerde variabelen (temperatuur/
 * luchtvochtigheid/wind, beschikbaarheid:'toekomstig'), wachtend op precies deze
 * data. Hergebruikt de al bestaande weerinfrastructuur (WeatherCore/TKWeather)
 * volledig ongewijzigd -- geen nieuwe fetch-logica, geen nieuwe opt-in, hergebruikt
 * het bestaande per-uur-cachemechanisme. Nooit een verzonnen waarde: opt-out/geen
 * locatie/mislukte fetch -> weather blijft null. ──────────────────────────── */
console.log('\nI. Weer wordt vastgelegd bij het afronden van een sessie');
ok(/typeof TKWeather!=='undefined' && TKWeather\.isEnabled\(\)/.test(finishSrc), 'I1: respecteert de bestaande opt-in-gate -- geen ongevraagde locatie-aanvraag');
ok(/TKWeather\.forContext\(tkWeatherCtx\(_fOut,_fMod\)\)/.test(finishSrc), 'I2: hergebruikt de bestaande TKWeather.forContext()/tkWeatherCtx() -- geen nieuwe weerlogica');
ok(/OUTDOOR_CAPABLE\[ct\]/.test(finishSrc), 'I3: gebruikt dezelfde outdoor/modaliteit-bepaling als de bestaande weer-context-balk tijdens de training');
ok(/weather:_weerData/.test(finishSrc), 'I4: het cardio-schrijfpad geeft weather mee');
ok(/row\.weather=_weerData/.test(finishSrc), 'I5: het krachtschrijfpad geeft weather mee');
ok(/let _weerData = null;/.test(finishSrc), 'I6: begint met null -- geen verzonnen standaardwaarde als het weer niet beschikbaar is');

/* ── J. CYCLUSTRACKING-AUDIT (v4.52.0) — overlap-preventie ─────────────────
 * Bevinding tijdens de vervolgsprint-audit van PR #44: cyclusStartMenstruatie()
 * had geen server-bevraagde controle op een reeds actieve periode, uitsluitend
 * UI-knopzichtbaarheid. Gerepareerd met een expliciete check vóór het schrijven. */
console.log('\nJ. Cyclustracking: overlap-preventie bij het starten van een nieuwe periode');
const startSrc = html.slice(html.indexOf('async function cyclusStartMenstruatie('), html.indexOf('async function cyclusStartMenstruatie(') + 700);
ok(/bestaande\.some\(p=>p\.end_date==null\)/.test(startSrc), 'J1: controleert op een reeds actieve (niet-afgeronde) periode vóór het schrijven van een nieuwe');
ok(/toast\('Er loopt al een geregistreerde menstruatie/.test(startSrc), 'J2: geeft een duidelijke melding i.p.v. stilzwijgend een overlappende rij te maken');

/* ── K. SYMPTOOMREGISTRATIE (v4.52.0) — UI-bedrading en taalveiligheid ──── */
console.log('\nK. Symptoomregistratie: UI-bedrading en neutrale taal');
ok(/async function cyclusSlaSymptoomOp\(/.test(html), 'K1: de opslagfunctie voor symptomen bestaat');
ok(/sbGet\('cycle_symptom_logs'/.test(html), 'K2: leest uit de dedicated cycle_symptom_logs-tabel, niet uit een generieke tabel');
ok(/sbPostQ\('cycle_symptom_logs'/.test(html) || /sbPatch\('cycle_symptom_logs'/.test(html), 'K3: schrijft naar de dedicated cycle_symptom_logs-tabel');
ok(/CycleCore\.symptomPatternSummary\(/.test(html), 'K4: de patroonweergave in de UI gebruikt UITSLUITEND CycleCore (Calculation Engine), berekent niets zelf in de UI-laag');
const cyclusUiVanaf = html.indexOf('async function renderCyclusScreen(');
const cyclusUiSrc = html.slice(cyclusUiVanaf, cyclusUiVanaf + 12000);
ok(!/hormo|diagnos|oorzaak|veroorzaak|zeker(?!heid, geen)/i.test(cyclusUiSrc.replace(/schatting, geen zekerheid/gi,'')), 'K5: de gerenderde cyclusscherm-tekst bevat geen causale/hormonale/diagnostische taal');
ok(/feitelijke telling, geen medische verklaring/.test(html), 'K6: het patroonkaartje bevat expliciet het voorbehoud "feitelijke telling, geen medische verklaring"');

/* ── L. WOMEN'S PERFORMANCE DASHBOARD (v4.53.0) — cyclus <-> training-UI ── */
console.log('\nL. Women\'s Performance-dashboard: UI-bedrading en neutrale taal');
ok(/CycleTrainingCore\.cycleTrainingSummary\(/.test(html), 'L1: het dashboard gebruikt UITSLUITEND CycleTrainingCore (Calculation Engine), berekent niets zelf in de UI-laag');
ok(/if\(!samenvatting\.voldoendeCycliVoorFaseVergelijking\)/.test(html), 'L2: respecteert de door de Calculation Engine bepaalde datadrempel -- geen eigen, losse drempel in de UI');
ok(/feitelijke tellingen, geen medische verklaring of advies/.test(html), 'L3: het dashboard bevat een expliciet voorbehoud, consistent met het patroonkaartje');
ok(!/hormo|diagnos|oorzaak|veroorzaak|zwanger|anticoncep|vruchtbaar/i.test(cyclusUiSrc), 'L4: ook de dashboard-tekst bevat geen medische/causale/DECISION-REQUIRED-grensoverschrijdende taal');
ok(/sbGet\('sessions', '&order=date\.desc&limit=90'\)/.test(html), 'L5: haalt trainingssessies op via de bestaande, generieke sbGet -- geen nieuwe, parallelle datatoegang');

/* ── M. ADVANCED WOMEN'S PERFORMANCE INSIGHTS (v4.54.0, Fase 3) ──────────── */
console.log('\nM. Fase 3: transparantieregel, trend per cyclus, symptomen x training — UI-bedrading en taalveiligheid');
ok(/CycleTrainingCore\.trainingTrendPerCycle\(/.test(html), 'M1: de trend-per-cyclus-UI gebruikt UITSLUITEND CycleTrainingCore, berekent niets zelf');
ok(/CycleTrainingCore\.symptomTrainingOverlap\(/.test(html), 'M2: de symptomen-x-training-UI gebruikt UITSLUITEND CycleTrainingCore, berekent niets zelf');
ok(/Gebaseerd op '\+samenvatting\.aantalGebruikteTrainingen\+' geregistreerde trainingen en '\+samenvatting\.aantalGeregistreerdeCycli/.test(html), 'M3: de exacte, voorgeschreven transparantieregel ("Gebaseerd op X trainingen en Y cycli") wordt getoond');
ok(/Uitsluitend geregistreerde, afgeronde cycli — geen voorspelling\./.test(html), 'M4: de trend-per-cyclus toont expliciet dat dit geregistreerde geschiedenis is, geen voorspelling');
ok(/Feitelijke telling, geen oorzakelijk verband\./.test(html), 'M5: symptomen-x-training toont expliciet het causaliteitsvoorbehoud');
ok(!/hormo|diagnos|oorzaak(?!elijk verband)|veroorzaak|zwanger|anticoncep|vruchtbaar|beinvloed/i.test(cyclusUiSrc.replace(/geen oorzakelijk verband/gi,'')), 'M6: ook de nieuwe Fase-3-tekst bevat geen medische/causale/DECISION-REQUIRED-grensoverschrijdende taal');

/* ── N. PROGRAM ADAPTATION V1 (v4.55.0) — UI-bedrading en architectuurgrenzen ── */
console.log('\nN. Program Adaptation V1: UI-bedrading, engine-scheiding en scenario-dekking');
const startBlockSrc = html.slice(html.indexOf('async function startProgramBlockTraining('), html.indexOf('async function startProgramBlockTraining(') + 800);
ok(/if\(block\.completed_at\)\{toast/.test(startBlockSrc), 'N1 (Scenario 11): defensieve completed_at-check vóór het tonen van enige prompt of het starten van de flow');
ok(/await maybeShowScheduleGate\(/.test(startBlockSrc), 'N2: routeert door de nieuwe schedule-gate i.p.v. direct de check-in te openen');
ok(/ScheduleAdherenceCore\.resolveScheduleGap\(/.test(html), 'N3: gebruikt UITSLUITEND ScheduleAdherenceCore voor de gap-bepaling, geen eigen datumlogica in de UI-laag');
ok(/ScheduleAdherenceCore\.resolveRescheduleDecision\(/.test(html), 'N4: gebruikt UITSLUITEND ScheduleAdherenceCore voor de conflictbeslissing');
const gateSrc = html.slice(html.indexOf('async function maybeShowScheduleGate('), html.indexOf('async function maybeShowScheduleGate(') + 900);
ok(/gap===null\|\|gap==='TODAY'/.test(gateSrc), 'N5 (Scenario 1): bij TODAY (of ontbrekende datum) geen prompt -- rechtstreeks door naar de bestaande check-in');
ok(/progCheckinCtx=\{blockId,block,prog,rows,voelt:null,pijn:null\}/.test(gateSrc), 'N6: hergebruikt EXACT dezelfde progCheckinCtx-structuur als de oorspronkelijke flow -- geen parallel systeem');
const doTodaySrc = html.slice(html.indexOf('async function pscheduleDoToday('), html.indexOf('async function pscheduleDoToday(') + 500);
ok(!/planned_date\s*[:=]/.test(doTodaySrc), 'N7 (bindend principe): "vandaag doen" wijzigt planned_date NIET');
ok(/await openProgCheckin\(\)/.test(doTodaySrc), 'N8: "vandaag doen" gebruikt de bestaande readiness-check-in/adaptive-flow, geen nieuwe/parallelle uitvoeringslogica');
const skipSrc = html.slice(html.indexOf('async function pscheduleSkip('), html.indexOf('async function pscheduleSkip(') + 700);
ok(/schedule_status:'skipped'/.test(skipSrc), 'N9 (Scenario 4): overslaan zet uitsluitend schedule_status, nooit completed_at');
ok(!/completed_at\s*:/.test(skipSrc), 'N10: overslaan raakt completed_at NIET (blijft NULL, telt niet als voltooid)');
const rescheduleSrc = html.slice(html.indexOf('async function pscheduleShowReschedule('), html.indexOf('async function pscheduleShowReschedule(') + 1400);
ok(/rescheduled_from:block\.planned_date/.test(rescheduleSrc), 'N11 (audit trail): de oorspronkelijke datum wordt bewaard vóór overschrijven');
ok(!/week_nr\s*:/.test(rescheduleSrc) && !/fase_naam\s*:/.test(rescheduleSrc), 'N12 (bindend principe): reschedule raakt week_nr/fase_naam NIET');
ok(!/sbPostQ\('program_blocks'|sbPost\('program_blocks'/.test(rescheduleSrc), 'N13 (bindend principe): reschedule UPDATE\'t het bestaande block, maakt NOOIT een nieuw block aan');
ok(/id=eq\.'\+blockId/.test(rescheduleSrc.replace(/\s/g,'')+skipSrc.replace(/\s/g,'')), 'N14 (security): de update is expliciet gescoped op het specifieke blockId, geen brede UPDATE zonder filter');
ok(/heergenereerResterendeWeken/.test(html) && !doTodaySrc.includes('heergenereerResterendeWeken') && !skipSrc.includes('heergenereerResterendeWeken') && !rescheduleSrc.includes('heergenereerResterendeWeken'), 'N15 (Scenario 17): heergenereerResterendeWeken() blijft ongewijzigd bestaan en wordt NIET aangeroepen als workaround voor een individuele gemiste training');
ok(/sbPatchQ\('program_blocks'/.test(rescheduleSrc) && /sbPatchQ\('program_blocks'/.test(skipSrc), 'N16 (offline): hergebruikt de bestaande offline-veilige sbPatchQ-queue, geen tweede offline-mechanisme');

/* ── O. GOAL/EVENT-DATE AWARENESS (v4.56.0) — UI-bedrading en isolatie ──── */
console.log('\nO. Goal/Event-Date Awareness: UI-bedrading, opslag en architectuurisolatie');
ok(/id="prog-event-toggle"/.test(html), 'O1: het optionele wedstrijd/doel-toggle-veld bestaat');
ok(/id="prog-event-date"/.test(html), 'O2: het datumveld bestaat');
ok(/id="prog-event-name"/.test(html), 'O3: het optionele naamveld bestaat');
const eventReadSrc = html.slice(html.indexOf("const eventDate=document.getElementById('prog-event-toggle')"), html.indexOf("const eventDate=document.getElementById('prog-event-toggle')") + 300);
ok(/prog-event-toggle'\)\.value==='ja'\?\(document\.getElementById\('prog-event-date'\)\.value\|\|null\):null/.test(eventReadSrc), "O4: event_date is uitsluitend gevuld wanneer de gebruiker expliciet 'ja' kiest -- anders altijd null (nooit een verzonnen datum)");
ok(/eventDate\?\(document\.getElementById\('prog-event-name'\)\.value\.trim\(\)\|\|null\):null/.test(eventReadSrc), 'O5: event_name is alleen relevant/gevuld in combinatie met een gekozen event_date');
ok(/event_date:c\.eventDate\|\|null,event_name:c\.eventName\|\|null/.test(html), 'O6: beide velden worden correct meegegeven aan de programs-insert');
ok(/ScheduleAdherenceCore\.daysUntilEvent\(p\.event_date,td\(\)\)/.test(html), 'O7: de weergave gebruikt UITSLUITEND ScheduleAdherenceCore voor de berekening, geen eigen datumlogica in de UI-laag');
ok(/ScheduleAdherenceCore\.weeksUntilEvent\(p\.event_date,td\(\)\)/.test(html), 'O8: weeksUntilEvent() wordt gebruikt voor de "nog X weken"-weergave');
const eventChipSrc = html.slice(html.indexOf('let eventChip='), html.indexOf('let eventChip=') + 700);
ok(/dRest<0\?evNaam\+' — verlopen'/.test(eventChipSrc), 'O9: een verlopen evenement toont "verlopen", geen verwarrend negatief weken-getal');
ok(/if\(p\.event_date\)/.test(eventChipSrc), 'O10: zonder event_date wordt er helemaal niets berekend/getoond -- geen lege of foutieve regel bij programma\'s zonder evenement');
// AUDIT-BEVINDING (nacontrole vóór merge): weeksUntilEvent() geeft 0 (niet null) terug
// wanneer een evenement VANDAAG is, waardoor de oorspronkelijke conditie "Nog 0 weken tot..."
// toonde in plaats van het beoogde "Vandaag: ...". Gerepareerd door dRest===0 EERST te
// controleren, vóór de wRest!=null-tak. Bewijs dat de "vandaag"-tekst daadwerkelijk bereikbaar is:
ok(/dRest===0\?'Vandaag: '\+evNaam/.test(eventChipSrc), 'O13 (audit-fix): een evenement dat VANDAAG is toont "Vandaag: [naam]", niet "Nog 0 weken tot [naam]" -- dRest===0 wordt vóór de weken-tak gecontroleerd');
// Architectuurisolatie: event_date/eventChip-logica mag NERGENS phaseForWeek, completed_at,
// computeProgAdjustment of de Program Adaptation V1-functies (pschedule*) aanroepen.
ok(!/phaseForWeek/.test(eventChipSrc) && !/completed_at\s*=/.test(eventChipSrc) && !/computeProgAdjustment/.test(eventChipSrc) && !/pschedule[A-Z]/.test(eventChipSrc), 'O11 (architectuurgrens): de event-chip-weergave raakt NERGENS fase-, voltooiing-, readiness- of Program-Adaptation-logica -- puur additief en informatief');
ok(!/event_date/.test(gateSrc) && !/event_date/.test(rescheduleSrc) && !/event_date/.test(skipSrc) && !/event_date/.test(doTodaySrc), 'O12 (architectuurgrens, omgekeerd): Program Adaptation V1 (maybeShowScheduleGate/reschedule/skip/doToday) raadpleegt event_date NERGENS -- volledig losgekoppeld van elkaar');

/* ── P. AI COACH: GOAL/EVENT-DATE CONTEXT (v4.57.0) — Context Engine-koppeling ── */
console.log('\nP. AI Coach: Goal/Event-Date-context — Calculation Engine, geen AI-berekening');
const eventCtxFnSrc = html.slice(html.indexOf('async function tkProgramEventContext('), html.indexOf('async function tkProgramEventContext(') + 1000);
ok(/ScheduleAdherenceCore\.daysUntilEvent\(/.test(eventCtxFnSrc), 'P1: gebruikt UITSLUITEND ScheduleAdherenceCore voor de berekening, geen eigen datumlogica');
ok(/ScheduleAdherenceCore\.weeksUntilEvent\(/.test(eventCtxFnSrc), 'P2: gebruikt weeksUntilEvent() voor de weken-weergave in de coachcontext');
ok(/status=eq\.actief&event_date=not\.is\.null/.test(eventCtxFnSrc), 'P3: haalt uitsluitend het actieve programma met een ingestelde event_date op -- geen brede, ongefilterde query');
ok(/if\(dRest==null\)return ''/.test(eventCtxFnSrc), 'P4: geen event_date of ongeldige datum -> lege string, geen verzonnen context voor de AI');
ok(/catch\(e\)\{ return ''; \}/.test(eventCtxFnSrc), 'P5: een fout in deze functie mag de coach-context NOOIT laten crashen -- valt terug op lege string, exact zoals tkHyroxCoachContext()');
ok(/tkProgramEventContext\(\)\.catch\(function\(\)\{ return ''; \}\)/.test(html), 'P6: wordt in buildCtx() aangeroepen met dezelfde defensieve .catch()-fallback als het bestaande hyroxCtxTekst-patroon');
ok(/eventCtxTekst\?'\\nWEDSTRIJD\/DOEL-CONTEXT \(reeds berekend, niet zelf herberekenen/.test(html), 'P7: de prompt-tekst is expliciet gelabeld "reeds berekend, niet zelf herberekenen" -- exact het bestaande, bewezen patroon om te voorkomen dat de AI dit als een eigen rekentaak opvat');
ok(/geen trainingsbeslissing hierop baseren tenzij de gebruiker daar expliciet om vraagt/.test(html), 'P8: expliciete instructie aan de AI dat dit uitsluitend informatief is -- geen automatische trainingsaanpassing op basis van event_date');
ok(!/tkProgramEventContext/.test(gateSrc) && !/tkProgramEventContext/.test(rescheduleSrc) && !/tkProgramEventContext/.test(skipSrc) && !/tkProgramEventContext/.test(doTodaySrc), 'P9 (architectuurgrens): Program Adaptation V1 raadpleegt de AI-coachcontext-functie NERGENS -- volledig gescheiden concerns');

/* ── Q. TRAINING LOAD ADVISORY (v4.58.0) — ACWR-classificatie, geen protected-core-wijziging ── */
console.log('\nQ. Training Load Advisory: neutrale ACWR-duiding, geen invloed op computeProgAdjustment()');
ok(/TrainingLoadCore\.classifyAcwr\(/.test(html), 'Q1: gebruikt UITSLUITEND TrainingLoadCore voor de classificatie, geen eigen bandindeling in de UI-laag');
ok(/TrainingLoadCore\.acwrAdvisoryText\(/.test(html), 'Q2: gebruikt UITSLUITEND TrainingLoadCore voor de tekstduiding');
ok(/belastingData\.acwr\.reden==='ok'/.test(html), 'Q3: toont uitsluitend een classificatie wanneer AthleteCore.acuteChronic() zelf een geldig resultaat gaf -- respecteert de bestaande, protected datadrempel (ACWR_MIN_DAGEN)');
ok(/await tkCoachBelasting\(\)/.test(html.slice(html.indexOf('let acwrRegel='), html.indexOf('let acwrRegel=')+400)), 'Q4: hergebruikt de al bestaande tkCoachBelasting() -- geen tweede, parallelle ACWR-berekening');
const acwrRegelSrc = html.slice(html.indexOf('let acwrRegel='), html.indexOf('let acwrRegel=')+700);
ok(!/computeProgAdjustment/.test(acwrRegelSrc), 'Q5 (architectuurgrens): de ACWR-classificatie raadpleegt computeProgAdjustment() NERGENS -- geen invloed op de bestaande, protected sets/RPE-aanpassing');
ok(!/setsDelta|rpeDelta/.test(acwrRegelSrc), 'Q6 (architectuurgrens): geen sets/RPE-delta-logica in de ACWR-regel zelf -- puur informatieve AI-coachcontext, geen automatische trainingsaanpassing');
const decisionSrc = fs.readFileSync(path.join(__dirname, 'decision.js'), 'utf8');
ok(!decisionSrc.includes('TrainingLoadCore') && !decisionSrc.includes('classifyAcwr'), 'Q7 (protected core): core/decision.js bevat GEEN enkele referentie aan TrainingLoadCore/classifyAcwr -- protected core is bewijsbaar niet gewijzigd voor deze feature');

/* ── R. AI COACH: PROGRESSIE-TREND PER OEFENING (v4.59.0) — 100% hergebruik protected ProgressionCore ── */
console.log('\nR. AI Coach: progressie-trend per oefening — geen nieuwe Calculation Engine, geen eigen 1RM-formule');
const progTrendFnSrc = html.slice(html.indexOf('async function tkProgressionTrendContext('), html.indexOf('async function tkProgressionTrendContext(') + 1600);
ok(/PC\.trendBy\(/.test(progTrendFnSrc), 'R1: gebruikt UITSLUITEND ProgressionCore.trendBy() -- geen eigen trendberekening');
ok(/CC\.oneRMRaw\(/.test(progTrendFnSrc), 'R2: gebruikt UITSLUITEND CalcCore.oneRMRaw() (Epley, protected) -- geen eigen 1RM-formule');
ok(/hist\.length<3\)return/.test(progTrendFnSrc), 'R3: respecteert dezelfde minimale-data-drempel (3) als het bestaande post-sessie-signaal, geen verlaagde drempel');
ok(/tr\.improving===false/.test(progTrendFnSrc), 'R4: selecteert uitsluitend oefeningen met een daadwerkelijk dalende trend (improving===false), niet stijgend/stabiel/onbekend');
ok(/catch\(e\)\{ return ''; \}/.test(progTrendFnSrc), 'R5: een fout in deze functie mag de coach-context nooit laten crashen -- valt terug op lege string, exact zoals de bestaande context-functies');
ok(!/setsDelta|rpeDelta|computeProgAdjustment/.test(progTrendFnSrc), 'R6 (architectuurgrens): geen sets/RPE-delta-logica en geen aanroep van computeProgAdjustment() -- puur informatieve AI-coachcontext, geen automatische trainingsaanpassing');
ok(!/deload/i.test(progTrendFnSrc), 'R7 (scope): deze functie doet GEEN deload-suggestie -- uitsluitend een feitelijke constatering, deload blijft expliciet HOLD');
ok(/tkProgressionTrendContext\(\)\.catch\(function\(\)\{ return ''; \}\)/.test(html), 'R8: wordt in buildCtx() aangeroepen met dezelfde defensieve .catch()-fallback als de bestaande context-functies');
ok(/PROGRESSIE-TREND PER OEFENING \(reeds berekend door ProgressionCore, niet zelf herberekenen/.test(html), 'R9: de prompt-tekst is expliciet gelabeld "reeds berekend door ProgressionCore, niet zelf herberekenen"');
ok(/geen deload-advies of trainingsbeslissing hierop baseren tenzij de gebruiker daar expliciet om vraagt/.test(html), 'R10: expliciete instructie aan de AI dat dit geen deload-advies is en geen trainingsbeslissing mag triggeren');
const progressionSrc = fs.readFileSync(path.join(__dirname, 'progression.js'), 'utf8');
ok(!progressionSrc.includes('tkProgressionTrendContext'), 'R11 (protected core): core/progression.js bevat GEEN enkele referentie aan de nieuwe UI-laag-functie -- protected core is bewijsbaar niet gewijzigd');

console.log('\n' + '='.repeat(56));
console.log('RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail) { console.log('❌ Hardening niet groen.'); process.exit(1); }
console.log('✅ Datakwaliteit klopt, de engines zijn enkelvoudig en Home/Training zijn vastgelegd.');
