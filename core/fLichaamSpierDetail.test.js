/* Lichaam — spiergroep-detail en de consistentie van de spiergroep-definities.
 *
 * Bewaakt drie dingen:
 *   1. het detailscherm bestaat, hangt in de bestaande router en heeft één ingang;
 *   2. het detail rekent niets zelf uit — het leest uit de bestaande engines en bronnen;
 *   3. dezelfde spiergroep wordt overal in de app op dezelfde manier begrepen
 *      (herstelmodel, svg-mapping en zijde-afleiding lopen niet uiteen).
 *
 * Draai: node core/fLichaamSpierDetail.test.js
 */
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

let pass = 0, fail = 0;
function ok(c, m){ if(c) pass++; else { fail++; console.log('  ✗ ' + m); } }
function eq(a, b, m){ ok(a === b, m + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')'); }

function extractFn(name){
  const start = html.indexOf('async function ' + name + '(') >= 0
    ? html.indexOf('async function ' + name + '(')
    : html.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('functie niet gevonden: ' + name);
  let depth = 0, end = -1;
  for (let j = html.indexOf('{', start); j < html.length; j++){
    const ch = html[j];
    if (ch === '{') depth++; else if (ch === '}'){ depth--; if (depth === 0){ end = j; break; } }
  }
  return html.slice(start, end + 1);
}
// Levert het objectliteraal zelf op, zodat het als waarde bruikbaar is in deze module.
function extractConst(name){
  const start = html.indexOf('const ' + name + ' = {');
  if (start < 0) throw new Error('const niet gevonden: ' + name);
  const open = html.indexOf('{', start);
  let depth = 0, end = -1;
  for (let j = open; j < html.length; j++){
    const ch = html[j];
    if (ch === '{') depth++; else if (ch === '}'){ depth--; if (depth === 0){ end = j; break; } }
  }
  return eval('(' + html.slice(open, end + 1) + ')');
}

console.log('\n[Lichaam] Spiergroep-detail');

// ── 1. scherm en route ───────────────────────────────────────────────────────
console.log('  scherm en route');
eq((html.match(/<div class="scr" id="s-lich-spier">/g) || []).length, 1, 'het detailscherm bestaat precies één keer');
ok(html.indexOf("if(id==='s-lich-spier')renderLichaamSpierDetail();") >= 0,
   'de route hangt in de bestaande go()-router');
ok(html.indexOf('let lichSpierSel = null;') >= 0,
   'de selectie loopt via een module-variabele — hetzelfde patroon als _minePendingSeg');
ok(/function openSpierDetail\(naam\)\{ lichSpierSel = naam; go\('s-lich-spier'\); \}/.test(html),
   'er is één ingang naar het detail');
eq((html.match(/openSpierDetail\(/g) || []).length, 3,
   'openSpierDetail wordt één keer gedefinieerd en vanaf twee plekken aangeroepen (overzicht en lijst)');
ok(html.indexOf('id="lich-spier-body"') >= 0 && html.indexOf('id="lich-spier-naam"') >= 0,
   'het detail heeft zijn eigen containers');
ok(/<div class="scr" id="s-lich-spier">[\s\S]{0,1600}<nav class="bnav"/.test(html),
   'het detailscherm heeft dezelfde bottom navigation');
ok(/:is\(#s-lichaam,#s-lich-spieren,#s-lich-spier,#s-lich-health,#s-lich-metingen\)/.test(html),
   'het detail valt binnen dezelfde stijl-scope — geen aparte stijlen');

// De inline handlers moeten geldige HTML opleveren: een dubbele quote in het attribuut
// breekt de attribuutwaarde en levert een SyntaxError bij het klikken.
ok(html.indexOf('onclick="openSpierDetail(&quot;') >= 0 || !/onclick="openSpierDetail\("/.test(html),
   'de onclick-handler breekt het attribuut niet met een dubbele quote');

// ── 2. geen tweede rekenwaarheid ─────────────────────────────────────────────
console.log('  geen tweede rekenwaarheid');
const detail = extractFn('renderLichaamSpierDetail');
ok(detail.indexOf('v43OverallRecovery') >= 0, 'herstel komt uit v43OverallRecovery');
ok(detail.indexOf('muscleLoadBySvgId') >= 0, 'belasting komt uit muscleLoadBySvgId');
ok(detail.indexOf('MUSCLE_RECOVERY_HOURS[naam]') >= 0, 'basisuren komen uit MUSCLE_RECOVERY_HOURS');
ok(detail.indexOf('getExerciseMuscles') >= 0, 'de oefening→spier-koppeling is de bestaande');
ok(detail.indexOf('lichRecStatus') >= 0 && detail.indexOf('lichLoadStatus') >= 0,
   'status en kleur komen uit dezelfde helpers als het overzicht');
// Alleen de UITVOERBARE code telt: een verwijzing in de uitlegtekst is juist gewenst.
const detailCode = detail.replace(/\/\/[^\n]*/g, '').replace(/'(\\.|[^'\\])*'/g, "''");
ok(!/computeMuscleRecoveryPct\(|calculateMuscleRecoveryPct\(|3600000/.test(detailCode),
   'het detail berekent zelf geen herstel — het leest alleen');
ok(detail.indexOf('recovery.v1') >= 0, 'de gebruikte formuleversie wordt benoemd');
ok(!/\b(72|48|60)\s*;/.test(detail.replace(/MUSCLE_RECOVERY_HOURS/g,'')),
   'er staan geen hardcoded hersteluren in het detail');

// ── 3. één definitie van een spiergroep ──────────────────────────────────────
console.log('  consistentie van de spiergroep-definities');
const MUSCLE_RECOVERY_HOURS = extractConst('MUSCLE_RECOVERY_HOURS');
const MUSCLE_NAME_TO_SVG_IDS = extractConst('MUSCLE_NAME_TO_SVG_IDS');
eval(extractFn('lichSpierZijde'));

const recNamen = Object.keys(MUSCLE_RECOVERY_HOURS);
const svgNamen = Object.keys(MUSCLE_NAME_TO_SVG_IDS);
recNamen.forEach(n => ok(svgNamen.indexOf(n) >= 0,
  'spiergroep "' + n + '" uit het herstelmodel bestaat ook in de svg-mapping'));
svgNamen.forEach(n => ok(recNamen.indexOf(n) >= 0,
  'spiergroep "' + n + '" uit de svg-mapping heeft ook een herstelmodel'));
eq(recNamen.length, svgNamen.length, 'beide lijsten bevatten evenveel spiergroepen');

// De zijde-afleiding mag nooit een lege of onbekende waarde opleveren.
recNamen.forEach(n => {
  const z = lichSpierZijde(n);
  ok(z === 'front' || z === 'back', 'zijde van "' + n + '" is front of back (kreeg ' + z + ')');
});
eq(lichSpierZijde('Quadriceps'), 'front', 'Quadriceps staat aan de voorzijde');
eq(lichSpierZijde('Borst'), 'front', 'Borst staat aan de voorzijde');
eq(lichSpierZijde('Hamstrings'), 'back', 'Hamstrings staat aan de achterzijde');
eq(lichSpierZijde('Billen'), 'back', 'Billen staat aan de achterzijde');
eq(lichSpierZijde('Triceps'), 'back', 'Triceps staat aan de achterzijde');
eq(lichSpierZijde('Rug'), 'back', 'Rug staat aan de achterzijde');
eq(lichSpierZijde('Onbekende groep'), 'front', 'een onbekende naam valt veilig terug op de voorzijde');

// Elke svg-id die aan een spiergroep hangt, moet ook echt bij een spier horen.
const alleIds = new Set();
svgNamen.forEach(n => (MUSCLE_NAME_TO_SVG_IDS[n] || []).forEach(id => alleIds.add(id)));
ok(alleIds.size > 0, 'er zijn svg-ids gekoppeld');
[...alleIds].forEach(id => ok(/^(left|right)_|^rectus_abdominis$/.test(id),
  'svg-id "' + id + '" volgt de naamconventie van de anatomie-assets'));

// ── 4. de statushelpers gebruiken de engine-drempels ─────────────────────────
console.log('  drempels ongewijzigd');
eval(extractFn('lichRecStatus'));
eval(extractFn('lichLoadStatus'));
eq(lichRecStatus(100)[0], 'Hersteld', '100% is hersteld');
eq(lichRecStatus(85)[0],  'Hersteld', '85% is de ondergrens van hersteld (engine-drempel)');
eq(lichRecStatus(84)[0],  'Aandacht', '84% vraagt aandacht');
eq(lichRecStatus(50)[0],  'Aandacht', '50% is de ondergrens van aandacht (engine-drempel)');
eq(lichRecStatus(49)[0],  'Vermoeid', 'onder 50% is vermoeid');
eq(lichLoadStatus(12)[0], 'Hoog',      '12 sets is hoog (engine-drempel)');
eq(lichLoadStatus(11)[0], 'Gemiddeld', '11 sets is gemiddeld');
eq(lichLoadStatus(6)[0],  'Gemiddeld', '6 sets is de ondergrens van gemiddeld');
eq(lichLoadStatus(5)[0],  'Laag',      '5 sets is laag');
eq(lichLoadStatus(0)[0],  'Rustdag',   '0 sets is een rustdag, geen lage belasting');

console.log('\n  ' + pass + ' geslaagd, ' + fail + ' gefaald');
if (fail) process.exit(1);
