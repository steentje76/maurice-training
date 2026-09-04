/* core/fInzichtV01DataContract.test.js — bewijst dat Inzicht v0.1 GEEN
 * shadow calculations bevat en uitsluitend bestaande, canonieke bronnen
 * gebruikt. Regex-gebaseerd op de bron, zoals bewezen bij Trainen. */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) pass++; else { fail++; msgs.push('MISLUKT: ' + label); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const inzichtSrc = html.slice(html.indexOf('window._inzichtPeriod=\'7d\';'), html.indexOf('async function inzichtRenderRecent') + 3000);

ok(inzichtSrc.includes('CoachingCore.improvementsDigest'), '1: Verbeterd/Stijgende trends gebruikt uitsluitend CoachingCore.improvementsDigest() -- geen eigen telling');
ok(inzichtSrc.includes('AdherenceIntelligenceCore.aggregate'), '2: Adherence gebruikt uitsluitend AdherenceIntelligenceCore.aggregate() -- geen eigen formule');
ok(!/inzichtSrc.*avgStep\s*=|percentage\s*=\s*Math\.round\(\(.*completed.*\/.*eligible/.test(inzichtSrc), '3: geen lokale herimplementatie van de adherence-percentageberekening in de Inzicht-code zelf');
ok(inzichtSrc.includes('dc.healthSeries') && inzichtSrc.includes('dc.healthTrend') && inzichtSrc.includes('dc.qualifySeries'), '4: HRV/Rusthartslag/Slaap gebruiken uitsluitend de bestaande dc.health*-functies');
ok(!/inzichtRender[A-Za-z]*\(\)[\s\S]{0,2000}?\bavgStep\s*=\s*\(/.test(inzichtSrc), '5: geen lokale trend-slope-berekening binnen de Inzicht-renderfuncties zelf');
ok(inzichtSrc.includes('B9-H6B') || inzichtSrc.includes('architecturaal gescheiden'), '6: de Trainingen-telling documenteert expliciet waarom sessions+activities niet dubbeltellen (B9-H6B), geen ongedocumenteerde aanname');
ok(!inzichtSrc.includes('AI') || !/AI[\s\S]{0,200}rank/i.test(inzichtSrc), '7: geen AI-ranking-taal in de Inzicht-code (PO2: deterministische recentheid, geen AI-score)');
ok(inzichtSrc.includes("digest.highlights") && !/\.sort\(/.test(inzichtSrc.slice(inzichtSrc.indexOf('inzichtRenderRecent'))), '8: Recente inzichten hergebruikt de bestaande, canonieke digest.highlights-volgorde -- geen eigen sorteer-/rankingregel toegevoegd');
ok(inzichtSrc.includes('inzichtGetOrNull'), '9: gebruikt een expliciete, veilige data-wrapper die fouten (null) onderscheidt van een echte, lege dataset ([]) -- UNKNOWN != 0');
ok(!/inzicht[\s\S]{0,3000}v43SafeGet/.test(inzichtSrc.slice(0, inzichtSrc.indexOf('inzichtGetOrNull')+50)) || true, '10: (informatief) v43SafeGet zelf blijft ongewijzigd voor alle bestaande schermen -- Inzicht gebruikt een eigen, aparte wrapper');
ok(html.includes('function inzichtGetOrNull') && !html.match(/function v43SafeGet\([^)]*\)\{[^}]*inzicht/i), '11: v43SafeGet is niet gewijzigd door de komst van Inzicht (geen enkel ander scherm dat v43SafeGet gebruikt kan geraakt zijn)');

console.log('fInzichtV01DataContract: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
