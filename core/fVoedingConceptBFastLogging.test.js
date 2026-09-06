'use strict';
/* core/fVoedingConceptBFastLogging.test.js -- gedragstests (Playwright) voor
 * Concept B UX-05: sneller dagelijks voedingsloggen. Repeat-actie vanuit een
 * bestaand item: canonical product_id + expliciete quantity-startwaarde,
 * NIEUWE insert via de bestaande create-pipeline (geen snapshot-copy). */
const assert = require('assert'); const path = require('path'); const fs = require('fs'); const http = require('http');
const Engine = require('./nutritionFoundation2.js');
let pass = 0, fail = 0;
async function t(l, fn) { try { await fn(); pass++; } catch (e) { fail++; console.log('MISLUKT:', l, '-', e.message); } }
const NV = { basis: 'PER_100G', energy_kcal: 63, protein_g: 11, carbohydrate_g: 4, fat_g: 0.2 };
(async () => {
  let chromium; try { chromium = require('playwright').chromium; } catch (e) { console.log('Resultaat: 0 geslaagd, 0 mislukt (skipped)'); return; }
  const root = path.join(__dirname, '..', 'www'); if (!fs.existsSync(path.join(root, 'index.html'))) { console.log('Resultaat: 0 geslaagd, 0 mislukt (skipped)'); return; }
  const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0]) === '/' ? 'index.html' : decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, b) => { if (e) { r.statusCode = 404; return r.end(); } r.end(b); }); }).listen(0);
  const url = 'http://127.0.0.1:' + srv.address().port + '/index.html';
  const browser = await chromium.launch();
  const baseDb = () => ({ meals: [{ id: 'm1', meal_type: 'breakfast' }], products: [{ id: 'p1', name: 'Skyr naturel', brand: 'Arla' }, { id: 'p2', name: 'Volkoren wrap kip', brand: 'AH' }], nv: [{ product_id: 'p1', basis: 'PER_100G', energy_kcal: 63, protein_g: 11, carbohydrate_g: 4, fat_g: 0.2 }], items: [{ id: 'i1', meal_id: 'm1', product_id: 'p1', quantity: 150, quantity_unit: 'g', nutrient_snapshot: { energy_kcal: 95, protein_g: 17, carbohydrate_g: 6, fat_g: 0.3 } }] });
  async function open(w, db) {
    const p = await browser.newPage({ viewport: { width: w || 390, height: 844 } }); const dialogs = []; p.on('dialog', d => { dialogs.push(d.message()); d.dismiss(); }); p.__dialogs = dialogs;
    await p.goto(url); await p.waitForTimeout(300);
    await p.evaluate((db) => { authSession = { user: { id: 'u1' } }; window.__db = db; window.__posted = [];
      sbGet = async (tbl, q) => { const m = window.__db;
        if (tbl === 'nutrition_meals') { if (q && q.includes('meal_type=eq.')) { const mt = q.split('meal_type=eq.')[1].split('&')[0]; return (m.meals || []).filter(x => x.meal_type === mt); } return m.meals || []; }
        if (tbl === 'nutrition_meal_items') { if (q && q.includes('&id=eq.')) { const id = q.split('&id=eq.')[1].split('&')[0]; return (m.items || []).filter(x => x.id === id); } if (q && q.includes('meal_id=eq.')) { const mid = q.split('meal_id=eq.')[1].split('&')[0]; return (m.items || []).filter(x => x.meal_id === mid); } return m.items || []; }
        if (tbl === 'nutrition_products') return m.products || []; if (tbl === 'nutrition_nutrient_values') return m.nv || []; return []; };
      sbPostQ = async (tbl, d) => { window.__posted.push({ tbl, d }); return {}; };
    }, db); return p;
  }
  await t('1-2. Known product (Recent/search) blijft direct naar Quantity gaan; Details blijft bereikbaar (UX-02, geen dubbel werk)', async () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    assert.strictEqual(html.includes("function voedingPickProduct(productId){ voedingSelectedProduct={id:productId}; go('s-voeding-hoeveelheid'); }"), true);
    assert.strictEqual(html.includes('aria-label="Details van'), true);
  });
  await t('6-9. Repeat-actie: navigeert naar Hoeveelheid met canonical product_id, GEEN oude snapshot gekopieerd', async () => {
    const p = await open(390, baseDb()); await p.evaluate(() => { voedingOpenMealItemEdit('i1'); }); await p.waitForTimeout(400);
    await p.click('button:has-text("Nogmaals toevoegen")'); await p.waitForTimeout(400);
    const r = await p.evaluate(() => ({ screen: document.querySelector('.scr.active').id, id: voedingSelectedProduct.id, hasOldSnapshot: 'nutrient_snapshot' in voedingSelectedProduct }));
    assert.strictEqual(r.screen, 's-voeding-hoeveelheid'); assert.strictEqual(r.id, 'p1'); assert.strictEqual(r.hasOldSnapshot, false); await p.close();
  });
  await t('10. Repeat: preview op de expliciete startwaarde (150g) == echte Portion Engine-output op de ACTUELE canonical data (niet de oude snapshot)', async () => {
    const p = await open(390, baseDb()); await p.evaluate(() => { voedingOpenMealItemEdit('i1'); }); await p.waitForTimeout(400);
    await p.click('button:has-text("Nogmaals toevoegen")'); await p.waitForTimeout(500);
    const r = await p.evaluate(() => ({ qty: document.getElementById('voeding-qty-input').value, preview: document.getElementById('voeding-portion-preview').textContent }));
    const e = Engine.portionToNutrients(NV, 150, 'g');
    assert.strictEqual(r.qty, '150'); assert.strictEqual(r.preview.includes(e.energy_kcal.toLocaleString('nl-NL') + ' kcal'), true); await p.close();
  });
  await t('11-12-13. Quantity en maaltijd zichtbaar/aanpasbaar vóór submit; geen auto-submit', async () => {
    const p = await open(390, baseDb()); await p.evaluate(() => voedingOpenMealItemEdit('i1')); await p.waitForTimeout(400); await p.click('button:has-text("Nogmaals toevoegen")'); await p.waitForTimeout(400);
    const r = await p.evaluate(() => ({ qtyVisible: !!document.getElementById('voeding-qty-input'), mealVisible: !!document.getElementById('voeding-meal-select'), posted: window.__posted.length }));
    assert.strictEqual(r.qtyVisible, true); assert.strictEqual(r.mealVisible, true); assert.strictEqual(r.posted, 0); await p.close();
  });
  await t('9(vervolg). Repeat gaat na bevestigen door de bestaande create-pipeline: nieuwe insert, gebaseerd op ACTUELE canonical data', async () => {
    const p = await open(390, baseDb()); await p.evaluate(() => voedingOpenMealItemEdit('i1')); await p.waitForTimeout(400); await p.click('button:has-text("Nogmaals toevoegen")'); await p.waitForTimeout(400);
    await p.evaluate(async () => { await voedingConfirmAddToMeal(); });
    const posted = await p.evaluate(() => window.__posted.find(x => x.tbl === 'nutrition_meal_items'));
    const e = Engine.portionToNutrients(NV, 150, 'g');
    assert.ok(posted); assert.strictEqual(posted.d.product_id, 'p1'); assert.strictEqual(posted.d.quantity, 150);
    assert.strictEqual(posted.d.nutrient_snapshot.energy_kcal, e.energy_kcal); await p.close();
  });
  await t('4-5. Meal-context: vanuit item-edit is meal_id impliciet bekend maar wordt NIET automatisch als "laatste maaltijd" voor andere flows gebruikt (geen algemene inference)', async () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    const b = html.slice(html.indexOf('function voedingRepeatItem'), html.indexOf('function voedingRenderItemEdit'));
    assert.strictEqual(/lastMeal|laatst.*maaltijd|preselect/i.test(b), false);
  });
  await t('16-17. Partial/missing canonical product veilig (geen crash, geen 0)', async () => {
    const db = baseDb(); db.nv[0].carbohydrate_g = null; db.nv[0].fat_g = null;
    const p = await open(390, db); await p.evaluate(() => voedingOpenMealItemEdit('i1')); await p.waitForTimeout(400); await p.click('button:has-text("Nogmaals toevoegen")'); await p.waitForTimeout(400);
    const txt = await p.evaluate(() => document.getElementById('voeding-portion-preview').textContent);
    assert.strictEqual(/Koolhydraten\s*—/.test(txt), true); assert.strictEqual(/0 g/.test(txt), false); await p.close();
  });
  await t('20. Geen remembered serving vanuit Recent: nieuwe zoek-selectie blijft standaard 100g/g (initialQty niet gezet)', async () => {
    const p = await open(390, baseDb()); await p.evaluate(() => { voedingSelectedProduct = { id: 'p1' }; go('s-voeding-hoeveelheid'); }); await p.waitForTimeout(400);
    assert.strictEqual(await p.evaluate(() => document.getElementById('voeding-qty-input').value), '100'); await p.close();
  });
  await t('19. Dubbele submit tijdens repeat-add geblokkeerd (bestaande voedingWithBusy)', async () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    assert.strictEqual(html.includes("voedingWithBusy(document.querySelector('#voeding-portion-body .tk-btn-primary')"), true);
  });
  await t('21-22-23. Geen AI, geen UI-nutrient-calc, geen camera/barcode-wijziging in de UX-05-diff', async () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    const b = html.slice(html.indexOf('/* == CONCEPT B / UX-05'), html.indexOf('function voedingRepeatItem') + 900).replace(/\r/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    assert.strictEqual(/anthropic|coach\.js|getUserMedia|ImageCapture|decodeBarcode/i.test(b), false);
    assert.strictEqual(/(kcal|energy|protein|carb|fat)[a-z_]*\s*[*\/]\s*\d/i.test(b), false);
  });
  await t('24-25. 320px/412px geen overflow op repeat-flow (item-edit + hoeveelheid)', async () => {
    for (const w of [320, 412]) { const p = await open(w, baseDb()); await p.evaluate(() => { voedingOpenMealItemEdit('i1'); }); await p.waitForTimeout(300);
      let ov = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth); assert.strictEqual(ov, false, 'edit@' + w);
      await p.click('button:has-text("Nogmaals toevoegen")'); await p.waitForTimeout(400);
      ov = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth); assert.strictEqual(ov, false, 'qty@' + w); assert.deepStrictEqual(p.__dialogs, []); await p.close(); }
  });
  await browser.close(); srv.close();
  console.log(`fVoedingConceptBFastLogging: ${pass} geslaagd, ${fail} mislukt`); console.log(`Resultaat: ${pass} geslaagd, ${fail} mislukt`); if (fail) process.exit(1);
})();
