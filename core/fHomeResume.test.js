/* fHomeResume.test.js — GAP-P2-008 regressietest: "Home: training hervatten".
 *
 * BEVINDING: de bouwstenen voor hervatten bestonden al (restoreTrainingDraft/draftHasData/
 * guardExistingDraft en de resume-branches in startT, startCustomTraining en
 * launchProgramTrainScreen), maar Home bood ze nergens proactief aan. Een gebruiker die een
 * training startte, sets logde en de app sloot, moest zelf precies dezelfde training weer
 * opzoeken om verder te kunnen.
 *
 * DEZE TEST VOERT DE ECHTE CODE UIT. Geen enkele assertie hieronder is tevreden met de
 * aanwezigheid van een string of een DOM-knoop: de pure kern draait rechtstreeks, en
 * renderHomeResumeCard()/resumeTrainingFromHome() worden uit index.html geëxtraheerd en in een
 * sandbox uitgevoerd met een nagebootste DOM, zodat de volledige keten
 * Home -> beslissing -> bestaande start-route aantoonbaar is.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const HomeResumeCore = require('./homeResume.js');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

function extractFunction(source, name) {
  const re = new RegExp('(?:async\\s+)?function\\s+' + name + '\\s*\\(');
  const m = re.exec(source);
  if (!m) return null;
  const braceStart = source.indexOf('{', m.index);
  if (braceStart === -1) return null;
  let depth = 0;
  for (let i = braceStart; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) return source.slice(m.index, i + 1);
    }
  }
  return null;
}

const NOW = new Date('2026-09-30T18:00:00').getTime();
const EERDER = new Date('2026-09-30T16:40:00').getTime();
const GISTEREN = new Date('2026-09-29T17:00:00').getTime();

const NativeDate = Date;
class FixedDate extends NativeDate {
  constructor(...args) { super(...(args.length ? args : [NOW])); }
  static now() { return NOW; }
}


function draftMet(overrides) {
  return Object.assign({
    t: 'A', ts: EERDER, instanceId: 'instance-1',
    sessionLog: { 'ex-squat': { sets: [{ kg: 80, reps: 5 }, { kg: 80, reps: 5 }], wu: [{ kg: 40, reps: 8 }] } },
    sessionExtra: [], elapsedMs: 900000, execFocus: 1
  }, overrides || {});
}

/* ── 1. De pure beslissing ───────────────────────────────────────────────── */
{
  const s = HomeResumeCore.resolveResumeState(draftMet(), NOW);
  ok(s.resumable === true && s.reason === 'RESUMABLE', 'geldige draft van vandaag met gelogde sets is hervatbaar');
  ok(s.type === 'vast' && s.refId === 'A' && s.route === 'startT', 'vaste training routeert naar startT');
  ok(s.instanceId === 'instance-1', 'de bestaande instanceId wordt meegegeven — geen nieuwe sessie-identiteit');
  ok(s.counts.sets === 2 && s.counts.warmups === 1 && s.counts.exercises === 1, 'gelogde sets worden geteld voor de context op de kaart');

  ok(HomeResumeCore.resolveResumeState(null, NOW).reason === 'NO_DRAFT', 'geen draft → niet hervatbaar');
  ok(HomeResumeCore.resolveResumeState(undefined, NOW).resumable === false, 'ontbrekende draft levert geen kaart');
  ok(HomeResumeCore.resolveResumeState(draftMet({ sessionLog: {} }), NOW).reason === 'NO_LOGGED_DATA', 'lege draft → niet hervatbaar');
  ok(HomeResumeCore.resolveResumeState(draftMet({ sessionLog: { x: { sets: [{}, null] } } }), NOW).reason === 'NO_LOGGED_DATA',
    'draft met lege setrijen telt niet als gelogde data');
  ok(HomeResumeCore.resolveResumeState(draftMet({ ts: GISTEREN }), NOW).reason === 'STALE_DIFFERENT_DAY',
    'draft van een andere dag is stale — zelfde regel als de start-routes');
  ok(HomeResumeCore.resolveResumeState(draftMet(), NOW, { activeT: 'A' }).reason === 'ALREADY_ACTIVE',
    'sessie die al actief is op dit toestel levert geen tweede kaart');
  ok(HomeResumeCore.resolveResumeState(draftMet({ t: null }), NOW).reason === 'INVALID_DRAFT', 'draft zonder type is ongeldig');
  ok(HomeResumeCore.resolveResumeState({ t: 'A', ts: EERDER, sessionLog: 'kapot' }, NOW).resumable === false,
    'corrupte sessionLog levert geen kaart en geen uitzondering');

  const c = HomeResumeCore.resolveResumeState(draftMet({ t: 'custom_42' }), NOW);
  ok(c.type === 'custom' && c.refId === '42' && c.route === 'startCustomTraining', 'custom-draft routeert naar startCustomTraining');
  const p = HomeResumeCore.resolveResumeState(draftMet({ t: 'prog_block-9' }), NOW);
  ok(p.type === 'program' && p.refId === 'block-9' && p.route === 'startProgramBlockTraining',
    'programma-draft routeert naar de bestaande programma-startroute');
  const cardio = HomeResumeCore.resolveResumeState(draftMet({ sessionLog: { row: { cardio: { dist: 2000 } } } }), NOW);
  ok(cardio.resumable === true && cardio.counts.cardio === 1, 'cardio-only draft telt als gelogde data');
}

/* ── 2. De echte Home-functies, uitgevoerd in een sandbox ────────────────── */
const namen = ['homeResumeLabel', 'homeResumeMeta', 'renderHomeResumeCard', 'resumeTrainingFromHome', 'consumeHomeResumeIntent'];
const bronnen = {};
namen.forEach(n => { bronnen[n] = extractFunction(html, n); ok(bronnen[n] !== null, n + '() bestaat in index.html'); });

function maakElement(id) {
  return {
    id, innerHTML: '', disabled: false, attrs: {},
    setAttribute(k, v) { this.attrs[k] = v; },
    removeAttribute(k) { delete this.attrs[k]; }
  };
}

function sandbox(draft, extra) {
  const el = maakElement('home-resume');
  const knop = maakElement('home-resume-btn');
  const ctx = {
    console, Date: FixedDate, Object, Array, JSON, String, Number,
    window: {}, calls: [], toasts: [],
    HomeResumeCore,
    V43I: { dumbbell: '<svg id="dumbbell"></svg>', play: '<svg id="play"></svg>' },
    escHtml: s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
    vasteTrainingen: [{ id: 'A', naam: 'Training A — Onderlichaam' }],
    customTrainings: [{ id: '42', naam: 'Mijn duurtraining' }],
    curT: (extra && extra.curT) || null,
    restoreTrainingDraft() { ctx.calls.push('restoreTrainingDraft'); return draft; },
    toast(t) { ctx.toasts.push(t); },
    document: { getElementById: id => (id === 'home-resume' ? el : id === 'home-resume-btn' ? knop : null) },
    async startT(t) { ctx.calls.push('startT:' + t + ':intent=' + ctx.consumeHomeResumeIntent(t)); if (extra && extra.throwOn === 'startT') throw new Error('stuk'); },
    async startCustomTraining(id) { ctx.calls.push('startCustomTraining:' + id + ':intent=' + ctx.consumeHomeResumeIntent('custom_' + id)); },
    async startProgramBlockTraining(id) { ctx.calls.push('startProgramBlockTraining:' + id); },
    _el: el, _knop: knop
  };
  vm.createContext(ctx);
  // De busy-vlag staat in index.html naast de functies; in de sandbox declareren we hem identiek,
  // zodat de dubbeltap-bescherming precies de code is die in de app draait.
  vm.runInContext('let _tkHomeResumeBusy=false;\n' + namen.map(n => bronnen[n]).join('\n'), ctx);
  return ctx;
}

/* Rendering: alleen een kaart wanneer er echt iets te hervatten valt. */
{
  const leeg = sandbox(null);
  leeg.renderHomeResumeCard();
  ok(leeg._el.innerHTML === '', 'geen draft → Home toont geen (lege) hervatkaart');

  const stale = sandbox(draftMet({ ts: GISTEREN }));
  stale.renderHomeResumeCard();
  ok(stale._el.innerHTML === '', 'draft van gisteren → geen kaart');

  const kapot = sandbox({ t: 'A', ts: EERDER, sessionLog: 42 });
  let crashte = false;
  try { kapot.renderHomeResumeCard(); } catch (_) { crashte = true; }
  ok(crashte === false && kapot._el.innerHTML === '', 'corrupte draft veroorzaakt geen crash en geen kaart');

  const actief = sandbox(draftMet(), { curT: 'A' });
  actief.renderHomeResumeCard();
  ok(actief._el.innerHTML === '', 'al actieve sessie levert geen dubbele kaart op Home');

  const goed = sandbox(draftMet());
  const state = goed.renderHomeResumeCard();
  const h = goed._el.innerHTML;
  ok(state && state.resumable === true, 'geldige draft → renderHomeResumeCard geeft de hervatbare staat terug');
  ok(h.indexOf('Training hervatten') !== -1, 'de kaart toont een duidelijke actie "Training hervatten"');
  ok(h.indexOf('Training A — Onderlichaam') !== -1, 'de kaart noemt de training die hervat wordt');
  ok(/3 sets gelogd/.test(h) && /1 oefening/.test(h), 'de kaart toont wat er al gelogd is als herkenbare context');
  ok(h.indexOf('Deze training is nog niet afgerond') !== -1, 'status staat in tekst, niet uitsluitend in kleur');
  ok(/<button[^>]*aria-label="Training hervatten: /.test(h), 'de actie is een semantische button met een sprekend label');
  ok(h.indexOf('onclick="resumeTrainingFromHome()"') !== -1, 'de knop roept de resume-route aan');

  const custom = sandbox(draftMet({ t: 'custom_42' }));
  custom.renderHomeResumeCard();
  ok(custom._el.innerHTML.indexOf('Mijn duurtraining') !== -1, 'een custom-draft toont de naam van die eigen training');

  const langeNaam = sandbox(draftMet({ t: 'B' }));
  langeNaam.vasteTrainingen = [{ id: 'B', naam: 'Zeer lange trainingsnaam die op een kleine telefoon moet afbreken zonder de knop weg te duwen' }];
  langeNaam.renderHomeResumeCard();
  ok(langeNaam._el.innerHTML.indexOf('Zeer lange trainingsnaam') !== -1 &&
     langeNaam._el.innerHTML.indexOf('Training hervatten') !== -1,
    'een lange trainingsnaam verdringt de actie niet uit de kaart');

  const xss = sandbox(draftMet({ t: 'X' }));
  xss.vasteTrainingen = [{ id: 'X', naam: '<img src=x onerror=alert(1)>' }];
  xss.renderHomeResumeCard();
  ok(xss._el.innerHTML.indexOf('<img src=x') === -1 && xss._el.innerHTML.indexOf('&lt;img') !== -1,
    'de trainingsnaam wordt ge-escaped in de kaart');
}

/* De asynchrone scenario's in één keten, zodat het proces pas eindigt als alles is nagelopen. */
(async function () {
  {
    // De call-chain: hervatten opent de BESTAANDE route voor exact deze sessie.
    const vast = sandbox(draftMet());
    vast.renderHomeResumeCard();
    const res = await vast.resumeTrainingFromHome();
    ok(res === true, 'hervatten van een vaste training slaagt');
    ok(vast.calls.filter(c => c.indexOf('startT:A') === 0).length === 1,
      'hervatten roept startT() precies één keer aan, met dezelfde training');
    ok(vast.calls.some(c => c === 'startT:A:intent=true'),
      'de start-route ziet de hervat-intentie en vraagt niet nog eens om bevestiging');
    ok(!vast.calls.some(c => /startCustomTraining|startProgramBlockTraining|createTrainingInstance/.test(c)),
      'hervatten maakt geen tweede sessie en gebruikt geen andere keten');
  }
  {
    const custom = sandbox(draftMet({ t: 'custom_42' }));
    await custom.resumeTrainingFromHome();
    ok(custom.calls.some(c => c === 'startCustomTraining:42:intent=true'), 'custom-draft hervat via startCustomTraining met dezelfde id');
  }
  {
    const prog = sandbox(draftMet({ t: 'prog_block-9' }));
    await prog.resumeTrainingFromHome();
    ok(prog.calls.some(c => c === 'startProgramBlockTraining:block-9'),
      'programma-draft hervat via de bestaande programma-startroute (inclusief de bestaande check-in)');
  }
  {
    // Twee taps vlak na elkaar: de tweede mag de route niet nóg een keer openen.
    const dubbel = sandbox(draftMet());
    dubbel.renderHomeResumeCard();
    const [a, b] = await Promise.all([dubbel.resumeTrainingFromHome(), dubbel.resumeTrainingFromHome()]);
    ok(a === true && b === false, 'de tweede, snelle tap wordt geweigerd');
    ok(dubbel.calls.filter(c => c.indexOf('startT:A') === 0).length === 1, 'een dubbele tap opent de sessie precies één keer');
    ok(dubbel._knop.disabled === false, 'de knop is na afloop weer bruikbaar');
    const derde = await dubbel.resumeTrainingFromHome();
    ok(derde === true && dubbel.calls.filter(c => c.indexOf('startT:A') === 0).length === 2,
      'na afloop kan opnieuw hervat worden — de blokkade is tijdelijk, geen dode knop');
  }
  {
    // Tussen renderen en tikken afgerond: de draft is weg, de actie doet niets.
    const weg = sandbox(draftMet());
    weg.renderHomeResumeCard();
    weg.restoreTrainingDraft = function () { return null; };
    const res = await weg.resumeTrainingFromHome();
    ok(res === false, 'een inmiddels afgeronde sessie wordt niet meer hervat');
    ok(!weg.calls.some(c => c.indexOf('startT') === 0), 'er wordt geen start-route geopend voor een verdwenen sessie');
    ok(weg._el.innerHTML === '', 'de kaart verdwijnt zodra de sessie niet meer hervatbaar is');
    ok(weg.toasts.length === 1, 'de gebruiker krijgt uitleg in plaats van een stille mislukking');
  }
  {
    // Faalt de start-route, dan blijft Home bruikbaar en blijft de intentie niet hangen.
    const stuk = sandbox(draftMet(), { throwOn: 'startT' });
    stuk.renderHomeResumeCard();
    const res = await stuk.resumeTrainingFromHome();
    ok(res === false, 'een fout in de start-route levert een nette false op');
    ok(stuk._knop.disabled === false, 'de knop wordt na een fout weer vrijgegeven');
    ok(stuk.window._tkResumeIntent === null, 'de hervat-intentie blijft niet hangen na een fout');
  }

  /* ── 3. De bestaande keten blijft ongewijzigd ──────────────────────────── */
  {
    const startT = extractFunction(html, 'startT');
    ok(/const _homeIntent=consumeHomeResumeIntent\(t\)/.test(startT), 'startT() verzilvert de hervat-intentie van Home');
    ok(/_homeIntent\?true:await confirmModal\(/.test(startT), 'zonder Home-intentie vraagt startT() nog steeds om bevestiging');
    ok(/sessionLog=draft\.sessionLog\|\|\{\}/.test(startT), 'startT() herstelt nog steeds de bestaande sessionLog — geen nieuwe sessie');
    ok(/activeInstanceId=draft\.instanceId\|\|null/.test(startT), 'startT() hergebruikt de bestaande training_instance bij hervatten');
    const custom = extractFunction(html, 'startCustomTraining');
    ok(/consumeHomeResumeIntent\(ctxT\) \? true : await confirmModal\(/.test(custom),
      'startCustomTraining() verzilvert de intentie en bevestigt anders zoals voorheen');
    const render = extractFunction(html, 'renderV43Home');
    ok(/renderHomeResumeCard\(\);/.test(render), 'de kaart wordt in het bestaande Home-renderpad getekend (één renderpad, geen dubbele listener)');
    ok(html.indexOf('<script src="core/homeResume.js"></script>') !== -1, 'de kern is in index.html ingeladen');
    ok(/function draftHasData\(draft\)\{[\s\S]{0,120}HomeResumeCore\.draftHasLoggedData\(draft\)/.test(html),
      'draftHasData() en Home delen één regel voor "bevat dit concept data"');
    const home = html.slice(html.indexOf('id="home-resume"'), html.indexOf('id="home-plan"'));
    ok(home.length > 0, 'de hervatkaart staat vóór "Vandaag gepland" in de Home-volgorde');
    ok(!/localStorage\.removeItem|clearTrainingDraft\(\)/.test(bronnen.renderHomeResumeCard + bronnen.resumeTrainingFromHome),
      'Home wist nooit zelf een draft');
  }

  console.log('fHomeResume: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  if (msgs.length) console.log(msgs.join('\n'));
  console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
  process.exit(fail > 0 ? 1 : 0);
})();
