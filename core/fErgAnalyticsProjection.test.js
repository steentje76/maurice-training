/* fErgAnalyticsProjection.test.js — Erg Analytics Visibility V1.
 * Test de echte ErgAnalyticsProjection-productiefuncties plus hun integratie met de
 * BESTAANDE canonieke calculations (RunningIntelligenceCore.weeklyVolume,
 * TrainingLoadCore.sessionLoadSRPE/rollingLoadSum, ProgressionCore.trendBy).
 *
 * Draai: node core/fErgAnalyticsProjection.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const P = require(path.join(__dirname, 'ergAnalyticsProjection.js'));
const RIC = require(path.join(__dirname, 'runningIntelligence.js'));
const TL = require(path.join(__dirname, 'trainingLoad.js'));
const PC = require(path.join(__dirname, 'progression.js'));

let pass = 0, fail = 0; const msgs = [];
function ok(c, l) { if (c) pass++; else { fail++; msgs.push('MISLUKT: ' + l); } }
function eq(a, b, l) { ok(a === b, l + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')'); }

const ROW = { id: 1, date: '2026-01-05', exercise_id: 'roeien', duration_s: 1800, distance: 5000, watt: 200, rpe: 7 };
const BIKE = { id: 2, date: '2026-01-06', exercise_id: 'bikeerg', duration_s: 2400, distance: 20000, watt: 180, rpe: 6 };
const SKI = { id: 3, date: '2026-01-07', exercise_id: 'skierg', duration_s: 1200, distance: 3000, watt: 150, rpe: 8 };

// ── 1: de drie Erg-sporten projecteren correct, elk met eigen identiteit ──
{
  const r = P.projectErgSession(ROW);
  eq(r.sport, 'rowing', 'RowErg (exercise_id "roeien") -> sport rowing');
  eq(r.distance_meters, 5000, 'RowErg: distance -> distance_meters (naamwissel, geen conversie)');
  eq(r.duration_seconds, 1800, 'RowErg: duration_s -> duration_seconds');
  eq(r.rpe, 7, 'RowErg: rpe behouden'); eq(r.watt, 200, 'RowErg: watt behouden');
  eq(r.session_id, 1, 'RowErg: session_id behouden voor traceerbaarheid');
  eq(r.source_provenance, 'session', 'provenance expliciet "session" — nooit als activity voorgesteld');
  eq(P.projectErgSession(BIKE).sport, 'bikeerg', 'BikeErg -> sport bikeerg');
  eq(P.projectErgSession(SKI).sport, 'skierg', 'SkiErg -> sport skierg');
  eq(P.projectErgSession({ id: 9, date: '2026-01-05', exercise_id: 'rowerg', duration_s: 600 }).sport, 'rowing', 'alias "rowerg" -> rowing');
  eq(P.projectErgSession({ id: 9, date: '2026-01-05', exercise_id: 'bike_erg', duration_s: 600 }).sport, 'bikeerg', 'alias "bike_erg" -> bikeerg');
  eq(P.projectErgSession({ id: 9, date: '2026-01-05', exercise_id: 'ski_erg', duration_s: 600 }).sport, 'skierg', 'alias "ski_erg" -> skierg');
}

// ── 2: BIKEERG WORDT NOOIT ROWING (harde semantische grens) ──
{
  const b = P.projectErgSession(BIKE);
  ok(b.sport !== 'rowing', 'BikeErg wordt NOOIT als rowing geclassificeerd');
  eq(b.sport, 'bikeerg', 'BikeErg blijft bikeerg');
  eq(P.ergSportForSession(BIKE), 'bikeerg', 'ergSportForSession(BikeErg) = bikeerg');
  // Zelfs met rowing-achtige velden (stroke_rate) blijft de identiteit leidend.
  const bMetStroke = Object.assign({}, BIKE, { stroke_rate: 90 });
  eq(P.projectErgSession(bMetStroke).sport, 'bikeerg', 'BikeErg met stroke_rate (=RPM) blijft bikeerg — sport komt uit exercise_id, nooit uit stroke_rate');
  ok(!('stroke_rate' in P.projectErgSession(bMetStroke)), 'cadans wordt BEWUST weggelaten uit de projectie (RPM vs slagfrequentie zijn onverenigbaar) — weglaten boven semantische corruptie');
  ok(!('cadence' in P.projectErgSession(bMetStroke)), 'geen generiek cadence-veld geintroduceerd');
}

// ── 3: NIET-ERG-SESSIES WORDEN GEWEIGERD (dedup-veiligheid) ──
{
  const geweigerd = [
    { id: 10, date: '2026-01-05', exercise_id: 'hardlopen', duration_s: 3000, distance: 8000, rpe: 5 },
    { id: 11, date: '2026-01-05', exercise_id: 'running', duration_s: 3000 },
    { id: 12, date: '2026-01-05', exercise_id: 'wielrennen', duration_s: 3000 },
    { id: 13, date: '2026-01-05', exercise_id: 'cycling', duration_s: 3000 },
    { id: 14, date: '2026-01-05', exercise_id: 'zwemmen', duration_s: 3000 },
    { id: 15, date: '2026-01-05', exercise_id: 'swimming', duration_s: 3000 },
    { id: 16, date: '2026-01-05', exercise_id: 'assaultbike', duration_s: 3000 },
    { id: 17, date: '2026-01-05', exercise_id: 'stairmaster', duration_s: 3000 },
    { id: 18, date: '2026-01-05', exercise_id: 'squat', duration_s: 3600, rpe: 9 },
    { id: 19, date: '2026-01-05', exercise_id: 'bench_press', duration_s: 3600 }
  ];
  geweigerd.forEach(function (r) {
    eq(P.projectErgSession(r), null, 'GEWEIGERD uit Erg-projectie: exercise_id "' + r.exercise_id + '" (voorkomt dubbeltelling met activities / niet-cardio)');
  });
  eq(P.projectErgSessions(geweigerd).length, 0, 'lijst met uitsluitend niet-Erg-sessies -> lege projectie');
  // Ontbrekende/ongeldige identiteit: fail closed.
  eq(P.projectErgSession({ date: '2026-01-05', duration_s: 600 }), null, 'sessie zonder exercise_id -> geweigerd');
  eq(P.projectErgSession({ date: '2026-01-05', exercise_id: '', duration_s: 600 }), null, 'lege exercise_id -> geweigerd');
  eq(P.projectErgSession(null), null, 'null-rij -> geweigerd');
  eq(P.projectErgSession({ date: '2026-01-05', exercise_id: 123 }), null, 'niet-string exercise_id -> geweigerd');
}

// ── 4: datum/tijdzone — geen dagverschuiving, weekgrenzen blijven correct ──
{
  const r = P.projectErgSession(ROW);
  eq(r.recorded_at, '2026-01-05T00:00:00.000Z', 'sessions.date -> UTC-middernacht ISO (geen lokale-tijd-parse)');
  // De weekgrens-logica rekent in UTC; een maandag moet zijn eigen week starten.
  eq(RIC.weekKeyFromDate(P.projectErgSession({ id: 1, date: '2026-01-05', exercise_id: 'roeien', duration_s: 60 }).recorded_at), '2026-01-05', 'maandag 2026-01-05 -> weekKey 2026-01-05 (eigen week)');
  eq(RIC.weekKeyFromDate(P.projectErgSession({ id: 1, date: '2026-01-04', exercise_id: 'roeien', duration_s: 60 }).recorded_at), '2025-12-29', 'zondag 2026-01-04 -> weekKey van de VOORGAANDE maandag (geen verschuiving)');
  eq(RIC.weekKeyFromDate(P.projectErgSession({ id: 1, date: '2026-01-11', exercise_id: 'roeien', duration_s: 60 }).recorded_at), '2026-01-05', 'zondag 2026-01-11 -> nog steeds week 2026-01-05');
  // Ongeldige datum -> geweigerd, nooit een verzonnen datum.
  eq(P.projectErgSession({ id: 1, date: 'geen-datum', exercise_id: 'roeien', duration_s: 60 }), null, 'onleesbare datum -> geweigerd');
  eq(P.projectErgSession({ id: 1, exercise_id: 'roeien', duration_s: 60 }), null, 'ontbrekende datum -> geweigerd');
  eq(P.normalizeSessionDateToUtcIso(null), null, 'normalizeSessionDateToUtcIso(null) -> null');
}

// ── 5: duur/afstand — degradeert veilig, verzint nooit een waarde ──
{
  const zonderDuur = P.projectErgSession({ id: 1, date: '2026-01-05', exercise_id: 'roeien', distance: 2000 });
  eq(zonderDuur.duration_seconds, null, 'ontbrekende duration_s -> null (NOOIT 0, NOOIT time_str-parse: geen tweede duur-parser)');
  eq(zonderDuur.distance_meters, 2000, 'afstand blijft bruikbaar zonder duur');
  const zonderAfstand = P.projectErgSession({ id: 1, date: '2026-01-05', exercise_id: 'roeien', duration_s: 600 });
  eq(zonderAfstand.distance_meters, null, 'ontbrekende distance -> null, nooit 0');
  eq(P.projectErgSession({ id: 1, date: '2026-01-05', exercise_id: 'roeien', duration_s: -5 }).duration_seconds, null, 'negatieve duur -> null');
  eq(P.projectErgSession({ id: 1, date: '2026-01-05', exercise_id: 'roeien', duration_s: 0 }).duration_seconds, null, 'nul-duur -> null (geen schijnbaar geldige data)');
  eq(P.projectErgSession({ id: 1, date: '2026-01-05', exercise_id: 'roeien', duration_s: NaN }).duration_seconds, null, 'NaN-duur -> null');
  eq(P.projectErgSession({ id: 1, date: '2026-01-05', exercise_id: 'roeien', duration_s: Infinity }).duration_seconds, null, 'Infinity-duur -> null');
  eq(P.projectErgSession({ id: 1, date: '2026-01-05', exercise_id: 'roeien', duration_s: 600, rpe: 11 }).rpe, null, 'RPE buiten 0-10 -> null');
  eq(P.projectErgSession({ id: 1, date: '2026-01-05', exercise_id: 'roeien', duration_s: 600 }).rpe, null, 'ontbrekende RPE -> null, NOOIT 0');
  eq(P.projectErgSession({ id: 1, date: '2026-01-05', exercise_id: 'roeien', duration_s: 600, watt: 0 }).watt, null, 'watt 0 -> null');
}

// ── 6: ontbrekende RPE mag NOOIT belasting fabriceren (bestaande calc hergebruikt) ──
{
  const zonderRpe = P.projectErgSession({ id: 1, date: '2026-01-05', exercise_id: 'roeien', duration_s: 1800 });
  eq(TL.sessionLoadSRPE(zonderRpe.duration_seconds, zonderRpe.rpe), null, 'ontbrekende RPE -> sessionLoadSRPE null (geen belasting verzonnen)');
  const metRpe = P.projectErgSession(ROW);
  eq(TL.sessionLoadSRPE(metRpe.duration_seconds, metRpe.rpe), 210, 'RowErg 1800s @ RPE 7 -> 210 AU via BESTAANDE session_load_srpe.v1 (geen Erg-specifieke formule)');
  eq(TL.rollingLoadSum([210, null, 240]), 450, 'rollingLoadSum negeert nulls (bestaande calc, ongewijzigd)');
}

// ── 7: weekvolume via de BESTAANDE canonieke calculation ──
{
  const alleen = P.projectErgSessions([ROW, BIKE, SKI], { sport: 'rowing' });
  eq(alleen.length, 1, 'opts.sport filtert tot één Erg-sport');
  eq(alleen[0].sport, 'rowing', 'sportfilter levert de juiste sport');
  const wv = RIC.weeklyVolume(P.projectErgSessions([ROW], { sport: 'rowing' }));
  eq(wv['2026-01-05'].durationSeconds, 1800, 'weeklyVolume consumeert de projectie direct (duur)');
  eq(wv['2026-01-05'].count, 1, 'weeklyVolume telt frequentie');
  eq(wv['2026-01-05'].distanceMeters, 5000, 'weeklyVolume telt sport-specifieke afstand');
}

// ── 8: AFSTAND WORDT NOOIT OVER MACHINES SAMENGEVOEGD ──
{
  const bySport = P.ergSessionsBySport([ROW, BIKE, SKI]);
  eq(bySport.rowing.length, 1, 'ergSessionsBySport: rowing gescheiden');
  eq(bySport.bikeerg.length, 1, 'ergSessionsBySport: bikeerg gescheiden');
  eq(bySport.skierg.length, 1, 'ergSessionsBySport: skierg gescheiden');
  ok(!('all' in bySport) && !('total' in bySport) && !('combined' in bySport), 'GEEN samengevoegde "alle Ergs"-bucket — RowErg/BikeErg/SkiErg-meters zijn fysiek niet optelbaar');
  const rowWV = RIC.weeklyVolume(bySport.rowing), bikeWV = RIC.weeklyVolume(bySport.bikeerg), skiWV = RIC.weeklyVolume(bySport.skierg);
  const wk = '2026-01-05';
  eq(rowWV[wk] ? rowWV[wk].distanceMeters : null, 5000, 'RowErg-afstand apart: 5000 m');
  eq(bikeWV[wk] ? bikeWV[wk].distanceMeters : null, 20000, 'BikeErg-afstand apart: 20000 m (eigen bucket — bewijst dat BikeErg niet in de rowing-bucket is beland)');
  eq(skiWV[wk] ? skiWV[wk].distanceMeters : null, 3000, 'SkiErg-afstand apart: 3000 m');
  ok(!rowWV[wk] || rowWV[wk].distanceMeters !== 28000, 'de drie afstanden zijn NIET tot één generieke 28000 m-afstandstrend samengevoegd');
  ok(!rowWV[wk] || rowWV[wk].distanceMeters !== 25000, 'RowErg-bucket bevat NIET ook de BikeErg-afstand (5000+20000) — bewijst sportscheiding');
  // Tijd en frequentie MOGEN wel over sporten heen worden opgeteld (zelfde eenheid).
  const totaleTijd = [bySport.rowing, bySport.bikeerg, bySport.skierg].reduce(function (s, lijst) { return s + lijst.reduce(function (t, x) { return t + (x.duration_seconds || 0); }, 0); }, 0);
  eq(totaleTijd, 5400, 'tijd MAG over Erg-sporten worden opgeteld (zelfde eenheid): 1800+2400+1200 = 5400 s');
}

// ── 9: gemengde Erg-historie ──
{
  const gemengd = [ROW, BIKE, SKI, { id: 20, date: '2026-01-08', exercise_id: 'hardlopen', duration_s: 1800, rpe: 5 }];
  const proj = P.projectErgSessions(gemengd);
  eq(proj.length, 3, 'gemengde historie: exact de 3 Erg-sessies, de hardloopsessie geweigerd');
  ok(proj.every(function (p) { return ['rowing', 'bikeerg', 'skierg'].indexOf(p.sport) !== -1; }), 'alleen canonieke Erg-sporten in de output');
}

// ── 10: trend — sportidentiteit is onderdeel van vergelijkbaarheid ──
{
  // trendBy groepeert via comparableHistory op `key`; door de sport als key te gebruiken
  // kunnen RowErg/BikeErg/SkiErg nooit met elkaar vergeleken worden.
  const rowHist = [
    { key: 'rowing', date: '2026-01-01', watt: 180 },
    { key: 'rowing', date: '2026-01-08', watt: 190 },
    { key: 'rowing', date: '2026-01-15', watt: 200 }
  ];
  const tr = PC.trendBy(rowHist, 'rowing', 'watt', 'max', 3);
  eq(tr.status, 'trend', 'RowErg-vermogenstrend berekend via BESTAANDE ProgressionCore.trendBy (geen nieuwe trendformule)');
  eq(tr.improving, true, 'stijgend vermogen met dir="max" -> improving (typed richting behouden)');
  const gemengdeHist = rowHist.concat([{ key: 'bikeerg', date: '2026-01-20', watt: 400 }]);
  const trBike = PC.trendBy(gemengdeHist, 'bikeerg', 'watt', 'max', 3);
  ok(trBike.status !== 'trend', 'BikeErg met 1 observatie in een gemengde historie levert GEEN trend — RowErg-data lekt niet in de BikeErg-trend');
  const trRowNaMenging = PC.trendBy(gemengdeHist, 'rowing', 'watt', 'max', 3);
  eq(trRowNaMenging.last, 200, 'RowErg-trend blijft 200 W — de 400 W BikeErg-sessie besmet de RowErg-trend niet');
}

// ── 11: de projectie REKENT niet (het is geen Calculation) ──
{
  const rawSrc = fs.readFileSync(path.join(__dirname, 'ergAnalyticsProjection.js'), 'utf8');
  // Commentaar strippen: de toelichting benoemt bewust wél de calculations die deze module
  // NIET uitvoert. Alleen de daadwerkelijke CODE mag hier gecontroleerd worden.
  const src = rawSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  ok(!/weeklyVolume|sessionLoadSRPE|rollingLoadSum|trendBy|criticalSpeed|criticalPower/.test(src), 'projectiecode roept GEEN calculation aan en dupliceert er geen — normaliseert alleen de vorm');
  ok(!/\/\s*60\s*\*|\*\s*rpe|splitFrom|paceFrom/.test(src), 'projectiecode berekent geen belasting/split/pace');
  ok(!/CALC-/.test(src), 'projectiecode claimt GEEN CALC-ID (een adapter is geen Calculation)');
  ok(!/REST|TRAIN_HARD|TRAIN_EASY|REDUCE_INTENSITY|DecisionCore/i.test(src), 'projectiecode bevat geen Decision-semantiek');
  ok(!/readiness/i.test(src), 'projectiecode bevat geen readiness-semantiek');
  // Geen mutatie van de invoer.
  const origineel = JSON.parse(JSON.stringify(ROW));
  P.projectErgSession(ROW);
  eq(JSON.stringify(ROW), JSON.stringify(origineel), 'invoerrij wordt niet gemuteerd (geen persistence-wijziging)');
}

// ── 12: architectuurgrenzen in index.html ──
{
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  ok(html.includes("<script src=\"core/ergAnalyticsProjection.js\"></script>"), 'projectie is als script geladen (geen dormant module)');
  ok(html.includes('ErgAnalyticsProjection.projectErgSessions'), 'projectie heeft minstens één echte runtime-aanroeper');
  ok(/exercise_id=in\.\(/.test(html), 'Erg-sessies worden op canonieke exercise_id gefilterd in de query, niet op tekstlabel');
  ok(!/sbPostQ\('activities'[^)]*erg/i.test(html), 'GEEN dual-write van Erg-sessies naar activities');
  const ergQueryLine = (html.split('\n').filter(function (l) { return l.indexOf("sbGet('sessions','&exercise_id=in.('+TK_ENDURANCE_CTX_ERG_EXERCISE_IDS") !== -1; })[0] || '');
  ok(ergQueryLine !== '', 'de Erg-sessions-query is gevonden in index.html');
  ok(ergQueryLine.indexOf('limit=') !== -1 && ergQueryLine.indexOf('date=gte.') !== -1, 'Erg-sessions-query is BEGRENSD (venster + limit), geen onbegrensde full-history-scan');
  ok(!/service_role|SUPABASE_SERVICE/i.test(ergQueryLine), 'Erg-query gebruikt geen elevated sleutel — normale, RLS-gebonden sbGet-weg');
  ok(/TK_ENDURANCE_CTX_ERG_LABEL=\{rowing:'RowErg',bikeerg:'BikeErg',skierg:'SkiErg'\}/.test(html), 'alle drie Erg-labels aanwezig in de Context-laag');
}

if (msgs.length) console.log(msgs.join('\n'));
console.log('fErgAnalyticsProjection: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail ? 1 : 0);
