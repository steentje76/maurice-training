/* Sprint 11 — regressietest: een nieuw persoonlijk record moet bewaard blijven.
 *
 * DEFECT (v4.34.0 en eerder): logSet werkte de PR-referentie in het geheugen direct bij
 * zodat een volgende set op hetzelfde gewicht niet nog een keer als record werd gemarkeerd.
 * finishSession vergeleek het zwaarste gewicht daarna met díe bijgewerkte waarde, dus
 * 115 > 115 was onwaar: de PR werd nooit naar exercise_goals geschreven, de afrondingskaart
 * meldde geen record, en na herladen stond de oude PR er weer.
 *
 * Deze test draait de ECHTE expressies uit index.html na, niet een nagebouwde kopie.
 *
 * A  De basislijn bestaat en wordt op de juiste plek gezet
 * B  Gedrag: record wordt herkend en bewaard
 * C  Gedrag: geen vals record, geen dubbele badge
 * D  Reset-semantiek
 *
 * Draai: node core/fPrPersistentie.test.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const D = require('./decision.js');   // Sprint 12: de recordregel woont hier

let pass = 0, fail = 0;
function ok(c, m){ if (c) pass++; else { fail++; console.log('  ✗ ' + m); } }
function eq(a, b, m){ ok(JSON.stringify(a) === JSON.stringify(b), m + ' (verwacht ' + JSON.stringify(b) + ', kreeg ' + JSON.stringify(a) + ')'); }

console.log('\n[Sprint 11] Persoonlijk record blijft bewaard');

/* ── A. STRUCTUUR ────────────────────────────────────────────────────────── */
console.log('\nA. Basislijn aanwezig en op de juiste plek');
ok(/let sessionPrBase\s*=\s*\{\}/.test(html), 'sessionPrBase is gedeclareerd');
const logSetBron = html.slice(html.indexOf('function logSet(exId,type,setNum,isWork)'),
                              html.indexOf('function toggleSetDone'));
ok(logSetBron.length > 200, 'logSet-bron gevonden');
const iBase = logSetBron.indexOf('sessionPrBase[exId]=pr');
const iMut  = logSetBron.indexOf('existing.pr=effKg');
ok(iBase > 0, 'logSet legt de basislijn vast');
ok(iMut > 0, 'logSet werkt de geheugenreferentie nog steeds bij (badge-gedrag ongewijzigd)');
ok(iBase < iMut, 'de basislijn wordt vastgelegd VOORDAT de referentie wordt bijgewerkt');
ok(/if\(sessionPrBase\[exId\]===undefined\)/.test(logSetBron), 'de basislijn wordt maar één keer per oefening gezet');

const finishBron = html.slice(html.indexOf('async function finishSession()'),
                              html.indexOf('function renderNextActionsCard'));
ok(finishBron.length > 200, 'finishSession-bron gevonden');
ok(/sessionPrBase\[ex\.id\]!==undefined/.test(finishBron), 'finishSession vergelijkt met de basislijn');
ok(!/const curPr=prFor\(ex\.id\)\|\|0;if\(bestKg/.test(finishBron),
   'de oude vergelijking met de bijgewerkte geheugenreferentie is weg');
ok(/sessionPrBase=\{\}/.test(finishBron), 'de basislijn wordt bij het afronden geleegd');

/* ── B/C. GEDRAG — met de echte expressies uit index.html ────────────────── */
console.log('\nB. Gedrag: record wordt herkend en bewaard');
// Haal de twee beslissende expressies letterlijk uit de bron, zodat deze test breekt
// zodra iemand de logica wijzigt zonder hem hier te verantwoorden.
const mBase = logSetBron.match(/if\(sessionPrBase\[exId\]===undefined\) sessionPrBase\[exId\]=pr;/);
// Sprint 12: de vergelijking zelf is naar de Decision Engine verhuisd (record.v1). finishSession
// bepaalt alleen nog de basislijn en schrijft weg. De test volgt die verplaatsing en toetst
// hetzelfde gedrag, nu via D.releaseRecord.
const mCur  = finishBron.match(/const _recBasis=\(sessionPrBase\[ex\.id\]!==undefined\?sessionPrBase\[ex\.id\]:prFor\(ex\.id\)\);/);
ok(!!mBase, 'basislijn-expressie letterlijk gevonden');
ok(!!mCur, 'basislijn-expressie uit finishSession letterlijk gevonden');
ok(finishBron.indexOf('DecisionCore.releaseRecord(bestKg(best), _recBasis)') > 0,
   'de recordbeslissing komt uit de Decision Engine, niet uit de UI');

function simuleer(dbPr, setGewichten){
  const geheugen = { sq: { pr: dbPr } };
  const db = { sq: dbPr };
  const sessionPrBase = {};
  const prFor = id => (geheugen[id] ? geheugen[id].pr : null);
  let badges = 0;
  setGewichten.forEach(effKg => {
    const exId = 'sq';
    const pr = prFor(exId) || 0;
    if (effKg > pr) {
      eval(mBase[0]);                                  // ECHTE regel uit logSet
      badges++;
      geheugen[exId].pr = effKg;                       // bestaande geheugenmutatie
    }
  });
  const ex = { id: 'sq' };
  const best = Math.max.apply(null, setGewichten);
  const sessionPrBase_ = sessionPrBase;
  const _recBasis = eval('(' + mCur[0].replace(/^const _recBasis=/, '').replace(/;$/, '').replace(/sessionPrBase/g, 'sessionPrBase_') + ')'); // ECHTE regel uit finishSession
  const besluit = D.releaseRecord(best, _recBasis);   // ECHTE regel uit de Decision Engine
  let isPr = false;
  if (besluit.isRecord) { db.sq = besluit.waarde; isPr = true; }
  return { dbPr: db.sq, isPr: isPr, badges: badges };
}

eq(simuleer(100, [115]), { dbPr: 115, isPr: true, badges: 1 }, 'B1: één set boven de PR wordt bewaard');
eq(simuleer(100, [115, 115]), { dbPr: 115, isPr: true, badges: 1 }, 'B2: tweede set op hetzelfde gewicht geeft geen tweede badge, PR blijft bewaard');
eq(simuleer(100, [110, 120]), { dbPr: 120, isPr: true, badges: 2 }, 'B3: oplopende sets bewaren het hoogste gewicht');
eq(simuleer(100, [120, 110]), { dbPr: 120, isPr: true, badges: 1 }, 'B4: aflopende sets bewaren de zwaarste set, niet de laatste');
eq(simuleer(100, [110, 130, 120]), { dbPr: 130, isPr: true, badges: 2 }, 'B5: piek in het midden wordt bewaard');
eq(simuleer(0, [60]), { dbPr: 60, isPr: true, badges: 1 }, 'B6: eerste record ooit wordt bewaard');

console.log('\nC. Gedrag: geen vals record');
eq(simuleer(100, [95]), { dbPr: 100, isPr: false, badges: 0 }, 'C1: lichter dan de PR is geen record');
eq(simuleer(100, [100]), { dbPr: 100, isPr: false, badges: 0 }, 'C2: exact gelijk aan de PR is geen record');
eq(simuleer(100, [90, 95, 99]), { dbPr: 100, isPr: false, badges: 0 }, 'C3: hele sessie onder de PR laat de PR met rust');

/* ── D. REGRESSIE OP HET OUDE GEDRAG ─────────────────────────────────────── */
console.log('\nD. Het oude gedrag zou hier falen');
function simuleerOud(dbPr, setGewichten){          // exact de logica van vóór Sprint 11
  const geheugen = { sq: { pr: dbPr } }; const db = { sq: dbPr };
  const prFor = id => geheugen[id].pr;
  setGewichten.forEach(effKg => { if (effKg > (prFor('sq') || 0)) geheugen.sq.pr = effKg; });
  const best = Math.max.apply(null, setGewichten);
  const curPr = prFor('sq') || 0;
  if (best > curPr) db.sq = best;
  return db.sq;
}
eq(simuleerOud(100, [115]), 100, 'D1: het oude gedrag verloor het record (dit is het defect)');
ok(simuleer(100, [115]).dbPr !== simuleerOud(100, [115]), 'D2: de fix verandert precies dit geval');

/* ── E. OVERIGE PR-PADEN ONGEWIJZIGD ─────────────────────────────────────── */
console.log('\nE. De andere schrijfpaden zijn niet aangeraakt');
ok(/DecisionCore\.releaseRecord\(w, \(typeof prFor==='function'\?prFor\(it\.id\):null\)\)/.test(html),
   'E1: Guided Execution gebruikt sinds Sprint 12 dezelfde recordregel uit de Decision Engine');
ok(/DecisionCore\.releaseRecord\(row\.weight, prFor\(exId\)\)/.test(html),
   'E2: losse oefening gebruikt sinds Sprint 12 dezelfde recordregel uit de Decision Engine');
ok((html.match(/upsertExerciseGoalField\([^)]*'pr'/g) || []).length === 3,
   'E3: er zijn nog steeds precies drie PR-schrijfpaden — er is er geen bijgekomen');

/* ── F. EERSTE RECORD VAN EEN OEFENING ZONDER DOELRIJ ────────────────────── */
console.log('\nF. Eerste record van een oefening zonder rij in exercise_goals');
// DEFECT 2 (v4.34.0 en eerder): logSet maakte bij een record een doel-entry aan die alleen
// in het geheugen bestond. upsertExerciseGoalField zag die entry, koos daarom PATCH, en die
// PATCH raakte nul rijen. Het allereerste record van elke oefening verdween zonder melding.
ok(/_alleenGeheugen:true/.test(logSetBron), 'F1: logSet markeert een alleen-in-geheugen aangemaakte doelrij');
const upsertBron = html.slice(html.indexOf('async function upsertExerciseGoalField'),
                              html.indexOf('async function upsertExerciseGoalField') + 1200);
ok(/if\(existing && !existing\._alleenGeheugen\)/.test(upsertBron),
   'F2: upsertExerciseGoalField PATCHt alleen bij een echte rij');
ok(upsertBron.indexOf('sbPostQ') > 0 && upsertBron.indexOf('sbPatchQ') > 0,
   'F3: beide schrijfwegen bestaan nog');
ok(/_alleenGeheugen:false/.test(upsertBron), 'F4: na het invoegen is de markering opgeheven');

function upsertPad(entryBestaat, alleenGeheugen){
  const existing = entryBestaat ? { pr: 100, _alleenGeheugen: alleenGeheugen } : undefined;
  return (existing && !existing._alleenGeheugen) ? 'PATCH' : 'POST';
}
eq(upsertPad(true, false), 'PATCH', 'F5: echte rij -> PATCH');
eq(upsertPad(true, true), 'POST',  'F6: alleen-in-geheugen -> POST (dit was het defect)');
eq(upsertPad(false, false), 'POST', 'F7: geen entry -> POST');

const peakBron = html.slice(html.indexOf('async function savePeakGoal'),
                            html.indexOf('async function savePeakGoal') + 1600);
ok(/inGeheugen && !inGeheugen\._alleenGeheugen/.test(peakBron),
   'F8: het peakdoel-pad maakt hetzelfde onderscheid');
ok(!/const existing=exerciseGoals\.get\(curEditPeakId\);\r?\n  if\(val===null\)/.test(peakBron),
   'F9: het peakdoel-pad gebruikt de rauwe geheugenentry niet meer als bewijs van een rij');

/* ── G. TAAL OP DE AFRONDINGSKAART ───────────────────────────────────────── */
console.log('\nG. Taal op de afrondingskaart');
ok(/Nieuwe records! Sterke training\./.test(html), 'G1: meervoud is "Nieuwe records!"');
ok(/Nieuw record! Sterke training\./.test(html), 'G2: enkelvoud is "Nieuw record!"');
ok(!/Nieuw record\$\{sessStats\.pr>1\?'s':''\}/.test(html), 'G3: de oude, onjuiste meervoudsvorm is weg');

console.log('\n' + '='.repeat(56));
console.log('RESULTAAT: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (fail) { console.log('❌ PR-persistentie niet groen.'); process.exit(1); }
console.log('✅ Een nieuw record overleeft het afronden en een herlaadbeurt.');
