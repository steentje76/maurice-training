/* Sprint 12 — DATABEHOUD: sessie-aggregatie en persoonlijke records.
 *
 * Waarom dit bestand bestaat: buildStrengthSessionRow is het hart van de sessie-aggregatie
 * (elke afgeronde krachtoefening loopt erdoorheen) en had tot nu toe GEEN enkele test.
 * Daarnaast dekte niets de vraag die er voor de sporter het meest toe doet: blijft mijn
 * record staan? Deze tests draaien de ECHTE functie en de ECHTE beslisregels uit index.html,
 * niet een nagebouwde kopie, zodat ze breken zodra iemand de logica verandert.
 *
 * Zie ook core/fPrPersistentie.test.js — dat dekt de beslisREGEL rond een record.
 * Dit bestand dekt de aggregatie en het BEHOUD van gegevens over sessies heen.
 *
 * A  Een nieuw record wordt aangemaakt en blijft opgeslagen
 * B  Een bestaand record blijft bestaan als een latere training geen record oplevert
 * C  Een record blijft behouden na opnieuw laden van de state
 * D  Meerdere records bestaan naast elkaar zonder elkaar te overschrijven
 * E  De getoonde waarde komt uit dezelfde bron als de opgeslagen waarde
 * F  Ontbrekende of ongeldige invoer corrumpeert geen bestaande historie
 * G  Aggregatie: zwaarste werkset als kop, alle sets in sets_detail
 *
 * Draai: node core/fDataBehoud.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const D = require('./decision.js');

let pass = 0, fail = 0;
function ok(c, m){ if (c) pass++; else { fail++; console.log('  ✗ ' + m); } }
function eq(a, b, m){ ok(JSON.stringify(a) === JSON.stringify(b), m + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')'); }

// De ECHTE functie uit index.html, via brace-balancing — geen kopie.
function extractFn(name){
  const start = html.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('functie niet gevonden: ' + name);
  let depth = 0, end = -1;
  for (let j = html.indexOf('{', start); j < html.length; j++){
    const ch = html[j];
    if (ch === '{') depth++; else if (ch === '}'){ depth--; if (depth === 0){ end = j; break; } }
  }
  if (end < 0) throw new Error('einde niet gevonden: ' + name);
  return html.slice(start, end + 1);
}
const buildStrengthSessionRow = new Function(extractFn('buildStrengthSessionRow') + '; return buildStrengthSessionRow;')();

console.log('\n[Sprint 12] Databehoud — sessie-aggregatie en persoonlijke records');

/* ── G. AGGREGATIE (had geen enkele dekking) ─────────────────────────────── */
console.log('\nG. Sessie-aggregatie: buildStrengthSessionRow');
const opts = { date: '2026-08-18', training_type: 'A', note: '', instanceId: 'i1' };
const oplopend = buildStrengthSessionRow('sq', [
  { kg: '90',  effKg: 90,  reps: '8', rpe: '7' },
  { kg: '100', effKg: 100, reps: '5', rpe: '8' },
  { kg: '110', effKg: 110, reps: '3', rpe: '9' }
], opts);
eq(oplopend.row.weight, 110, 'G1: kop = zwaarste werkset');
eq(oplopend.row.reps, 3, 'G2: reps horen bij de zwaarste set, niet bij de laatste');
eq(oplopend.row.rpe, 9, 'G3: RPE hoort bij de zwaarste set');
eq(oplopend.row.sets, 3, 'G4: sets telt alle uitgevoerde werksets');
eq(oplopend.setsDetail.length, 3, 'G5: sets_detail bewaart alle sets');

const aflopend = buildStrengthSessionRow('sq', [
  { kg: '110', effKg: 110, reps: '3', rpe: '9' },
  { kg: '100', effKg: 100, reps: '5', rpe: '8' },
  { kg: '90',  effKg: 90,  reps: '8', rpe: '7' }
], opts);
eq(aflopend.row.weight, 110, 'G6: aflopende sets — kop blijft de zwaarste, niet de laatste');
eq(aflopend.setsDetail.map(s => s.effKg), [110, 100, 90], 'G7: sets_detail behoudt de uitvoervolgorde');
eq(aflopend.row.date, '2026-08-18', 'G8: datum wordt doorgegeven');
eq(aflopend.row.training_type, 'A', 'G9: trainingstype wordt doorgegeven');
eq(aflopend.row.training_instance_id, 'i1', 'G10: instance-id wordt doorgegeven');
eq(aflopend.row.exercise_id, 'sq', 'G11: oefening-id wordt doorgegeven');

const zonderEff = buildStrengthSessionRow('sq', [{ kg: '82.5', reps: '5', rpe: '8' }], opts);
eq(zonderEff.row.weight, 82.5, 'G12: zonder effKg valt de aggregatie terug op kg (geen 0, geen null)');
eq(zonderEff.setsDetail[0].effKg, 82.5, 'G13: sets_detail vult effKg met dezelfde afleiding');
const gelijk = buildStrengthSessionRow('sq', [
  { kg: '100', effKg: 100, reps: '5', rpe: '8' },
  { kg: '100', effKg: 100, reps: '4', rpe: '9' }
], opts);
eq(gelijk.row.reps, 5, 'G14: bij gelijk gewicht wint de eerste set (deterministisch, geen willekeur)');
const a1 = JSON.stringify(buildStrengthSessionRow('sq', [{ kg: '100', effKg: 100, reps: '5', rpe: '8' }], opts));
const a2 = JSON.stringify(buildStrengthSessionRow('sq', [{ kg: '100', effKg: 100, reps: '5', rpe: '8' }], opts));
eq(a1, a2, 'G15: dezelfde invoer geeft exact dezelfde rij (deterministisch)');

/* ── Model van de persistentielaag, met de ECHTE beslisregels ────────────── */
// De twee regels die bepalen of en hoe een record wordt bewaard, letterlijk uit index.html.
const finishBron = html.slice(html.indexOf('async function finishSession()'),
                              html.indexOf('function renderNextActionsCard'));
const logSetBron = html.slice(html.indexOf('function logSet(exId,type,setNum,isWork)'),
                              html.indexOf('function toggleSetDone'));
const upsertBron = html.slice(html.indexOf('async function upsertExerciseGoalField'),
                              html.indexOf('async function upsertExerciseGoalField') + 1200);
const mBase = logSetBron.match(/if\(sessionPrBase\[exId\]===undefined\) sessionPrBase\[exId\]=pr;/);
const mRoute = upsertBron.match(/if\(existing && !existing\._alleenGeheugen\)/);
ok(!!mBase, 'model: basislijnregel uit logSet gevonden');
ok(!!mRoute, 'model: routekeuze uit upsertExerciseGoalField gevonden');
ok(finishBron.indexOf('DecisionCore.releaseRecord(bestKg(best), _recBasis)') > 0,
   'model: finishSession vraagt de recordbeslissing aan de Decision Engine');

// De database (blijft bestaan over "herladen" heen) en het geheugen (verdwijnt bij herladen).
function nieuweApp(dbRijen){
  const db = JSON.parse(JSON.stringify(dbRijen || {}));
  let geheugen, sessionPrBase;
  const api = {
    db: db,
    herlaad(){                                   // simuleert een refresh: geheugen uit de db
      geheugen = {};
      Object.keys(db).forEach(id => { geheugen[id] = Object.assign({}, db[id]); });
      sessionPrBase = {};
      return api;
    },
    prFor(id){ return geheugen[id] ? (geheugen[id].pr != null ? geheugen[id].pr : null) : null; },
    logSet(exId, effKg){                          // de PR-tak van logSet
      const pr = api.prFor(exId) || 0;
      if (effKg > pr){
        eval(mBase[0]);                           // ECHTE regel
        if (geheugen[exId]) geheugen[exId].pr = effKg;
        else geheugen[exId] = { peak_goal: null, pr: effKg, one_rm: null, _alleenGeheugen: true };
      }
    },
    finish(exId, sets){                           // de recordtak van finishSession
      const built = buildStrengthSessionRow(exId, sets, opts);
      const best = built.row.weight;
      const ex = { id: exId };
      const prFor = api.prFor;
      const sessionPrBase_ = sessionPrBase;
      const basis = (sessionPrBase_[ex.id] !== undefined) ? sessionPrBase_[ex.id] : prFor(ex.id);
      const besluit = D.releaseRecord(best, basis);   // ECHTE regel uit de Decision Engine
      let isPr = false;
      if (besluit.isRecord){
        const existing = geheugen[exId];
        if (existing && !existing._alleenGeheugen){             // ECHTE routekeuze: PATCH
          db[exId].pr = besluit.waarde; existing.pr = besluit.waarde;
        } else {                                                 // ECHTE routekeuze: INSERT
          db[exId] = Object.assign({ peak_goal: null, pr: null, one_rm: null }, db[exId] || {}, { pr: besluit.waarde });
          geheugen[exId] = Object.assign({}, db[exId], { _alleenGeheugen: false });
        }
        isPr = true;
      }
      return { isPr: isPr, row: built.row };
    },
    // finishSession leegt de basislijn PAS na de lus over alle oefeningen, niet per oefening.
    // Precies daarom kunnen meerdere records binnen één sessie naast elkaar blijven bestaan.
    sessieAfronden(){ sessionPrBase = {}; return api; },
    basislijnGrootte(){ return Object.keys(sessionPrBase).length; }
  };
  return api.herlaad();
}

/* ── A. NIEUW RECORD WORDT AANGEMAAKT EN BLIJFT OPGESLAGEN ───────────────── */
console.log('\nA. Een nieuw record wordt aangemaakt en blijft opgeslagen');
let app = nieuweApp({ sq: { pr: 100 } });
app.logSet('sq', 115);
let r = app.finish('sq', [{ kg: '115', effKg: 115, reps: '3', rpe: '9' }]); app.sessieAfronden(); app.sessieAfronden();
eq(r.isPr, true, 'A1: het record wordt herkend');
eq(app.db.sq.pr, 115, 'A2: het record staat in de database');
eq(app.prFor('sq'), 115, 'A3: het record is meteen zichtbaar in de app');

app = nieuweApp({});                               // oefening zonder rij: eerste record ooit
app.logSet('bp', 82.5);
r = app.finish('bp', [{ kg: '82.5', effKg: 82.5, reps: '5', rpe: '8' }]);
eq(r.isPr, true, 'A4: het allereerste record van een oefening wordt herkend');
eq(app.db.bp.pr, 82.5, 'A5: en wordt daadwerkelijk ingevoegd (niet gepatcht op een lege rij)');
eq(app.db.bp.peak_goal, null, 'A6: de nieuwe rij bevat de overige velden leeg, niet verzonnen');

/* ── B. GEEN RECORD = GEEN WIJZIGING ─────────────────────────────────────── */
console.log('\nB. Een training zonder record laat het bestaande record met rust');
app = nieuweApp({ sq: { pr: 120, one_rm: 130, peak_goal: 140 } });
app.logSet('sq', 100); app.logSet('sq', 105);
r = app.finish('sq', [{ kg: '100', effKg: 100, reps: '5', rpe: '8' }, { kg: '105', effKg: 105, reps: '3', rpe: '9' }]);
eq(r.isPr, false, 'B1: geen record');
eq(app.db.sq.pr, 120, 'B2: het bestaande record is ongewijzigd');
eq(app.db.sq.one_rm, 130, 'B3: andere velden op dezelfde rij blijven intact');
eq(app.db.sq.peak_goal, 140, 'B4: het peakdoel blijft intact');
app = nieuweApp({ sq: { pr: 120 } });
app.logSet('sq', 120);
r = app.finish('sq', [{ kg: '120', effKg: 120, reps: '3', rpe: '9' }]);
eq(r.isPr, false, 'B5: exact evenaren is geen record');
eq(app.db.sq.pr, 120, 'B6: en overschrijft dus niets');

/* ── C. RECORD OVERLEEFT OPNIEUW LADEN ───────────────────────────────────── */
console.log('\nC. Een record blijft behouden na opnieuw laden van de state');
app = nieuweApp({ sq: { pr: 100 } });
app.logSet('sq', 117.5);
app.finish('sq', [{ kg: '117.5', effKg: 117.5, reps: '2', rpe: '9' }]); app.sessieAfronden();
app.herlaad();                                     // refresh: geheugen weg, database blijft
eq(app.prFor('sq'), 117.5, 'C1: na herladen staat het record er nog');
app.logSet('sq', 110);                             // volgende training, geen record
app.finish('sq', [{ kg: '110', effKg: 110, reps: '3', rpe: '8' }]); app.sessieAfronden();
eq(app.db.sq.pr, 117.5, 'C2: een volgende training zonder record verlaagt het niet');
app.herlaad();
eq(app.prFor('sq'), 117.5, 'C3: en ook na nog een herlaadbeurt niet');
app.logSet('sq', 125);
app.finish('sq', [{ kg: '125', effKg: 125, reps: '1', rpe: '10' }]); app.sessieAfronden();
app.herlaad();
eq(app.prFor('sq'), 125, 'C4: een volgend record wordt wél overgenomen');

/* ── D. MEERDERE RECORDS NAAST ELKAAR ────────────────────────────────────── */
console.log('\nD. Meerdere records bestaan naast elkaar');
app = nieuweApp({ sq: { pr: 100 }, bp: { pr: 80 } });
app.logSet('sq', 110); app.logSet('bp', 85);
app.finish('sq', [{ kg: '110', effKg: 110, reps: '3', rpe: '9' }]);
eq(app.basislijnGrootte(), 2, 'D0: de basislijn geldt voor de hele sessie, niet per oefening');
app.finish('bp', [{ kg: '85', effKg: 85, reps: '5', rpe: '8' }]);
app.sessieAfronden();
eq(app.db.sq.pr, 110, 'D1: record van oefening 1 bewaard');
eq(app.db.bp.pr, 85, 'D2: record van oefening 2 bewaard');
app.herlaad();
eq([app.prFor('sq'), app.prFor('bp')], [110, 85], 'D3: beide overleven het herladen');
// derde oefening zonder record in dezelfde sessie
app.logSet('dl', 0); app.finish('dl', [{ kg: '', effKg: null, reps: '', rpe: '' }]); app.sessieAfronden();
eq([app.db.sq.pr, app.db.bp.pr], [110, 85], 'D4: een oefening zonder record raakt de andere niet');
eq(app.db.dl, undefined, 'D5: en er wordt geen lege recordrij aangemaakt');
// record op oefening 1 in een tweede sessie laat oefening 2 met rust
app.logSet('sq', 120); app.finish('sq', [{ kg: '120', effKg: 120, reps: '2', rpe: '9' }]); app.sessieAfronden();
eq([app.db.sq.pr, app.db.bp.pr], [120, 85], 'D6: een nieuw record overschrijft geen andere oefening');
ok(finishBron.indexOf('sessionPrBase[ex.id]!==undefined') >= 0 &&
   finishBron.indexOf('sessionPrBase[ex.id]!==undefined') < finishBron.indexOf('sessionPrBase={};'),
   'D7: de basislijn wordt in finishSession pas NA de lus over alle oefeningen geleegd');

/* ── E. ÉÉN BRON VOOR GETOOND EN OPGESLAGEN ──────────────────────────────── */
console.log('\nE. De getoonde waarde komt uit dezelfde bron als de opgeslagen waarde');
const sets = [{ kg: '90', effKg: 90, reps: '8', rpe: '7' },
               { kg: '112.5', effKg: 112.5, reps: '3', rpe: '9' },
               { kg: '100', effKg: 100, reps: '5', rpe: '8' }];
const gebouwd = buildStrengthSessionRow('sq', sets, opts);
const kopInDetail = gebouwd.setsDetail.some(s => s.effKg === gebouwd.row.weight && parseInt(s.reps) === gebouwd.row.reps);
ok(kopInDetail, 'E1: de kop is letterlijk één van de uitgevoerde sets, geen apart berekend getal');
eq(gebouwd.bestKg(gebouwd.best), gebouwd.row.weight, 'E2: de aangeboden "beste set" en de opgeslagen kop zijn hetzelfde getal');
const zwaarsteGetoond = Math.max.apply(null, gebouwd.setsDetail.map(s => s.effKg));
eq(zwaarsteGetoond, gebouwd.row.weight, 'E3: het op de afrondingskaart getoonde zwaarste gewicht is de opgeslagen kop');
app = nieuweApp({ sq: { pr: 100 } });
app.logSet('sq', 112.5);
r = app.finish('sq', sets);
eq(r.row.weight, app.db.sq.pr, 'E4: het bewaarde record is exact het getal uit de aggregatie');
ok(!/Math\.max[\s\S]{0,40}sets_detail/.test(html), 'E5: de UI leidt de kop niet zelf opnieuw af uit sets_detail');

/* ── F. ONGELDIGE INVOER CORRUMPEERT NIETS ───────────────────────────────── */
console.log('\nF. Ontbrekende of ongeldige invoer corrumpeert geen historie');
const leeg = buildStrengthSessionRow('sq', [{ kg: '', reps: '', rpe: '' }], opts);
eq(leeg.row.weight, null, 'F1: lege invoer levert geen gewicht (geen 0)');
eq(leeg.row.reps, null, 'F2: lege invoer levert geen reps');
eq(leeg.row.rpe, null, 'F3: lege invoer levert geen RPE');
const rommel = buildStrengthSessionRow('sq', [{ kg: 'abc', reps: 'x', rpe: null }], opts);
eq(rommel.row.weight, null, 'F4: tekstinvoer levert geen gewicht');
eq(rommel.row.reps, null, 'F5: tekstinvoer levert geen reps');
const gemengd = buildStrengthSessionRow('sq', [
  { kg: '100', effKg: 100, reps: '5', rpe: '8' },
  { kg: '', reps: '', rpe: '' }
], opts);
eq(gemengd.row.weight, 100, 'F6: een lege set verpest de geldige set niet');
eq(gemengd.setsDetail.length, 2, 'F7: beide sets blijven traceerbaar in sets_detail');

app = nieuweApp({ sq: { pr: 120, one_rm: 130 } });
app.logSet('sq', 0);
r = app.finish('sq', [{ kg: '', effKg: null, reps: '', rpe: '' }]);
eq(r.isPr, false, 'F8: een lege sessie levert geen record op');
eq(app.db.sq.pr, 120, 'F9: en laat het bestaande record ongemoeid');
eq(app.db.sq.one_rm, 130, 'F10: en de rest van de rij ook');
app.herlaad();
eq(app.prFor('sq'), 120, 'F11: na herladen is de historie nog intact');
r = app.finish('sq', [{ kg: 'abc', effKg: NaN, reps: 'x', rpe: 'y' }]);
eq(app.db.sq.pr, 120, 'F12: onzin-invoer schrijft niets weg');
ok(!isNaN(app.db.sq.pr), 'F13: er komt nooit NaN in de opgeslagen historie');

/* ── H. DE RECORDREGEL STAAT OP ÉÉN PLEK (record.v1) ─────────────────────── */
console.log('\nH. De recordregel staat in de Decision Engine, niet in de UI');
ok(typeof D.releaseRecord === 'function', 'H1: DecisionCore.releaseRecord bestaat');
eq(D.RECORD_VERSIE, 'record.v1', 'H2: versie record.v1');
eq(D.releaseRecord(115, 100), { versie:'record.v1', isRecord:true,  reason:'ok',                  waarde:115,  basislijn:100 }, 'H3: zwaarder dan de basislijn is een record');
eq(D.releaseRecord(100, 100), { versie:'record.v1', isRecord:false, reason:'evenaart',            waarde:100,  basislijn:100 }, 'H4: evenaren is geen record');
eq(D.releaseRecord(95, 100),  { versie:'record.v1', isRecord:false, reason:'lager',               waarde:95,   basislijn:100 }, 'H5: lichter is geen record');
eq(D.releaseRecord(82.5, null), { versie:'record.v1', isRecord:true, reason:'ok',                 waarde:82.5, basislijn:0 },   'H6: zonder basislijn is de eerste waarde een record');
eq(D.releaseRecord(0, 100),   { versie:'record.v1', isRecord:false, reason:'geen_geldige_waarde', waarde:null, basislijn:100 }, 'H7: nul is geen record');
eq(D.releaseRecord(null, 100),{ versie:'record.v1', isRecord:false, reason:'geen_geldige_waarde', waarde:null, basislijn:100 }, 'H8: ontbrekende waarde is geen record');
eq(D.releaseRecord('abc', 100),{versie:'record.v1', isRecord:false, reason:'geen_geldige_waarde', waarde:null, basislijn:100 }, 'H9: tekst is geen record');
eq(D.releaseRecord(NaN, 100), { versie:'record.v1', isRecord:false, reason:'geen_geldige_waarde', waarde:null, basislijn:100 }, 'H10: NaN is geen record');
eq(D.releaseRecord(-5, 100),  { versie:'record.v1', isRecord:false, reason:'geen_geldige_waarde', waarde:null, basislijn:100 }, 'H11: een negatief gewicht is geen record');
eq(D.releaseRecord('117.5', 100).waarde, 117.5, 'H12: een numerieke string wordt netjes omgezet');
eq(D.releaseRecord(115, '100').isRecord, true, 'H13: een basislijn als string werkt ook');
const h1 = JSON.stringify(D.releaseRecord(112.5, 100));
let zelfde = true; for (let i = 0; i < 50; i++) if (JSON.stringify(D.releaseRecord(112.5, 100)) !== h1) zelfde = false;
ok(zelfde, 'H14: de regel is deterministisch');

// Alle drie de schrijfpaden gebruiken diezelfde regel — geen vierde kopie in de UI.
eq((html.match(/DecisionCore\.releaseRecord\(/g) || []).length, 3,
   'H15: precies drie aanroepen (afronden, losse oefening, guided) — één regel, drie plaatsen');
ok(!/const curPr=prFor\([a-zA-Z.]+\)\|\|0;\s*if\(/.test(html),
   'H16: de oude, uitgeschreven vergelijking staat nergens meer');
ok(!/row\.weight>\(prFor\(exId\)\|\|0\)/.test(html),
   'H17: het losse-oefeningpad vergelijkt niet meer zelf');
ok(!/var curPr=prFor\(it\.id\)\|\|0; if\(w>curPr\)/.test(html),
   'H18: het guided-pad vergelijkt niet meer zelf');
eq((html.match(/upsertExerciseGoalField\([^)]*'pr'/g) || []).length, 3,
   'H19: er zijn nog steeds precies drie PR-schrijfpaden — er is er geen bijgekomen');
const decSrc = fs.readFileSync(path.join(__dirname, 'decision.js'), 'utf8');
ok(!/Date\.now\(\)|Math\.random\(\)/.test(decSrc.slice(decSrc.indexOf('PERSOONLIJKE RECORDS'), decSrc.indexOf('VERBANDEN (verband.v1)'))),
   'H20: de recordregel bevat geen Date.now of random');

console.log('\n' + '='.repeat(56));
console.log('RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail) { console.log('❌ Databehoud niet groen.'); process.exit(1); }
console.log('✅ Sessies aggregeren deterministisch en records blijven bewaard.');
