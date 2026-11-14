'use strict';
// TK504 — own (legacy) exercises bound to MoveKit by NAME use the same protected route.
//
// Regression found on device (14 Nov 2026, TK Test 14 november): since #628 all 582
// catalog IDs are private, so the public provider no longer returns the original-226
// poster/video. Own exercises ("Bench Press", "Goblet Squat") carry no canonical ID; the
// private route only accepted canonical IDs, so 44 of the owner's 103 exercises lost
// their movement image (old APK: poster) and never got the video.
//
// Contract proven here on the REAL index.html functions (vm) + REAL MovementCore and
// bundled catalog:
//  - name-bound own exercise -> kind 'private-mp4' with the curated catalog ID, no raw URL;
//  - only the curated MovementCore mapping onto a real MoveKit catalog entry counts;
//  - a row carrying its own canonical/source identity never gets re-bound by name;
//  - explicit own video, unknown names and release OFF keep the existing behaviour;
//  - the execution hero shows the protected poster for private media.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const MovementCore = require('./movement.js');
const catalog = require('../exercise-catalog.json').catalog;
let checks = 0;
const ok = (v, m) => { assert.ok(v, m); checks++; };
const eq = (a, b, m) => { assert.deepEqual(a, b, m); checks++; };
function segment(start, end) {
  const a = html.indexOf(start), b = html.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, 'source segment ' + start);
  return html.slice(a, b);
}
function fn(name) {
  const st = html.indexOf('function ' + name + '(');
  if (st < 0) return '';
  let d = 0;
  for (let j = html.indexOf('{', st); j < html.length; j++) {
    if (html[j] === '{') d++; else if (html[j] === '}' && --d === 0) return html.slice(st, j + 1);
  }
  throw new Error('unbalanced ' + name);
}
const byId = new Map(catalog.map(c => [c.catalog_id, c]));
const ExerciseCatalogService = { byId: id => byId.get(id) || null, all: () => catalog };
const publicUrl = slug => 'https://maurice-art.netlify.app/videos/' + slug + '.mp4';
function provider(privateOn) {
  // Mirrors the shipped provider: in private mode no public URL/poster for 001..582.
  return {
    has: (id, type) => type === 'video' && byId.has(id) && !privateOn,
    resolve: (id, type) => (type === 'video' && byId.has(id) && !privateOn) ? publicUrl(byId.get(id).source.provider_id) : null,
    hasVideo: id => byId.has(id),
    video: id => byId.has(id) ? { file: 'videos/' + byId.get(id).source.provider_id + '.mp4' } : null,
    poster: id => (byId.has(id) && !privateOn) ? 'data:image/webp;base64,AAAA' : null
  };
}
const SRC = [fn('movekitCatalogIdForName'), fn('movekitPosterFor'), fn('resolveExerciseMedia')].join('\n');
function media(ex, privateOn = true) {
  const ctx = vm.createContext({
    ExerciseAssetProvider: provider(privateOn), ExerciseCatalogService, MovementCore,
    tk504PrivateEnabled: id => privateOn && typeof id === 'string' && /^TK-\d{6}$/.test(id) &&
      Number(id.slice(3)) >= 1 && Number(id.slice(3)) <= 582,
    input: ex, result: null
  });
  vm.runInContext(SRC + '\nresult=resolveExerciseMedia(input);', ctx);
  return ctx.result;
}
const own = (naam, extra) => Object.assign({ id: '0b0e0f00-1111-2222-3333-444455556666', naam, user_id: 'u', scope: 'personal' }, extra || {});

// 1. The device regression: own exercises bound by name get the protected video route.
for (const [naam, cid] of [['Goblet Squat', 'TK-000105'], ['Bench Press', 'TK-000019'], ['Barbell Deadlift', 'TK-000024'],
                           ['Kettlebell Swing', 'TK-000173'], ['Lat Pulldown', 'TK-000191']]) {
  const m = media(own(naam));
  eq([m.kind, m.catalogId, m.source], ['private-mp4', cid, 'movekit'], 'own "' + naam + '" -> protected route ' + cid);
  ok(!Object.hasOwn(m, 'src') && !JSON.stringify(m).includes('netlify.app'), 'no public URL for own "' + naam + '"');
  eq(m.provenance && m.provenance.binding, 'name_alias', 'provenance marks the name binding for "' + naam + '"');
}
// 2. Only the curated mapping onto a REAL MoveKit catalog entry counts.
for (const naam of ['Duurloop', 'CrossFit WOD', 'Rope Climb', 'Bestaat Niet Oefening', '', null]) {
  const m = media(own(naam));
  ok(m.kind !== 'private-mp4', 'no MoveKit binding for "' + naam + '"');
}
// 3. Identity claims are never overridden by name (existing #603 / provider-mismatch rules).
eq(media(own('Goblet Squat', { canonicalId: 'TK-000001', scope: 'personal' })).kind, 'none',
  'personal row with its own canonical claim is not re-bound by name');
eq(media(own('Goblet Squat', { source: { provider: 'movekit', provider_id: 'wrong-exercise' } })).kind, 'none',
  'row with a conflicting source claim is not re-bound by name');
{ const m = media({ id: 'TK-000105', naam: 'Bench Press' });
  ok(m.kind !== 'private-mp4' || m.catalogId !== 'TK-000019', 'a TK-shaped id never authorizes; name maps only what the name says'); }
// 4. Existing behaviour preserved.
{ const m = media({ canonicalId: 'TK-000105', id: 'TK-000105', naam: 'Dumbbell Goblet Squat' });
  eq([m.kind, m.catalogId], ['private-mp4', 'TK-000105'], 'canonical catalog row unchanged'); }
{ const m = media(own('Goblet Squat', { video: 'https://example.org/own.mp4' }));
  eq([m.kind, m.src], ['mp4', 'https://example.org/own.mp4'], 'explicit own video still wins'); }
{ const m = media(own('Duurloop', { yt: 'abc123' }));
  eq([m.kind, m.src], ['yt', 'abc123'], 'YouTube fallback unchanged for unmapped names'); }
{ const m = media(own('Goblet Squat', { yt: 'abc123' }));
  eq(m.kind, 'private-mp4', 'MoveKit still wins over YouTube for a mapped own exercise'); }
{ const m = media(own('Goblet Squat'), false);
  eq(m.kind, 'poster', 'release OFF: legacy public poster path unchanged'); }

// 5. Execution hero renders the protected poster for private media (no public URL).
const hero = segment("    var _media=resolveExerciseMedia(list[idx]||{id:curId,naam:nm,yt:yt});", "    heroC.innerHTML=hc;");
ok(/tk504-video-poster" data-aid="'\+_privPoster\+'"/.test(hero), 'hero renders a protected poster element for private media');
ok(/tk504QueuePrivateVideoPosters\(\)/.test(segment("    heroC.innerHTML=hc;", "  }catch")), 'hero queues the protected poster load');
// 6. The single mapping source is MovementCore (no second mapping).
const helper = fn('movekitCatalogIdForName');
ok(/MovementCore\.slugForName\(/.test(helper) && !/ALIASES/.test(helper), 'helper uses MovementCore only');
ok(/movekitCatalogIdForName\(/.test(fn('movekitPosterFor')), 'poster lookup reuses the same helper');

console.log('TK504 name-bound own exercises via protected route: ' + checks + ' assertions PASS');
