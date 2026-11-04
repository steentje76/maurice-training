/* TK504 — fail-closed gate in ensureExerciseRowStatus (client defense-in-depth, NOT server authz).
 * Extracts the REAL functions from index.html; ECS/exercises/sbPostQ are mocks. Never touches Supabase.
 * Run: node core/tk504ShadowRowGate.test.js
 */
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
function extractFn(name){
  let start = html.indexOf('async function ' + name + '(');
  if (start < 0) start = html.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('not found: ' + name);
  let d = 0, end = -1;
  for (let j = html.indexOf('{', start); j < html.length; j++){
    const ch = html[j];
    if (ch === '{') d++; else if (ch === '}'){ d--; if (d === 0){ end = j; break; } }
  }
  return html.slice(start, end + 1);
}
const marker = 'const EX_CATALOG = ', cs = html.indexOf(marker) + marker.length;
const PUBLISHED = JSON.parse(html.slice(cs, html.indexOf('\n', cs)).trim().replace(/;$/, '')).catalog;

let exercises = [], _ensureRowInflight = {}, posted = [], mode = 'confirmed', CAT = {};
async function sbPostQ(t, row){ posted.push({ t, row }); return { status: mode }; }
function invalidateExPickerPool(){}
let sessionLog = {};
const ExerciseCatalogService = { byId: id => CAT[id] || null };
eval(extractFn('ensureExerciseRowStatus'));
eval(extractFn('tkSessieSchrijfOpts'));
eval(extractFn('tkSessieOptsVoor'));
eval(extractFn('ensureSessionExerciseRows'));

const src = { provider: 'movekit', provider_id: 'x-1' };
const mk = (id, extra) => Object.assign({ catalog_id: id, identity: { name: 'N ' + id, primary: [], secondary: [], category: 'strength' }, source: src }, extra || {});
let pass = 0, fail = 0;
const eq = (a, b, m) => { if (a === b) pass++; else { fail++; console.log('  FAIL ' + m + ' exp ' + JSON.stringify(b) + ' got ' + JSON.stringify(a)); } };
const reset = () => { exercises = []; posted = []; _ensureRowInflight = {}; mode = 'confirmed'; sessionLog = {}; CAT = {}; };

(async () => {
  // A. all 226 published ids keep old behavior (shadow write, then 'confirmed')
  eq(PUBLISHED.length, 226, '226 published');
  let okAll = 0, writes = 0;
  for (const c of PUBLISHED){
    reset(); CAT[c.catalog_id] = c;
    const s = await ensureExerciseRowStatus(c.catalog_id);
    if (s === 'confirmed') okAll++;
    writes += posted.length;
  }
  eq(okAll, 226, 'published: all confirmed'); eq(writes, 226, 'published: exactly one write each');
  const P0 = PUBLISHED[0].catalog_id;
  reset(); CAT[P0] = PUBLISHED[0]; mode = 'queued';
  eq(await ensureExerciseRowStatus(P0), 'queued', 'published: queued passes through');
  reset(); CAT[P0] = PUBLISHED[0]; exercises = [{ id: P0 }];
  eq(await ensureExerciseRowStatus(P0), 'exists', 'published + shadow present: exists'); eq(posted.length, 0, 'published + shadow: no write');

  // B. legacy non-TK ids unchanged
  reset(); eq(await ensureExerciseRowStatus('bench'), 'exists', 'legacy not in catalog'); eq(posted.length, 0, 'legacy no write');
  reset(); exercises = [{ id: 'my-custom-1' }]; eq(await ensureExerciseRowStatus('my-custom-1'), 'exists', 'custom in exercises');
  reset(); exercises = [{ id: 'uuid-123' }]; eq(await ensureExerciseRowStatus('uuid-123'), 'exists', 'personal row');
  reset(); eq(await ensureExerciseRowStatus(''), 'exists', 'empty id legacy behaviour'); eq(await ensureExerciseRowStatus(null), 'exists', 'null legacy behaviour');

  // Canonical guard must not make legacy owned rows depend on catalog availability.
  reset(); exercises = [{id:'legacy-owned'}];
  const savedById = ExerciseCatalogService.byId;
  ExerciseCatalogService.byId = () => { throw new Error('catalog temporarily unavailable'); };
  eq(await ensureExerciseRowStatus('legacy-owned'), 'exists', 'existing legacy row bypasses catalog lookup');
  eq(posted.length, 0, 'existing legacy row: no write when catalog unavailable');
  ExerciseCatalogService.byId = savedById;

  // C. denied before any write
  const denied = async (label, id, cat, withShadow) => {
    reset(); if (cat) CAT[id] = cat; if (withShadow) exercises = [{ id }];
    eq(await ensureExerciseRowStatus(id), 'rejected', label); eq(posted.length, 0, label + ': no write');
  };
  await denied('unknown TK id', 'TK-000999');
  await denied('unknown TK id + stale shadow row', 'TK-000999', null, true);
  await denied('pending _review', 'TK-000500', mk('TK-000500', { _review: { status: 'NOT_PUBLISHED' } }));
  await denied('pending _review + stale shadow', 'TK-000500', mk('TK-000500', { _review: { status: 'NOT_PUBLISHED' } }), true);
  const pc = mk('TK-000501'); pc.identity.category = 'pending_review';
  await denied('pending category', 'TK-000501', pc);
  await denied('pending category + stale shadow', 'TK-000501', pc, true);
  await denied('pending marker on non-TK id', 'legacy-x', mk('legacy-x', { _review: {} }));
  const ns = mk('TK-000502'); delete ns.source;
  await denied('missing source', 'TK-000502', ns);
  await denied('missing source + shadow', 'TK-000502', ns, true);
  await denied('unknown provider', 'TK-000503', mk('TK-000503', { source: { provider: 'other', provider_id: 'a' } }));
  await denied('missing provider_id', 'TK-000504', mk('TK-000504', { source: { provider: 'movekit' } }));
  await denied('catalog_id mismatch', 'TK-000505', mk('TK-000506'));
  const ni = mk('TK-000507'); delete ni.identity;
  await denied('missing identity', 'TK-000507', ni);
  await denied('malformed TK-prefixed id absent from catalog', 'TK-0000001', null);
  await denied('short TK-prefixed id', 'TK-1', null);

  // D. status / session-write veto contract
  reset(); CAT['TK-000500'] = mk('TK-000500', { _review: {} }); CAT[P0] = PUBLISHED[0];
  sessionLog = { 'TK-000500': [1] }; sessionLog[P0] = [1];
  const st = await ensureSessionExerciseRows([{ id: 'TK-000500' }, { id: P0 }, { id: 'TK-000998' }]);
  eq(st['TK-000500'], 'rejected', 'session rows: pending rejected');
  eq(st[P0], 'confirmed', 'session rows: published confirmed');
  eq(st['TK-000998'], undefined, 'session rows: no sessionLog entry skipped');
  let threw = null; try { tkSessieOptsVoor(st, 'TK-000500'); } catch (e) { threw = e.message; }
  eq(threw, 'exercise_row_rejected', 'session write vetoed for pending');
  eq(tkSessieOptsVoor(st, P0).queueOnly, false, 'published session write allowed');
  eq(posted.length, 1, 'only published id produced a shadow write');
  reset(); sessionLog = { 'TK-000998': [1] };
  const st2 = await ensureSessionExerciseRows([{ id: 'TK-000998' }]);
  eq(st2['TK-000998'], 'rejected', 'unknown TK with sessionLog rejected'); eq(posted.length, 0, 'unknown TK: no write');

  // E. ECS throwing fails closed (never writes)
  reset(); const orig = ExerciseCatalogService.byId; ExerciseCatalogService.byId = () => { throw new Error('boom'); };
  eq(await ensureExerciseRowStatus(P0), 'failed', 'ECS throws -> failed'); eq(posted.length, 0, 'ECS throws: no write'); ExerciseCatalogService.byId = orig;

  console.log('tk504ShadowRowGate: ' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
