/* TK-SEC-UX-INT-REVIEW — cache continuity when a new app-shell index is merged.
 * A changed index.html with a byte-identical sw.js may leave an old installed
 * worker/cached shell untouched until the next successful online navigation.
 * This contract is intentionally limited to this release generation.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const sw=fs.readFileSync(process.env.TK_SW_INPUT||path.join(__dirname,'..','sw.js'),'utf8');
const main=sw.match(/const CACHE_NAME = 'trainingskompas-v(\d+)'/);
const stat=sw.match(/const CACHE_STATIC = 'trainingskompas-static-v(\d+)'/);
assert.ok(main&&stat,'beide serviceworker-cachereferenties bestaan');
assert.equal(main[1],stat[1],'runtime/static cache worden samen gebumpt');
assert.ok(Number(main[1])>=470257,'nieuwe app-shell revisie vereist nieuwe worker bytes');
assert.match(sw,/['"]\/index\.html['"]/,'app-shell blijft offline geprecachet');
assert.match(sw,/e\.request\.mode === 'navigate'[\s\S]*?fetch\(e\.request\)[\s\S]*?\.catch\(\(\) => caches\.match\('\/index\.html'\)\)/,'navigatie is online-first met offline fallback');
console.log('TK-SEC-UX-INT-REVIEW serviceworker: 5/5 PASS');
