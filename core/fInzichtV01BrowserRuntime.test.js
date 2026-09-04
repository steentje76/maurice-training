/* core/fInzichtV01BrowserRuntime.test.js — echte Chromium-render, geen
 * source-only-aannames (harde les uit Trainen v0.2). */
'use strict';
const { chromium } = require('playwright');
const path = require('path');
let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) pass++; else { fail++; msgs.push('MISLUKT: ' + label); } }

(async () => {
  let browser;
  try { browser = await chromium.launch(); }
  catch (e) { console.log('fInzichtV01BrowserRuntime: SKIP (Chromium niet beschikbaar in deze omgeving)'); process.exit(0); }

  const url = 'file://' + path.join(__dirname, '..', 'index.html');
  const viewports = [320, 360, 375, 390, 412, 430];

  for (const w of viewports) {
    const jsErrors = [];
    const page = await browser.newPage({ viewport: { width: w, height: 1300 } });
    page.on('pageerror', e => jsErrors.push(e.message));
    await page.goto(url);
    await page.waitForTimeout(500);
    await page.evaluate(() => { if (typeof go === 'function') go('s-inzicht'); });
    await page.waitForTimeout(700);

    const html = await page.evaluate(() => document.getElementById('s-inzicht')?.outerHTML || '');
    ok(html.length > 0, w + 'px 1: s-inzicht bestaat en is actief renderbaar');
    ok(!html.includes('${'), w + 'px 2: geen letterlijke "${" in de gerenderde DOM');
    ok(!html.includes('tkIcon('), w + 'px 3: geen letterlijke "tkIcon(" in de gerenderde DOM');
    const overflow = await page.evaluate(() => { const el = document.getElementById('s-inzicht'); return el.scrollWidth > el.clientWidth + 2; });
    ok(!overflow, w + 'px 4: geen horizontale overflow');
    const summaryCells = await page.evaluate(() => document.querySelectorAll('#inzicht-summary-grid .tk-summary-cell').length);
    ok(summaryCells === 4, w + 'px 5: exact 4 Jouw ontwikkeling-cellen (Verbeterd/Stijgende trends/Trainingen/Adherence)');
    const overviewCells = await page.evaluate(() => document.querySelectorAll('#inzicht-overview-grid .tk-overview-cell').length);
    ok(overviewCells === 5, w + 'px 6: exact 5 Snel overzicht-cellen');
    const domainRows = await page.evaluate(() => document.querySelectorAll('#inzicht-domain-list .row').length);
    ok(domainRows === 6, w + 'px 7: exact 6 domain-rows (Prestaties/Herstel/Belasting/Lichaam/Verbanden/Doelen)');
    const periodBtns = await page.evaluate(() => document.querySelectorAll('#s-inzicht .tk-period-selector button[role="tab"]').length);
    ok(periodBtns === 3, w + 'px 8: Period Selector heeft exact 3 opties (7 dagen/4 weken/3 maanden)');
    const filterChip = await page.evaluate(() => !!document.querySelector('#s-inzicht .tk-filter-chip select'));
    ok(filterChip, w + 'px 9: Filter Chip (sportfilter) is aanwezig');
    const periodTruncated = await page.evaluate(() => {
      var btns = document.querySelectorAll('#s-inzicht .tk-period-selector button');
      return Array.from(btns).some(function(b){ return b.scrollWidth > b.clientWidth + 1; });
    });
    ok(!periodTruncated, w + 'px 9b: geen enkele Period Selector-optie (incl. "3 maanden") wordt afgekapt op deze viewport -- lange Nederlandse labels blijven leesbaar');

    // Fase 5 -- UNKNOWN != 0: bij ontbrekende netwerktoegang (deze lokale
    // file://-test) mag GEEN enkele summary-cell "0" tonen.
    const summaryText = await page.evaluate(() => document.getElementById('inzicht-summary-grid')?.innerText || '');
    ok(!/(^|\s)0(\s|$)/.test(summaryText), w + 'px 10: geen fictieve "0" in Jouw ontwikkeling bij een data-ophaalfout (UNKNOWN != 0)');

    const relevantErrors = jsErrors.filter(e => !/fetch|CORS|NetworkError/i.test(e));
    ok(relevantErrors.length === 0, w + 'px 11: geen onverwachte (niet-netwerk) JS pageerrors: ' + JSON.stringify(relevantErrors));

    await page.close();
  }

  // Eenmalige, functionele checks (niet per viewport).
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 1300 } });
    await page.goto(url);
    await page.waitForTimeout(500);
    await page.evaluate(() => { if (typeof go === 'function') go('s-inzicht'); });
    await page.waitForTimeout(700);

    // Period Selector interactie werkt (accessible state-toggle).
    await page.click('#s-inzicht .tk-period-selector button:nth-child(2)');
    const secondSelected = await page.evaluate(() => document.querySelectorAll('#s-inzicht .tk-period-selector button')[1].getAttribute('aria-selected'));
    ok(secondSelected === 'true', '12: Period Selector wisselt de aria-selected-staat correct bij klikken');
    const firstSelected = await page.evaluate(() => document.querySelectorAll('#s-inzicht .tk-period-selector button')[0].getAttribute('aria-selected'));
    ok(firstSelected === 'false', '13: de vorige, actieve optie wordt correct gedeactiveerd (exclusief, echte tab-semantiek)');

    // Domain-rows navigeren daadwerkelijk naar bestaande, bewezen bestemmingen.
    const targets = await page.evaluate(() => Array.from(document.querySelectorAll('#inzicht-domain-list .row')).map(r => r.getAttribute('onclick')));
    ok(targets.some(t => /s-stats/.test(t)), '14: Prestaties-domeincard navigeert naar het bestaande s-stats-scherm');
    ok(targets.some(t => /s-lich-health/.test(t)), '15: Herstel-domeincard navigeert naar het bestaande s-lich-health-scherm');
    ok(targets.some(t => /s-lich-metingen/.test(t)), '16: Lichaam-domeincard navigeert naar het bestaande s-lich-metingen-scherm');
    ok(targets.some(t => /s-lich-verbanden/.test(t)), '17: Verbanden-domeincard navigeert naar het bestaande s-lich-verbanden-scherm');

    // Sabotage: introduceer opnieuw een letterlijke ${...} in de statische
    // s-inzicht-HTML en bevestig dat deze testsuite dit daadwerkelijk vangt.
    const fs = require('fs');
    const original = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    const sabotaged = original.replace(
      '<div class="hdr-title" role="heading" aria-level="1">Inzicht</div>',
      '<div class="hdr-title" role="heading" aria-level="1">${tkIcon(\'inzicht\')}Inzicht</div>'
    );
    ok(sabotaged !== original, '18 (sabotage-setup): de sabotage-marker is gevonden en vervangen');
    fs.writeFileSync(path.join(__dirname, '..', 'index.html'), sabotaged, 'utf8');
    const page2 = await browser.newPage({ viewport: { width: 390, height: 800 } });
    await page2.goto(url);
    await page2.waitForTimeout(500);
    await page2.evaluate(() => { if (typeof go === 'function') go('s-inzicht'); });
    await page2.waitForTimeout(500);
    const sabotagedHtml = await page2.evaluate(() => document.getElementById('s-inzicht')?.outerHTML || '');
    ok(sabotagedHtml.includes('${'), '18: live sabotage (opnieuw "${" geintroduceerd) wordt door deze testsuite gedetecteerd');
    fs.writeFileSync(path.join(__dirname, '..', 'index.html'), original, 'utf8');
    const restored = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    ok(restored === original, '18b: index.html is na de sabotage-test byte-identiek hersteld');
    await page2.close();
    await page.close();
  }

  await browser.close();
  console.log('fInzichtV01BrowserRuntime: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  if (msgs.length) console.log(msgs.join('\n'));
  console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail > 0 ? 1 : 0);
})();
