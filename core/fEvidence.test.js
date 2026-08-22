/* Sprint 18 — EVIDENCE PERSISTENCE & PROVENANCE.
 *
 * De vraag: kun je later nog aantonen waaróm de app "ga naar 102,5 kg" zei? Dat vraagt om een
 * snapshot die reproduceerbaar is, die ontbrekende gegevens eerlijk als ontbrekend vastlegt,
 * en die niet stilletjes meeverandert wanneer de sporter later iets aanpast.
 *
 * A  evidence_snapshot.v1 — contract en secties
 * B  raw -> calculation -> decision -> evidence
 * C  persistence: het spoor reist mee in de bestaande sessierij
 * D  teruglezen
 * E  historische onveranderlijkheid
 * F  ontbrekende gegevens
 * G  versionering
 * H  deterministische reproductie
 * I  AI-grens
 * J  offline: één schrijfweg, geen los bewijsstuk
 * K  regressie record.v1
 * L  regressie livecoach.v1 en de rest van de keten
 *
 * Draai: node core/fEvidence.test.js
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

// De ECHTE schrijfweg uit index.html, inclusief het bewijsspoor.
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
const buildStrengthSessionRow = new Function('DecisionCore','CalcCore',
  extractFn('tkSetEvidence') + '\n' + extractFn('buildStrengthSessionRow') + '; return buildStrengthSessionRow;')(D, C);
const tkEvidenceVanSessie = new Function('DecisionCore',
  extractFn('tkEvidenceVanSessie') + '; return tkEvidenceVanSessie;')(D);
const tkEvidenceVanSessieAlle = new Function('DecisionCore',
  extractFn('tkEvidenceVanSessieAlle') + '; return tkEvidenceVanSessieAlle;')(D);

const AT = '2026-08-18T18:30:00.000Z';
const OPTS = { date: '2026-08-18', training_type: 'A', note: '', instanceId: 'ti-0001', at: AT,
               voorschrift: { kg: 100, reps: 5, rpe: 8 } };

console.log('\n[Sprint 18] Evidence persistence & provenance');

/* ── A. CONTRACT ─────────────────────────────────────────────────────────── */
console.log('\nA. Contract');
eq(D.EVIDENCE_SNAPSHOT_VERSIE, 'evidence_snapshot.v1', 'A1: eigen versie voor de snapshot');
eq(D.VERSIONS.evidence, 'evidence.v1', 'A2: het bestaande evidence.v1 is ongewijzigd blijven bestaan');
ok(D.EVIDENCE_SNAPSHOT_VERSIE !== D.VERSIONS.evidence, 'A3: en is niet gekaapt door de nieuwe vorm');
eq(D.EVIDENCE_SECTIES, ['raw','calculated','decision','rule','explanation'], 'A4: vijf gescheiden secties');
const ev = D.buildDecisionEvidence({ at: AT,
  context: { trainingInstanceId: 'ti-1', exerciseId: 'sq', setNummer: 2, date: '2026-08-18' },
  raw: { kg: 100, reps: 5, rpe: 7, voorgeschrevenKg: 100, voorgeschrevenReps: 5, voorgeschrevenRpe: 8 },
  calculated: { effKg: 100 }, decision: D.progressionDecision(7, 100),
  versions: { calculation: 'working_weight.v1' }, explanation: 'Ga naar 102,5 kg.' });
D.EVIDENCE_SECTIES.forEach(function(s){ ok(Object.prototype.hasOwnProperty.call(ev, s), 'A5: snapshot bevat sectie ' + s); });
['versie','geldig','at','context','versions','missing'].forEach(function(f){
  ok(Object.prototype.hasOwnProperty.call(ev, f), 'A6: snapshot bevat ' + f); });
eq(ev.geldig, true, 'A7: een volledige snapshot is geldig');
eq(ev.missing, ['confidence'], 'A8: en mist alleen de betrouwbaarheid, die hier bewust niet is ingespoten (v4.49.0)');
// het bestaande, lichte contract blijft werken zoals het was
const oud = D.Evidence.buildEvidence({ source: 'calculation', calculationVersion: 'working_weight.v1',
  decision: { ruleId: 'progression_rpe', ruleVersion: 'progression.v1' }, inputs: { rpe: 8 } });
eq(oud.evidenceVersion, 'evidence.v1', 'A9: buildEvidence levert nog steeds evidence.v1');
ok(oud.raw === undefined && oud.calculated === undefined, 'A10: en heeft de nieuwe secties niet gekregen');

/* ── B. RAW -> CALCULATION -> DECISION -> EVIDENCE ───────────────────────── */
console.log('\nB. De keten in één snapshot');
eq(ev.raw.kg, 100, 'B1: het ruwe gewicht staat erin');
eq(ev.raw.rpe, 7, 'B2: de ruwe RPE ook');
eq(ev.raw.voorgeschrevenRpe, 8, 'B3: en wat er voorgeschreven was');
eq(ev.calculated.effKg, 100, 'B4: de berekende waarde staat apart');
eq(ev.decision.outcome, 'increase', 'B5: de beslissing komt uit de Decision Engine');
eq(ev.decision.deltaKg, 2.5, 'B6: met het getal dat die engine bepaalde');
eq(ev.rule.id, 'progression_rpe', 'B7: de regel-id is vastgelegd');
eq(ev.rule.version, 'progression.v1', 'B8: en de regelversie');
eq(ev.explanation, 'Ga naar 102,5 kg.', 'B9: de uitleg staat er als tekst bij');
eq(ev.decision, D.progressionDecision(7, 100), 'B10: de vastgelegde beslissing is exact die van de engine');
const decSrc = fs.readFileSync(path.join(__dirname, 'decision.js'), 'utf8');
const evBlok = decSrc.slice(decSrc.indexOf('function buildDecisionEvidence'), decSrc.indexOf('function readDecisionEvidence'));
ok(!/progressionDecision\(|computeProgression\(|Math\.(round|max|min)\(/.test(evBlok),
   'B11: de snapshotbouwer rekent zelf niets uit en beslist niets');
ok(!/Date\.now\(\)|new Date\(/.test(evBlok), 'B12: en gebruikt geen eigen klok — `at` wordt ingespoten');

/* ── C. PERSISTENCE ──────────────────────────────────────────────────────── */
console.log('\nC. Opslag via de bestaande sessierij');
const gebouwd = buildStrengthSessionRow('sq', [
  { kg: '100', effKg: 100, reps: '5', rpe: '7' },
  { kg: '102.5', effKg: 102.5, reps: '5', rpe: '9' }
], OPTS);
eq(gebouwd.row.sets_detail.length, 2, 'C1: beide sets staan in sets_detail');
ok(!!gebouwd.row.sets_detail[0].evidence, 'C2: set 1 draagt een bewijsspoor');
ok(!!gebouwd.row.sets_detail[1].evidence, 'C3: set 2 ook');
eq(gebouwd.row.training_instance_id, 'ti-0001', 'C4: de rij hangt aan het bestaande instance-id');
eq(gebouwd.row.sets_detail[0].evidence.context.trainingInstanceId, 'ti-0001', 'C5: en de snapshot verwijst ernaar');
eq(gebouwd.row.sets_detail[0].evidence.context.exerciseId, 'sq', 'C6: met de oefening');
eq(gebouwd.row.sets_detail[0].evidence.context.setNummer, 1, 'C7: en het setnummer');
eq(gebouwd.row.sets_detail[1].evidence.context.setNummer, 2, 'C8: oplopend per set');
eq(gebouwd.row.sets_detail[0].evidence.context.date, '2026-08-18', 'C9: en de datum');
// geen tweede opslagarchitectuur
ok(!/sbPost\w*\(\s*['"]evidence/.test(html), 'C10: er is geen aparte evidence-tabel bijgekomen');
ok(!/localStorage\.setItem\(['"]tk_evidence/.test(html), 'C11: en geen tweede lokale opslag');
eq((html.match(/sets_detail:setsDetail/g) || []).length, 1, 'C12: nog steeds één schrijfweg voor sets_detail');
// de ruwe sessiestaat wordt niet gedupliceerd
ok(!JSON.stringify(gebouwd.row.sets_detail[0].evidence).includes('sessionLog'), 'C13: geen ruwe sessiestaat in de snapshot');
ok(Object.keys(gebouwd.row.sets_detail[0].evidence.raw).length === 6, 'C14: raw bevat precies de zes benoemde velden');

/* ── D. TERUGLEZEN ───────────────────────────────────────────────────────── */
console.log('\nD. Teruglezen');
const terug = tkEvidenceVanSessie(gebouwd.row, 1);
ok(!!terug, 'D1: het spoor is terug te lezen uit de opgeslagen rij');
eq(terug.decision.deltaKg, 2.5, 'D2: met dezelfde beslissing');
eq(terug.versie, 'evidence_snapshot.v1', 'D3: en dezelfde versie');
eq(JSON.stringify(terug), JSON.stringify(gebouwd.row.sets_detail[0].evidence), 'D4: byte-identiek aan wat is opgeslagen');
eq(tkEvidenceVanSessie(gebouwd.row, 2).decision.outcome, 'deload', 'D5: set 2 heeft zijn eigen beslissing');
eq(tkEvidenceVanSessie(gebouwd.row, 9), null, 'D6: een niet-bestaande set levert null');
eq(tkEvidenceVanSessie({}, 1), null, 'D7: een rij zonder sets_detail levert null');
eq(tkEvidenceVanSessie(null, 1), null, 'D8: null-invoer is veilig');
eq(tkEvidenceVanSessieAlle(gebouwd.row).length, 2, 'D9: alle sporen van een sessie zijn op te vragen');
eq(tkEvidenceVanSessieAlle(gebouwd.row)[1].setNummer, 2, 'D10: met het juiste setnummer');
eq(D.readDecisionEvidence({ versie: 'iets_anders' }), null, 'D11: een vreemde vorm wordt niet als snapshot gelezen');
eq(D.readDecisionEvidence('tekst'), null, 'D12: en tekst ook niet');
eq(D.readDecisionEvidence(null), null, 'D13: null is veilig');

/* ── E. HISTORISCHE ONVERANDERLIJKHEID ───────────────────────────────────── */
console.log('\nE. Een snapshot verandert niet mee');
const bron = { kg: 100, reps: 5, rpe: 7, voorgeschrevenKg: 100, voorgeschrevenReps: 5, voorgeschrevenRpe: 8 };
const evLive = D.buildDecisionEvidence({ at: AT, raw: bron, calculated: { effKg: 100 },
                                          decision: D.progressionDecision(7, 100) });
const voor = JSON.stringify(evLive);
bron.kg = 999; bron.voorgeschrevenKg = 999;                 // de sporter past later iets aan
eq(JSON.stringify(evLive), voor, 'E1: de snapshot verandert niet mee met de bron');
eq(evLive.raw.kg, 100, 'E2: het historische gewicht blijft 100');
const gelezen = D.readDecisionEvidence(evLive);
gelezen.decision.deltaKg = 99;                               // de lezer probeert te muteren
eq(evLive.decision.deltaKg, 2.5, 'E3: wie het spoor leest kan de historie niet wijzigen');
const rij = JSON.parse(JSON.stringify(gebouwd.row));
const gelezen2 = tkEvidenceVanSessie(rij, 1);
gelezen2.raw.kg = 0;
eq(tkEvidenceVanSessie(rij, 1).raw.kg, '100', 'E4: ook via de sessielezer niet');
// een later gewijzigd voorschrift raakt de oude snapshot niet
const later = buildStrengthSessionRow('sq', [{ kg: '100', effKg: 100, reps: '5', rpe: '7' }],
  Object.assign({}, OPTS, { voorschrift: { kg: 120, reps: 3, rpe: 9 } }));
eq(gebouwd.row.sets_detail[0].evidence.raw.voorgeschrevenKg, 100, 'E5: de eerdere snapshot houdt het oude voorschrift');
eq(later.row.sets_detail[0].evidence.raw.voorgeschrevenKg, 120, 'E6: de nieuwe legt het nieuwe vast');

/* ── F. ONTBREKENDE GEGEVENS ─────────────────────────────────────────────── */
console.log('\nF. Ontbrekende gegevens blijven ontbreken');
const karig = D.buildDecisionEvidence({ at: AT, raw: { kg: 100 }, decision: D.progressionDecision(7, 100) });
eq(karig.raw.reps, null, 'F1: een ontbrekend veld is null, niet 0');
eq(karig.raw.rpe, null, 'F2: idem RPE');
ok(karig.missing.indexOf('raw.reps') >= 0, 'F3: en staat met naam in missing');
ok(karig.missing.indexOf('raw.voorgeschrevenKg') >= 0, 'F4: ook een ontbrekend voorschrift');
eq(karig.geldig, true, 'F5: met een beslissing en een tijdstip is de snapshot geldig');
const zonderBesluit = D.buildDecisionEvidence({ at: AT, raw: { kg: 100, reps: 5, rpe: 7 } });
eq(zonderBesluit.geldig, false, 'F6: zonder beslissing is er geen geldig bewijsstuk');
eq(zonderBesluit.decision, null, 'F7: en wordt er geen beslissing verzonnen');
const zonderTijd = D.buildDecisionEvidence({ raw: { kg: 100 }, decision: D.progressionDecision(7, 100) });
eq(zonderTijd.geldig, false, 'F8: zonder tijdstip evenmin');
ok(zonderTijd.missing.indexOf('at') >= 0, 'F9: en dat wordt gemeld');
eq(D.buildDecisionEvidence(null).geldig, false, 'F10: null-invoer is veilig');
eq(D.buildDecisionEvidence({}).versie, 'evidence_snapshot.v1', 'F11: ook een lege snapshot draagt de versie');
// een set zonder RPE levert geen spoor, maar wel een bewaarde set
const geenRpe = buildStrengthSessionRow('sq', [{ kg: '100', effKg: 100, reps: '5' }], OPTS);
ok(!geenRpe.row.sets_detail[0].evidence, 'F12: zonder RPE geen beslissing en dus geen spoor');
eq(geenRpe.row.sets_detail[0].effKg, 100, 'F13: de set zelf wordt gewoon bewaard');
eq(tkEvidenceVanSessieAlle(geenRpe.row).length, 0, 'F14: en er valt niets terug te lezen');

/* ── G. VERSIONERING ─────────────────────────────────────────────────────── */
console.log('\nG. Versionering');
eq(ev.versions.evidence, 'evidence_snapshot.v1', 'G1: de evidenceversie staat in de snapshot');
eq(ev.versions.decision, 'progression.v1', 'G2: de regelversie ook');
eq(ev.versions.calculation, 'working_weight.v1', 'G3: en de rekenversie');
eq(gebouwd.row.sets_detail[0].evidence.versions.calculation, C.VERSIONS.working_weight,
   'G4: de opgeslagen rekenversie komt uit CalcCore');
eq(gebouwd.row.sets_detail[0].evidence.versions.decision, D.VERSIONS.progression,
   'G5: en de regelversie uit DecisionCore');

/* ── H. DETERMINISTISCHE REPRODUCTIE ─────────────────────────────────────── */
console.log('\nH. Reproduceerbaar');
const a1 = JSON.stringify(buildStrengthSessionRow('sq', [{ kg: '100', effKg: 100, reps: '5', rpe: '7' }], OPTS));
const a2 = JSON.stringify(buildStrengthSessionRow('sq', [{ kg: '100', effKg: 100, reps: '5', rpe: '7' }], OPTS));
eq(a1, a2, 'H1: dezelfde invoer geeft byte-identiek dezelfde rij inclusief spoor');
let stabiel = true;
for (let i = 0; i < 30; i++) if (JSON.stringify(D.buildDecisionEvidence({ at: AT, raw: { kg: 100, reps: 5, rpe: 7 },
    decision: D.progressionDecision(7, 100) })) !== JSON.stringify(D.buildDecisionEvidence({ at: AT,
    raw: { kg: 100, reps: 5, rpe: 7 }, decision: D.progressionDecision(7, 100) }))) stabiel = false;
ok(stabiel, 'H2: dertig aanroepen geven dertig identieke snapshots');
// de opgeslagen beslissing is opnieuw af te leiden uit de ruwe waarden
const opnieuw = D.progressionDecision(terug.raw.rpe, terug.calculated.effKg);
eq(D.evidenceReproduceerbaar(terug, opnieuw), { reproduceerbaar: true, reden: 'ok' },
   'H3: uit de opgeslagen ruwe waarden komt exact dezelfde beslissing');
eq(D.evidenceReproduceerbaar(terug, D.progressionDecision(9, 100)).reproduceerbaar, false,
   'H4: een andere invoer levert aantoonbaar een andere uitkomst');
eq(D.evidenceReproduceerbaar(terug, D.progressionDecision(9, 100)).reden, 'andere_uitkomst',
   'H5: met dezelfde regel, dus dat wordt zo benoemd');
eq(D.evidenceReproduceerbaar(terug, { outcome: 'increase', deltaKg: 2.5, ruleId: 'iets_anders', ruleVersion: 'x.v9' }).reden,
   'andere_regelversie', 'H6: een andere regel wordt apart benoemd');
eq(D.evidenceReproduceerbaar(null, opnieuw).reproduceerbaar, false, 'H7: zonder snapshot geen uitspraak');

/* ── I. AI-GRENS ─────────────────────────────────────────────────────────── */
console.log('\nI. AI-grens');
ok(!/liveAiPayload|readinessAiPayload|aiPayload/.test(evBlok), 'I1: de snapshot wordt niet door een AI-laag gebouwd');
eq(K.LIVE_AI_FIELDS.indexOf('evidence'), -1, 'I2: de AI krijgt het bewijsspoor niet als vrije invoer');
eq(K.READINESS_AI_FIELDS.indexOf('evidence'), -1, 'I3: ook niet in de readiness-payload');
const liveCtx = K.buildLiveContext({ oefening: { id: 'sq', naam: 'Squat' },
  besluit: D.setOutcome({ voorgeschreven: { kg:100, reps:5, rpe:8 }, uitgevoerd: { kg:100, reps:5, rpe:7 },
                          restBasisSec: 120, dynamischeRust: true }), evidence: ev });
ok(K.liveAiPayload(liveCtx).evidence === undefined, 'I4: een meegegeven spoor lekt niet in de payload');
eq(K.liveCoachMessage(liveCtx).actie.indexOf('102,5') >= 0, true, 'I5: de coach gebruikt nog steeds het engine-getal');
ok(!JSON.stringify(K.liveAiPayload(liveCtx)).includes('evidence_snapshot'), 'I6: en ziet de snapshotvorm niet');
// de uitleg in de snapshot is tekst, geen bron van waarheid
eq(typeof ev.explanation, 'string', 'I7: de uitleg is tekst');
ok(ev.decision.deltaKg === 2.5 && ev.explanation.indexOf('102,5') >= 0,
   'I8: en beschrijft exact het getal dat de engine bepaalde');

/* ── J. OFFLINE ──────────────────────────────────────────────────────────── */
console.log('\nJ. Offline');
ok(/sbPostQ\('sessions'/.test(html) || /writeSessionRow/.test(html), 'J1: sessies gaan via de offline-veilige schrijfweg');
ok(/async function sbPostQ/.test(html) && /offlineQueueAdd/.test(html), 'J2: de offline-wachtrij bestaat en wordt gebruikt');
ok(!/sbPost\w*\(\s*['"]evidence/.test(html), 'J3: het bewijsspoor kent geen eigen schrijfactie');
// omdat het spoor IN de sessierij zit, kan het niet los kwijtraken of dubbel ontstaan
const rij2 = buildStrengthSessionRow('sq', [{ kg: '100', effKg: 100, reps: '5', rpe: '7' }], OPTS).row;
eq(JSON.stringify(rij2.sets_detail[0].evidence) === JSON.stringify(gebouwd.row.sets_detail[0].evidence), true,
   'J4: dezelfde set levert hetzelfde spoor — een herhaalde write dupliceert niets nieuws');
ok(/newTrainingInstanceId/.test(html) && /crypto\.randomUUID/.test(html),
   'J5: het instance-id wordt client-side gezet, dus ook offline beschikbaar');

/* ── K/L. REGRESSIE ──────────────────────────────────────────────────────── */
console.log('\nK/L. Bestaande functionaliteit');
eq(D.releaseRecord(115, 100).isRecord, true, 'K1: record.v1 ongewijzigd');
eq(D.releaseRecord(100, 100).isRecord, false, 'K2: evenaren is nog steeds geen record');
eq((html.match(/DecisionCore\.releaseRecord\(/g) || []).length, 3, 'K3: nog steeds drie recordbeslissingen');
eq(gebouwd.row.weight, 102.5, 'K4: de zwaarste set blijft de kop van de rij');
eq(gebouwd.row.sets, 2, 'K5: en het aantal sets klopt');
eq(D.setOutcome({ voorgeschreven: { kg:100, reps:5, rpe:8 }, uitgevoerd: { kg:100, reps:5, rpe:7 },
                  restBasisSec: 120, dynamischeRust: true }).actie.kg, 102.5, 'L1: setoutcome.v1 ongewijzigd');
eq(D.restForSet(120, 9), 150, 'L2: rest.v1 ongewijzigd');
eq(D.readinessDay({ dagfactor: 0.99, herstel: { score: 70, band: 'gemiddeld', confidence: 'hoog' },
  signalen: { hrv: { waarde: 28, kwaliteit: 'no_data' }, rhr: { waarde: 57, kwaliteit: 'no_data' },
              slaap: { waarde: 7 }, spierherstel: [{ muscle: 'Rug', pct: 90 }], gevoel: 'goed', trainingsdagen7: 2 } }).datakwaliteit,
   'gedeeltelijk', 'L3: de Sprint 15-datakwaliteit staat nog');
eq(C.trendClassify([10,12]).richting, 'onvoldoende_data', 'L4: trend.v1 uit Sprint 16 ongewijzigd');
eq(C.calculateVolume({ sets: 3, reps: 5, weight: 100 }), 1500, 'L5: volume.v1 ongewijzigd');
['id="home-hero"','id="home-readiness"','Jouw ritme','Mijn trainingen','Workout Builder','Kalender','Logboek','id="s-stats"']
  .forEach(function(t){ ok(html.indexOf(t) >= 0, 'L6: UI ongemoeid: ' + t); });

console.log('\n' + '='.repeat(56));
console.log('RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail) { console.log('❌ Evidence niet groen.'); process.exit(1); }
console.log('✅ Elke beslissing is terug te vinden, te reproduceren en verandert niet met terugwerkende kracht.');
