/* TrainingKompas — Coaching Core test suite (node, standalone).
 * Draai: node core/coaching.test.js
 * Bewijst: deterministische signaal-afleiding, prioriteit, AI-boundary-passthrough, purity. */
const fs = require('fs');
const path = require('path');
const C = require('./coaching.js');

let pass = 0, fail = 0;
const T = (n, fn) => { try { fn(); console.log('  ✓ ' + n); pass++; } catch (e) { console.log('  ✗ ' + n + ' :: ' + e.message); fail++; } };
const eq = (a, b, m) => { if (!Object.is(a, b)) throw new Error((m || '') + ' verwacht ' + b + ', kreeg ' + a); };
const ok = (c, m) => { if (!c) throw new Error(m || 'assert'); };
const hasSig = (r, s) => ok(r.signals.indexOf(s) !== -1, 'signaal ontbreekt: ' + s + ' (kreeg ' + JSON.stringify(r.signals) + ')');
const noSig = (r, s) => ok(r.signals.indexOf(s) === -1, 'signaal mag niet: ' + s);

// ================= A. eerste registratie =================
console.log('\n[A] first_session (geen vergelijkbare historie)');
T('comparableCount 0 -> first_session, status first', () => {
  const r = C.deriveSignals({ comparableCount: 0, better: true, isBest: true });
  eq(r.status, 'first'); hasSig(r, 'first_session'); noSig(r, 'new_best'); noSig(r, 'improved');
});
T('geen facts -> first_session (veilige default)', () => { const r = C.deriveSignals(); eq(r.status, 'first'); hasSig(r, 'first_session'); });

// ================= B. richting t.o.v. vorige =================
console.log('\n[B] improved / declined / stable');
T('better=true -> improved', () => { const r = C.deriveSignals({ comparableCount: 1, better: true }); eq(r.status, 'improved'); hasSig(r, 'improved'); });
T('better=false -> declined', () => { const r = C.deriveSignals({ comparableCount: 1, better: false }); eq(r.status, 'declined'); hasSig(r, 'declined'); });
T('better=null (gelijk) -> stable + repeated_performance', () => { const r = C.deriveSignals({ comparableCount: 1, better: null }); eq(r.status, 'stable'); hasSig(r, 'stable'); hasSig(r, 'repeated_performance'); });
T('better=undefined -> unknown, geen richtingssignaal', () => { const r = C.deriveSignals({ comparableCount: 1 }); eq(r.status, 'unknown'); noSig(r, 'improved'); noSig(r, 'declined'); noSig(r, 'stable'); });

// ================= C. new_best =================
console.log('\n[C] new_best (alleen bij echte beste)');
T('isBest=true -> new_best', () => hasSig(C.deriveSignals({ comparableCount: 2, better: true, isBest: true }), 'new_best'));
T('isBest=false -> geen new_best', () => noSig(C.deriveSignals({ comparableCount: 2, better: true, isBest: false }), 'new_best'));
T('geen new_best bij eerste registratie ook al isBest meegegeven', () => noSig(C.deriveSignals({ comparableCount: 0, isBest: true }), 'new_best'));

// ================= D. trend =================
console.log('\n[D] trend_up / trend_down / trend_stable / insufficient_history');
T('canTrend + improving true -> trend_up', () => hasSig(C.deriveSignals({ comparableCount: 3, better: true, canTrend: true, trendImproving: true }), 'trend_up'));
T('canTrend + improving false -> trend_down', () => hasSig(C.deriveSignals({ comparableCount: 3, better: false, canTrend: true, trendImproving: false }), 'trend_down'));
T('canTrend + improving null -> trend_stable', () => hasSig(C.deriveSignals({ comparableCount: 3, better: null, canTrend: true, trendImproving: null }), 'trend_stable'));
T('1-2 vergelijkbare, geen canTrend -> insufficient_history', () => { hasSig(C.deriveSignals({ comparableCount: 1, better: true }), 'insufficient_history'); hasSig(C.deriveSignals({ comparableCount: 2, better: true }), 'insufficient_history'); });
T('canTrend -> geen insufficient_history', () => noSig(C.deriveSignals({ comparableCount: 3, better: true, canTrend: true, trendImproving: true }), 'insufficient_history'));
T('geen valse trend zonder canTrend', () => { const r = C.deriveSignals({ comparableCount: 2, better: true, trendImproving: true }); noSig(r, 'trend_up'); });

// ================= E. prioriteit =================
console.log('\n[E] priority (belangrijkste signaal)');
T('new_best domineert improved/trend_up', () => { const r = C.deriveSignals({ comparableCount: 3, better: true, isBest: true, canTrend: true, trendImproving: true }); eq(r.priority, 100); });
T('improved zonder best -> priority < 100', () => { const r = C.deriveSignals({ comparableCount: 1, better: true }); ok(r.priority < 100 && r.priority > 0); });
T('first_session priority = 35', () => eq(C.deriveSignals({ comparableCount: 0 }).priority, 35));

// ================= F. buildContext (AI-boundary passthrough) =================
console.log('\n[F] buildContext — puur doorgeefluik, berekent niets');
T('carriert signalen + reeds-berekende waarden zonder mutatie', () => {
  const ctx = C.buildContext({ domain: 'strength', exercise: 'bench', current: 105, previous: 100, best: 105, facts: { comparableCount: 2, better: true, isBest: true } });
  eq(ctx.domain, 'strength'); eq(ctx.exercise, 'bench'); eq(ctx.current, 105); eq(ctx.previous, 100); eq(ctx.best, 105);
  hasSig(ctx, 'new_best'); eq(ctx.sufficientHistory, true); eq(ctx.version, 'coaching_context.v1');
});
T('sufficientHistory=false bij eerste registratie', () => { const ctx = C.buildContext({ facts: { comparableCount: 0 } }); eq(ctx.sufficientHistory, false); hasSig(ctx, 'first_session'); });

// ================= G. determinisme + purity =================
console.log('\n[G] determinisme + architecture guards');
T('deterministisch (zelfde input -> zelfde output)', () => {
  const f = { comparableCount: 3, better: true, isBest: true, canTrend: true, trendImproving: true };
  eq(JSON.stringify(C.deriveSignals(f)), JSON.stringify(C.deriveSignals(f)));
});
const RAW = fs.readFileSync(path.join(__dirname, 'coaching.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
T('coaching-core bevat geen DOM/DB/AI/network', () => {
  ['document', 'supabase', 'fetch(', 'localStorage', 'sessionStorage', 'querySelector', '.from(', 'XMLHttpRequest'].forEach(tok => ok(!RAW.includes(tok), 'verboden token: ' + tok));
});
T('geen Date-nondeterminisme + geen eigen rekenkern (geen 1RM/split-formules)', () => {
  ok(RAW.indexOf('new Date') === -1 && RAW.indexOf('Date.now') === -1, 'Date-gebruik');
  ok(RAW.indexOf('Math.pow') === -1 && RAW.indexOf('Math.cbrt') === -1, 'CoachingCore mag zelf niets uitrekenen');
});
T('VERSIONS compleet', () => { eq(C.VERSIONS.signals, 'coaching_signals.v1'); eq(C.VERSIONS.context, 'coaching_context.v1'); });

// ================= H. aiPayload — AI-boundary (F6.4/F6.3) =================
console.log('\n[H] aiPayload — alleen reeds-berekende velden bereiken de AI');
T('stript niet-toegestane velden (geen rauwe data naar AI)', () => {
  const map = { bench: { exercise: 'Bench', domain: 'strength', signals: ['improved', 'new_best'], current: 105, previous: 99, best: 105, nextAction: 'Verhogen (+2,5 kg)',
    rawSessionLog: { sets: [1, 2, 3] }, sbToken: 'geheim', calc: () => 1 } };
  const out = C.aiPayload(map);
  eq(out.length, 1);
  const e = out[0];
  ok(!('rawSessionLog' in e), 'rauwe sessiedata mag NIET naar AI'); ok(!('sbToken' in e), 'token mag NIET naar AI'); ok(!('calc' in e));
  eq(e.exercise, 'Bench'); eq(e.current, 105); eq(e.previous, 99); eq(e.nextAction, 'Verhogen (+2,5 kg)');
  ok(Array.isArray(e.signals) && e.signals.indexOf('new_best') !== -1);
});
T('lege/ongeldige map -> lege array (fail-soft)', () => {
  eq(JSON.stringify(C.aiPayload(null)), '[]'); eq(JSON.stringify(C.aiPayload({})), '[]'); eq(JSON.stringify(C.aiPayload(undefined)), '[]');
});
T('null/undefined velden worden weggelaten (geen lege ruis naar AI)', () => {
  const out = C.aiPayload({ x: { exercise: 'X', previous: null, best: undefined, current: 80 } });
  ok(!('previous' in out[0]) && !('best' in out[0]), 'null/undefined velden weglaten'); eq(out[0].current, 80);
});
T('AI_FIELDS bevat geen rekenbare/gevoelige sleutels', () => {
  ['rpe', 'kg', 'sets_detail', 'token', 'authorization'].forEach(k => ok(C.AI_FIELDS.indexOf(k) === -1, 'verboden AI-veld: ' + k));
});
T('aiPayload is deterministisch', () => {
  const m = { a: { exercise: 'A', signals: ['improved'], current: 1 } };
  eq(JSON.stringify(C.aiPayload(m)), JSON.stringify(C.aiPayload(m)));
});

// ================= I. improvementsDigest (F7.9) =================
console.log('\n[I] improvementsDigest — "waar ben ik beter geworden?"');
const IT = [
  { exercise: 'Bench Press', domain: 'strength', newBest: true, improved: true, trendUp: false, reason: 'hogere geschatte 1RM' },
  { exercise: 'Squat', domain: 'strength', newBest: false, improved: true, trendUp: true, reason: 'hogere geschatte 1RM' },
  { exercise: 'Roeien', domain: 'cardio', newBest: true, improved: true, trendUp: true, reason: 'sneller' },
  { exercise: 'Rust', domain: 'strength', newBest: false, improved: false, trendUp: false },
];
T('telt records/verbeterd/trends correct', () => {
  const d = C.improvementsDigest(IT);
  eq(d.counts.newBests, 2); eq(d.counts.improved, 3); eq(d.counts.trendUps, 2); eq(d.hasAny, true);
});
T('highlights gesorteerd op prioriteit (nieuwe beste eerst) en negeert niet-verbeterde', () => {
  const d = C.improvementsDigest(IT);
  ok(d.highlights.length === 3, 'alleen 3 met verbetering'); ok(d.highlights[0].newBest === true, 'newBest eerst');
  ok(!d.highlights.some(h => h.exercise === 'Rust'), 'niet-verbeterde niet in highlights');
});
T('maxHighlights gerespecteerd', () => eq(C.improvementsDigest(IT, 2).highlights.length, 2));
T('geen verbeteringen -> hasAny false, lege highlights', () => {
  const d = C.improvementsDigest([{ exercise: 'X', newBest: false, improved: false, trendUp: false }]);
  eq(d.hasAny, false); eq(d.highlights.length, 0); eq(d.counts.newBests, 0);
});
T('lege/ongeldige input -> veilige lege digest', () => {
  eq(C.improvementsDigest(null).hasAny, false); eq(C.improvementsDigest([]).hasAny, false);
});
T('deterministisch', () => eq(JSON.stringify(C.improvementsDigest(IT)), JSON.stringify(C.improvementsDigest(IT))));

// ================= J. AI-boundary CONTRACT (F8.5/F9.3) =================
// Bewijst PERMANENT dat de AI de reken-INPUTS nooit ziet (kan dus zelf niets herberekenen),
// en dat de reeds-berekende nextAction uit DecisionCore ONGEWIJZIGD door aiPayload loopt.
console.log('\n[J] AI-boundary contract — reken-inputs nooit naar AI, DecisionCore.nextAction blijft intact');
const DecisionCore = require('./decision.js');
T('aiPayload stript ELKE reken-input, ook als per ongeluk meegegeven in de stash', () => {
  // Simuleer een "vervuilde" per-oefening stash met álle gevoelige/reken-velden erin.
  const dirty = {
    bench: {
      exercise: 'Bench', domain: 'strength', status: 'improved',
      signals: ['improved', 'new_best'], priority: 100,
      metric: 'e1RM', current: 105, previous: 99, best: 105,
      nextAction: 'Verhogen (+2,5 kg)',
      // ── verboden: alles waarmee een AI zelf zou kunnen rekenen of authenticeren ──
      rpe: 7, weight: 100, kg: 100, sets_detail: [{ kg: 100, reps: 5, rpe: 7 }],
      reps: 5, e1rm_raw: 116.7, token: 'geheim', authorization: 'Bearer x',
      sbToken: 'geheim2', rawSessionLog: { sets: [1, 2, 3] }, calc: function () { return 1; }
    }
  };
  const out = C.aiPayload(dirty);
  eq(out.length, 1);
  const e = out[0];
  // GEEN enkele reken-input of credential mag de boundary passeren.
  ['rpe', 'weight', 'kg', 'sets_detail', 'reps', 'e1rm_raw', 'token', 'authorization', 'sbToken', 'rawSessionLog', 'calc']
    .forEach(function (k) { ok(!(k in e), 'reken-input/credential LEKTE naar AI: ' + k); });
  // Alleen reeds-berekende presentatievelden blijven over.
  eq(e.exercise, 'Bench'); eq(e.current, 105); eq(e.previous, 99); eq(e.best, 105); eq(e.metric, 'e1RM');
});
T('nextAction uit DecisionCore.computeProgression loopt ONGEWIJZIGD door aiPayload', () => {
  // De ENIGE bron voor de volgende-actie is DecisionCore (deterministisch), niet de AI.
  const decUp = DecisionCore.computeProgression(7, 100);   // rpe laag  -> Verhogen +2,5
  const decHold = DecisionCore.computeProgression(8, 100);  // rpe mid   -> Gelijk houden
  const decDe = DecisionCore.computeProgression(9, 100);   // rpe hoog  -> Deload
  eq(decUp.label, 'Verhogen'); eq(decHold.label, 'Gelijk houden'); eq(decDe.label, 'Deload');
  const map = {
    a: { exercise: 'A', nextAction: decUp.label, current: 1 },
    b: { exercise: 'B', nextAction: decHold.label, current: 1 },
    c: { exercise: 'C', nextAction: decDe.label, current: 1 }
  };
  const out = C.aiPayload(map);
  eq(out[0].nextAction, 'Verhogen');       // exact wat DecisionCore besliste
  eq(out[1].nextAction, 'Gelijk houden');
  eq(out[2].nextAction, 'Deload');
  // De AI krijgt dus een KANT-EN-KLARE beslissing te verwoorden, niet de rpe/gewicht om zelf te beslissen.
  ok(!('rpe' in out[0]) && !('weight' in out[0]), 'beslis-inputs mogen niet mee met de nextAction');
});
T('lege signals-array breekt de boundary niet (nextAction blijft behouden)', () => {
  const out = C.aiPayload({ x: { exercise: 'X', signals: [], current: 10, nextAction: 'Gelijk houden' } });
  eq(out.length, 1); eq(out[0].nextAction, 'Gelijk houden'); eq(out[0].current, 10);
});

// ================= K. buildCoachConclusion / conclusionText (F9.5) =================
console.log('\n[K] buildCoachConclusion — deterministische post-workout conclusie (AI verwoordt, core bepaalt)');
const E = function (o) { // helper: bouwt een _coachSignals-achtige entry
  return Object.assign({ domain: 'strength', exercise: 'Ex', status: 'unknown', signals: [], priority: 0, metric: 'geschat 1RM', current: null, previous: null, best: null, nextAction: null }, o);
};
T('geen data -> hasData false, overall unknown, lege tekst', () => {
  const c = C.buildCoachConclusion([]);
  eq(c.hasData, false); eq(c.overall, 'unknown'); eq(C.conclusionText(c), '');
  eq(C.buildCoachConclusion(null).hasData, false); eq(C.buildCoachConclusion(undefined).hasData, false);
});
T('accepteert map (window._coachSignals-vorm) én array', () => {
  const map = { a: E({ exercise: 'Bench', status: 'improved', signals: ['improved'], priority: 70, previous: '100 kg', current: '105 kg' }) };
  const c1 = C.buildCoachConclusion(map);
  const c2 = C.buildCoachConclusion([map.a]);
  eq(JSON.stringify(c1), JSON.stringify(c2)); eq(c1.overall, 'improved');
});
T('first session -> overall first, neutrale toon, geen vergelijkingsclaim', () => {
  const c = C.buildCoachConclusion([E({ status: 'first', signals: ['first_session'], priority: 35, exercise: 'Squat' })]);
  eq(c.overall, 'first'); eq(c.tone, 'neutral'); ok(C.conclusionText(c).indexOf('Eerste registratie') !== -1);
});
T('improved -> overall improved, positieve toon, previous->current benoemd', () => {
  const c = C.buildCoachConclusion([E({ exercise: 'Bench', status: 'improved', signals: ['improved'], priority: 70, previous: '100 kg', current: '105 kg' })]);
  eq(c.overall, 'improved'); eq(c.tone, 'positive'); eq(c.counts.improved, 1);
  const t = C.conclusionText(c); ok(t.indexOf('100 kg') !== -1 && t.indexOf('105 kg') !== -1);
});
T('declined -> overall declined, niet-veroordelende toon', () => {
  const c = C.buildCoachConclusion([E({ exercise: 'Row', domain: 'cardio', status: 'declined', signals: ['declined'], priority: 60, previous: '2:04/500m', current: '2:08/500m' })]);
  eq(c.overall, 'declined'); eq(c.tone, 'encouraging');
  ok(C.conclusionText(c).indexOf('hoeft geen probleem') !== -1);
});
T('stable -> overall stable, repeated_performance', () => {
  const c = C.buildCoachConclusion([E({ status: 'stable', signals: ['stable', 'repeated_performance'], priority: 40 })]);
  eq(c.overall, 'stable'); ok(C.conclusionText(c).indexOf('vergelijkbaar') !== -1);
});
T('new_best domineert improved (overall new_best) + best benoemd', () => {
  const c = C.buildCoachConclusion([
    E({ exercise: 'Bench', status: 'improved', signals: ['improved', 'new_best'], priority: 100, previous: '100 kg', current: '105 kg', best: '105 kg' }),
    E({ exercise: 'Row', domain: 'cardio', status: 'improved', signals: ['improved'], priority: 70 })
  ]);
  eq(c.overall, 'new_best'); eq(c.counts.newBests, 1); eq(c.lead.exercise, 'Bench');
  ok(C.conclusionText(c).indexOf('Nieuw persoonlijk record') !== -1);
});
T('trend_up / trend_down geteld', () => {
  const c = C.buildCoachConclusion([
    E({ signals: ['improved', 'trend_up'], status: 'improved', priority: 80 }),
    E({ signals: ['declined', 'trend_down'], status: 'declined', priority: 60 })
  ]);
  eq(c.counts.trendUps, 1); eq(c.counts.trendDowns, 1); eq(c.overall, 'mixed');
});
T('mixed workout (improved + declined) -> overall mixed, encouraging', () => {
  const c = C.buildCoachConclusion([
    E({ exercise: 'Bench', status: 'improved', signals: ['improved'], priority: 70, current: '105 kg' }),
    E({ exercise: 'Squat', status: 'declined', signals: ['declined'], priority: 60 })
  ]);
  eq(c.overall, 'mixed'); eq(c.tone, 'encouraging'); ok(C.conclusionText(c).indexOf('Wisselend') !== -1);
});
T('lead = hoogste priority oefening', () => {
  const c = C.buildCoachConclusion([
    E({ exercise: 'Laag', status: 'improved', signals: ['improved'], priority: 70 }),
    E({ exercise: 'Hoog', status: 'improved', signals: ['improved', 'new_best'], priority: 100, best: '120 kg' })
  ]);
  eq(c.lead.exercise, 'Hoog');
});
T('nextAction aanwezig -> overgenomen uit DecisionCore-label, in tekst', () => {
  const c = C.buildCoachConclusion([E({ exercise: 'Bench', status: 'improved', signals: ['improved'], priority: 70, nextAction: 'Verhogen (+2,5 kg)' })]);
  eq(c.nextAction, 'Verhogen (+2,5 kg)'); eq(c.nextActionExercise, 'Bench');
  ok(C.conclusionText(c).indexOf('volgende stap: Verhogen (+2,5 kg)') !== -1);
});
T('nextAction null (bv. cardio zonder RPE-regel) -> geen volgende-stap-zin', () => {
  const c = C.buildCoachConclusion([E({ exercise: 'Row', domain: 'cardio', status: 'improved', signals: ['improved'], priority: 70, nextAction: null })]);
  eq(c.nextAction, null); ok(C.conclusionText(c).indexOf('volgende stap') === -1);
});
T('domeinen correct gedetecteerd (strength + cardio)', () => {
  const c = C.buildCoachConclusion([E({ domain: 'strength', status: 'improved', signals: ['improved'], priority: 70 }), E({ domain: 'cardio', status: 'stable', signals: ['stable'], priority: 40 })]);
  eq(c.domains.strength, true); eq(c.domains.cardio, true);
});
T('conclusie is deterministisch', () => {
  const arr = [E({ exercise: 'Bench', status: 'improved', signals: ['improved', 'new_best'], priority: 100, best: '105 kg', nextAction: 'Verhogen (+2,5 kg)' })];
  eq(JSON.stringify(C.buildCoachConclusion(arr)), JSON.stringify(C.buildCoachConclusion(arr)));
  eq(C.conclusionText(C.buildCoachConclusion(arr)), C.conclusionText(C.buildCoachConclusion(arr)));
});
T('conclusie bevat GEEN reken-inputs (rpe/kg) — puur presentatie', () => {
  // Zelfs als een entry vervuild is, mag de conclusie-tekst nooit rauwe reken-inputs verwoorden
  // (die zitten niet in de gebruikte velden). We controleren dat de tekst alleen presentatiewaarden gebruikt.
  const c = C.buildCoachConclusion([E({ exercise: 'Bench', status: 'improved', signals: ['improved'], priority: 70, previous: '100 kg', current: '105 kg', rpe: 7, kg: 100 })]);
  const t = C.conclusionText(c);
  ok(t.indexOf('RPE') === -1 && t.indexOf('@') === -1, 'geen rauwe rpe/@ in conclusie');
});
T('VERSIONS.conclusion aanwezig', () => eq(C.VERSIONS.conclusion, 'coaching_conclusion.v1'));
T('headline: deterministisch kort kop-label per overall (F14)', () => {
  eq(C.buildCoachConclusion([E({ status: 'improved', signals: ['improved', 'new_best'], priority: 100 })]).headline, 'Nieuw persoonlijk record');
  eq(C.buildCoachConclusion([E({ status: 'improved', signals: ['improved'], priority: 70 })]).headline, 'Sterker dan vorige keer');
  eq(C.buildCoachConclusion([E({ status: 'declined', signals: ['declined'], priority: 60 })]).headline, 'Rustiger dan vorige keer');
  eq(C.buildCoachConclusion([E({ status: 'stable', signals: ['stable'], priority: 40 })]).headline, 'Niveau vastgehouden');
  eq(C.buildCoachConclusion([E({ status: 'first', signals: ['first_session'], priority: 35 })]).headline, 'Eerste registratie');
  eq(C.buildCoachConclusion([E({ status: 'improved', signals: ['improved'], priority: 70 }), E({ status: 'declined', signals: ['declined'], priority: 60 })]).headline, 'Wisselend beeld');
  eq(C.buildCoachConclusion([]).headline, ''); // geen data -> geen kop
});

// ================= L. KEY-INSIGHT-semantiek (F10.9) + neutraliteit (F10.3) =================
// Borgt PERMANENT dat de sporter het JUISTE onthoudt: een record leidt boven een daling,
// en een daling wordt nooit beschuldigend gepresenteerd. Pure lock-tests, geen runtime.
console.log('\n[L] F10.9 key-insight + F10.3 neutrale daling (locks)');
T('record + daling in dezelfde sessie -> conclusie LEIDT met het record (niet met de daling)', () => {
  const c = C.buildCoachConclusion([
    E({ exercise: 'Deadlift', status: 'improved', signals: ['improved', 'new_best'], priority: 100, best: '180 kg', current: '180 kg', previous: '175 kg' }),
    E({ exercise: 'Bench', domain: 'strength', status: 'declined', signals: ['declined'], priority: 60, current: '95 kg', previous: '100 kg' })
  ]);
  eq(c.overall, 'new_best'); eq(c.tone, 'positive'); eq(c.lead.exercise, 'Deadlift');
  const t = C.conclusionText(c);
  ok(t.indexOf('Nieuw persoonlijk record') === 0, 'record moet vooropstaan'); ok(t.indexOf('lager') === -1, 'daling niet uitlichten bij een PR-sessie');
});
T('alleen daling -> neutraal/aanmoedigend, GEEN beschuldigende taal', () => {
  const c = C.buildCoachConclusion([E({ exercise: 'Squat', status: 'declined', signals: ['declined'], priority: 60, current: '130 kg', previous: '140 kg' })]);
  eq(c.overall, 'declined'); eq(c.tone, 'encouraging');
  const t = C.conclusionText(c).toLowerCase();
  ['slechter', 'gefaald', 'faalde', 'teleurstellend', 'zwak'].forEach(function (w) { ok(t.indexOf(w) === -1, 'verboden beschuldigend woord: ' + w); });
  ok(t.indexOf('hoeft geen probleem') !== -1, 'daling moet neutraal geframed worden');
});
T('key-insight prioriteit new_best > trend_up > improved (lead volgt priority)', () => {
  const c = C.buildCoachConclusion([
    E({ exercise: 'A', status: 'improved', signals: ['improved'], priority: 70 }),
    E({ exercise: 'B', status: 'improved', signals: ['improved', 'trend_up'], priority: 80 }),
    E({ exercise: 'C', status: 'improved', signals: ['improved', 'new_best'], priority: 100 })
  ]);
  eq(c.lead.exercise, 'C');
});
T('nextAction wordt NOOIT gesynthetiseerd als geen enkele oefening er een heeft', () => {
  const c = C.buildCoachConclusion([E({ exercise: 'Row', domain: 'cardio', status: 'improved', signals: ['improved'], priority: 70, nextAction: null })]);
  eq(c.nextAction, null); eq(c.nextActionExercise, null);
  ok(C.conclusionText(c).indexOf('volgende stap') === -1, 'geen verzonnen volgende stap');
});

// ================= M. explainProgression (S2 "Waarom dit advies?") =================
console.log('\n[M] explainProgression — verwoordt de reeds-genomen DecisionCore-beslissing');
const DC = require('./decision.js');
T('increase -> uitleg noemt "verhogen"-zone, met kg + RPE uit de beslissing', () => {
  const d = DC.progressionDecision(7, 100); // rpe laag -> increase
  const t = C.explainProgression(d);
  ok(t.indexOf('100 kg') !== -1 && t.indexOf('RPE 7') !== -1, 'kg/RPE uit inputs');
  ok(t.toLowerCase().indexOf('verhogen') !== -1, 'noemt verhogen-zone');
});
T('hold -> uitleg "gelijk houden"', () => {
  const d = DC.progressionDecision(8, 100);
  ok(C.explainProgression(d).toLowerCase().indexOf('gelijk') !== -1);
});
T('deload -> uitleg "terugbouwen", niet-veroordelend', () => {
  const d = DC.progressionDecision(9, 100);
  const t = C.explainProgression(d).toLowerCase();
  ok(t.indexOf('terug') !== -1); ok(t.indexOf('zwaar') !== -1);
});
T('geen/ongeldige beslissing -> lege string (geen verzonnen uitleg)', () => {
  eq(C.explainProgression(null), ''); eq(C.explainProgression({}), ''); eq(C.explainProgression(DC.progressionDecision(null, 100)), '');
});
T('explainProgression rekent niets zelf uit (leest alleen het beslissing-object)', () => {
  // een handmatig object met afwijkende inputs wordt letterlijk verwoord, niet herberekend
  const t = C.explainProgression({ outcome: 'increase', inputs: { rpe: 6, curKg: 82.5 } });
  ok(t.indexOf('82.5 kg') !== -1 && t.indexOf('RPE 6') !== -1);
});
T('deterministisch', () => { const d = DC.progressionDecision(7, 100); eq(C.explainProgression(d), C.explainProgression(d)); });

// ================= N. styleProgression (coachstijl — presentatie-only) =================
console.log('\n[N] styleProgression — coachstijl presenteert dezelfde beslissing anders');
T('increase: elke stijl noemt +2.5 kg en richting +', () => {
  const d = DC.progressionDecision(7, 100);
  C.COACH_STYLES.forEach(st => { const t = C.styleProgression(d, st); ok(t.indexOf('2.5 kg') !== -1, st + ': ' + t); ok(t.indexOf('+') !== -1, 'richting + ontbreekt bij ' + st); });
});
T('deload: elke stijl noemt 7.5 kg en richting −', () => {
  const d = DC.progressionDecision(9, 100);
  C.COACH_STYLES.forEach(st => { const t = C.styleProgression(d, st); ok(t.indexOf('7.5 kg') !== -1, st + ': ' + t); ok(t.indexOf('−') !== -1, 'richting − ontbreekt bij ' + st); });
});
T('hold: elke stijl zegt gelijk/zelfde houden', () => {
  const d = DC.progressionDecision(8, 100);
  C.COACH_STYLES.forEach(st => { const t = C.styleProgression(d, st).toLowerCase(); ok(/gelijk|zelfde|vast/.test(t), st + ': ' + t); });
});
T('CONTRACT: stijl wijzigt outcome/deltaKg NIET (DecisionCore leidend)', () => {
  const d = DC.progressionDecision(7, 100);
  const before = { outcome: d.outcome, deltaKg: d.deltaKg };
  C.COACH_STYLES.forEach(st => C.styleProgression(d, st));
  eq(d.outcome, before.outcome); eq(d.deltaKg, before.deltaKg);
});
T('onbekende stijl -> terugval op balanced', () => {
  const d = DC.progressionDecision(7, 100);
  eq(C.styleProgression(d, 'onzin'), C.styleProgression(d, 'balanced'));
});
T('geen beslissing -> lege string', () => { eq(C.styleProgression(null, 'direct'), ''); eq(C.styleProgression({}, 'direct'), ''); });
T('leest deltaKg uit het object (rekent niet zelf)', () => {
  const t = C.styleProgression({ outcome: 'increase', deltaKg: 5, inputs: { rpe: 6, curKg: 80 } }, 'direct');
  ok(t.indexOf('5 kg') !== -1, t);
});
T('deterministisch per stijl', () => { const d = DC.progressionDecision(7, 100); eq(C.styleProgression(d, 'motivating'), C.styleProgression(d, 'motivating')); });

console.log('\n' + '='.repeat(56));
console.log('RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail > 0) { console.log('⚠ STOP: coaching-core faalt.'); process.exit(1); }
console.log('✅ Alle coaching-tests groen.');
