'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const tool = require('../tools/movekit-media-pilot.js');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST = path.join(ROOT, 'docs', 'generated', 'MOVEKIT_MEDIA_MANIFEST_V1.json');

let pass=0, fail=0;
function ok(v,m){ try { assert.ok(v,m); pass++; } catch(e){ fail++; console.error('  ✗ '+m); console.error('    '+e.message); } }
function eq(a,b,m){ try { assert.deepStrictEqual(a,b,m); pass++; } catch(e){ fail++; console.error('  ✗ '+m); console.error('    '+e.message); } }

const built = tool.buildManifest();
const committed = JSON.parse(fs.readFileSync(MANIFEST,'utf8'));
const verification = tool.verifyCommitted(built, MANIFEST);

eq(built.schema, 'trainingskompas-movekit-media-manifest/1.0', 'canonical manifest schema');
eq(built.bucket, 'exercise-media', 'private bucket identity fixed');
eq(built.prefix, 'movekit/v1/video/', 'immutable v1 video prefix');
eq(built.generated_from_catalog_entries, 226, 'all current 226 MoveKit exercises represented');
eq(built.items.length, 226, 'manifest has exactly 226 items');
eq(built.total_bytes, 528679284, 'canonical current-video byte total');
ok(verification.exists && verification.match, 'committed manifest byte-semantically matches freshly generated inventory');

const ids = new Set(), slugs = new Set(), paths = new Set();
for (const x of built.items) {
  ok(/^TK-\d{6}$/.test(x.catalog_id), 'valid catalog id '+x.catalog_id);
  ok(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(x.provider_id), 'valid provider slug '+x.catalog_id);
  ok(/^movekit\/v1\/video\/[a-z0-9-]+\.mp4$/.test(x.object_path), 'canonical object path '+x.catalog_id);
  eq(x.mime, 'video/mp4', 'video MIME '+x.catalog_id);
  ok(/^[a-f0-9]{64}$/.test(x.sha256), 'SHA-256 '+x.catalog_id);
  ok(Number.isInteger(x.bytes) && x.bytes>0 && x.bytes<=33554432, 'size inside private-bucket limit '+x.catalog_id);
  ids.add(x.catalog_id); slugs.add(x.provider_id); paths.add(x.object_path);
}
eq(ids.size, 226, 'catalog ids unique');
eq(slugs.size, 226, 'provider slugs unique');
eq(paths.size, 226, 'object paths unique');

const pilot = built.items.slice(0,3);
eq(pilot.map(x=>x.catalog_id), ['TK-000001','TK-000002','TK-000003'], 'pilot selection deterministic');
eq(pilot.map(x=>x.sha256), [
  '63f1198dc44e2fff699de4d8015ec6e2d0d029760d1c92ced58694db2042aa78',
  '5b4808db553f18f05a3b43c0d26d242ddf3061ed08a2c26ef74ea5eb5c59de61',
  '15aab22ace1b158c2aae9b7f261241ff1f001d7a51d1746983589c987cdf070e'
], 'pilot hashes pinned');

const src = fs.readFileSync(path.join(ROOT,'tools','movekit-media-pilot.js'),'utf8');
ok(src.includes("storage','ls'") && src.indexOf("storage','ls'") < src.indexOf("storage','cp'"), 'remote existence preflight precedes upload');
ok(src.includes('refusing overwrite; remote object already exists'), 'uploader fail-closes on existing pilot object');
ok(src.includes("'--content-type',MIME") && src.includes("'--cache-control','31536000'"), 'upload fixes MIME and immutable cache control');
ok(!/SERVICE_ROLE|service[_-]?role/i.test(src), 'pilot tooling never asks for service-role credentials');
ok(!/object\/public|signedURL|signedUrl/.test(src), 'pilot tooling does not create public or signed playback URLs');
eq(tool.PROJECT_REF, 'mhfxhzkdmgkaplicdszg', 'production project ref explicitly pinned');

console.log('MoveKit media pilot integrity: '+pass+' passed, '+fail+' failed');
if(fail) process.exit(1);
