/* fErgContinuousProtocolIdentity.test.js — Erg Continuous Protocol Identity.
 * Test de echte ErgProtocolIdentity-productiefuncties tegen de echte
 * IntervalEngineCore (geen kopie, geen mock van de engine).
 *
 * Draai: node core/fErgContinuousProtocolIdentity.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const E = require(path.join(__dirname, 'ergProtocolIdentity.js'));
const IE = require(path.join(__dirname, 'intervalEngine.js'));

let pass = 0, fail = 0; const msgs = [];
function ok(c, l) { if (c) pass++; else { fail++; msgs.push('MISLUKT: ' + l); } }
function eq(a, b, l) { ok(JSON.stringify(a) === JSON.stringify(b), l + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')'); }

function build(sport, type, value) { return IE.normalizePrescription(E.continuousErgPrescription(sport, type, value)); }

// ── 1: canoniek vocabulaire is IDENTIEK aan interval_prescription.v1 ──
eq(E.PROTOCOL_TYPES, IE.TERMINATION_TYPES.slice().sort().reverse().length ? ['manual', 'distance', 'time'] : null, 'PROTOCOL_TYPES = manual|distance|time');
IE.TERMINATION_TYPES.forEach(function (t) {
  ok(E.PROTOCOL_TYPES.indexOf(t) !== -1, 'canoniek terminatietype "' + t + '" bestaat ook als protocoltype — GEEN tweede vocabulaire');
});
ok(E.PROTOCOL_TYPES.length === IE.TERMINATION_TYPES.length, 'exact evenveel protocoltypes als terminatietypes (geen eigen uitbreiding)');
const src = fs.readFileSync(path.join(__dirname, 'ergProtocolIdentity.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
ok(!/fixed_distance|fixed_duration|'free'/.test(src), 'geen parallel fixed_distance/fixed_duration/free-vocabulaire in de code');

// ── 2: de drie Erg-sporten, drie protocollen ──
['rowing', 'bikeerg', 'skierg'].forEach(function (sport) {
  const vrij = build(sport, 'manual', null);
  ok(vrij.geldig, sport + ' Vrij: geldige prescriptie');
  eq(E.protocolProjectionFromPrescription(vrij), { protocol_type: 'manual', protocol_value: null }, sport + ' Vrij -> manual, geen doelwaarde');
  const afst = build(sport, 'distance', 2000);
  ok(afst.geldig, sport + ' Afstand: geldige prescriptie');
  eq(E.protocolProjectionFromPrescription(afst), { protocol_type: 'distance', protocol_value: 2000 }, sport + ' Afstand 2000m -> distance/2000');
  const tijd = build(sport, 'time', 1800);
  ok(tijd.geldig, sport + ' Tijd: geldige prescriptie');
  eq(E.protocolProjectionFromPrescription(tijd), { protocol_type: 'time', protocol_value: 1800 }, sport + ' Tijd 1800s -> time/1800');
  eq(afst.sport, sport, sport + ': sportidentiteit blijft behouden in de prescriptie');
});

// ── 3: BIKEERG WORDT NOOIT ROWING ──
eq(build('bikeerg', 'distance', 2000).sport, 'bikeerg', 'BikeErg-prescriptie houdt sport bikeerg');
ok(build('bikeerg', 'distance', 2000).sport !== 'rowing', 'BikeErg wordt NOOIT rowing');
ok(E.ERG_SPORTS.indexOf('bikeerg') !== -1 && E.ERG_SPORTS.indexOf('rowing') !== -1 && 'bikeerg' !== 'rowing', 'bikeerg en rowing zijn gescheiden canonieke sporten');

// ── 4: ACTUAL KAN PER CONSTRUCTIE GEEN INTENTIE WORDEN ──
// protocolProjectionFromPrescription heeft exact één parameter: de prescriptie.
eq(E.protocolProjectionFromPrescription.length, 1, 'protocolProjectionFromPrescription accepteert UITSLUITEND een prescriptie — er is geen parameter waarlangs een actual binnen kan komen');
ok(!/actual|gemeten|distance_meters|duration_seconds|\.distance\b|\.duration_s\b/.test(src), 'projectiecode leest nergens een actual-veld');
// Een vrije sessie die toevallig op een rond getal uitkomt blijft manual.
{
  const vrij = build('rowing', 'manual', null);
  eq(E.protocolProjectionFromPrescription(vrij), { protocol_type: 'manual', protocol_value: null }, 'Vrij blijft manual — een later gemeten 2000 m of 30:00 kan daar niets aan veranderen (de functie ziet actuals niet eens)');
}

// ── 5: GESTRUCTUREERDE B3-INTERVALLEN LEVEREN GEEN CONTINU PROTOCOL ──
{
  const b3 = IE.normalizePrescription({
    sport: 'rowing',
    blocks: [{ repeat: 8, of: [{ type: 'work', termination: { type: 'distance', meters: 500 } }, { type: 'recovery', termination: { type: 'time', seconds: 60 } }] }]
  });
  ok(b3.geldig, 'B3 8x500m is een geldige gestructureerde prescriptie (ongewijzigd)');
  ok(!E.isContinuousPrescription(b3), 'B3 8x500m is NIET continu');
  eq(E.protocolProjectionFromPrescription(b3), null, 'B3 gestructureerd -> GEEN protocolprojectie (valt buiten deze module)');
  const metWarmup = IE.normalizePrescription({
    sport: 'rowing',
    blocks: [{ type: 'warmup', termination: { type: 'time', seconds: 300 } }, { repeat: 1, of: [{ type: 'work', termination: { type: 'distance', meters: 2000 } }] }]
  });
  ok(!E.isContinuousPrescription(metWarmup), 'work-blok MET warm-up is niet "continu" in deze enge V1-zin -> geen projectie');
  eq(E.protocolProjectionFromPrescription(metWarmup), null, 'meer dan één block -> geen projectie (fail closed)');
}

// ── 6: FAIL CLOSED ──
const ongeldig = [
  [['running', 'distance', 2000], 'niet-Erg sport (running)'],
  [['cycling', 'time', 1800], 'niet-Erg sport (cycling)'],
  [['swimming', 'manual', null], 'niet-Erg sport (swimming)'],
  [[null, 'distance', 2000], 'sport null'],
  [['rowing', 'onbekend', 2000], 'onbekend protocoltype'],
  [['rowing', 'fixed_distance', 2000], 'parallel vocabulaire wordt geweigerd'],
  [['rowing', 'distance', null], 'distance zonder waarde'],
  [['rowing', 'distance', 0], 'distance 0'],
  [['rowing', 'distance', -100], 'distance negatief'],
  [['rowing', 'distance', NaN], 'distance NaN'],
  [['rowing', 'distance', Infinity], 'distance Infinity'],
  [['rowing', 'time', null], 'time zonder waarde'],
  [['rowing', 'time', 0], 'time 0'],
  [['rowing', 'time', -60], 'time negatief']
];
ongeldig.forEach(function (c) { eq(E.continuousErgPrescription.apply(null, c[0]), null, 'fail closed: ' + c[1]); });
eq(E.protocolProjectionFromPrescription(null), null, 'projectie van null -> null');
eq(E.protocolProjectionFromPrescription({ geldig: false }), null, 'projectie van ongeldige prescriptie -> null');
eq(E.protocolProjectionFromPrescription({}), null, 'projectie van leeg object -> null');

// ── 7: INTENTIE OVERLEEFT EEN ONVOLLEDIGE UITVOERING ──
// De projectie hangt uitsluitend aan de prescriptie; een afgebroken poging
// verandert de intentie niet (het resultaat wordt elders als actual bewaard).
{
  const doel = build('rowing', 'distance', 2000);
  const proj = E.protocolProjectionFromPrescription(doel);
  eq(proj, { protocol_type: 'distance', protocol_value: 2000 }, 'afgebroken 2000m: protocol blijft distance/2000 (actual 1800 raakt de intentie niet)');
  const doelT = build('bikeerg', 'time', 1800);
  eq(E.protocolProjectionFromPrescription(doelT), { protocol_type: 'time', protocol_value: 1800 }, 'na 20 min gestopt: protocol blijft time/1800');
}

// ── 8: PROTOCOL ≠ INTENSITEITSDOEL ──
{
  // Een intensiteitsdoel (pace/power/RPE) mag NOOIT de terminatie bepalen.
  const metTarget = IE.normalizePrescription({
    sport: 'rowing',
    blocks: [{ repeat: 1, of: [{ type: 'work', termination: { type: 'distance', meters: 2000 }, target: { pace: '1:50/500m', power: 250, rpe: 8 } }] }]
  });
  eq(E.protocolProjectionFromPrescription(metTarget), { protocol_type: 'distance', protocol_value: 2000 }, 'intensiteitsdoel aanwezig -> protocol blijft uitsluitend uit termination (distance/2000)');
  const alleenTarget = IE.normalizePrescription({
    sport: 'rowing',
    blocks: [{ repeat: 1, of: [{ type: 'work', termination: { type: 'manual' }, target: { power: 250 } }] }]
  });
  eq(E.protocolProjectionFromPrescription(alleenTarget), { protocol_type: 'manual', protocol_value: null }, 'alleen een power-target -> protocol blijft manual; een target wordt NOOIT een terminatie');
  ok(!/target/.test(src.replace(/PROTOCOL_LABEL_NL|protocolLabelNl/g, '')), 'projectiecode leest nergens het target-veld');
}

// ── 9: geen simultane afstand+tijd-terminatie in V1 ──
{
  const raw = E.continuousErgPrescription('rowing', 'distance', 2000);
  const t = raw.blocks[0].of[0].termination;
  ok(t.type === 'distance' && t.meters === 2000 && t.seconds === undefined, 'distance-terminatie zet uitsluitend meters, nooit ook seconds');
  const rawT = E.continuousErgPrescription('rowing', 'time', 1800);
  const tt = rawT.blocks[0].of[0].termination;
  ok(tt.type === 'time' && tt.seconds === 1800 && tt.meters === undefined, 'time-terminatie zet uitsluitend seconds, nooit ook meters');
}

// ── 10: afronding/normalisatie deterministisch, geen fabricage ──
eq(E.protocolProjectionFromPrescription(build('rowing', 'distance', 1999.6)), { protocol_type: 'distance', protocol_value: 2000 }, 'niet-integer meters wordt deterministisch afgerond');
eq(E.protocolProjectionFromPrescription(build('rowing', 'time', 1800.4)), { protocol_type: 'time', protocol_value: 1800 }, 'niet-integer seconden wordt deterministisch afgerond');

// ── 11: atleet-labels zijn presentatie, nooit canonieke waarde ──
eq(E.protocolLabelNl('manual', null), 'Vrij', 'label manual -> Vrij');
eq(E.protocolLabelNl('distance', 2000), '2000 m', 'label distance -> meters');
eq(E.protocolLabelNl('time', 1800), '30 min', 'label time (heel aantal minuten) -> min');
eq(E.protocolLabelNl('time', 1830), '30:30', 'label time (met seconden) -> mm:ss');
eq(E.protocolLabelNl('distance', null), '', 'label zonder waarde -> leeg (geen misleidend doel tonen)');
eq(E.PROTOCOL_LABEL_NL.manual, 'Vrij', 'NL-label manual');
eq(E.PROTOCOL_LABEL_NL.distance, 'Afstand', 'NL-label distance');
eq(E.PROTOCOL_LABEL_NL.time, 'Tijd', 'NL-label time');

// ── 12: architectuurgrenzen ──
ok(!/PersonalBest|personalBest|trendBy|plateau|performance_result/i.test(src), 'geen PB-/trend-/plateau-/performance-logica in deze module (Performance Intelligence blijft buiten scope)');
ok(!/DecisionCore|REDUCE_INTENSITY|readiness/i.test(src), 'geen Decision-/readiness-semantiek');
ok(!/erg_protocol\.v1/.test(src), 'geen nieuw erg_protocol.v1-contract geïntroduceerd — bestaande terminatiesemantiek hergebruikt');
// Geen mutatie van invoer.
{
  const raw = E.continuousErgPrescription('rowing', 'distance', 2000);
  const kopie = JSON.parse(JSON.stringify(raw));
  IE.normalizePrescription(raw);
  E.protocolProjectionFromPrescription(IE.normalizePrescription(raw));
  eq(raw, kopie, 'invoerprescriptie wordt niet gemuteerd');
}

// ── 13: migratie is additief/nullable en dwingt het canonieke vocabulaire af ──
{
  const mig = fs.readFileSync(path.join(ROOT, 'migratie_v566.sql'), 'utf8');
  ok(/ADD COLUMN IF NOT EXISTS protocol_type text NULL/.test(mig), 'migratie: protocol_type additief + nullable');
  ok(/ADD COLUMN IF NOT EXISTS protocol_value integer NULL/.test(mig), 'migratie: protocol_value additief + nullable');
  ok(/IN \('manual', 'distance', 'time'\)/.test(mig), 'migratie: CHECK dwingt het canonieke vocabulaire af');
  ok(!/UPDATE public\.sessions SET protocol/.test(mig), 'migratie: GEEN backfill van historische rijen (intentie wordt nooit gegokt)');
  ok(!/DROP COLUMN|ALTER COLUMN .* TYPE|NOT NULL/.test(mig.replace(/IS NOT NULL/g, '')), 'migratie: geen destructieve wijziging');
  ok(!/CREATE POLICY|ALTER POLICY|DISABLE ROW LEVEL/i.test(mig), 'migratie: wijzigt geen RLS-policy (kolommen erven de bestaande owner-policies op sessions)');
  ok(/QUERY-PROJECTIE/.test(mig) && /GEEN zelfstandige bron van waarheid/.test(mig), 'migratie documenteert expliciet dat de kolommen een projectie zijn, geen bron van waarheid');
}


// ── 14: RUNTIME-WIRING (index.html) — bewijst dat dit geen dormant module is ──
{
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  ok(html.includes('<script src="core/ergProtocolIdentity.js"></script>'), 'wiring: module is als script geladen');
  ok(/function tkErgProtocolSection\(/.test(html), 'wiring: pre-executie protocolsectie bestaat');
  ok(/function tkErgStartProtocol\(/.test(html), 'wiring: expliciete vastleg-/startstap bestaat (intentie vóór actual)');
  ok(html.includes('tkErgProtocolSection(exId,cardioType)+'), 'wiring: de protocolsectie wordt daadwerkelijk in de cardiokaart gerenderd');
  // Prescriptie-opbouw uitsluitend via de pure kern, niet gedupliceerd in de UI.
  ok(html.includes('ErgProtocolIdentity.continuousErgPrescription(cardioType,st.type,waarde)'), 'wiring: prescriptie uitsluitend via de pure kern');
  ok(!/blocks:\s*\[\{\s*repeat:\s*1/.test(html), 'wiring: GEEN gedupliceerde continue-prescriptie-opbouw in index.html');
  // Ad-hoc instance: beide saved-workout-ID's null -> geen nep-opgeslagen workout.
  ok(/createTrainingInstance\(\{vasteTrainingId:null,customTrainingId:null,snapshot\}\)/.test(html), 'wiring: ad-hoc instance met BEIDE saved-workout-ID\'s null (geen nep-opgeslagen workout)');
  ok(/snapshotFromCustomTraining\(\{id:null,/.test(html), 'wiring: snapshot zonder definition_id (lekt niet naar Mijn trainingen)');
  // De intentie wordt vastgelegd VOORDAT actuals bestaan: de instance wordt in de
  // start-stap aangemaakt, niet in de sessie-schrijfweg.
  const startFn = (html.match(/async function tkErgStartProtocol[\s\S]*?\n\}/) || [''])[0];
  ok(startFn.includes('createTrainingInstance'), 'wiring: instance wordt in de START-stap aangemaakt (vóór actual-invoer)');
  ok(!/l\.cardio|cardioDataToRow|\.dist\b/.test(startFn), 'wiring: de start-stap leest GEEN enkel cardio-formulier/actual-veld');
  // Projectie komt uit de prescriptie, nooit uit het formulier.
  const projFn = (html.match(/function tkErgProtocolProjectionFor[\s\S]*?\n\}/) || [''])[0];
  ok(projFn.includes('protocolProjectionFromPrescription'), 'wiring: projectie via de pure kern');
  ok(!/cardioDataToRow|l\.cardio|getCardioVal|distance|duration_s/.test(projFn), 'wiring: projectiefunctie leest GEEN actual-bron');
  // Sessie-schrijfweg gebruikt de projectie, niet de actuals.
  ok(html.includes('const _ergProj=(typeof tkErgProtocolProjectionFor===\'function\')?tkErgProtocolProjectionFor(ex.id):null;'), 'wiring: sessie-schrijfweg haalt de projectie op');
  ok(html.includes('_protoCols=_ergProj?{protocol_type:_ergProj.protocol_type,protocol_value:_ergProj.protocol_value}:{}'), 'wiring: protocolkolommen komen uit de projectie; zonder projectie worden ze NIET geschreven (blijft NULL = onbekend)');
  ok(!/protocol_type:\s*(cRow|l\.cardio|_duurS)/.test(html), 'wiring: protocol_type wordt NOOIT uit een actual-waarde gezet');
  ok(!/protocol_value:\s*(cRow|l\.cardio|_duurS)/.test(html), 'wiring: protocol_value wordt NOOIT uit een actual-waarde gezet');
  // Reeds voorgeschreven (opgeslagen/programma) Erg: geen dubbele keuze, geen tweede instance.
  ok(/if\(_tkErgPending&&_tkErgPending\.exId===exId\)return '';/.test(html), 'wiring: bij een reeds voorgeschreven protocol wordt de losse selector NIET getoond (geen dubbele invoer)');
  ok(projFn.includes('_tkErgPending'), 'wiring: voorgeschreven pad levert zijn projectie uit het bestaande snapshot (geen tweede ad-hoc instance)');
  // Vrij blijft de kortste route: geen doelveld, geen startknop.
  const secFn = (html.match(/function tkErgProtocolSection[\s\S]*?\n\}/) || [''])[0];
  ok(/st\.type==='distance'\)doel=/.test(secFn) && /st\.type==='time'\)doel=/.test(secFn), 'wiring: doelveld verschijnt alleen bij Afstand/Tijd');
  ok(/st\.type!=='manual'\)\?`<button/.test(secFn), 'wiring: startknop verschijnt NIET bij Vrij — Vrij blijft de kortste route');
  ok(secFn.includes("tkIsErgCardioType(cardioType)"), 'wiring: selector verschijnt uitsluitend bij RowErg/BikeErg/SkiErg');
  // Geen nieuw scherm/navigatiebestemming.
  ok(!/openModal\('m-ergp|showScreen\('erg/.test(html), 'wiring: geen nieuw scherm of modal-doolhof voor de protocolkeuze');
  // Eenmaal vastgelegd kan het protocol niet meer gewijzigd worden.
  ok(/if\(st\.instanceId\)return;/.test(html), 'wiring: na vastleggen is het protocol onwijzigbaar (intentie blijft immutable)');
}

if (msgs.length) console.log(msgs.join('\n'));
console.log('fErgContinuousProtocolIdentity: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail ? 1 : 0);
