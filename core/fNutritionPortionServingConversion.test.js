'use strict';
/* core/fNutritionPortionServingConversion.test.js -- NUT-PORTION-01.
 * Engine-tests (node) + gedragstests (Playwright, gebouwde app) voor
 * canonical serving_size_g/serving_size_ml-conversie en capability-aware
 * unit-beschikbaarheid. */
const assert = require('assert'); const path = require('path'); const fs = require('fs'); const http = require('http');
const Engine = require('./nutritionFoundation2.js');
let pass = 0, fail = 0;
function t(l, fn) { try { fn(); pass++; } catch (e) { fail++; console.log('MISLUKT:', l, '-', e.message); } }
async function ta(l, fn) { try { await fn(); pass++; } catch (e) { fail++; console.log('MISLUKT:', l, '-', e.message); } }

// ---- 1-2. PER_100G + serving_size_g: 1 serving == identieke engine-output als 30g ----
t('1-2. PER_100G + serving_size_g=30: 1 serving en 30g geven identieke engine-output', () => {
  const nv = { basis: 'PER_100G', energy_kcal: 250, protein_g: 36, carbohydrate_g: 50, fat_g: 50, serving_size_g: 30 };
  const viaServing = Engine.portionToNutrients(nv, 1, 'serving');
  const viaGram = Engine.portionToNutrients(nv, 30, 'g');
  assert.strictEqual(viaServing.status, 'valid');
  assert.deepStrictEqual(viaServing, viaGram);
  assert.strictEqual(viaServing.energy_kcal, 75); assert.strictEqual(viaServing.protein_g, 10.8);
});
// ---- 3. PER_100G zonder serving: gram werkt, serving niet ----
t('3. PER_100G zonder serving_size_g: gram werkt, serving geeft UNKNOWN_CONVERSION (geen 0)', () => {
  const nv = { basis: 'PER_100G', energy_kcal: 250 };
  assert.strictEqual(Engine.portionToNutrients(nv, 50, 'g').status, 'valid');
  const r = Engine.portionToNutrients(nv, 1, 'serving');
  assert.strictEqual(r.status, 'UNKNOWN_CONVERSION'); assert.strictEqual(r.reason, 'missing_serving_size_g');
  assert.strictEqual(Engine.availableQuantityUnits(nv).indexOf('serving'), -1);
});
// ---- 4. PER_100ML + serving_size_ml ----
t('4. PER_100ML + serving_size_ml=250: serving werkt, identiek aan 250ml', () => {
  const nv = { basis: 'PER_100ML', energy_kcal: 40, carbohydrate_g: 9, serving_size_ml: 250 };
  const viaServing = Engine.portionToNutrients(nv, 1, 'serving');
  const viaMl = Engine.portionToNutrients(nv, 250, 'ml');
  assert.deepStrictEqual(viaServing, viaMl); assert.strictEqual(viaServing.energy_kcal, 100);
});
// ---- 5. PER_100ML zonder serving ----
t('5. PER_100ML zonder serving_size_ml: ml werkt, serving niet beschikbaar', () => {
  const nv = { basis: 'PER_100ML', energy_kcal: 40 };
  assert.strictEqual(Engine.portionToNutrients(nv, 100, 'ml').status, 'valid');
  assert.strictEqual(Engine.portionToNutrients(nv, 1, 'serving').status, 'UNKNOWN_CONVERSION');
  assert.strictEqual(Engine.availableQuantityUnits(nv).indexOf('serving'), -1);
});
// ---- 6. PER_SERVING backwards compatible ----
t('6. PER_SERVING: bestaand gedrag ongewijzigd (geen regressie door de nieuwe serving-tak)', () => {
  const nv = { basis: 'PER_SERVING', energy_kcal: 150, protein_g: 5 };
  const r = Engine.portionToNutrients(nv, 2, 'serving');
  assert.strictEqual(r.status, 'valid'); assert.strictEqual(r.energy_kcal, 300);
  assert.deepStrictEqual(Engine.availableQuantityUnits(nv), ['serving', 'piece']);
});
// ---- 7. piece_weight_g backwards compatible ----
t('7. piece_weight_g: bestaand piece-gedrag ongewijzigd', () => {
  const nv = { basis: 'PER_100G', energy_kcal: 250 };
  const r = Engine.portionToNutrients(nv, 2, 'piece', 50);
  assert.strictEqual(r.status, 'valid'); assert.strictEqual(r.energy_kcal, 250);
  const rMissing = Engine.portionToNutrients(nv, 2, 'piece');
  assert.strictEqual(rMissing.status, 'UNKNOWN_CONVERSION'); assert.strictEqual(rMissing.reason, 'missing_piece_weight_g');
});
// ---- 8. zero/negative serving rejected ----
t('8. serving_size_g = 0 of negatief: net zo ongeldig als ontbrekend (geen conversie)', () => {
  assert.strictEqual(Engine.portionToNutrients({ basis: 'PER_100G', energy_kcal: 250, serving_size_g: 0 }, 1, 'serving').status, 'UNKNOWN_CONVERSION');
  assert.strictEqual(Engine.portionToNutrients({ basis: 'PER_100G', energy_kcal: 250, serving_size_g: -5 }, 1, 'serving').status, 'UNKNOWN_CONVERSION');
});
// ---- 10. UNKNOWN nutrients blijven UNKNOWN via serving-pad ----
t('10. UNKNOWN nutrients (null) blijven null via het serving-pad, nooit 0', () => {
  const nv = { basis: 'PER_100G', energy_kcal: 250, protein_g: null, serving_size_g: 30 };
  const r = Engine.portionToNutrients(nv, 1, 'serving');
  assert.strictEqual(r.protein_g, null);
});
// ---- 15-16. geen shadow calc / unit conversie in de UI-diff ----
t('15-16. Geen UI-nutrient-calculation of UI-unit-conversion in de NUT-PORTION-01-diff', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const b1 = html.slice(html.indexOf("id=\"voeding-custom-serving-wrap\""), html.indexOf('id="s-voeding-correctie"'));
  assert.strictEqual(/(kcal|energy|protein|carb|fat)[a-z_]*\s*[*\/]\s*\d/i.test(b1), false);
});

(async () => {
  let chromium; try { chromium = require('playwright').chromium; } catch (e) { console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt (playwright ontbreekt voor UI-tests)'); return; }
  const root = path.join(__dirname, '..', 'www'); if (!fs.existsSync(path.join(root, 'index.html'))) { console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt (www/ niet gebouwd)'); return; }
  const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0]) === '/' ? 'index.html' : decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, b) => { if (e) { r.statusCode = 404; return r.end(); } r.end(b); }); }).listen(0);
  const url = 'http://127.0.0.1:' + srv.address().port + '/index.html';
  const browser = await chromium.launch();
  async function open(db) { const p = await browser.newPage({ viewport: { width: 390, height: 844 } }); const dialogs = []; p.on('dialog', d => { dialogs.push(d.message()); d.dismiss(); }); p.__dialogs = dialogs;
    await p.goto(url); await p.waitForTimeout(300);
    await p.evaluate((db) => { authSession = { user: { id: 'u1' } }; window.__db = db; window.__posted = [];
      sbGet = async (tbl, q) => { const m = window.__db;
        if (tbl === 'nutrition_products') { if (q && q.includes('name=eq.')) { const nm = decodeURIComponent(q.split('name=eq.')[1].split('&')[0]); return (m.products || []).filter(x => x.name === nm); } if (q && q.includes('id=eq.')) { const id = q.split('id=eq.')[1].split('&')[0]; return (m.products || []).filter(x => x.id === id); } return m.products || []; }
        if (tbl === 'nutrition_nutrient_values') return m.nv || [];
        if (tbl === 'nutrition_product_identifiers') return [];
        return []; };
      sbPostQ = async (tbl, d) => { window.__posted.push({ tbl, d }); if (tbl === 'nutrition_products') { window.__db.products = window.__db.products || []; window.__db.products.push(Object.assign({ id: 'newp1', created_by: 'u1', created_at: new Date().toISOString() }, d)); } if (tbl === 'nutrition_nutrient_values') { window.__db.nv = window.__db.nv || []; window.__db.nv.push(d); } return true; };
    }, db); return p;
  }
  // ---- 11. custom product persistence/read-back: serving_size_g wordt daadwerkelijk opgeslagen en gebruikt ----
  await ta('11. Custom product met portiegrootte: opgeslagen serving_size_g wordt gebruikt in de aansluitende Hoeveelheid-preview', async () => {
    const p = await open({ products: [], nv: [] });
    await p.evaluate(() => { go('s-voeding-custom'); });
    await p.fill('#voeding-custom-name', 'Test portie');
    await p.fill('#voeding-custom-kcal', '250'); await p.fill('#voeding-custom-protein', '36'); await p.fill('#voeding-custom-carbs', '50'); await p.fill('#voeding-custom-fat', '50');
    await p.fill('#voeding-custom-serving', '30');
    await p.evaluate(() => voedingSaveCustomProduct());
    await p.waitForTimeout(300);
    const posted = await p.evaluate(() => window.__posted.find(x => x.tbl === 'nutrition_nutrient_values'));
    assert.strictEqual(posted.d.serving_size_g, 30);
    const screen = await p.evaluate(() => document.querySelector('.scr.active').id);
    assert.strictEqual(screen, 's-voeding-hoeveelheid');
    const r = await p.evaluate(() => ({ hasServingOption: !!document.querySelector('#voeding-qty-unit option[value="serving"]') }));
    assert.strictEqual(r.hasServingOption, true);
    await p.click('button:has-text("1 portie")'); await p.waitForTimeout(150);
    const preview = await p.evaluate(() => document.getElementById('voeding-portion-preview').textContent);
    assert.strictEqual(preview.includes('75'), true); await p.close();
  });
  // ---- second acceptance scenario: geen portiegrootte -> "1 portie" niet aangeboden ----
  await ta('12. Custom product ZONDER portiegrootte: "1 portie" wordt niet als bruikbare keuze aangeboden', async () => {
    const p = await open({ products: [], nv: [] });
    await p.evaluate(() => { go('s-voeding-custom'); });
    await p.fill('#voeding-custom-name', 'Zonder portie');
    await p.fill('#voeding-custom-kcal', '100');
    await p.evaluate(() => voedingSaveCustomProduct());
    await p.waitForTimeout(300);
    const r = await p.evaluate(() => ({ hasServingOption: !!document.querySelector('#voeding-qty-unit option[value="serving"]'), presetTexts: [...document.querySelectorAll('#voeding-portion-body button')].map(b => b.textContent) }));
    assert.strictEqual(r.hasServingOption, false);
    assert.strictEqual(r.presetTexts.some(t => t.includes('portie')), false);
    assert.deepStrictEqual(p.__dialogs, []); await p.close();
  });
  // ---- 9. decimal/comma serving input ----
  await ta('9. Portiegrootte met komma (30,5) wordt correct verwerkt', async () => {
    const p = await open({ products: [], nv: [] });
    await p.evaluate(() => { go('s-voeding-custom'); });
    await p.fill('#voeding-custom-name', 'Komma test');
    await p.fill('#voeding-custom-kcal', '100');
    await p.evaluate(() => { document.getElementById('voeding-custom-serving').type = 'text'; document.getElementById('voeding-custom-serving').value = '30,5'; });
    await p.evaluate(() => voedingSaveCustomProduct());
    await p.waitForTimeout(300);
    const posted = await p.evaluate(() => window.__posted.find(x => x.tbl === 'nutrition_nutrient_values'));
    assert.strictEqual(posted.d.serving_size_g, 30.5); await p.close();
  });
  // ---- 8b. zero/negative rejected in de UI zelf ----
  await ta('8b. Portiegrootte 0 of negatief wordt in de UI geweigerd, geen insert', async () => {
    const p = await open({ products: [], nv: [] });
    await p.evaluate(() => { go('s-voeding-custom'); });
    await p.fill('#voeding-custom-name', 'Ongeldige portie');
    await p.fill('#voeding-custom-kcal', '100');
    await p.fill('#voeding-custom-serving', '0');
    await p.evaluate(() => voedingSaveCustomProduct());
    await p.waitForTimeout(200);
    const r = await p.evaluate(() => ({ posted: window.__posted.length, errVisible: document.getElementById('voeding-custom-serving-error').style.display !== 'none' }));
    assert.strictEqual(r.posted, 0); assert.strictEqual(r.errVisible, true); await p.close();
  });
  await browser.close(); srv.close();
  console.log('fNutritionPortionServingConversion: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt'); if (fail) process.exit(1);
})();
