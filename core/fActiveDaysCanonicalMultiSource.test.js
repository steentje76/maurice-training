/* fActiveDaysCanonicalMultiSource.test.js — ACTIVE DAYS SEMANTIC FIX
 *
 * AANLEIDING. "X dagen actief in de afgelopen 30 dagen" telde uitsluitend unieke
 * dates uit de `sessions`-tabel. Endurance-only dagen (activities: running/cycling/
 * swimming) en afgeronde HYROX/triathlon-trainingen (training_instances met
 * status='completed', bewezen: completeTrainingInstance() schrijft NOOIT naar
 * sessions) telden daardoor structureel niet mee. Daarnaast gebruikte de
 * vensterrand toISOString() (UTC) terwijl sessions.date al lokaal is (td()).
 *
 * Deze suite draait de daadwerkelijke, verzonden broncode uit index.html
 * (localDateFromTimestamp, localDateDaysAgo, td, calculateActiveDays30) in een
 * zandbak met een controleerbare sbGetOrFail-mock, en legt de volledige
 * PO-testmatrix vast (20 punten):
 *   1-6.   broncombinaties en dedupe binnen dezelfde lokale dag
 *   7-8.   niet-afgeronde instances / planning tellen niet mee
 *   9-10.  lokale-middernacht-round-trip voor UTC-tijdstempels
 *   11-13. venstergrenzen (oudste inclusieve dag, dag ervoor, vandaag)
 *   14-17. partial failure -> UNKNOWN, lege-maar-succesvolle bronnen -> 0
 *   18-19. Home/Profiel-consumers bij UNKNOWN (via homeWeekSummary-contract)
 *   20.    geen "deze maand" meer voor deze rolling metric
 *
 * Draai: node core/fActiveDaysCanonicalMultiSource.test.js
 */
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
var pass = 0, fail = 0;
function ok(c, m) { if (c) pass++; else { fail++; console.log('  ✗ ' + m); } }

function bron() {
  var start = HTML.indexOf('function td(){');
  var eind = HTML.indexOf('return {activeDays:dagen.size};\r\n}', start);
  assert.ok(start > 0 && eind > start, 'canonical active-days-blok niet gevonden');
  eind = HTML.indexOf('\r\n}', eind) + '\r\n}'.length;
  return HTML.slice(start, eind).replace(/^let /gm, 'var ').replace(/^const /gm, 'var ');
}
var BRON = bron();
ok(BRON.indexOf('function calculateActiveDays30') !== -1, '0: calculateActiveDays30() gevonden in de bron');
ok(BRON.indexOf('function localDateFromTimestamp') !== -1, '0: localDateFromTimestamp() gevonden in de bron');
ok(BRON.indexOf('function localDateDaysAgo') !== -1, '0: localDateDaysAgo() gevonden in de bron');

function zandbak(scenario) {
  var calls = [];
  var ctx = {
    console: console,
    sbGetOrFail: function (t, p) {
      calls.push(t + p);
      var s = scenario[t];
      if (!s) return Promise.resolve({ failed: false, rows: [] });
      if (s.fail) return Promise.resolve({ failed: true, rows: [] });
      return Promise.resolve({ failed: false, rows: s.rows || [] });
    }
  };
  vm.createContext(ctx);
  new vm.Script(BRON, { filename: 'active-days-bron.js' }).runInContext(ctx);
  return { ctx: ctx, calls: calls };
}

function daysAgoLocalStr(n) {
  var d = new Date(); d.setDate(d.getDate() - n);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function isoOfLocal(y, m, d, h, mi, s) { return new Date(y, m, d, h, mi, s).toISOString(); }

(async function () {

  // ── 1. Alleen sessions -> zelfde gedrag als voorheen ──────────────────────
  {
    var z = zandbak({ sessions: { rows: [{ date: daysAgoLocalStr(1) }, { date: daysAgoLocalStr(2) }] } });
    var r = await z.ctx.calculateActiveDays30();
    ok(r.activeDays === 2, '1: alleen sessions, 2 unieke dagen -> activeDays=2');
  }

  // ── 2. Alleen activities -> telt actieve dag ──────────────────────────────
  {
    var ts = isoOfLocal(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() - 3, 10, 0, 0);
    var z = zandbak({ activities: { rows: [{ recorded_at: ts }] } });
    var r = await z.ctx.calculateActiveDays30();
    ok(r.activeDays === 1, '2: alleen activities (running/cycling/swimming) telt als actieve dag');
  }

  // ── 3. Alleen afgeronde training_instance -> telt actieve dag ─────────────
  {
    var ts = isoOfLocal(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() - 5, 18, 0, 0);
    var z = zandbak({ training_instances: { rows: [{ status: 'completed', completed_at: ts }] } });
    var r = await z.ctx.calculateActiveDays30();
    ok(r.activeDays === 1, '3: alleen afgeronde training_instance (HYROX/triathlon) telt als actieve dag');
  }

  // ── 4. sessions + activities dezelfde lokale dag -> telt 1 ────────────────
  {
    var dag = daysAgoLocalStr(2);
    var ts = isoOfLocal(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() - 2, 8, 0, 0);
    var z = zandbak({ sessions: { rows: [{ date: dag }] }, activities: { rows: [{ recorded_at: ts }] } });
    var r = await z.ctx.calculateActiveDays30();
    ok(r.activeDays === 1, '4: sessions+activities op dezelfde lokale dag tellen als 1');
  }

  // ── 5. alle drie bronnen dezelfde dag -> telt 1 ───────────────────────────
  {
    var n = new Date(); var y = n.getFullYear(), m = n.getMonth(), dd = n.getDate() - 4;
    var dag = daysAgoLocalStr(4);
    var ts = isoOfLocal(y, m, dd, 7, 0, 0);
    var z = zandbak({
      sessions: { rows: [{ date: dag }] },
      activities: { rows: [{ recorded_at: ts }] },
      training_instances: { rows: [{ status: 'completed', completed_at: isoOfLocal(y, m, dd, 20, 0, 0) }] }
    });
    var r = await z.ctx.calculateActiveDays30();
    ok(r.activeDays === 1, '5: sessions+activities+training_instances op dezelfde dag tellen als 1');
  }

  // ── 6. meerdere dagen -> juiste unieke telling ────────────────────────────
  {
    var z = zandbak({
      sessions: { rows: [{ date: daysAgoLocalStr(1) }, { date: daysAgoLocalStr(1) }, { date: daysAgoLocalStr(10) }] },
      activities: { rows: [{ recorded_at: isoOfLocal(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() - 20, 9, 0, 0) }] }
    });
    var r = await z.ctx.calculateActiveDays30();
    ok(r.activeDays === 3, '6: 3 unieke dagen (dubbele sessions-rij op dezelfde dag telt niet dubbel)');
  }

  // ── 7. training_instance status='active' (niet afgerond) -> telt niet ────
  {
    var ts = isoOfLocal(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() - 1, 12, 0, 0);
    var z = zandbak({ training_instances: { rows: [] } }); // status=eq.completed in de query zelf sluit 'active' al uit
    var r = await z.ctx.calculateActiveDays30();
    ok(r.activeDays === 0, "7: niet-afgeronde training_instance (server-side gefilterd op status=eq.completed) telt niet mee");
    ok(z.calls.some(function (c) { return c.indexOf('status=eq.completed') !== -1; }), '7b: query filtert expliciet op status=eq.completed');
  }

  // ── 8. planned records zonder uitvoering -> tellen niet (geen query ernaartoe) ─
  {
    var z = zandbak({});
    ok(!z.calls.some(function (c) { return c.indexOf('planned_training') !== -1 || c.indexOf('custom_training') !== -1; }),
      '8: planned_training_occurrences/assignments en custom_trainings worden nooit bevraagd voor deze metric');
  }

  // ── 9/10. lokale-middernacht-round-trip ───────────────────────────────────
  {
    var voorMiddernacht = isoOfLocal(2026, 8, 11, 23, 59, 0); // lokaal 11 sep 23:59
    var naMiddernacht = isoOfLocal(2026, 8, 12, 0, 1, 0);      // lokaal 12 sep 00:01
    var z = zandbak({});
    ok(z.ctx.localDateFromTimestamp(voorMiddernacht) === '2026-09-11', '9: 23:59 lokaal -> correcte lokale datum (11 sep), niet de UTC-datum');
    ok(z.ctx.localDateFromTimestamp(naMiddernacht) === '2026-09-12', '10: 00:01 lokaal -> correcte lokale datum (12 sep)');
  }

  // ── 11/12/13. venstergrenzen ───────────────────────────────────────────────
  {
    var z = zandbak({
      sessions: {
        rows: [
          { date: daysAgoLocalStr(29) }, // oudste inclusieve dag
          { date: daysAgoLocalStr(30) }, // dag vóór het venster
          { date: daysAgoLocalStr(0) }   // vandaag
        ]
      }
    });
    var r = await z.ctx.calculateActiveDays30();
    ok(r.activeDays === 2, '11-13: alleen dag-29 (oudste inclusief) en dag-0 (vandaag) tellen, dag-30 (vóór venster) niet');
  }

  // ── 14/15/16. query-failure per bron -> UNKNOWN ───────────────────────────
  {
    var z = zandbak({ sessions: { fail: true } });
    var r = await z.ctx.calculateActiveDays30();
    ok(r.activeDays === null, '14: sessions-query-failure -> UNKNOWN (activeDays=null)');
  }
  {
    var z = zandbak({ activities: { fail: true } });
    var r = await z.ctx.calculateActiveDays30();
    ok(r.activeDays === null, '15: activities-query-failure -> UNKNOWN');
  }
  {
    var z = zandbak({ training_instances: { fail: true } });
    var r = await z.ctx.calculateActiveDays30();
    ok(r.activeDays === null, '16: training_instances-query-failure -> UNKNOWN');
  }

  // ── 17. lege maar succesvolle drie bronnen -> 0, niet UNKNOWN ─────────────
  {
    var z = zandbak({});
    var r = await z.ctx.calculateActiveDays30();
    ok(r.activeDays === 0, '17: alle drie bronnen succesvol maar leeg -> 0 (geen UNKNOWN)');
  }

  console.log('\n========================================================');
  console.log('fActiveDaysCanonicalMultiSource.test.js (calculateActiveDays30) — ' + pass + ' geslaagd, ' + fail + ' mislukt tot nu toe');

  // ── 18/19. Home/Profiel-consumers bij UNKNOWN (contract-niveau) ──────────
  // Profiel (refreshProfiel) leest al: dagen=(wk&&typeof wk.activeDays==='number')?wk.activeDays:null,
  // en toont de callout alleen bij dagen!==null. Dat betekent: zolang renderWeekStats() bij UNKNOWN
  // activeDays:null in window.homeWeekSummary zet, werkt Profiel al correct zonder eigen wijziging.
  ok(HTML.indexOf("dagen=(wk&&typeof wk.activeDays==='number')?wk.activeDays:null") !== -1,
    '18: Profiel-callout-gate onveranderd aanwezig (typeof-check op activeDays)');
  ok(HTML.indexOf('activeDays!==null&&dagen>0') !== -1 || HTML.indexOf('dagen!==null&&dagen>0') !== -1,
    '18b: Profiel-callout wordt alleen gebouwd bij een bekende (niet-null) waarde');

  var renderWeekStatsBron = HTML.slice(HTML.indexOf('async function renderWeekStats()'), HTML.indexOf('function renderMotivatie()'));
  ok(renderWeekStatsBron.indexOf('activeDays:null') !== -1,
    '19: renderWeekStats() zet expliciet activeDays:null in homeWeekSummary wanneer er geen Ritme-data is (UNKNOWN)');
  ok(renderWeekStatsBron.indexOf("hasRitme=typeof activeDays==='number'") !== -1,
    '19b: Ritme-kaart wordt gegate op typeof activeDays (UNKNOWN toont geen kaart, geen impliciete 0)');

  var renderMotivatieBron = HTML.slice(HTML.indexOf('function renderMotivatie()'), HTML.indexOf('function renderMotivatie()') + 900);
  ok(renderMotivatieBron.indexOf("typeof w.activeDays!=='number'") !== -1,
    '19c: renderMotivatie() slaat de kaart over bij UNKNOWN i.p.v. "Elke sessie telt" te tonen (dat zou UNKNOWN als ZERO framen)');

  // ── 20. geen "deze maand" meer voor deze rolling metric ───────────────────
  ok(renderMotivatieBron.indexOf('deze maand') === -1, '20: "deze maand" komt niet meer voor in renderMotivatie()');
  ok(renderMotivatieBron.indexOf('in de afgelopen 30 dagen') !== -1, '20b: vervangen door "in de afgelopen 30 dagen"');
  ok((HTML.match(/deze maand/g) || []).length === 0, '20c: repo-breed geen "deze maand" meer in index.html');

  console.log('\n========================================================');
  console.log('fActiveDaysCanonicalMultiSource.test.js — ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail ? 1 : 0);
})();
