'use strict';
/* core/fVoedingConceptBQuantityPreview.test.js -- gedragstests (Playwright) voor
 * Concept B UX-03: Hoeveelheid kiezen + live portie-preview via de Portion Engine.
 * Verwachte waarden komen uit NutritionFoundation2Core.portionToNutrients (node),
 * de UI wordt getoetst tegen diezelfde engine -- nooit tegen een eigen rekensom. */
const assert = require('assert'); const path = require('path'); const fs = require('fs'); const http = require('http');
const Engine = require('./nutritionFoundation2.js');
let pass = 0, fail = 0;
async function t(l, fn) { try { await fn(); pass++; } catch (e) { fail++; console.log('MISLUKT:', l, '-', e.message); } }
const NV_FULL = { basis: 'PER_100G', energy_kcal: 63, protein_g: 11, carbohydrate_g: 4, fat_g: 0.2 };
const NV_PART = { basis: 'PER_100G', energy_kcal: 63, protein_g: 11, carbohydrate_g: null, fat_g: null };
const NV_KCAL = { basis: 'PER_100G', energy_kcal: 63, protein_g: null, carbohydrate_g: null, fat_g: null };
const NV_NONE = { basis: 'PER_100G', energy_kcal: null, protein_g: null, carbohydrate_g: null, fat_g: null };
function nl(v, u) { return v == null ? '—' : v.toLocaleString('nl-NL', { maximumFractionDigits: 1 }) + ' ' + u; }
(async () => {
  let chromium; try { chromium = require('playwright').chromium; } catch (e) { console.log('Resultaat: 0 geslaagd, 0 mislukt (skipped: playwright ontbreekt)'); return; }
  const root = path.join(__dirname, '..', 'www'); if (!fs.existsSync(path.join(root, 'index.html'))) { console.log('Resultaat: 0 geslaagd, 0 mislukt (skipped: www/ niet gebouwd)'); return; }
  const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0]) === '/' ? 'index.html' : decodeURIComponent(q.url.split('?')[0])); fs.readFile(f, (e, b) => { if (e) { r.statusCode = 404; return r.end(); } r.end(b); }); }).listen(0);
  const url = 'http://127.0.0.1:' + srv.address().port + '/index.html';
  const browser = await chromium.launch();
  async function open(w, nv, meal, extra) {
    const p = await browser.newPage({ viewport: { width: w || 390, height: 844 } }); const dialogs = []; p.on('dialog', d => { dialogs.push(d.message()); d.dismiss(); }); p.__dialogs = dialogs;
    await p.goto(url); await p.waitForTimeout(300);
    await p.evaluate(({ nv, meal, extra }) => { authSession = { user: { id: 'u1' } }; window.__posted = []; sbGet = async () => []; sbPostQ = async (t, d) => { window.__posted.push({ t, d }); return {}; };
      voedingCurrentMealTypeForAdd = meal || null; voedingSelectedProduct = Object.assign({ id: 'p1', name: 'Skyr naturel', brand: 'Arla', nutrientRow: nv }, extra || {}); go('s-voeding-hoeveelheid'); }, { nv, meal, extra });
    await p.waitForTimeout(350); return p;
  }
  const preview = p => p.evaluate(() => document.getElementById('voeding-portion-preview').textContent);
  const setQty = async (p, v, u) => { await p.evaluate(({ v, u }) => { const i = document.getElementById('voeding-qty-input'); i.value = v; if (u) document.getElementById('voeding-qty-unit').value = u; i.dispatchEvent(new Event('input')); }, { v, u }); await p.waitForTimeout(80); };

  await t('1-2. Quantity opent met canonical product (naam+merk) en bestaande default 100 blijft', async () => {
    const p = await open(390, NV_FULL); const r = await p.evaluate(() => ({ body: document.getElementById('voeding-portion-body').textContent, qty: document.getElementById('voeding-qty-input').value, unit: document.getElementById('voeding-qty-unit').value }));
    assert.strictEqual(r.body.includes('Skyr naturel') && r.body.includes('Arla'), true); assert.strictEqual(r.qty, '100'); assert.strictEqual(r.unit, 'g'); await p.close();
  });
  for (const q of [25, 50, 100]) await t(`3-6. ${q} g: preview == Portion Engine-output (geen eigen rekensom als waarheid)`, async () => {
    const p = await open(390, NV_FULL); await setQty(p, String(q)); const txt = await preview(p); const e = Engine.portionToNutrients(NV_FULL, q, 'g');
    assert.strictEqual(txt.includes('Dit voegt toe'), true); for (const [f, u] of [['energy_kcal', 'kcal'], ['protein_g', 'g'], ['carbohydrate_g', 'g'], ['fat_g', 'g']]) assert.strictEqual(txt.includes(nl(e[f], u)), true, f + '=' + nl(e[f], u) + ' in "' + txt + '"'); await p.close();
  });
  await t('7. preset 25 g zet quantity+unit en werkt de preview bij', async () => {
    const p = await open(390, NV_FULL); await p.click('#voeding-portion-body button:has-text("25 g")'); await p.waitForTimeout(80);
    const r = await p.evaluate(() => ({ q: document.getElementById('voeding-qty-input').value, u: document.getElementById('voeding-qty-unit').value })); assert.deepStrictEqual(r, { q: '25', u: 'g' }); assert.strictEqual((await preview(p)).includes(nl(Engine.portionToNutrients(NV_FULL, 25, 'g').energy_kcal, 'kcal')), true); await p.close();
  });
  await t('8. handmatige invoer werkt preview bij; 15. decimaal (12,5 en 12.5) beide == engine', async () => {
    const p = await open(390, NV_FULL); const e = Engine.portionToNutrients(NV_FULL, 12.5, 'g');
    await setQty(p, '12.5'); assert.strictEqual((await preview(p)).includes(nl(e.energy_kcal, 'kcal')), true);
    // type=number kan '12,5' niet bevatten (browser/locale-toetsenbord zet komma om); de UI-parser is defensief: bewijs via directe aanroep.
    const viaComma = await p.evaluate(() => { const i = document.getElementById('voeding-qty-input'); i.type = 'text'; i.value = '12,5'; voedingUpdatePortionPreview(); const t = document.getElementById('voeding-portion-preview').textContent; i.type = 'number'; return t; });
    assert.strictEqual(viaComma.includes(nl(e.energy_kcal, 'kcal')), true); await p.close();
  });
  await t('9-10. partial: bekende velden getoond, UNKNOWN als "—" (nooit "0 g"), met legenda', async () => {
    const p = await open(390, NV_PART); await setQty(p, '25'); const txt = await preview(p); const e = Engine.portionToNutrients(NV_PART, 25, 'g');
    assert.strictEqual(txt.includes(nl(e.energy_kcal, 'kcal')) && txt.includes(nl(e.protein_g, 'g')), true); assert.strictEqual(/Koolhydraten\s*—/.test(txt) && /Vet\s*—/.test(txt), true); assert.strictEqual(/0 g/.test(txt), false); assert.strictEqual(txt.includes('niet bekend'), true); await p.close();
  });
  await t('11. alleen kcal bekend en alles UNKNOWN: eerlijk, geen 0, CTA blijft', async () => {
    let p = await open(390, NV_KCAL); let txt = await preview(p); assert.strictEqual(/Eiwit\s*—/.test(txt) && !/0 g/.test(txt), true); await p.close();
    p = await open(390, NV_NONE); txt = await preview(p); assert.strictEqual(txt.includes('niet beschikbaar'), true); assert.strictEqual(/0 kcal|0 g/.test(txt), false); assert.strictEqual(await p.evaluate(() => !!document.querySelector('#voeding-portion-body .tk-btn-primary')), true); await p.close();
  });
  await t('12-14. invalid / 0 / negatief / leeg: geen engine-output, eerlijke melding, geen crash', async () => {
    const p = await open(390, NV_FULL); for (const v of ['abc', '0', '-5', '', '  ']) { await setQty(p, v); const txt = await preview(p); assert.strictEqual(txt.includes('Vul een geldige hoeveelheid in'), true, 'v=' + JSON.stringify(v)); assert.strictEqual(/kcal/.test(txt), false); } assert.deepStrictEqual(p.__dialogs, []); await p.close();
  });
  await t('14b. NUT-PORTION-01: unit "portie" bij PER_100G zonder serving_size_g wordt niet als bruikbare keuze aangeboden (capability-aware, geen schijnconversie)', async () => {
    const p = await open(390, NV_FULL); const hasServing = await p.evaluate(() => !!document.querySelector('#voeding-portion-body button.tk-btn-secondary') && [...document.querySelectorAll('#voeding-portion-body button')].some(b => b.textContent.includes('portie')));
    assert.strictEqual(hasServing, false); await p.close();
  });
  await t('16-17. meal context Lunch behouden; zonder context geen verzonnen keuze (eerste optie, geen "laatst gebruikt")', async () => {
    let p = await open(390, NV_FULL, 'lunch'); assert.strictEqual(await p.evaluate(() => document.getElementById('voeding-meal-select').value), 'lunch'); await p.close();
    p = await open(390, NV_FULL, null); assert.strictEqual(await p.evaluate(() => document.getElementById('voeding-meal-select').value), 'breakfast'); await p.close();
  });
  await t('18-19-21. submit: geen auto-submit; gelogde snapshot == preview-engine-uitkomst (zelfde functie, zelfde inputs)', async () => {
    const p = await open(390, NV_FULL, 'lunch'); await setQty(p, '25'); await p.waitForTimeout(100);
    assert.strictEqual(await p.evaluate(() => window.__posted.length), 0, 'geen auto-submit');
    await p.evaluate(async () => { sbGet = async (t) => t === 'nutrition_meals' ? [{ id: 'm1' }] : []; await voedingConfirmAddToMeal(); });
    const posted = await p.evaluate(() => window.__posted.find(x => x.t === 'nutrition_meal_items')); const e = Engine.portionToNutrients(NV_FULL, 25, 'g');
    assert.ok(posted, 'item gelogd'); assert.strictEqual(posted.d.quantity, 25); assert.strictEqual(posted.d.nutrient_snapshot.energy_kcal, e.energy_kcal); assert.strictEqual(posted.d.nutrient_snapshot.protein_g, e.protein_g); await p.close();
  });
  await t('20-22-23. geen shadow calc, geen doelen/advies/AI in UX-03-code', async () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8'); const b = html.slice(html.indexOf('/* == CONCEPT B / UX-03'), html.indexOf('async function voedingConfirmAddToMeal')).replace(/\r/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, ''); // commentaar uitgesloten
    assert.strictEqual(/(kcal|energy|protein|carb|fat)[a-z_]*\s*[*\/]\s*\d|\/\s*100|\*\s*(qty|quantity|grams)/i.test(b), false, 'geen nutrient-rekensom');
    assert.strictEqual(/doel|target|remaining|advies|gezond|optima|coach|anthropic/i.test(b), false);
    assert.strictEqual(b.includes('NutritionFoundation2Core.portionToNutrients(nv,qty,unit)'), true);
  });
  await t('24-26. geen dialogs; 320/360/390/412 geen overflow, CTA aanwezig, labels/aria', async () => {
    for (const w of [320, 360, 390, 412]) { const p = await open(w, NV_FULL, 'lunch', { name: 'Een heel erg lange productnaam die zeker niet op één regel past op een smal scherm' });
      const r = await p.evaluate(() => ({ ov: document.documentElement.scrollWidth > document.documentElement.clientWidth, cta: !!document.querySelector('#voeding-portion-body .tk-btn-primary'), lbl: !!document.querySelector('label[for="voeding-qty-input"]'), unitLbl: !!document.getElementById('voeding-qty-unit').getAttribute('aria-label'), live: document.getElementById('voeding-portion-preview').getAttribute('aria-live') }));
      assert.strictEqual(r.ov, false, 'overflow@' + w); assert.strictEqual(r.cta && r.lbl && r.unitLbl && r.live === 'polite', true); assert.deepStrictEqual(p.__dialogs, []); await p.close(); }
  });
  await browser.close(); srv.close();
  console.log(`fVoedingConceptBQuantityPreview: ${pass} geslaagd, ${fail} mislukt`); console.log(`Resultaat: ${pass} geslaagd, ${fail} mislukt`); if (fail) process.exit(1);
})();
