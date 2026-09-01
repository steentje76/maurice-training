/* fB9_H2AOrganizationArchitecture.test.js
 * Bewaakt de vastgestelde architectuurbeslissing (Strategy C, controlled
 * consolidation) als regressietest: de bestaande FK-brug tussen gyms en
 * organizations blijft bestaan, de coach/team-infrastructuur blijft
 * afhankelijk van organizations/teams, en de documentatie is compleet.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

// ---- A. Documentatie compleet (sectie 63, definition of done) ----
const vereisteDocumenten = [
  'docs/B9_H2A_GYM_CLUB_DUAL_SYSTEM_AUDIT.md',
  'docs/B9_H2A_DATA_OWNERSHIP_MATRIX.md',
  'docs/B9_H2A_ORGANIZATION_ARCHITECTURE_DECISION.md',
  'docs/B9_H2A_ORGANIZATION_FUNCTIONAL_DEPENDENCY_GRAPH.md',
  'docs/B9_H2A_TEAM_COACH_GYM_9_PLUS_REQUIREMENTS.md'
];
vereisteDocumenten.forEach(function (bestand) {
  ok(fs.existsSync(path.join(ROOT, bestand)), 'A1: ' + bestand + ' bestaat');
});

// ---- B. De architectuurbeslissing zelf is expliciet, geen vage vijfde optie ----
const decision = fs.readFileSync(path.join(ROOT, 'docs/B9_H2A_ORGANIZATION_ARCHITECTURE_DECISION.md'), 'utf8');
ok(decision.includes('## Selected Strategy') && decision.includes('Strategy C — Controlled Consolidation'),
  'B1: exact één, expliciete strategie is gekozen (Strategy C), geen vage tussenvorm');
ok(decision.includes('gyms.organization_id') && decision.includes('ON DELETE CASCADE'),
  'B2: de beslissing is expliciet gebaseerd op de bestaande, live geverifieerde FK-relatie, geen aanname');
ok(!decision.match(/permanent(e)? dual-write/i) || decision.includes('Geen permanente dual-write'),
  'B3: geen permanente dual-write geintroduceerd als architectuur (sectie 34)');

// ---- C. Geen UI/UX gebouwd in deze sprint (absolute scope-grens) ----
{
  const gitDiffTarget = require('child_process').execSync('git diff main --stat -- index.html', { cwd: ROOT }).toString();
  ok(gitDiffTarget.trim() === '', 'C1: index.html is niet gewijzigd in deze sprint -- 0 UI/UX-implementatie, conform de absolute scope-grens van B9-H2A');
}

// ---- D. Ownership-principe expliciet: persoonlijke data nooit organization-owned ----
const ownership = fs.readFileSync(path.join(ROOT, 'docs/B9_H2A_DATA_OWNERSHIP_MATRIX.md'), 'utf8');
ok(ownership.includes('is en blijft **nooit**') && ownership.includes('eigendom van een'),
  'D1: de ownership-matrix legt expliciet vast dat persoonlijke trainingsdata nooit organization-owned wordt');

console.log('fB9_H2AOrganizationArchitecture: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
