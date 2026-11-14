'use strict';
// TK504 — after 226->356 unification, public V1 URL assertions are obsolete.
// Test the REAL ExerciseAssetProvider, no synthetic second resolver or media transport.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
let count = 0;
function check(value, why) { assert.ok(value, why); count++; }
function app(hostname) {
  const begin = html.indexOf('var ExerciseAssetProvider');
  const end = html.indexOf('var ExerciseIntelligence=(function(){', begin);
  check(begin >= 0 && end > begin, 'use the actual provider and actual app privacy switch');
  return new Function('window', 'location', html.slice(begin, end) +
    '\nreturn { provider: ExerciseAssetProvider, manifest: VIDEO_MANIFEST };')(
      {}, { hostname });
}
async function run() {
  const android = app('localhost'), web = app('trainingskompas.com');
  const all = Object.keys(android.manifest);
  check(all.length === 226, 'all original provider identities remain in the canonical V1 manifest during cutover staging');
  for (const [name, env] of [['web', web], ['android', android]]) {
    const p = env.provider;
    check(p.resolve('TK-000206', 'video') === null &&
      p.resolve('TK-000226', 'video') === null,
      name + ': protected originals no longer resolve public V1 MP4s');
    check(p.videos('TK-000206').length === 1 &&
      p.videos('TK-000206')[0].url === null &&
      p.video('TK-000226').url === null,
      name + ': video facade retains identity without raw URL');
    check(all.every(id => {
      const entries = p.videos(id);
      return entries.length > 0 && entries.every(v => v.url === null);
    }), name + ': no direct legacy V1 URL for any of the original 226');
    check(p.resolve('TK-999999', 'video') === null &&
      p.videos('TK-999999').length === 0,
      name + ': unknown catalog id is denied, not mapped to a different video');
    check(await p.downloadOffline('TK-000206') === false &&
      await p.isOffline('TK-000206') === false,
      name + ': protected originals never use the old unencrypted MP4 offline cache');
  }
  const originalNavigator = global.navigator;
  try {
    try { delete global.navigator; } catch (_) { /* read-only host property */ }
    check(app('localhost').provider.resolve('TK-000206', 'video') === null,
      'Android private media selection does not depend on a service worker');
  } finally {
    if (originalNavigator === undefined) {
      try { delete global.navigator; } catch (_) { /* read-only host property */ }
    } else {
      try { global.navigator = originalNavigator; } catch (_) { /* read-only host property */ }
    }
  }
  check(sw.includes('const TK504_PRIVATE_MEDIA_CUTOVER = false;'),
    'public V1 cache cutover must wait for signed server authorization and actual private playback');
  check(html.includes('const TK504_NEW_PRIVATE_MEDIA_RELEASE = true;'),
    'the same existing V2 client transport is selected for both groups');
  console.log('TK504 unified V2 media resolver: ' + count +
    ' focused checks PASS; originals are private in PR client, server 226 remains DENY');
}
run().catch(err => { console.error(err.stack || err); process.exitCode = 1; });
