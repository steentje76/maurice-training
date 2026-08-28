/* fLoadProgressionRegistry.test.js — MS-F3-02 regressietest.
 *
 * Twee delen:
 * A. Functionele tests voor de NIEUWE sRPE-bouwstenen (sessionLoadSRPE, rollingLoadSum) --
 *    golden cases, boundaries, invalid input, determinisme.
 * B. Structurele registry-tests: elk CALC-LOAD-item in docs/CALCULATION_REGISTRY.md heeft
 *    de verplichte velden, en evidence-inflatie wordt gedetecteerd (CALC-LOAD-001 mag nooit
 *    boven C komen zonder de methodologische kritiek te vermelden; CALC-LOAD-002/004/005
 *    mogen nooit A/B worden).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const ROOT = path.join(__dirname, '..');
const TrainingLoadCore = require(path.join(ROOT, 'core/trainingLoad.js'));
const registryText = fs.readFileSync(path.join(ROOT, 'docs/CALCULATION_REGISTRY.md'), 'utf8');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

// ---- A. sessionLoadSRPE (Foster-methode) ----
ok(TrainingLoadCore.sessionLoadSRPE(3600, 7) === 420, 'sessionLoadSRPE: 60 min × RPE7 = 420 AU (golden case)');
ok(TrainingLoadCore.sessionLoadSRPE(1800, 5) === 150, 'sessionLoadSRPE: 30 min × RPE5 = 150 AU');
ok(TrainingLoadCore.sessionLoadSRPE(0, 7) === null, 'sessionLoadSRPE: duur 0 -> null (geen fabricage)');
ok(TrainingLoadCore.sessionLoadSRPE(3600, -1) === null, 'sessionLoadSRPE: negatieve RPE -> null');
ok(TrainingLoadCore.sessionLoadSRPE(3600, 11) === null, 'sessionLoadSRPE: RPE boven schaal (>10) -> null');
ok(TrainingLoadCore.sessionLoadSRPE(null, 7) === null, 'sessionLoadSRPE: ontbrekende duur -> null');
ok(TrainingLoadCore.sessionLoadSRPE('3600', '7') === 420, 'sessionLoadSRPE: string-invoer wordt correct geparsed');
ok(TrainingLoadCore.sessionLoadSRPE(3600, 7) === TrainingLoadCore.sessionLoadSRPE(3600, 7), 'sessionLoadSRPE: deterministisch (zelfde invoer, zelfde uitkomst)');

// ---- A2. rollingLoadSum ----
ok(TrainingLoadCore.rollingLoadSum([100, 200, 300]) === 600, 'rollingLoadSum: eenvoudige som');
ok(TrainingLoadCore.rollingLoadSum([]) === 0, 'rollingLoadSum: lege lijst -> 0 (niet "onbekend")');
ok(TrainingLoadCore.rollingLoadSum([100, null, 200, undefined, 'x']) === 300, 'rollingLoadSum: ongeldige waarden genegeerd, niet als 0 meegeteld-fout of crash');
ok(TrainingLoadCore.rollingLoadSum(null) === 0, 'rollingLoadSum: null-invoer -> 0, geen crash');

// ---- A3. Bestaande ACWR-classificatie blijft ongewijzigd (regressie op eerdere functionaliteit) ----
ok(TrainingLoadCore.classifyAcwr(0.7) === 'lager', 'classifyAcwr ongewijzigd: 0.7 -> lager');
ok(TrainingLoadCore.classifyAcwr(1.4) === 'hoger', 'classifyAcwr ongewijzigd: 1.4 -> hoger');
ok(TrainingLoadCore.corroboratedLoadSignal('sterk_hoger', 2) === true, 'corroboratedLoadSignal ongewijzigd: hoge ACWR + 2 dalende oefeningen -> true');
ok(TrainingLoadCore.corroboratedLoadSignal('sterk_hoger', 1) === false, 'corroboratedLoadSignal ongewijzigd: hoge ACWR maar slechts 1 dalende oefening -> false (nooit één los signaal)');

// ---- B. Registry-structuur ----
const items = registryText.split(/(?=^### CALC-LOAD-)/m).filter(s => s.startsWith('### CALC-LOAD-'));
ok(items.length === 5, 'exact 5 CALC-LOAD-items gevonden (001 t/m 005)');

const REQUIRED_FIELDS = ['Domain', 'Name', 'Version', 'Formula', 'Implementation', 'Evidence level', 'Limitations', 'Forbidden interpretations'];
items.forEach(item => {
  const idMatch = item.match(/### (CALC-LOAD-\d+)/);
  const id = idMatch ? idMatch[1] : '???';
  REQUIRED_FIELDS.forEach(f => {
    ok(new RegExp('\\|\\s*' + f + '\\s*\\|').test(item), id + ' bevat het verplichte registry-veld "' + f + '"');
  });
});

// ---- B2. Evidence-inflatie-detectie ----
{
  const acwr = items.find(i => i.startsWith('### CALC-LOAD-001'));
  ok(acwr && /Evidence level \| \*\*C\*\*/.test(acwr),
    'CALC-LOAD-001 (ACWR-classificatie) is correct als C geclassificeerd, NIET B — de methodologische kritiek (mathematical coupling) rechtvaardigt een conservatievere classificatie');
  ok(acwr && /mathematical coupling/i.test(acwr),
    'CALC-LOAD-001 vermeldt expliciet de bekende methodologische kritiek op ACWR (Windt & Gabbett 2018) — geen eenzijdig positief bronverhaal');

  ['002', '004', '005'].forEach(n => {
    const it = items.find(i => i.startsWith('### CALC-LOAD-' + n));
    ok(it && /Evidence level \| \*\*E\*\*/.test(it),
      'CALC-LOAD-' + n + ' is correct als E geclassificeerd (product heuristic / zuiver technisch), geen evidence-inflatie');
  });

  const srpe = items.find(i => i.startsWith('### CALC-LOAD-003'));
  ok(srpe && /Evidence level \| \*\*B\*\*/.test(srpe),
    'CALC-LOAD-003 (Foster sRPE) is als B geclassificeerd — een breed toegepaste, gevalideerde methode, geciteerd met een specifieke, formule-eigen bron (niet een algemene review)');
}

// ---- B3. Forbidden-interpretation-bewaking voor de Decision-grens ----
{
  const trend = items.find(i => i.startsWith('### CALC-LOAD-004'));
  ok(trend && /deload/i.test(trend) && /Decision Engine/.test(trend),
    'CALC-LOAD-004 legt expliciet vast dat trendBy() zelf nooit "deload nodig" concludeert — dat blijft Decision Engine-logica (MS-F3-07)');
}

console.log('fLoadProgressionRegistry: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
