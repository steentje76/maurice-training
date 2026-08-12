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

console.log('\n' + '='.repeat(56));
console.log('RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail > 0) { console.log('⚠ STOP: coaching-core faalt.'); process.exit(1); }
console.log('✅ Alle coaching-tests groen.');
