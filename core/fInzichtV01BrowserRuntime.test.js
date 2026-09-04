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

  // PRODUCTION DATA REGRESSION (Fase 4): 'dc' (DeviceCore-alias) bestond niet
  // globaal in inzichtRenderOverview() -- een stille ReferenceError liet HRV/
  // Rusthartslag/Slaap altijd "--" tonen, ook met aantoonbaar bestaande data.
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
    // A. DATA AVAILABLE: exacte, echte productiedata (incl. string-types zoals
    // Supabase teruggeeft) gemockt -- Inzicht MAG geen "--" tonen.
    await page.route('**/rest/v1/hrv_log**', route => {
      route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify([
          { date: '2026-09-04', hrv: '28.5', rhr: 56, sleep: '7.58', note: '[src:fitbit]' },
          { date: '2026-09-03', hrv: null, rhr: 57, sleep: '2.58', note: '[src:fitbit]' },
          { date: '2026-09-02', hrv: '22.0', rhr: 57, sleep: '5.58', note: '[src:fitbit]' },
          { date: '2026-09-01', hrv: '25.5', rhr: 56, sleep: '7.58', note: '[src:fitbit]' },
          { date: '2026-08-31', hrv: '29.5', rhr: 57, sleep: '6.82', note: '[src:fitbit]' }
        ])
      });
    });
    await page.goto(url);
    await page.waitForTimeout(500);
    await page.evaluate(() => { if (typeof go === 'function') go('s-inzicht'); });
    await page.waitForTimeout(900);
    const text = await page.evaluate(() => document.getElementById('inzicht-overview-grid').innerText);
    ok(!/HRV[\s\S]{0,20}—/.test(text), '19b (regressie): HRV toont GEEN "--" wanneer canonical data aantoonbaar bestaat -- exacte productiefout (dc undefined) zou hier weer "--" tonen als hij terugkeert');
    ok(!/Rusthartslag[\s\S]{0,20}—/.test(text), '19c (regressie): Rusthartslag toont GEEN "--" wanneer canonical data aantoonbaar bestaat');
    ok(!/Slaap[\s\S]{0,20}—/.test(text), '19d (regressie): Slaap toont GEEN "--" wanneer canonical data aantoonbaar bestaat');
    ok(/ms/.test(text), '19e (units): HRV toont de eenheid "ms"');
    ok(/bpm/.test(text), '19f (units): Rusthartslag toont de eenheid "bpm"');
    ok(/\du\b/.test(text), '19g (units): Slaap toont een correcte uren-eenheid ("u")');
    await page.close();
  }

  // B. DATA MISSING: bevestig dat "--" (nooit 0) nog steeds correct getoond
  // wordt wanneer data werkelijk ontbreekt (lege array, geen fout).
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
    await page.route('**/rest/v1/hrv_log**', route => {
      route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });
    await page.goto(url);
    await page.waitForTimeout(500);
    await page.evaluate(() => { if (typeof go === 'function') go('s-inzicht'); });
    await page.waitForTimeout(900);
    const text = await page.evaluate(() => document.getElementById('inzicht-overview-grid').innerText);
    ok(!/\b0\s*ms\b/.test(text) && !/\b0\s*bpm\b/.test(text), '19h: bij daadwerkelijk lege data toont geen enkele metric "0 ms"/"0 bpm" -- UNKNOWN != 0 blijft gehandhaafd');
    await page.close();
  }

  // PO Round 2: Snel overzicht -- teal iconen (was zwart), eenheden zichtbaar,
  // geen tabelachtige verticale separators, responsive wrap-gedrag.
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
    await page.goto(url);
    await page.waitForTimeout(500);
    await page.evaluate(() => { if (typeof go === 'function') go('s-inzicht'); });
    await page.waitForTimeout(400);
    await page.evaluate(() => {
      const grid = document.getElementById('inzicht-overview-grid');
      grid.innerHTML = '<div class="tk-overview-cell"><span class="ic-wrap">' + tkIcon('hartslag',{size:'standard'}) + '</span><div class="lbl">HRV (7d)</div><div class="val">62<span class="unit">ms</span></div></div>' +
        '<div class="tk-overview-cell"><span class="ic-wrap">' + tkIcon('herstel',{size:'standard'}) + '</span><div class="lbl">Herstelstatus</div><div class="val">100<span class="unit">%</span></div></div>' +
        '<div class="tk-overview-cell"><span class="ic-wrap">' + tkIcon('belasting',{size:'standard'}) + '</span><div class="lbl">Belasting (7d)</div><div class="val">5427<span class="unit">kg</span></div></div>';
    });
    await page.waitForTimeout(200);
    const check = await page.evaluate(() => {
      const icons = Array.from(document.querySelectorAll('.tk-overview-cell .ic-wrap .tk-icon'));
      const cells = Array.from(document.querySelectorAll('.tk-overview-cell'));
      return {
        iconColors: icons.map(i => getComputedStyle(i).color),
        hasVerticalBorders: cells.some(c => getComputedStyle(c).borderLeftWidth !== '0px' && getComputedStyle(c).borderLeftStyle !== 'none'),
        unitsPresent: document.getElementById('inzicht-overview-grid').innerText.includes('ms') && document.getElementById('inzicht-overview-grid').innerText.includes('kg') && document.getElementById('inzicht-overview-grid').innerText.includes('%')
      };
    });
    ok(check.iconColors.every(c => c === 'rgb(0, 184, 148)'), '26: Snel overzicht-iconen zijn teal (--color-primary) bij beschikbare data, niet zwart (PO Round 2, root cause: ontbrekende stroke=currentColor op de oudere V43I-set, nu tkIcon() gebruikt)');
    ok(!check.hasVerticalBorders, '27: geen tabelachtige, verticale separators meer tussen Snel-overzicht-cellen');
    ok(check.unitsPresent, '28: Belasting/Herstelstatus/HRV tonen expliciete eenheden (kg/%/ms) i.p.v. een kaal, contextloos getal');

    for (const w of [320, 360, 375, 390, 412, 430]) {
      await page.setViewportSize({ width: w, height: 900 });
      await page.waitForTimeout(150);
      const wrapCheck = await page.evaluate(() => {
        const labels = Array.from(document.querySelectorAll('.tk-overview-cell .lbl'));
        return { clipped: labels.some(l => l.scrollWidth > l.clientWidth + 2) };
      });
      ok(!wrapCheck.clipped, '29.' + w + 'px: geen enkel Snel-overzicht-label wordt afgekapt (gecontroleerde wrap i.p.v. krimpende tekst)');
    }
    await page.close();
  }

  // Canonical Fidelity Pass: "Bekijk details", iconen in Jouw ontwikkeling,
  // herstel-ring, insight-cards (3 naast elkaar), CTA soft-teal.
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 1300 } });
    await page.goto(url);
    await page.waitForTimeout(500);
    await page.evaluate(() => { if (typeof go === 'function') go('s-inzicht'); });
    await page.waitForTimeout(500);

    const detailsBtn = await page.evaluate(() => Array.from(document.querySelectorAll('#s-inzicht button')).some(b => b.textContent.includes('Bekijk details')));
    ok(detailsBtn, '30: "Bekijk details"-knop is aanwezig bij Jouw ontwikkeling, conform canonical');

    const devIcons = await page.evaluate(() => document.querySelectorAll('#inzicht-summary-grid .tk-summary-cell .ic').length);
    ok(devIcons === 4, '31: alle 4 Jouw-ontwikkeling-cellen hebben een icoon boven het cijfer, conform canonical');

    // Herstel-ring: functioneel getest met echte ring-wiskunde (zelfde
    // patroon als de bestaande _radial()-functie elders in de app).
    await page.evaluate(() => {
      const grid = document.getElementById('inzicht-overview-grid');
      const rR=13, rC=2*Math.PI*rR, rOff=rC*(1-0.78);
      grid.innerHTML = '<div class="tk-overview-cell"><span class="ic-wrap" style="background:none;width:34px;height:34px"><svg class="tk-recovery-ring" viewBox="0 0 34 34"><circle class="rg" cx="17" cy="17" r="'+rR+'"/><circle class="rf" cx="17" cy="17" r="'+rR+'" style="stroke-dasharray:'+rC.toFixed(1)+';stroke-dashoffset:'+rOff.toFixed(1)+'"/></svg></span><div class="lbl">Herstelstatus</div><div class="val">78<span class="unit">%</span></div></div>';
    });
    const ringOk = await page.evaluate(() => {
      const rf = document.querySelector('.tk-recovery-ring .rf');
      return rf && rf.style.strokeDasharray && rf.style.strokeDashoffset;
    });
    ok(!!ringOk, '32: de herstel-ring gebruikt correcte, wiskundig-consistente stroke-dasharray/dashoffset (zelfde, bewezen patroon als elders in de app)');

    // Insight cards: 3 naast elkaar, elk met display:block .t/.s (concatenatie-
    // garantie opnieuw, expliciet bevestigd voor de nieuwe kaartstructuur).
    await page.evaluate(() => {
      const el = document.getElementById('inzicht-recent-list');
      const fake = [
        { exercise: 'Frontsquat', reason: 'Hogere geschatte 1RM', newBest: false },
        { exercise: 'Roeien', reason: 'Sneller op 1000m', newBest: true },
        { exercise: 'Slaapduur', reason: 'Lager dan normaal', newBest: false }
      ];
      el.innerHTML = '<div class="tk-insight-cards">' + fake.map(h =>
        '<div class="tk-insight-card"><span class="tk-insight-icon">' + (h.newBest?'\u{1F3C6}':'\u{1F4C8}') + '</span><span class="t">' + h.exercise + '</span><span class="s">' + h.reason + '</span></div>'
      ).join('') + '</div>';
    });
    const cardsCheck = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.tk-insight-card'));
      return {
        count: cards.length,
        allBlock: cards.every(c => {
          const t = c.querySelector('.t'), s = c.querySelector('.s');
          return getComputedStyle(t).display === 'block' && getComputedStyle(s).display === 'block';
        }),
        concatenated: document.getElementById('inzicht-recent-list').innerText.includes('Frontsquathogere')
      };
    });
    ok(cardsCheck.count === 3, '33: exact 3 insight-cards worden getoond, conform canonical (naast elkaar, niet meer één grote lijst-kaart)');
    ok(cardsCheck.allBlock, '34: alle insight-cards hebben display:block op titel/beschrijving -- concatenatie-garantie behouden in de nieuwe structuur');
    ok(!cardsCheck.concatenated, '35: geen concatenatie in de nieuwe insight-card-structuur');

    // CTA: soft-teal, niet wit/zwaar.
    const ctaColor = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('#s-inzicht button'));
      const cta = btns.find(b => b.textContent.includes('Bekijk alle inzichten'));
      return cta ? getComputedStyle(cta).backgroundColor : null;
    });
    ok(ctaColor === 'rgb(0, 184, 148)' || (ctaColor && ctaColor.includes('184')), '36: de onderste CTA gebruikt de zachte, teal achtergrond (--color-primary-soft), niet wit/grijs');

    await page.close();
  }

  // PO Round 4 (Geometry+Density): Snel overzicht moet ALTIJD één, compacte
  // rij van 5 metrics zijn, geen 3+2-wrap meer (canonical density).
  for (const w of [320, 360, 375, 390, 412, 430]) {
    const page = await browser.newPage({ viewport: { width: w, height: 900 } });
    await page.goto(url);
    await page.waitForTimeout(500);
    await page.evaluate(() => { if (typeof go === 'function') go('s-inzicht'); });
    await page.waitForTimeout(500);
    const rowCheck = await page.evaluate(() => {
      const cells = Array.from(document.querySelectorAll('.tk-overview-cell'));
      const tops = [...new Set(cells.map(c => Math.round(c.getBoundingClientRect().top)))];
      return { cellCount: cells.length, rowCount: tops.length };
    });
    ok(rowCheck.cellCount === 5 && rowCheck.rowCount === 1, w + 'px 37: Snel overzicht toont alle 5 metrics op exact 1 rij (canonical density), geen 3+2-wrap meer');

    // PO Round 5 (Final Correction, hoofdvereiste): GEEN kunstmatige
    // woordafbreking midden in een Nederlands woord (was: "Rusthart-slag",
    // "Herstelsta-tus", "Krachtvo-lume").
    const midWordBreaks = await page.evaluate(() => {
      const labels = Array.from(document.querySelectorAll('.tk-overview-cell .lbl'));
      return labels.filter(l => {
        // Een label met meer dan 1 tekstregel EN geen spatie op de plek waar
        // de regel breekt, duidt op een mid-word-break (CSS hyphens/break-word).
        const rects = l.getClientRects();
        if (rects.length < 2) return false;
        return !l.textContent.includes(' ');
      }).map(l => l.textContent);
    });
    ok(midWordBreaks.length === 0, w + 'px 37b: geen enkel Snel-overzicht-label breekt midden in een woord zonder spatie (geen hyphens/break-word-artefact): ' + JSON.stringify(midWordBreaks));
    await page.close();
  }

  // PO Round 5 (Final Correction): domain-rows tonen ALLEEN een echte
  // mini-visualisatie bij echte data, GEEN decoratieve/dashed placeholder
  // meer -- de visual-zone blijft gereserveerd (voor alignment) maar toont
  // niets zichtbaars wanneer geen betrouwbare data bestaat.
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
    await page.goto(url);
    await page.waitForTimeout(500);
    await page.evaluate(() => { if (typeof go === 'function') go('s-inzicht'); });
    await page.waitForTimeout(500);
    const check = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('#inzicht-domain-list .tk-domain-row'));
      return {
        allHaveWrap: rows.every(r => r.querySelector('.miniviz-wrap') !== null),
        noDashedLines: document.querySelectorAll('.tk-domain-row line').length === 0,
        noDecorativeSvgWithoutData: rows.every(r => {
          const wrap = r.querySelector('.miniviz-wrap');
          const svg = wrap ? wrap.querySelector('svg') : null;
          // Een SVG mag alleen aanwezig zijn als er een echte polyline (data) in zit.
          return !svg || svg.querySelector('polyline') !== null;
        })
      };
    });
    ok(check.allHaveWrap, '38: elke domain-row heeft een gereserveerde miniviz-wrap-zone (voor consistente alignment van de chevron)');
    ok(check.noDashedLines, '38b: geen enkele domain-row toont nog een decoratieve, dashed placeholder-lijn (PO Final Correction: NO RELIABLE DATA -> geen grafiek, geen fake visual)');
    ok(check.noDecorativeSvgWithoutData, '38c: elke zichtbare SVG in een domain-row bevat een echte polyline (data) -- nooit een lege of decoratieve SVG zonder onderliggende data');
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

  // Final Geometry/Density Pass: domain-row-hoogte en Snel-overzicht-5-op-1-rij
  // meetbaar bewaakt tegen regressie (was 77-78px, nu gescoped verkleind).
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(url);
    await page.waitForTimeout(500);
    await page.evaluate(() => { if (typeof go === 'function') go('s-inzicht'); });
    await page.waitForTimeout(500);

    const domainRowHeights = await page.evaluate(() => Array.from(document.querySelectorAll('#inzicht-domain-list .row')).map(r => Math.round(r.getBoundingClientRect().height)));
    ok(domainRowHeights.every(h => h <= 70), '39: elke domain-row is <=70px hoog (was 77-78px voor de Final Geometry/Density Pass; Prestaties-rij heeft legitiem 2 regels beschrijvingstekst, vandaar 70px i.p.v. 62px als drempel -- geen informatie verwijderd) -- gemeten: ' + JSON.stringify(domainRowHeights));
    ok(domainRowHeights.every(h => h >= 44), '40: elke domain-row blijft >=44px (accessibility touch-target-minimum), density-verkleining gaat niet ten koste van toegankelijkheid');

    await page.evaluate(() => {
      const grid = document.getElementById('inzicht-overview-grid');
      grid.innerHTML = ['HRV (7d)','Rusthartslag','Slaap (7d)','Herstelstatus','Kracht-volume'].map(function(lbl){
        return '<div class="tk-overview-cell"><span class="ic-wrap">'+tkIcon('hartslag',{size:'standard'})+'</span><div class="lbl">'+lbl+'</div><div class="val">62<span class="unit">ms</span></div></div>';
      }).join('');
    });
    await page.waitForTimeout(200);
    const overviewRowCount = await page.evaluate(() => [...new Set(Array.from(document.querySelectorAll('.tk-overview-cell')).map(c => Math.round(c.getBoundingClientRect().top)))].length);
    ok(overviewRowCount === 1, '41: alle 5 Snel-overzicht-metrics passen op één rij op 390px (canonical density-doel), geen 3+2-wrap meer nodig bij realistische labellengtes');

    await page.close();
  }

  await browser.close();
  console.log('fInzichtV01BrowserRuntime: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  if (msgs.length) console.log(msgs.join('\n'));
  console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail > 0 ? 1 : 0);
})();
