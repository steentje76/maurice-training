/* Re-audit master sprint (16-08) — persistence-integriteit fixes.
 * Verifieert de ECHTE draftHasData()-guard uit index.html (voorkomt stil wissen van een niet-afgeronde,
 * niet-gesynchroniseerde training bij het starten van een ander trainingstype).
 * Draai: node core/fReAuditPersistence.test.js
 */
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function extractFn(name){
  const st = html.indexOf('function ' + name + '(');
  if (st < 0) throw new Error('functie niet gevonden: ' + name);
  let d = 0, e = -1;
  for (let j = html.indexOf('{', st); j < html.length; j++){
    const ch = html[j];
    if (ch === '{') d++; else if (ch === '}'){ d--; if (d === 0){ e = j; break; } }
  }
  return html.slice(st, e + 1);
}
const draftHasData = eval('(' + extractFn('draftHasData') + ')');

let pass = 0, fail = 0;
function ok(c, m){ if (c) pass++; else { fail++; console.log('  ✗ ' + m); } }

// ── draftHasData: detecteert echte, nog niet gesynchroniseerde trainingsdata ──
ok(draftHasData(null) === false, 'null → false');
ok(draftHasData({}) === false, 'leeg object → false');
ok(draftHasData({sessionLog:{}}) === false, 'lege sessionLog → false');
ok(draftHasData({sessionLog:{bench:{sets:[{kg:'80',reps:'5'}]}}}) === true, 'werkset met kg/reps → true (mag NIET stil gewist worden)');
ok(draftHasData({sessionLog:{bench:{sets:[{},{}]}}}) === false, 'lege sets → false');
ok(draftHasData({sessionLog:{squat:{wu:[{kg:'40',reps:'8'}]}}}) === true, 'warm-up met data → true');
ok(draftHasData({sessionLog:{roeien:{cardio:{type:'rowing',distance:1000}}}}) === true, 'cardio met afstand → true');
ok(draftHasData({sessionLog:{roeien:{cardio:{type:'rowing',time:'3:50'}}}}) === true, 'cardio met tijd → true');
ok(draftHasData({sessionLog:{roeien:{cardio:{type:'rowing'}}}}) === false, 'cardio zonder waarden → false');
ok(draftHasData({sessionLog:{bench:{sets:[{done:true}]}}}) === false, 'alleen done-vlag zonder kg/reps → false (geen echte data)');

console.log('\nRe-audit persistence: RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail ? 1 : 0);
