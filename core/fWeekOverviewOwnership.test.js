/* fWeekOverviewOwnership.test.js — GAP-P4-003: tkWeekOverview() leest program_blocks uitsluitend via de
 * owner-chain (programs.user_id → program_id=in.) met dezelfde canonical helper als de Context-adapter
 * (tkOwnedProgramBlocksInWindow). Echte productiefuncties + stub-DB (alleen rijen).
 *
 * Draai: node core/fWeekOverviewOwnership.test.js
 */
'use strict';
const fs = require('fs'); const path = require('path'); const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const CalcCore = require(path.join(ROOT, 'core/calculation.js'));
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
const FNS = ['tkWeekOverview', 'tkOwnedProgramBlocksInWindow', 'tkOwnedProgramBlocks', 'weekBounds', 'isoWeekday', 'addDaysStr', 'renderKalender', 'inzichtRenderDevelopment'];
const SRC = {}; FNS.forEach((n) => { SRC[n] = extractFn(n); ok(SRC[n], 'functie gevonden: ' + n); });
const T = '2026-09-14';
const PROGRAMS = { A: [{ id: 'pA' }], B: [{ id: 'pB' }] };
const BLOCKS = { pA: [{ id: 'bA', planned_date: '2026-09-15', completed_at: null }], pB: [{ id: 'bB1', planned_date: '2026-09-15' }, { id: 'bB2', planned_date: '2026-09-16' }] };
function sandbox(uid, mode) {
  const calls = [];
  const ctx = {
    CalcCore, console, Date, Promise, Math, Set, Object, Array, String, Number, isNaN, isFinite, parseFloat, encodeURIComponent, window: {},
    td: () => T, authSession: uid ? { user: { id: uid } } : null,
    tkPrTimeline: async () => [], computeProgramProgress: async (b) => ({ n: b.length }), computeExerciseTrends: async () => ({}),
    sbGet: async (t, q) => {
      calls.push(t + q);
      if (t === 'programs') { if (mode === 'throw') throw new Error('db'); if (mode === 'none') return []; const m = /user_id=eq\.([^&]+)/.exec(q); return PROGRAMS[m && m[1]] || []; }
      if (t === 'program_blocks') { const m = /program_id=in\.\(([^)]*)\)/.exec(q); if (!m) return [].concat(BLOCKS.pA, BLOCKS.pB); return m[1].split(',').flatMap((id) => BLOCKS[id] || []); }
      return [];
    }
  };
  vm.createContext(ctx); vm.runInContext(FNS.map((n) => SRC[n]).join('\n'), ctx); ctx._calls = calls; return ctx;
}
(async () => {
  // statisch: geen ongescoopte program_blocks-read meer; canonical helper hergebruikt
  ok(!/sbGet\('program_blocks'/.test(SRC.tkWeekOverview) && /tkOwnedProgramBlocksInWindow\(authSession\?\.user\?\.id\|\|null, maandag, zondag\)/.test(SRC.tkWeekOverview), 'A: tkWeekOverview leest program_blocks uitsluitend via tkOwnedProgramBlocksInWindow (zelfde helper als #351)');
  // repo-brede gate: ELKE program_blocks-read (sbGet/sbGetOrFail/v43SafeGet/inzichtGetOrNull) moet op program_id of id scopen
  const code = html.replace(/\/\/[^\n]*/g, '');
  const unscoped = code.split('\n').filter((l) => /(sbGet|sbGetOrFail|v43SafeGet|inzichtGetOrNull)\('program_blocks'/.test(l) && !/program_id|id=eq\./.test(l));
  eq(unscoped.length, 0, 'A (repo-wide): geen enkele program_blocks-read zonder program_id/id-scoping in index.html (alle read-helpers)');
  ok(/tkOwnedProgramBlocks\(authSession\?\.user\?\.id\|\|null,'&order=week_nr\.asc'\)/.test(SRC.renderKalender) && !/v43SafeGet\('program_blocks'/.test(SRC.renderKalender), 'A (GAP-P4-004): renderKalender via owner-helper');
  ok(/tkOwnedProgramBlocks\(authSession\?\.user\?\.id\|\|null,'&order=planned_date\.desc&limit=200',\{nullOnError:true\}\)/.test(SRC.inzichtRenderDevelopment) && !/inzichtGetOrNull\('program_blocks'/.test(SRC.inzichtRenderDevelopment), 'A (GAP-P4-004): inzichtRenderDevelopment via owner-helper (null = niet beschikbaar behouden)');
  eq((code.match(/async function tkOwnedProgramBlocks\(/g) || []).length, 1, 'A: exact één generieke owner-helper (geen duplicaat)');
  ok(/return tkOwnedProgramBlocks\(uid,'&planned_date=gte\.'\+vanaf\+'&planned_date=lte\.'\+today\)/.test(SRC.tkOwnedProgramBlocksInWindow), 'A: window-helper delegeert aan de generieke helper');
  // cross-user
  const a = sandbox('A'); const wA = await a.tkWeekOverview();
  eq(wA.gepland, 1, 'B: user A ziet alleen block A (gepland 1)');
  ok(a._calls.some((q) => q === 'programs&user_id=eq.A&select=id') && a._calls.some((q) => q.startsWith('program_blocks&program_id=in.(pA)&planned_date=gte.')), 'B: owner-chain programs.user_id → program_id=in.(pA)');
  ok(!a._calls.some((q) => q.startsWith('program_blocks&planned_date')), 'B: nooit een ongescoopte blocks-query');
  const b = sandbox('B'); const wB = await b.tkWeekOverview(); eq(wB.gepland, 2, 'B: user B ziet alleen zijn 2 blocks');
  ok(wA.progress && wA.progress.n === 1 && wB.progress.n === 2, 'B: progress berekend NA ownership-filter');
  // fail-safe
  const z = sandbox('A', 'none'); const wZ = await z.tkWeekOverview();
  ok(wZ.gepland === 0 && wZ.progress === null && !z._calls.some((q) => q.startsWith('program_blocks')), 'C: nul eigen programma\'s → gepland 0, geen progress, geen blocks-query');
  const e = sandbox('A', 'throw'); const wE = await e.tkWeekOverview();
  ok(wE.gepland === 0 && !e._calls.some((q) => q.startsWith('program_blocks')), 'D: ownership-lookup gooit → [] (fail-safe), geen ongescoopte fallback');
  const n = sandbox(null); const wN = await n.tkWeekOverview();
  ok(wN.gepland === 0 && !n._calls.some((q) => q.startsWith('programs') || q.startsWith('program_blocks')), 'D: geen uid → geen programs-/blocks-query');
  // generieke helper: extraQ toegevoegd NA de program_id-scope; nullOnError-semantiek
  const g = sandbox('A'); const rows = await g.tkOwnedProgramBlocks('A', '&order=week_nr.asc');
  ok(rows.length === 1 && g._calls.some((q) => q === 'program_blocks&program_id=in.(pA)&order=week_nr.asc'), 'F: generieke helper: program_id-scope vóór extraQ (kalender-variant)');
  const gN = sandbox('A', 'throw'); eq(await gN.tkOwnedProgramBlocks('A', '&limit=200', { nullOnError: true }), null, 'F: nullOnError → null bij lookup-fout (Inzicht-semantiek), geen ongescoopte read');
  ok(!gN._calls.some((q) => q.startsWith('program_blocks')), 'F: bij fout geen program_blocks-query');
  const gZ = sandbox('A', 'none'); const rz = await gZ.tkOwnedProgramBlocks('A', '&limit=200', { nullOnError: true }); ok(Array.isArray(rz) && rz.length === 0, 'F: nul programma\'s → [] (ook met nullOnError: geen "niet beschikbaar" maar leeg)');
  // overige weekoverzicht-semantiek ongewijzigd (sessions/PR/trends onafhankelijk van ownership-fix)
  ok(wA.maandag && wA.zondag && wA.uniekeDagen === 0 && wA.volumeKg === null && Array.isArray(wA.prsDezeWeek), 'E: overige velden ongewijzigd (sessions-/PR-/trendlogica niet geraakt)');
  ok(/tkOwnedProgramBlocksInWindow\(uid, vanaf, today\)/.test(extractFn('tkInactivityAdherenceContext')), 'E: Context-adapter blijft dezelfde helper gebruiken (geen tweede owner-logica)');
  if (msgs.length) console.log(msgs.join('\n'));
  console.log('fWeekOverviewOwnership: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log('EXCEPTIE: ' + (e && e.stack)); process.exit(1); });
