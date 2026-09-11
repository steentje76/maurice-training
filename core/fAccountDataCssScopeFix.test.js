/* fAccountDataCssScopeFix.test.js — ACCOUNT & DATA REAL-DEVICE DEFECT (root cause)
 *
 * AANLEIDING. Op het echte toestel toonde "Account & data" een enorme navy envelop en
 * enorme zwarte "Wachtwoord"/"Gegevens exporteren"-tegels. Bewezen root cause: m-account
 * (regel ~3658) staat in de DOM als sibling VÓÓR #s-profiel opent (regel ~3854) -- geen
 * kind. De .pf-row/.pf-ic/.pf-ic svg/.pf-tx/.pf-lb/.pf-sb/.pf-chev-CSS is uitsluitend
 * geschreven als "#s-profiel .pf-*" (en soms "#s-settings .set-*"), en bereikt m-account
 * dus structureel nooit -- niet door cascadeprioriteit, maar omdat de selector de
 * doelnodes niet kan bereiken. Zonder CSS krijgt de <svg> geen width/height (browser-
 * default replaced-element-grootte: de "enorme" iconen) en erft stroke="currentColor"
 * de algemene donkere tekstkleur (de "zwarte tegels").
 *
 * Deze suite legt vast dat:
 *   1. m-account daadwerkelijk buiten #s-profiel staat (de aanname achter de fix blijft
 *      geldig -- als dit ooit verandert, moet deze test expliciet heroverwogen worden,
 *      niet stilzwijgend blijven groen zonder betekenis);
 *   2. voor elk van de 7 herbruikte pf-*-classes een #m-account-gescopeerde declaratie
 *      bestaat;
 *   3. .pf-ic en .pf-ic svg daarbinnen expliciete, begrensde width/height hebben (de
 *      kern van de fix -- voorkomt de browser-default-grootte-regressie);
 *   4. geen van de nieuwe regels !important gebruikt;
 *   5. geen nieuwe classes zijn geïntroduceerd (dezelfde class-namen als #s-profiel,
 *      geen aparte "visuele taal" voor dit modal);
 *   6. de #m-account-waarden overeenkomen met de effectief renderende (na cascade-
 *      dedupe) #s-profiel-waarden voor dezelfde classes -- 1-op-1 hergebruik, geen eigen
 *      interpretatie.
 *
 * Draai: node core/fAccountDataCssScopeFix.test.js
 */
var assert = require('assert');
var fs = require('fs');
var path = require('path');

var HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
var pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.log('  ✗ ' + m); } }

/* ── 1. m-account staat structureel buiten #s-profiel ──────────────────────── */
console.log('1. DOM-positie (aanname achter de fix)');
var idxAccount = HTML.indexOf('id="m-account"');
var idxProfiel = HTML.indexOf('class="scr" id="s-profiel"');
assert.ok(idxAccount >= 0, 'm-account niet gevonden');
assert.ok(idxProfiel >= 0, '#s-profiel niet gevonden');
ok(idxAccount < idxProfiel,
  '1a. m-account staat vóór #s-profiel in de brontekst (sibling, geen kind) -- de reden dat deze fix nodig was/is');

/* ── 2-4. #m-account-gescopeerde regels: aanwezig, begrensd, geen !important ── */
console.log('2-4. #m-account-scoped regels');
var SELECTORS = ['.pf-row', '.pf-ic', '.pf-ic svg', '.pf-tx', '.pf-lb', '.pf-sb', '.pf-chev'];
var accountRules = {};
SELECTORS.forEach(function (sel) {
  var re = new RegExp('#m-account ' + sel.replace(/\./g, '\\.') + '\\{([^}]*)\\}');
  var m = HTML.match(re);
  ok(!!m, '2. #m-account ' + sel + ' -- regel bestaat');
  if (m) accountRules[sel] = m[1];
});

if (accountRules['.pf-ic']) {
  ok(/width:\d+px/.test(accountRules['.pf-ic']) && /height:\d+px/.test(accountRules['.pf-ic']),
    '3a. #m-account .pf-ic heeft expliciete, begrensde width/height (voorkomt browser-default-grootte)');
}
if (accountRules['.pf-ic svg']) {
  ok(/width:\d+px/.test(accountRules['.pf-ic svg']) && /height:\d+px/.test(accountRules['.pf-ic svg']),
    '3b. #m-account .pf-ic svg heeft expliciete, begrensde width/height -- de kern van de fix');
}

Object.keys(accountRules).forEach(function (sel) {
  ok(accountRules[sel].indexOf('!important') === -1, '4. #m-account ' + sel + ' gebruikt geen !important');
});

/* ── 5. Geen nieuwe classes -- alleen bestaande pf-*-namen hergebruikt ──────── */
console.log('5. Geen nieuwe visuele taal');
ok(HTML.indexOf('#m-account .pf-') !== -1, '5a. de fix hergebruikt de bestaande pf-*-naamgeving');
ok(!/#m-account \.(?!pf-)[a-z-]+\{/.test(HTML.slice(HTML.indexOf('#m-account .pf-row'), HTML.indexOf('#m-account .pf-row') + 1500)),
  '5b. geen nieuw, niet-pf-*-classnaam geïntroduceerd rond de fix');

/* ── 6. 1-op-1 hergebruik: #m-account-waarden == effectieve #s-profiel-waarden ─ */
console.log('6. Waarden 1-op-1 hergebruikt van canonical Profiel');

function effectieveSprofielWaarde(sel) {
  // Verzamelt ALLE "#s-profiel <sel>{...}"-declaraties (er kunnen er meerdere zijn, zie
  // de bekende dubbele-declaratie-debt) en past cascade-dedupe toe: latere declaraties
  // overschrijven gelijknamige properties van eerdere.
  var re = new RegExp('#s-profiel ' + sel.replace(/\./g, '\\.').replace(/ /g, '\\s+') + '\\{([^}]*)\\}', 'g');
  var props = {};
  var m;
  while ((m = re.exec(HTML))) {
    m[1].split(';').forEach(function (decl) {
      var parts = decl.split(':');
      if (parts.length >= 2) {
        var prop = parts[0].trim();
        if (prop) props[prop] = parts.slice(1).join(':').trim();
      }
    });
  }
  return props;
}
function parseProps(str) {
  var props = {};
  str.split(';').forEach(function (decl) {
    var parts = decl.split(':');
    if (parts.length >= 2) {
      var prop = parts[0].trim();
      if (prop) props[prop] = parts.slice(1).join(':').trim();
    }
  });
  return props;
}

SELECTORS.forEach(function (sel) {
  if (!accountRules[sel]) return;
  var verwacht = effectieveSprofielWaarde(sel);
  var werkelijk = parseProps(accountRules[sel]);
  Object.keys(verwacht).forEach(function (prop) {
    ok(werkelijk[prop] === verwacht[prop],
      '6. #m-account ' + sel + ' { ' + prop + ' } = "' + werkelijk[prop] + '" komt overeen met effectieve #s-profiel-waarde "' + verwacht[prop] + '"');
  });
});

console.log('\n========================================================');
console.log('fAccountDataCssScopeFix.test.js — ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail ? 1 : 0);
