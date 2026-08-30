/* fAccessibilityMobileErgonomics.test.js — MS-F13-04 regressietest. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

{
  const setMoreBlok = html.split('.set-more{')[1] ? html.split('.set-more{')[1].split('}')[0] : '';
  const setRestBlok = html.split('.set-rest{')[1] ? html.split('.set-rest{')[1].split('}')[0] : '';
  ok(setMoreBlok.includes('min-width:44px') && setMoreBlok.includes('min-height:44px'),
    'A1: .set-more heeft een touch-target van minimaal 44x44px');
  ok(setRestBlok.includes('min-width:44px') && setRestBlok.includes('min-height:44px'),
    'A2: .set-rest heeft een touch-target van minimaal 44x44px');
}

{
  const viewportTag = (html.match(/<meta name="viewport"[^>]*>/) || [''])[0];
  ok(!viewportTag.includes('user-scalable=no') && !viewportTag.includes('maximum-scale=1'),
    'B1: de actieve viewport-meta-tag schakelt pinch-zoom niet uit');
}

ok(html.includes('lastFocusedBeforeModal'), 'C1: het bestaande modal-focus-restore-mechanisme is nog aanwezig');

{
  const knoppen = html.match(/<button[^>]*>\s*<svg[^>]*>[\s\S]*?<\/svg>\s*<\/button>/g) || [];
  const zonderLabel = knoppen.filter(function (k) { return !k.includes('aria-label'); });
  ok(knoppen.length > 0, 'D1: er zijn nog steeds icon-only-knoppen om te controleren');
  ok(zonderLabel.length === 0, 'D2: alle icon-only-knoppen hebben een aria-label (' + zonderLabel.length + ' zonder label)');
}

console.log('fAccessibilityMobileErgonomics: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
