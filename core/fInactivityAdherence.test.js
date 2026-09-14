/* fInactivityAdherence.test.js — GAP-P3-031b: CALC-ACT-001 inactivity.v1 + CALC-ACT-002 adherence.v1 → Context.
 * Echte core (core/inactivityAdherence.js, ScheduleAdherenceCore) + echte adapterfuncties uit index.html
 * (tkInactivityAdherenceContext/tkInactivityAdherenceText/tkLocalDayFromIso) met stub-sbGet (alleen rijen).
 * Bewijst tevens dat geen enkele nieuwe metric een voorschrift (weight/sets/RPE) of DecisionCore raakt.
 *
 * Draai: node core/fInactivityAdherence.test.js
 */
'use strict';
const fs = require('fs'); const path = require('path'); const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const IA = require(path.join(ROOT, 'core/inactivityAdherence.js'));
const SA = require(path.join(ROOT, 'core/scheduleAdherence.js'));
let pass = 0, fail = 0; const msgs = [];
function ok(c, l) { if (c) pass++; else { fail++; msgs.push('MISLUKT: ' + l); } }
function eq(a, b, l) { ok(a === b, l + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')'); }
function extractFn(name) {
  const re = new RegExp('(?:async\\s+)?function\\s+' + name + '\\s*\\(');
  const m = re.exec(html); if (!m) return null;
  let i = html.indexOf('{', m.index), d = 0;
  for (let j = i; j < html.length; j++) { if (html[j] === '{') d++; else if (html[j] === '}') { d--; if (d === 0) return html.slice(m.index, j + 1); } }
  return null;
}
const T = '2026-09-14'; const dAgo = (n) => new Date(Date.parse(T + 'T00:00:00Z') - n * 86400000).toISOString().slice(0, 10);

// ── CALC-ACT-001 inactivity ──
let r = IA.inactivity({ today: T, strengthSessions: [{ date: dAgo(1) }], allSessions: [{ date: dAgo(1) }], activities: [] });
eq(r.strength.daysSince, 1, '1: kracht gisteren → daysSinceLastStrengthTraining 1'); eq(r.overall.daysSince, 1, '1: overall 1');
r = IA.inactivity({ today: T, strengthSessions: [{ date: dAgo(21) }], allSessions: [{ date: dAgo(21) }], activities: [{ sport: 'cycling', localDate: dAgo(1) }] });
eq(r.strength.daysSince, 21, '2: 21 d geen kracht, cycling gisteren → strength 21'); eq(r.overall.daysSince, 1, '2: overall 1 (cycling)');
eq(r.enduranceBySport.cycling.daysSince, 1, '2/10: cycling 1'); eq(r.enduranceBySport.running.daysSince, null, '10: running geen data → null');
r = IA.inactivity({ today: T, strengthSessions: [{ date: dAgo(21) }], allSessions: [{ date: dAgo(21) }], activities: [] });
ok(r.strength.daysSince === 21 && r.overall.daysSince === 21 && r.endurance.daysSince === null, '3: 21 d helemaal niets → strength 21, overall 21, endurance null');
r = IA.inactivity({ today: T, strengthSessions: [], allSessions: [], activities: [] });
ok(r.overall.daysSince === null && r.strength.daysSince === null && r.dataQuality === 'no_history', '9: geen historie → null/no_history, geen 0');
r = IA.inactivity({ today: null, strengthSessions: [{ date: dAgo(1) }], allSessions: [{ date: dAgo(1) }] });
ok(r.overall.daysSince === null && r.dataQuality === 'no_reference_date', '9: geen referentiedatum → null');
r = IA.inactivity({ today: T, strengthSessions: [{ date: 'abc' }], allSessions: [{ date: undefined }], activities: [{ sport: 'running', localDate: null }] });
ok(r.strength.daysSince === null && r.endurance.daysSince === null, '9: ongeldige datums → null (geen NaN)');
r = IA.inactivity({ today: T, strengthSessions: [{ date: dAgo(5) }], allSessions: [{ date: dAgo(5) }, { date: dAgo(2) }], activities: [{ sport: 'running', localDate: dAgo(9) }, { sport: 'swimming', localDate: dAgo(4) }] });
ok(r.strength.daysSince === 5 && r.overall.daysSince === 2 && r.endurance.daysSince === 4 && r.enduranceBySport.running.daysSince === 9 && r.enduranceBySport.swimming.daysSince === 4, '8/10: ad-hoc erg-sessie (sessions zonder gewicht) telt voor overall (2 d), niet voor kracht (5 d); per-sport correct');
eq(IA.daysBetween('2026-03-28', '2026-03-30'), 2, '14: kalenderdagen over DST-overgang (NL 29 mrt) exact 2, geen off-by-one');
eq(IA.daysBetween('2026-10-24', '2026-10-26'), 2, '14: DST-terug (25 okt) exact 2');

// ── CALC-ACT-002 adherence ──
const blk = (d, done, st) => ({ planned_date: d, completed_at: done ? d + 'T10:00:00Z' : null, schedule_status: st || null });
let a = IA.adherence({ today: T, windowDays: 28, programBlocks: [blk(dAgo(3), true)], occurrences: [], assignments: [] });
ok(a.planned === 1 && a.completed === 1 && a.missed === 0 && a.adherencePct === 100, '4: gepland + uitgevoerd → completed, niet missed');
a = IA.adherence({ today: T, windowDays: 28, programBlocks: [blk(dAgo(3), false)], occurrences: [], assignments: [] });
ok(a.planned === 1 && a.missed === 1 && a.adherencePct === 0 && a.missedStreak === 1, '5: verlopen, niet uitgevoerd, niet geskipt → MISSED (canonical ScheduleAdherenceCore)');
eq(SA.resolveScheduleGap(dAgo(3), T, null, null), 'MISSED', '5: zelfde semantiek als ScheduleAdherenceCore.resolveScheduleGap');
a = IA.adherence({ today: T, windowDays: 28, programBlocks: [blk(dAgo(1), true, 'rescheduled')], occurrences: [], assignments: [] });
ok(a.planned === 1 && a.completed === 1 && a.missed === 0, '6: verplaatst (rescheduled, nieuwe datum) + uitgevoerd → één keer completed, niet ook missed');
a = IA.adherence({ today: T, windowDays: 28, programBlocks: [], occurrences: [{ id: 'o1', planned_date: dAgo(2), status: 'planned' }], assignments: [] });
ok(a.planned === 1 && a.missed === 1, '5: occurrence zonder completed/skipped assignment en verlopen → MISSED');
a = IA.adherence({ today: T, windowDays: 28, programBlocks: [], occurrences: [{ id: 'o2', planned_date: dAgo(2), status: 'planned' }], assignments: [{ occurrence_id: 'o2', status: 'completed', training_instance_id: 'ti' }] });
ok(a.completed === 1 && a.missed === 0, '4: occurrence met completed assignment (instance-link) → completed');
a = IA.adherence({ today: T, windowDays: 28, programBlocks: [], occurrences: [{ id: 'o3', planned_date: dAgo(2), status: 'planned' }], assignments: [{ occurrence_id: 'o3', status: 'skipped' }] });
ok(a.skipped === 1 && a.missed === 0 && a.adherencePct === 0, '5: bewust geskipt → SKIPPED, niet missed (telt wel als beoordeeld)');
a = IA.adherence({ today: T, windowDays: 28, programBlocks: [], occurrences: [{ id: 'o4', planned_date: dAgo(2), status: 'cancelled' }], assignments: [] });
ok(a.planned === 0 && a.missed === 0 && a.adherencePct === null && a.dataQuality === 'no_planning', '6/7: geannuleerde occurrence uitgesloten; geen planning → planned 0, pct null (niet 0), niet missed');
a = IA.adherence({ today: T, windowDays: 28, programBlocks: [], occurrences: [], assignments: [] });
ok(a.planned === 0 && a.missed === 0 && a.missedStreak === 0 && a.adherencePct === null, '7: geen training gepland → niet missed, pct null');
a = IA.adherence({ today: T, windowDays: 28, programBlocks: [blk(T, false), blk(dAgo(40), false)], occurrences: [], assignments: [] });
ok(a.planned === 1 && a.pending === 1 && a.missed === 0 && a.adherencePct === null, 'vandaag gepland → pending (nog niet beoordeelbaar); buiten venster genegeerd');
a = IA.adherence({ today: T, windowDays: 28, programBlocks: [blk(dAgo(10), true), blk(dAgo(6), false), blk(dAgo(3), false), blk(dAgo(1), false, 'skipped')], occurrences: [], assignments: [] });
ok(a.planned === 4 && a.completed === 1 && a.missed === 2 && a.skipped === 1 && a.adherencePct === 25 && a.missedStreak === 0, 'streak stopt bij laatste beoordeelde (skipped) → 0; pct 1/4');
a = IA.adherence({ today: T, windowDays: 28, programBlocks: [blk(dAgo(10), true), blk(dAgo(6), false), blk(dAgo(3), false)], occurrences: [], assignments: [] });
eq(a.missedStreak, 2, 'missedStreak 2 (laatste twee geplande gemist)');
ok(!/\b(14|80)\b.*(slecht|goed)|drempel|threshold/.test(fs.readFileSync(path.join(ROOT, 'core/inactivityAdherence.js'), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '')), 'geen productheuristische drempel in de core (code, excl. commentaar)');

// ── Adapter (echte functies, stub-sbGet) ──
const FNS = ['tkInactivityAdherenceContext', 'tkInactivityAdherenceText', 'tkLocalDayFromIso', 'tkOwnedProgramBlocksInWindow', 'tkOwnedProgramBlocks'];
const SRC = {}; FNS.forEach((n) => { SRC[n] = extractFn(n); ok(SRC[n], 'adapterfunctie gevonden: ' + n); });
const CONSTS = (html.match(/var TK_ACT_ADHERENCE_WINDOW_DAYS=\d+, TK_ACT_ACTIVITIES_LIMIT=\d+;/) || [''])[0]; ok(CONSTS, 'begrenzingsconstanten gevonden');
function sandbox(db) {
  const calls = [];
  const ctx = { InactivityAdherenceCore: IA, console, Date, Promise, Math, Object, Array, String, Number, isNaN, isFinite, window: {}, td: () => T, authSession: { user: { id: 'u1' } },
    sbGet: async (t, q) => { calls.push(t + q); const f = db[t]; if (!f) return []; return f(q); } };
  ctx.encodeURIComponent = encodeURIComponent;
  vm.createContext(ctx); vm.runInContext(CONSTS + '\n' + FNS.map((n) => SRC[n]).join('\n'), ctx); ctx._calls = calls; return ctx;
}
(async () => {
  const db = {
    sessions: (q) => q.includes('weight=not.is.null') ? [{ date: dAgo(21), weight: 100, reps: 5 }] : [{ date: dAgo(21) }],
    activities: () => [{ sport: 'cycling', recorded_at: dAgo(1) + 'T18:30:00+02:00' }],
    programs: (q) => q.includes('user_id=eq.u1') ? [{ id: 'pA' }] : [],
    program_blocks: (q) => q.includes('program_id=in.(pA)') ? [blk(dAgo(3), false), blk(dAgo(8), true)] : [{ planned_date: dAgo(1), completed_at: null, schedule_status: null }, blk(dAgo(3), false), blk(dAgo(8), true)],
    planned_training_occurrences: () => [{ id: 'o1', planned_date: dAgo(2), status: 'planned' }],
    planned_training_assignments: () => [{ occurrence_id: 'o1', status: 'completed', training_instance_id: 'ti' }]
  };
  const c = sandbox(db); const txt = await c.tkInactivityAdherenceContext();
  ok(/Dagen sinds laatste krachttraining: 21 d/.test(txt) && /overall\): 1 d/.test(txt) && /cycling 1 d/.test(txt), '2/11: Context: strength 21 d, overall 1 d, cycling 1 d (zelfde calculated waarden)');
  ok(/3 gepland · 2 uitgevoerd · 0 bewust overgeslagen · 1 gemist/.test(txt) && /uitgevoerd\/beoordeeld 67%/.test(txt), '11: Context: planning 3 gepland, 2 uitgevoerd, 1 gemist, 67%');
  ok(/reeds berekend/.test(txt) && /beschrijvend, geen voorschrift/.test(txt) && /ad-hoc trainingen tellen mee voor inactiviteit, niet voor planning/.test(txt), '12/13: contexttekst = beschrijvend, geen voorschrift');
  const st = c.window._tkInactivityAdherence; eq(st.inactivity.strength.daysSince, 21, '11: provenance-object = calculated object'); eq(st.adherence.missed, 1, '11: adherence-object beschikbaar');
  ok(c._calls.every((q) => /limit=(1|60)|planned_date=gte\.|occurrence_id=in\.|programs&user_id=eq\./.test(q)), 'begrensde queries (limit 1/60, datumvenster, occurrence-id-set of eigen programma-lookup)');
  ok(c._calls.some((q) => q === 'programs&user_id=eq.u1&select=id') && c._calls.some((q) => q.startsWith('program_blocks&program_id=in.(pA)&planned_date=gte.')), 'A: program_blocks uitsluitend via eigen programma-id\'s (owner chain programs.user_id → program_id=in.)');
  ok(!c._calls.some((q) => q.startsWith('program_blocks&planned_date')), 'A/B: nooit een ongescoopte program_blocks-query');
  ok(c._calls.some((q) => q.startsWith('planned_training_assignments&occurrence_id=in.(o1)&athlete_user_id=eq.u1')), 'assignments alleen voor eigen occurrences/athlete');
  const c2 = sandbox({ sessions: () => [], activities: () => [], program_blocks: () => [], planned_training_occurrences: () => [] }); const t2 = await c2.tkInactivityAdherenceContext();
  ok(/geen geregistreerde training/.test(t2) && /geen geplande trainingen \(geen planning ≠ gemist\)/.test(t2), '7/9: geen data → eerlijke tekst, geen 0 dagen, geen gemist');
  // ── Security/ownership ──
  const base = { sessions: () => [], activities: () => [], planned_training_occurrences: () => [] };
  // B: vreemde blocks in hetzelfde venster worden uitgesloten (alleen pA-blocks tellen)
  const cB = sandbox(Object.assign({}, base, { programs: (q) => q.includes('user_id=eq.u1') ? [{ id: 'pA' }] : [], program_blocks: (q) => q.includes('program_id=in.(pA)') ? [blk(dAgo(2), true)] : [blk(dAgo(2), true), blk(dAgo(1), false), blk(dAgo(4), false)] }));
  await cB.tkInactivityAdherenceContext(); const sB = cB.window._tkInactivityAdherence.adherence;
  ok(sB.planned === 1 && sB.completed === 1 && sB.missed === 0, 'A/B: alleen eigen blocks (1 completed) — vreemde blocks in hetzelfde venster tellen niet mee');
  // C: geen eigen programma's → planned 0, geen program_blocks-query
  const cC = sandbox(Object.assign({}, base, { programs: () => [], program_blocks: () => [blk(dAgo(1), false)] }));
  await cC.tkInactivityAdherenceContext(); const sC = cC.window._tkInactivityAdherence.adherence;
  ok(sC.planned === 0 && sC.missed === 0 && sC.adherencePct === null && !cC._calls.some((q) => q.startsWith('program_blocks')), 'C: nul eigen programma\'s → planned 0/missed 0/pct null en GEEN program_blocks-query');
  // D: ownership-lookup faalt → fail-safe, geen ongescoopte read
  const cD = sandbox(Object.assign({}, base, { programs: () => { throw new Error('db'); }, program_blocks: () => [blk(dAgo(1), false)] }));
  await cD.tkInactivityAdherenceContext(); const sD = cD.window._tkInactivityAdherence.adherence;
  ok(sD.planned === 0 && sD.missed === 0 && !cD._calls.some((q) => q.startsWith('program_blocks')), 'D: eigenaarschap niet bepaalbaar → [] (fail-safe), geen program_blocks-query, geen fallback naar alle blokken');
  const cE = sandbox(Object.assign({}, base, { programs: () => [{ id: 'pA' }], program_blocks: () => [blk(dAgo(1), false)] })); cE.authSession = null;
  await cE.tkInactivityAdherenceContext(); ok(!cE._calls.some((q) => q.startsWith('program_blocks') || q.startsWith('programs')), 'D: geen ingelogde gebruiker → geen programs-/program_blocks-query');
  ok(/if\(!ids\.length\)return \[\];/.test(SRC.tkOwnedProgramBlocks) && /'&program_id=in\.\('\+ids\.map\(encodeURIComponent\)\.join\(','\)\+'\)/.test(SRC.tkOwnedProgramBlocks) && /catch\(_\)\{ return onErr; \}/.test(SRC.tkOwnedProgramBlocks) && /return tkOwnedProgramBlocks\(uid,'&planned_date=gte\./.test(SRC.tkOwnedProgramBlocksInWindow), 'statisch: lege id-lijst → [], id-lijst uit programs.user_id, catch → []/null (nooit unscoped); window-helper delegeert');
  ok(!/sbGet\('program_blocks'/.test(SRC.tkInactivityAdherenceContext) && /tkOwnedProgramBlocksInWindow\(uid, vanaf, today\)/.test(SRC.tkInactivityAdherenceContext), 'statisch: adapter leest program_blocks uitsluitend via de owner-helper');
  const c3 = sandbox({ sessions: () => { throw new Error('db'); }, activities: () => { throw new Error('db'); }, programs: () => [], program_blocks: () => [], planned_training_occurrences: () => [] });
  ok(typeof (await c3.tkInactivityAdherenceContext()) === 'string', 'fail-safe: query-fout → string (leeg of partieel), geen crash');
  eq(c.tkLocalDayFromIso('2026-09-13T23:30:00+02:00'), new Date('2026-09-13T23:30:00+02:00').getFullYear() + '-' + String(new Date('2026-09-13T23:30:00+02:00').getMonth() + 1).padStart(2, '0') + '-' + String(new Date('2026-09-13T23:30:00+02:00').getDate()).padStart(2, '0'), '14: activities.recorded_at → lokale kalenderdag (zelfde td()-semantiek)');

  // ── 13/C: geen invloed op prescription/Decision ──
  const BUILD_CTX = extractFn('buildCtx') || '';
  ok(/tkInactivityAdherenceContext\(\)\.catch\(function\(\)\{ return ''; \}\)/.test(BUILD_CTX) && /\$\{inactivityAdherenceTekst\|\|''\}/.test(BUILD_CTX), 'Context consumeert de adapter (Promise.all + prompt)');
  const code = html.replace(/\/\/[^\n]*/g, '');
  ok(!/InactivityAdherenceCore|_tkInactivityAdherence/.test(extractFn('resolveWorkingWeight') + extractFn('applySessionRecovery') + extractFn('recoveryAdjustmentForToday') + extractFn('computeProgPrefill') + extractFn('canonicalNewExerciseItem') + extractFn('detrainingFactor')), '13: geen prescription-/readiness-/detraining-functie leest de nieuwe metrics');
  ok(!/InactivityAdherence|inactivity\.v1|adherence\.v1/.test(fs.readFileSync(path.join(ROOT, 'core/decision.js'), 'utf8')), 'C: DecisionCore kent de nieuwe metrics niet (geen nieuwe rule)');
  eq((code.match(/InactivityAdherenceCore\./g) || []).length, 2, 'C: exact 2 productie-aanroepen (inactivity + adherence) — alleen in de Context-adapter');
  ok(/\{maxDays:7,\s*factor:1\.00\}[\s\S]*\{maxDays:Infinity,\s*factor:0\.80\}/.test((html.match(/const DETRAINING_RULES_V1=\{[\s\S]*?\n\};/) || [''])[0]), 'DEC-DETRAIN-001 ongewijzigd (eigen exercise-level input)');
  ok(!/sessions'[^\n]*weight=not\.is\.null&reps=not\.is\.null&order=date\.desc&limit=1'/.test(SRC.tkInactivityAdherenceContext) === false, 'kracht-laatste-sessie: sessions met gewicht+reps (canonical kracht-definitie)');

  if (msgs.length) console.log(msgs.join('\n'));
  console.log('fInactivityAdherence: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log('EXCEPTIE: ' + (e && e.stack)); process.exit(1); });
