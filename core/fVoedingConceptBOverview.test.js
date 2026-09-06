'use strict';
/* core/fVoedingConceptBOverview.test.js -- gedragstests (Playwright) voor
 * Concept B UX-01: Nutrition Overview. Test gedrag in de echte, gebouwde app
 * (www/) met gemockte database-laag; geen snapshots. */
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const http = require('http');

let pass = 0, fail = 0;
async function t(l, fn) { try { await fn(); pass++; } catch (e) { fail++; console.log('MISLUKT:', l, '-', e.message); } }

(async () => {
  let chromium; try { chromium = require('playwright').chromium; } catch (e) { console.log('OVERGESLAGEN: playwright niet beschikbaar.'); console.log('Resultaat: 0 geslaagd, 0 mislukt (skipped)'); return; }
  const root = path.join(__dirname, '..', 'www');
  if (!fs.existsSync(path.join(root, 'index.html'))) { console.log('OVERGESLAGEN: www/ niet gebouwd.'); console.log('Resultaat: 0 geslaagd, 0 mislukt (skipped)'); return; }
  const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.wasm': 'application/wasm' };
  const srv = http.createServer((req, res) => { const p = path.join(root, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html'); fs.readFile(p, (err, data) => { if (err) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': mime[path.extname(p)] || 'application/octet-stream' }); res.end(data); }); });
  await new Promise(r => srv.listen(0, r)); const port = srv.address().port;
  const browser = await chromium.launch();

  const T_ALL = [{ effective_from: '2026-01-01', energy_kcal: 2400, protein_g: 160, carbohydrate_g: 250, fat_g: 70, created_at: 'a' }];
  const M2 = [{ id: 'm1', meal_type: 'breakfast' }, { id: 'm2', meal_type: 'lunch' }];
  const I2 = [{ meal_id: 'm1', nutrient_snapshot: { energy_kcal: 520, protein_g: 32, carbohydrate_g: 60, fat_g: 14 } }, { meal_id: 'm1', nutrient_snapshot: { energy_kcal: 120, protein_g: 8, carbohydrate_g: 10, fat_g: 4 } }, { meal_id: 'm2', nutrient_snapshot: { energy_kcal: 780, protein_g: 45, carbohydrate_g: 90, fat_g: 28 } }];

  async function render(sc, width) {
    const page = await browser.newPage({ viewport: { width: width || 390, height: 844 } });
    const dialogs = []; page.on('dialog', d => { dialogs.push(d.message()); d.dismiss(); });
    await page.goto('http://localhost:' + port + '/index.html'); await page.waitForTimeout(400);
    const r = await page.evaluate(async (sc) => {
      authSession = { user: { id: 'u1' } }; window.__nav = [];
      sbGet = async (t) => ({ nutrition_targets: sc.t || [], nutrition_meals: sc.m || [], nutrition_meal_items: sc.i || [], nutrition_hydration_entries: sc.w || [], nutrition_supplement_logs: sc.s || [] }[t] || []);
      go('s-voeding'); await new Promise(r => setTimeout(r, 700));
      const scr = document.getElementById('s-voeding'), body = document.getElementById('voeding-overview-body');
      const cta = [...scr.querySelectorAll('button')].find(b => b.textContent.includes('Eten toevoegen'));
      const cr = cta.getBoundingClientRect(), nav = scr.querySelector('.bnav').getBoundingClientRect();
      const meals = [...body.querySelectorAll(':scope > .vd-meal')].map(b => ({ name: (b.querySelector('.n')||{}).textContent, text: b.textContent.replace(/\s+/g, ' ').trim(), h: Math.round(b.getBoundingClientRect().height), aria: b.getAttribute('aria-label') }));
      return { txt: body.textContent.replace(/\s+/g, ' '), nested: body.querySelectorAll('.tk-card .tk-card').length, overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        ctaVisible: cr.top >= 0 && cr.bottom <= innerHeight, ctaOverNav: cr.bottom > nav.top + 1, ctaHeight: Math.round(cr.height), meals, order: [...body.children].map(c => c.className || c.tagName).join('|'),
        bars: body.querySelectorAll('[role="presentation"]').length };
    }, sc);
    r.dialogs = dialogs; await page.close(); return r;
  }

  await t('Hiërarchie: dagstatus -> Maaltijden -> Overig, één kaartniveau (geen geneste kaarten), geen verweesde kop', async () => {
    const r = await render({ t: T_ALL, m: M2, i: I2, w: [{ amount_ml: 750 }] });
    assert.strictEqual(r.nested, 0); assert.strictEqual(/Voedingsstoffen \(vandaag\)/.test(r.txt), false);
    assert.strictEqual(r.txt.indexOf('je ingestelde doelen') < r.txt.indexOf('Maaltijden') && r.txt.indexOf('Maaltijden') < r.txt.indexOf('Overig'), true);
  });
  await t('Geen dubbele presentatie: kcal/macro\'s staan één keer (in doelregels), niet ook als losse samenvatting', async () => {
    const r = await render({ t: T_ALL, m: M2, i: I2 });
    assert.strictEqual(r.txt.includes('1420 / 2400 kcal'), true);
    assert.strictEqual(/Vandaag gelogd/i.test(r.txt), false);
    assert.strictEqual((r.txt.match(/1420/g) || []).length, 1);
  });
  await t('Alle targets: 4 doelregels met bars, waarden = canonical computeDailyProgress (1420/2400, Nog 980)', async () => {
    const r = await render({ t: T_ALL, m: M2, i: I2 });
    assert.strictEqual(r.bars, 4); assert.strictEqual(r.txt.includes('Nog 980 kcal'), true); assert.strictEqual(r.txt.includes('85 / 160 g'), true);
  });
  await t('Maaltijden zichtbaar op overview: canonical meal types in vaste volgorde, subtotaal + productaantal via aggregateDailyNutrition (Ontbijt 640 kcal · 2 producten)', async () => {
    const r = await render({ t: T_ALL, m: M2, i: I2 });
    assert.deepStrictEqual(r.meals.map(m => m.name), ['Ontbijt', 'Lunch', 'Diner', 'Snacks']);
    assert.strictEqual(r.meals[0].text.includes('640 kcal') && r.meals[0].text.includes('2 producten'), true);
    assert.strictEqual(r.meals[1].text.includes('780 kcal') && r.meals[1].text.includes('1 product'), true);
  });
  await t('Lege maaltijd: "Nog niets toegevoegd", tappable (≥44px), geen fout', async () => {
    const r = await render({ t: [], m: [], i: [] });
    assert.strictEqual(r.meals.length, 4); r.meals.forEach(m => { assert.strictEqual(m.text.includes('Nog niets toegevoegd'), true); assert.strictEqual(m.h >= 44, true, 'touch target ' + m.h); });
  });
  await t('Lege dag: rustige empty state, CTA aanwezig, geen 0 kcal getoond', async () => {
    const r = await render({ t: [], m: [], i: [] });
    assert.strictEqual(r.txt.includes('Je hebt vandaag nog niets toegevoegd'), true); assert.strictEqual(/\b0 kcal/.test(r.txt), false); assert.strictEqual(r.ctaVisible, true);
  });
  await t('Geen targets: no-target state met bestaande route "Doelen instellen"; geen verzonnen doelen; gelogde waarden wel zichtbaar', async () => {
    const r = await render({ t: [], m: M2, i: I2 });
    assert.strictEqual(r.txt.includes('nog geen voedingsdoelen ingesteld'), true); assert.strictEqual(r.txt.includes('Doelen instellen'), true);
    assert.strictEqual(r.bars, 0); assert.strictEqual(r.txt.includes('1420'), true); assert.strictEqual(/\/ \d+ (kcal|g)/.test(r.txt), false);
  });
  await t('Partial target (alleen eiwit): één doelregel; overige gelogde waarden één keer als feit "Gelogd zonder doel"', async () => {
    const r = await render({ t: [{ effective_from: '2026-01-01', protein_g: 160, energy_kcal: null, carbohydrate_g: null, fat_g: null, created_at: 'a' }], m: M2, i: I2 });
    assert.strictEqual(r.bars, 1); assert.strictEqual(r.txt.includes('85 / 160 g'), true); assert.strictEqual(r.txt.includes('Gelogd zonder doel'), true); assert.strictEqual(/\/ \d+ kcal/.test(r.txt), false);
  });
  await t('UNKNOWN != 0: onbekende inname -> "— / 160 g" + "Inname onvolledig bekend", GEEN bar, geen "0 g"', async () => {
    const r = await render({ t: T_ALL, m: [{ id: 'm1', meal_type: 'lunch' }], i: [{ meal_id: 'm1', nutrient_snapshot: { energy_kcal: 500, protein_g: null, carbohydrate_g: 60, fat_g: 20 } }] });
    assert.strictEqual(r.txt.includes('— / 160 g'), true); assert.strictEqual(r.txt.includes('Inname onvolledig bekend'), true);
    assert.strictEqual(r.bars, 3, 'eiwit zonder bar'); assert.strictEqual(/Eiwit[^\d]*0 g/.test(r.txt), false);
  });
  await t('Partial coverage wordt getoond ("deels bekend"), ook op de maaltijdrij', async () => {
    const r = await render({ t: T_ALL, m: [{ id: 'm1', meal_type: 'lunch' }], i: [{ meal_id: 'm1', nutrient_snapshot: { energy_kcal: 500, protein_g: 10, carbohydrate_g: 60, fat_g: 20 } }, { meal_id: 'm1', nutrient_snapshot: { energy_kcal: null, protein_g: null, carbohydrate_g: null, fat_g: null } }] });
    assert.strictEqual((r.txt.match(/deels bekend/g) || []).length >= 2, true);
  });
  await t('Over target: neutraal "150 kcal boven doel", geen straf-/dieettaal, geen rood-alleen-signaal (tekst aanwezig)', async () => {
    const r = await render({ t: [{ effective_from: '2026-01-01', energy_kcal: 2000, protein_g: 120, carbohydrate_g: 200, fat_g: 60, created_at: 'a' }], m: [{ id: 'm1', meal_type: 'dinner' }], i: [{ meal_id: 'm1', nutrient_snapshot: { energy_kcal: 2150, protein_g: 130, carbohydrate_g: 180, fat_g: 72 } }] });
    assert.strictEqual(r.txt.includes('150 kcal boven doel'), true); assert.strictEqual(/te veel|slecht|limiet|gefaald|overschreden/i.test(r.txt), false);
  });
  await t('Primaire CTA "+ Eten toevoegen": zichtbaar in viewport zonder scrollen, ≥44px, bedekt nav noch content; navigeert naar bestaande maaltijdflow', async () => {
    for (const w of [320, 360, 390, 412]) { const r = await render({ t: T_ALL, m: M2, i: I2 }, w); assert.strictEqual(r.ctaVisible && !r.ctaOverNav && r.ctaHeight >= 44 && !r.overflow, true, 'width ' + w); }
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    assert.strictEqual(/class="ex-pick-sticky-bottom"><button[^>]*onclick="go\('s-voeding-maaltijden'\)"[^>]*>\+ Eten toevoegen/.test(html), true);
  });
  await t('Water/Supplementen secundair (na Maaltijden), behouden en bereikbaar; water: niets gelogd = "0 L" (echte nul)', async () => {
    const r = await render({ t: T_ALL, m: M2, i: I2, w: [], s: [{ id: 's1' }] });
    assert.strictEqual(r.txt.indexOf('Maaltijden') < r.txt.indexOf('Water'), true); assert.strictEqual(r.txt.includes('0 L'), true); assert.strictEqual(r.txt.includes('1 vandaag'), true);
  });
  await t('Copy: "je ingestelde doelen"; nergens optimale/aanbevolen/ideale/behoefte/je moet nog', async () => {
    const r = await render({ t: T_ALL, m: M2, i: I2 });
    assert.strictEqual(r.txt.includes('je ingestelde doelen'), true); assert.strictEqual(/optima|aanbevolen|ideale|behoefte|je moet nog/i.test(r.txt), false);
  });
  await t('Geen browser-dialogen; a11y: maaltijdrijen zijn buttons met aria-label', async () => {
    const r = await render({ t: T_ALL, m: M2, i: I2 });
    assert.deepStrictEqual(r.dialogs, []); r.meals.forEach(m => assert.strictEqual(!!m.aria, true));
  });
  await t('Geen shadow calculation: overview-renderer gebruikt uitsluitend aggregateDailyNutrition/computeDailyProgress/aggregateDailyHydration; geen eigen som/vermenigvuldiging van nutriënten', async () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    const b = html.slice(html.indexOf('async function voedingRenderOverview'), html.indexOf('function voedingOpenWaterEntry'));
    ['NutritionMealService.aggregateDailyNutrition', 'NutritionTargetService.computeDailyProgress', 'NutritionHydrationService.aggregateDailyHydration'].forEach(s => assert.strictEqual(b.includes(s), true, s));
    assert.strictEqual(/(energy_kcal|protein_g|carbohydrate_g|fat_g)\s*[+*\-]\s*[a-z0-9_.]+\s*[+*]/.test(b), false, 'geen rekenkundige nutrient-expressies');
    assert.strictEqual(/\.reduce\(/.test(b), false);
  });

  await browser.close(); srv.close();
  console.log(`fVoedingConceptBOverview: ${pass} geslaagd, ${fail} mislukt`);
  console.log(`Resultaat: ${pass} geslaagd, ${fail} mislukt`);
  if (fail) process.exit(1);
})();
