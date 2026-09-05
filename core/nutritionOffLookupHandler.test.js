'use strict';
const assert = require('assert');

let pass = 0, fail = 0;
async function t(label, fn) {
  try { await fn(); pass++; }
  catch (e) { fail++; console.log('MISLUKT:', label, '-', e.message); }
}

const NUTELLA_OFF_RESPONSE = {
  code: '3017624010701', status: 1, status_verbose: 'product found',
  product: {
    rev: 105, product_name: 'Nutella', brands: 'Ferrero', allergens_tags: ['en:nuts'],
    nutrition_data_per: '100g', completeness: 0.7625,
    nutriments: {
      'energy-kcal_100g': 539, proteins_100g: 6.3, carbohydrates_100g: 57.5,
      fat_100g: 30.9, sugars_100g: 56.3, 'saturated-fat_100g': 10.6, sodium_100g: 0.043
    }
  }
};

function mockFetchSequence(responses) {
  let i = 0;
  return async function mockedFetch(url, options) {
    const r = responses[Math.min(i, responses.length - 1)];
    i++;
    if (r.throw) throw r.throw;
    return { ok: r.ok !== false, status: r.status || 200, json: async () => r.body };
  };
}

async function callHandler(event) {
  // Verse require per test, zodat elke test zijn eigen fetch-mock isoleert.
  delete require.cache[require.resolve('../netlify/functions/nutrition-off-lookup.js')];
  const { handler } = require('../netlify/functions/nutrition-off-lookup.js');
  return handler(event);
}

(async () => {
  await t('handler: 405 bij niet-POST', async () => {
    global.fetch = mockFetchSequence([{ body: {} }]);
    const res = await callHandler({ httpMethod: 'GET', headers: {} });
    assert.strictEqual(res.statusCode, 405);
  });

  await t('handler: 401 zonder Authorization-header (auth-conventie ongewijzigd)', async () => {
    global.fetch = mockFetchSequence([{ body: {} }]);
    const res = await callHandler({ httpMethod: 'POST', headers: {}, body: '{}' });
    assert.strictEqual(res.statusCode, 401);
  });

  await t('handler: 401 bij ongeldige sessie (auth/v1/user retourneert niet-ok)', async () => {
    global.fetch = mockFetchSequence([{ ok: false, status: 401, body: {} }]);
    const res = await callHandler({ httpMethod: 'POST', headers: { authorization: 'Bearer x' }, body: JSON.stringify({ barcode: '3017624010701' }) });
    assert.strictEqual(res.statusCode, 401);
  });

  await t('handler: 400 zonder barcode', async () => {
    global.fetch = mockFetchSequence([{ body: { id: 'u1' } }]);
    const res = await callHandler({ httpMethod: 'POST', headers: { authorization: 'Bearer x' }, body: JSON.stringify({}) });
    assert.strictEqual(res.statusCode, 400);
  });

  await t('handler: INVALID_IDENTIFIER bij foute checksum, GEEN provider-aanroep (KERN, adversarial)', async () => {
    let providerCalled = false;
    global.fetch = async (url) => {
      if (url.includes('openfoodfacts')) providerCalled = true;
      return { ok: true, status: 200, json: async () => ({ id: 'u1' }) };
    };
    const res = await callHandler({ httpMethod: 'POST', headers: { authorization: 'Bearer x' }, body: JSON.stringify({ barcode: '4006381333932' }) }); // foute checksum
    const body = JSON.parse(res.body);
    assert.strictEqual(body.status, 'INVALID_IDENTIFIER');
    assert.strictEqual(providerCalled, false);
  });

  await t('handler: FOUND_PROVIDER met correcte, genormaliseerde candidate (echte Nutella-fixture door de volledige handler)', async () => {
    global.fetch = mockFetchSequence([
      { body: { id: 'u1' } }, // auth
      { body: NUTELLA_OFF_RESPONSE } // OFF
    ]);
    const res = await callHandler({ httpMethod: 'POST', headers: { authorization: 'Bearer x' }, body: JSON.stringify({ barcode: '3017624010701' }) });
    const body = JSON.parse(res.body);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(body.status, 'FOUND_PROVIDER');
    assert.strictEqual(body.candidate.name, 'Nutella');
    assert.strictEqual(body.candidate.nutrients.energy_kcal, 539);
    assert.notStrictEqual(body.data_quality, 'VERIFIED'); // nooit automatisch VERIFIED
  });

  await t('handler: status:0 (NOT_FOUND) wordt correct als NOT_FOUND behandeld, niet als succes (KERN)', async () => {
    global.fetch = mockFetchSequence([
      { body: { id: 'u1' } },
      { body: { code: '00000000', status: 0, status_verbose: 'no code or invalid code' } }
    ]);
    const res = await callHandler({ httpMethod: 'POST', headers: { authorization: 'Bearer x' }, body: JSON.stringify({ barcode: '00000000' }) });
    const body = JSON.parse(res.body);
    assert.strictEqual(body.status, 'NOT_FOUND');
  });

  await t('handler: leeg product-object bij status=1 geeft INCOMPLETE_PRODUCT, niet FOUND (adversarial, bevestigd extern randgeval)', async () => {
    global.fetch = mockFetchSequence([
      { body: { id: 'u1' } },
      { body: { code: '3017624010701', status: 1, product: {} } }
    ]);
    const res = await callHandler({ httpMethod: 'POST', headers: { authorization: 'Bearer x' }, body: JSON.stringify({ barcode: '3017624010701' }) });
    const body = JSON.parse(res.body);
    assert.strictEqual(body.status, 'INCOMPLETE_PRODUCT');
  });

  await t('handler: provider HTTP-fout (niet-ok) geeft SOURCE_UNAVAILABLE, geen crash', async () => {
    global.fetch = mockFetchSequence([
      { body: { id: 'u1' } },
      { ok: false, status: 500, body: {} }
    ]);
    const res = await callHandler({ httpMethod: 'POST', headers: { authorization: 'Bearer x' }, body: JSON.stringify({ barcode: '3017624010701' }) });
    const body = JSON.parse(res.body);
    assert.strictEqual(body.status, 'SOURCE_UNAVAILABLE');
  });

  await t('handler: provider network-exception (geen AbortError) geeft SOURCE_UNAVAILABLE', async () => {
    let call = 0;
    global.fetch = async () => {
      call++;
      if (call === 1) return { ok: true, status: 200, json: async () => ({ id: 'u1' }) };
      throw new Error('network down');
    };
    const res = await callHandler({ httpMethod: 'POST', headers: { authorization: 'Bearer x' }, body: JSON.stringify({ barcode: '3017624010701' }) });
    const body = JSON.parse(res.body);
    assert.strictEqual(body.status, 'SOURCE_UNAVAILABLE');
  });

  await t('handler: AbortError (timeout) geeft expliciet TIMEOUT, apart van SOURCE_UNAVAILABLE', async () => {
    let call = 0;
    global.fetch = async () => {
      call++;
      if (call === 1) return { ok: true, status: 200, json: async () => ({ id: 'u1' }) };
      const err = new Error('aborted'); err.name = 'AbortError'; throw err;
    };
    const res = await callHandler({ httpMethod: 'POST', headers: { authorization: 'Bearer x' }, body: JSON.stringify({ barcode: '3017624010701' }) });
    const body = JSON.parse(res.body);
    assert.strictEqual(body.status, 'TIMEOUT');
  });

  console.log(`nutrition-off-lookup handler: ${pass} geslaagd, ${fail} mislukt`);
  console.log(`Resultaat: ${pass} geslaagd, ${fail} mislukt`);
  if (fail > 0) process.exit(1);
})();
