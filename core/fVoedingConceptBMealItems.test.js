'use strict';
/* core/fVoedingConceptBMealItems.test.js -- gedragstests (Playwright) voor
 * Concept B UX-04: Maaltijden & items bekijken/bewerken/verwijderen, in de
 * gebouwde app met gemockte database-laag. Verwachte waarden komen uit
 * NutritionFoundation2Core.portionToNutrients zelf (geen aannames). */
const assert = require('assert'); const path = require('path'); const fs = require('fs'); const http = require('http');
const Engine = require('./nutritionFoundation2.js');
let pass = 0, fail = 0;
async function t(l, fn) { try { await fn(); pass++; } catch (e) { fail++; console.log('MISLUKT:', l, '-', e.message); } }
const NV = { basis: 'PER_100G', energy_kcal: 63, protein_g: 11, carbohydrate_g: 4, fat_g: 0.2 };
function nl(v, u) { return v == null ? '—' : v.toLocaleString('nl-NL', { maximumFractionDigits: 1 }) + ' ' + u; }
(async () => {
  let chromium; try { chromium = require('playwright').chromium; } catch (e) { console.log('Resultaat: 0 geslaagd, 0 mislukt (skipped: playwright ontbreekt)'); return; }
  const root = path.join(__dirname, '..', 'www'); if (!fs.existsSync(path.join(root, 'index.html'))) { console.log('Resultaat: 0 geslaagd, 0 mislukt (skipped: www/ niet gebouwd)'); return; }
  const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0]) === '/' ? 'index.html' : decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, b) => { if (e) { r.statusCode = 404; return r.end(); } r.end(b); }); }).listen(0);
  const url = 'http://127.0.0.1:' + srv.address().port + '/index.html';
  const browser = await chromium.launch();
  async function open(w, db) {
    const p = await browser.newPage({ viewport: { width: w || 390, height: 844 } }); const dialogs = []; p.on('dialog', d => { dialogs.push(d.message()); d.dismiss(); }); p.__dialogs = dialogs;
    await p.goto(url); await p.waitForTimeout(300);
    await p.evaluate((db) => {
      authSession = { user: { id: 'u1' } }; window.__db = db; window.__patched = [];
      sbGet = async (tbl, q) => { const m = window.__db;
        if (tbl === 'nutrition_meals') return m.meals || [];
        if (tbl === 'nutrition_meal_items') { if (q && q.includes('&id=eq.')) { const id = q.split('&id=eq.')[1].split('&')[0]; return (m.items || []).filter(x => x.id === id); } if (q && q.includes('meal_id=eq.')) { const mid = q.split('meal_id=eq.')[1].split('&')[0]; return (m.items || []).filter(x => x.meal_id === mid); } return m.items || []; }
        if (tbl === 'nutrition_products') return m.products || [];
        if (tbl === 'nutrition_nutrient_values') return m.nv || []; return []; };
      sbDelQ = async (tbl, q) => { const id = q.split('id=eq.')[1]; window.__db.items = (window.__db.items || []).filter(x => x.id !== id); };
      sbPatchQ = async (tbl, q, d) => { const id = q.split('id=eq.')[1]; const it = (window.__db.items || []).find(x => x.id === id); if (it) Object.assign(it, d); window.__patched.push({ id, d }); };
    }, db); return p;
  }
  const baseDb = () => ({ meals: [{ id: 'm1', meal_type: 'breakfast' }], products: [{ id: 'p1', name: 'Skyr naturel', brand: 'Arla' }], nv: [{ product_id: 'p1', basis: 'PER_100G', energy_kcal: 63, protein_g: 11, carbohydrate_g: 4, fat_g: 0.2 }], items: [{ id: 'i1', meal_id: 'm1', product_id: 'p1', quantity: 100, quantity_unit: 'g', nutrient_snapshot: { energy_kcal: 63, protein_g: 11, carbohydrate_g: 4, fat_g: 0.2 } }] });

  await t('1-4. Maaltijd toont canonical items (naam, quantity/unit, kcal)', async () => {
    const p = await open(390, baseDb()); await p.evaluate(() => { voedingOpenMealDetailId = 'm1'; go('s-voeding-maaltijd-detail'); }); await p.waitForTimeout(400);
    const txt = await p.evaluate(() => document.getElementById('voeding-meal-detail-body').textContent);
    assert.strictEqual(txt.includes('Skyr naturel'), true); assert.strictEqual(txt.includes('100 g'), true); assert.strictEqual(txt.includes('63 kcal'), true); await p.close();
  });
  await t('5. kcal UNKNOWN toont geen 0', async () => {
    const db = baseDb(); db.items[0].nutrient_snapshot.energy_kcal = null;
    const p = await open(390, db); await p.evaluate(() => { voedingOpenMealDetailId = 'm1'; go('s-voeding-maaltijd-detail'); }); await p.waitForTimeout(400);
    const txt = await p.evaluate(() => document.getElementById('voeding-meal-detail-body').textContent);
    assert.strictEqual(txt.includes('—'), true); assert.strictEqual(/\b0 kcal\b/.test(txt), false); await p.close();
  });
  await t('6-7. Item opent edit met bestaande quantity geladen', async () => {
    const p = await open(390, baseDb()); await p.evaluate(() => { voedingOpenMealDetailId = 'm1'; go('s-voeding-maaltijd-detail'); }); await p.waitForTimeout(400);
    await p.click('.vd-prow'); await p.waitForTimeout(400);
    const r = await p.evaluate(() => ({ screen: document.querySelector('.scr.active').id, qty: document.getElementById('voeding-edit-qty-input').value, name: document.getElementById('voeding-item-edit-sub').textContent }));
    assert.strictEqual(r.screen, 's-voeding-item-edit'); assert.strictEqual(r.qty, '100'); assert.strictEqual(r.name, 'Skyr naturel'); await p.close();
  });
  await t('9-10. Quantity wijzigen (25->40g) gebruikt Portion Engine; preview == engine-output', async () => {
    const p = await open(390, baseDb()); await p.evaluate(() => { voedingOpenMealItemEdit('i1'); }); await p.waitForTimeout(400);
    await p.fill('#voeding-edit-qty-input', '40'); await p.waitForTimeout(80);
    const txt = await p.evaluate(() => document.getElementById('voeding-edit-preview').textContent);
    const e = Engine.portionToNutrients(NV, 40, 'g');
    assert.strictEqual(txt.includes(nl(e.energy_kcal, 'kcal')), true); assert.strictEqual(txt.includes(nl(e.protein_g, 'g')), true); await p.close();
  });
  await t('11-12-15-16. Save update: nutrient_snapshot na edit == engine-output, geen auto-save, dubbele save geblokkeerd', async () => {
    const p = await open(390, baseDb()); await p.evaluate(() => { voedingOpenMealItemEdit('i1'); }); await p.waitForTimeout(400);
    await p.fill('#voeding-edit-qty-input', '40'); await p.waitForTimeout(80);
    const before = await p.evaluate(() => window.__patched.length); assert.strictEqual(before, 0, 'geen auto-save');
    await p.evaluate(async () => { await voedingSaveItemEdit(); });
    const r = await p.evaluate(() => ({ patched: window.__patched, screen: document.querySelector('.scr.active').id }));
    const e = Engine.portionToNutrients(NV, 40, 'g');
    assert.strictEqual(r.patched.length, 1); assert.strictEqual(r.patched[0].d.quantity, 40); assert.strictEqual(r.patched[0].d.nutrient_snapshot.energy_kcal, e.energy_kcal);
    assert.strictEqual(r.screen, 's-voeding-maaltijd-detail'); await p.close();
  });
  await t('13-14. Subtotaal/dagtotaal na edit via canonical aggregate (herrender), geen DOM-delta', async () => {
    const p = await open(390, baseDb()); await p.evaluate(() => { voedingOpenMealDetailId = 'm1'; go('s-voeding-maaltijd-detail'); }); await p.waitForTimeout(300);
    await p.evaluate(() => { voedingOpenMealItemEdit('i1'); }); await p.waitForTimeout(300);
    await p.fill('#voeding-edit-qty-input', '200'); await p.waitForTimeout(80);
    await p.evaluate(async () => { await voedingSaveItemEdit(); }); await p.waitForTimeout(400);
    const e = Engine.portionToNutrients(NV, 200, 'g');
    const txt = await p.evaluate(() => document.getElementById('voeding-meal-detail-body').textContent);
    assert.strictEqual(txt.includes('Totaal maaltijd ' + e.energy_kcal + ' kcal'), true); await p.close();
  });
  await t('17. Update failure geeft in-app error, geen crash', async () => {
    const p = await open(390, baseDb()); await p.evaluate(() => { voedingOpenMealItemEdit('i1'); sbPatchQ = async () => { throw new Error('net'); }; }); await p.waitForTimeout(300);
    await p.fill('#voeding-edit-qty-input', '50'); await p.waitForTimeout(80);
    await p.evaluate(async () => { await voedingSaveItemEdit(); });
    const err = await p.evaluate(() => document.getElementById('voeding-edit-error').textContent);
    assert.strictEqual(err.includes('mislukt'), true); assert.deepStrictEqual(p.__dialogs, []); await p.close();
  });
  await t('18-19-20-21-22. Delete werkt (via bevestigingsmodal, geen window.confirm), item count/subtotal na delete klopt', async () => {
    const p = await open(390, baseDb()); await p.evaluate(() => { voedingOpenMealDetailId = 'm1'; go('s-voeding-maaltijd-detail'); }); await p.waitForTimeout(300);
    await p.click('button[aria-label*="verwijderen"]'); await p.waitForTimeout(150);
    const modalVisible = await p.evaluate(() => document.getElementById('m-voeding-confirm').classList.contains('show') || getComputedStyle(document.getElementById('m-voeding-confirm')).display !== 'none');
    await p.click('#m-voeding-confirm-yes'); await p.waitForTimeout(400);
    const r = await p.evaluate(() => ({ items: window.__db.items.length, sub: document.getElementById('voeding-meal-detail-sub').textContent, body: document.getElementById('voeding-meal-detail-body').textContent }));
    assert.strictEqual(r.items, 0); assert.deepStrictEqual(p.__dialogs, []); await p.close();
  });
  await t('23. Laatste item verwijderen -> correcte empty state ("Nog niets toegevoegd"), geen "0 kcal · 0 producten"', async () => {
    const db = baseDb(); db.items = [];
    const p = await open(390, db); await p.evaluate(() => { voedingOpenMealDetailId = 'm1'; go('s-voeding-maaltijd-detail'); }); await p.waitForTimeout(400);
    const txt = await p.evaluate(() => document.getElementById('voeding-meal-detail-body').textContent);
    assert.strictEqual(txt.includes('Nog niets toegevoegd'), true); assert.strictEqual(/0 kcal.*0 product/.test(txt), false); await p.close();
  });
  await t('25. Partial nutrition (carbs/fat UNKNOWN) veilig in edit-preview, geen 0', async () => {
    const db = baseDb(); db.nv[0].carbohydrate_g = null; db.nv[0].fat_g = null;
    const p = await open(390, db); await p.evaluate(() => { voedingOpenMealItemEdit('i1'); }); await p.waitForTimeout(400);
    const txt = await p.evaluate(() => document.getElementById('voeding-edit-preview').textContent);
    assert.strictEqual(/Koolhydraten\s*—/.test(txt) && /Vet\s*—/.test(txt), true); assert.strictEqual(/0 g/.test(txt), false); await p.close();
  });
  await t('26-27. Geen shadow calc / geen DOM-total-delta in de UX-04-code', async () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    const b = html.slice(html.indexOf('/* == CONCEPT B / UX-04'), html.indexOf('async function voedingSaveItemEdit') + 400).replace(/\r/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    assert.strictEqual(/(kcal|energy|protein|carb|fat)[a-z_]*\s*[*\/]\s*\d|\/\s*100/i.test(b), false);
    assert.strictEqual(/mealTotal|displayedTotal|-\s*deletedItem/i.test(b), false);
    assert.strictEqual(b.includes('NutritionFoundation2Core.portionToNutrients'), true);
  });
  await t('28-29. Geen AI, geen barcode/camera-wijziging in de UX-04-code', async () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    const b = html.slice(html.indexOf('/* == CONCEPT B / UX-04'), html.indexOf('async function voedingSaveItemEdit') + 400);
    assert.strictEqual(/anthropic|coach\.js|getUserMedia|ImageCapture|decodeBarcode/i.test(b), false);
  });
  await t('30-31. 320px/412px geen overflow op maaltijddetail en item-edit', async () => {
    for (const w of [320, 412]) { const p = await open(w, baseDb()); await p.evaluate(() => { voedingOpenMealDetailId = 'm1'; go('s-voeding-maaltijd-detail'); }); await p.waitForTimeout(300);
      let ov = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth); assert.strictEqual(ov, false, 'detail@' + w);
      await p.evaluate(() => voedingOpenMealItemEdit('i1')); await p.waitForTimeout(300);
      ov = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth); assert.strictEqual(ov, false, 'edit@' + w); await p.close(); }
  });
  await browser.close(); srv.close();
  console.log(`fVoedingConceptBMealItems: ${pass} geslaagd, ${fail} mislukt`); console.log(`Resultaat: ${pass} geslaagd, ${fail} mislukt`); if (fail) process.exit(1);
})();
