'use strict';
// TK504 — release switches must NOT cross-contaminate the original 226 and newer 356.
// This loads the EXACT shipped predicate from index.html. All alternative
// switch states exist ONLY in VM memory; no live release, grant, JWT or media call.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const inv = require('../docs/generated/MOVEKIT_GOLDEN_V2_INVENTORY.json');
let checks = 0;
function eq(actual, expected, why) { assert.equal(actual, expected, why); checks++; }
function checked(value, why) { assert.ok(value, why); checks++; }

const start = html.indexOf('function tk504PrivateEnabled(catalogId){');
const end = html.indexOf('function tk504GetMediaRuntime(catalogId){',start);
checked(start>0 && end>start,'real predicate found in current app source');
const predicate = html.slice(start,end);
checked(!predicate.includes('localStorage') && !predicate.includes('sessionStorage') &&
  !predicate.includes('process.env'),'switch not controlled by user storage or runtime environment');
const flags = html.match(/const TK504_PRIVATE_MEDIA_RELEASE = (true|false);\s*const TK504_NEW_PRIVATE_MEDIA_RELEASE = (true|false);/);
checked(!!flags,'both actual product switches present');
eq(flags[1],'false','owner-original media release remains DISABLED in product');
eq(flags[2],'true','existing 356 media route remains ENABLED in product');

function checker(original,newer) {
  const code='const TK504_PRIVATE_MEDIA_RELEASE = '+original+';\n'+
    'const TK504_NEW_PRIVATE_MEDIA_RELEASE = '+newer+';\n'+predicate+'\n'+
    'tk504PrivateEnabled';
  const value=vm.runInNewContext(code,Object.create(null),{timeout:1000});
  checked(typeof value==='function','VM loaded exact real application predicate');
  return value;
}
const combinations = [
  [false,false],
  [false,true],
  [true,false],
  [true,true]
];
const items=inv.items;
eq(items.length,582,'canonical library has 582 items');
const originals=items.filter(x=>Number(x.catalog_id.slice(3))<=226);
const newer=items.filter(x=>Number(x.catalog_id.slice(3))>=227);
eq(originals.length,226,'226 original canonical ids');
eq(newer.length,356,'356 newer canonical ids');
const allIds = new Set(items.map(x=>x.catalog_id));
eq(allIds.size,582,'canonical catalog ids unique');

for (const [original,newRelease] of combinations) {
  const predicateFn=checker(original,newRelease);
  for(const ex of originals)
    eq(predicateFn(ex.catalog_id),original,'original id must follow ONLY original switch: '+ex.catalog_id);
  for(const ex of newer)
    eq(predicateFn(ex.catalog_id),newRelease,'new id must follow ONLY newer switch: '+ex.catalog_id);
  for(const bad of [
    null,undefined,true,false,1,0,{},[],['TK-000001'],'TK-000000',
    'TK-000583','TK-999999','TK-000001 ','tk-000001','TK-00001',
    'TK-000001 OR 1=1',' TK-000227','MK-000001','TK-00022x',
    '__proto__','constructor'
  ]) eq(predicateFn(bad),false,'bad/noncatalog id always denied: '+String(bad));
  // This specifically catches the prior unbounded global 'original = true' shortcut.
  eq(predicateFn('TK-999999'),false,'out-of-range TK-shaped ID cannot use original cutover; in-range personal collisions need caller source checks');
}
const shipped=checker(flags[1]==='true',flags[2]==='true');
for(const ex of originals)eq(shipped(ex.catalog_id),false,'shipped app does not yet privately release original');
for(const ex of newer)eq(shipped(ex.catalog_id),true,'shipped newer route remains private');
console.log('TK504 per-scope media switch: '+checks+' assertions PASS; 226 original OFF, 356 existing ON; simulated future 226 ON excludes out-of-range IDs and does not override 356; in-range personal IDs require caller source checks; no media or grant activity');
