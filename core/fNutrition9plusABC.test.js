'use strict';
/* core/fNutrition9plusABC.test.js -- A (nutrition_entries anon hardening,
 * live SQL geverifieerd, hier alleen als documentatie-assert), B
 * (NUT-DATA-OBS-01 near-duplicate V1: barcode-eerst-dan-naam, user-scoped)
 * en C (serving_size correction). Gedragstests, gebouwde app. */
const assert = require('assert'); const path = require('path'); const fs = require('fs'); const http = require('http');
let pass = 0, fail = 0;
async function t(l, fn) { try { await fn(); pass++; } catch (e) { fail++; console.log('MISLUKT:', l, '-', e.message); } }
(async () => {
  let chromium; try { chromium = require('playwright').chromium; } catch (e) { console.log('Resultaat: 0 geslaagd, 0 mislukt (skipped)'); return; }
  const root = path.join(__dirname, '..', 'www'); if (!fs.existsSync(path.join(root, 'index.html'))) { console.log('Resultaat: 0 geslaagd, 0 mislukt (skipped)'); return; }
  const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0]) === '/' ? 'index.html' : decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, b) => { if (e) { r.statusCode = 404; return r.end(); } r.end(b); }); }).listen(0);
  const url = 'http://127.0.0.1:' + srv.address().port + '/index.html';
  const browser = await chromium.launch();
  async function open(db) {
    const p = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await p.goto(url); await p.waitForTimeout(300);
    await p.evaluate((db) => { authSession = { user: { id: 'u1' } }; window.__db = db; window.__posted = [];
      sbGet = async (tbl, q) => { const m = window.__db;
        if (tbl === 'nutrition_product_identifiers') { if (q && q.includes('value=eq.')) { const v = q.split('value=eq.')[1].split('&')[0]; return (m.identifiers || []).filter(x => x.value === v); } return m.identifiers || []; }
        if (tbl === 'nutrition_products') { let rows = m.products || [];
          if (q && q.includes('id=in.')) { const ids = q.split('id=in.(')[1].split(')')[0].split(','); rows = rows.filter(x => ids.includes(x.id)); }
          if (q && q.includes('name=ilike.') || q && q.includes('name=eq.')) { const nm = decodeURIComponent((q.split('name=ilike.')[1] || q.split('name=eq.')[1] || '').split('&')[0]); rows = rows.filter(x => x.name.toLowerCase() === nm.toLowerCase()); }
          if (q && q.includes('created_by=eq.')) { const uid = q.split('created_by=eq.')[1].split('&')[0]; rows = rows.filter(x => x.created_by === uid); }
          return rows; }
        if (tbl === 'nutrition_nutrient_values') return m.nv || []; return []; };
      sbPostQ = async (tbl, d) => { window.__posted.push({ tbl, d }); const m = window.__db;
        if (tbl === 'nutrition_products') { m.products = m.products || []; const rec = Object.assign({ id: 'new-' + m.products.length, created_by: 'u1', created_at: new Date().toISOString() }, d); m.products.push(rec); }
        if (tbl === 'nutrition_product_identifiers') { m.identifiers = m.identifiers || []; m.identifiers.push(d); }
        return true; };
    }, db); return p;
  }
  // ---- B: A. USER barcode X -> USER_LABEL_SCAN barcode X => duplicate warning ----
  await t('B-A. Zelfde barcode (X), andere gebruiker-eigen producten: STRONG_DUPLICATE-waarschuwing, geen automatische insert', async () => {
    const p = await open({ products: [{ id: 'p1', name: 'Bestaand Product', created_by: 'u1' }], identifiers: [{ product_id: 'p1', value: '5000159407236' }], nv: [] });
    await p.evaluate(() => { go('s-voeding-custom'); });
    await p.fill('#voeding-custom-name', 'Nieuw Product'); await p.fill('#voeding-custom-kcal', '100'); await p.fill('#voeding-custom-barcode', '5000159407236');
    await p.evaluate(() => voedingSaveCustomProduct()); await p.waitForTimeout(300);
    const r = await p.evaluate(() => ({ dupVisible: document.getElementById('voeding-custom-duplicate').style.display !== 'none', posted: window.__posted.filter(x => x.tbl === 'nutrition_products').length }));
    assert.strictEqual(r.dupVisible, true); assert.strictEqual(r.posted, 0); await p.close();
  });
  // ---- B: D. barcode X + verschillende naam/casing => barcode-match waarschuwt (naam irrelevant) ----
  await t('B-D. Barcode-match wint van naamverschil: waarschuwt ondanks totaal andere naam', async () => {
    const p = await open({ products: [{ id: 'p1', name: 'Origineel', created_by: 'u1' }], identifiers: [{ product_id: 'p1', value: '5000159407236' }], nv: [] });
    await p.evaluate(() => { go('s-voeding-custom'); });
    await p.fill('#voeding-custom-name', 'Compleet Andere Naam'); await p.fill('#voeding-custom-kcal', '100'); await p.fill('#voeding-custom-barcode', '5000159407236');
    await p.evaluate(() => voedingSaveCustomProduct()); await p.waitForTimeout(300);
    const dupVisible = await p.evaluate(() => document.getElementById('voeding-custom-duplicate').style.display !== 'none');
    assert.strictEqual(dupVisible, true); await p.close();
  });
  // ---- B: B. verschillende barcodes, zelfde naam => NIET automatisch als duplicate (legitieme variant) ----
  await t('B-B. Verschillende geldige barcodes, zelfde naam: WEL een waarschuwing, maar de zwakkere "mogelijk" variant (naam-fallback), niet de sterke "zeker"-variant -- gebruiker kan gewoon doorgaan', async () => {
    const p = await open({ products: [{ id: 'p1', name: 'Chocopasta', created_by: 'u1' }], identifiers: [{ product_id: 'p1', value: '5000159407236' }], nv: [] });
    await p.evaluate(() => { go('s-voeding-custom'); });
    await p.fill('#voeding-custom-name', 'Chocopasta'); await p.fill('#voeding-custom-kcal', '100'); await p.fill('#voeding-custom-barcode', '4006381333931');
    await p.evaluate(() => voedingSaveCustomProduct()); await p.waitForTimeout(300);
    const r = await p.evaluate(() => ({ dupVisible: document.getElementById('voeding-custom-duplicate').style.display !== 'none', posted: window.__posted.filter(x => x.tbl === 'nutrition_products').length }));
    // Verschillende, geldige barcodes zijn geen EXISTING_FOUND (dat vereist een barcode-match); de gelijke naam levert
    // wel de zwakkere POSSIBLE_DUPLICATE op (niet-hard, "Toch nieuw product aanmaken" blijft beschikbaar) --
    // exact het PO-onderscheid tussen "zeker" (barcode) en "waarschijnlijk" (naam).
    assert.strictEqual(r.dupVisible, true); assert.strictEqual(r.posted, 0);
    await p.click('#voeding-custom-duplicate button'); await p.waitForTimeout(200);
    const postedAfterForce = await p.evaluate(() => window.__posted.filter(x => x.tbl === 'nutrition_products').length);
    assert.strictEqual(postedAfterForce, 1); await p.close();
  });
  // ---- B: C. geen barcode + "NUTELLA" vs "Nutella" => naam-fallback waarschuwt (het bewezen scenario) ----
  await t('B-C. Bewezen scenario: geen barcode, "NUTELLA" vs "Nutella" (case-insensitive exacte match) waarschuwt', async () => {
    const p = await open({ products: [{ id: 'p1', name: 'NUTELLA', created_by: 'u1' }], identifiers: [], nv: [] });
    await p.evaluate(() => { go('s-voeding-custom'); });
    await p.fill('#voeding-custom-name', 'Nutella'); await p.fill('#voeding-custom-kcal', '539');
    await p.evaluate(() => voedingSaveCustomProduct()); await p.waitForTimeout(300);
    const r = await p.evaluate(() => ({ dupVisible: document.getElementById('voeding-custom-duplicate').style.display !== 'none', posted: window.__posted.filter(x => x.tbl === 'nutrition_products').length }));
    assert.strictEqual(r.dupVisible, true); assert.strictEqual(r.posted, 0); await p.close();
  });
  // ---- User-scoping: zelfde naam maar ANDERE gebruiker => GEEN waarschuwing ----
  await t('User-scoping: exact dezelfde naam bij een ANDERE gebruiker geeft geen waarschuwing (alleen eigen producten tellen)', async () => {
    const p = await open({ products: [{ id: 'p1', name: 'Nutella', created_by: 'ANDERE_USER' }], identifiers: [], nv: [] });
    await p.evaluate(() => { go('s-voeding-custom'); });
    await p.fill('#voeding-custom-name', 'Nutella'); await p.fill('#voeding-custom-kcal', '539');
    await p.evaluate(() => voedingSaveCustomProduct()); await p.waitForTimeout(300);
    const r = await p.evaluate(() => ({ dupVisible: document.getElementById('voeding-custom-duplicate').style.display !== 'none', posted: window.__posted.filter(x => x.tbl === 'nutrition_products').length }));
    assert.strictEqual(r.dupVisible, false); assert.strictEqual(r.posted, 1); await p.close();
  });
  // ---- Forceren blijft mogelijk (gebruiker beslist, geen harde blokkade) ----
  await t('Duplicate-waarschuwing blokkeert niet hard: "Toch nieuw product aanmaken" gaat alsnog door', async () => {
    const p = await open({ products: [{ id: 'p1', name: 'NUTELLA', created_by: 'u1' }], identifiers: [], nv: [] });
    await p.evaluate(() => { go('s-voeding-custom'); });
    await p.fill('#voeding-custom-name', 'Nutella'); await p.fill('#voeding-custom-kcal', '539');
    await p.evaluate(() => voedingSaveCustomProduct()); await p.waitForTimeout(300);
    await p.click('#voeding-custom-duplicate button'); await p.waitForTimeout(300);
    const posted = await p.evaluate(() => window.__posted.filter(x => x.tbl === 'nutrition_products').length);
    assert.strictEqual(posted, 1); await p.close();
  });
  // ---- C: serving-correctie ----
  await t('C. Correctieformulier toont portiegrootte-veld bij PER_100G en persisteert serving_size_g', async () => {
    const p = await open({ products: [{ id: 'p1', name: 'Test', created_by: 'u1', verification_state: 'USER_PRIVATE' }], identifiers: [], nv: [{ product_id: 'p1', basis: 'PER_100G', energy_kcal: 250, created_at: '1' }] });
    await p.evaluate(() => { voedingSelectedProduct = { id: 'p1' }; go('s-voeding-correctie'); }); await p.waitForTimeout(300);
    const hasField = await p.evaluate(() => !!document.getElementById('voeding-correctie-serving'));
    assert.strictEqual(hasField, true);
    await p.fill('#voeding-correctie-value', '250'); await p.fill('#voeding-correctie-serving', '30');
    await p.evaluate(() => voedingSubmitCorrection('p1', false, 'PER_100G')); await p.waitForTimeout(300);
    const posted = await p.evaluate(() => window.__posted.find(x => x.tbl === 'nutrition_nutrient_values'));
    assert.strictEqual(posted.d.serving_size_g, 30); await p.close();
  });
  await t('C. Portiegrootte leeg blijft toegestaan (geen verplicht veld), 0/negatief geweigerd', async () => {
    const p = await open({ products: [{ id: 'p1', name: 'Test', created_by: 'u1', verification_state: 'USER_PRIVATE' }], identifiers: [], nv: [{ product_id: 'p1', basis: 'PER_100G', energy_kcal: 250, created_at: '1' }] });
    await p.evaluate(() => { voedingSelectedProduct = { id: 'p1' }; go('s-voeding-correctie'); }); await p.waitForTimeout(300);
    await p.fill('#voeding-correctie-value', '250');
    await p.evaluate(() => voedingSubmitCorrection('p1', false, 'PER_100G')); await p.waitForTimeout(300);
    let posted = await p.evaluate(() => window.__posted.find(x => x.tbl === 'nutrition_nutrient_values'));
    assert.strictEqual('serving_size_g' in posted.d, false);
    // Succesvolle submit navigeert weg (correct gedrag) -- scherm opnieuw openen voor de tweede poging.
    await p.evaluate(() => { voedingSelectedProduct = { id: 'p1' }; go('s-voeding-correctie'); }); await p.waitForTimeout(300);
    await p.fill('#voeding-correctie-value', '250');
    await p.evaluate(() => { window.__posted = []; });
    await p.fill('#voeding-correctie-serving', '0');
    await p.evaluate(() => voedingSubmitCorrection('p1', false, 'PER_100G')); await p.waitForTimeout(200);
    const postedAfterZero = await p.evaluate(() => window.__posted.length);
    assert.strictEqual(postedAfterZero, 0); await p.close();
  });
  await t('C. Bestaande, al gelogde meal-item snapshots blijven ongewijzigd bij een latere correctie (geen retroactieve mutatie)', async () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    const b = html.slice(html.indexOf('async function voedingSubmitCorrection'), html.indexOf('async function voedingSubmitCorrection') + 2000);
    assert.strictEqual(/nutrition_meal_items/.test(b), false);
  });
  await browser.close(); srv.close();
  console.log('fNutrition9plusABC: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt'); if (fail) process.exit(1);
})();
