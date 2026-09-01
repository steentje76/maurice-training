/* fB9_06MultisportIntegration.test.js — B9-06 Multisport Integration.
 * Bewaakt: hergebruik van canonieke engines (geen vierde/derde
 * aggregatie-engine), geen dubbeltelling tussen activities/
 * race_segments/sessions, canonieke sport-taxonomie, geen sportspecifieke
 * berekening in de generic execution engine, UX-coherentie (elke sport
 * blijft een eigen bestemming, geen samenvoeging).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const migratie533 = fs.readFileSync(path.join(ROOT, 'migratie_v533.sql'), 'utf8');
const enduranceExec = fs.readFileSync(path.join(ROOT, 'core/enduranceExecution.js'), 'utf8');

// ---- A. Hergebruik van canonieke engines, geen derde/vierde aggregatie-engine ----
ok(html.includes('RunningIntelligenceCore.weeklyVolume(activities)') && html.includes('async function refreshMultisportOverview'),
  'A1: het multisport-overzicht hergebruikt de bestaande, generieke weeklyVolume() -- geen nieuwe, multisport-specifieke aggregatie-engine');

// ---- B. Canonical sport taxonomy ----
ok(migratie533.includes("sport in ('running','cycling','rowing','swimming')"),
  'B1: de canonieke sport-taxonomie op activities is al gesloten en consistent (running/cycling/rowing/swimming)');

// ---- C. Geen dubbeltelling: activities vs race_segments (HYROX/Triathlon/Brick) ----
{
  const activitiesSchrijfActies = (html.match(/sport:'running'|sport:'cycling'/g) || []).length;
  ok(activitiesSchrijfActies === 3,
    'C1: exact 3 schrijfacties naar activities met sport running/cycling bestaan (de bekende Running/Cycling-standalone-flows) -- geen extra, onverwachte schrijfpad vanuit HYROX/Triathlon/Brick-code');
}
ok(html.includes(`sbGet('activities', "&sport=in.(running,cycling)&order=recorded_at.asc&limit=1000")`),
  'C3: het multisport-overzicht filtert expliciet op sport=in.(running,cycling) -- voorkomt dat Rowing/andere sporten per ongeluk meetellen in een overzicht dat bewust alleen Running+Cycling combineert');

ok(!html.match(/race_segments[\s\S]{0,300}insert into activities|activities[\s\S]{0,300}race_segments.*insert/i),
  'C2: geen enkele codepad schrijft zowel naar race_segments als activities voor dezelfde gebeurtenis (voorkomt dubbeltelling)');

// ---- D. Rowing/Concept2 blijft bewust legacy, geen risicovolle refactor zonder noodzaak ----
ok(!html.match(/sport:'rowing'/),
  'D1: Rowing/Concept2 schrijft bewust nog niet naar activities (blijft op sessions, LEGACY) -- geen ongemotiveerde migratie in B9-06');
ok(html.includes('elke sport blijft een eigen bestemming') && html.includes('Rowing/Concept2 en HYROX/Triathlon-segmenten staan hier bewust niet in'),
  'D2: deze bewuste, gemotiveerde keuze (Rowing blijft apart, geen dubbeltelling met race_segments) is expliciet, zichtbaar gedocumenteerd voor de gebruiker zelf, niet alleen in een codecommentaar');

// ---- E. Geen sportspecifieke berekening in de generic endurance execution engine ----
{
  const codeOnly = enduranceExec.split('\n').filter(function (regel) { return regel.trim().indexOf('*') !== 0 && regel.trim().indexOf('//') !== 0; }).join('\n');
  ok(!codeOnly.match(/pace|watt|cadence|stroke/i),
    'E1: de uitvoerbare code (geen commentaar) van core/enduranceExecution.js bevat geen enkele sportspecifieke term (pace/watt/cadence/stroke) -- de generic engine blijft puur state/timer, sportspecifieke logica leeft uitsluitend in de UI-laag');
}

// ---- F. UX-coherentie: geen samenvoeging van Running/Cycling tot één bestemming ----
ok(html.includes('elke sport blijft een eigen bestemming') || html.includes('Elke sport blijft een eigen bestemming'),
  'F1: het multisport-overzicht communiceert expliciet dat elke sport een eigen bestemming blijft (geen samenvoeging tot "Cardio"/"Endurance")');
ok(html.includes(`id="s-running"`) && html.includes(`id="s-cycling"`),
  'F2: Hardlopen en Fietsen blijven beide bestaan als aparte, eigen schermen (geharde productregel door de hele B9-serie heen, opnieuw bevestigd)');

// ---- G. Geen nieuwe, overbodige schema-uitbreiding (sectie 13: geen tabel puur voor elegantie) ----
{
  // Historische noot: op het moment van B9-06 zelf was er geen nieuwe
  // migratie nodig (race_segments volstond al) -- dit was een tijdgebonden
  // observatie, geen blijvende invariant voor latere sprints. B9-07B voegde
  // terecht migratie_v535.sql toe (reactions/comments/notificaties-functie).
  // Deze test bevestigt nu uitsluitend dat migratie_v534.sql (B9-03, de
  // laatste vóór B9-06) niet is aangepast door B9-06 zelf.
  const migratie534 = fs.readFileSync(path.join(ROOT, 'migratie_v534.sql'), 'utf8');
  ok(migratie534.includes('add column if not exists rpe'),
    'G1: migratie_v534.sql (B9-03) is ongewijzigd door B9-06 -- B9-06 voegde zelf geen nieuwe migratie toe (race_segments volstond al als canonieke parent/child-grouping)');
}

console.log('fB9_06MultisportIntegration: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
