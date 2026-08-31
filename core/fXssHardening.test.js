/* fXssHardening.test.js — F13 Post-Audit Remediation P1-16.
 * Bewaakt de XSS/HTML-injectie-fixes uit de taint-oriented audit:
 * escJsAttr() bestaat en werkt correct, de 6 eerder kwetsbare
 * onclick='...'-aanroepen gebruiken geen kale JSON.stringify() meer
 * voor naam-velden, en de vier bevestigde innerHTML/attribuut-sinks
 * escapen nu correct.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// ---- A. escJsAttr() bestaat en combineert JSON.stringify met escHtml ----
ok(html.match(/function escJsAttr\(waarde\)\{\s*return escHtml\(JSON\.stringify\(waarde\)\);?\s*\}/),
  'A1: escJsAttr() bestaat en delegeert naar escHtml(JSON.stringify(waarde))');

// ---- B. Geen enkele onclick='...' bevat nog een kale JSON.stringify() voor een naam-veld ----
const kaleJsonInOnclick = html.match(/onclick='[^']*JSON\.stringify\([a-zA-Z]*\.(naam|name)\)[^']*'/g) || [];
ok(kaleJsonInOnclick.length === 0,
  'B1: geen enkele onclick=\'...\'-aanroep gebruikt nog een kale JSON.stringify() voor een naam-veld (moet escJsAttr() zijn) -- gevonden: ' + kaleJsonInOnclick.length);

// ---- C. De 6 specifieke, eerder kwetsbare aanroepen gebruiken nu escJsAttr ----
['openRenameVasteTraining', 'askCoachEx', 'show1RMChart', 'openEditPeak', 'openEditMuscles', 'openEditRest', 'openEditAnchor', 'openEditYT'].forEach(function (fn) {
  const re = new RegExp("onclick='(?:event\\.stopPropagation\\(\\);)?" + fn + "\\(\\$\\{escJsAttr\\(");
  ok(re.test(html), 'C: ' + fn + '() gebruikt escJsAttr() i.p.v. een kale JSON.stringify() voor zijn onclick-argumenten');
});

// ---- D. De vier bevestigde innerHTML/attribuut-sinks gebruiken nu escHtml() ----
ok(html.includes('<div class="lval">${ex?escHtml(ex.name):') , 'D1: renderExerciseRow() escaped ex.name');
ok(html.match(/meta\.notes\?'<br><span style="font-style:italic">'\+escHtml\(meta\.notes\)/), 'D2: renderExerciseRow() escaped meta.notes');
ok(html.match(/<div style="font-size:13px;font-weight:700;color:var\(--dark\)">\$\{escHtml\(ex\.naam\)\}<\/div>/), 'D3: de sessie-samenvattingskaart escaped ex.naam');
ok(html.includes('id="es-note" value="${escHtml(session?.note||\'\')}"'), 'D4: het notitie-invoerveld escaped session.note (attribuutcontext)');
ok(html.match(/return `\$\{methodLbl\}: \$\{escHtml\(n\)\} — \$\{escHtml\(item\.body\.date\|\|''\)\}`/), 'D5: describeOfflineQueueItem() escaped de exercise-naam (sessions-tak)');
ok(html.includes("return `${methodLbl} oefening: ${escHtml(item.body.name||item.body.id)}`"), 'D6: describeOfflineQueueItem() escaped item.body.name (exercises-tak)');

console.log('fXssHardening: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
