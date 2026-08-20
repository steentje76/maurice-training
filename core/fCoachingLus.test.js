/* fCoachingLus.test.js — v4.49.0: waarom, tegenstrijdigheid en betrouwbaarheid
 *
 * Drie gaten in de coachingflow, alle drie op hetzelfde punt: de app WIST iets en zei het
 * niet.
 *
 *  FASE 5, vraag 3 — "waarom zegt de app dit?" bleef op het afrondscherm onbeantwoord.
 *      De uitleg bestond al (CoachingCore.explainProgression) maar werd alleen tijdens de
 *      set getoond; op het scherm waar de sporter zijn opdracht voor de volgende keer
 *      krijgt, stond alleen de opdracht.
 *  FASE 4 — de vierde safeguard ontbrak volledig. Geen bewijs, lage betrouwbaarheid en
 *      ontbrekende gegevens werden afgevangen; gegevens die elkaar TEGENSPREKEN niet. Een
 *      groene dagfactor naast "ik voel me slecht" leverde gewoon een groen advies op.
 *  FASE 2 — het bewijsspoor legde vast WAT er besloten was, niet hoe stevig dat besluit
 *      stond, terwijl die informatie al berekend werd.
 */
var assert = require('assert');
var fs = require('fs');
var path = require('path');

var D = require('../core/decision.js');
var K = require('../core/coaching.js');
var HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

var geslaagd = 0, mislukt = 0;
function t(naam, fn) {
  try { fn(); geslaagd++; console.log('  ✓ ' + naam); }
  catch (e) { mislukt++; console.log('  ✗ ' + naam + ' :: ' + (e && e.message)); }
}

function besluit(extra) {
  var sig = { hrv: { waarde: 60 }, rhr: { waarde: 55 }, slaap: { waarde: 8 },
              spierherstel: [{ pct: 95 }], gevoel: 'goed', trainingsdagen7: 3 };
  Object.keys(extra || {}).forEach(function (k) { sig[k] = extra[k]; });
  return D.readinessDay({ dagfactor: 1.05, gereedheid: 90,
                          herstel: { score: 80, band: 'goed', confidence: 'hoog' },
                          signalen: sig });
}

/* ══ A. TEGENSTRIJDIGE SIGNALEN (conflict.v1) ══════════════════════════════ */
console.log('\nA. Tegenstrijdige signalen');

t('A1: het contract is vastgelegd', function () {
  assert.strictEqual(D.CONFLICT_VERSIE, 'conflict.v1');
  assert.strictEqual(D.VERSIONS.conflict, 'conflict.v1');
  assert.strictEqual(typeof D.detectConflicten, 'function');
});

t('A2: consistente gegevens leveren geen conflict op', function () {
  var b = besluit();
  assert.deepStrictEqual(b.conflicten, []);
  assert.strictEqual(b.zekerheid, 'consistent');
});

t('A3: groene dag naast een slecht gevoel is een conflict', function () {
  var b = besluit({ gevoel: 'slecht' });
  assert.strictEqual(b.conflicten.length >= 1, true, 'het eigen gevoel wordt weggestreept tegen een berekende factor');
  assert.ok(b.conflicten.some(function (c) { return c.id === 'gevoel_vs_dagfactor'; }));
  assert.notStrictEqual(b.zekerheid, 'consistent');
});

t('A4: groene dag naast een niet-hersteld spiergroep is een conflict', function () {
  var b = besluit({ spierherstel: [{ pct: 95 }, { pct: 40 }] });
  assert.ok(b.conflicten.some(function (c) { return c.id === 'herstel_vs_dagfactor'; }));
  assert.strictEqual(D.CONFLICT_HERSTEL_LAAG, 70, 'de drempel wijkt af van computeProgAdjustment');
});

t('A5: HRV en rusthartslag die dezelfde kant op bewegen is een conflict', function () {
  var b = besluit({ hrv: { waarde: 60, richting: 'omhoog' }, rhr: { waarde: 55, richting: 'omhoog' } });
  assert.ok(b.conflicten.some(function (c) { return c.id === 'hrv_vs_rhr'; }));
  var b2 = besluit({ hrv: { waarde: 60, richting: 'omhoog' }, rhr: { waarde: 55, richting: 'omlaag' } });
  assert.ok(!b2.conflicten.some(function (c) { return c.id === 'hrv_vs_rhr'; }),
    'tegengesteld bewegen is juist normaal en mag geen conflict zijn');
});

t('A6: een zware RPE-trend naast een groene dag is een conflict', function () {
  var b = besluit({ rpeGemiddeld7: 9.2 });
  assert.ok(b.conflicten.some(function (c) { return c.id === 'rpe_vs_dagfactor'; }));
  assert.strictEqual(D.CONFLICT_RPE_ZWAAR, 9);
  assert.ok(!besluit({ rpeGemiddeld7: 7.5 }).conflicten.some(function (c) { return c.id === 'rpe_vs_dagfactor'; }));
});

t('A7: twee tegenstrijdigheden maken de uitkomst tegenstrijdig, niet slechts onzeker', function () {
  var b = besluit({ gevoel: 'slecht', spierherstel: [{ pct: 30 }] });
  assert.ok(b.conflicten.length >= 2);
  assert.strictEqual(b.zekerheid, 'tegenstrijdig');
  assert.strictEqual(besluit({ gevoel: 'matig' }).zekerheid, 'onzeker');
});

t('A8: een conflict verandert de zone en de aanpassing NIET', function () {
  var schoon = besluit(), conflict = besluit({ hrv: { waarde: 60, richting: 'omhoog' }, rhr: { waarde: 55, richting: 'omhoog' } });
  assert.strictEqual(conflict.zone, schoon.zone, 'de regel mag de beslissing niet overnemen');
  assert.deepStrictEqual(conflict.trainingsadvies, schoon.trainingsadvies);
});

t('A9: op een rode dag telt een laag gevoel niet als tegenstrijdig', function () {
  var b = D.readinessDay({ dagfactor: 0.85, signalen: { gevoel: 'slecht', spierherstel: [{ pct: 40 }] } });
  assert.ok(!b.conflicten.some(function (c) { return c.id === 'gevoel_vs_dagfactor'; }),
    'alles wijst dezelfde kant op — dat is juist consistent');
});

t('A10: deterministisch', function () {
  var a = JSON.stringify(besluit({ gevoel: 'slecht' }).conflicten);
  for (var i = 0; i < 20; i++) assert.strictEqual(JSON.stringify(besluit({ gevoel: 'slecht' }).conflicten), a);
});

/* ══ B. DE COACH ZEGT HET OOK ══════════════════════════════════════════════ */
console.log('\nB. Verwoording en AI-grens');

t('B1: de coachtekst benoemt de tegenstrijdigheid expliciet', function () {
  var m = K.readinessCoachMessage({ besluit: besluit({ gevoel: 'slecht' }) });
  assert.ok(m.onzekerheid && m.onzekerheid.length > 10, 'er wordt niets over de tegenstrijdigheid gezegd');
  assert.ok(/tegenstrijdig/i.test(m.onzekerheid));
});

t('B2: bij twee conflicten wordt er geen zekerheid meer geclaimd', function () {
  var m = K.readinessCoachMessage({ besluit: besluit({ gevoel: 'slecht', spierherstel: [{ pct: 30 }] }) });
  assert.ok(/niets met zekerheid/i.test(m.onzekerheid), 'de toon blijft even stellig als op een consistente dag');
});

t('B3: zonder conflict blijft de bestaande tekst staan', function () {
  var m = K.readinessCoachMessage({ besluit: besluit() });
  assert.ok(!m.onzekerheid || !/tegenstrijdig/i.test(m.onzekerheid));
  assert.ok(m.kop && m.betekenis, 'de gewone boodschap is verdwenen');
});

t('B4: de AI krijgt de conflicten mee, maar niet de ruwe signalen', function () {
  var payload = K.readinessAiPayload({ besluit: besluit({ gevoel: 'slecht' }) });
  assert.ok(Array.isArray(payload.conflicten) && payload.conflicten.length >= 1, 'de AI weet niet dat de gegevens botsen');
  assert.strictEqual(typeof payload.conflicten[0], 'string', 'alleen de id hoort mee te gaan, niet de hele structuur');
  assert.ok(payload.zekerheid);
  Object.keys(payload).forEach(function (k) {
    assert.ok(K.READINESS_AI_FIELDS.indexOf(k) >= 0, 'veld buiten de whitelist: ' + k);
  });
});

t('B5: zonder conflict staat er niets over conflicten in de payload', function () {
  var payload = K.readinessAiPayload({ besluit: besluit() });
  assert.ok(payload.conflicten === undefined, 'een leeg conflictveld suggereert dat er iets te melden is');
  assert.ok(payload.zekerheid === undefined);
});

t('B6: de AI-regels verbieden een stellige uitspraak bij tegenstrijdigheid', function () {
  var regels = K.intelligenceRegels();
  assert.ok(/tegenstrijdig/i.test(regels), 'de vierde safeguard staat niet in de instructie aan de AI');
  assert.ok(/NIET stellig/i.test(regels));
});

/* ══ C. WAAROM ZEGT DE APP DIT? ════════════════════════════════════════════ */
console.log('\nC. Waarom op het afrondscherm');

t('C1: de uitleg wordt per oefening bepaald uit de reeds genomen beslissing', function () {
  assert.ok(HTML.indexOf('_nextWhy=CoachingCore.explainProgression(_dec)') >= 0,
    'de opdracht voor de volgende keer krijgt geen onderbouwing');
  assert.ok(HTML.indexOf('DecisionCore.progressionDecision(parseFloat(_bset.rpe), _bkg)') >= 0,
    'de uitleg komt niet uit dezelfde beslissing als de opdracht');
});

t('C2: de uitleg wordt ook getoond', function () {
  assert.ok(HTML.indexOf('sess-next-why') >= 0, 'er is geen plek waar de uitleg terechtkomt');
  assert.ok(HTML.indexOf("nextWhy: _nextWhy") >= 0, 'de uitleg bereikt de coachsignalen niet');
});

t('C3: zonder uitleg staat er geen regel — er wordt geen reden verzonnen', function () {
  var fn = HTML.match(/function renderNextActionsCard\(\)\{[\s\S]*?\n\}/)[0];
  assert.ok(/r\.why\?/.test(fn), 'de uitleg wordt onvoorwaardelijk gerenderd');
});

t('C4: de uitleg zelf verzint niets — hij verwoordt alleen de uitkomst', function () {
  assert.strictEqual(K.explainProgression(null), '');
  assert.strictEqual(K.explainProgression({ outcome: 'onbekend' }), '');
  var tekst = K.explainProgression(D.progressionDecision(7, 100));
  assert.ok(tekst.indexOf('100') >= 0 && /verhogen/i.test(tekst));
});

/* ══ D. BETROUWBAARHEID IN HET BEWIJSSPOOR ═════════════════════════════════ */
console.log('\nD. Betrouwbaarheid in het bewijsspoor');

t('D1: het snapshot heeft een confidence-veld', function () {
  var ev = D.buildDecisionEvidence({ at: '2026-08-19T10:00:00.000Z',
    context: { exerciseId: 'sq', setNummer: 1, date: '2026-08-19' },
    raw: { kg: 100, reps: 5, rpe: 8, voorgeschrevenKg: 100, voorgeschrevenReps: 5, voorgeschrevenRpe: 8 },
    calculated: { effKg: 100 }, decision: D.progressionDecision(8, 100),
    confidence: { datakwaliteit: 'gedeeltelijk', zekerheid: 'onzeker', bron: 'readiness_day.v1' } });
  assert.strictEqual(ev.confidence.datakwaliteit, 'gedeeltelijk');
  assert.deepStrictEqual(ev.missing, []);
});

t('D2: ontbreekt hij, dan wordt dat gemeld in plaats van stil weggelaten', function () {
  var ev = D.buildDecisionEvidence({ at: '2026-08-19T10:00:00.000Z',
    context: { exerciseId: 'sq', setNummer: 1, date: '2026-08-19' },
    raw: { kg: 100, reps: 5, rpe: 8, voorgeschrevenKg: 100, voorgeschrevenReps: 5, voorgeschrevenRpe: 8 },
    calculated: { effKg: 100 }, decision: D.progressionDecision(8, 100) });
  assert.strictEqual(ev.confidence, null);
  assert.ok(ev.missing.indexOf('confidence') >= 0);
  assert.strictEqual(ev.geldig, true, 'een ontbrekende betrouwbaarheid maakt het bewijs niet ongeldig');
});

t('D3: de snapshot blijft onveranderlijk — confidence wordt gekopieerd', function () {
  var bron = { datakwaliteit: 'volledig' };
  var ev = D.buildDecisionEvidence({ at: '2026-08-19T10:00:00.000Z', context: {}, raw: {},
    calculated: {}, decision: D.progressionDecision(8, 100), confidence: bron });
  bron.datakwaliteit = 'gewijzigd';
  assert.strictEqual(ev.confidence.datakwaliteit, 'volledig', 'de snapshot verandert mee met zijn invoer');
});

t('D4: de app spoot de betrouwbaarheid ook echt in', function () {
  var fn = HTML.match(/function tkSetEvidence\([\s\S]*?\n\}/)[0];
  assert.ok(/confidence:\(function\(\)\{/.test(fn), 'tkSetEvidence geeft geen betrouwbaarheid mee');
  assert.ok(fn.indexOf('_tkReadiness') >= 0, 'de betrouwbaarheid komt niet uit de reeds genomen readiness-beslissing');
  assert.ok(fn.indexOf('readiness_day.v1') >= 0, 'de herkomst van de betrouwbaarheid is niet vastgelegd');
});

/* ══ E. PRODUCT-AUDIT (FASE 16) ════════════════════════════════════════════ */
console.log('\nE. Product-audit');

t('E1: de opslagindicator raakt élk trainingsscherm, niet alleen de legacy-ids', function () {
  var fn = HTML.match(/function updateSaveIndicator\(\)\{[\s\S]*?\n\}/)[0];
  assert.ok(fn.indexOf('querySelectorAll') >= 0 && fn.indexOf('train-save-status-') >= 0,
    'de indicator schrijft naar vaste ids en staat daardoor altijd op groen');
  assert.ok(fn.indexOf("['a','b']") < 0, 'de vaste lijst met legacy-ids staat er nog');
});

t('E2: een nieuwe sporter krijgt een startpunt in plaats van een leeg blok', function () {
  var fn = HTML.match(/function v43RenderPlan\(elId,nextT\)\{[\s\S]*?\n\}/)[0];
  assert.ok(fn.indexOf("if(!nextT){el.innerHTML='';return;}") < 0,
    'zonder training verdwijnt de enige startknop en blijft er een leeg scherm over');
  assert.ok(fn.indexOf('Maak je eerste training') >= 0, 'er is geen lege staat met een volgende stap');
  assert.ok(fn.indexOf("go('s-train-mine')") >= 0, 'de lege staat leidt nergens heen');
});

t('E3: een mislukte check-in wordt gemeld in plaats van bevestigd', function () {
  var fn = HTML.match(/async function saveHRV\(btnEl\)\{[\s\S]*?\n\}/)[0];
  assert.ok(fn.indexOf('_uitkomsten') >= 0, 'de uitkomsten van de schrijfacties worden nog weggegooid');
  assert.ok(fn.indexOf('nog niet opgeslagen') >= 0, 'er komt geen melding bij een mislukte check-in');
  var iCheck = fn.indexOf('_uitkomsten.some'), iClose = fn.indexOf("closeModal('m-hrv')");
  assert.ok(iCheck > 0 && iClose > iCheck, 'de modal sluit voordat de uitkomst is gecontroleerd');
});

t('E4: upsertWeightLog geeft zijn uitkomst terug', function () {
  var fn = HTML.match(/async function upsertWeightLog\(weight,scale\)\{[\s\S]*?\n\}/)[0];
  assert.ok(/return await sbPatch/.test(fn) && /return await sbPost/.test(fn),
    'de aanroeper kan niet zien of het gewicht is opgeslagen');
});

t('E5: de app verwijst niet meer naar een route die niet bestaat', function () {
  assert.strictEqual(HTML.indexOf('Instellingen → Privacy'), -1,
    'die route bestaat niet meer; privacy staat onder Profiel');
});

/* ══ F. ÉÉN VOLUME (session_volume.v1) ═════════════════════════════════════ */
console.log('\nF. Eén volumeformule');

var CalcCore = require('../core/calculation.js');

t('F1: het contract is vastgelegd', function () {
  assert.strictEqual(CalcCore.VERSIONS.session_volume, 'session_volume.v1');
  assert.strictEqual(typeof CalcCore.sessionVolume, 'function');
});

t('F2: het volume komt uit de werkelijke sets, niet uit de samenvatting', function () {
  /* De sessierij bewaart de ZWAARSTE set als weight/reps plus het aantal sets. sets*reps*weight
     doet dus alsof elke set even zwaar was — dat overschat structureel. */
  var rij = { weight: 100, reps: 5, sets: 3,
              sets_detail: [{ kg: 100, reps: 5 }, { kg: 90, reps: 5 }, { kg: 80, reps: 5 }] };
  assert.strictEqual(CalcCore.sessionVolume(rij), 1350);
  assert.notStrictEqual(CalcCore.sessionVolume(rij), 1500, 'de samenvattingsformule wordt nog gebruikt');
  assert.strictEqual(CalcCore.sessionVolumeBron(rij), 'sets_detail');
});

t('F3: het effectieve gewicht wint van het ingevoerde gewicht', function () {
  assert.strictEqual(CalcCore.sessionVolume({ sets_detail: [{ kg: 20, effKg: 60, reps: 10 }] }), 600);
});

t('F4: oudere rijen zonder sets_detail vallen terug op de samenvatting', function () {
  assert.strictEqual(CalcCore.sessionVolume({ weight: 100, reps: 5, sets: 3 }), 1500);
  assert.strictEqual(CalcCore.sessionVolumeBron({ weight: 100, reps: 5, sets: 3 }), 'samenvatting');
  assert.strictEqual(CalcCore.sessionVolume({ weight: 100, reps: 5 }), 500, 'zonder setsaantal telt één set');
});

t('F5: geen gegevens levert null, nooit 0', function () {
  assert.strictEqual(CalcCore.sessionVolume({}), null);
  assert.strictEqual(CalcCore.sessionVolume(null), null);
  assert.strictEqual(CalcCore.sessionVolume({ weight: 0, reps: 5, sets: 3 }), null);
  assert.strictEqual(CalcCore.sessionVolumeBron({}), 'geen', '"niet gemeten" en "nul volume" zijn niet hetzelfde');
});

t('F6: sets_detail als tekst uit de database werkt ook', function () {
  assert.strictEqual(CalcCore.sessionVolume({ sets_detail: JSON.stringify([{ kg: 50, reps: 10 }]) }), 500);
});

t('F7: deterministisch', function () {
  var rij = { sets_detail: [{ kg: 82.5, reps: 7 }, { kg: 77.5, reps: 9 }] };
  var a = CalcCore.sessionVolume(rij);
  for (var i = 0; i < 25; i++) assert.strictEqual(CalcCore.sessionVolume(rij), a);
});

t('F8: alle schermen rekenen via dezelfde functie', function () {
  assert.strictEqual((HTML.match(/CalcCore\.calculateVolume\(/g) || []).length, 0,
    'er staat nog een scherm dat rechtstreeks de samenvattingsformule gebruikt');
  assert.strictEqual((HTML.match(/weight\*x\.reps\*x\.sets/g) || []).length, 0,
    'er staat nog een handmatige volumeformule in de UI');
  var n = (HTML.match(/CalcCore\.sessionVolume\(/g) || []).length;
  assert.ok(n >= 8, 'niet elk scherm gebruikt session_volume.v1 (' + n + ')');
});

/* ══ SLOT ═══════════════════════════════════════════════════════════════════ */
console.log('\n========================================================');
console.log('RESULTAAT: ' + geslaagd + ' geslaagd, ' + mislukt + ' mislukt');
if (mislukt) { console.log('❌ Coachinglus niet groen.'); process.exit(1); }
console.log('✅ Coachinglus groen.');

