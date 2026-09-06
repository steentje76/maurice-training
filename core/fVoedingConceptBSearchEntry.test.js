'use strict';
/* core/fVoedingConceptBSearchEntry.test.js -- gedragstests (Playwright) voor
 * Concept B UX-02: Product zoeken / logging-entry, in de gebouwde app (www/)
 * met gemockte database-laag. Test gedrag, geen strings-only. */
const assert = require('assert'); const path = require('path'); const fs = require('fs'); const http = require('http');
let pass = 0, fail = 0;
async function t(l, fn) { try { await fn(); pass++; } catch (e) { fail++; console.log('MISLUKT:', l, '-', e.message); } }
(async () => {
  let chromium; try { chromium = require('playwright').chromium; } catch (e) { console.log('Resultaat: 0 geslaagd, 0 mislukt (skipped: playwright ontbreekt)'); return; }
  const root = path.join(__dirname, '..', 'www'); if (!fs.existsSync(path.join(root, 'index.html'))) { console.log('Resultaat: 0 geslaagd, 0 mislukt (skipped: www/ niet gebouwd)'); return; }
  const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0]) === '/' ? 'index.html' : decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, b) => { if (e) { r.statusCode = 404; return r.end(); } r.end(b); }); }).listen(0);
  const url = 'http://127.0.0.1:' + srv.address().port + '/index.html';
  const browser = await chromium.launch();
  async function page(w, setup) {
    const p = await browser.newPage({ viewport: { width: w || 390, height: 844 } }); const dialogs = []; p.on('dialog', d => { dialogs.push(d.message()); d.dismiss(); });
    await p.goto(url); await p.waitForTimeout(300);
    await p.evaluate((s) => { authSession = { user: { id: 'u1' } }; window.__mock = s;
      sbGet = async (tbl, q) => { const m = window.__mock; if (tbl === 'nutrition_meal_items') return m.items || []; if (tbl === 'nutrition_products') { if (q && q.includes('ilike')) { const term = decodeURIComponent(q.split('ilike.')[1].split('&')[0]).replace(/[%*]/g, '').toLowerCase(); return (m.products || []).filter(x => x.name.toLowerCase().includes(term)); } return m.products || []; } if (tbl === 'nutrition_nutrient_values') return m.nv || []; return []; };
      sbPostQ = async () => ({});
    }, setup || {});
    p.__dialogs = dialogs; return p;
  }
  const P = [{ id: 'p1', name: 'Skyr naturel', brand: 'Arla' }, { id: 'p2', name: 'Volkoren wrap kip', brand: 'Albert Heijn Een Heel Lange Merknaam Om Overflow Te Testen' }];
  const ITEMS = [{ product_id: 'p2', created_at: '2026-09-06T08:00:00Z' }, { product_id: 'p1', created_at: '2026-09-06T09:00:00Z' }, { product_id: 'p1', created_at: '2026-09-05T09:00:00Z' }];

  await t('Initial state: Product zoeken opent met zoekveld, 5 entry-chips (Zoeken actief), hulp-copy en Recent -- geen lege pagina', async () => {
    const p = await page(390, { products: P, items: ITEMS }); await p.evaluate(() => go('s-voeding-zoeken')); await p.waitForTimeout(500);
    const r = await p.evaluate(() => ({ chips: [...document.querySelectorAll('#s-voeding-zoeken .vd-chip')].map(c => c.textContent.trim()), active: document.getElementById('voeding-chip-zoeken').getAttribute('aria-pressed'), body: document.getElementById('voeding-search-results').textContent, hasInput: !!document.getElementById('voeding-search-input') }));
    assert.deepStrictEqual(r.chips, ['Zoeken', 'Recent', 'Barcode', 'Foto', 'Eigen']); assert.strictEqual(r.active, 'true'); assert.strictEqual(r.hasInput, true);
    assert.strictEqual(r.body.includes('Typ een productnaam'), true); assert.strictEqual(r.body.includes('Recent'), true); await p.close();
  });
  await t('Recent: canonical volgorde (meest recent eerst, gededupliceerd), verwijst naar bestaand product-id (geen shadow product)', async () => {
    const p = await page(390, { products: P, items: ITEMS }); await p.evaluate(() => go('s-voeding-zoeken')); await p.waitForTimeout(500);
    const names = await p.evaluate(() => [...document.querySelectorAll('#voeding-search-results .vd-prow > span > span:first-child')].map(e => e.textContent));
    assert.deepStrictEqual(names, ['Skyr naturel', 'Volkoren wrap kip']);
    const onclick = await p.evaluate(() => document.querySelector('#voeding-search-results .vd-prow').getAttribute('onclick')); assert.strictEqual(onclick.includes("voedingPickProduct('p1')"), true); await p.close();
  });
  await t('Recent zonder data: geen valse "geen producten gebruikt"-claim in initial state; Recent-chip toont eerlijke lege staat', async () => {
    const p = await page(390, { products: P, items: [] }); await p.evaluate(() => go('s-voeding-zoeken')); await p.waitForTimeout(400);
    let body = await p.evaluate(() => document.getElementById('voeding-search-results').textContent); assert.strictEqual(body.includes('Typ een productnaam'), true); assert.strictEqual(/Recent/.test(body), false);
    await p.evaluate(() => voedingSearchMode('recent')); await p.waitForTimeout(300); body = await p.evaluate(() => document.getElementById('voeding-search-results').textContent); assert.strictEqual(body.includes('Nog geen recent toegevoegde producten'), true); await p.close();
  });
  await t('Meal context: vanuit Lunch (+) toont "Toevoegen aan: Lunch"; zonder context wordt NIETS getoond (geen default Ontbijt)', async () => {
    const p = await page(390, { products: P, items: ITEMS });
    let r = await p.evaluate(async () => { voedingStartAddToMeal('lunch'); await new Promise(x => setTimeout(x, 300)); const c = document.getElementById('voeding-search-context'); return { txt: c.textContent, vis: c.style.display }; });
    assert.strictEqual(r.txt, 'Toevoegen aan: Lunch'); assert.strictEqual(r.vis, 'block');
    r = await p.evaluate(async () => { voedingCurrentMealTypeForAdd = null; go('s-voeding-zoeken'); await new Promise(x => setTimeout(x, 300)); const c = document.getElementById('voeding-search-context'); return { txt: c.textContent, vis: c.style.display }; });
    assert.strictEqual(r.vis, 'none'); assert.strictEqual(r.txt, ''); await p.close();
  });
  await t('Zoeken: bestaande pipeline, loading-state, resultaten scanbaar (naam + merk), lange merknaam geen overflow', async () => {
    const p = await page(320, { products: P, items: [] }); await p.evaluate(() => go('s-voeding-zoeken')); await p.waitForTimeout(200);
    await p.fill('#voeding-search-input', 'wrap'); await p.waitForTimeout(600);
    const r = await p.evaluate(() => ({ names: [...document.querySelectorAll('#voeding-search-results .vd-prow span span:first-child')].map(e => e.textContent), overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth }));
    assert.deepStrictEqual(r.names, ['Volkoren wrap kip']); assert.strictEqual(r.overflow, false); await p.close();
  });
  await t('No-results: onderscheid met initial state; veilige vervolgstappen (Barcode/Foto/Eigen) zonder auto-product', async () => {
    const p = await page(390, { products: P, items: ITEMS }); await p.evaluate(() => go('s-voeding-zoeken')); await p.waitForTimeout(200);
    await p.fill('#voeding-search-input', 'zzzz'); await p.waitForTimeout(600);
    const r = await p.evaluate(() => { const el = document.getElementById('voeding-search-results'); return { txt: el.textContent, btns: [...el.querySelectorAll('button')].map(b => b.textContent.trim()) }; });
    assert.strictEqual(r.txt.includes('Geen producten gevonden'), true); assert.strictEqual(r.txt.includes('Typ een productnaam'), false); assert.deepStrictEqual(r.btns, ['Barcode', 'Foto etiket', 'Zelf product toevoegen']); await p.close();
  });
  await t('Product kiezen -> Hoeveelheid (geen auto-portie, geen auto-maaltijd: default 100 blijft, maaltijd = context of eerste optie; niets gelogd)', async () => {
    const p = await page(390, { products: P, items: ITEMS, nv: [{ product_id: 'p1', basis: 'PER_100G', energy_kcal: 63, protein_g: 11 }] });
    const r = await p.evaluate(async () => { let posted = 0; sbPostQ = async () => { posted++; return {}; }; voedingCurrentMealTypeForAdd = null; go('s-voeding-zoeken'); await new Promise(x => setTimeout(x, 400)); document.querySelector('#voeding-search-results .vd-prow').click(); await new Promise(x => setTimeout(x, 500)); return { screen: document.querySelector('.scr.active').id, posted, name: document.getElementById('voeding-portion-body').textContent.includes('Skyr naturel'), qty: document.getElementById('voeding-qty-input').value }; });
    assert.strictEqual(r.screen, 's-voeding-hoeveelheid'); assert.strictEqual(r.posted, 0); assert.strictEqual(r.name, true); assert.strictEqual(r.qty, '100'); await p.close();
  });
  await t('Details-knop per rij houdt productdetail/correctie bereikbaar', async () => {
    const p = await page(390, { products: P, items: ITEMS }); await p.evaluate(() => go('s-voeding-zoeken')); await p.waitForTimeout(400);
    const s = await p.evaluate(async () => { document.querySelector('#voeding-search-results button[aria-label^="Details van"]').click(); await new Promise(x => setTimeout(x, 300)); return document.querySelector('.scr.active').id; }); assert.strictEqual(s, 's-voeding-product'); await p.close();
  });
  await t('Entry-routes: Barcode/Foto/Eigen chips navigeren naar bestaande schermen (ongewijzigd)', async () => {
    const p = await page(390, { products: P, items: [] }); await p.evaluate(() => go('s-voeding-zoeken')); await p.waitForTimeout(200);
    const r = await p.evaluate(async () => { const out = []; for (const [lbl, id] of [['Barcode', 's-voeding-scanner'], ['Foto', 's-voeding-foto-etiket'], ['Eigen', 's-voeding-custom']]) { go('s-voeding-zoeken'); await new Promise(x => setTimeout(x, 150)); [...document.querySelectorAll('#s-voeding-zoeken .vd-chip')].find(c => c.textContent.trim() === lbl).click(); await new Promise(x => setTimeout(x, 250)); out.push(document.querySelector('.scr.active').id === id); voedingCloseScanner && voedingCloseScanner(); } return out; });
    assert.deepStrictEqual(r, [true, true, true]); await p.close();
  });
  await t('Fout-state: netwerkfout bij zoeken geeft in-app melding, geen dialoog; stale resultaat bij snel typen wordt genegeerd', async () => {
    const p = await page(390, { products: P, items: [] }); await p.evaluate(() => go('s-voeding-zoeken')); await p.waitForTimeout(200);
    await p.evaluate(() => { sbGet = async () => { throw new Error('net'); }; }); await p.fill('#voeding-search-input', 'skyr'); await p.waitForTimeout(600);
    const body = await p.evaluate(() => document.getElementById('voeding-search-results').textContent); assert.strictEqual(body.includes('Zoeken mislukt'), true); assert.deepStrictEqual(p.__dialogs, []);
    const stale = await p.evaluate(async () => { let n = 0; sbGet = async (tbl) => { n++; const my = n; await new Promise(x => setTimeout(x, my === 1 ? 400 : 50)); return my === 1 ? [{ id: 'old', name: 'OUD' }] : [{ id: 'new', name: 'NIEUW' }]; }; voedingRunSearch('aaa'); await new Promise(x => setTimeout(x, 100)); voedingRunSearch('bbb'); await new Promise(x => setTimeout(x, 700)); return [...document.querySelectorAll('#voeding-search-results .vd-prow span span:first-child')].map(e => e.textContent); });
    assert.deepStrictEqual(stale, ['NIEUW']); await p.close();
  });
  await t('A11y + geen overflow op 320/360/390/412: chips >=44px, aria-pressed, input gelabeld, geen alert/prompt/confirm', async () => {
    for (const w of [320, 360, 390, 412]) { const p = await page(w, { products: P, items: ITEMS }); await p.evaluate(() => go('s-voeding-zoeken')); await p.waitForTimeout(400);
      const r = await p.evaluate(() => ({ ov: document.documentElement.scrollWidth > document.documentElement.clientWidth, minH: Math.min(...[...document.querySelectorAll('#s-voeding-zoeken .vd-chip')].map(c => c.getBoundingClientRect().height)), pressed: document.querySelectorAll('#s-voeding-zoeken .vd-chip[aria-pressed]').length, lbl: !!document.getElementById('voeding-search-input').getAttribute('aria-label') }));
      assert.strictEqual(r.ov, false, 'overflow@' + w); assert.strictEqual(r.minH >= 44, true, 'touch@' + w); assert.strictEqual(r.pressed, 5); assert.strictEqual(r.lbl, true); assert.deepStrictEqual(p.__dialogs, []); await p.close(); }
  });
  await t('Geen shadow calculations in UX-02-code (structureel)', async () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8'); const b = html.slice(html.indexOf('CONCEPT B / UX-02'), html.indexOf('async function voedingRunSearch'));
    assert.strictEqual(/(kcal|protein|carb|fat|portion|serving)\s*\*|\/\s*100/i.test(b), false);
  });
  await browser.close(); srv.close();
  console.log(`fVoedingConceptBSearchEntry: ${pass} geslaagd, ${fail} mislukt`); console.log(`Resultaat: ${pass} geslaagd, ${fail} mislukt`); if (fail) process.exit(1);
})();
