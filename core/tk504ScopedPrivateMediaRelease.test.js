'use strict';
// TK504: ONE private V2 client transport for all 582 canonical MoveKit IDs.
// Bounded smoke checks only. The broker signs the original 226 only under the pinned
// owner media decision TK504-20261114-OWNER-ORIGINAL226-MEDIA (same method as the 356).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const broker = fs.readFileSync(path.join(root, 'netlify/functions/exercise-media-v2-url.js'), 'utf8');
const adapter = fs.readFileSync(path.join(root, 'core/tk504ProtectedPlayback.js'), 'utf8');
const entries = require('../docs/generated/MOVEKIT_GOLDEN_V2_INVENTORY.json').items;
let checks = 0;
function ok(condition, message) { assert.ok(condition, message); checks++; }
const start = html.indexOf('function tk504PrivateEnabled(catalogId){');
const end = html.indexOf('function tk504GetMediaRuntime(catalogId){', start);
ok(start >= 0 && end > start, 'actual app predicate is present');
const src = html.slice(start, end);
const flags = html.match(/const TK504_PRIVATE_MEDIA_RELEASE = (true|false);\s*const TK504_NEW_PRIVATE_MEDIA_RELEASE = (true|false);/);
ok(flags && flags[1] === 'false' && flags[2] === 'true',
  'original server-release gate stays disabled, existing V2 transport enabled');
// 226/356 share the V2 client transport (226 still server-denied); the legacy
// V1 cutover flag must never influence the route predicate.
ok(!src.includes('TK504_PRIVATE_MEDIA_RELEASE'),
  'tk504PrivateEnabled never reads legacy V1 TK504_PRIVATE_MEDIA_RELEASE');
const evaluate = enabled => vm.runInNewContext(
  'const TK504_NEW_PRIVATE_MEDIA_RELEASE = ' + enabled + ';\n' + src + '\ntk504PrivateEnabled',
  Object.create(null), { timeout: 1000 });
const shipped = evaluate(true);
const disabled = evaluate(false);
ok(entries.length === 582, 'golden inventory has 582 items');
ok(entries.filter(x => Number(x.catalog_id.slice(3)) <= 226).length === 226,
  'original IDs retained');
ok(entries.filter(x => Number(x.catalog_id.slice(3)) >= 227).length === 356,
  'newer IDs retained');
ok(new Set(entries.map(x => x.catalog_id)).size === 582, 'canonical IDs unique');
ok(entries.every(x => shipped(x.catalog_id) === true),
  'all 582 use the SAME protected media transport in the app');
ok(entries.every(x => disabled(x.catalog_id) === false),
  'one V2 transport switch can fail closed for all 582');
ok([null, true, {}, 'TK-000000', 'TK-000583', 'TK-999999',
  'TK-000063 ', 'tk-000063'].every(id => shipped(id) === false),
  'noncatalog and malformed IDs denied');
ok(html.includes("c.url=(typeof tk504PrivateEnabled==='function'&&tk504PrivateEnabled(catalogId))?null"),
  'protected media do not expose legacy raw video URL');
const lock = broker.indexOf('if (catalogNumber >= 1 && catalogNumber <= 226 && !ORIGINAL_226_RELEASED) {');
ok(lock > 0 && broker.indexOf("return failure(event, 404, 'MEDIA_NOT_APPROVED');", lock) > lock &&
   lock < broker.indexOf('const uid = await identifyUser(', lock),
   'server denies original 226 before auth/signing unless the pinned owner decision is valid');
ok(require('../netlify/functions/exercise-media-v2-url.js')._internal.ORIGINAL_226_RELEASED === true,
   'pinned owner media decision for the original 226 is accepted by the shipped broker');
ok(adapter.includes("published.source.provider !== 'movekit'") &&
   adapter.includes('bridge.requestStaged('),
   'existing private adapter validates canonical source and uses the V2 bridge');
console.log('TK504 single V2 route: ' + checks +
  ' targeted smoke checks PASS; 582 client-private via one V2 route, original 226 released by pinned owner decision');
