/* Sprint 10 — Data Quality -> Interpretatie -> Coach Context.
 *
 * A  Contract: grenzen komen uit het bestaande brondata-contract, niet uit deze laag
 * B  qualifySeries: geldige dagen, ontbrekende waarden, niet-numeriek, buiten contract
 * C  Uitschieters: robuust, conservatief, pas vanaf voldoende metingen
 * D  Dubbele metingen per dag
 * E  pairQuality: correlatie uitsluitend op valide vergelijkbare dagen
 * F  Decision Engine: uitsluitingstransparantie en sterkte-uitleg
 * G  Trainingsbetekenis: alleen bij aanwezige context, nooit een gereedheidsoordeel
 * H  Geen causale claims in welke gegenereerde tekst dan ook
 * I  Ketenvolgorde en renderpaden in index.html (RAW -> DQ -> CALC -> DECISION -> UI)
 * J  Coach-context: leest berekende waarden, rekent zelf niets
 * K  Regressie: Sprint 9 en eerder blijven intact
 *
 * Draai: node core/fDataQuality.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const C = require('./calculation.js');
const D = require('./decision.js');
const DC = require('./deviceIntegration.js');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

let pass = 0, fail = 0;
function ok(c, m){ if (c) pass++; else { fail++; console.log('  ✗ ' + m); } }
function eq(a, b, m){ ok(JSON.stringify(a) === JSON.stringify(b), m + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')'); }
const dagen = (n, start) => Array.from({ length: n }, (_, i) => {
  const d = new Date(Date.UTC(2026, 0, (start || 1) + i)); return d.toISOString().slice(0, 10); });
const S = (vals, start) => dagen(vals.length, start).map((d, i) => ({ date: d, value: vals[i], source: 'Fitbit' }));

console.log('\n[Sprint 10] Datakwaliteit · interpretatie · coach-context');

/* ── A. CONTRACT ─────────────────────────────────────────────────────────── */
console.log('\nA. Contract komt uit de bestaande brondata-definitie');
ok(DC.DQ_VERSION === 'dataquality.v1', 'versie is dataquality.v1');
eq(DC.DQ_STATUSES, ['valid','excluded','insufficient_data'], 'exact drie statussen');
const ghm = (DC.GOOGLE_HEALTH_MAP.metrics || []);
const mHrv = ghm.filter(m => m.key === 'hrv_ms')[0];
const mRhr = ghm.filter(m => m.key === 'resting_hr_bpm')[0];
const mSlp = ghm.filter(m => m.key === 'sleep_minutes')[0];
eq(DC.DQ_CONTRACT.hrv.min, mHrv.min, 'HRV-ondergrens = contract');
eq(DC.DQ_CONTRACT.hrv.max, mHrv.max, 'HRV-bovengrens = contract');
eq(DC.DQ_CONTRACT.rhr.min, mRhr.min, 'RHR-ondergrens = contract');
eq(DC.DQ_CONTRACT.rhr.max, mRhr.max, 'RHR-bovengrens = contract');
eq(DC.DQ_CONTRACT.sleep.max, mSlp.max / 60, 'slaapgrens omgerekend van minuten naar uren');
eq(DC.DQ_CONTRACT.weight, null, 'gewicht heeft geen brondata-contract (ingevoerde waarde)');
ok(DC.DQ_CONTRACT.hrv.bron === 'hrv_ms', 'contract noemt zijn herkomst');
const dqSrc = fs.readFileSync(path.join(__dirname, 'deviceIntegration.js'), 'utf8');
ok(!/\bmin:\s*40\b|\bmax:\s*100\b/.test(dqSrc.slice(dqSrc.indexOf('DATAKWALITEIT'))), 'geen eigen medische grenswaarden in de laag');
ok(dqSrc.indexOf('GEEN MEDISCH OORDEEL') > 0, 'laag legt expliciet vast dat hij geen medisch oordeel geeft');

/* ── B. qualifySeries ────────────────────────────────────────────────────── */
console.log('\nB. qualifySeries — geldig, ontbrekend, ongeldig');
const q1 = DC.qualifySeries(S([50,52,51,53]), { field: 'rhr' });
eq(q1.counts, { days:4, valid:4, excluded:0, insufficient_data:0 }, 'vier geldige dagen');
eq(q1.valid.length, 4, 'valid houdt dezelfde lengte als de invoer');
eq(q1.excluded, [], 'niets uitgesloten');
const q2 = DC.qualifySeries(S([50, null, 52, undefined, '']), { field: 'rhr' });
eq(q2.counts.valid, 2, 'null/undefined/lege string tellen niet als meting');
eq(q2.counts.insufficient_data, 3, 'ontbrekende waarden zijn insufficient_data');
eq(q2.points[1].status, 'insufficient_data', 'ontbrekende dag krijgt status insufficient_data');
eq(q2.points[1].reason, 'geen_meting', 'reden bij ontbrekende dag');
eq(q2.valid[1].value, null, 'ontbrekende dag blijft null, wordt nooit 0');
const q3 = DC.qualifySeries(S(['57', 58, 'onzin', NaN, Infinity]), { field: 'rhr' });
eq(q3.points[0].value, 57, 'numerieke string wordt getal (PostgREST levert numeric als string)');
eq(q3.points[2].status, 'excluded', 'tekstwaarde wordt uitgesloten');
eq(q3.points[2].reason, 'niet_numeriek', 'reden niet_numeriek');
eq(q3.points[3].status, 'excluded', 'NaN wordt uitgesloten');
eq(q3.points[4].status, 'excluded', 'Infinity wordt uitgesloten');
const q4 = DC.qualifySeries(S([57, 5, 200]), { field: 'rhr' });
eq(q4.points[1].reason, 'buiten_contract', 'onder de contractondergrens -> buiten_contract');
eq(q4.points[2].reason, 'buiten_contract', 'boven de contractbovengrens -> buiten_contract');
eq(q4.counts.valid, 1, 'alleen de waarde binnen het contract blijft over');
const q5 = DC.qualifySeries(S([7.5, 26, -1]), { field: 'sleep' });
eq(q5.counts.excluded, 2, 'slaap buiten 0-24 uur valt af');
eq(DC.qualifySeries([], { field: 'rhr' }).counts.valid, 0, 'lege reeks levert geen valide dagen');
eq(DC.qualifySeries(null, { field: 'rhr' }).counts.days, 0, 'null-invoer is veilig');
const invoer = S([57, 58]);
DC.qualifySeries(invoer, { field: 'rhr' });
eq(invoer[0].value, 57, 'de invoerreeks wordt niet gemuteerd');
eq(DC.qualifySeries(S([57,58,59]), { field: 'rhr' }).points[0].source, 'Fitbit', 'bron blijft behouden');

/* ── C. UITSCHIETERS ─────────────────────────────────────────────────────── */
console.log('\nC. Uitschieters — robuust en conservatief');
const rhrEcht = [57,58,56,57,58,57,55,56,57,58,59,57,58,56,57,58,57,56,58,57,60,57,58,54,57];
const metUitschieter = DC.qualifySeries(S(rhrEcht.concat([28])), { field: 'rhr' });
eq(metUitschieter.counts.excluded, 1, 'de rusthartslag van 28 wordt uitgesloten');
eq(metUitschieter.excluded[0].value, 28, 'de uitgesloten waarde is 28');
eq(metUitschieter.excluded[0].reason, 'extreme_uitschieter', 'reden extreme_uitschieter');
ok(metUitschieter.statistiek.toegepast === true, 'uitschietertoets is toegepast');
const zonderUitschieter = DC.qualifySeries(S(rhrEcht.concat([63])), { field: 'rhr' });
eq(zonderUitschieter.counts.excluded, 0, 'een hogere maar plausibele 63 bpm blijft staan');
const grens = DC.qualifySeries(S(rhrEcht.concat([61,62,64,65])), { field: 'rhr' });
eq(grens.counts.excluded, 0, 'normale fysiologische variatie sneuvelt niet');
const kort = DC.qualifySeries(S([57,58,57,28]), { field: 'rhr' });
eq(kort.counts.excluded, 0, 'onder de minimum-n wordt niet statistisch uitgesloten');
ok(DC.DQ_OUTLIER_MIN_N >= 20, 'minimum aantal metingen voor de uitschietertoets is minstens 20');
ok(DC.DQ_OUTLIER_Z >= 3.5, 'drempel is niet losser dan de gangbare conventie van 3,5');
ok(DC.DQ_OUTLIER_Z >= 10, 'drempel is bewust strenger dan de conventie');
ok(DC.DQ_OUTLIER_MIN_REL_DEV > 0, 'er geldt ook een minimale relatieve afwijking');
const identiek = DC.qualifySeries(S(Array(25).fill(57).concat([57])), { field: 'rhr' });
eq(identiek.counts.excluded, 0, 'reeks zonder spreiding sluit niets uit (geen deling door nul)');
const identiekPlus = DC.qualifySeries(S(Array(24).fill(57).concat([28])), { field: 'rhr' });
eq(identiekPlus.counts.excluded, 1, 'bij MAD=0 valt de terugval op de gemiddelde absolute afwijking terug');
const a1 = DC.qualifySeries(S(rhrEcht.concat([28])), { field: 'rhr' });
const a2 = DC.qualifySeries(S(rhrEcht.concat([28])), { field: 'rhr' });
eq(JSON.stringify(a1), JSON.stringify(a2), 'zelfde invoer geeft exact dezelfde uitkomst (deterministisch)');
const hrvBreed = DC.qualifySeries(S([18,21,24,27,30,33,36,20,22,25,28,31,34,19,23,26,29,32,35,21,24,27,30,33,36]), { field: 'hrv' });
eq(hrvBreed.counts.excluded, 0, 'natuurlijk variabele HRV-reeks verliest geen enkel punt');

/* ── D. DUBBELE METINGEN ─────────────────────────────────────────────────── */
console.log('\nD. Dubbele metingen per dag');
const rijen = [
  { date:'2026-08-09', rhr:57, note:null }, { date:'2026-08-09', rhr:57, note:null },
  { date:'2026-08-10', rhr:58, note:null }, { date:'2026-08-11', rhr:null, note:null }
];
eq(DC.duplicateDays(rijen, 'rhr'), ['2026-08-09'], 'dubbele dag wordt herkend');
eq(DC.duplicateDays(rijen, 'hrv'), [], 'veld zonder waarden levert geen dubbele dagen');
eq(DC.duplicateDays(null, 'rhr'), [], 'null-invoer is veilig');
const ser = DC.healthSeries([
  { date:'2026-08-09', rhr:57, note:null }, { date:'2026-08-09', rhr:99, note:'[src:fitbit]' }
], 'rhr', '2026-08-09', 1);
eq(ser.length, 1, 'healthSeries levert één punt per dag, ook bij dubbele rijen');
eq(ser[0].value, 99, 'de wearable-rij wint van de check-in — bestaande, ongewijzigde regel');

/* ── E. pairQuality ──────────────────────────────────────────────────────── */
console.log('\nE. pairQuality — correlatie uitsluitend op valide vergelijkbare dagen');
const dd = dagen(6);
const A = dd.map((d,i) => ({ date:d, value:[20,22,24,26,28,30][i] }));
const B = dd.map((d,i) => ({ date:d, value:[57,56,55,54,53,5][i] }));   // laatste buiten contract
const pq = DC.pairQuality(A, B, { field:'hrv' }, { field:'rhr' });
eq(pq.pairs.length, 5, 'de dag met een ongeldige waarde valt uit de koppeling');
eq(pq.excludedDays, 1, 'die dag wordt geteld als uitgesloten vergelijkbare dag');
eq(pq.comparableDays, 5, 'aantal vergelijkbare dagen is het aantal paren');
ok(pq.pairs.every(p => p.date !== dd[5]), 'de uitgesloten datum komt niet in de paren voor');
const B2 = dd.map((d,i) => ({ date:d, value:[57,56,55,54,53,null][i] }));
eq(DC.pairQuality(A, B2, { field:'hrv' }, { field:'rhr' }).excludedDays, 0,
   'een ontbrekende meting telt niet als uitsluiting — er viel niets uit te sluiten');
eq(DC.pairQuality(A, B2, { field:'hrv' }, { field:'rhr' }).pairs.length, 5, 'ontbrekende dag levert geen paar');
eq(DC.pairQuality([], [], { field:'hrv' }, { field:'rhr' }).pairs.length, 0, 'lege reeksen zijn veilig');
ok(pq.a && pq.b && pq.a.version === 'dataquality.v1', 'beide keuringen zijn opvraagbaar voor transparantie');
const spOud = C.spearman(DC.pairDaily(A, B));
const spNieuw = C.spearman(pq.pairs);
ok(spOud.n === 6 && spNieuw.n === 5, 'zonder keuring rekent Spearman de ongeldige dag wél mee');
ok(typeof C.spearman === 'function' && C.VERSIONS.correlation === 'correlation.v1',
   'de bestaande Spearman-implementatie is ongewijzigd de rekenbron');

/* ── F. DECISION ENGINE — transparantie en uitleg ────────────────────────── */
console.log('\nF. Decision Engine — uitsluiting en sterkte-uitleg');
const def = D.VERBAND_DEFINITIES.filter(x => x.id === 'hrv_rhr')[0];
const b0 = D.releaseVerband({ coefficient:-0.53, n:37, direction:'lower' }, def);
eq(b0.uitgesloten, 0, 'zonder kwaliteitsinformatie is het aantal uitsluitingen 0');
eq(b0.kwaliteitZin, null, 'geen uitsluitingszin als er niets is uitgesloten');
const b1 = D.releaseVerband({ coefficient:-0.53, n:37, direction:'lower' }, def, { excludedDays:1 });
eq(b1.uitgesloten, 1, 'aantal uitsluitingen komt door');
ok(/niet meegenomen/.test(b1.kwaliteitZin), 'er is een neutrale uitsluitingszin');
ok(!/fout|onjuist|verkeerd|corrupt/i.test(b1.kwaliteitZin), 'de zin noemt de meting nooit fout');
ok(!/!|waarschuwing|let op/i.test(b1.kwaliteitZin), 'de zin is niet alarmerend');
const b3 = D.releaseVerband({ coefficient:-0.53, n:37, direction:'lower' }, def, { excludedDays:3 });
ok(/3/.test(b3.kwaliteitZin), 'bij meerdere uitsluitingen staat het aantal erbij');
eq(D.releaseVerband({ coefficient:-0.53, n:37, direction:'lower' }, def, { excludedDays:-2 }).uitgesloten, 0,
   'een negatief aantal wordt genegeerd');
ok(b1.sterkteUitleg && b1.sterkteUitleg.length > 10, 'sterke samenhang krijgt een uitleg in gewone taal');
D.VERBAND_STERKTE.forEach(band => ok(!!band.uitleg, 'band ' + band.key + ' heeft een uitleg'));
const bZwak = D.releaseVerband({ coefficient:0.05, n:40, direction:'higher' }, def);
eq(bZwak.direction, 'none', 'bij verwaarloosbare samenhang wordt geen richting geclaimd');
ok(bZwak.sterkteUitleg && /te weinig patroon/i.test(bZwak.sterkteUitleg), 'uitleg past bij de verwaarloosbare band');
const bTeWeinig = D.releaseVerband({ coefficient:-0.9, n:10, direction:'lower' }, def, { excludedDays:2 });
eq(bTeWeinig.vrijgegeven, false, 'onder de drempel wordt niets vrijgegeven');
eq(bTeWeinig.reason, 'te_weinig_data', 'reden te_weinig_data blijft ongewijzigd');
eq(bTeWeinig.uitgesloten, 2, 'ook bij een niet-vrijgegeven verband is de uitsluiting zichtbaar');
eq(D.VERBAND_MIN_N, 30, 'de drempel van 30 dagen is ongewijzigd');

/* ── G. TRAININGSBETEKENIS ───────────────────────────────────────────────── */
console.log('\nG. Trainingsbetekenis — alleen bij aanwezige context');
ok(D.VERBAND_TRAINING_VERSIE === 'verbandtraining.v1', 'versie verbandtraining.v1');
const tGeen = D.verbandTrainingContext(bTeWeinig, { herstelScore:70, herstelBand:'gemiddeld' }, def);
eq(tGeen.beschikbaar, false, 'zonder vrijgegeven verband geen trainingsbetekenis');
eq(tGeen.reason, 'geen_verband', 'reden geen_verband');
eq(tGeen.zin, null, 'en dus ook geen zin');
const tRichtingloos = D.verbandTrainingContext(bZwak, { herstelScore:70, herstelBand:'gemiddeld' }, def);
eq(tRichtingloos.reason, 'geen_richting', 'zonder richting geen trainingsbetekenis');
const tGeenHerstel = D.verbandTrainingContext(b1, {}, def);
eq(tGeenHerstel.beschikbaar, false, 'zonder herstelstatus geen conclusie');
eq(tGeenHerstel.reason, 'geen_herstelstatus', 'reden geen_herstelstatus');
ok(/geen conclusie/.test(tGeenHerstel.zin), 'de zin zegt eerlijk dat er geen conclusie is');
ok(/check-in/.test(tGeenHerstel.actie), 'en wijst naar de bestaande check-in');
const tSlechteData = D.verbandTrainingContext(b1, { herstelScore:70, herstelBand:'hoog', dataKwaliteit:'sync_failed' }, def);
eq(tSlechteData.reason, 'datakwaliteit_onvoldoende', 'bij mislukte synchronisatie geen conclusie');
eq(D.verbandTrainingContext(b1, { herstelScore:70, herstelBand:'hoog', dataKwaliteit:'stale' }, def).beschikbaar, false,
   'verouderde gegevens leveren geen conclusie');
const tOk = D.verbandTrainingContext(b1, { herstelScore:71, herstelBand:'gemiddeld', herstelConfidence:'hoog', dataKwaliteit:'current' }, def);
eq(tOk.beschikbaar, true, 'met volledige context is er wel een betekenis');
ok(/71\/100/.test(tOk.zin), 'de herstelscore komt letterlijk uit de Calculation Engine');
ok(/gemiddeld/.test(tOk.zin), 'de band wordt genoemd');
ok(/herstelstatus/.test(tOk.actie), 'de actie verwijst naar de herstelstatus');
ok(/tegengestelde richting/.test(tOk.zin), 'de richting volgt de berekende coëfficiënt');
const bHoger = D.releaseVerband({ coefficient:0.6, n:40, direction:'higher' }, def, { excludedDays:0 });
ok(/dezelfde richting/.test(D.verbandTrainingContext(bHoger, { herstelScore:71, herstelBand:'hoog' }, def).zin),
   'positieve coëfficiënt levert "dezelfde richting"');
const tLaag = D.verbandTrainingContext(b1, { herstelScore:40, herstelBand:'laag', herstelConfidence:'laag' }, def);
ok(/indicatief/.test(tLaag.zin), 'lage betrouwbaarheid wordt benoemd');
eq(D.verbandTrainingContext(null, null, null).beschikbaar, false, 'null-invoer is veilig');
ok(D.verbandTrainingContext(b1, { herstelScore:71, herstelBand:'gemiddeld' }, null).zin.indexOf('deze twee metingen') >= 0,
   'zonder definitie een neutrale omschrijving in plaats van verzonnen namen');

/* ── H. GEEN CAUSALE OF GEREEDHEIDSCLAIMS ────────────────────────────────── */
console.log('\nH. Taal — geen causaliteit, geen gereedheidsoordeel');
const alleZinnen = [];
[-0.95,-0.6,-0.4,-0.2,-0.05,0,0.05,0.2,0.4,0.6,0.95].forEach(c => {
  D.VERBAND_DEFINITIES.forEach(dfn => {
    const bb = D.releaseVerband({ coefficient:c, n:45, direction:c>0?'higher':'lower' }, dfn, { excludedDays:2 });
    [bb.zin, bb.onderbouwing, bb.sterkteUitleg, bb.kwaliteitZin, bb.disclaimer].forEach(z => { if (z) alleZinnen.push(z); });
    [{ herstelScore:71, herstelBand:'gemiddeld' }, {}, { dataKwaliteit:'no_data' }, { herstelScore:20, herstelBand:'laag', herstelConfidence:'laag' }]
      .forEach(ctx => { const t = D.verbandTrainingContext(bb, ctx, dfn); if (t.zin) alleZinnen.push(t.zin); if (t.actie) alleZinnen.push(t.actie); });
  });
});
ok(alleZinnen.length > 100, 'er zijn genoeg zinnen gegenereerd om te toetsen (' + alleZinnen.length + ')');
D.VERBAND_VERBODEN_WOORDEN.forEach(w => {
  ok(!alleZinnen.some(z => z.toLowerCase().indexOf(w) >= 0), 'geen enkele zin bevat "' + w + '"');
});
D.VERBAND_TRAINING_VERBODEN_WOORDEN.forEach(w => {
  ok(!alleZinnen.some(z => z.toLowerCase().indexOf(w) >= 0), 'geen enkele zin bevat "' + w + '"');
});
ok(!alleZinnen.some(z => /diagnose|ziekte|aandoening|symptoom/i.test(z)), 'geen medische terminologie');
ok(alleZinnen.some(z => z === D.VERBAND_DISCLAIMER), 'de disclaimer blijft aanwezig');
ok(D.meetreeksUitsluitingZin(1) && !/fout|verkeerd/i.test(D.meetreeksUitsluitingZin(1)), 'meetreeks-uitsluitingszin is neutraal');
eq(D.meetreeksUitsluitingZin(0), null, 'geen zin bij nul uitsluitingen');
ok(/2 metingen/.test(D.meetreeksUitsluitingZin(2)), 'meervoud bij twee uitsluitingen');

/* ── I. KETEN EN RENDERPADEN ─────────────────────────────────────────────── */
console.log('\nI. Keten RAW -> DATA QUALITY -> CALCULATION -> DECISION -> UI');
ok(/dc\.pairQuality\(/.test(html), 'de UI koppelt via pairQuality, niet rechtstreeks via pairDaily');
const berekenBlok = html.slice(html.indexOf('function tkVerbandBereken'), html.indexOf('function tkVerbandPijl'));
ok(berekenBlok.indexOf('pairQuality') > 0, 'tkVerbandBereken gebruikt de datakwaliteitslaag');
ok(berekenBlok.indexOf('cc.spearman(kw.pairs)') > berekenBlok.indexOf('dc.pairQuality('), 'keuren gebeurt vóór berekenen');
ok(berekenBlok.indexOf('de.releaseVerband(stat') > berekenBlok.indexOf('cc.spearman(kw.pairs)'), 'berekenen gebeurt vóór vrijgeven');
ok(/typeof dc\.pairQuality!=='function'\) return \[\]/.test(berekenBlok),
   'zonder datakwaliteitslaag wordt er geen correlatie getoond');
ok(!/Math\.abs\([^)]*coefficient[^)]*\)\s*[<>]=?\s*0\.[0-9]/.test(berekenBlok), 'de UI kent geen eigen sterktegrens');
ok(html.indexOf('_tkMetricKeuring') > 0, 'metric-detail keurt zijn reeks');
const metricBlok = html.slice(html.indexOf('function _tkMetricSeries'), html.indexOf('function tkSetMetricPeriod'));
ok(/_tkMetricKeuring\(cfg, rows, endYmd, days\)\.valid/.test(metricBlok),
   'grafiek, trend en statistiek werken op exact dezelfde gekeurde reeks');
ok(/DecisionCore\.meetreeksUitsluitingZin/.test(html), 'de uitsluitingszin komt uit de Decision Engine, niet uit de UI');
ok(/b\.kwaliteitZin/.test(html), 'de verbandkaarten tonen de uitsluitingsmelding');
ok(/b\.sterkteUitleg/.test(html), 'het verbanddetail toont de sterkte-uitleg');
ok(/verbandTrainingContext/.test(html), 'het verbanddetail vraagt de trainingsbetekenis op');
ok(/Wat betekent dit voor je training\?/.test(html), 'de trainingsbetekenis heeft een eigen kop');
ok(!/is niet betrouwbaar|meting is fout|ongeldige meting/i.test(html), 'nergens een oordeel over een individuele meting');

/* ── J. COACH-CONTEXT ────────────────────────────────────────────────────── */
console.log('\nJ. Coach-context — leest berekende waarden, rekent niets');
const coachBlok = html.slice(html.indexOf('async function tkCoachDataBlok'), html.indexOf('async function buildCtx'));
ok(coachBlok.length > 500, 'de coach-contextbouwer bestaat');
['qualifySeries','healthTrend','healthStats','tkVerbandBereken','recoveryAdjustmentForToday','verbandTrainingContext']
  .forEach(f => ok(coachBlok.indexOf(f) > 0, 'coach-context hergebruikt ' + f));
ok(!/spearman|recoveryScore\(|calculateDayFactor/.test(coachBlok), 'de coach-context roept zelf geen rekenfunctie aan');
ok(/niet zelf herberekenen|NOOIT zelf/.test(coachBlok), 'de instructie verbiedt de AI expliciet zelf te rekenen');
ok(/oorzaak-gevolg/.test(coachBlok), 'de instructie verbiedt causale formuleringen');
ok(/uitgesloten/.test(coachBlok), 'datakwaliteit gaat mee naar de coach');
ok(/Herstelstatus vandaag/.test(coachBlok), 'herstelstatus gaat mee naar de coach');
ok(/trainingsdagen in de laatste 7 dagen/.test(coachBlok), 'recente trainingsbelasting gaat mee naar de coach');
ok(/hersteld/.test(coachBlok) && /Verklaar iemand niet hersteld/.test(coachBlok),
   'de instructie verbiedt een gereedheidsoordeel');
ok(/dataBlok/.test(html.slice(html.indexOf('async function buildCtx'), html.indexOf('async function buildCtx') + 4000)),
   'het blok wordt in de systeemprompt opgenomen');
ok(/tkCoachDataBlok\(\)\.catch/.test(html), 'een fout in het blok mag de coach nooit blokkeren');

/* ── K. REGRESSIE ────────────────────────────────────────────────────────── */
console.log('\nK. Regressie — bestaande functionaliteit ongewijzigd');
['observation','observationQuality','healthSeries','healthTrend','healthStats','weightSeries','pairDaily',
 'availablePeriods','bodyMetricsFromLog','deviceConnectionState','sourceKind']
  .forEach(f => ok(typeof DC[f] === 'function', 'bestaande DeviceCore-functie ' + f + ' bestaat nog'));
['releaseVerband','verbandIsCirculair','verbandSterkte'].forEach(f => ok(typeof D[f] === 'function', 'DecisionCore.' + f + ' bestaat nog'));
eq(DC.pairDaily(A, B).length, 6, 'pairDaily zelf is ongewijzigd (keurt niet, koppelt alleen)');
eq(DC.OBSERVATION_VERSION, 'observation.v1', 'observatielaag onveranderd');
eq(D.VERBAND_DEFINITIES.length, 3, 'nog steeds drie verbanden, geen nieuwe erbij verzonnen');
ok(D.VERBAND_DEFINITIES.every(x => x.methode === 'spearman'), 'methode blijft Spearman');
ok(/s-lich-gegevens/.test(html), 'Sprint 9 — scherm Gezondheidsgegevens & koppelingen staat er nog');
ok(/s-lich-verband/.test(html) && /s-lich-metric/.test(html), 'verband- en metricdetail staan er nog');
ok(/Wat betekent dit voor vandaag\?/.test(html), 'bestaande coach-knop is niet vervangen');
ok(/Welke training past hierbij\?/.test(html), 'bestaande trainingsknop is niet vervangen');
/* Deze twee controles toetsen een INVARIANT, geen momentopname. Ze stonden hier eerst als
 * letterlijke versiestrings ('v4.34.0' en 'v43400'). Dat had twee nadelen: elke volgende
 * versiebump liet ze onterecht falen, en toen bij een upload sw.js ontbrak, meldde de gate
 * "cache niet gebumpt" terwijl het werkelijke probleem was dat de service worker niet bij de
 * core hoorde. De invariant hieronder vangt datzelfde geval, maar blijft ook na een bump geldig. */
const APP_VER_MIN = [4, 34, 0];                       // Sprint 10 landde in v4.34.0
const mVer = html.match(/const APP_VER = '(v\d+\.\d+\.\d+)'/);
ok(!!mVer, 'applicatieversie staat als vX.Y.Z in index.html');
const verNums = mVer ? mVer[1].slice(1).split('.').map(Number) : [0, 0, 0];
const verWaarde = verNums[0] * 1e6 + verNums[1] * 1e3 + verNums[2];
const minWaarde = APP_VER_MIN[0] * 1e6 + APP_VER_MIN[1] * 1e3 + APP_VER_MIN[2];
ok(verWaarde >= minWaarde, 'applicatieversie is minstens v' + APP_VER_MIN.join('.') + ' (kreeg ' + (mVer ? mVer[1] : '?') + ')');

/* De service worker moet bij de CORE horen. Precies dezelfde regel als core/sw-guard.test.js:
 * CORE_SIG is de CRLF-agnostische hash van de core-bestanden. Een sw.js die achterblijft bij een
 * core-wijziging valt hier dus door de mand — ook zonder dat er een versienummer in staat. */
const crypto = require('crypto');
const CORE_FILES = ['core/calculation.js', 'core/decision.js', 'core/cardio.js', 'core/progression.js',
                    'core/coaching.js', 'core/movement.js', 'core/onboarding.js', 'core/athleteConstraints.js'];
const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
const coreGecombineerd = CORE_FILES
  .map(f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8').replace(/\r/g, ''))
  .join('\n');
const coreSig = crypto.createHash('sha256').update(coreGecombineerd).digest('hex').slice(0, 16);
const mSig = sw.match(/CORE_SIG\s*=\s*'([0-9a-f]+)'/);
ok(!!mSig && mSig[1] === coreSig,
   'service worker hoort bij de huidige core (CORE_SIG ' + (mSig ? mSig[1] : 'ontbreekt') + ' moet ' + coreSig + ' zijn)');
const mNaam = sw.match(/CACHE_NAME\s*=\s*'trainingskompas-(v\d+)'/);
const mStat = sw.match(/CACHE_STATIC\s*=\s*'trainingskompas-static-(v\d+)'/);
ok(!!mNaam && !!mStat && mNaam[1] === mStat[1],
   'CACHE_NAME en CACHE_STATIC dragen dezelfde cacheversie (' + (mNaam ? mNaam[1] : '?') + ' / ' + (mStat ? mStat[1] : '?') + ')');

console.log('\n' + '='.repeat(56));
console.log('RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail) { console.log('❌ Sprint 10 niet groen.'); process.exit(1); }
console.log('✅ Datakwaliteit vóór berekening, interpretatie zonder causaliteit, coach leest alleen.');
