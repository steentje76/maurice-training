/* fCoachingLusGesloten.test.js — v4.50.0: advies → uitvoering → resultaat → volgend advies
 *
 * HET GAT (B2 uit het overdrachtsdocument).
 * De app gaf na iedere training een opdracht mee voor de volgende keer ("Verhogen
 * (+2,5 kg)"). Die opdracht stond uitsluitend in window._coachSignals en verdween bij het
 * herladen van het scherm. Het voorschrift van de vólgende training werd daarna volledig
 * opnieuw afgeleid uit de vorige sessie, het schema en het herstel van dat moment. Daarmee
 * was de coachingflow nergens gesloten: de sporter kon niet zien of het advies van vorige
 * keer was opgevolgd, en als het voorschrift ervan afweek kreeg hij daar geen woord over.
 *
 * DE OPLOSSING DIE HIER BEWAAKT WORDT.
 * Er wordt niets extra opgeslagen en niets herberekend. Het advies ligt al vast: sinds
 * Sprint 18 reist per set een evidence_snapshot.v1 mee in sessions.sets_detail, mét de
 * genomen beslissing en de regel-id. vorigAdvies() leest dat terug, coachingLus()
 * vergelijkt het met het gewicht dat vandaag toch al op het scherm staat.
 *
 * DE HARDE GRENS. Zonder vastgelegd advies wordt er GEEN advies gereconstrueerd. Een
 * verzonnen "dit zei ik vorige keer" is erger dan zwijgen.
 */
var assert = require('assert');
var fs = require('fs');
var path = require('path');

var D = require('../core/decision.js');
var HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

var geslaagd = 0, mislukt = 0;
function t(naam, fn) {
  try { fn(); geslaagd++; console.log('  ✓ ' + naam); }
  catch (e) { mislukt++; console.log('  ✗ ' + naam + ' :: ' + (e && e.message)); }
}

/* Een sessierij zoals buildStrengthSessionRow hem wegschrijft — inclusief echte,
   door DecisionCore gebouwde snapshots. Geen handgeschreven nabootsing. */
function snapshot(kg, rpe, reps, datum) {
  var besluit = D.progressionDecision(rpe, kg);
  return D.buildDecisionEvidence({
    at: (datum || '2026-08-12') + 'T10:00:00.000Z',
    context: { trainingInstanceId: 'i1', exerciseId: 'TK-1', setNummer: 1, date: datum || '2026-08-12' },
    raw: { kg: kg, reps: reps, rpe: rpe, voorgeschrevenKg: kg, voorgeschrevenReps: reps, voorgeschrevenRpe: 8 },
    calculated: { effKg: kg },
    decision: besluit,
    versions: { calculation: 'working_weight.v1' },
    explanation: null
  });
}
function rij(sets, extra) {
  var r = { date: '2026-08-12', exercise_id: 'TK-1', sets_detail: sets };
  Object.keys(extra || {}).forEach(function (k) { r[k] = extra[k]; });
  return r;
}
function set(kg, rpe, reps, metBewijs, datum) {
  var d = { kg: kg, effKg: kg, reps: reps, rpe: rpe };
  if (metBewijs !== false) d.evidence = snapshot(kg, rpe, reps, datum);
  return d;
}

/* ══ A. HET ADVIES VAN VORIGE KEER TERUGLEZEN ══════════════════════════════ */
console.log('\nA. vorigAdvies — teruglezen uit het bewijsspoor');

t('A1: het advies komt exact uit de opgeslagen beslissing, niet uit een herberekening', function () {
  var a = D.vorigAdvies(rij([set(80, 7, 5)]));
  assert.strictEqual(a.bruikbaar, true, 'een sessie mét bewijsspoor levert geen advies op');
  assert.strictEqual(a.besluit.outcome, 'increase');
  assert.strictEqual(a.besluit.deltaKg, 2.5);
  assert.strictEqual(a.besluit.ruleId, 'progression_rpe', 'de regel-id gaat verloren');
  assert.strictEqual(a.besluit.ruleVersion, 'progression.v1', 'de regelversie gaat verloren');
  assert.strictEqual(a.verwachtKg, 82.5, 'het meegegeven gewicht voor de volgende keer klopt niet');
});

t('A2: het advies hoort bij de set waarop het afrondscherm het baseerde — de zwaarste', function () {
  /* enhanceSummaryProgression kiest de set met het hoogste (eff)gewicht. Kiest deze functie
     een andere set, dan zou de app achteraf een ánder advies tonen dan destijds gegeven. */
  var a = D.vorigAdvies(rij([set(70, 9.5, 5), set(90, 7, 3), set(80, 8, 5)]));
  assert.strictEqual(a.uitgevoerd.kg, 90, 'niet de zwaarste set is gebruikt');
  assert.strictEqual(a.besluit.outcome, 'increase');
  assert.strictEqual(a.verwachtKg, 92.5);
});

t('A3: een deload wordt als deload teruggelezen', function () {
  var a = D.vorigAdvies(rij([set(100, 9.5, 3)]));
  assert.strictEqual(a.besluit.outcome, 'deload');
  assert.strictEqual(a.verwachtKg, 92.5, '100 - 7,5 kg');
});

t('A4: gelijk houden geeft hetzelfde gewicht terug', function () {
  var a = D.vorigAdvies(rij([set(100, 8, 5)]));
  assert.strictEqual(a.besluit.outcome, 'hold');
  assert.strictEqual(a.verwachtKg, 100);
});

t('A5: de uitgevoerde waarden reizen mee — advies zonder uitvoering is geen lus', function () {
  var a = D.vorigAdvies(rij([set(80, 7, 5)]));
  assert.deepStrictEqual(a.uitgevoerd, { kg: 80, reps: 5, rpe: 7 });
  assert.strictEqual(a.datum, '2026-08-12');
  assert.strictEqual(a.exerciseId, 'TK-1');
});

t('A6: zonder bewijsspoor wordt er GEEN advies gereconstrueerd', function () {
  /* Sessies van vóór Sprint 18 hebben geen snapshot. De ruwe kg/rpe staan er wél in, dus
     de verleiding om het advies alsnog uit te rekenen is groot. Dat zou een advies tonen
     dat destijds nooit gegeven is. */
  var a = D.vorigAdvies(rij([set(80, 7, 5, false)]));
  assert.strictEqual(a.bruikbaar, false, 'er wordt een advies verzonnen dat nooit gegeven is');
  assert.strictEqual(a.reden, 'geen_bewijs');
  assert.strictEqual(a.besluit, null);
  assert.strictEqual(a.verwachtKg, null);
});

t('A7: elke onbruikbare vorm geeft een eerlijke reden, nooit een halve uitkomst', function () {
  [[null, 'geen_sessie'], [undefined, 'geen_sessie'], ['tekst', 'geen_sessie'],
   [{ date: 'x' }, 'geen_sets'], [{ sets_detail: [] }, 'geen_sets'],
   [{ sets_detail: 'kapot' }, 'geen_sets']].forEach(function (p) {
    var a = D.vorigAdvies(p[0]);
    assert.strictEqual(a.bruikbaar, false);
    assert.strictEqual(a.reden, p[1], 'verkeerde reden voor ' + JSON.stringify(p[0]));
    assert.strictEqual(a.versie, 'coaching_loop.v1');
  });
});

t('A8: een snapshot van een andere versie wordt niet als bewijs geaccepteerd', function () {
  var s = snapshot(80, 7, 5); s.versie = 'evidence_snapshot.v99';
  var a = D.vorigAdvies(rij([{ kg: 80, effKg: 80, reps: 5, rpe: 7, evidence: s }]));
  assert.strictEqual(a.bruikbaar, false, 'een onbekende snapshotversie wordt toch gelezen');
});

t('A9: de functie muteert de sessierij niet', function () {
  var r = rij([set(80, 7, 5)]);
  var voor = JSON.stringify(r);
  var a = D.vorigAdvies(r);
  a.besluit.label = 'GEWIJZIGD';
  a.uitgevoerd.kg = 999;
  assert.strictEqual(JSON.stringify(r), voor, 'de historie is via de teruggave te muteren');
});

/* ══ B. IS HET ADVIES TERUG TE ZIEN IN VANDAAG? ════════════════════════════ */
console.log('\nB. coachingLus — advies naast het voorschrift van vandaag');

t('B1: hetzelfde gewicht = gevolgd', function () {
  var a = D.vorigAdvies(rij([set(80, 7, 5)]));
  var l = D.coachingLus(a, 82.5, []);
  assert.strictEqual(l.status, 'gevolgd');
  assert.strictEqual(l.verschil, 0);
  assert.deepStrictEqual(l.redenen, [], 'bij "gevolgd" hoort geen afwijkingsreden');
});

t('B2: een afwijking wordt benoemd met de reden die de app zelf al kent', function () {
  var a = D.vorigAdvies(rij([set(80, 7, 5)]));
  var l = D.coachingLus(a, 77.5, ['recovery']);
  assert.strictEqual(l.status, 'afgeweken');
  assert.strictEqual(l.verschil, -5);
  assert.strictEqual(l.reden, 'recovery', 'de afwijking wordt niet verklaard');
});

t('B3: een afwijking zonder bekende reden wordt niet weggepoetst', function () {
  var a = D.vorigAdvies(rij([set(80, 7, 5)]));
  var l = D.coachingLus(a, 70, []);
  assert.strictEqual(l.status, 'afgeweken');
  assert.strictEqual(l.reden, 'onverklaard', 'een onverklaarde afwijking wordt als verklaard gepresenteerd');
});

t('B4: afrondruis op de kilo telt niet als afwijking', function () {
  var a = D.vorigAdvies(rij([set(80, 7, 5)]));
  assert.strictEqual(D.coachingLus(a, 82.5 + D.LUS_KG_SPELING, []).status, 'gevolgd');
  assert.strictEqual(D.coachingLus(a, 82.5 + D.LUS_KG_SPELING * 2, []).status, 'afgeweken');
});

t('B5: zonder advies is de status onbekend — nooit "gevolgd"', function () {
  var a = D.vorigAdvies(rij([set(80, 7, 5, false)]));
  var l = D.coachingLus(a, 82.5, []);
  assert.strictEqual(l.status, 'onbekend');
  assert.strictEqual(l.verwacht, null);
  assert.strictEqual(l.reden, 'geen_bewijs');
});

t('B6: zonder gewicht voor vandaag wordt er niets beweerd', function () {
  var a = D.vorigAdvies(rij([set(80, 7, 5)]));
  [null, undefined, '', 'zwaar', NaN].forEach(function (v) {
    var l = D.coachingLus(a, v, []);
    assert.strictEqual(l.status, 'onbekend', 'er wordt een oordeel geveld zonder voorschrift: ' + String(v));
    assert.strictEqual(l.reden, 'geen_voorschrift');
  });
});

t('B7: de lus is puur — dezelfde invoer geeft altijd dezelfde uitkomst', function () {
  var a = D.vorigAdvies(rij([set(80, 7, 5)]));
  var een = JSON.stringify(D.coachingLus(a, 77.5, ['recovery', 'rep-range']));
  for (var i = 0; i < 5; i++) assert.strictEqual(JSON.stringify(D.coachingLus(a, 77.5, ['recovery', 'rep-range'])), een);
  var redenen = ['recovery'];
  var l = D.coachingLus(a, 77.5, redenen);
  l.redenen.push('vervuild');
  assert.deepStrictEqual(redenen, ['recovery'], 'de meegegeven redenen worden gemuteerd');
});

t('B8: alles draagt de regelversie, zodat een uitkomst herleidbaar blijft', function () {
  assert.strictEqual(D.COACHING_LOOP_VERSIE, 'coaching_loop.v1');
  assert.strictEqual(D.VERSIONS.coaching_loop, 'coaching_loop.v1');
  assert.strictEqual(D.vorigAdvies(rij([set(80, 7, 5)])).versie, 'coaching_loop.v1');
  assert.strictEqual(D.coachingLus(null, 80, []).versie, 'coaching_loop.v1');
});

/* ══ D. WAT DE ONAFHANKELIJKE AUDIT VOND ═══════════════════════════════════ */
console.log('\nD. Bevindingen uit de release-audit');

t('D1: de zwaarste set zónder bewijs maakt het advies onbruikbaar, niet de lichtere mét', function () {
  /* Het afrondscherm kiest de zwaarste set ongeacht RPE en geeft géén opdracht als díe set
     geen RPE heeft. Zou deze functie terugvallen op de lichtere set mét bewijs, dan toont de
     app achteraf een advies dat de sporter nooit heeft gezien — met een gewicht dat tientallen
     kilo's kan afwijken. Precies de fabricatie die de lus niet mag doen. */
  var a = D.vorigAdvies(rij([set(40, 7, 5), set(60, null, 3, false)]));
  assert.strictEqual(a.bruikbaar, false, 'er wordt een advies getoond dat nooit gegeven is');
  assert.strictEqual(a.reden, 'geen_bewijs');
});

t('D2: draagt de zwaarste set wél bewijs, dan telt die — ook naast lichtere sets zonder', function () {
  var a = D.vorigAdvies(rij([set(40, 9.5, 5, false), set(60, 7, 3)]));
  assert.strictEqual(a.bruikbaar, true);
  assert.strictEqual(a.uitgevoerd.kg, 60);
  assert.strictEqual(a.verwachtKg, 62.5);
});

t('D3: een reden die de afwijking niet kan verklaren wordt niet gebruikt', function () {
  /* `via` beschrijft het verschil met de VORIGE SESSIE, niet met het advies. 'progressie'
     (vandaag zwaarder dan vorige keer) verklaart een afwijking van het advies dus niet — dat
     advies bevatte de progressie al. Zonder deze grens onderbouwt de app "10 kg boven je
     eigen deload-advies" met "volgens je opbouw". */
  var deload = D.vorigAdvies(rij([set(60, 9.5, 3)]));      /* advies: -7,5 → 52,5 */
  var l = D.coachingLus(deload, 62.5, ['progressie']);
  assert.strictEqual(l.status, 'afgeweken');
  assert.strictEqual(l.reden, 'onverklaard', 'een niet-verklarende reden wordt toch gebruikt');
  assert.deepStrictEqual(l.redenen, []);
});

t('D4: herstel en rep-range verklaren alleen een LICHTER voorschrift', function () {
  var a = D.vorigAdvies(rij([set(60, 9.5, 3)]));           /* verwacht 52,5 */
  assert.strictEqual(D.coachingLus(a, 45, ['recovery']).reden, 'recovery');
  assert.strictEqual(D.coachingLus(a, 45, ['rep-range']).reden, 'rep-range');
  assert.strictEqual(D.coachingLus(a, 60, ['recovery']).reden, 'onverklaard',
    'herstel wordt als verklaring gebruikt voor een ZWAARDER voorschrift');
});

t('D5: de speling volgt het afrondraster van 0,5 kg', function () {
  /* Het voorschrift gaat door roundKg = Math.round(v*2)/2; het teruggelezen advies is
     ongerond. Met 1,25-schijven levert 41,25 + 2,5 = 43,75 een voorschrift van 43,5 op. Dat
     "afgeweken" noemen zou de app laten klagen over zijn eigen afronding. */
  assert.strictEqual(D.LUS_KG_SPELING, 0.25);
  var a = D.vorigAdvies(rij([{ kg: 41.25, effKg: 41.25, reps: 5, rpe: 7, evidence: snapshot(41.25, 7, 5) }]));
  assert.strictEqual(a.verwachtKg, 43.75);
  assert.strictEqual(D.coachingLus(a, 43.5, []).status, 'gevolgd');
  assert.strictEqual(D.coachingLus(a, 43, []).status, 'afgeweken');
});

t('D6: het scherm zegt eerlijk dat het een verschil niet kan verklaren', function () {
  var m = HTML.match(/const TK_LUS_REDEN = \{[\s\S]*?\n\};/);
  assert.ok(m, 'TK_LUS_REDEN niet gevonden');
  assert.ok(!/'progressie'/.test(m[0]), 'er staat nog een reden in die de lus nooit doorlaat');
  assert.ok(/volgt niet uit dat advies/.test(m[0]),
    'een onverklaarde afwijking krijgt alsnog een verzonnen onderbouwing');
  assert.ok(!/volgens je schema/.test(m[0]));
});

/* ══ C. DE LUS BLIJFT EEN LEESLAAG ═════════════════════════════════════════ */
console.log('\nC. Grenzen');

t('C1: de lus beslist niets zelf — geen enkele trainingsregel in deze code', function () {
  var src = fs.readFileSync(path.join(__dirname, 'decision.js'), 'utf8');
  var blok = src.slice(src.indexOf('function vorigAdvies'), src.indexOf('var DecisionCore = {'));
  assert.ok(blok.length > 500, 'het lus-blok is niet gevonden');
  assert.ok(!/computeProgression|progressionDecision\(/.test(blok),
    'de lus neemt zelf een progressiebeslissing — dan bestaat er een tweede waarheid');
  assert.ok(!/2\.5|7\.5|8\.5/.test(blok), 'er staat een RPE-drempel of kilo-stap in de leeslaag');
});

t('C2: de lus staat in de Decision Core, niet los in het scherm', function () {
  assert.ok(/DecisionCore\.vorigAdvies/.test(HTML) && /DecisionCore\.coachingLus/.test(HTML),
    'index.html gebruikt de core-functies niet');
  assert.ok(!/function vorigAdvies\s*\(/.test(HTML), 'de lus is in index.html gedupliceerd');
  assert.ok(!/function coachingLus\s*\(/.test(HTML), 'de lus is in index.html gedupliceerd');
});

t('C3: het scherm toont het advies van vorige keer bij "Vorige keer"', function () {
  var blok = HTML.slice(HTML.indexOf('function buildPrevBlock'), HTML.indexOf('function showPostSetAdvice'));
  assert.ok(blok.indexOf('DecisionCore.vorigAdvies(prevS)') >= 0, 'het advies wordt niet teruggelezen');
  assert.ok(blok.indexOf('lusHtml') >= 0 && /\$\{lusHtml\}/.test(blok), 'de regel wordt niet gerenderd');
  assert.ok(/tkLusRegel/.test(HTML), 'de presentatiefunctie ontbreekt');
});

t('C4: de presentatie rekent niet en verzint geen gewicht', function () {
  var m = HTML.match(/function tkLusRegel\([\s\S]*?\n\}/);
  assert.ok(m, 'tkLusRegel niet gevonden');
  assert.ok(!/computeProgression|progressionDecision|CalcCore\./.test(m[0]),
    'de weergavelaag rekent zelf');
  assert.ok(!/[^a-zA-Z_](2\.5|7\.5)[^0-9]/.test(m[0]), 'er staat een hard getal in de weergave');
  assert.ok(m[0].indexOf('escHtml') >= 0, 'tekst uit data wordt niet ge-escaped');
});

t('C5: zonder vastgelegd advies blijft de regel leeg', function () {
  var m = HTML.match(/function tkLusRegel\([\s\S]*?\n\}/)[0];
  assert.ok(/!advies\.bruikbaar/.test(m) && /status==='onbekend'/.test(m),
    'er wordt iets getoond terwijl er geen advies is vastgelegd');
  assert.ok(m.indexOf("return ''") >= 0);
});

console.log('\n========================================================');
console.log('RESULTAAT: ' + geslaagd + ' geslaagd, ' + mislukt + ' mislukt');
if (mislukt) { console.log('❌ Coachinglus niet gesloten.'); process.exit(1); }
console.log('✅ Coachinglus groen.');
