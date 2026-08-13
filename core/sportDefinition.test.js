/* TrainingKompas — Sport Definition Core test suite (node, standalone).
 * Draai: node core/sportDefinition.test.js
 * Bewijst: structuur, geen application-if-per-sport-logica nodig, en
 * consistentie met de bestaande SPORT_LABELS-sleutels in index.html. */
const fs = require('fs');
const path = require('path');
const SportDefinitionCore = require('./sportDefinition.js');

let pass = 0, fail = 0;
const T = (name, fn) => { try { fn(); console.log('  ✓ ' + name); pass++; } catch (e) { console.log('  ✗ ' + name + ' :: ' + e.message); fail++; } };
const eq = (a, b, m) => { if (!Object.is(a, b)) throw new Error((m || '') + ' verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a)); };
const ok = (c, m) => { if (!c) throw new Error(m || 'assert'); };

console.log('\n🏋️ Sport Definition Core');

console.log('\n[A] Registry — basis');
T('getSportDefinition retourneert bekende sport', () => {
  const d = SportDefinitionCore.getSportDefinition('crossfit');
  ok(d);
  eq(d.label, 'CrossFit/Functioneel');
});
T('getSportDefinition retourneert null voor onbekende sport', () => {
  eq(SportDefinitionCore.getSportDefinition('schaken'), null);
});
T('getSportDefinition retourneert null voor null/undefined', () => {
  eq(SportDefinitionCore.getSportDefinition(null), null);
  eq(SportDefinitionCore.getSportDefinition(undefined), null);
});
T('listSportIds bevat minimaal alle bestaande app-sporten', () => {
  const ids = SportDefinitionCore.listSportIds();
  ['kracht', 'powerlifting', 'crossfit', 'hyrox', 'bodybuilding', 'kettlebell', 'swimming',
   'atletiek', 'triathlon', 'hardlopen', 'stairmaster', 'wielrennen', 'roeien', 'calisthenics',
   'strongman', 'weightlifting', 'algemeen', 'functioneel'].forEach(id => ok(ids.indexOf(id) !== -1, 'mist: ' + id));
});

console.log('\n[B] Metrics — data-driven, geen per-sport if/else nodig door de aanroeper');
T('listMetricsForSport(crossfit) bevat de bekende WOD-metrics', () => {
  const m = SportDefinitionCore.listMetricsForSport('crossfit');
  ['time', 'rounds', 'reps', 'load_kg', 'rpe'].forEach(x => ok(m.indexOf(x) !== -1, 'mist metric: ' + x));
});
T('isMetricValidForSport werkt correct', () => {
  ok(SportDefinitionCore.isMetricValidForSport('roeien', 'split'));
  ok(!SportDefinitionCore.isMetricValidForSport('roeien', 'jumps'));
});
T('onbekende sport geeft lege metric-lijst, geen crash', () => {
  eq(SportDefinitionCore.listMetricsForSport('onbekend').length, 0);
});

console.log('\n[C] Roadmap-sporten (nog niet in de app)');
T('Volleyball-metrics komen letterlijk overeen met master roadmap §7', () => {
  const m = SportDefinitionCore.listMetricsForSport('volleyball');
  ['training_duration', 'jumps', 'jump_load', 'accelerations', 'decelerations', 'heart_rate', 'rpe', 'match_minutes']
    .forEach(x => ok(m.indexOf(x) !== -1, 'mist roadmap-metric: ' + x));
});
T('Volleyball/Football zijn expliciet gemarkeerd als nog niet in de app', () => {
  eq(SportDefinitionCore.getSportDefinition('volleyball').existingInApp, false);
  eq(SportDefinitionCore.getSportDefinition('football').existingInApp, false);
});
T('bestaande app-sporten zijn expliciet gemarkeerd als wél in de app', () => {
  eq(SportDefinitionCore.getSportDefinition('crossfit').existingInApp, true);
  eq(SportDefinitionCore.getSportDefinition('hardlopen').existingInApp, true);
});

console.log('\n[D] Alias-resolutie (roadmap-Engelse namen vs. bestaande NL-sleutels)');
T('resolveCanonicalSportId volgt cycling -> wielrennen', () => {
  eq(SportDefinitionCore.resolveCanonicalSportId('cycling'), 'wielrennen');
});
T('resolveCanonicalSportId volgt running -> hardlopen', () => {
  eq(SportDefinitionCore.resolveCanonicalSportId('running'), 'hardlopen');
});
T('resolveCanonicalSportId op een niet-alias-sport geeft zichzelf terug', () => {
  eq(SportDefinitionCore.resolveCanonicalSportId('crossfit'), 'crossfit');
});
T('resolveCanonicalSportId op onbekende sport geeft null', () => {
  eq(SportDefinitionCore.resolveCanonicalSportId('onbekend'), null);
});

console.log('\n[E] Consistentie met de daadwerkelijke index.html SPORT_LABELS (geen documentatie-drift)');
T('elke sleutel in SPORT_LABELS (index.html) bestaat als SportDefinition met existingInApp=true', () => {
  const IDX = fs.readFileSync(process.env.TK_INDEX || path.join(__dirname, '..', 'index.html'), 'utf8');
  const m = IDX.match(/const SPORT_LABELS=\{([^}]*)\}/);
  ok(m, 'SPORT_LABELS niet gevonden in index.html — is de sleutelnaam gewijzigd?');
  const keys = m[1].split(',').map(pair => pair.split(':')[0].trim()).filter(Boolean);
  ok(keys.length >= 17, 'onverwacht weinig sport-sleutels gevonden: ' + keys.length);
  keys.forEach(k => {
    const def = SportDefinitionCore.getSportDefinition(k);
    ok(def, 'SPORT_LABELS-sleutel "' + k + '" ontbreekt in SportDefinitionCore-registry');
    eq(def.existingInApp, true, 'sleutel "' + k + '" moet existingInApp=true zijn');
  });
});

console.log('\n[F] Architecture guards');
T('sport-definition-core bevat geen DOM/DB/AI/network-afhankelijkheid', () => {
  const src = fs.readFileSync(path.join(__dirname, 'sportDefinition.js'), 'utf8');
  ['document.', 'window.fetch', 'supabase', 'XMLHttpRequest', 'localStorage', 'new Date', 'Math.random'].forEach(tok => {
    ok(src.indexOf(tok) === -1, 'verboden token gevonden: ' + tok);
  });
});
T('geen enkele metric-vermelding is een lege string of duplicaat binnen dezelfde sport', () => {
  SportDefinitionCore.listSportIds().forEach(id => {
    const m = SportDefinitionCore.listMetricsForSport(id);
    const uniq = new Set(m);
    eq(uniq.size, m.length, 'duplicaat metric bij sport ' + id);
    m.forEach(x => ok(x && x.length > 0, 'lege metric-string bij sport ' + id));
  });
});

console.log('\n========================================================');
console.log(`RESULTAAT: ${pass} geslaagd, ${fail} mislukt`);
if (fail === 0) console.log('✅ Alle Sport Definition-tests groen.');
else process.exit(1);
