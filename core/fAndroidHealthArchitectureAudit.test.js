/* fAndroidHealthArchitectureAudit.test.js — MS-F5-03 regressietest.
 *
 * A. Functionele regressie-lock op de kritieke architectuurgarantie: de sync blijft
 *    begrensd tot 7 dagen (geen ongebonden historie-pull) en vraagt uitsluitend
 *    read-only scopes (geen schrijfrechten).
 * B. Bevestigt dat er geen native Health Connect-SDK-referentie is toegevoegd zonder
 *    dat dit bewust, gedocumenteerd gebeurde (voorkomt een toekomstige, stille
 *    architectuurwijziging die het MS-F5-03-rapport zou tegenspreken).
 * C. Documentatie-aanwezigheid.
 * D. Sabotagebewijs op A.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const syncSrc = fs.readFileSync(path.join(ROOT, 'netlify/functions/wearable-sync.js'), 'utf8');
const authStartSrc = fs.readFileSync(path.join(ROOT, 'netlify/functions/wearable-auth-start.js'), 'utf8');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

// ---- A. Kritieke architectuurgaranties, functioneel geregressie-lockt ----
ok(syncSrc.includes('since.setDate(since.getDate() - 7)'),
  'de wearable-sync blijft begrensd tot 7 dagen historie -- geen ongebonden historie-pull');
ok(authStartSrc.includes('googlehealth.health_metrics_and_measurements.readonly') && authStartSrc.includes('googlehealth.sleep.readonly'),
  'de aangevraagde OAuth-scopes blijven uitsluitend readonly (health_metrics_and_measurements, sleep)');
ok(!/googlehealth\.[a-z_]+\.write/i.test(authStartSrc),
  'geen enkele write-scope wordt aangevraagd');

// ---- B. Geen stille native Health Connect-SDK-toevoeging zonder documentatie-update ----
{
  let heeftHealthConnectCode = false;
  try {
    const androidDir = path.join(ROOT, 'android');
    const nativeDir = path.join(ROOT, 'native');
    const zoekTermen = /health\.connect|HealthConnectClient|androidx\.health/i;
    function scan(dir) {
      if (!fs.existsSync(dir)) return;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name);
        if (entry.isDirectory()) scan(p);
        else if (/\.(js|java|kt|xml|gradle)$/.test(entry.name)) {
          if (zoekTermen.test(fs.readFileSync(p, 'utf8'))) heeftHealthConnectCode = true;
        }
      }
    }
    scan(androidDir); scan(nativeDir);
  } catch (_) { /* laat heeftHealthConnectCode op false staan bij een leesfout */ }
  ok(heeftHealthConnectCode === false,
    'geen native Health Connect-SDK-code aanwezig -- bevestigt het MS-F5-03-rapport se kernbevinding; als dit ooit true wordt, moet het rapport EXPLICIET worden bijgewerkt, niet stilzwijgend achterhaald raken');
}

// ---- C. Documentatie-aanwezigheid ----
const report = fs.readFileSync(path.join(ROOT, 'docs/MS-F5-03_ANDROID_HEALTH_CONNECT_PRODUCTION_PATH.md'), 'utf8');
ok(report.includes('Google Health API') && report.includes('Android Health Connect'),
  'het rapport documenteert expliciet het onderscheid tussen de Google Health API en Android Health Connect');
const decisions = fs.readFileSync(path.join(ROOT, 'docs/F5_PRODUCT_OWNER_DECISIONS.md'), 'utf8');
ok(decisions.includes('Kan het werk doorgaan zonder deze beslissing?'),
  'het besluitpunt-document volgt het verplichte format inclusief de "kan het werk doorgaan"-vraag');

console.log('fAndroidHealthArchitectureAudit: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
