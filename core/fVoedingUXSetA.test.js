'use strict';
/* core/fVoedingUXSetA.test.js — ECHTE browser-runtime-tests (Playwright)
 * voor de goedgekeurde Nutrition UX Set A (screens 1-8). Verifieert
 * routing, foutloos laden, en dat de UI uitsluitend bestaande,
 * ongewijzigde core/nutrition*.js-services aanroept (geen shadow
 * calculation in index.html).
 */
const path = require('path');
const fs = require('fs');
const assert = require('assert');

let pass = 0, fail = 0;
async function t(label, fn) {
  try { await fn(); pass++; }
  catch (e) { fail++; console.log('MISLUKT:', label, '-', e.message); }
}

(async () => {
  let chromium;
  try { chromium = require('playwright').chromium; }
  catch (e) { console.log('OVERGESLAGEN: playwright niet beschikbaar.'); console.log('Resultaat: 0 geslaagd, 0 mislukt (skipped)'); return; }

  const INDEX_PATH = 'file://' + path.join(__dirname, '..', 'index.html');
  const browser = await chromium.launch();

  await t('Inzicht: Voeding-domeinrij bestaat en navigeert naar s-voeding', async () => {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(INDEX_PATH);
    await page.waitForTimeout(400);
    await page.evaluate(() => go('s-inzicht'));
    await page.waitForTimeout(400);
    const hasVoedingRow = await page.evaluate(() => {
      var rows = Array.from(document.querySelectorAll('#inzicht-domain-list .tk-domain-row .t'));
      return rows.some(function (el) { return el.textContent === 'Voeding'; });
    });
    assert.strictEqual(hasVoedingRow, true);
    await page.close();
  });

  const screens = ['s-voeding', 's-voeding-maaltijden', 's-voeding-zoeken', 's-voeding-supplement'];
  for (const scr of screens) {
    await t('Screen ' + scr + ': laadt foutloos (geen pageerror/JS-crash)', async () => {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(INDEX_PATH);
      await page.waitForTimeout(400);
      await page.evaluate((s) => go(s), scr);
      await page.waitForTimeout(400);
      const isActive = await page.evaluate((s) => {
        const el = document.getElementById(s);
        return el && el.classList.contains('active');
      }, scr);
      assert.strictEqual(isActive, true, scr + ' moet actief worden na go()');
      assert.deepStrictEqual(errors, [], scr + ' mag geen pageerror geven: ' + JSON.stringify(errors));
      await page.close();
    });
  }

  await t('Knoppen gebruiken de echte, bestaande tk-btn-primary/tk-btn-secondary classes (geen dode class-namen, adversarial regressie-check)', async () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    // HTML-sectie (eerste occurrence, de zeven <div class="scr">-schermen).
    const htmlStart = html.indexOf('VOEDING (Nutrition UX v1)');
    const htmlEnd = html.indexOf('<!-- ═══ TRAINING HUB');
    const htmlBlock = html.slice(htmlStart, htmlEnd);
    assert.strictEqual(/class=\\?"btn-primary\\?"/.test(htmlBlock), false, 'geen dode btn-primary-class meer in het Voeding-HTML-blok');
    assert.strictEqual(/class=\\?"btn-secondary\\?"/.test(htmlBlock), false, 'geen dode btn-secondary-class meer in het Voeding-HTML-blok');
    assert.strictEqual(htmlBlock.includes('tk-btn-primary'), true);
  });

  await t('Portion-flow roept NutritionFoundation2Core.portionToNutrients() aan -- geen shadow calculation in de UI-laag (adversarial, structurele check)', async () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    const fnStart = html.indexOf('async function voedingConfirmAddToMeal');
    const fnEnd = html.indexOf('\n}', fnStart);
    const fnBody = html.slice(fnStart, fnEnd);
    assert.strictEqual(fnBody.includes('NutritionFoundation2Core.portionToNutrients'), true);
    // Adversarial: geen losse, eigen kcal/gram-vermenigvuldiging in deze functie.
    assert.strictEqual(/\*\s*100\b/.test(fnBody), false, 'geen eigen /100-schaling in de UI, dat hoort in de core-module');
  });

  await t('Daily aggregation in het overzicht roept NutritionMealService.aggregateDailyNutrition() aan (geen shadow calculation)', async () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    const fnStart = html.indexOf('async function voedingRenderOverview');
    const fnEnd = html.indexOf('\nfunction voedingOpenWaterEntry', fnStart);
    const fnBody = html.slice(fnStart, fnEnd);
    assert.strictEqual(fnBody.includes('NutritionMealService.aggregateDailyNutrition'), true);
  });

  await t('UNKNOWN != 0: overzicht toont een ontbrekend voedingsstof-veld niet als 0 (structurele check op de UNKNOWN-guard in de renderfunctie)', async () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    const fnStart = html.indexOf('async function voedingRenderOverview');
    const fnEnd = html.indexOf('\nfunction voedingOpenWaterEntry', fnStart);
    const fnBody = html.slice(fnStart, fnEnd);
    assert.strictEqual(fnBody.includes("coverage[f]==='UNKNOWN'"), true, 'expliciete UNKNOWN-check moet aanwezig zijn voordat een waarde getoond wordt');
  });

  await t('Geen doelnotatie (X/Y) voor kcal/macro/water/supplementen in het Voeding-blok (PO-besluit: targets blijven open, adversarial regressie-check)', async () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    const htmlStart = html.indexOf('VOEDING (Nutrition UX v1)');
    const htmlEnd = html.indexOf('<!-- ═══ TRAINING HUB');
    const jsStart = html.indexOf('VOEDING (Nutrition UX v1)', htmlEnd);
    const jsEndMarker = html.indexOf('async function voedingDeleteSupplementLog');
    const jsClosingBrace = html.indexOf('}', jsEndMarker);
    const block = html.slice(htmlStart, htmlEnd) + html.slice(jsStart, jsClosingBrace + 1);
    // Geen letterlijke "kcal / " of " / 2" patronen die op een doel-notatie wijzen.
    assert.strictEqual(/kcal\s*\/\s*\d/.test(block), false);
    assert.strictEqual(/\d\s*\/\s*\d[.,]?\d*\s*L\b/.test(block), false);
  });

  console.log(`fVoedingUXSetA: ${pass} geslaagd, ${fail} mislukt`);
  console.log(`Resultaat: ${pass} geslaagd, ${fail} mislukt`);
  await browser.close();
  if (fail > 0) process.exit(1);
})();
