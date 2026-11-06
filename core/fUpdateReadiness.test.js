/* core/fUpdateReadiness.test.js — DEV-UPDATE-01
 *
 * Een Android-testbuild met een andere ondertekening kan alleen na verwijderen worden geïnstalleerd
 * (ADR-ANDROID-SIGNING-001), en allowBackup=false wist dan alle lokale data. "Klaar voor een update?"
 * (Help) zegt pas "veilig" als er niets lokaal staat dat de server nog niet heeft.
 *  A. Bron: leest alleen bestaande bronnen, schrijft niets, faalt dicht.
 *  B. (Chromium, anders SKIP) echte app: leeg = veilig; wachtrij, concept, lopende training,
 *     onbevestigde training of een onleesbare wachtrij = niet veilig; niets wordt verwijderd.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/\r\n/g, '\n');

let pass = 0, fail = 0;
const msgs = [];
function ok(c, l) { if (c) pass++; else { fail++; msgs.push('MISLUKT: ' + l); } }
function eq(a, b, l) { ok(JSON.stringify(a) === JSON.stringify(b), l + ' (kreeg ' + JSON.stringify(a) + ', verwacht ' + JSON.stringify(b) + ')'); }
function extractFn(src, name) {
  const m = new RegExp('(?:async\\s+)?function\\s+' + name + '\\s*\\(').exec(src);
  if (!m) throw new Error('functie niet gevonden in index.html: ' + name);
  let i = src.indexOf('{', m.index), d = 0;
  for (; i < src.length; i++) { if (src[i] === '{') d++; else if (src[i] === '}') { d--; if (!d) return src.slice(m.index, i + 1); } }
  throw new Error('functie niet afgesloten: ' + name);
}

/* A */
const g = extractFn(HTML, 'tkUpdateGereedheid'), s = extractFn(HTML, 'tkLeesWachtrijStrikt');
ok(/id="help-update-card"/.test(HTML) && /onclick="tkUpdateGereedheidToon\(true\)"/.test(HTML), 'A1 de kaart staat op Help, met controleren en synchroniseren');
ok(!/offlineQueueAll/.test(g) && /tkLeesWachtrijStrikt\(\)/.test(g) && /'readonly'/.test(s) && /reject\(req\.error\|\|/.test(s) && /tx\.oncomplete=\(\)=>resolve\(rows\|\|\[\]\)/.test(s) && /tx\.onabort=\(\)=>reject\(/.test(s), 'A2 de wachtrij wordt strikt gelezen: een leesfout is geen lege wachtrij');
ok(/veilig:!open\.length&&!onbekend\.length/.test(g), 'A3 alleen veilig zonder open punten én zonder onbekende bronnen (fail-closed)');
ok(!/setItem|removeItem|offlineQueueRemove|sbPost|sbPatch|sbDel|clearTrainingDraft/.test(g), 'A4 de controle schrijft en verwijdert niets');
["localStorage.getItem('tk_draft_training')", 'draftHasData(draft)', "localStorage.getItem('tk_gw_active')", 'GW.hasUnsaved()', 'TK_TRAININGEN_ONBEVESTIGD'].forEach(function (b) { ok(g.indexOf(b) >= 0, 'A5 bestaande bron gebruikt: ' + b); });
ok(/await flushOfflineQueue\(\)/.test(extractFn(HTML, 'tkUpdateGereedheidToon')), 'A6 synchroniseren hergebruikt de bestaande flush');

let chromium;
try { chromium = require('playwright').chromium; } catch (e) { chromium = null; }

(async function () {
  try {
    // Race-test: een succesvol getAll()-request mag nooit als geslaagd tellen
    // wanneer de READONLY-transactie daarna alsnog wordt afgebroken.
    {
      const vm = require('vm');
      const req = {result:[],error:null};
      const tx = {objectStore:()=>({getAll:()=>req}),error:null};
      const sandbox={offlineDb:async()=>({transaction:()=>tx}),OFFLINE_STORE:'queue'};
      vm.createContext(sandbox); vm.runInContext(s, sandbox);
      const promise=sandbox.tkLeesWachtrijStrikt();
      await new Promise(resolve=>setImmediate(resolve));
      ok(typeof req.onsuccess==='function', 'A7 setup: IDB onSuccess-handler geïnstalleerd');
      req.onsuccess();
      tx.onabort();
      let rejected=false;
      try{await promise;}catch(_){rejected=true;}
      ok(rejected, 'A7 getAll-onSuccess gevolgd door transactie-abort is nooit veilig');
    }
    let browser = null;
    if (chromium) { try { browser = await chromium.launch(); } catch (e) { browser = null; } }
    if (!browser) { console.log('fUpdateReadiness: deel B SKIP (Chromium niet beschikbaar in deze omgeving)'); }
    else {
      const page = await browser.newPage({ viewport: { width: 360, height: 900 } });
      const errs = []; page.on('pageerror', function (e) { errs.push(e.message); });
      // Externe media mogen browseracceptatie niet blokkeren: JS/DOM zijn bij DOMContentLoaded gereed.
      await page.goto('file://' + path.join(ROOT, 'index.html'), {waitUntil:'domcontentloaded', timeout:30000}); await page.waitForTimeout(500);
      const r = await page.evaluate(async function () {
        window.sbGet = async function () { return []; };
        window.flushOfflineQueue = async function () {};
        const leeg = async function () { const db = await offlineDb(); await new Promise(function (ok) { const tx = db.transaction(OFFLINE_STORE, 'readwrite'); tx.objectStore(OFFLINE_STORE).clear(); tx.oncomplete = ok; }); };
        const uit = {};
        await leeg(); localStorage.removeItem('tk_draft_training'); localStorage.removeItem(TK_TRAININGEN_ONBEVESTIGD); curT = null;
        go('s-help');
        localStorage.removeItem('tk_gw_active');
        uit.schoon = await tkUpdateGereedheidToon(false); uit.schoonTekst = document.getElementById('help-update-body').textContent;
        await offlineQueueAdd({ table: 'sessions', method: 'POST', body: { id: 'x' } });
        uit.wachtrij = await tkUpdateGereedheid(); uit.wachtrijTekst = (await tkUpdateGereedheidToon(false), document.getElementById('help-update-body').textContent);
        uit.nogInWachtrij = (await offlineQueueAll()).length;
        await leeg();
        localStorage.setItem('tk_draft_training', JSON.stringify({ t: 'A', ts: Date.now(), sessionLog: { bs: { sets: [{ kg: '80', reps: '5' }] } }, sessionExtra: [] }));
        uit.concept = await tkUpdateGereedheid(); localStorage.removeItem('tk_draft_training');
        curT = 'A'; uit.lopend = await tkUpdateGereedheid(); curT = null;
        localStorage.setItem(TK_TRAININGEN_ONBEVESTIGD, JSON.stringify(['wb-1'])); uit.onbevestigd = await tkUpdateGereedheid(); localStorage.removeItem(TK_TRAININGEN_ONBEVESTIGD);
        const echt = indexedDB.open.bind(indexedDB); indexedDB.open = function () { throw new Error('stuk'); };
        uit.stuk = await tkUpdateGereedheid(); uit.stukTekst = (await tkUpdateGereedheidToon(false), document.getElementById('help-update-body').textContent);
        indexedDB.open = echt;
        localStorage.setItem('tk_draft_training', '{"t":"A","sessionLog":{"sq":');
        uit.corruptConcept = await tkUpdateGereedheid();
        localStorage.removeItem('tk_draft_training');
        localStorage.setItem(TK_TRAININGEN_ONBEVESTIGD, '{"id":"wb-1"}');
        uit.wrongPending = await tkUpdateGereedheid();
        localStorage.removeItem(TK_TRAININGEN_ONBEVESTIGD);
        localStorage.setItem('tk_gw_active', JSON.stringify({phase:'exercise',items:[{id:'squat'}]}));
        uit.guidedActive = await tkUpdateGereedheid();
        localStorage.setItem('tk_gw_active', '{bad-guided');
        uit.corruptGuided = await tkUpdateGereedheid();
        localStorage.removeItem('tk_gw_active');
        localStorage.setItem('tk_draft_training', JSON.stringify({t:'A',sessionLog:{},sessionExtra:[]}));
        uit.emptyDraft = await tkUpdateGereedheid();
        localStorage.removeItem('tk_draft_training');
        return uit;
      });
      ok(r.schoon.veilig && /Geen lokale blokkades gevonden/.test(r.schoonTekst) && /geen toestemming/.test(r.schoonTekst) && !/Alles staat op de server/.test(r.schoonTekst), 'B1 niets lokaal: geen claims over serverbevestiging of de-installatie');
      ok(!r.wachtrij.veilig && /1 wijziging wacht nog op de server/.test(r.wachtrijTekst) && /Nog niet verwijderen/.test(r.wachtrijTekst), 'B2 één wachtrij-item: niet veilig, met reden');
      eq(r.nogInWachtrij, 1, 'B3 de controle verwijdert niets uit de wachtrij');
      ok(!r.concept.veilig && /niet-afgeronde training/.test(r.concept.open.join(' ')), 'B4 niet-afgeronde training: niet veilig');
      ok(!r.lopend.veilig && /loopt nu een training/.test(r.lopend.open.join(' ')), 'B5 lopende training: niet veilig');
      ok(!r.onbevestigd.veilig && /eigen training is nog niet door de server bevestigd/.test(r.onbevestigd.open.join(' ')), 'B6 onbevestigde eigen training: niet veilig');
      ok(!r.stuk.veilig && /Onbekend: de offline-wachtrij kon niet worden gelezen/.test(r.stukTekst), 'B7 wachtrij onleesbaar: niet veilig (fail-closed), nooit "veilig"');
      ok(!r.corruptConcept.veilig && r.corruptConcept.onbekend.some(s=>/trainingsconcept/.test(s)), 'B9 corrupt trainingsconcept geeft blokkade');
      ok(!r.wrongPending.veilig && r.wrongPending.onbekend.some(s=>/eigen trainingen/.test(s)), 'B10 niet-array pending geeft blokkade');
      ok(!r.guidedActive.veilig && r.guidedActive.open.some(s=>/begeleide training/.test(s)), 'B11 actieve maar niet-afgeronde Guided-sessie blokkeert de-installatie');
      ok(!r.corruptGuided.veilig && r.corruptGuided.onbekend.some(s=>/begeleide training/.test(s)), 'B12 corrupt Guided-concept blokkeert de-installatie');
      ok(!r.emptyDraft.veilig && r.emptyDraft.open.some(s=>/lokaal trainingsconcept/.test(s)), 'B13 concept zonder sets is niet serverbevestigd');
      ok(errs.length === 0, 'B8 geen JavaScript-fouten: ' + errs.join(' | '));
      await browser.close();
    }
  } catch (e) { fail++; msgs.push('onverwachte fout: ' + (e && e.stack || e)); }
  console.log('fUpdateReadiness: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  if (msgs.length) console.log(msgs.join('\n'));
  console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail > 0 ? 1 : 0);
})();
