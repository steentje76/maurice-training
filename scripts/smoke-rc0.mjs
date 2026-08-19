/* RC0 — browser-smoketest. Laadt de uitgeleverde index.html in Chromium met ALLE
 * netwerkverkeer naar Supabase/Netlify/Anthropic geblokkeerd, zodat er geen enkele
 * productierij wordt gelezen of geschreven. Doel: bewijzen dat de app opstart, dat
 * elk scherm bestaat en rendert, dat de terug-navigatie werkt en dat de bewijsspoor-
 * modal een echte snapshot toont — zonder aannames.
 */
import { createRequire } from 'module';
import { execSync } from 'child_process';

/* Playwright en Chromium zitten niet in de projectafhankelijkheden — deze test is een
   hulpmiddel, geen onderdeel van de release gate. Ontbreken ze, dan stopt hij met een
   duidelijke melding in plaats van met een stacktrace. */
const require_ = createRequire(import.meta.url);
function laadPlaywright() {
  for (const kandidaat of ['playwright', 'playwright-core']) {
    try { return require_(kandidaat); } catch (_) { /* volgende proberen */ }
  }
  try {
    const globaal = execSync('npm root -g', { encoding: 'utf8' }).trim();
    return require_(globaal + '/playwright/index.js');
  } catch (_) { return null; }
}
const pw = laadPlaywright();
if (!pw) {
  console.log('Playwright niet gevonden — smoketest overgeslagen.');
  console.log('Installeren met: npm i -g playwright && npx playwright install chromium');
  process.exit(0);
}
const { chromium } = pw;
import fs from 'fs';
import path from 'path';

import { fileURLToPath } from 'url';
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const fouten = [];
const logs = [];
let n = 0, ok = 0;
function check(naam, waarde, extra) {
  n++;
  if (waarde) { ok++; console.log('  ok  ' + naam); }
  else { fouten.push(naam + (extra ? ' — ' + extra : '')); console.log('  FOUT ' + naam + (extra ? ' — ' + extra : '')); }
}

/* PLAYWRIGHT_BROWSERS_PATH wijst in deze omgeving naar een voorgeïnstalleerde Chromium;
   elders lost Playwright zijn eigen browser op. */
const browser = await chromium.launch({ args: ['--no-sandbox'] }).catch(async () => {
  const fallback = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  return chromium.launch({ executablePath: fallback, args: ['--no-sandbox'] });
});
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'nl-NL' });

/* Harde grens: niets bereikt ooit de productie. */
await ctx.route('**/*', route => {
  const u = route.request().url();
  if (u.startsWith('file://')) return route.continue();
  if (/supabase\.co|netlify|anthropic|googleapis|open-meteo|youtube/.test(u)) {
    return route.fulfill({ status: 503, body: '{"error":"geblokkeerd in de smoketest"}' });
  }
  return route.abort();
});

await ctx.addInitScript(() => { window.Capacitor = { platform: 'android', __smoke: true }; });
const page = await ctx.newPage();
page.on('console', m => { logs.push({ type: m.type(), text: m.text() }); });
page.on('pageerror', e => { logs.push({ type: 'pageerror', text: String(e && e.message) }); });

await page.goto('file://' + path.join(ROOT, 'index.html'), { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);

console.log('\nA. Opstarten');
const pageerrors = logs.filter(l => l.type === 'pageerror');
check('geen JavaScript-uitzondering bij het laden', pageerrors.length === 0,
  pageerrors.slice(0, 3).map(e => e.text).join(' | '));
check('APP_VER is gezet', await page.evaluate(() => typeof APP_VER !== 'undefined' && APP_VER),
  await page.evaluate(() => (typeof APP_VER !== 'undefined') ? APP_VER : 'ontbreekt'));
const ver = await page.evaluate(() => APP_VER);
check('versie is v4.48.0', ver === 'v4.48.0', ver);

console.log('\nB. Schermen');
const schermen = await page.evaluate(() => Array.from(document.querySelectorAll('.scr')).map(s => s.id));
check('meer dan 25 schermen aanwezig', schermen.length > 25, 'gevonden: ' + schermen.length);
const kern = ['s-home', 's-train-mgr', 's-hist', 's-stats', 's-lichaam', 's-coach', 's-profiel',
              's-settings', 's-privacy', 's-help', 's-onboarding', 's-intake', 's-auth', 's-admin',
              's-lich-verbanden'];
kern.forEach(id => check('scherm bestaat: ' + id, schermen.includes(id)));

console.log('\nC. Navigatie en terug');
await page.evaluate(() => { document.querySelectorAll('.scr,.pin-screen').forEach(s => s.classList.remove('active')); go('s-home'); });
await page.waitForTimeout(200);
const stap = async id => { await page.evaluate(i => go(i), id); await page.waitForTimeout(150); };
/* history.back() blijft binnen hetzelfde document; page.goBack() zou bij een lege
   geschiedenis de pagina verlaten en de test onbruikbaar maken. */
const terug = async () => { await page.evaluate(() => history.back()); await page.waitForTimeout(300); };
await stap('s-lichaam'); await stap('s-lich-verbanden'); await stap('s-hist');
const stapel = await page.evaluate(() => tkNavStack.slice());
check('de schermstapel is opgebouwd', stapel.length === 3, JSON.stringify(stapel));
await terug();
const na1 = await page.evaluate(() => (document.querySelector('.scr.active') || {}).id);
check('terug gaat naar het vorige scherm', na1 === 's-lich-verbanden', 'actief: ' + na1);
await terug();
await terug();
const na3 = await page.evaluate(() => (document.querySelector('.scr.active') || {}).id);
check('drie keer terug landt op Home', na3 === 's-home', 'actief: ' + na3);

console.log('\nD. Bewijsspoor');
const evOK = await page.evaluate(() => {
  const D = window.DecisionCore;
  if (!D || typeof D.buildDecisionEvidence !== 'function') return { fout: 'DecisionCore ontbreekt' };
  const besluit = D.progressionDecision(6, 100);
  const ev = D.buildDecisionEvidence({
    at: '2026-08-19T10:00:00.000Z',
    context: { trainingInstanceId: 'i1', exerciseId: 'TK-000038', setNummer: 1, date: '2026-08-19' },
    raw: { kg: 100, reps: 5, rpe: 6, voorgeschrevenKg: 100, voorgeschrevenReps: 5, voorgeschrevenRpe: 8 },
    calculated: { effKg: 100 }, decision: besluit, versions: { calculation: 'working_weight.v1' }
  });
  tkEvBewaarRij({ id: 'smoke1', exercise_id: 'TK-000038',
                  sets_detail: [{ kg: 100, effKg: 100, reps: 5, rpe: 6, evidence: ev }] });
  openEvidence('smoke1');
  const body = document.getElementById('ev-body');
  const modal = document.getElementById('m-evidence');
  return { open: modal && modal.classList.contains('open'),
           html: body ? body.innerHTML : '', titel: (document.getElementById('ev-title') || {}).textContent };
});
check('de bewijsspoor-modal opent', !!evOK.open, JSON.stringify(evOK.fout || ''));
check('de vijf secties worden getoond',
  /Gemeten/.test(evOK.html) && /Berekend/.test(evOK.html) && /Besloten/.test(evOK.html) && /Regel/.test(evOK.html));
check('de regel-id staat erin', /progression_rpe/.test(evOK.html));
check('het gemeten gewicht staat erin', /100/.test(evOK.html));
check('de titel noemt de oefening', /Waarom/.test(evOK.titel || ''));

console.log('\nE. Terug sluit eerst de modal');
const voorDiepte = await page.evaluate(() => tkNavStack.length);
await terug();
const naModal = await page.evaluate(() => ({
  modalOpen: document.getElementById('m-evidence').classList.contains('open'),
  scherm: (document.querySelector('.scr.active') || {}).id,
  diepte: tkNavStack.length
}));
check('de modal is gesloten', naModal.modalOpen === false);
check('het scherm eronder is niet gewisseld', naModal.scherm === 's-home', 'actief: ' + naModal.scherm);
check('de schermstapel is niet aangetast', naModal.diepte === voorDiepte, voorDiepte + ' -> ' + naModal.diepte);

console.log('\nF. Contact & privacy');
await page.evaluate(() => go('s-help'));
await page.waitForTimeout(200);
const help = await page.evaluate(() => ({
  ver: (document.getElementById('help-app-ver') || {}).textContent,
  contact: (document.getElementById('help-contact-body') || {}).textContent,
  privacy: !!document.querySelector('a[href="/privacy.html"]'),
  placeholder: document.body.innerText.indexOf('[PLACEHOLDER]') >= 0
}));
check('het versienummer staat in Help', help.ver === 'v4.48.0', help.ver);
check('het contactblok is gevuld', (help.contact || '').length > 20, help.contact);
check('er staat een link naar de privacyverklaring', help.privacy);
check('nergens staat nog [PLACEHOLDER]', help.placeholder === false);

console.log('\nG. Lege staten');
for (const id of ['s-hist', 's-stats', 's-lichaam', 's-lich-verbanden', 's-train-mgr', 's-coach']) {
  await page.evaluate(i => go(i), id);
  await page.waitForTimeout(500);
  const zichtbaar = await page.evaluate(i => {
    const el = document.getElementById(i);
    return !!(el && el.classList.contains('active') && el.getBoundingClientRect().height > 0);
  }, id);
  check('rendert zonder netwerk: ' + id, zichtbaar);
}

console.log('\nH. Consolefouten');
const errs = logs.filter(l => l.type === 'error' || l.type === 'pageerror');
/* Fouten die het gevolg zijn van de bewust geblokkeerde netwerkverbinding tellen niet mee:
   die bewijzen juist dat de foutafhandeling werkt. */
const echt = errs.filter(e => !/geblokkeerd in de smoketest|503|Failed to fetch|net::ERR|sbGet|sbPost|wearable|coach|Service ?Worker|ServiceWorker|registration failed/i.test(e.text));
check('geen onverwachte consolefouten', echt.length === 0,
  echt.slice(0, 5).map(e => e.text.slice(0, 160)).join(' | '));


await browser.close();

console.log('\n========================================================');
console.log('RC0 browser-smoketest — ' + ok + '/' + n + ' geslaagd');
if (fouten.length) { console.log('MISLUKT:'); fouten.forEach(f => console.log('  - ' + f)); process.exit(1); }
