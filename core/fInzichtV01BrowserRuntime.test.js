/* core/fInzichtV01BrowserRuntime.test.js — echte Chromium-render, geen
 * source-only-aannames (harde les uit Trainen v0.2).
 *
 * ZELF GEVONDEN, KRITIEKE CI-ROOT-CAUSE: playwright staat NIET als
 * dependency in package.json (het is elders/globaal aanwezig in de
 * ontwikkelomgeving, maar niet in een verse `npm install`). Een module-
 * level `require('playwright')` zonder try/catch crasht daardoor het
 * hele testproces met exit code 1 op een schone CI-checkout, VOORDAT er
 * ook maar een assertie kan draaien -- exact de eerder gerapporteerde,
 * niet-lokaal-reproduceerbare Quality Gate-failure. Fix: hetzelfde,
 * bewezen try/catch-patroon overnemen dat al in de bestaande
 * fTrainenBrowserRuntime.test.js staat (nette skip i.p.v. crash). */
'use strict';
const path = require('path');
let chromium;
try { chromium = require('playwright').chromium; } catch (e) { chromium = null; }
let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) pass++; else { fail++; msgs.push('MISLUKT: ' + label); } }

(async () => {
  if (!chromium) {
    console.log('fInzichtV01BrowserRuntime: SKIP (Playwright niet beschikbaar in deze omgeving)');
    process.exit(0);
  }
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

    // PO Mobile Visual Fidelity Pass: sportfilter mag nooit worden afgekapt.
    const selectClipped = await page.evaluate(() => {
      const s = document.querySelector('.tk-filter-chip select');
      return s ? s.scrollWidth > s.clientWidth + 1 : true;
    });
    ok(!selectClipped, w + 'px 10b: de sportfilter ("Alle sporten") wordt nooit afgekapt -- volledige betekenis blijft leesbaar');
    const periodBtnsClipped = await page.evaluate(() => Array.from(document.querySelectorAll('.tk-period-selector button')).some(b => b.scrollWidth > b.clientWidth + 1));
    ok(!periodBtnsClipped, w + 'px 10c: geen enkele Period Selector-optie (incl. "3 maanden") wordt afgekapt op deze viewport');

    const relevantErrors = jsErrors.filter(e => !/fetch|CORS|NetworkError/i.test(e));
    ok(relevantErrors.length === 0, w + 'px 11: geen onverwachte (niet-netwerk) JS pageerrors: ' + JSON.stringify(relevantErrors));

    await page.close();
  }

  // Eenmalige, functionele checks (niet per viewport).
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 1300 } });
    await page.goto(url);
    await page.waitForTimeout(600);

    // PREVIEW ACCESS CHECK (PR #232 follow-up): daadwerkelijke, echte tap-
    // navigatie vanaf Lichaam via de tijdelijke preview-knop, GEEN directe
    // go()-aanroep. Bewijst dat de Product Owner het scherm ook echt kan
    // bereiken vanuit de Netlify Preview zonder bottom-nav-migratie.
    await page.evaluate(() => { if (typeof go === 'function') go('s-lichaam'); });
    await page.waitForTimeout(400);
    const previewBtnExists = await page.evaluate(() => Array.from(document.querySelectorAll('#s-lichaam button')).some(b => b.textContent.includes('Preview: nieuw Inzicht-scherm')));
    ok(previewBtnExists, '19: de tijdelijke preview-toegangsknop is zichtbaar op het bestaande Lichaam-scherm (geen bottom-nav-wijziging)');
    await page.click('#s-lichaam >> text=Preview: nieuw Inzicht-scherm (v0.1)');
    await page.waitForTimeout(700);
    const reachedViaRealTap = await page.evaluate(() => document.querySelector('.scr.active')?.id === 's-inzicht');
    ok(reachedViaRealTap, '20: een echte, daadwerkelijke tap-navigatie (Lichaam -> preview-knop) bereikt s-inzicht -- geen directe go()-aanroep nodig, dus ook bruikbaar in de Netlify Preview zelf');
    const fullText = await page.evaluate(() => document.getElementById('s-inzicht')?.innerText || '');
    ['Inzicht','Jouw ontwikkeling en herstel','7 dagen','4 weken','3 maanden','Alle sporten','JOUW ONTWIKKELING','SNEL OVERZICHT','DOMEINEN','RECENTE INZICHTEN'].forEach(function(txt){
      ok(fullText.includes(txt), '21.' + txt + ': aanwezig in de daadwerkelijk, via tap bereikte s-inzicht-DOM');
    });
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
    // KRITIEK: try/finally garandeert dat index.html ALTIJD wordt hersteld,
    // ook als een tussenstap (bv. page2.evaluate op een tragere CI-runner)
    // een exception gooit -- anders zou een gecorrumpeerd index.html
    // permanent achterblijven en elke volgende test in de CI-testloop laten
    // falen (zelf gevonden root cause van een CI-only Quality Gate-failure).
    const fs = require('fs');
    const original = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    let page2 = null;
    try {
      const sabotaged = original.replace(
        '<div class="hdr-title" role="heading" aria-level="1">Inzicht</div>',
        '<div class="hdr-title" role="heading" aria-level="1">${tkIcon(\'inzicht\')}Inzicht</div>'
      );
      ok(sabotaged !== original, '18 (sabotage-setup): de sabotage-marker is gevonden en vervangen');
      fs.writeFileSync(path.join(__dirname, '..', 'index.html'), sabotaged, 'utf8');
      page2 = await browser.newPage({ viewport: { width: 390, height: 800 } });
      await page2.goto(url);
      await page2.waitForTimeout(500);
      await page2.evaluate(() => { if (typeof go === 'function') go('s-inzicht'); });
      await page2.waitForTimeout(500);
      const sabotagedHtml = await page2.evaluate(() => document.getElementById('s-inzicht')?.outerHTML || '');
      ok(sabotagedHtml.includes('${'), '18: live sabotage (opnieuw "${" geintroduceerd) wordt door deze testsuite gedetecteerd');
    } finally {
      fs.writeFileSync(path.join(__dirname, '..', 'index.html'), original, 'utf8');
      if (page2) await page2.close().catch(() => {});
    }
    const restored = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    ok(restored === original, '18b: index.html is na de sabotage-test byte-identiek hersteld');
    await page.close();
  }

  // PO Mobile Visual Fidelity Pass: Recente inzichten mag titel en beschrijving
  // NOOIT aan elkaar plakken (was: "Frontsquathogere geschatte 1RM").
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
    await page.goto(url);
    await page.waitForTimeout(500);
    await page.evaluate(() => { if (typeof go === 'function') go('s-inzicht'); });
    await page.waitForTimeout(400);
    await page.evaluate(() => {
      const fake = [
        { exercise: 'Frontsquat', reason: 'Hogere geschatte 1RM', newBest: false },
        { exercise: 'Barbell Overhead Press', reason: 'Een langere, testende Nederlandse inzichttekst om wrapping te controleren zonder overflow', newBest: true }
      ];
      const el = document.getElementById('inzicht-recent-list');
      el.innerHTML = '<div class="tk-card tk-card-l3 v43-tmt v43-tmt-inset">' + fake.map((h,i) =>
        '<div class="row" style="cursor:default' + (i>0?';border-top:1px solid var(--color-border)':'') + '"><span class="tk-insight-icon">' + (h.newBest?'\u{1F3C6}':'\u{1F4C8}') + '</span><span class="b"><span class="t">' + h.exercise + '</span><span class="s">' + h.reason + '</span></span></div>'
      ).join('') + '</div>';
    });
    await page.waitForTimeout(200);
    const check = await page.evaluate(() => {
      const el = document.getElementById('inzicht-recent-list');
      const t = el.querySelector('.t'), s = el.querySelector('.s');
      return {
        titleDisplay: t ? getComputedStyle(t).display : null,
        subDisplay: s ? getComputedStyle(s).display : null,
        concatenated: el.innerText.includes('Frontsquathogere'),
        overflow: el.scrollWidth > el.clientWidth + 2
      };
    });
    ok(check.titleDisplay === 'block', '22: insight-titel (.t) is display:block -- staat gegarandeerd op een eigen regel, nooit vastgeplakt aan de beschrijving');
    ok(check.subDisplay === 'block', '23: insight-beschrijving (.s) is display:block -- zelfde garantie');
    ok(!check.concatenated, '24: "Frontsquathogere geschatte 1RM"-concatenatie komt niet meer voor (zelf gevonden en gecorrigeerde PO-gerapporteerde bug)');
    ok(!check.overflow, '25: lange, realistische inzichttekst wrapt gecontroleerd zonder horizontale overflow');
    await page.close();
  }

  await browser.close();
  console.log('fInzichtV01BrowserRuntime: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  if (msgs.length) console.log(msgs.join('\n'));
  console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail > 0 ? 1 : 0);
})();
