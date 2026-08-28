/* fHistoryCalendar.test.js — MS-F2-05 regressietest.
 *
 * Audit: History/Calendar (loadHistory, td(), openRepeatWorkout) is een presentatielaag
 * over canonical gelogde sessions-data (groepering per datum, geen herberekening van
 * originele waarden -- CalcCore.calculateVolume is de enige berekening, canoniek
 * hergebruikt). td() gebruikt correct lokale datumcomponenten, niet toISOString()
 * (bekende, eerder gefixte UTC/lokale-tijd-bug: "coach blijft op oude datum hangen").
 *
 * BEVINDING (P3, niet blokkerend): 18 plekken elders in index.html gebruiken nog
 * toISOString().split('T')[0]/.slice(0,10) voor datumberekeningen -- allemaal
 * bereikgrenzen ("laatste N dagen" voor dashboards/AI-context), niet de kritieke
 * schrijf-datum van een voltooide training zelf (die correct td() gebruikt via
 * finishSession()). Risico is beperkt tot een sessie die een paar uur te vroeg/laat
 * in of uit een "laatste N dagen"-venster valt rond middernacht -- geen "training
 * op verkeerde dag"-defect. Geregistreerd als vervolgwerk (GAP-P3), niet gefixed
 * binnen deze sprint (18 call sites veranderen zou een grotere, risicovollere
 * ingreep zijn dan verantwoord als minimale fix).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

function extractFunctionBody(source, name) {
  const re = new RegExp('function\\s+' + name + '\\s*\\(');
  const m = re.exec(source);
  if (!m) return null;
  const braceStart = source.indexOf('{', m.index);
  if (braceStart === -1) return null;
  let depth = 0;
  for (let i = braceStart; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) return source.slice(braceStart, i + 1);
    }
  }
  return null;
}

// ---- A. td(): canonical lokale datum, nooit toISOString() ----
{
  const body = extractFunctionBody(html, 'td');
  ok(body !== null, 'td() (canonical vandaag-datum) wordt gevonden');
  if (body) {
    ok(!/\.toISOString\(\)/.test(body), 'td() roept nergens .toISOString() aan (bekende UTC/lokale-tijd-bug) — het verklarende commentaar dat deze bug beschrijft, telt niet mee');
    ok(/getFullYear\(\)/.test(body) && /getMonth\(\)/.test(body) && /getDate\(\)/.test(body),
      'td() bouwt de datum op uit lokale componenten (jaar/maand/dag)');
  }
}

// ---- B. finishSession schrijft de sessiedatum via td(), niet via toISOString() ----
{
  const body = extractFunctionBody(html, 'finishSession');
  ok(body !== null, 'finishSession() wordt gevonden');
  if (body) {
    ok(/const t=curT,list=getSessionExs\(t\),today=td\(\)/.test(body),
      'finishSession() bepaalt de sessiedatum via de canonical td() -- de datum die een training in History/Calendar krijgt is dus altijd lokaal correct');
  }
}

// ---- C. loadHistory: presentatie-only, geen herberekening van originele waarden ----
{
  const body = extractFunctionBody(html, 'loadHistory');
  ok(body !== null, 'loadHistory() wordt gevonden');
  if (body) {
    ok(/order=date\.desc/.test(body), 'loadHistory() sorteert op de canonical gelogde datum');
    ok(/CalcCore\.calculateVolume/.test(body),
      'loadHistory() gebruikt de canonical CalcCore voor volumeberekening, geen eigen/AI-herberekening');
  }
}

console.log('fHistoryCalendar: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
