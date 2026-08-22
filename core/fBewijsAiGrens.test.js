/* fBewijsAiGrens.test.js — v4.49.0: bewijsspoorbehoud en de deterministische AI-grens
 *
 * Twee bevindingen uit de mastersprint-audit, beide op de grens tussen "de app weet iets"
 * en "de app kan het nog aantonen":
 *
 *  P0 — Het bewijsspoor werd gewist bij een correctie. sets_detail werd bij het bewerken
 *       van een sessie volledig opnieuw opgebouwd uit de invoervelden, en die kennen geen
 *       evidence. Eén correctie in de historie wiste de snapshots van alle sets van die
 *       sessie. Onveranderlijkheid gold alleen in het geheugen, niet op het schrijfpad.
 *
 *  P0 — De programmagenerator liet een taalmodel sets, reps en RPE bepalen en schreef die
 *       ongecontroleerd weg. Er werd alleen gekeken ÓF er een getal stond, niet of het een
 *       mogelijk getal was.
 */
var assert = require('assert');
var fs = require('fs');
var path = require('path');

var DecisionCore = require('../core/decision.js');
var HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

var geslaagd = 0, mislukt = 0;
function t(naam, fn) {
  try { fn(); geslaagd++; console.log('  ✓ ' + naam); }
  catch (e) { mislukt++; console.log('  ✗ ' + naam + ' :: ' + (e && e.message)); }
}

function snapshot(kg) {
  return DecisionCore.buildDecisionEvidence({
    at: '2026-08-19T10:00:00.000Z',
    context: { exerciseId: 'squat', setNummer: 1, date: '2026-08-19' },
    raw: { kg: kg, reps: 5, rpe: 8, voorgeschrevenKg: kg, voorgeschrevenReps: 5, voorgeschrevenRpe: 8 },
    calculated: { effKg: kg },
    decision: DecisionCore.progressionDecision(8, kg),
    explanation: 'RPE binnen bereik'
  });
}

/* ══ A. BEWIJSSPOOR BEHOUDEN (evidence_preserve.v1) ═════════════════════════ */
console.log('\nA. Bewijsspoorbehoud');

t('A1: het contract is vastgelegd', function () {
  assert.strictEqual(DecisionCore.EVIDENCE_PRESERVE_VERSIE, 'evidence_preserve.v1');
  assert.strictEqual(DecisionCore.VERSIONS.evidence_preserve, 'evidence_preserve.v1');
  assert.strictEqual(typeof DecisionCore.preserveEvidence, 'function');
});

t('A2: een ONGEWIJZIGDE set houdt zijn snapshot', function () {
  var oud = [{ kg: 100, effKg: 100, reps: 5, rpe: 8, evidence: snapshot(100) }];
  var nieuw = [{ kg: 100, effKg: 100, reps: 5, rpe: 8 }];
  var uit = DecisionCore.preserveEvidence(nieuw, oud);
  assert.ok(uit[0].evidence, 'het bewijsspoor is gewist bij een sessiebewerking');
  assert.strictEqual(uit[0].evidence.versie, 'evidence_snapshot.v1');
  assert.strictEqual(uit[0].evidence.raw.kg, 100);
});

t('A3: een GEWIJZIGDE set verliest zijn snapshot — vals bewijs is erger dan geen bewijs', function () {
  var oud = [{ kg: 100, effKg: 100, reps: 5, rpe: 8, evidence: snapshot(100) }];
  assert.ok(!DecisionCore.preserveEvidence([{ kg: 105, reps: 5, rpe: 8 }], oud)[0].evidence, 'kg gewijzigd');
  assert.ok(!DecisionCore.preserveEvidence([{ kg: 100, reps: 6, rpe: 8 }], oud)[0].evidence, 'reps gewijzigd');
  assert.ok(!DecisionCore.preserveEvidence([{ kg: 100, reps: 5, rpe: 9 }], oud)[0].evidence, 'rpe gewijzigd');
});

t('A4: getal en tekst met dezelfde waarde gelden als ongewijzigd', function () {
  var oud = [{ kg: 100, reps: 5, rpe: 8, evidence: snapshot(100) }];
  assert.ok(DecisionCore.preserveEvidence([{ kg: '100', reps: '5', rpe: '8' }], oud)[0].evidence,
    'de invoervelden leveren tekst; een tekst-getal-verschil mag geen bewijs wissen');
});

t('A5: per set apart — een gewijzigde set raakt de andere niet', function () {
  var oud = [
    { kg: 100, reps: 5, rpe: 8, evidence: snapshot(100) },
    { kg: 110, reps: 3, rpe: 9, evidence: snapshot(110) }
  ];
  var uit = DecisionCore.preserveEvidence([{ kg: 100, reps: 5, rpe: 8 }, { kg: 115, reps: 3, rpe: 9 }], oud);
  assert.ok(uit[0].evidence, 'set 1 was ongewijzigd en verliest toch zijn bewijs');
  assert.ok(!uit[1].evidence, 'set 2 is gewijzigd en houdt toch oud bewijs');
});

t('A6: een toegevoegde set krijgt geen bewijs van een andere set', function () {
  var oud = [{ kg: 100, reps: 5, rpe: 8, evidence: snapshot(100) }];
  var uit = DecisionCore.preserveEvidence([{ kg: 100, reps: 5, rpe: 8 }, { kg: 100, reps: 5, rpe: 8 }], oud);
  assert.ok(uit[0].evidence);
  assert.ok(!uit[1].evidence, 'een nieuwe set heeft geen historisch bewijs');
});

t('A7: zonder oude sets verandert er niets, en er wordt niets gemuteerd', function () {
  var nieuw = [{ kg: 100, reps: 5, rpe: 8 }];
  assert.deepStrictEqual(DecisionCore.preserveEvidence(nieuw, null), nieuw);
  assert.deepStrictEqual(DecisionCore.preserveEvidence(nieuw, []), nieuw);
  var oud = [{ kg: 100, reps: 5, rpe: 8, evidence: snapshot(100) }];
  var uit = DecisionCore.preserveEvidence(nieuw, oud);
  assert.strictEqual(nieuw[0].evidence, undefined, 'de invoer is gemuteerd');
  uit[0].evidence.raw.kg = 999;
  assert.strictEqual(oud[0].evidence.raw.kg, 100, 'de bewaarde snapshot is per referentie doorgegeven');
});

t('A8: de bewerkroute in de app past de regel ook echt toe', function () {
  assert.ok(HTML.indexOf('DecisionCore.preserveEvidence(row.sets_detail,curEditSess.sets_detail)') >= 0,
    'saveSessionEdit bouwt sets_detail opnieuw op zonder het bewijsspoor te behouden');
});

/* ══ B. DE AI-GRENS OP HET VOORSCHRIFT (prescription_guard.v1) ══════════════ */
console.log('\nB. Deterministische grens op een AI-voorschrift');

t('B1: het contract is vastgelegd', function () {
  assert.strictEqual(DecisionCore.PRESCRIPTION_GUARD_VERSIE, 'prescription_guard.v1');
  assert.strictEqual(DecisionCore.VERSIONS.prescription_guard, 'prescription_guard.v1');
});

t('B2: een normaal voorschrift gaat ongewijzigd door', function () {
  var g = DecisionCore.validatePrescription({ sets: 4, reps: 8, rpe: 8 });
  assert.strictEqual(g.ok, true);
  assert.strictEqual(g.reden, 'ok');
  assert.deepStrictEqual(g.waarden, { sets: 4, reps: 8, rpe: 8 });
});

t('B3: een onmogelijk volume wordt GEWEIGERD, niet stil bijgeknipt', function () {
  var g = DecisionCore.validatePrescription({ sets: 12, reps: 40, rpe: 15 });
  assert.strictEqual(g.ok, false);
  assert.strictEqual(g.reden, 'buiten_grenzen');
  assert.ok(g.geweigerd.indexOf('sets') >= 0);
  assert.strictEqual(g.waarden.sets, null, 'een bijgeknipte waarde zou een voorschrift verzinnen dat niemand bedoeld heeft');
});

t('B4: een RPE buiten de schaal vervalt, maar sloopt het blok niet', function () {
  var g = DecisionCore.validatePrescription({ sets: 3, reps: 10, rpe: 15 });
  assert.strictEqual(g.ok, true);
  assert.strictEqual(g.waarden.rpe, null);
  assert.deepStrictEqual(g.aangepast, ['rpe']);
  assert.strictEqual(g.reden, 'ok_met_correctie');
});

t('B5: een ontbrekende RPE is normaal en geen fout', function () {
  var g = DecisionCore.validatePrescription({ sets: 3, reps: 10 });
  assert.strictEqual(g.ok, true);
  assert.strictEqual(g.waarden.rpe, null);
  assert.deepStrictEqual(g.aangepast, []);
});

t('B6: grenswaarden liggen precies waar ze gedocumenteerd staan', function () {
  assert.strictEqual(DecisionCore.validatePrescription({ sets: 1, reps: 1 }).ok, true);
  assert.strictEqual(DecisionCore.validatePrescription({ sets: 10, reps: 50 }).ok, true);
  assert.strictEqual(DecisionCore.validatePrescription({ sets: 0, reps: 10 }).ok, false);
  assert.strictEqual(DecisionCore.validatePrescription({ sets: 11, reps: 10 }).ok, false);
  assert.strictEqual(DecisionCore.validatePrescription({ sets: 3, reps: 51 }).ok, false);
  assert.strictEqual(DecisionCore.validatePrescription({ sets: 3, reps: 0 }).ok, false);
});

t('B7: onzin, halve sets en ontbrekende velden worden geweigerd', function () {
  assert.strictEqual(DecisionCore.validatePrescription({ sets: 'veel', reps: 10 }).ok, false);
  assert.strictEqual(DecisionCore.validatePrescription({ sets: 3.5, reps: 10 }).ok, false);
  assert.strictEqual(DecisionCore.validatePrescription({ reps: 10 }).ok, false);
  assert.strictEqual(DecisionCore.validatePrescription({}).ok, false);
  assert.strictEqual(DecisionCore.validatePrescription(null).ok, false);
});

t('B8: tekst-getallen worden getypeerd, niet geweigerd', function () {
  var g = DecisionCore.validatePrescription({ sets: '3', reps: '10', rpe: '7.5' });
  assert.strictEqual(g.ok, true);
  assert.deepStrictEqual(g.waarden, { sets: 3, reps: 10, rpe: 7.5 });
});

t('B9: deterministisch', function () {
  var a = JSON.stringify(DecisionCore.validatePrescription({ sets: 4, reps: 8, rpe: 8 }));
  for (var i = 0; i < 25; i++) assert.strictEqual(JSON.stringify(DecisionCore.validatePrescription({ sets: 4, reps: 8, rpe: 8 })), a);
});

t('B10: de generator in de app gebruikt de regel en definieert hem niet zelf opnieuw', function () {
  var fn = HTML.match(/function parseProgrammaJSON\(txt,exerciseList\)\{[\s\S]*?\n\}/)[0];
  assert.ok(fn.indexOf('DC.validatePrescription(o)') >= 0,
    'parseProgrammaJSON laat sets/reps/RPE nog ongecontroleerd door');
  assert.ok(!/sets\s*[<>]=?\s*\d/.test(fn) && !/reps\s*[<>]=?\s*\d/.test(fn),
    'er staat een tweede definitie van de grenzen in de UI');
});

/* ══ C. OVERIGE AUDITBEVINDINGEN ═══════════════════════════════════════════ */
console.log('\nC. Overige auditbevindingen');

t('C1: de deterministische coachcontext wordt afgewacht vóór de AI-terugblik', function () {
  var iBelofte = HTML.indexOf('window._coachSignalsGereed=enhanceSummaryProgression(list)');
  var iWacht = HTML.indexOf('await window._coachSignalsGereed');
  assert.ok(iBelofte > 0, 'de belofte van enhanceSummaryProgression wordt niet bewaard');
  assert.ok(iWacht > 0, 'finishSession wacht niet op de deterministische context');
  var iAi = HTML.indexOf('generateSessionSummaryAI(t,summaryData)');
  assert.ok(iWacht < iAi, 'de AI-terugblik wordt opgevraagd voordat de context er is');
});

t('C2: de AI-regels gaan ook mee als er geen gezondheidsmetingen zijn', function () {
  assert.ok(/function tkCoachRegelsBlok\(\)/.test(HTML), 'het regelblok is niet apart samengesteld');
  var fn = HTML.match(/async function tkCoachDataBlok\([\s\S]*?\n\}/)[0]
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
  assert.ok(fn.indexOf("if(!rows.length) return '';") < 0,
    'zonder metingen valt het hele regelblok weg — precies bij de gebruiker met de minste onderbouwing');
  assert.ok(fn.indexOf('tkCoachRegelsBlok()') >= 0);
  assert.ok(fn.indexOf('geen gezondheidsmetingen') >= 0,
    'het ontbreken van metingen moet expliciet gemeld worden in plaats van stil weggelaten');
});

t('C3: de AI-proxy begrenst model, tokens en omvang server-side', function () {
  var proxy = fs.readFileSync(path.join(__dirname, '..', 'netlify', 'functions', 'coach.js'), 'utf8');
  assert.ok(proxy.indexOf('TOEGESTANE_MODELLEN') >= 0, 'het model komt nog ongecontroleerd uit de client');
  assert.ok(proxy.indexOf('MAX_TOKENS_PLAFOND') >= 0, 'max_tokens komt nog ongecontroleerd uit de client');
  assert.ok(!/model:\s*payload\.model/.test(proxy) && !/max_tokens:\s*payload\.max_tokens/.test(proxy),
    'de clientwaarden worden nog rechtstreeks doorgezet');
  assert.ok(proxy.indexOf('/auth/v1/user') >= 0, 'de JWT-verificatie mag niet verdwijnen');
});

t('C4: de regels blijven puur — geen DOM, netwerk of niet-determinisme in decision.js', function () {
  var bron = fs.readFileSync(path.join(__dirname, 'decision.js'), 'utf8');
  var code = bron.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
  ['Date.now', 'Math.random', 'document.', 'fetch(', 'localStorage'].forEach(function (verboden) {
    assert.ok(code.indexOf(verboden) < 0, verboden + ' in decision.js');
  });
});

/* ══ SLOT ═══════════════════════════════════════════════════════════════════ */
console.log('\n========================================================');
console.log('RESULTAAT: ' + geslaagd + ' geslaagd, ' + mislukt + ' mislukt');
if (mislukt) { console.log('❌ Bewijsspoor/AI-grens niet groen.'); process.exit(1); }
console.log('✅ Bewijsspoor en AI-grens groen.');
