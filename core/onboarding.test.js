/* TrainingKompas — Onboarding Core test suite (node, standalone). AI Conversational Intake.
 * Draai: node core/onboarding.test.js
 * Bewijst: deterministische vertakking/vragenset, validatie/normalisatie, AI-loze fallback-parser,
 * mapping naar bestaande tabellen (atleet_profiel/training_context/goals/athlete_conditions), purity. */
const fs = require('fs');
const path = require('path');
const O = require('./onboarding.js');

let pass = 0, fail = 0;
const T = (n, fn) => { try { fn(); console.log('  ✓ ' + n); pass++; } catch (e) { console.log('  ✗ ' + n + ' :: ' + e.message); fail++; } };
const eq = (a, b, m) => { if (!Object.is(a, b)) throw new Error((m || '') + ' verwacht ' + b + ', kreeg ' + a); };
const ok = (c, m) => { if (!c) throw new Error(m || 'assert'); };
const deq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((m || '') + ' verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a)); };

console.log('\n[A] Vragenset — 4 fasen, verplicht/optioneel');
T('QUESTIONS bevat de minimaal uit te vragen velden', () => {
  var fields = O.QUESTIONS.map(q => q.field);
  ['naam', 'primary_goal', 'leeftijd', 'lengte', 'geslacht', 'frequency', 'days', 'duration_min',
   'location', 'equipment', 'niveau', 'sport', 'secondary_goals', 'limitations', 'avoid_exercises']
    .forEach(f => ok(fields.indexOf(f) !== -1, 'ontbreekt: ' + f));
});
T('elke vraag heeft prompt + why (uitleg waarom we het vragen)', () => {
  O.QUESTIONS.forEach(q => { ok(q.prompt && q.prompt.length > 3, 'prompt ' + q.id); ok(q.why && q.why.length > 3, 'why ' + q.id); });
});
T('fasen lopen 1..4 en zijn niet-dalend in de lijstvolgorde', () => {
  var prev = 0; O.QUESTIONS.forEach(q => { ok(q.phase >= prev, 'fase-volgorde ' + q.id); prev = q.phase; });
  ok(prev === 4, 'laatste fase moet 4 zijn');
});

console.log('\n[B] nextQuestion — deterministische vertakking');
T('lege state -> eerste vraag (naam)', () => eq(O.nextQuestion({ values: {}, answered: {} }).field, 'naam'));
T('na naam -> primary_goal', () => eq(O.nextQuestion({ values: { naam: 'Max' }, answered: { naam: true } }).field, 'primary_goal'));
T('locatie=gym slaat apparatuur-vraag over', () => {
  var st = { values: { location: 'gym' }, answered: { naam: 1, primary_goal: 1, leeftijd: 1, lengte: 1, geslacht: 1, frequency: 1, days: 1, duration_min: 1, location: 1 } };
  eq(O.nextQuestion(st).field, 'niveau', 'gym -> apparatuur overslaan, door naar niveau');
});
T('locatie=thuis vraagt apparatuur wél', () => {
  var st = { values: { location: 'thuis' }, answered: { naam: 1, primary_goal: 1, leeftijd: 1, lengte: 1, geslacht: 1, frequency: 1, days: 1, duration_min: 1, location: 1 } };
  eq(O.nextQuestion(st).field, 'equipment');
});
T('locatie=hybride vraagt apparatuur wél', () => {
  var st = { values: { location: 'hybride' }, answered: { naam: 1, primary_goal: 1, leeftijd: 1, lengte: 1, geslacht: 1, frequency: 1, days: 1, duration_min: 1, location: 1 } };
  eq(O.nextQuestion(st).field, 'equipment');
});
T('alles beantwoord -> null (geen vraag meer)', () => {
  var answered = {}; O.QUESTIONS.forEach(q => answered[q.field] = true);
  eq(O.nextQuestion({ values: { location: 'thuis' }, answered: answered }), null);
});

console.log('\n[C] canFinish / requiredRemaining — verplichte velden');
T('optionele velden blokkeren afronden niet', () => {
  var answered = { naam: 1, primary_goal: 1, leeftijd: 1, lengte: 1, geslacht: 1, frequency: 1, duration_min: 1, location: 1, niveau: 1, sport: 1 };
  ok(O.canFinish({ values: { location: 'gym' }, answered: answered }), 'gym+verplicht ingevuld = kan afronden');
});
T('ontbrekend verplicht veld blokkeert afronden', () => {
  var answered = { naam: 1, primary_goal: 1, leeftijd: 1, lengte: 1, geslacht: 1 };
  ok(!O.canFinish({ values: {}, answered: answered }));
  ok(O.requiredRemaining({ values: {}, answered: answered }).indexOf('frequency') !== -1);
});
T('thuis zonder apparatuur kan tóch afronden (apparatuur is optioneel)', () => {
  var answered = { naam: 1, primary_goal: 1, leeftijd: 1, lengte: 1, geslacht: 1, frequency: 1, duration_min: 1, location: 1, niveau: 1, sport: 1 };
  ok(O.canFinish({ values: { location: 'thuis' }, answered: answered }));
});

console.log('\n[D] validateField — bereik/enum/normalisatie');
T('leeftijd binnen 10..100', () => { ok(O.validateField('leeftijd', '34').ok); ok(!O.validateField('leeftijd', '5').ok); ok(!O.validateField('leeftijd', '150').ok); });
T('lengte binnen 100..250', () => { eq(O.validateField('lengte', '183').value, 183); ok(!O.validateField('lengte', '80').ok); });
T('frequency 1..14', () => { eq(O.validateField('frequency', '4').value, 4); ok(!O.validateField('frequency', '0').ok); ok(!O.validateField('frequency', '20').ok); });
T('duration 5..240', () => { eq(O.validateField('duration_min', '60').value, 60); ok(!O.validateField('duration_min', '3').ok); });
T('primary_goal enum', () => { eq(O.validateField('primary_goal', 'Kracht').value, 'kracht'); ok(!O.validateField('primary_goal', 'onzin').ok); });
T('location enum', () => { eq(O.validateField('location', 'GYM').value, 'gym'); ok(!O.validateField('location', 'ergens').ok); });
T('geslacht man/vrouw', () => { eq(O.validateField('geslacht', 'Man').value, 'man'); ok(!O.validateField('geslacht', 'x').ok); });
T('days filtert onbekende dagen + ontdubbelt', () => deq(O.validateField('days', ['ma', 'ma', 'xx', 'vr']).value, ['ma', 'vr']));
T('lijst-velden: vrije tekst -> array, ontdubbeld', () => deq(O.validateField('equipment', 'barbell, barbell en dumbbells').value, ['barbell', 'dumbbells']));

console.log('\n[E] validateCandidate — volledig object');
T('geldig kandidaat -> valid', () => {
  var r = O.validateCandidate({ naam: 'Max', primary_goal: 'kracht', leeftijd: 34, lengte: 183, geslacht: 'man', frequency: 4, duration_min: 60, location: 'gym', niveau: 'ervaren', sport: 'crossfit' });
  ok(r.valid, JSON.stringify(r.errors));
});
T('ongeldige leeftijd -> error + default null, geen crash', () => {
  var r = O.validateCandidate({ leeftijd: 3 });
  ok(!r.valid); ok(r.errors.leeftijd); eq(r.normalized.leeftijd, null);
});
T('ontbrekende lijst-velden -> lege array (geen aanname)', () => {
  var r = O.validateCandidate({ naam: 'Max' });
  deq(r.normalized.equipment, []); deq(r.normalized.secondary_goals, []);
});

console.log('\n[F] parseAnswerLocally — AI-loze deterministische fallback');
T('getal uit vrije tekst', () => { eq(O.parseAnswerLocally('leeftijd', 'ik ben 34 jaar').value, 34); eq(O.parseAnswerLocally('frequency', 'meestal 4 keer').value, 4); });
T('geslacht uit tekst', () => { eq(O.parseAnswerLocally('geslacht', 'ik ben een man').value, 'man'); eq(O.parseAnswerLocally('geslacht', 'vrouw').value, 'vrouw'); });
T('doel uit tekst', () => { eq(O.parseAnswerLocally('primary_goal', 'ik wil sterker worden').value, 'kracht'); eq(O.parseAnswerLocally('primary_goal', 'wat vet kwijt').value, 'afvallen'); });
T('locatie uit tekst', () => { eq(O.parseAnswerLocally('location', 'thuis in de garage').value, 'thuis'); eq(O.parseAnswerLocally('location', 'in de sportschool').value, 'gym'); });
T('dagen uit tekst', () => deq(O.parseAnswerLocally('days', 'maandag, woensdag en vrijdag').value, ['ma', 'wo', 'vr']));
T('naam uit tekst strip prefix + voornaam', () => eq(O.parseAnswerLocally('naam', 'ik heet Maurice').value, 'Maurice'));
T('"geen" bij lijst -> lege array met hoge confidence', () => { var r = O.parseAnswerLocally('limitations', 'nee, geen'); deq(r.value, []); ok(r.confidence >= 0.8); });
T('onduidelijk -> confidence 0, value null', () => { var r = O.parseAnswerLocally('primary_goal', 'weet ik niet'); eq(r.value, null); eq(r.confidence, 0); });

console.log('\n[G] buildExtractionPrompt — AI structureert, rekent niet');
T('prompt noemt veld, verbiedt rekenen, vraagt JSON', () => {
  var p = O.buildExtractionPrompt('q_goal');
  ok(/REKENT niet/i.test(p) || /rekent niet/i.test(p), 'moet rekenen verbieden');
  ok(/JSON/.test(p)); ok(p.indexOf('primary_goal') !== -1);
});
T('enum-vraag noemt toegestane waarden', () => { var p = O.buildExtractionPrompt('q_location'); ok(p.indexOf('thuis') !== -1 && p.indexOf('gym') !== -1); });

console.log('\n[H] Mapping -> BESTAANDE tabellen (geen tweede source of truth)');
var cand = {
  naam: 'Max', primary_goal: 'kracht', leeftijd: 34, lengte: 183, geslacht: 'man',
  frequency: 4, days: ['ma', 'wo', 'vr'], duration_min: 60, location: 'thuis',
  equipment: ['barbell', 'rack'], niveau: 'ervaren', sport: 'powerlifting',
  secondary_goals: ['Eerste muscle-up'], limitations: ['Lage rug'], avoid_exercises: ['Sumo Deadlift']
};
T('toAtleet mapt naar bestaande kolommen + behoudt klasse', () => {
  var a = O.toAtleet(cand, { klasse: 'M35', naam: 'oud' });
  eq(a.naam, 'Max'); eq(a.doel, 'kracht'); eq(a.sport, 'powerlifting'); eq(a.klasse, 'M35', 'klasse behouden');
});
T('toTrainingContextRow bevat user_id + trainingscontext, geen doel/naam', () => {
  var r = O.toTrainingContextRow(cand, 'u1');
  eq(r.user_id, 'u1'); eq(r.frequency, 4); eq(r.location, 'thuis');
  deq(r.days, ['ma', 'wo', 'vr']); deq(r.equipment, ['barbell', 'rack']); deq(r.avoid_exercises, ['Sumo Deadlift']);
  ok(!('doel' in r) && !('naam' in r), 'geen kernprofiel-velden in training_context');
});
T('lege lijsten -> null in training_context (geen lege arrays opslaan)', () => {
  var r = O.toTrainingContextRow({ frequency: 3 }, 'u1');
  eq(r.days, null); eq(r.equipment, null); eq(r.avoid_exercises, null);
});
T('toSecondaryGoals -> goals-records type eigen', () => {
  var g = O.toSecondaryGoals(cand, 'u1');
  eq(g.length, 1); eq(g[0].type, 'eigen'); eq(g[0].naam, 'Eerste muscle-up'); eq(g[0].status, 'actief'); eq(g[0].user_id, 'u1');
});
T('toConditions -> athlete_conditions-records (user_id via trigger, niet hier)', () => {
  var c = O.toConditions(cand);
  eq(c.length, 1); eq(c[0].label, 'Lage rug'); eq(c[0].active, true); ok(!('user_id' in c[0]), 'user_id komt van DB-trigger');
});
T('geen nevendoelen/condities -> lege arrays', () => { deq(O.toSecondaryGoals({}, 'u1'), []); deq(O.toConditions({}), []); });

console.log('\n[I] summaryLines — "Dit heb ik van je begrepen" (bewerkbaar)');
T('samenvatting dekt alle velden met labels', () => {
  var s = O.summaryLines(cand);
  eq(s.length, 15);
  var byField = {}; s.forEach(x => byField[x.field] = x.value);
  eq(byField.naam, 'Max'); ok(/Kracht/.test(byField.primary_goal)); ok(/4x/.test(byField.frequency));
});
T('lege waarden -> streepje, geen crash', () => { var s = O.summaryLines({}); s.forEach(x => ok(typeof x.value === 'string')); });

console.log('\n[K] contextSummary — training_context voor de AI-coachcontext');
T('lege/afwezige context -> lege string', () => { eq(O.contextSummary(null), ''); eq(O.contextSummary({}), ''); });
T('samenvatting bevat frequentie/locatie/vermijden', () => {
  var s = O.contextSummary({ frequency: 4, days: ['ma', 'wo'], duration_min: 60, location: 'gym', equipment: [], avoid_exercises: ['Sumo Deadlift'] });
  ok(/4x per week/.test(s)); ok(/locatie: gym/.test(s)); ok(/te vermijden: Sumo Deadlift/.test(s));
  ok(s.indexOf('materiaal') === -1, 'lege equipment niet tonen');
});

console.log('\n[J] Purity — geen DOM/DB/AI/Date in de core');
T('geen verboden tokens in onboarding.js', () => {
  var raw = fs.readFileSync(path.join(__dirname, 'onboarding.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  ['document', 'localStorage', 'sessionStorage', 'querySelector', 'XMLHttpRequest', 'new Date', 'Date.now', 'supabase']
    .forEach(tok => ok(raw.indexOf(tok) === -1, 'verboden token aanwezig: ' + tok));
  ok(!/fetch\s*\(/.test(raw), 'fetch( aanwezig');
  ok(!/\.from\s*\(/.test(raw), '.from( aanwezig');
});

console.log('\n' + '='.repeat(56));
console.log('RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail > 0) { console.log('⚠ Onboarding Core niet groen.'); process.exit(1); }
console.log('✅ Onboarding Core groen.');
