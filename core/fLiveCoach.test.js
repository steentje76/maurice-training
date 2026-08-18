/* Sprint 13 — LIVE COACH TIJDENS DE TRAINING.
 *
 * De kernvraag van deze sprint is niet "zegt de coach iets aardigs", maar: komt wat hij zegt
 * aantoonbaar uit de engines, en houdt hij zijn mond wanneer de gegevens ontbreken?
 *
 * Keten die bewezen moet worden:
 *   RAW (gelogde set) -> CALCULATION -> DECISION (setOutcome/progressionDecision) -> COACH
 * en NIET:
 *   RAW -> AI -> beslissing
 *
 * A  volledige context aanwezig
 * B  gedeeltelijke context
 * C  ontbrekende data
 * D  lage RPE      E  normale RPE      F  hoge RPE
 * G  minder reps   H  meer reps        I  afwijkend gewicht
 * J  rustadvies
 * K  de Decision Engine bepaalt de volgende actie
 * L  de coachlaag verandert de beslissing NIET
 * M  de coachlaag rekent NIET
 * N  geen causaliteitsclaims, geen medische taal
 * O  geen advies zonder de noodzakelijke context
 * P  bestaande trainingsflow en engines intact
 * Q  het AI-contract: gesaneerd, geen ruwe data
 *
 * Draai: node core/fLiveCoach.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const D = require('./decision.js');
const C = require('./coaching.js');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

let pass = 0, fail = 0;
function ok(c, m){ if (c) pass++; else { fail++; console.log('  ✗ ' + m); } }
function eq(a, b, m){ ok(JSON.stringify(a) === JSON.stringify(b), m + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')'); }

const VOOR = { kg: 100, reps: 5, rpe: 8 };
function keten(uitgevoerd, opts){
  opts = opts || {};
  const besluit = D.setOutcome({
    voorgeschreven: opts.voorgeschreven !== undefined ? opts.voorgeschreven : VOOR,
    uitgevoerd: uitgevoerd,
    restBasisSec: opts.rust !== undefined ? opts.rust : 120,
    dynamischeRust: opts.dyn !== undefined ? opts.dyn : true
  });
  const ctx = C.buildLiveContext({
    oefening: opts.oefening !== undefined ? opts.oefening : { id: 'sq', naam: 'Back Squat' },
    setNummer: 2, totaalSets: 3,
    voorgeschreven: opts.voorgeschreven !== undefined ? opts.voorgeschreven : VOOR,
    uitgevoerd: uitgevoerd, besluit: besluit,
    herstel: opts.herstel || null, datakwaliteit: opts.dq || null
  });
  return { besluit: besluit, ctx: ctx, msg: C.liveCoachMessage(ctx) };
}
const alleTeksten = [];
function verzamel(m){ [m.actie, m.waarom, m.onzekerheid, m.afwijking].forEach(t => { if (t) alleTeksten.push(t); }); }

console.log('\n[Sprint 13] Live coach tijdens de training');

/* ── A. VOLLEDIGE CONTEXT ────────────────────────────────────────────────── */
console.log('\nA. Volledige context');
let r = keten({ kg: 100, reps: 5, rpe: 7 }); verzamel(r.msg);
eq(r.ctx.versie, 'livecoach.v1', 'A1: contractversie livecoach.v1');
eq(r.ctx.ontbreekt, [], 'A2: niets ontbreekt');
eq(r.ctx.magUitleggen, true, 'A3: er mag iets gezegd worden');
ok(/102,5 kg/.test(r.msg.actie), 'A4: de actie noemt het door de engine bepaalde gewicht');
ok(!!r.msg.waarom, 'A5: er is een uitleg');
eq(r.ctx.herkomst.uitgevoerd, 'gemeten', 'A6: uitgevoerde waarden zijn gemeten');
eq(r.ctx.herkomst.voorgeschreven, 'berekend', 'A7: voorgeschreven waarden zijn berekend');
eq(r.ctx.herkomst.volgendeActie, 'besloten', 'A8: de volgende actie is besloten');
eq(r.ctx.herkomst.uitleg, 'uitgelegd', 'A9: de uitleg is uitleg, geen bron van waarheid');
eq(C.LIVE_HERKOMST.indexOf('gemeten') >= 0 && C.LIVE_HERKOMST.indexOf('besloten') >= 0, true, 'A10: de herkomstsoorten zijn expliciet vastgelegd');

/* ── B. GEDEELTELIJKE CONTEXT ────────────────────────────────────────────── */
console.log('\nB. Gedeeltelijke context');
r = keten({ kg: 100, reps: 5 }); verzamel(r.msg);          // geen RPE
eq(r.ctx.ontbreekt, ['rpe'], 'B1: alleen de RPE ontbreekt');
eq(r.besluit.actie.soort, 'rust', 'B2: zonder RPE geen gewichtsadvies, wel rust');
ok(/Rust/.test(r.msg.actie), 'B3: de actie gaat over rust');
ok(!/kg/.test(r.msg.actie), 'B4: er wordt geen gewicht geadviseerd zonder RPE');
ok(/niet alles is ingevuld/i.test(r.msg.onzekerheid), 'B5: de onzekerheid wordt benoemd');
r = keten({ kg: 100, reps: 5, rpe: 7 }, { voorgeschreven: null }); verzamel(r.msg);
eq(r.besluit.afwijkingen, [], 'B6: zonder voorschrift zijn er geen afwijkingen vast te stellen');
ok(r.besluit.doelGehaald === null, 'B7: en "doel gehaald" blijft onbekend, niet "nee"');
ok(/102,5 kg/.test(r.msg.actie), 'B8: het gewichtsadvies kan wel gewoon gegeven worden');

/* ── C. ONTBREKENDE DATA ─────────────────────────────────────────────────── */
console.log('\nC. Ontbrekende data');
r = keten({}); verzamel(r.msg);
eq(r.besluit.bruikbaar, false, 'C1: niets ingevuld -> niet bruikbaar');
eq(r.besluit.reden, 'onvoldoende_gegevens', 'C2: reden onvoldoende_gegevens');
eq(r.msg.actie, null, 'C3: geen actie');
ok(/niet genoeg gegevens|geen advies/i.test(r.msg.onzekerheid), 'C4: de coach zegt dat hij te weinig heeft');
ok(/niets ingevuld/i.test(r.msg.afwijking), 'C5: de overgeslagen set wordt gemeld');
const zonderBesluit = C.liveCoachMessage(C.buildLiveContext({ oefening: { naam: 'X' } }));
eq(zonderBesluit.actie, null, 'C6: zonder besluit geen actie');
ok(!!zonderBesluit.onzekerheid, 'C7: zonder besluit wel een eerlijke melding');
eq(C.buildLiveContext({}).magUitleggen, false, 'C8: lege invoer levert geen toestemming om iets te zeggen');
eq(C.liveCoachMessage(null).actie, null, 'C9: null-invoer is veilig');

/* ── D/E/F. RPE ──────────────────────────────────────────────────────────── */
console.log('\nD/E/F. RPE-interpretatie via de bestaande regel');
const laag = keten({ kg: 100, reps: 5, rpe: 6 }); verzamel(laag.msg);
eq(laag.besluit.actie.soort, 'verhogen', 'D1: lage RPE -> verhogen');
eq(laag.besluit.actie.kg, 102.5, 'D2: het getal komt uit computeProgression (+2,5)');
const normaal = keten({ kg: 100, reps: 5, rpe: 8 }); verzamel(normaal.msg);
eq(normaal.besluit.actie.soort, 'gelijk', 'E1: normale RPE -> gelijk houden');
ok(/Blijf bij 100 kg/.test(normaal.msg.actie), 'E2: en dat staat er ook zo');
const hoog = keten({ kg: 100, reps: 5, rpe: 9.5 }); verzamel(hoog.msg);
eq(hoog.besluit.actie.soort, 'verlagen', 'F1: hoge RPE -> verlagen');
eq(hoog.besluit.actie.kg, 92.5, 'F2: het getal komt uit computeProgression (−7,5)');
// de coachlaag verzint geen eigen RPE-regel
[5,6,7,7.5,8,8.5,9,10].forEach(function(rpe){
  const k = keten({ kg: 100, reps: 5, rpe: rpe });
  const eigen = D.progressionDecision(rpe, 100);
  eq(k.besluit.actie.deltaKg, eigen.deltaKg, 'RPE ' + rpe + ': delta komt exact uit progressionDecision');
});

/* ── G/H/I. AFWIJKINGEN ──────────────────────────────────────────────────── */
console.log('\nG/H/I. Afwijkingen');
r = keten({ kg: 100, reps: 3, rpe: 8 }); verzamel(r.msg);
eq(r.besluit.afwijkingen.map(a => a.soort), ['minder_reps'], 'G1: minder reps herkend');
eq(r.besluit.afwijkingen[0].verschil, -2, 'G2: met het juiste verschil');
ok(/minder herhalingen/i.test(r.msg.afwijking), 'G3: en begrijpelijk verwoord');
eq(r.besluit.doelGehaald, false, 'G4: doel niet gehaald');
r = keten({ kg: 100, reps: 8, rpe: 8 }); verzamel(r.msg);
eq(r.besluit.afwijkingen.map(a => a.soort), ['meer_reps'], 'H1: meer reps herkend');
eq(r.besluit.doelGehaald, true, 'H2: doel wel gehaald');
r = keten({ kg: 92.5, reps: 5, rpe: 8 }); verzamel(r.msg);
eq(r.besluit.afwijkingen.map(a => a.soort), ['lager_gewicht'], 'I1: lager gewicht herkend');
eq(r.besluit.afwijkingen[0].verschil, -7.5, 'I2: met het juiste verschil');
r = keten({ kg: 105, reps: 5, rpe: 9 }); verzamel(r.msg);
eq(r.besluit.afwijkingen.map(a => a.soort), ['hoger_gewicht', 'hogere_rpe'], 'I3: hoger gewicht én hogere RPE');
r = keten({ kg: 100, reps: 5, rpe: 8 }); verzamel(r.msg);
eq(r.besluit.afwijkingen, [], 'I4: precies volgens plan -> geen afwijking');
ok(/gehaald wat er stond/i.test(r.msg.afwijking), 'I5: en dat mag gezegd worden');
D.SETOUTCOME_AFWIJKINGEN.forEach(function(soort){
  ok(!!C.AFWIJKING_TEKST[soort], 'elke afwijkingssoort heeft een tekst: ' + soort);
});

/* ── J. RUST ─────────────────────────────────────────────────────────────── */
console.log('\nJ. Rustadvies');
r = keten({ kg: 100, reps: 5, rpe: 9.5 });
eq(r.besluit.rust.seconden, D.restForSet(120, 9.5), 'J1: de rusttijd komt uit rest.v1');
eq(r.besluit.rust.geschaald, true, 'J2: en is geschaald op de RPE');
ok(/3 minuten/.test(r.msg.actie), 'J3: begrijpelijk verwoord');
r = keten({ kg: 100, reps: 5, rpe: 9.5 }, { dyn: false });
eq(r.besluit.rust.seconden, 120, 'J4: staat schaling uit, dan blijft de ingestelde rust staan');
eq(r.besluit.rust.geschaald, false, 'J5: en dat wordt ook zo gemeld');
r = keten({ kg: 100, reps: 5, rpe: 8 });
ok(!/aangepast ten opzichte/.test(r.msg.waarom || ''), 'J6: geen "aangepast" melden als het getal gelijk blijft');
r = keten({ kg: 100, reps: 5, rpe: 8 }, { rust: null });
eq(r.besluit.rust.seconden, null, 'J7: zonder ingestelde rust wordt er geen rusttijd verzonnen');
ok(!/Rust/.test(r.msg.actie), 'J8: en er wordt niet over rust gesproken');

/* ── K/L/M. WIE BESLIST, WIE REKENT ──────────────────────────────────────── */
console.log('\nK/L/M. De Decision Engine beslist, de coach verwoordt');
r = keten({ kg: 100, reps: 5, rpe: 6 });
eq(r.ctx.besluit.actie, r.besluit.actie, 'K1: het contract draagt de beslissing ongewijzigd over');
eq(r.ctx.besluit.progressie.ruleId, 'progression_rpe', 'K2: met de regel-id erbij');
eq(r.ctx.besluit.progressie.ruleVersion, D.VERSIONS.progression, 'K3: en de regelversie');
// L: de coachlaag muteert het besluit niet
const besluitVoor = JSON.stringify(r.besluit);
C.liveCoachMessage(r.ctx); C.liveAiPayload(r.ctx); C.buildLiveContext({ besluit: r.besluit });
eq(JSON.stringify(r.besluit), besluitVoor, 'L1: het besluit is na verwoording byte-identiek');
ok(/102,5/.test(C.liveCoachMessage(r.ctx).actie), 'L2: en het getal is nog steeds dat van de engine');
// M: geen rekenkunde in de coachlaag
const coachSrc = fs.readFileSync(path.join(__dirname, 'coaching.js'), 'utf8');
const liveBlok = coachSrc.slice(coachSrc.indexOf('LIVE COACH TIJDENS DE TRAINING'), coachSrc.indexOf('var CoachingCore = {'));
ok(liveBlok.length > 500, 'M1: het live-blok is gevonden');
ok(!/[*\/+]\s*2\.5|deltaKg\s*[+\-*/]|curKg\s*[+\-]/.test(liveBlok), 'M2: de coachlaag rekent geen gewichten uit');
ok(!/Date\.now\(\)|Math\.random\(\)/.test(liveBlok), 'M3: geen Date.now of random');
// Commentaar telt niet mee: het gaat om echte aanroepen, niet om het benoemen van de keten.
const liveCode = liveBlok.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
ok(!/progressionDecision\(|computeProgression\(|DecisionCore\./.test(liveCode),
   'M4: de coachlaag roept de progressieregel of de Decision Engine niet zelf aan');
ok(liveCode.indexOf('b.progressie') > 0,
   'M4b: de coachlaag leest de reeds genomen beslissing, in plaats van hem op te vragen');
// alleen presentatie-afronding is toegestaan (minuten/seconden), niets over gewicht
ok(/Math\.floor\(n \/ 60\)/.test(liveBlok), 'M5: de enige rekenkunde is het omzetten van seconden naar minuten');

/* ── N. TAAL ─────────────────────────────────────────────────────────────── */
console.log('\nN. Taal — geen causaliteit, geen medische uitspraken');
[[{kg:100,reps:5,rpe:5}],[{kg:100,reps:5,rpe:7}],[{kg:100,reps:5,rpe:8}],[{kg:100,reps:5,rpe:9}],
 [{kg:100,reps:5,rpe:10}],[{kg:80,reps:2,rpe:10}],[{kg:120,reps:9,rpe:5}],[{kg:100,reps:5}],[{}]]
  .forEach(function(p){ verzamel(keten(p[0]).msg); });
ok(alleTeksten.length > 40, 'N1: genoeg zinnen om te toetsen (' + alleTeksten.length + ')');
C.LIVE_VERBODEN_WOORDEN.forEach(function(w){
  ok(!alleTeksten.some(function(t){ return t.toLowerCase().indexOf(w) >= 0; }), 'N2: geen enkele zin bevat "' + w + '"');
});
ok(!alleTeksten.some(function(t){ return /\bmoet je\b.*\bomdat\b/i.test(t); }), 'N3: geen oorzaak-gevolgconstructies');
ok(!alleTeksten.some(function(t){ return /pijn|letsel|arts|ziek/i.test(t); }), 'N4: geen medische termen');
ok(!alleTeksten.some(function(t){ return /je bent klaar voor|trainingsklaar|hersteld/i.test(t); }), 'N5: geen gereedheidsoordeel');
ok(alleTeksten.every(function(t){ return t === t.trim() && t.length > 0; }), 'N6: geen lege of rommelige zinnen');

/* ── O. GEEN ADVIES ZONDER CONTEXT ───────────────────────────────────────── */
console.log('\nO. Geen advies zonder de noodzakelijke context');
eq(keten({ reps: 5, rpe: 8 }).besluit.actie.soort, 'rust', 'O1: zonder gewicht geen gewichtsadvies');
ok(!/kg/.test(keten({ reps: 5, rpe: 8 }).msg.actie || ''), 'O2: en er wordt geen kilo genoemd');
eq(keten({ kg: 100, reps: 5 }, { rust: null }).besluit.actie.soort, 'geen_advies', 'O3: geen RPE en geen rust -> helemaal geen advies');
eq(keten({ kg: 100, reps: 5 }, { rust: null }).msg.actie, null, 'O4: en dus geen actiezin');
ok(/nodig/.test(keten({ kg: 100, reps: 5 }, { rust: null }).msg.onzekerheid), 'O5: wel uitleg over wat er mist');

/* ── P. BESTAANDE FUNCTIONALITEIT INTACT ─────────────────────────────────── */
console.log('\nP. Bestaande engines en flow intact');
['computeProgression','progressionDecision','computeProgAdjustment','trainReadiness','releaseRecord',
 'releaseVerband','verbandTrainingContext','restForSet','setOutcome']
  .forEach(function(f){ ok(typeof D[f] === 'function', 'DecisionCore.' + f + ' bestaat'); });
['buildContext','aiPayload','explainProgression','styleProgression','buildCoachConclusion',
 'buildLiveContext','liveCoachMessage','liveAiPayload']
  .forEach(function(f){ ok(typeof C[f] === 'function', 'CoachingCore.' + f + ' bestaat'); });
eq(D.computeProgression(7, 100), { delta: 2.5, label: 'Verhogen' }, 'P1: de progressieregel is ongewijzigd');
eq(D.restForSet(120, 8), 120, 'P2: de rustregel is ongewijzigd overgenomen');
ok(/function dynamicRestSec\(baseSec, rpe\)\{ return DecisionCore\.restForSet/.test(html),
   'P3: index.html houdt een doorgeefwrapper, dus bestaande aanroepen blijven werken');
ok(/tkLiveCoachUpdate\(exId,setNum\)/.test(html), 'P4: de coachregel wordt bijgewerkt na het loggen van een werkset');
ok(/id=\x27livecoach-\x27\+cur\.id/.test(html) || /livecoach-'\+cur\.id/.test(html),
   'P5: de coachregel staat in de bestaande VANDAAG-kaart, niet op een nieuw scherm');
ok(!/go\('s-coach'\)/.test(html.slice(html.indexOf('function tkLiveCoachUpdate'), html.indexOf('function tkLiveCoachVraagAi'))),
   'P6: het tonen van advies haalt de sporter niet uit de training');
ok(/askCoachEx\(naam,\(typeof curT/.test(html), 'P7: doorklikken naar de AI gebruikt de BESTAANDE coachingang');
ok(/updateSetE1RM/.test(html), 'P8: bestaande live-1RM is niet vervangen');
ok(/autoRestAfterSet/.test(html), 'P9: bestaande rustflow is niet vervangen');

/* ── Q. AI-CONTRACT ──────────────────────────────────────────────────────── */
console.log('\nQ. Wat de AI mag zien');
r = keten({ kg: 100, reps: 3, rpe: 9.5 }, { herstel: { score: 71, band: 'gemiddeld', betrouwbaarheid: 'hoog' } });
const payload = C.liveAiPayload(r.ctx);
ok(!!payload.actie && payload.actie.soort === 'verlagen', 'Q1: de beslissing zit kant-en-klaar in het contract');
eq(payload.oefening, 'Back Squat', 'Q2: de oefening is een naam, geen object');
ok(Array.isArray(payload.afwijkingen), 'Q3: afwijkingen als lijst sleutels');
ok(!!payload.herkomst, 'Q4: de herkomst gaat mee, zodat de AI weet wat gemeten en wat besloten is');
const sleutels = Object.keys(payload);
ok(sleutels.every(function(k){ return C.LIVE_AI_FIELDS.indexOf(k) >= 0; }), 'Q5: uitsluitend velden uit de whitelist');
ok(!JSON.stringify(payload).includes('sessionLog'), 'Q6: geen ruwe sessiedata');
ok(!JSON.stringify(payload).includes('progressie'), 'Q7: geen interne engine-objecten');
const leegPayload = C.liveAiPayload(null);
ok(leegPayload && typeof leegPayload === 'object', 'Q8: null-invoer levert een object, geen crash');
ok(leegPayload.actie === undefined && leegPayload.oefening === undefined,
   'Q9: en dat object bevat geen beslissing of oefening om over te praten');
const leegCtx = C.buildLiveContext({ besluit: D.setOutcome({ uitgevoerd: {} }) });
ok((C.liveAiPayload(leegCtx).ontbreekt || []).length > 0, 'Q9b: ontbrekende velden staan expliciet in het contract');
ok(/LIVE COACH-CONTEXT \(reeds besloten door de Decision Engine/.test(html),
   'Q10: de systeemprompt markeert het blok als reeds besloten');
ok(/niet herberekenen|wijzig het advies of het getal niet/.test(html),
   'Q11: de instructie verbiedt de AI het advies te wijzigen');
ok(/vul ontbrekende gegevens niet in/.test(html), 'Q12: en verbiedt gokken');
ok(/geen\s*\n?oorzaak-gevolg|beschrijf geen\s*\n?oorzaak-gevolg/.test(html), 'Q13: en causale taal');
ok(/CoachingCore\.liveAiPayload\(ctx\)/.test(html), 'Q14: de AI krijgt het gesaneerde contract, niet de ruwe context');

/* ── R. KETENREGRESSIE ───────────────────────────────────────────────────── */
console.log('\nR. Keten: RAW -> CALCULATION -> DECISION -> COACH (en niet RAW -> AI)');
const raw = { kg: '100', reps: '5', rpe: '9.5' };            // zoals het uit de DOM/sessionLog komt
const besluitUitEngine = D.setOutcome({ voorgeschreven: VOOR, uitgevoerd: raw, restBasisSec: 120, dynamischeRust: true });
const ctxUitCoach = C.buildLiveContext({ oefening: { id: 'sq', naam: 'Back Squat' }, besluit: besluitUitEngine,
                                          voorgeschreven: VOOR, uitgevoerd: raw });
const zin = C.liveCoachMessage(ctxUitCoach);
eq(besluitUitEngine.actie.kg, 92.5, 'R1: de Decision Engine bepaalt 92,5 kg');
ok(zin.actie.indexOf('92,5') >= 0, 'R2: exact dat getal staat in de coachzin');
ok(zin.waarom.indexOf('9,5') >= 0, 'R3: en de uitleg noemt de gemeten RPE');
eq(C.liveAiPayload(ctxUitCoach).actie.kg, 92.5, 'R4: de AI krijgt hetzelfde getal, niet de vrijheid het te herzien');
// dezelfde ruwe invoer moet altijd tot dezelfde uitkomst leiden
let stabiel = true; const ref = JSON.stringify(zin);
for (let i = 0; i < 25; i++) if (JSON.stringify(C.liveCoachMessage(ctxUitCoach)) !== ref) stabiel = false;
ok(stabiel, 'R5: deterministisch — dezelfde set geeft altijd dezelfde coachzin');
ok(!/fetch\(|netlify\/functions/.test(liveBlok), 'R6: de coachlaag roept geen AI aan om tot een beslissing te komen');

console.log('\n' + '='.repeat(56));
console.log('RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail) { console.log('❌ Live coach niet groen.'); process.exit(1); }
console.log('✅ De coach verwoordt de engines, beslist niets zelf en gokt niet.');
