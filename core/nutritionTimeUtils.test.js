/* core/nutritionTimeUtils.test.js — NUT-TIME-01.
 *
 * Test de pure conversiefuncties in nutritionTimeUtils.js. Draait met
 * verschillende TZ-omgevingsvariabelen binnen hetzelfde Node-proces om
 * lokale-tijd-gedrag (incl. DST) deterministisch te bewijzen, zonder een
 * browser nodig te hebben.
 */
'use strict';
const assert = require('assert');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

function withTz(tz, fn) {
  const orig = process.env.TZ;
  process.env.TZ = tz;
  try { fn(); } finally { process.env.TZ = orig; }
}

// Elke require ná het zetten van TZ, zodat de module's eigen Date-gebruik
// (er is geen module-load-time Date-gebruik, maar dit is toekomstbestendig)
// de juiste zone ziet.
function freshModule() {
  delete require.cache[require.resolve('./nutritionTimeUtils.js')];
  return require('./nutritionTimeUtils.js');
}

// ---- 1. Default "nu" ----
withTz('Europe/Amsterdam', () => {
  const T = freshModule();
  const before = new Date();
  const val = T.nowLocalInputValue();
  const after = new Date();
  ok(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(val), 'A1: nowLocalInputValue heeft het juiste formaat YYYY-MM-DDTHH:mm');
  // Reconstrueer: het teruggegeven lokale moment moet tussen before/after liggen
  // (op de minuut afgerond, dus met 1 minuut marge).
  const reconstructed = new Date(val);
  ok(reconstructed.getTime() >= before.getTime() - 60000 && reconstructed.getTime() <= after.getTime() + 60000,
    'A2: nowLocalInputValue geeft het huidige moment (binnen 1 minuut marge)');
});

// ---- 2. Handmatig gekozen tijd: lokale invoer -> correcte UTC ----
withTz('Europe/Amsterdam', () => {
  const T = freshModule();
  // 1 januari 12:00 lokale tijd in Amsterdam (CET, UTC+1) = 11:00 UTC.
  const iso = T.localInputToIso('2026-01-01T12:00');
  ok(iso === '2026-01-01T11:00:00.000Z', 'B1: CET-invoer (winter, UTC+1) geeft correcte UTC-timestamp: ' + iso);
  // 1 juli 12:00 lokale tijd in Amsterdam (CEST, UTC+2) = 10:00 UTC.
  const isoZomer = T.localInputToIso('2026-07-01T12:00');
  ok(isoZomer === '2026-07-01T10:00:00.000Z', 'B2 (DST): CEST-invoer (zomer, UTC+2) geeft correcte UTC-timestamp: ' + isoZomer);
});

// ---- 3. Teruglezen: UTC -> correcte lokale tijd ----
withTz('Europe/Amsterdam', () => {
  const T = freshModule();
  ok(T.isoToLocalInputValue('2026-01-01T11:00:00.000Z') === '2026-01-01T12:00', 'C1: UTC->lokaal correct in winter (CET)');
  ok(T.isoToLocalInputValue('2026-07-01T10:00:00.000Z') === '2026-07-01T12:00', 'C2 (DST): UTC->lokaal correct in zomer (CEST)');
});

// ---- 4. Roundtrip: lokaal -> UTC -> lokaal geeft exact hetzelfde terug ----
['Europe/Amsterdam', 'America/New_York', 'Asia/Tokyo', 'Pacific/Auckland'].forEach((tz) => {
  withTz(tz, () => {
    const T = freshModule();
    const origineel = '2026-03-15T08:37';
    const iso = T.localInputToIso(origineel);
    const terug = T.isoToLocalInputValue(iso);
    ok(terug === origineel, 'D1 (' + tz + '): roundtrip lokaal->UTC->lokaal is exact ' + origineel + ' (kreeg ' + terug + ')');
  });
});

// ---- 5. Daggrens rond middernacht (de oorspronkelijke bug: UTC-datum i.p.v. lokale datum) ----
withTz('Europe/Amsterdam', () => {
  const T = freshModule();
  // 00:30 lokale tijd op 7 september 2026 in Amsterdam (zomer, CEST UTC+2)
  // is 6 september 22:30 UTC -- de oude, foutieve implementatie
  // (d.toISOString().slice(0,10)) zou hier "2026-09-06" geven, niet de
  // juiste lokale dag "2026-09-07".
  const d = new Date('2026-09-06T22:30:00.000Z'); // = 07-09-2026 00:30 lokaal (Amsterdam, CEST)
  ok(T.localDateStr(d) === '2026-09-07', 'E1: localDateStr geeft de lokale dag (07-09), niet de UTC-dag (06-09): kreeg ' + T.localDateStr(d));

  const bounds = T.localDayBoundsIso(d);
  ok(bounds.startIso === '2026-09-06T22:00:00.000Z', 'E2: lokale daggrens-start (00:00 lokaal = 22:00 UTC vorige dag, CEST): ' + bounds.startIso);
  ok(bounds.eindIso === '2026-09-07T21:59:59.999Z', 'E3: lokale daggrens-einde (23:59:59.999 lokaal = 21:59:59.999 UTC, CEST): ' + bounds.eindIso);
  // Het testmoment zelf (00:30 lokaal) moet binnen deze grenzen vallen.
  ok(new Date(bounds.startIso).getTime() <= d.getTime() && d.getTime() <= new Date(bounds.eindIso).getTime(),
    'E4: 00:30 lokale tijd valt binnen de berekende daggrenzen van diezelfde lokale dag');
});

// ---- 6. DST-omschakeling: daggrenzen op een dag met een kortere/langere dag ----
withTz('Europe/Amsterdam', () => {
  const T = freshModule();
  // 29 maart 2026: DST-omschakeling in de EU (02:00 -> 03:00 CEST). Deze
  // lokale dag duurt 23 uur, niet 24. localDayBoundsIso moet dit correct
  // afhandelen zonder zelf te rekenen -- de Date-runtime doet dit.
  const dOmschakeldag = new Date(2026, 2, 29, 12, 0, 0); // 29 maart 2026, lokaal
  const bounds = T.localDayBoundsIso(dOmschakeldag);
  const duurUur = (new Date(bounds.eindIso).getTime() - new Date(bounds.startIso).getTime() + 1) / 3600000;
  ok(Math.abs(duurUur - 23) < 0.01, 'F1: DST-omschakeldag (29 maart 2026) is correct 23 uur lang, kreeg ' + duurUur);
});

// ---- 7. Ongeldige invoer: geen gok, expliciet null ----
withTz('Europe/Amsterdam', () => {
  const T = freshModule();
  ok(T.localInputToIso('') === null, 'G1: lege invoer geeft null, geen gegokte datum');
  ok(T.localInputToIso('niet-een-datum') === null, 'G2: onherkenbare invoer geeft null');
  ok(T.isoToLocalInputValue('ongeldig') === null, 'G3: ongeldige ISO-invoer geeft null');
});

console.log('nutritionTimeUtils: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
