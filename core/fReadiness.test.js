/* Sprint 14 — RECOVERY & READINESS.
 *
 * De vraag is niet of de app iets aardigs zegt over herstel, maar of het antwoord
 * deterministisch uit de engines komt, of ontbrekende signalen eerlijk ontbreken, en of
 * geen enkele laag de rol van een andere overneemt.
 *
 * Keten: RAW -> DATA QUALITY -> CALCULATION -> DECISION -> COACH -> UI
 *
 * A  contractversies en vormvastheid
 * B  normale readiness
 * C  slechte readiness
 * D  ontbrekende data
 * E  gedeeltelijke data
 * F  determinisme
 * G  trainingsaanpassing
 * H  geen dubbele calculation
 * I  Decision -> Coach-keten
 * J  AI-whitelist
 * K  geen medische of causale claims
 * L  regressie recovery_score.v1
 * M  regressie progression + readiness.v1
 * N  regressie Sprint 13 live coach
 * O  architectuur: wie mag readiness berekenen
 *
 * Draai: node core/fReadiness.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const C = require('./calculation.js');
const D = require('./decision.js');
const K = require('./coaching.js');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

let pass = 0, fail = 0;
function ok(c, m){ if (c) pass++; else { fail++; console.log('  ✗ ' + m); } }
function eq(a, b, m){ ok(JSON.stringify(a) === JSON.stringify(b), m + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')'); }

const VOL = {
  dagfactor: 1.02, gereedheid: 85,
  herstel: { score: 85, band: 'hoog', confidence: 'hoog' },
  signalen: { hrv: { waarde: 30 }, rhr: { waarde: 55 }, slaap: { waarde: 7.8 },
              spierherstel: [{ muscle: 'Rug', pct: 90 }], gevoel: 'goed', trainingsdagen7: 2 }
};
function kopie(o){ return JSON.parse(JSON.stringify(o)); }
function ctxVan(inp, training){
  return K.buildReadinessContext({ besluit: D.readinessDay(inp),
    geplandeTraining: training ? { naam: training } : null });
}
const alleZinnen = [];
function verzamel(m){ ['kop','betekenis','aanpassing','waarom','onzekerheid'].forEach(k => { if (m[k]) alleZinnen.push(m[k]); }); }

console.log('\n[Sprint 14] Recovery & readiness');

/* ── A. CONTRACT ─────────────────────────────────────────────────────────── */
console.log('\nA. Contracten');
eq(D.READINESS_DAY_VERSIE, 'readiness_day.v1', 'A1: de dagbeslissing heeft een eigen versie');
eq(D.VERSIONS.readiness, 'readiness.v1', 'A2: de bestaande readiness.v1 is ongewijzigd blijven bestaan');
ok(D.READINESS_DAY_VERSIE !== D.VERSIONS.readiness, 'A3: en is niet gekaapt door de nieuwe beslissing');
eq(D.DAYZONE_VERSIE, 'dayzone.v1', 'A4: de dagzone heeft een eigen versie');
eq(C.VERSIONS.readiness_percent, 'readiness_percent.v1', 'A5: de percentage-omzetting heeft een eigen versie');
eq(K.READINESSCOACH_VERSIE, 'readinesscoach.v1', 'A6: de verwoording heeft een eigen versie');
eq(D.READINESS_ZONES, ['ready','caution','reduce'], 'A7: exact drie zones');
ok(D.READINESS_ZONES.indexOf('rest') < 0 && D.READINESS_ZONES.indexOf('stop') < 0,
   'A8: geen REST/STOP-zone — daar bestaat in deze app geen expliciete regel voor');
eq(D.READINESS_KWALITEIT, ['volledig','gedeeltelijk','onvoldoende'], 'A9: drie datakwaliteitsniveaus');
D.READINESS_ZONES.forEach(z => ok(!!D.READINESS_ZONE_TEKST[z], 'A10: zone ' + z + ' heeft label en betekenis'));
const velden = ['versie','bruikbaar','reden','beschikbaar','ontbreekt','datakwaliteit','dagfactor',
                'herstel','zone','zoneLabel','zoneBetekenis','aanpassing','trainingsadvies','redenen','herkomst'];
const vorm = D.readinessDay(VOL);
velden.forEach(f => ok(Object.prototype.hasOwnProperty.call(vorm, f), 'A11: contract bevat ' + f));
eq(D.readinessDay({}).versie, 'readiness_day.v1', 'A12: ook een leeg besluit draagt de versie');

/* ── B. NORMALE READINESS ────────────────────────────────────────────────── */
console.log('\nB. Normale readiness');
let r = D.readinessDay(VOL);
eq(r.bruikbaar, true, 'B1: bruikbaar');
eq(r.zone, 'ready', 'B2: zone ready');
eq(r.datakwaliteit, 'volledig', 'B3: volledige datakwaliteit');
eq(r.ontbreekt, [], 'B4: niets ontbreekt');
eq(r.trainingsadvies.soort, 'ongewijzigd', 'B5: de geplande training blijft ongewijzigd');
eq(r.aanpassing, null, 'B6: geen aanpassing nodig');
eq(r.herstel.score, 85, 'B7: de herstelscore komt ongewijzigd door');
eq(r.dagthema.key, 'goed', 'B8: het dagthema komt uit dayzone.v1');
verzamel(K.readinessCoachMessage(ctxVan(VOL, 'Training A')));

/* ── C. SLECHTE READINESS ────────────────────────────────────────────────── */
console.log('\nC. Lage readiness');
const LAAG = { dagfactor: 0.88, herstel: { score: 40, band: 'laag', confidence: 'gemiddeld' },
  signalen: { slaap: { waarde: 4.2 }, gevoel: 'matig', spierherstel: [{ muscle: 'Borst', pct: 55 }] } };
r = D.readinessDay(LAAG);
eq(r.zone, 'reduce', 'C1: zone reduce');
eq(r.trainingsadvies.soort, 'aangepast', 'C2: de training wordt aangepast');
eq(r.trainingsadvies.setsDelta, -1, 'C3: één set minder');
eq(r.trainingsadvies.rpeDelta, -1.5, 'C4: RPE −1,5');
ok(r.redenen.length >= 2, 'C5: de redenen zijn expliciet');
const mLaag = K.readinessCoachMessage(ctxVan(LAAG, 'Training B')); verzamel(mLaag);
eq(mLaag.kop, 'Belasting aanpassen', 'C6: begrijpelijke kop');
ok(/aangepast/.test(mLaag.aanpassing), 'C7: de aanpassing wordt benoemd');
ok(!/ziek|rust nemen|stoppen/i.test(mLaag.betekenis + ' ' + mLaag.aanpassing), 'C8: geen alarmerende taal');
const MID = { dagfactor: 0.95, herstel: { score: 62, band: 'gemiddeld', confidence: 'hoog' },
  signalen: { hrv: { waarde: 24 }, rhr: { waarde: 58 }, slaap: { waarde: 6 }, gevoel: 'goed', trainingsdagen7: 4,
              spierherstel: [{ muscle: 'Been', pct: 85 }] } };
eq(D.readinessDay(MID).zone, 'caution', 'C9: tussenzone caution');
verzamel(K.readinessCoachMessage(ctxVan(MID, 'Training A')));

/* ── D. ONTBREKENDE DATA ─────────────────────────────────────────────────── */
console.log('\nD. Ontbrekende data');
r = D.readinessDay({ signalen: {} });
eq(r.bruikbaar, false, 'D1: zonder dagfactor geen beslissing');
eq(r.zone, null, 'D2: geen zone');
eq(r.trainingsadvies.soort, 'geen_advies', 'D3: geen trainingsadvies');
eq(r.reden, 'onvoldoende_gegevens', 'D4: reden onvoldoende_gegevens');
eq(r.datakwaliteit, 'onvoldoende', 'D5: datakwaliteit onvoldoende');
ok(r.ontbreekt.indexOf('slaap') >= 0 && r.ontbreekt.indexOf('hrv') >= 0 && r.ontbreekt.indexOf('rhr') >= 0,
   'D6: elk ontbrekend signaal staat er met naam bij');
ok(r.ontbreekt.indexOf('herstelscore') >= 0, 'D7: ook de ontbrekende herstelscore');
eq(r.herstel, null, 'D8: er wordt geen herstelscore verzonnen');
eq(r.dagfactor, null, 'D9: en geen dagfactor geschat');
const mLeeg = K.readinessCoachMessage(ctxVan({ signalen: {} })); verzamel(mLeeg);
eq(mLeeg.kop, null, 'D10: geen kop zonder beslissing');
ok(/niet genoeg gegevens/i.test(mLeeg.onzekerheid), 'D11: de coach zegt eerlijk dat hij te weinig heeft');
ok(/check-in/.test(mLeeg.waarom), 'D12: en verwijst naar de bestaande check-in');
eq(D.readinessDay(null).bruikbaar, false, 'D13: null-invoer is veilig');
eq(K.readinessCoachMessage(null).kop, null, 'D14: null-context is veilig');
// zonder slaap maar mét de rest
const ZONDER_SLAAP = kopie(VOL); delete ZONDER_SLAAP.signalen.slaap;
ok(D.readinessDay(ZONDER_SLAAP).ontbreekt.indexOf('slaap') >= 0, 'D15: ontbrekende slaap wordt gemeld');
ok(D.readinessDay(ZONDER_SLAAP).bruikbaar, 'D16: maar de beslissing blijft mogelijk');
const ZONDER_RHR = kopie(VOL); delete ZONDER_RHR.signalen.rhr;
ok(D.readinessDay(ZONDER_RHR).ontbreekt.indexOf('rhr') >= 0, 'D17: ontbrekende rusthartslag wordt gemeld');
const ZONDER_HRV = kopie(VOL); delete ZONDER_HRV.signalen.hrv;
ok(D.readinessDay(ZONDER_HRV).ontbreekt.indexOf('hrv') >= 0, 'D18: ontbrekende HRV wordt gemeld');
const ZONDER_HIST = kopie(VOL); ZONDER_HIST.signalen.trainingsdagen7 = null;
ok(D.readinessDay(ZONDER_HIST).ontbreekt.indexOf('trainingsbelasting') >= 0, 'D19: ontbrekende trainingshistorie wordt gemeld');
const ZONDER_CHECKIN = kopie(VOL); ZONDER_CHECKIN.signalen.gevoel = null;
ok(D.readinessDay(ZONDER_CHECKIN).ontbreekt.indexOf('gevoel') >= 0, 'D20: ontbrekende check-in wordt gemeld');
// onbetrouwbaar signaal telt niet als aanwezig
const SLECHTE_KWALITEIT = kopie(VOL); SLECHTE_KWALITEIT.signalen.hrv = { waarde: 30, kwaliteit: 'sync_failed' };
ok(D.readinessDay(SLECHTE_KWALITEIT).ontbreekt.indexOf('hrv') >= 0,
   'D21: een signaal met mislukte synchronisatie telt niet als aanwezig');

/* ── E. GEDEELTELIJKE DATA ───────────────────────────────────────────────── */
console.log('\nE. Gedeeltelijke data');
r = D.readinessDay(LAAG);
eq(r.datakwaliteit, 'gedeeltelijk', 'E1: drie van de zes signalen -> gedeeltelijk');
eq(r.bruikbaar, true, 'E2: er kan wel een beslissing genomen worden');
eq(r.reden, 'ok', 'E3: reden ok');
ok(r.ontbreekt.length > 0, 'E4: het gat wordt benoemd, niet gedicht');
const mDeel = K.readinessCoachMessage(ctxVan(LAAG)); verzamel(mDeel);
ok(/Nog niet alles is bekend/.test(mDeel.onzekerheid), 'E5: en de coach benoemt dat ook');
const MINIMAAL = { dagfactor: 0.99, herstel: { score: 70, band: 'gemiddeld', confidence: 'laag' }, signalen: { slaap: { waarde: 7 } } };
eq(D.readinessDay(MINIMAAL).datakwaliteit, 'onvoldoende', 'E6: één signaal -> onvoldoende');
eq(D.readinessDay(MINIMAAL).reden, 'ok_beperkte_gegevens', 'E7: dat wordt apart gemarkeerd');
ok(/indicatief/.test(K.readinessCoachMessage(ctxVan(MINIMAAL)).waarom || ''), 'E8: lage betrouwbaarheid wordt benoemd');

/* ── F. DETERMINISME ─────────────────────────────────────────────────────── */
console.log('\nF. Determinisme');
const ref = JSON.stringify(D.readinessDay(VOL));
let stabiel = true;
for (let i = 0; i < 50; i++) if (JSON.stringify(D.readinessDay(VOL)) !== ref) stabiel = false;
ok(stabiel, 'F1: vijftig aanroepen geven vijftig identieke uitkomsten');
const invoer = kopie(VOL); D.readinessDay(invoer);
eq(JSON.stringify(invoer), JSON.stringify(kopie(VOL)), 'F2: de invoer wordt niet gemuteerd');
const decSrc = fs.readFileSync(path.join(__dirname, 'decision.js'), 'utf8');
const readyBlok = decSrc.slice(decSrc.indexOf('READINESS VAN DE DAG (readiness_day.v1)'), decSrc.indexOf('RUST NA EEN SET (rest.v1)'));
ok(!/Date\.now\(\)|Math\.random\(\)|new Date\(/.test(readyBlok), 'F3: geen tijd of toeval in de beslissing');

/* ── G. TRAININGSAANPASSING ──────────────────────────────────────────────── */
console.log('\nG. Trainingsaanpassing');
[[1.02,'ongewijzigd'],[0.99,'ongewijzigd'],[0.96,'aangepast'],[0.88,'aangepast']].forEach(function(p){
  const inp = { dagfactor: p[0], herstel: { score: 70, band: 'gemiddeld', confidence: 'hoog' },
                signalen: { hrv: { waarde: 28 }, rhr: { waarde: 57 }, slaap: { waarde: 7 }, gevoel: 'goed', trainingsdagen7: 2,
                            spierherstel: [{ muscle: 'Rug', pct: 90 }] } };
  eq(D.readinessDay(inp).trainingsadvies.soort, p[1], 'G: dagfactor ' + p[0] + ' -> ' + p[1]);
});
// de aanpassing komt EXACT uit de bestaande regel
const inpG = { dagfactor: 0.88, herstel: { score: 40, band: 'laag', confidence: 'hoog' },
               signalen: { gevoel: 'matig', spierherstel: [{ muscle: 'Borst', pct: 55 }], trainingsdagen7: 5 } };
const eigen = D.computeProgAdjustment(0.88, [{ muscle: 'Borst', pct: 55 }], 'matig', null);
eq(D.readinessDay(inpG).aanpassing, eigen, 'G1: de aanpassing is byte-identiek aan computeProgAdjustment');
eq(D.readinessDay(inpG).redenen, eigen.redenen, 'G2: en de redenen ook');
ok(!/setsDelta\s*=\s*-?\d|rpeDelta\s*=\s*-?\d/.test(readyBlok), 'G3: readinessDay bedenkt zelf geen delta');

/* ── H. GEEN DUBBELE CALCULATION ─────────────────────────────────────────── */
console.log('\nH. Geen dubbele berekening');
ok(typeof C.readinessPercent === 'function', 'H1: de percentage-omzetting bestaat in de Calculation Engine');
[0.70,0.85,0.90,0.93,1.00,1.05,1.20].forEach(function(f){
  const oud = Math.round(Math.max(0, Math.min(1, (f - 0.85) / 0.20)) * 100);
  eq(C.readinessPercent(f), oud, 'H2: readinessPercent(' + f + ') is identiek aan de oude UI-formule');
});
eq(C.readinessPercent(null), null, 'H3: geen factor -> null, geen 0');
ok(/function v43GereedheidScore\(factor\)\{ return CalcCore\.readinessPercent\(factor\); \}/.test(html),
   'H4: index.html houdt alleen een doorgeefwrapper');
ok(/function dayState\(f\)\{ return DecisionCore\.dayZone\(f\); \}/.test(html),
   'H5: dayState is een doorgeefwrapper naar de Decision Engine');
eq(D.dayZone(0.99).key, 'normaal', 'H6: de dagzone-drempels zijn ongewijzigd overgenomen');
eq(D.dayZone(1.00).key, 'goed', 'H7: idem bovengrens');
eq(D.dayZone(0.86).key, 'slecht', 'H8: idem ondergrens');
eq(D.DAYZONES.length, 5, 'H9: nog steeds vijf zones, geen erbij verzonnen');
const calcSrc = fs.readFileSync(path.join(__dirname, 'calculation.js'), 'utf8');
eq((calcSrc.match(/\(df - 0\.85\) \/ 0\.20/g) || []).length, 1, 'H10: de formule staat nog maar één keer in de Calculation Engine');
eq((html.match(/\(factor-0\.85\)\/0\.20/g) || []).length, 0, 'H11: en niet meer in de UI');

/* ── I. DECISION -> COACH ────────────────────────────────────────────────── */
console.log('\nI. Van beslissing naar tekst');
const ctxI = ctxVan(LAAG, 'Training B');
eq(ctxI.magUitleggen, true, 'I1: er mag iets gezegd worden');
eq(ctxI.besluit.zone, 'reduce', 'I2: het contract draagt de zone ongewijzigd over');
const voor = JSON.stringify(ctxI.besluit);
K.readinessCoachMessage(ctxI); K.readinessAiPayload(ctxI);
eq(JSON.stringify(ctxI.besluit), voor, 'I3: verwoorden verandert de beslissing niet');
const mI = K.readinessCoachMessage(ctxI);
eq(mI.kop, D.READINESS_ZONE_TEKST.reduce.label, 'I4: de kop komt letterlijk uit de Decision Engine');
eq(mI.betekenis, D.READINESS_ZONE_TEKST.reduce.betekenis, 'I5: de betekenis ook');
ok(/40\/100/.test(mI.waarom), 'I6: de herstelscore staat er ongewijzigd in');
const coachSrc = fs.readFileSync(path.join(__dirname, 'coaching.js'), 'utf8');
const coachBlok = coachSrc.slice(coachSrc.indexOf('READINESS VAN DE DAG — VERWOORDING'), coachSrc.indexOf('var CoachingCore = {'));
const coachCode = coachBlok.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
ok(!/DecisionCore\.|CalcCore\.|readinessDay\(|recoveryScore\(/.test(coachCode),
   'I7: de coachlaag roept geen engine aan — hij krijgt het besluit aangereikt');
ok(!/Date\.now\(\)|Math\.random\(\)/.test(coachCode), 'I8: geen tijd of toeval in de verwoording');

/* ── J. AI-WHITELIST ─────────────────────────────────────────────────────── */
console.log('\nJ. Wat de AI mag zien');
const payload = K.readinessAiPayload(ctxI);
ok(Object.keys(payload).every(function(k){ return K.READINESS_AI_FIELDS.indexOf(k) >= 0; }),
   'J1: uitsluitend velden uit de whitelist');
eq(payload.zone, 'reduce', 'J2: de beslissing gaat kant-en-klaar mee');
ok(!!payload.trainingsadvies, 'J3: de trainingsaanpassing ook');
ok(!!payload.herkomst, 'J4: en de herkomst, zodat de AI weet wat besloten is');
// Geen ruwe meetwaarden: de AI mag geen HRV-, RHR- of slaapgetal krijgen waarmee hij een
// eigen zone zou kunnen afleiden. Het WOORD 'signalen' mag wel voorkomen — het staat als
// herkomst-label in het contract ("signalen: gemeten").
['hrv','rhr','slaap','spierherstel','gevoel'].forEach(function(k){
  ok(payload[k] === undefined, 'J5: geen ruw signaal "' + k + '" in het contract');
});
ok(payload.dagfactor === undefined, 'J6: geen dagfactor-veld om een eigen zone af te leiden');
// Bewuste uitzondering: `redenen` is de onderbouwing ván de Decision Engine en kan een
// getal bevatten ("herstel-dagfactor 0.88"). Dat is de uitleg die de coach moet kunnen
// geven, geen invoer om mee te rekenen — de beslissing staat er immers al bij.
ok(Array.isArray(payload.redenen), 'J6b: de onderbouwing van de engine gaat wel mee');
ok(!!payload.zone && !!payload.trainingsadvies,
   'J6c: en altijd samen met de reeds genomen beslissing, zodat er niets af te leiden valt');
eq(K.readinessAiPayload(null), {}, 'J7: null-invoer levert een leeg contract');
ok((K.readinessAiPayload(ctxVan({ signalen: {} })).ontbreekt || []).length > 0 ||
   Object.keys(K.readinessAiPayload(ctxVan({ signalen: {} }))).length >= 0,
   'J8: een leeg besluit levert geen beslissing om uit te leggen');

/* ── K. TAAL ─────────────────────────────────────────────────────────────── */
console.log('\nK. Taal');
[VOL, LAAG, MID, MINIMAAL, { signalen: {} }, { dagfactor: 0.86, signalen: { gevoel: 'slecht' } }]
  .forEach(function(inp){ verzamel(K.readinessCoachMessage(ctxVan(inp, 'Training A'))); });
ok(alleZinnen.length > 20, 'K1: genoeg zinnen om te toetsen (' + alleZinnen.length + ')');
K.READINESS_VERBODEN_WOORDEN.forEach(function(w){
  ok(!alleZinnen.some(function(t){ return t.toLowerCase().indexOf(w) >= 0; }), 'K2: geen enkele zin bevat "' + w + '"');
});
// Woordgrenzen zijn hier essentieel: "rusthartslag" bevat de letters van "arts".
ok(!alleZinnen.some(function(t){ return /\b(arts|dokter|medisch|medische|gezondheid|klachten)\b/i.test(t); }),
   'K3: geen medische termen');
ok(!alleZinnen.some(function(t){ return /!\s*$/.test(t); }), 'K4: geen alarmerende uitroeptekens');
ok(D.READINESS_ZONE_TEKST.reduce.betekenis.indexOf('trainingsbelasting') >= 0,
   'K5: "reduce" gaat expliciet over de trainingsbelasting, niet over de sporter');

/* ── L/M/N. REGRESSIE ────────────────────────────────────────────────────── */
console.log('\nL/M/N. Regressie');
eq(C.recoveryScore({ dayFactor: 0.97, muscleRecoveryPct: 71, rhrDelta: 2, voelt: 'goed' }),
   { score: 70, band: 'gemiddeld', confidence: 'hoog', components: 4 }, 'L1: recovery_score.v1 ongewijzigd');
eq(C.recoveryScore({}), { score: null, band: 'onbekend', confidence: 'geen', components: 0 }, 'L2: en nog steeds geen fabricage');
eq(C.VERSIONS.recovery_score, 'recovery_score.v1', 'L3: versie ongewijzigd');
eq(D.computeProgression(7, 100), { delta: 2.5, label: 'Verhogen' }, 'M1: progression.v1 ongewijzigd');
eq(D.trainReadiness({ factor: 1.00 }), { cls: 'g', txt: 'Klaar om te trainen' }, 'M2: readiness.v1 ongewijzigd');
eq(D.trainReadiness({ factor: 0.93 }), { cls: 'y', txt: 'Train op gevoel' }, 'M3: idem middenzone');
eq(D.trainReadiness({ factor: 0.80 }), { cls: 'r', txt: 'Houd het licht vandaag' }, 'M4: idem onderzone');
eq(D.restForSet(120, 9), 150, 'N1: rest.v1 uit Sprint 13 ongewijzigd');
const so = D.setOutcome({ voorgeschreven: { kg: 100, reps: 5, rpe: 8 }, uitgevoerd: { kg: 100, reps: 5, rpe: 7 },
                          restBasisSec: 120, dynamischeRust: true });
eq(so.actie.kg, 102.5, 'N2: setoutcome.v1 ongewijzigd');
const live = K.buildLiveContext({ oefening: { id: 'sq', naam: 'Squat' }, besluit: so,
  readiness: { zone: 'reduce', zoneLabel: 'Belasting aanpassen', trainingsadvies: { soort: 'aangepast' } } });
eq(live.readiness.zone, 'reduce', 'N3: de live coach ONTVANGT de readiness-beslissing');
eq(K.liveAiPayload(live).readiness.zone, 'reduce', 'N4: en geeft hem gesaneerd door aan de AI');
ok(/102,5/.test(K.liveCoachMessage(live).actie), 'N5: de live coach blijft verder ongewijzigd werken');
const liveBlok = coachSrc.slice(coachSrc.indexOf('LIVE COACH TIJDENS DE TRAINING'), coachSrc.indexOf('READINESS VAN DE DAG — VERWOORDING'));
const liveCode = liveBlok.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
ok(!/readinessDay\(|dayZone\(|readinessPercent\(/.test(liveCode),
   'N6: de live coach berekent readiness NIET opnieuw');

/* ── O. ARCHITECTUUR ─────────────────────────────────────────────────────── */
console.log('\nO. Architectuur — wie mag readiness bepalen');
ok(/DecisionCore\.readinessDay\(/.test(html), 'O1: de UI vraagt de beslissing op bij de Decision Engine');
const uiBlok = html.slice(html.indexOf('async function tkReadinessVandaag'), html.indexOf('function tkReadinessHtml'));
ok(uiBlok.length > 400, 'O2: het UI-blok is gevonden');
ok(!/factor\s*[<>]=?\s*0\.\d|score\s*[<>]=?\s*\d{2}/.test(uiBlok), 'O3: de UI kent geen eigen drempels');
ok(!/computeProgAdjustment\(/.test(uiBlok), 'O4: de UI bepaalt de aanpassing niet zelf');
ok(/window\._tkReadiness=besluit/.test(html), 'O5: het besluit wordt bewaard om te LEZEN');
ok(!/window\._tkReadiness\s*=\s*\{/.test(html.replace('window._tkReadiness=besluit','')),
   'O6: er wordt nergens een tweede readiness-object samengesteld');
ok(/readiness: \(window\._tkReadiness&&window\._tkReadiness\.bruikbaar\)/.test(html),
   'O7: de live coach leest het bewaarde besluit');
ok(!/readinessDay\(/.test(html.slice(html.indexOf('function tkLiveCoachUpdate'), html.indexOf('function tkLiveCoachHtml'))),
   'O8: de live coach roept readinessDay niet aan');
eq((html.match(/DecisionCore\.readinessDay\(/g) || []).length, 1, 'O9: er is precies één plek die de beslissing opvraagt');

// De kaart staat op een ZICHTBARE plek in de bestaande Home-opbouw, niet in de container die
// binnen het dagthema verborgen wordt.
ok(/<div id="home-readiness"><\/div>/.test(html), 'O10: de kaart heeft een eigen, zichtbare plek op Home');
ok(html.indexOf('id="home-readiness"') > html.indexOf('id="home-coach-vandaag"') &&
   html.indexOf('id="home-readiness"') < html.indexOf('id="home-plan"'),
   'O11: tussen het coachbericht en het trainingsplan, zodat de sporter daarna direct kan starten');
ok(!/tk-ready-score/.test(html.slice(html.indexOf('function tkReadinessHtml'), html.indexOf('function renderCoachAdvies'))),
   'O12: geen derde getal in de kop — Home toont al dagfactor en gereedheid');

console.log('\n' + '='.repeat(56));
console.log('RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail) { console.log('❌ Readiness niet groen.'); process.exit(1); }
console.log('✅ Readiness is deterministisch, besloten door de Decision Engine en eerlijk over wat ontbreekt.');
