/* fRC0.test.js — RC0: releasegedrag dat een eerste echte gebruiker raakt
 *
 * Deze suite bewaakt vier dingen die uit de release-audit kwamen en die alle vier pas
 * opvallen zodra iemand anders dan de bouwer de app gebruikt:
 *
 *   A  het bewijsspoor werd wél weggeschreven maar nergens getoond — daarmee was de
 *      kernbelofte ("niet alleen WAT, ook WAAROM") technisch aanwezig en onzichtbaar;
 *   B  een solo-sporter zonder gym kwam bij Beheer op een gedeelde pincode-muur terecht
 *      en kon daardoor zijn eigen apparatuur en oefeningen niet beheren;
 *   C  het scherm Help toonde letterlijk "[PLACEHOLDER]" aan de sporter;
 *   D  er was geen los te bezoeken privacyverklaring, terwijl Google Play daar een
 *      publieke URL voor eist.
 */
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var ROOT = path.join(__dirname, '..');
var HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
var n = 0;
function t(naam, fn) { fn(); n++; }

function pak(naam) {
  var m = HTML.match(new RegExp('(?:^|\\n)(?:async )?function ' + naam + '\\s*\\([\\s\\S]*?\\n\\}', 'm'));
  assert.ok(m, 'functie niet gevonden in index.html: ' + naam);
  return m[0];
}
function konst(naam) {
  var m = HTML.match(new RegExp('(?:^|\\n)(?:const|var|let) ' + naam + "\\s*=[^\\n]*?;", 'm'));
  assert.ok(m, 'constante niet gevonden: ' + naam);
  return m[0].replace(/^(\s*)(?:const|let) /m, '$1var ');
}

/* ══ A. BEWIJSSPOOR ZICHTBAAR ══════════════════════════════════════════════ */
console.log('\nA. Bewijsspoor zichtbaar');

/* De echte DecisionCore, zodat de snapshot die de test toont ook echt door de engine
   is gebouwd — geen handgeschreven nabootsing. */
var DecisionCore = require(path.join(ROOT, 'core', 'decision.js'));

function evZandbak() {
  var ctx = {
    console: console, Object: Object, Array: Array, String: String, JSON: JSON,
    DecisionCore: DecisionCore,
    exercises: [{ id: 'TK-1', name: 'Back Squat' }],
    _openGeroepen: null,
    openModal: function (id) { ctx._openGeroepen = id; },
    document: {
      _el: { 'ev-title': { textContent: '' }, 'ev-body': { innerHTML: '' } },
      getElementById: function (id) { return ctx.document._el[id] || null; }
    }
  };
  vm.createContext(ctx);
  vm.runInContext([
    pak('escHtml'), konst('_evRijen'), konst('EV_UITKOMST_LABEL'),
    pak('tkEvBewaarRij'), pak('evGetal'), pak('evRij'),
    pak('tkEvidenceVanSessieAlle'), pak('tkEvidenceSetHtml'), pak('openEvidence')
  ].join('\n'), ctx);
  return ctx;
}

/* Een echte, door DecisionCore gebouwde snapshot voor één set. */
function echteSnapshot(kg, rpe) {
  var besluit = DecisionCore.progressionDecision(rpe, kg);
  assert.ok(besluit, 'DecisionCore levert geen beslissing voor rpe=' + rpe);
  return DecisionCore.buildDecisionEvidence({
    at: '2026-08-19T10:00:00.000Z',
    context: { trainingInstanceId: 'i1', exerciseId: 'TK-1', setNummer: 1, date: '2026-08-19' },
    raw: { kg: kg, reps: 5, rpe: rpe, voorgeschrevenKg: kg, voorgeschrevenReps: 5, voorgeschrevenRpe: 8 },
    calculated: { effKg: kg },
    decision: besluit,
    versions: { calculation: 'working_weight.v1' },
    explanation: null
  });
}

t('A1: een opgeslagen bewijsspoor wordt daadwerkelijk gerenderd', function () {
  var ctx = evZandbak();
  var ev = echteSnapshot(100, 6);
  var html = ctx.tkEvidenceSetHtml(1, ev);
  assert.ok(/Gemeten/.test(html) && /Berekend/.test(html) && /Besloten/.test(html) && /Regel/.test(html),
    'niet alle secties van evidence_snapshot.v1 worden getoond');
  assert.ok(html.indexOf('100') >= 0, 'het gemeten gewicht ontbreekt in de weergave');
  assert.ok(html.indexOf('progression_rpe') >= 0, 'de regel-id ontbreekt — dan is het geen bewijs');
});

t('A2: de weergave verzint geen ontbrekende waarde', function () {
  var ctx = evZandbak();
  var ev = echteSnapshot(100, 6);
  ev.raw.reps = null;                     /* alsof de herhalingen destijds niet zijn vastgelegd */
  ev.missing = ['raw.reps'];
  var html = ctx.tkEvidenceSetHtml(1, ev);
  assert.ok(/niet vastgelegd/.test(html), 'een ontbrekend veld wordt niet als ontbrekend getoond');
  assert.ok(/Niet vastgelegd: raw\.reps/.test(html), 'de missing-lijst uit de snapshot wordt niet getoond');
});

t('A3: de uitkomst wordt in gewone taal getoond, met de ruwe waarde erbij', function () {
  var ctx = evZandbak();
  ['increase', 'deload', 'hold'].forEach(function (uit) {
    assert.ok(ctx.EV_UITKOMST_LABEL[uit], 'geen Nederlandse term voor uitkomst ' + uit);
  });
  var zwaar = ctx.tkEvidenceSetHtml(1, echteSnapshot(100, 9.5));
  assert.ok(/verlagen/.test(zwaar), 'een deload wordt niet als "verlagen" uitgelegd');
});

t('A4: openEvidence toont de sets van de bewaarde rij', function () {
  var ctx = evZandbak();
  var rij = { id: 42, exercise_id: 'TK-1',
              sets_detail: [{ kg: 100, effKg: 100, reps: 5, rpe: 6, evidence: echteSnapshot(100, 6) },
                            { kg: 100, effKg: 100, reps: 5, rpe: 9.5, evidence: echteSnapshot(100, 9.5) }] };
  ctx.tkEvBewaarRij(rij);
  ctx.openEvidence('42');
  assert.strictEqual(ctx._openGeroepen, 'm-evidence', 'de modal wordt niet geopend');
  assert.strictEqual(ctx.document._el['ev-title'].textContent, 'Waarom — Back Squat');
  var body = ctx.document._el['ev-body'].innerHTML;
  assert.ok(/Set 1/.test(body) && /Set 2/.test(body), 'niet elke set met een beslissing wordt getoond');
});

t('A5: zonder bewijsspoor wordt dat eerlijk gezegd, niet stil weggelaten', function () {
  var ctx = evZandbak();
  ctx.tkEvBewaarRij({ id: 7, exercise_id: 'TK-1', sets_detail: [{ kg: 100, reps: 5 }] });
  ctx.openEvidence('7');
  var body = ctx.document._el['ev-body'].innerHTML;
  assert.ok(/geen bewijsspoor vastgelegd/.test(body), 'een lege modal laat de sporter in het ongewisse');
  assert.ok(/RPE/.test(body), 'er wordt niet uitgelegd waaróm er geen bewijsspoor is');
});

t('A6: de knop verschijnt alleen bij een rij die echt bewijs bevat', function () {
  assert.ok(/const _evN=\(typeof tkEvidenceVanSessieAlle==='function'\)\?tkEvidenceVanSessieAlle\(s\)\.length:0;/.test(HTML),
    'het logboek telt het bewijsspoor niet per rij');
  assert.ok(/const evBtn=_evN\?/.test(HTML),
    'de knop wordt onvoorwaardelijk getoond — ook bij rijen zonder bewijs');
  assert.ok(/openEvidence\(\$\{JSON\.stringify\(String\(s\.id\)\)\}\)/.test(HTML),
    'de sessie-id wordt niet veilig doorgegeven aan openEvidence');
});

t('A7: het tonen leest alleen — er wordt niets herberekend', function () {
  var src = pak('tkEvidenceSetHtml') + pak('openEvidence') + pak('evGetal');
  assert.ok(!/progressionDecision|computeProgression|CalcCore\./.test(src),
    'de weergavelaag rekent zelf — dan kan het scherm afwijken van wat destijds is besloten');
});

/* ══ B. BEHEER-TOEGANG ═════════════════════════════════════════════════════ */
console.log('\nB. Beheer-toegang');

function beheerZandbak(rolLevel, resolved) {
  var ctx = {
    teamRoleLevel: rolLevel, teamAccessResolved: resolved,
    _go: [], _toasts: [],
    go: function (id) { ctx._go.push(id); },
    toast: function (m) { ctx._toasts.push(m); }
  };
  vm.createContext(ctx);
  vm.runInContext(pak('openBeheer'), ctx);
  return ctx;
}

t('B1: een gym-owner komt direct in Beheer', function () {
  var ctx = beheerZandbak(3, true);
  ctx.openBeheer();
  assert.strictEqual(ctx._go.join(','), 's-admin');
});

t('B2: een gewoon gym-lid krijgt een duidelijke weigering, geen pincode-muur', function () {
  var ctx = beheerZandbak(0, true);
  ctx.openBeheer();
  assert.strictEqual(ctx._go.length, 0);
  assert.ok(/gym-owners/.test(ctx._toasts.join(' ')));
});

t('B3: een solo-sporter zonder gym beheert zijn eigen apparatuur en oefeningen', function () {
  /* Dit was de bug: -1 betekende zowel "geen gym" als "nog niet opgehaald", dus de
     solo-sporter kwam op de gedeelde pincode uit die hij niet kent. */
  var ctx = beheerZandbak(-1, true);
  ctx.openBeheer();
  assert.strictEqual(ctx._go.join(','), 's-admin',
    'de solo-sporter komt nog steeds op de pincode-muur terecht');
});

t('B4: is de rol nog onbekend, dan blijft de pincode de vangnet-route', function () {
  var ctx = beheerZandbak(-1, false);
  ctx.openBeheer();
  assert.strictEqual(ctx._go.join(','), 's-admin-pin');
});

t('B5: de vlag wordt pas gezet als whoami daadwerkelijk antwoordde', function () {
  var src = pak('checkTeamAccess');
  assert.ok(/teamAccessResolved=true;/.test(src), 'teamAccessResolved wordt nergens gezet');
  var naOk = src.indexOf('teamAccessResolved=true;');
  var bijFout = src.indexOf("if(!r.ok)");
  assert.ok(bijFout >= 0 && bijFout < naOk,
    'de vlag wordt ook gezet wanneer whoami faalt — dan opent Beheer op een aanname');
});

/* ══ C. CONTACT & SUPPORT ══════════════════════════════════════════════════ */
console.log('\nC. Contact & support');

t('C1: er staat geen ontwikkelaars-placeholder meer in de uitgeleverde interface', function () {
  /* Alleen buiten commentaar kijken: de toelichting bij de fix mag het woord noemen. */
  var zonderCommentaar = HTML.replace(/^\s*\/\/.*$/gm, '');
  assert.ok(zonderCommentaar.indexOf('[PLACEHOLDER]') < 0,
    'de sporter krijgt nog steeds "[PLACEHOLDER]" te zien');
});

t('C2: zonder ingesteld adres toont de app een eerlijke tekst, geen kapotte link', function () {
  var ctx = { document: { _el: { 'help-contact-body': { innerHTML: '', textContent: '' } },
                          getElementById: function (id) { return ctx.document._el[id] || null; } },
              APP_VER: 'v4.48.0', escHtml: function (s) { return String(s); }, encodeURIComponent: encodeURIComponent };
  vm.createContext(ctx);
  vm.runInContext([konst('SUPPORT_EMAIL'), pak('renderHelpContact')].join('\n'), ctx);
  ctx.renderHelpContact();
  var el = ctx.document._el['help-contact-body'];
  assert.strictEqual(el.innerHTML, '', 'er wordt een mailto-link gerenderd zonder adres');
  assert.ok(el.textContent.length > 20, 'de sporter krijgt een leeg blok te zien');
  assert.ok(!/mailto:/.test(el.textContent));
});

t('C3: mét adres komt er een werkende mailto met versienummer', function () {
  var ctx = { document: { _el: { 'help-contact-body': { innerHTML: '', textContent: '' } },
                          getElementById: function (id) { return ctx.document._el[id] || null; } },
              APP_VER: 'v4.48.0', escHtml: function (s) { return String(s); }, encodeURIComponent: encodeURIComponent };
  vm.createContext(ctx);
  vm.runInContext(["var SUPPORT_EMAIL='support@example.org';", pak('renderHelpContact')].join('\n'), ctx);
  ctx.renderHelpContact();
  var h = ctx.document._el['help-contact-body'].innerHTML;
  assert.ok(/mailto:support@example\.org/.test(h), 'geen mailto-link');
  assert.ok(/v4\.48\.0/.test(h), 'het versienummer ontbreekt — dat kost support-tijd');
});

t('C4: het contactblok wordt gerenderd zodra het scherm Help opent', function () {
  assert.ok(/if\(id==='s-help'\)\{[^}]*renderHelpContact\(\)/.test(HTML),
    'renderHelpContact wordt nooit aangeroepen');
});

/* ══ D. PRIVACYVERKLARING ══════════════════════════════════════════════════ */
console.log('\nD. Privacyverklaring');

var PRIV = fs.readFileSync(path.join(ROOT, 'privacy.html'), 'utf8');

t('D1: er is een losstaande, publiek bereikbare privacyverklaring', function () {
  assert.ok(PRIV.length > 3000, 'privacy.html is te dun voor een Play Store-vermelding');
  assert.ok(/<html lang="nl">/.test(PRIV));
  assert.ok(!/<script/i.test(PRIV), 'de privacypagina bevat script — onnodig risico op een publieke pagina');
});

t('D2: de verplichte onderwerpen staan erin', function () {
  ['Welke gegevens', 'AI-coach', 'Bewaartermijn', 'rechten', 'Verwijdering',
   'Verwerkers', 'Beveiliging', 'Kinderen', 'medisch'].forEach(function (onderwerp) {
    assert.ok(new RegExp(onderwerp, 'i').test(PRIV), 'onderwerp ontbreekt in de verklaring: ' + onderwerp);
  });
});

t('D3: de verklaring belooft niets dat de app niet waarmaakt', function () {
  /* Accountverwijdering is een Play-vereiste én moet echt bestaan. */
  assert.ok(fs.existsSync(path.join(ROOT, 'netlify', 'functions', 'delete-account.js')),
    'de verklaring belooft accountverwijdering, maar de functie bestaat niet');
  assert.ok(/Row Level Security|afgeschermd per gebruiker/i.test(PRIV));
});

t('D4: de app verwijst naar de verklaring', function () {
  assert.ok(/href="\/privacy\.html"/.test(HTML), 'de app linkt nergens naar de privacyverklaring');
});

/* ══ E. ACCOUNTVERWIJDERING ════════════════════════════════════════════════ */
console.log('\nE. Accountverwijdering');

var DELETE_FN = fs.readFileSync(path.join(ROOT, 'netlify', 'functions', 'delete-account.js'), 'utf8');

/* Elke tabel in het productieschema met een gebruikerskolom, opgevraagd op 2026-08-19 uit
   information_schema, bijgewerkt op 2026-08-26 met cycle_periods (v4.51.0), race_segments
   (v4.91.0) en cycle_symptom_logs (v4.52.0). Backup-tabellen (bak_p_*) staan er niet in: die zijn
   niet via de app bereikbaar en bevatten geen levende gebruikersgegevens. Komt er een tabel bij, dan hoort
   die in DEZE lijst én in delete-account.js — anders faalt E1. */
var TABELLEN_MET_GEBRUIKER = [
  'athlete_conditions', 'atleet_profiel', 'body_comp', 'chat_history', 'checkin_conditions',
  'common_data_points', 'content_shares', 'custom_training_exercises', 'custom_trainings',
  'cycle_periods', 'cycle_symptom_logs', 'equipment_catalog', 'exercise_equipment', 'exercise_favorites', 'exercise_goals',
  'exercises', 'external_connections', 'external_records', 'goals', 'hrv_log', 'memberships',
  'program_block_exercises', 'program_blocks', 'programs', 'race_segments', 'sessions', 'training_context',
  'training_exercises', 'training_instances', 'usage_log', 'user_credit_purchases',
  'vaste_trainingen', 'wearable_connections', 'wearable_oauth_state', 'weight_log',
  'equipment_types', 'users'
];

t('E1: elke tabel met gebruikersgegevens wordt bij verwijdering geraakt', function () {
  /* Google Play eist dat accountverwijdering ALLE gegevens verwijdert, en de
     privacyverklaring van de app belooft precies dat. Voor RC0 ontbraken er elf tabellen,
     waaronder wearable_connections — die de OAuth access- en refresh-tokens in leesbare
     vorm bewaart. Die bleven na verwijdering van het account gewoon bestaan. */
  var gemist = TABELLEN_MET_GEBRUIKER.filter(function (tabel) {
    return DELETE_FN.indexOf("'" + tabel + "'") < 0 && DELETE_FN.indexOf('/' + tabel + '?') < 0;
  });
  assert.deepStrictEqual(gemist, [],
    'blijft achter na accountverwijdering: ' + gemist.join(', '));
});

t('E2: de tokens van de wearable-koppeling worden expliciet verwijderd', function () {
  assert.ok(/'wearable_connections'/.test(DELETE_FN),
    'access_token en refresh_token van de Fitbit-/Google Health-koppeling blijven bestaan');
  assert.ok(/'wearable_oauth_state'/.test(DELETE_FN));
});

t('E3: gedeelde content wordt in beide richtingen opgeruimd', function () {
  assert.ok(/shared_with/.test(DELETE_FN) && /shared_by/.test(DELETE_FN),
    'alleen één richting van content_shares wordt opgeruimd');
});

t('E4: gym-inrichting van andere leden blijft bestaan', function () {
  /* equipment_catalog en exercise_equipment dragen zowel gym_id als user_id. Een blinde
     verwijdering op user_id zou de gym-inrichting van de overige leden meenemen. */
  assert.ok(/equipment_catalog', 'exercise_equipment'/.test(DELETE_FN),
    'de twee gedeelde tabellen worden niet apart behandeld');
  assert.ok(/gym_id=is\.null/.test(DELETE_FN),
    'er wordt zonder gym_id-filter verwijderd — dat raakt gedeelde inrichting van anderen');
});

t('E5: er wordt nooit zonder gebruikersfilter verwijderd', function () {
  /* Elke DELETE-URL in deze functie moet op de gebruiker begrensd zijn. Eén ongefilterde
     DELETE zou de tabel voor iedereen legen. */
  var urls = DELETE_FN.match(/rest\/v1\/[^`]*`/g) || [];
  assert.ok(urls.length > 0, 'geen enkele REST-aanroep gevonden — is de functie gewijzigd?');
  urls.forEach(function (u) {
    assert.ok(/\$\{userId\}/.test(u) || /\$\{table\}\?user_id=eq\.\$\{userId\}/.test(u),
      'DELETE zonder gebruikersfilter: ' + u);
  });
});

t('E6: het user-id komt van de server, nooit van de client', function () {
  assert.ok(/auth\/v1\/user/.test(DELETE_FN),
    'de JWT wordt niet bij Supabase geverifieerd voordat er verwijderd wordt');
  assert.ok(!/JSON\.parse\(event\.body\)[\s\S]{0,80}user_?[iI]d/.test(DELETE_FN),
    'er wordt een user-id uit het verzoek van de client overgenomen');
});

console.log('\n========================================================');
console.log('fRC0.test.js — ' + n + ' tests geslaagd');
