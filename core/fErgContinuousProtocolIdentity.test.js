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
const CardioCoreReal = require(path.join(__dirname, 'cardio.js'));

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

// ── 16: BUILDER ↔ LOSSE EQUIVALENTIE ──
// De opgeslagen-workout-Builder (ivRaw) gebruikt AL het canonieke terminatiemodel
// (workTerm 'distance'|'time'). Bij repeats=1 zonder warmup/cooldown/recovery is zijn
// uitkomst per definitie de continue vorm. Bewijs dat beide paden voor hetzelfde
// protocol IDENTIEKE protocolidentiteit opleveren — geen shadow-model in de Builder.
{
  function ivRawSim(sport, workTerm, workM, workMin){
    var work = { type: 'work', termination: workTerm === 'distance'
      ? { type: 'distance', meters: Math.max(50, Math.round(workM || 0)) }
      : { type: 'time', seconds: Math.max(10, Math.round((workMin || 0) * 60)) } };
    return { version: 'interval_prescription.v1', sport: sport, blocks: [{ repeat: 1, of: [work] }] };
  }
  [['rowing','distance',2000,0],['rowing','time',0,30],['bikeerg','distance',10000,0],
   ['bikeerg','time',0,30],['skierg','distance',1000,0],['skierg','time',0,20]].forEach(function(c){
    var sport=c[0], term=c[1], m=c[2], min=c[3];
    var b = IE.normalizePrescription(ivRawSim(sport, term, m, min));
    var l = IE.normalizePrescription(E.continuousErgPrescription(sport, term, term === 'distance' ? m : min * 60));
    var pb = E.protocolProjectionFromPrescription(b), pl = E.protocolProjectionFromPrescription(l);
    eq(pb, pl, 'EQUIVALENTIE ' + sport + '/' + term + ': Builder en losse pad leveren identieke protocolidentiteit');
    ok(pb !== null, 'EQUIVALENTIE ' + sport + '/' + term + ': Builder-prescriptie levert een geldige protocolidentiteit');
    eq(b.sport, sport, 'EQUIVALENTIE ' + sport + ': machine-identiteit behouden in de Builder-prescriptie');
  });
  // De Builder bouwt zijn terminatie met exact hetzelfde vocabulaire (geen shadow-model).
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const ivRawSrc = (html.match(/function ivRaw\(\)\{[\s\S]*?\n  \}/) || [''])[0];
  ok(/termination:_iv\.workTerm==='distance'\?\{type:'distance'/.test(ivRawSrc), 'Builder gebruikt canonieke distance-terminatie');
  ok(/\{type:'time',seconds:/.test(ivRawSrc), 'Builder gebruikt canonieke time-terminatie');
  ok(!/fixed_distance|fixed_duration|protocol_type/.test(ivRawSrc), 'Builder introduceert GEEN parallel protocolvocabulaire');
  // Gestructureerde Builder-uitkomst (repeats>1 of met recovery) blijft GEEN continu protocol.
  {
    const gestructureerd = IE.normalizePrescription({ version:'interval_prescription.v1', sport:'rowing',
      blocks:[{ repeat:8, of:[{type:'work',termination:{type:'distance',meters:500}},{type:'recovery',termination:{type:'time',seconds:60}}] }] });
    eq(E.protocolProjectionFromPrescription(gestructureerd), null, 'B3-ISOLATIE: gestructureerde Builder-training levert GEEN continu protocol');
  }
}

// ── 17: PREVIEW — continu Erg-protocol zichtbaar, fail-closed ──
// De ECHTE Preview-helper wordt uit index.html geëxtraheerd en in een sandbox uitgevoerd,
// zodat de runtime-wiring wordt getest en niet alleen de pure kern.
{
  const vm = require('vm');
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const src = (html.match(/function tkIvContinuousProtocolText\(norm\)\{[\s\S]*?\n\}/) || [''])[0];
  ok(src !== '', 'PREVIEW: tkIvContinuousProtocolText bestaat in index.html');
  const ctx = { ErgProtocolIdentity: E };
  vm.createContext(ctx); vm.runInContext(src, ctx);
  const tekst = ctx.tkIvContinuousProtocolText;
  function norm(sport, type, val){ return IE.normalizePrescription(E.continuousErgPrescription(sport, type, val)); }

  eq(tekst(norm('rowing','distance',2000)), ' \u00b7 doel 2000 m', 'PREVIEW RowErg afstand 2000 -> doel zichtbaar');
  eq(tekst(norm('rowing','time',1800)), ' \u00b7 doel 30 min', 'PREVIEW RowErg tijd 1800s -> doel zichtbaar');
  eq(tekst(norm('bikeerg','distance',10000)), ' \u00b7 doel 10000 m', 'PREVIEW BikeErg afstand -> doel zichtbaar');
  eq(tekst(norm('bikeerg','time',1800)), ' \u00b7 doel 30 min', 'PREVIEW BikeErg tijd -> doel zichtbaar');
  eq(tekst(norm('skierg','distance',1000)), ' \u00b7 doel 1000 m', 'PREVIEW SkiErg afstand -> doel zichtbaar');
  eq(tekst(norm('skierg','time',1200)), ' \u00b7 doel 20 min', 'PREVIEW SkiErg tijd -> doel zichtbaar');

  // Fail-closed gevallen: nooit een verzonnen doel.
  eq(tekst(norm('rowing','manual',null)), '', 'PREVIEW manual/Vrij -> GEEN verzonnen doel');
  const b3 = IE.normalizePrescription({ version:'interval_prescription.v1', sport:'rowing',
    blocks:[{ repeat:8, of:[{type:'work',termination:{type:'distance',meters:500}},{type:'recovery',termination:{type:'time',seconds:60}}] }] });
  eq(tekst(b3), '', 'PREVIEW gestructureerd 8x500m wordt NOOIT samengevouwen tot een continu 4000m-doel');
  eq(tekst(null), '', 'PREVIEW null-prescriptie -> leeg (fail closed)');
  eq(tekst({}), '', 'PREVIEW onbekende prescriptie -> leeg (fail closed)');
  eq(tekst(IE.normalizePrescription({ version:'interval_prescription.v1', sport:'running',
    blocks:[{repeat:1,of:[{type:'work',termination:{type:'distance',meters:5000}}]}] })), '', 'PREVIEW niet-Erg sport (running) -> geen Erg-protocolregel');

  // Intensiteit wordt NOOIT protocol: alleen een power/RPE-target, terminatie manual.
  const alleenIntensiteit = IE.normalizePrescription({ version:'interval_prescription.v1', sport:'rowing',
    blocks:[{repeat:1,of:[{type:'work',termination:{type:'manual'},target:{power:250,rpe:8,pace:'1:50/500m'}}]}] });
  eq(tekst(alleenIntensiteit), '', 'PREVIEW intensiteitsdoel (250 W / RPE 8 / pace) wordt NOOIT een protocoldoel');
  // Met zowel terminatie als intensiteit: uitsluitend de terminatie bepaalt het protocol.
  const beide = IE.normalizePrescription({ version:'interval_prescription.v1', sport:'rowing',
    blocks:[{repeat:1,of:[{type:'work',termination:{type:'distance',meters:2000},target:{power:250}}]}] });
  eq(tekst(beide), ' \u00b7 doel 2000 m', 'PREVIEW met intensiteitsdoel erbij -> protocol komt uitsluitend uit de terminatie');

  // Machine-identiteit in Preview. De protocoltekst zelf is bewust machine-agnostisch
  // ("doel 2000 m") omdat de machine al apart als chip wordt getoond; de identiteit moet
  // daarom op DIE renderplek gepind worden, plus op de sport-guard in de helper.
  eq(norm('bikeerg','distance',2000).sport, 'bikeerg', 'PREVIEW BikeErg blijft bikeerg in de prescriptie');
  ok(/tpv2-chip">\$\{TK_IV_SPORT_LABEL\[norm\.sport\]/.test(html), 'PREVIEW: machine-chip komt uit norm.sport via TK_IV_SPORT_LABEL — BikeErg toont als BikeErg, niet als RowErg');
  ok(/TK_IV_SPORT_LABEL=\{[^}]*rowing:'RowErg',bikeerg:'BikeErg',skierg:'SkiErg'\}/.test(html), 'PREVIEW: de drie Erg-machines hebben elk hun eigen, gescheiden label');
  ok(/ErgProtocolIdentity\.ERG_SPORTS\.indexOf\(norm\.sport\)===-1\)return ''/.test(src), 'PREVIEW: sport-guard leest norm.sport rechtstreeks');
  // HET ECHTE INVARIANT: de helper krijgt de prescriptie read-only binnen en mag de machine
  // NOOIT hermappen (bv. bikeerg -> rowing) vóór of ná de guard. Elke toewijzing aan `norm`
  // binnen de helper is per definitie zo'n hermapping en is daarom verboden.
  ok(!/\bnorm\s*=[^=]/.test(src.replace(/function tkIvContinuousProtocolText\(norm\)/, '')), 'PREVIEW: de helper wijst NOOIT aan `norm` toe — de machine kan niet hermapt worden (BikeErg kan geen RowErg worden)');
  ok(!/sport\s*:\s*'(rowing|bikeerg|skierg)'/.test(src), 'PREVIEW: de helper zet nooit zelf een sportwaarde');

  // Architectuur: Preview leest GEEN actual en dupliceert de parser niet.
  ok(src.includes('protocolProjectionFromPrescription'), 'PREVIEW gebruikt de canonieke helper');
  ok(!/distance_meters|duration_seconds|cRow|l\.cardio|getCardioVal|\.watt\b|split/.test(src), 'PREVIEW leest GEEN actual-bron (afstand/duur/split/watt/formulier)');
  ok(!/if\s*\(\s*[^)]*type\s*===\s*'distance'\s*\)\s*return\s*[^;]*meters/.test(src), 'PREVIEW bevat GEEN tweede if-distance/if-time-parser');
  // Runtime-wiring: de helper wordt daadwerkelijk in de Preview-hero gebruikt.
  ok(/tpv2-hero-sub[\s\S]{0,400}\$\{tkIvContinuousProtocolText\(norm\)\}/.test(html), 'PREVIEW: helper is daadwerkelijk in de Preview-hero gerenderd (runtime-wiring, geen dode functie)');
  ok(/renderTPInterval/.test(html), 'PREVIEW: bestaande renderTPInterval-renderer hergebruikt, geen nieuw Preview-scherm');
}

// ── 15: DUBBEL-SUBMIT CONCURRENCY — echt gedrag, niet tekstaanwezigheid ──
// De functie wordt uit index.html geëxtraheerd en in een sandbox met nagebouwde
// afhankelijkheden uitgevoerd, zodat de ECHTE productiecode wordt getest.
{
  const vm = require('vm');
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  function fnSrc(name){
    const i = html.indexOf('async function ' + name + '(');
    const j = html.indexOf('function ' + name + '(');
    const start = i !== -1 ? i : j;
    let d = 0, b = html.indexOf('{', start);
    for (let k = b; k < html.length; k++){
      if (html[k] === '{') d++;
      else if (html[k] === '}'){ d--; if (d === 0) return html.slice(start, k + 1); }
    }
    return null;
  }
  function maakCtx(createImpl){
    const calls = { n: 0 };
    const ctx = {
      _ergProtocol: { roeien: { type: 'distance', value: null, instanceId: null } },
      document: { getElementById: () => ({ value: '2000' }) },
      CardioCore: CardioCoreReal,
      ErgProtocolIdentity: E,
      IntervalEngineCore: IE,
      TK_IV_SPORT_LABEL: { rowing: 'RowErg' },
      snapshotFromCustomTraining: (def) => ({ source: 'custom_training', definition_id: def.id, intervalPrescription: def.intervalPrescription }),
      createTrainingInstance: function (arg) { calls.n++; return createImpl(arg, calls.n); },
      toast: () => {},
      tkErgRerenderProtocol: () => {},
      calls: calls
    };
    vm.createContext(ctx);
    vm.runInContext(fnSrc('tkErgStartProtocol'), ctx);
    return ctx;
  }
  // A. Twee starts vóór de eerste resolve -> EXACT ÉÉN createTrainingInstance-aanroep.
  {
    let los; const wacht = new Promise(r => { los = r; });
    const ctx = maakCtx(() => wacht);
    const p1 = ctx.tkErgStartProtocol('roeien', 'rowing');
    const p2 = ctx.tkErgStartProtocol('roeien', 'rowing'); // tweede klik vóór resolve
    eq(ctx.calls.n, 1, 'DUBBEL-SUBMIT: twee starts vóór de eerste resolve -> createTrainingInstance EXACT ÉÉNMAAL aangeroepen');
    los('inst-1');
    return Promise.all([p1, p2]).then(function () {
      eq(ctx._ergProtocol.roeien.instanceId, 'inst-1', 'DUBBEL-SUBMIT: exact één instanceId vastgelegd');
      eq(ctx._ergProtocol.roeien.busy, false, 'DUBBEL-SUBMIT: busy weer vrijgegeven na succes');
      ok(!!ctx._ergProtocol.roeien.prescription, 'DUBBEL-SUBMIT: immutable prescriptie bewaard');
      eq(ctx.calls.n, 1, 'DUBBEL-SUBMIT: ook na resolve geen tweede aanroep');
      return vervolg();
    });
  }
  function vervolg(){
    // B. Mislukte aanmaak -> busy vrijgegeven -> retry maakt precies één nieuwe instance.
    let eerste = true;
    const ctx = maakCtx(() => { if (eerste){ eerste = false; return Promise.resolve(null); } return Promise.resolve('inst-2'); });
    return ctx.tkErgStartProtocol('roeien', 'rowing').then(function(){
      eq(ctx._ergProtocol.roeien.instanceId, null, 'FOUTPAD: mislukte aanmaak zet GEEN instanceId (doet niet alsof de instance bestaat)');
      eq(ctx._ergProtocol.roeien.busy, false, 'FOUTPAD: busy vrijgegeven na mislukking -> opnieuw proberen mogelijk');
      return ctx.tkErgStartProtocol('roeien', 'rowing');
    }).then(function(){
      eq(ctx._ergProtocol.roeien.instanceId, 'inst-2', 'FOUTPAD: retry legt precies één nieuwe instance vast');
      eq(ctx.calls.n, 2, 'FOUTPAD: exact twee aanroepen totaal (één mislukt, één geslaagd) — geen extra writes');
      return derde();
    });
  }
  function derde(){
    // C. Exception in createTrainingInstance -> busy mag NIET blijven hangen (finally).
    const ctx = maakCtx(() => { throw new Error('netwerk'); });
    return Promise.resolve(ctx.tkErgStartProtocol('roeien', 'rowing')).then(function(){
      eq(ctx._ergProtocol.roeien.busy, false, 'EXCEPTIE: busy wordt via finally vrijgegeven, blijft nooit hangen');
      eq(ctx._ergProtocol.roeien.instanceId, null, 'EXCEPTIE: geen instanceId gezet');
      return klaar();
    });
  }
  function klaar(){
    if (msgs.length) console.log(msgs.join('\n'));
    console.log('fErgContinuousProtocolIdentity: ' + pass + ' geslaagd, ' + fail + ' mislukt');
    process.exit(fail ? 1 : 0);
  }
}
