/* ==========================================================================
 * TrainingKompas — ONBOARDING CORE (AI Conversational Intake)
 * --------------------------------------------------------------------------
 * PUUR · DETERMINISTISCH · OFFLINE-CAPABLE. Geen DOM, geen DB/fetch, geen AI-call,
 * geen Date. Dit is de ENIGE bron van de intake-logica: welke vraag volgt (deterministische
 * vertakking), hoe een antwoord gevalideerd/genormaliseerd wordt, welke uitlegtekst
 * ("waarom vragen we dit") bij een vraag hoort, en hoe bevestigde kandidaat-data naar de
 * BESTAANDE tabellen wordt gemapt (atleet_profiel, training_context, goals, athlete_conditions).
 *
 * ARCHITECTUUR-GRENS (hard):
 *  - De AI mag het gesprek voeren en vrije tekst STRUCTUREREN (extractie), maar is nooit
 *    bron van waarheid. Alle validatie/normalisatie en alle vertakking gebeuren hier,
 *    deterministisch. `parseAnswerLocally` biedt bovendien een AI-loze fallback.
 *  - Deze core REKENT niet en neemt geen trainingsbeslissingen. Hij bepaalt uitsluitend
 *    welke gestructureerde intake-data wordt verzameld en hoe die veilig wordt weggeschreven.
 *  - Geen tweede source of truth: secundaire doelen -> bestaande `goals`; beperkingen ->
 *    bestaande `athlete_conditions`; kernprofiel -> bestaande `atleet_profiel`; alleen de
 *    genuinely ontbrekende trainingscontext -> `training_context`.
 * ==========================================================================*/
(function (global) {
  'use strict';

  var VERSION = 'onboarding_intake.v1';

  // ---- Vaste keuzelijsten (gelijk aan de bestaande wizard-selects) ----------
  var PRIMARY_GOALS = ['kracht', 'conditie', 'afvallen', 'prestatie', 'algemeen'];
  var LEVELS = ['beginner', 'gevorderd', 'ervaren', 'expert'];
  var SPORTS = ['crossfit', 'kracht', 'powerlifting', 'bodybuilding', 'hyrox', 'hardlopen',
    'triathlon', 'swimming', 'weightlifting', 'wielrennen', 'roeien', 'calisthenics',
    'strongman', 'functioneel', 'algemeen'];
  var LOCATIONS = ['thuis', 'gym', 'hybride'];
  var DAYS = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];
  // Coach-presentatievoorkeuren (GEEN sportlogica, GEEN genderidentiteit van de sporter).
  var COACH_STYLES = ['balanced', 'direct', 'motivating', 'analytical', 'calm', 'energetic'];
  var COACH_VOICES = ['female', 'male', 'neutral', 'undisclosed']; // aanspreekvorm van de COACH
  var COACH_DETAILS = ['kort', 'normaal', 'uitgebreid'];

  var GOAL_LABEL = {
    kracht: 'Kracht opbouwen', conditie: 'Conditie verbeteren',
    afvallen: 'Afvallen / lichaamscompositie', prestatie: 'Sportprestatie verbeteren',
    algemeen: 'Algemene fitheid'
  };
  var LEVEL_LABEL = {
    beginner: 'Beginner (<1 jaar)', gevorderd: 'Gevorderd (1-3 jaar)',
    ervaren: 'Ervaren (3-5 jaar)', expert: 'Expert (5+ jaar)'
  };
  var COACH_STYLE_LABEL = {
    balanced: 'Gebalanceerd', direct: 'Direct & doelgericht', motivating: 'Coachend & motiverend',
    analytical: 'Analytisch & inhoudelijk', calm: 'Rustig & ondersteunend', energetic: 'Energiek & uitdagend'
  };
  var COACH_VOICE_LABEL = { female: 'Vrouw', male: 'Man', neutral: 'Neutraal', undisclosed: 'Zeg ik liever niet' };
  var COACH_DETAIL_LABEL = { kort: 'Kort', normaal: 'Normaal', uitgebreid: 'Uitgebreid' };

  function normStr(v) { return String(v == null ? '' : v).trim(); }
  function lc(v) { return normStr(v).toLowerCase(); }
  function isNum(n) { return typeof n === 'number' && isFinite(n); }
  function clampInt(v) { var n = parseInt(v, 10); return isNaN(n) ? null : n; }

  // ---- Vragenset (progressive profiling, 4 fasen) ---------------------------
  // Elke vraag: id, phase, field, kind, prompt, why, (chips|options), optional, include(state).
  // 'include' maakt de vertakking deterministisch (bv. apparatuur alleen bij thuis/hybride).
  var QUESTIONS = [
    // FASE 1 — Kennismaking (verplicht om te starten)
    { id: 'q_name', phase: 1, field: 'naam', kind: 'text', optional: false,
      prompt: 'Welkom bij TrainingKompas. Ik leer je graag even kennen zodat ik je gericht kan coachen. Hoe mag ik je noemen?',
      why: 'Zodat de coach je persoonlijk kan aanspreken. Verlaat je account nooit.' },
    { id: 'q_goal', phase: 1, field: 'primary_goal', kind: 'enum', options: PRIMARY_GOALS, optional: false,
      prompt: 'Waar wil je met je training vooral naartoe?',
      why: 'Je hoofddoel bepaalt hoe de coach je advies, oefeningen en progressie afstemt.',
      chips: [
        { label: 'Kracht opbouwen', value: 'kracht' },
        { label: 'Conditie verbeteren', value: 'conditie' },
        { label: 'Afvallen', value: 'afvallen' },
        { label: 'Sportprestatie', value: 'prestatie' },
        { label: 'Algemene fitheid', value: 'algemeen' }
      ] },
    { id: 'q_age', phase: 1, field: 'leeftijd', kind: 'int', optional: false,
      prompt: 'Hoe oud ben je?',
      why: 'Nodig voor een correcte 1RM-schatting en leeftijdscorrectie in de berekeningen.' },
    { id: 'q_height', phase: 1, field: 'lengte', kind: 'int', optional: false,
      prompt: 'En hoe lang ben je (in cm)?',
      why: 'Voor lichaamsgerelateerde berekeningen en context bij je profiel.' },
    { id: 'q_sex', phase: 1, field: 'geslacht', kind: 'enum', options: ['man', 'vrouw'], optional: false,
      prompt: 'Wat is je geslacht?',
      why: 'Voor correcte krachtnormen en schattingen.',
      chips: [{ label: 'Man', value: 'man' }, { label: 'Vrouw', value: 'vrouw' }] },

    // FASE 2 — Trainingscontext (aanbevolen)
    { id: 'q_freq', phase: 2, field: 'frequency', kind: 'int', optional: false,
      prompt: 'Hoe vaak train je gemiddeld per week?',
      why: 'Bepaalt hoeveel trainingsvolume je per week aankunt.',
      chips: [
        { label: '2x', value: '2' }, { label: '3x', value: '3' },
        { label: '4x', value: '4' }, { label: '5x', value: '5' }, { label: '6x', value: '6' }
      ] },
    { id: 'q_days', phase: 2, field: 'days', kind: 'multiselect', options: DAYS, optional: true,
      prompt: 'Op welke dagen train je meestal? (mag je overslaan)',
      why: 'Zodat een toekomstig schema op jouw beschikbare dagen past.',
      chips: DAYS.map(function (d) { return { label: d, value: d }; }) },
    { id: 'q_duration', phase: 2, field: 'duration_min', kind: 'int', optional: false,
      prompt: 'Hoe lang duurt een sessie ongeveer (in minuten)?',
      why: 'Bepaalt hoeveel oefeningen en volume realistisch in één sessie passen.',
      chips: [
        { label: '30 min', value: '30' }, { label: '45 min', value: '45' },
        { label: '60 min', value: '60' }, { label: '90 min', value: '90' }
      ] },
    { id: 'q_location', phase: 2, field: 'location', kind: 'enum', options: LOCATIONS, optional: false,
      prompt: 'Waar train je meestal?',
      why: 'Bepaalt welke oefeningen en welke apparatuur voor jou passen.',
      chips: [
        { label: 'Thuis', value: 'thuis' }, { label: 'Sportschool', value: 'gym' },
        { label: 'Beide', value: 'hybride' }
      ] },
    { id: 'q_equipment', phase: 2, field: 'equipment', kind: 'multiselect', optional: true,
      // Alleen relevant wanneer (deels) thuis: in de gym nemen we een volledige uitrusting aan.
      include: function (s) { return s && (s.location === 'thuis' || s.location === 'hybride'); },
      prompt: 'Welke apparatuur heb je beschikbaar? (mag je overslaan)',
      why: 'Zodat de coach alleen oefeningen voorstelt die je daadwerkelijk kunt uitvoeren.',
      chips: [
        { label: 'Halterstang', value: 'barbell' }, { label: 'Dumbbells', value: 'dumbbells' },
        { label: 'Kettlebell', value: 'kettlebell' }, { label: 'Rek/squat rack', value: 'rack' },
        { label: 'Pull-up bar', value: 'pullup_bar' }, { label: 'Bank', value: 'bench' },
        { label: 'Weerstandsbanden', value: 'bands' }, { label: 'Machines', value: 'machines' },
        { label: 'Alleen lichaamsgewicht', value: 'bodyweight' }
      ] },

    // FASE 3 — Verfijning (achtergrond + extra doelen)
    { id: 'q_level', phase: 3, field: 'niveau', kind: 'enum', options: LEVELS, optional: false,
      prompt: 'Hoe zou je je trainingservaring omschrijven?',
      why: 'Bepaalt je progressietempo en de moeilijkheid van voorgestelde oefeningen.',
      chips: [
        { label: 'Beginner', value: 'beginner' }, { label: 'Gevorderd', value: 'gevorderd' },
        { label: 'Ervaren', value: 'ervaren' }, { label: 'Expert', value: 'expert' }
      ] },
    { id: 'q_sport', phase: 3, field: 'sport', kind: 'enum', options: SPORTS, optional: false,
      prompt: 'Welke sport of trainingsvorm staat bij jou centraal?',
      why: 'Geeft de coach de juiste sportcontext voor je advies.',
      chips: [
        { label: 'CrossFit', value: 'crossfit' }, { label: 'Kracht', value: 'kracht' },
        { label: 'Powerlifting', value: 'powerlifting' }, { label: 'Bodybuilding', value: 'bodybuilding' },
        { label: 'HYROX', value: 'hyrox' }, { label: 'Hardlopen', value: 'hardlopen' },
        { label: 'Functioneel', value: 'functioneel' }, { label: 'Algemeen', value: 'algemeen' }
      ] },
    { id: 'q_coach_style', phase: 3, field: 'coach_style', kind: 'enum', options: COACH_STYLES, optional: false,
      prompt: 'Iedereen vindt een andere manier van coachen prettig. Hoe wil je dat ik met je praat?',
      why: 'Bepaalt alleen de TOON waarin ik advies breng — niet het advies zelf. Dat blijft altijd op je data gebaseerd.',
      chips: [
        { label: 'Gebalanceerd', value: 'balanced' }, { label: 'Direct & doelgericht', value: 'direct' },
        { label: 'Coachend & motiverend', value: 'motivating' }, { label: 'Analytisch & inhoudelijk', value: 'analytical' },
        { label: 'Rustig & ondersteunend', value: 'calm' }, { label: 'Energiek & uitdagend', value: 'energetic' }
      ] },
    { id: 'q_coach_voice', phase: 3, field: 'coach_voice', kind: 'enum', options: COACH_VOICES, optional: false,
      prompt: 'En hoe wil je je coach voor je zien?',
      why: 'Puur een presentatievoorkeur voor je coach — dit gaat niet over jou, alleen over hoe je coach overkomt.',
      chips: [
        { label: 'Vrouw', value: 'female' }, { label: 'Man', value: 'male' },
        { label: 'Neutraal', value: 'neutral' }, { label: 'Zeg ik liever niet', value: 'undisclosed' }
      ] },
    { id: 'q_coach_detail', phase: 3, field: 'coach_detail', kind: 'enum', options: COACH_DETAILS, optional: true,
      prompt: 'Hoeveel uitleg wil je bij mijn advies? (mag je overslaan)',
      why: 'Bepaalt hoe uitgebreid ik dingen toelicht. Puur presentatie.',
      chips: [
        { label: 'Kort', value: 'kort' }, { label: 'Normaal', value: 'normaal' }, { label: 'Uitgebreid', value: 'uitgebreid' }
      ] },
    { id: 'q_secondary', phase: 3, field: 'secondary_goals', kind: 'list', optional: true,
      prompt: 'Heb je nog nevendoelen naast je hoofddoel? (bijv. "eerste pull-up", "mobiliteit heupen" — mag je overslaan)',
      why: 'Elk nevendoel wordt als apart, bij te houden doel opgeslagen in je Doelen.' },

    // FASE 4 — Veiligheid (verplicht om af te ronden)
    { id: 'q_limitations', phase: 4, field: 'limitations', kind: 'list', optional: true,
      prompt: 'Zijn er blessures of lichamelijke aandachtspunten waar ik rekening mee moet houden? (mag je overslaan)',
      why: 'Zodat de coach onveilige oefeningen vermijdt. Opgeslagen als je condities.' },
    { id: 'q_avoid', phase: 4, field: 'avoid_exercises', kind: 'list', optional: true,
      prompt: 'Zijn er specifieke oefeningen die je liever niet doet? (mag je overslaan)',
      why: 'Deze houdt de coach zoveel mogelijk uit je voorstellen.' }
  ];

  function questionById(id) {
    for (var i = 0; i < QUESTIONS.length; i++) if (QUESTIONS[i].id === id) return QUESTIONS[i];
    return null;
  }
  function phaseOf(field) {
    for (var i = 0; i < QUESTIONS.length; i++) if (QUESTIONS[i].field === field) return QUESTIONS[i].phase;
    return null;
  }

  // state = { values:{field:value}, answered:{field:true} }.
  // 'answered' markeert dat een vraag is behandeld (ook als optioneel overgeslagen -> value null).
  function nextQuestion(state) {
    var answered = (state && state.answered) || {};
    var values = (state && state.values) || {};
    for (var i = 0; i < QUESTIONS.length; i++) {
      var q = QUESTIONS[i];
      if (answered[q.field]) continue;
      if (typeof q.include === 'function' && !q.include(values)) continue;
      return q;
    }
    return null;
  }

  // Verplichte velden die nog resteren (voor "kan afronden?"-check).
  function requiredRemaining(state) {
    var answered = (state && state.answered) || {};
    var values = (state && state.values) || {};
    var out = [];
    for (var i = 0; i < QUESTIONS.length; i++) {
      var q = QUESTIONS[i];
      if (q.optional) continue;
      if (typeof q.include === 'function' && !q.include(values)) continue;
      if (!answered[q.field]) out.push(q.field);
    }
    return out;
  }
  function canFinish(state) { return requiredRemaining(state).length === 0; }

  function progress(state) {
    var answered = (state && state.answered) || {};
    var values = (state && state.values) || {};
    var total = 0, done = 0;
    for (var i = 0; i < QUESTIONS.length; i++) {
      var q = QUESTIONS[i];
      if (typeof q.include === 'function' && !q.include(values)) continue;
      total++;
      if (answered[q.field]) done++;
    }
    return { done: done, total: total, pct: total ? Math.round((done / total) * 100) : 0 };
  }

  // ---- Validatie / normalisatie (deterministisch, geen aannames) -------------
  function validateField(field, value) {
    switch (field) {
      case 'naam': {
        var s = normStr(value);
        if (!s) return { ok: false, error: 'Geef een naam op.' };
        if (s.length > 60) s = s.slice(0, 60);
        return { ok: true, value: s };
      }
      case 'primary_goal': {
        var g = lc(value);
        if (PRIMARY_GOALS.indexOf(g) === -1) return { ok: false, error: 'Onbekend doel.' };
        return { ok: true, value: g };
      }
      case 'leeftijd': {
        var a = clampInt(value);
        if (a == null || a < 10 || a > 100) return { ok: false, error: 'Leeftijd tussen 10 en 100.' };
        return { ok: true, value: a };
      }
      case 'lengte': {
        var h = clampInt(value);
        if (h == null || h < 100 || h > 250) return { ok: false, error: 'Lengte tussen 100 en 250 cm.' };
        return { ok: true, value: h };
      }
      case 'geslacht': {
        var sx = lc(value);
        if (sx !== 'man' && sx !== 'vrouw') return { ok: false, error: 'Kies man of vrouw.' };
        return { ok: true, value: sx };
      }
      case 'frequency': {
        var f = clampInt(value);
        if (f == null || f < 1 || f > 14) return { ok: false, error: 'Frequentie tussen 1 en 14 per week.' };
        return { ok: true, value: f };
      }
      case 'duration_min': {
        var d = clampInt(value);
        if (d == null || d < 5 || d > 240) return { ok: false, error: 'Duur tussen 5 en 240 minuten.' };
        return { ok: true, value: d };
      }
      case 'location': {
        var loc = lc(value);
        if (LOCATIONS.indexOf(loc) === -1) return { ok: false, error: 'Kies thuis, gym of hybride.' };
        return { ok: true, value: loc };
      }
      case 'niveau': {
        var lv = lc(value);
        if (LEVELS.indexOf(lv) === -1) return { ok: false, error: 'Onbekend niveau.' };
        return { ok: true, value: lv };
      }
      case 'sport': {
        var sp = lc(value);
        if (SPORTS.indexOf(sp) === -1) return { ok: false, error: 'Onbekende sport.' };
        return { ok: true, value: sp };
      }
      case 'coach_style': {
        var cs = lc(value);
        if (COACH_STYLES.indexOf(cs) === -1) return { ok: false, error: 'Onbekende coachstijl.' };
        return { ok: true, value: cs };
      }
      case 'coach_voice': {
        var cv = lc(value);
        if (COACH_VOICES.indexOf(cv) === -1) return { ok: false, error: 'Onbekende keuze.' };
        return { ok: true, value: cv };
      }
      case 'coach_detail': {
        var cd = lc(value);
        if (COACH_DETAILS.indexOf(cd) === -1) return { ok: false, error: 'Kies kort, normaal of uitgebreid.' };
        return { ok: true, value: cd };
      }
      case 'days': {
        var arr = normList(value).map(lc).filter(function (x) { return DAYS.indexOf(x) !== -1; });
        return { ok: true, value: uniq(arr) };
      }
      case 'equipment':
      case 'secondary_goals':
      case 'limitations':
      case 'avoid_exercises': {
        var list = normList(value).map(normStr).filter(Boolean);
        // Ontdubbel case-insensitive, behoud eerste schrijfwijze.
        return { ok: true, value: uniqByLower(list).slice(0, 20) };
      }
      default:
        return { ok: false, error: 'Onbekend veld.' };
    }
  }

  function normList(value) {
    if (value == null) return [];
    if (Object.prototype.toString.call(value) === '[object Array]') return value;
    // Splits vrije tekst op komma / puntkomma / " en " / nieuwe regel.
    return String(value).split(/[,;\n]|(?:\sen\s)/i);
  }
  function uniq(a) { var seen = {}, o = []; a.forEach(function (x) { if (!seen[x]) { seen[x] = 1; o.push(x); } }); return o; }
  function uniqByLower(a) { var seen = {}, o = []; a.forEach(function (x) { var k = x.toLowerCase(); if (!seen[k]) { seen[k] = 1; o.push(x); } }); return o; }

  // Volledig kandidaatobject valideren -> {valid, errors:{field}, normalized}
  function validateCandidate(cand) {
    cand = cand || {};
    var errors = {}, normalized = {};
    var fields = ['naam', 'primary_goal', 'leeftijd', 'lengte', 'geslacht', 'frequency',
      'days', 'duration_min', 'location', 'equipment', 'niveau', 'sport',
      'coach_style', 'coach_voice', 'coach_detail',
      'secondary_goals', 'limitations', 'avoid_exercises'];
    fields.forEach(function (f) {
      if (!(f in cand) || cand[f] == null || cand[f] === '') { normalized[f] = defaultFor(f); return; }
      var r = validateField(f, cand[f]);
      if (r.ok) normalized[f] = r.value; else { errors[f] = r.error; normalized[f] = defaultFor(f); }
    });
    return { valid: Object.keys(errors).length === 0, errors: errors, normalized: normalized };
  }
  function defaultFor(f) {
    if (f === 'days' || f === 'equipment' || f === 'secondary_goals' || f === 'limitations' || f === 'avoid_exercises') return [];
    return null;
  }

  // ---- Deterministische lokale parser (AI-loze fallback) --------------------
  // Interpreteert een vrij tekstantwoord zonder AI. Geeft {value, confidence}.
  function parseAnswerLocally(field, text) {
    var t = lc(text);
    if (!t) return { value: null, confidence: 0 };
    switch (field) {
      case 'leeftijd':
      case 'lengte':
      case 'frequency':
      case 'duration_min': {
        var m = t.match(/\d{1,3}/);
        if (!m) return { value: null, confidence: 0 };
        var r = validateField(field, m[0]);
        return r.ok ? { value: r.value, confidence: 0.9 } : { value: null, confidence: 0.2 };
      }
      case 'geslacht': {
        if (/\b(man|male|m|jongen|heer)\b/.test(t)) return { value: 'man', confidence: 0.9 };
        if (/\b(vrouw|female|v|f|dame|meisje)\b/.test(t)) return { value: 'vrouw', confidence: 0.9 };
        return { value: null, confidence: 0 };
      }
      case 'primary_goal': {
        if (/kracht|sterk|zwaar|1rm|powerlift/.test(t)) return { value: 'kracht', confidence: 0.8 };
        if (/afval|gewicht kwijt|vet|slank|cut|body ?comp/.test(t)) return { value: 'afvallen', confidence: 0.8 };
        if (/conditie|cardio|uithoud|fit blijv|adem/.test(t)) return { value: 'conditie', confidence: 0.8 };
        if (/prestat|wedstrijd|competit|pr verbeter|sneller|beter presteren/.test(t)) return { value: 'prestatie', confidence: 0.75 };
        if (/algemeen|gezond|fitter|balans/.test(t)) return { value: 'algemeen', confidence: 0.7 };
        return { value: null, confidence: 0 };
      }
      case 'location': {
        if (/thuis|home|garage/.test(t)) return { value: 'thuis', confidence: 0.85 };
        if (/gym|sportschool|fitness/.test(t)) return { value: 'gym', confidence: 0.85 };
        if (/beide|hybride|allebei|zowel/.test(t)) return { value: 'hybride', confidence: 0.85 };
        return { value: null, confidence: 0 };
      }
      case 'niveau': {
        if (/beginner|net begonnen|<\s*1|nieuw/.test(t)) return { value: 'beginner', confidence: 0.8 };
        if (/expert|5\+|veel jaren|zeer ervaren/.test(t)) return { value: 'expert', confidence: 0.8 };
        if (/ervaren|3-5|paar jaar/.test(t)) return { value: 'ervaren', confidence: 0.75 };
        if (/gevorderd|1-3/.test(t)) return { value: 'gevorderd', confidence: 0.75 };
        return { value: null, confidence: 0 };
      }
      case 'sport': {
        for (var i = 0; i < SPORTS.length; i++) if (t.indexOf(SPORTS[i]) !== -1) return { value: SPORTS[i], confidence: 0.8 };
        if (/functionele fitness|functional/.test(t)) return { value: 'functioneel', confidence: 0.75 };
        return { value: null, confidence: 0 };
      }
      case 'days': {
        var map = { ma: /\bma|maandag/, di: /\bdi|dinsdag/, wo: /\bwo|woensdag/, do: /\bdo|donderdag/, vr: /\bvr|vrijdag/, za: /\bza|zaterdag/, zo: /\bzo|zondag/ };
        var days = [];
        DAYS.forEach(function (d) { if (map[d].test(t)) days.push(d); });
        return days.length ? { value: days, confidence: 0.85 } : { value: null, confidence: 0 };
      }
      case 'naam': {
        // Neem de tekst als naam, gestript van beleefdheidsprefix.
        var s = normStr(text).replace(/^(ik ben|ik heet|mijn naam is|het is|dat is)\s+/i, '').replace(/[.!]+$/, '');
        s = s.split(/\s+/)[0]; // voornaam
        return s ? { value: s.charAt(0).toUpperCase() + s.slice(1), confidence: 0.7 } : { value: null, confidence: 0 };
      }
      case 'coach_style': {
        if (/direct|to the point|kort door de bocht|geen omhaal/.test(t)) return { value: 'direct', confidence: 0.8 };
        if (/motiv|coachend|aanmoedig|peptalk|pep/.test(t)) return { value: 'motivating', confidence: 0.8 };
        if (/analyt|inhoudelijk|cijfers|data|uitleg/.test(t)) return { value: 'analytical', confidence: 0.75 };
        if (/rustig|kalm|ondersteun|zacht/.test(t)) return { value: 'calm', confidence: 0.8 };
        if (/energiek|uitdag|pittig|streng|push/.test(t)) return { value: 'energetic', confidence: 0.8 };
        if (/gebalanceerd|balans|neutraal|normaal|maakt niet uit/.test(t)) return { value: 'balanced', confidence: 0.7 };
        return { value: null, confidence: 0 };
      }
      case 'coach_voice': {
        if (/vrouw|female|dame|zij/.test(t)) return { value: 'female', confidence: 0.85 };
        if (/man|male|heer|hij/.test(t)) return { value: 'male', confidence: 0.85 };
        if (/neutraal|genderneutraal|maakt niet uit|geen voorkeur/.test(t)) return { value: 'neutral', confidence: 0.8 };
        if (/liever niet|zeg ik niet|prive|privé|geen antwoord/.test(t)) return { value: 'undisclosed', confidence: 0.8 };
        return { value: null, confidence: 0 };
      }
      case 'coach_detail': {
        if (/kort|beknopt|weinig|snel/.test(t)) return { value: 'kort', confidence: 0.8 };
        if (/uitgebreid|veel|diepgaand|gedetailleerd/.test(t)) return { value: 'uitgebreid', confidence: 0.8 };
        if (/normaal|gemiddeld|standaard/.test(t)) return { value: 'normaal', confidence: 0.75 };
        return { value: null, confidence: 0 };
      }
      case 'equipment':
      case 'secondary_goals':
      case 'limitations':
      case 'avoid_exercises': {
        if (/geen|nee|niks|niets|n\.?v\.?t/.test(t)) return { value: [], confidence: 0.85 };
        var r2 = validateField(field, text);
        return r2.ok && r2.value.length ? { value: r2.value, confidence: 0.6 } : { value: [], confidence: 0.3 };
      }
      default:
        return { value: null, confidence: 0 };
    }
  }

  // ---- TRUE CONVERSATIONAL: multi-field harvest uit één vrije tekst ----------
  // Deterministisch (geen AI). Herkent frequentie/dagen/duur/locatie mét context, plus meerdere
  // doelen. Zo hoeft de coach niet opnieuw te vragen wat de sporter al in één zin vertelde.
  function extractContext(text) {
    var t = lc(text); var o = {};
    // frequentie: "3x", "3 keer", "3x per week", "3 per week"
    var mf = t.match(/(\d+)\s*(?:x|keer|maal)\s*(?:per\s*week|\/\s*week|pw|per\s*wk)?/) || t.match(/(\d+)\s*(?:per\s*week|\/\s*week|pw)/);
    if (mf) { var fn = parseInt(mf[1], 10); if (fn >= 1 && fn <= 14) o.frequency = fn; }
    // dagen: in vrije tekst UITSLUITEND volledige dagnamen (afkortingen als 'zo'/'ma' zijn
    // te dubbelzinnig — die blijven werken bij de directe dagen-vraag via parseAnswerLocally/chips).
    var dayFull = { ma: /maandag/, di: /dinsdag/, wo: /woensdag/, do: /donderdag/, vr: /vrijdag/, za: /zaterdag/, zo: /zondag/ };
    var days = []; DAYS.forEach(function (k) { if (dayFull[k].test(t)) days.push(k); });
    // Afkortings-CLUSTER: ≥2 opeenvolgende dag-afkortingen ("ma wo vr", "ma, wo, vr", "ma en wo").
    // Een losse afkorting (bv. 'zo' in "zo goed") wordt bewust NIET herkend.
    var clusterRe = /\b(?:ma|di|wo|do|vr|za|zo)\b(?:\s*(?:,|\/|&|en)?\s*\b(?:ma|di|wo|do|vr|za|zo)\b)+/g;
    var cm; while ((cm = clusterRe.exec(t))) { (cm[0].match(/\b(?:ma|di|wo|do|vr|za|zo)\b/g) || []).forEach(function (x) { if (days.indexOf(x) < 0) days.push(x); }); }
    if (days.length) o.days = DAYS.filter(function (k) { return days.indexOf(k) >= 0; }); // canonieke volgorde
    // duur: minuten of uren (contextueel, niet "eerste getal")
    // F55/F56: ambigue duur ("60 of soms 90 minuten", "60/90 min") NIET stil vastleggen —
    // anders pakte de regex het laatste getal (90). Markeer duration_ambiguous zodat de coach
    // kan verduidelijken i.p.v. te gokken. Alleen bij twee plausibele duur-getallen (20–240)
    // met een min/uur-context, zodat "3 of 4 keer" e.d. niet meetellen.
    var amb = t.match(/(\d{2,3})\s*(?:of|\/|à|tot)\s*(?:soms\s*|ongeveer\s*|zo'?n\s*)?(\d{2,3})/);
    var ambA = amb ? parseInt(amb[1], 10) : 0, ambB = amb ? parseInt(amb[2], 10) : 0;
    var ambDur = !!amb && ambA >= 20 && ambB >= 20 && ambA <= 240 && ambB <= 240 && ambA !== ambB && /(min\b|minuten|minuut|uur)/.test(t);
    if (ambDur) {
      o.duration_ambiguous = { a: Math.min(ambA, ambB), b: Math.max(ambA, ambB) };
    } else {
      var md = t.match(/(\d+)\s*(?:min\b|minuten|minuut)/);
      if (md) { o.duration_min = parseInt(md[1], 10); }
      else {
        var mh = t.match(/(\d+(?:[.,]5)?)\s*uur/);
        if (mh) { o.duration_min = Math.round(parseFloat(mh[1].replace(',', '.')) * 60); }
        else if (/anderhalf\s*uur/.test(t)) o.duration_min = 90;
        else if (/half\s*uur|halfuur/.test(t)) o.duration_min = 30;
        else if (/\been\s*uur|\b1\s*uur|uurtje/.test(t)) o.duration_min = 60;
      }
    }
    // locatie incl. bekende gym-namen
    var loc = parseAnswerLocally('location', text);
    if (loc.value) o.location = loc.value;
    else if (/basic[- ]?fit|fit\s?for\s?free|sportschool|health\s?city|anytime\s?fitness|snap\s?fitness|clubfit|fitland|david\s?lloyd/.test(t)) o.location = 'gym';
    return o;
  }

  // Meerdere doelen uit één zin. primary = eerste enum-match; secondary = overige enum-matches
  // (leesbaar) + expliciete niet-enum-doelen zoals "spiermassa". Geen duplicaat-bron: secondary
  // wordt later als losse goals-records opgeslagen.
  function extractGoals(text) {
    var t = lc(text);
    var order = [
      ['kracht', /kracht|sterker|sterk worden|zwaarder|1rm|powerlift/],
      ['afvallen', /afval|vet\b|slank|cut\b|gewicht kwijt|droog/],
      ['conditie', /conditie|cardio|uithoud|fit blijv|fitter|adem/],
      ['prestatie', /prestat|wedstrijd|competit|sneller|beter presteren/],
      ['algemeen', /algemeen|gezond|balans|onderhoud/]
    ];
    var matched = [];
    order.forEach(function (p) { if (p[1].test(t)) matched.push(p[0]); });
    var out = { primary_goal: null, secondary_goals: [] };
    if (matched.length) {
      out.primary_goal = matched[0];
      for (var i = 1; i < matched.length; i++) out.secondary_goals.push(GOAL_LABEL[matched[i]] || matched[i]);
    }
    // expliciete hypertrofie/spiermassa is geen primary-enum -> als nevendoel
    if (/spiermassa|spieren opbouw|hypertrof|massa opbouw/.test(t)) out.secondary_goals.push('Spiermassa opbouwen');
    out.secondary_goals = uniqByLower(out.secondary_goals);
    return out;
  }

  // Verzamel ALLE nog-niet-beantwoorde velden die deze tekst betrouwbaar oplevert.
  // Geeft {field: value} met gevalideerde waarden. Respecteert branching (apparatuur alleen
  // relevant bij thuis/hybride — daarom niet auto-geharvest). Numerieke ambiguïteit is
  // afgevangen door contextuele regexes + validatie.
  function harvest(text, state) {
    var answered = (state && state.answered) || {};
    var out = {};
    var ctx = extractContext(text);
    ['frequency', 'days', 'duration_min', 'location'].forEach(function (f) {
      if (answered[f]) return;
      if (ctx[f] == null) return;
      var r = validateField(f, ctx[f]);
      if (r.ok && !(Object.prototype.toString.call(r.value) === '[object Array]' && r.value.length === 0)) out[f] = r.value;
    });
    if (!answered.primary_goal || !answered.secondary_goals) {
      var g = extractGoals(text);
      if (!answered.primary_goal && g.primary_goal) out.primary_goal = g.primary_goal;
      if (!answered.secondary_goals && g.secondary_goals.length) out.secondary_goals = g.secondary_goals;
    }
    // F62/2B — equipment uit vrije tekst (bv. "dumbbells en een kettlebell thuis maar geen barbell").
    if (!answered.equipment) {
      var eqp = extractEquipment(text);
      if (eqp.length) { var re1 = validateField('equipment', eqp); if (re1.ok && re1.value.length) out.equipment = re1.value; }
    }
    // F62/2C — te vermijden oefeningen uit vrije tekst (bv. "wil geen burpees").
    if (!answered.avoid_exercises) {
      var av = extractAvoid(text);
      if (av.length) { var re2 = validateField('avoid_exercises', av); if (re2.ok && re2.value.length) out.avoid_exercises = re2.value; }
    }
    // F56: geef ambigue duur door zodat de intake een verduidelijkingsvraag kan stellen i.p.v. gokken.
    if (!answered.duration_min && ctx.duration_ambiguous) out.duration_ambiguous = ctx.duration_ambiguous;
    return out;
  }
  // F56: nette verduidelijkingsvraag bij een ambigue duur (coach verwoordt; geen berekening).
  function durationClarifyText(amb) {
    if (!amb || amb.a == null || amb.b == null) return null;
    return 'Wat is meestal je normale trainingstijd: ongeveer ' + amb.a + ' of ' + amb.b + ' minuten?';
  }

  // ---- CONVERSATIONAL CORRECTION ENGINE (deterministisch, geen AI-waarheid) --
  // Herkent natuurlijke correcties en geeft veld-mutaties terug (set/add/remove). Wijzigt NOOIT
  // zelf state; de UI past `applyMutations` toe. Bij een correctie-intentie zonder herkenbaar veld
  // → `clarify` (nooit gokken). Geen data verwijderen zonder duidelijke intentie.
  var DAY_FULL = { maandag: 'ma', dinsdag: 'di', woensdag: 'wo', donderdag: 'do', vrijdag: 'vr', zaterdag: 'za', zondag: 'zo' };
  var EQUIP_TERMS = [
    ['barbell', /barbell|halterstang|lange halter/],
    ['dumbbells', /dumbbell|dumbbells|halters\b/],
    ['kettlebell', /kettlebell|kettle/],
    ['rack', /\brack\b|\brek\b|squat\s?rack/],
    ['pullup_bar', /pull-?up\s?bar|optrekstang/],
    ['bench', /\bbank\b|\bbench\b/],
    ['bands', /weerstandsband|weerstandsbanden|\bbanden\b|\bband\b/],
    ['machines', /\bmachine\b|\bmachines\b|apparaten/],
    ['bodyweight', /lichaamsgewicht|bodyweight|eigen gewicht/]
  ];
  function equipFromText(t) { for (var i = 0; i < EQUIP_TERMS.length; i++) if (EQUIP_TERMS[i][1].test(t)) return EQUIP_TERMS[i][0]; return null; }
  // F62/2B — deterministische equipment-extractie uit vrije tekst. ALLE bekende termen
  // (EQUIP_TERMS = dezelfde vocab als de chips), maar een ONTKENDE term ("geen barbell",
  // "zonder kettlebell") telt NIET als aanwezig. Geen fuzzy: onbekende woorden → niets.
  function extractEquipment(text) {
    var t = lc(text); var have = [];
    EQUIP_TERMS.forEach(function (pair) {
      var slug = pair[0], re = pair[1];
      if (!re.test(t)) return;
      var neg = new RegExp('(?:geen|zonder|niet)\\s+(?:een\\s+|meer\\s+)?(?:' + re.source + ')');
      if (neg.test(t)) return; // ontkend → niet 'aanwezig'
      if (have.indexOf(slug) < 0) have.push(slug);
    });
    return have;
  }
  // F62/2C — deterministische avoid-extractie (te vermijden OEFENINGEN) uit vrije tekst.
  // Conservatief: UITSLUITEND bij een expliciet vermijd-werkwoord ("wil geen", "vermijd", …),
  // NIET bij het losse "geen" (dat is te dubbelzinnig — dat pad is voor equipment). Equipment-
  // termen en stopwoorden tellen niet mee. Ruwe termen; AthleteConstraints doet later de
  // exact/alias/ambigu-match (GEEN fuzzy identity hier).
  var AVOID_STOP = /^(tijd|zin|idee|geld|vaste|dag|dagen|barbell|dumbbell|dumbbells|kettlebell|kettle|rack|rek|bank|bench|band|banden|machine|machines|apparaten|halters|last|pijn|blessure|blessures|probleem|zin|haast)$/;
  function extractAvoid(text) {
    var t = lc(text); var out = [];
    var re = /(?:vermijd|liever geen|wil geen|kan geen|mag geen|doe geen|nooit|haat)\s+([a-z][a-z\- ]{2,30}?)(?=[.,;!]|\s+(?:en|maar|omdat|want|meer|graag|thuis|op|in|bij)\b|$)/g;
    var m;
    while ((m = re.exec(t))) {
      var term = m[1].trim().replace(/\s+/g, ' ');
      var first = term.split(' ')[0];
      if (AVOID_STOP.test(first)) continue;   // stopwoord/equipment → geen oefening-avoid
      if (equipFromText(term)) continue;       // matcht equipment → geen oefening
      out.push(term);
    }
    return uniqByLower(out).slice(0, 10);
  }
  function goalKeyFromText(t) {
    if (/kracht|sterker|sterk worden|zwaarder|1rm|powerlift/.test(t)) return 'kracht';
    if (/afval|vet\b|slank|cut\b|gewicht kwijt|droog/.test(t)) return 'afvallen';
    if (/conditie|cardio|uithoud|fit blijv|fitter|adem/.test(t)) return 'conditie';
    if (/prestat|wedstrijd|competit|sneller|beter presteren/.test(t)) return 'prestatie';
    if (/algemeen|gezond|balans|onderhoud/.test(t)) return 'algemeen';
    return null;
  }
  function fullDaysIn(t) { var o = []; for (var name in DAY_FULL) if (Object.prototype.hasOwnProperty.call(DAY_FULL, name) && new RegExp(name).test(t)) o.push(DAY_FULL[name]); return o; }

  function parseCorrection(text, state) {
    var t = lc(text);
    var CORR = /(klopt niet|niet meer|eigenlijk|\btoch\b|verander|wijzig|\bvoeg\b|erbij|\bweg\b|\bgeen\b|\bwel\b|\bniet\b|\book\b|verwijder|schrap|haal)/;
    if (!CORR.test(t)) return null; // geen correctie-intentie
    var muts = [];

    // DAGEN
    var DY = '(maandag|dinsdag|woensdag|donderdag|vrijdag|zaterdag|zondag)';
    var mNiet = t.match(new RegExp('niet\\s+' + DY + '\\s+maar\\s+' + DY));
    // F62/2D — "(toch) X in plaats van Y" / "X ipv Y" → voeg X toe, verwijder Y.
    var mIPV = t.match(new RegExp('(?:toch\\s+)?' + DY + '\\s+(?:in\\s*plaats\\s*van|i\\.?p\\.?v\\.?)\\s+' + DY));
    if (mNiet) { muts.push({ field: 'days', op: 'remove', value: DAY_FULL[mNiet[1]] }); muts.push({ field: 'days', op: 'add', value: DAY_FULL[mNiet[2]] }); }
    else if (mIPV) { muts.push({ field: 'days', op: 'add', value: DAY_FULL[mIPV[1]] }); muts.push({ field: 'days', op: 'remove', value: DAY_FULL[mIPV[2]] }); }
    else {
      var dl = fullDaysIn(t);
      if (dl.length) {
        if (/voeg|erbij|\book\b/.test(t) && !/niet|weg|geen|verwijder|schrap|haal/.test(t)) dl.forEach(function (d) { muts.push({ field: 'days', op: 'add', value: d }); });
        else if (/niet meer|\bniet\b|\bweg\b|zonder|verwijder|schrap|haal/.test(t)) dl.forEach(function (d) { muts.push({ field: 'days', op: 'remove', value: d }); });
      }
    }

    // Binnen correctie-context: hergebruik de geteste contextuele extractor voor de scalaire velden.
    var ctx = extractContext(t);
    if (ctx.frequency != null) muts.push({ field: 'frequency', op: 'set', value: ctx.frequency });
    if (ctx.duration_min != null && ctx.duration_min >= 5 && ctx.duration_min <= 240) muts.push({ field: 'duration_min', op: 'set', value: ctx.duration_min });
    if (ctx.location) muts.push({ field: 'location', op: 'set', value: ctx.location });
    // "verander mijn trainingsdagen naar di do" -> set (alleen bij expliciet verander/wijzig zonder add/remove)
    if (/verander|wijzig/.test(t) && ctx.days && ctx.days.length && !muts.some(function (m) { return m.field === 'days'; })) muts.push({ field: 'days', op: 'set', value: ctx.days });

    // DOELEN
    if (/(?:hoofddoel|mijn doel|doel is)\D{0,12}/.test(t)) { var pg = goalKeyFromText(t); if (pg) muts.push({ field: 'primary_goal', op: 'set', value: pg }); }
    if (/\book\b|erbij|daarnaast|secundair|nevendoel/.test(t)) {
      var sg = goalKeyFromText(t);
      if (sg && !(muts.some(function (m) { return m.field === 'primary_goal' && m.value === sg; }))) muts.push({ field: 'secondary_goals', op: 'add', value: GOAL_LABEL[sg] || sg });
    }

    // EQUIPMENT ("geen barbell" -> remove ; "toch wel een rack"/"ik heb een rack" -> add)
    var eq = equipFromText(t);
    if (eq) {
      if (/\bgeen\b|niet meer|verwijder|zonder|weg\b/.test(t)) muts.push({ field: 'equipment', op: 'remove', value: eq });
      else if (/\bwel\b|\btoch\b|\bheb\b|erbij|\bvoeg\b/.test(t)) muts.push({ field: 'equipment', op: 'add', value: eq });
    }

    if (!muts.length) {
      // Correctie-intentie herkend maar geen concreet veld → verduidelijking, geen gok.
      return { mutations: [], clarify: 'Ik pas het graag aan — wat precies? Bijvoorbeeld: "niet maandag maar dinsdag", "ik train toch 4x", of "ik heb geen barbell".' };
    }
    return { mutations: muts };
  }

  function applyMutations(cand, mutations) {
    var out = {}; for (var k in cand) if (Object.prototype.hasOwnProperty.call(cand, k)) out[k] = cand[k];
    (mutations || []).forEach(function (m) {
      if (m.op === 'set') { out[m.field] = m.value; return; }
      var arr = (Object.prototype.toString.call(out[m.field]) === '[object Array]') ? out[m.field].slice() : [];
      if (m.op === 'add') {
        if (m.field === 'secondary_goals') { if (!arr.some(function (x) { return String(x).toLowerCase() === String(m.value).toLowerCase(); })) arr.push(m.value); }
        else if (arr.indexOf(m.value) < 0) arr.push(m.value);
        out[m.field] = (m.field === 'days') ? DAYS.filter(function (k) { return arr.indexOf(k) >= 0; }) : arr;
      } else if (m.op === 'remove') {
        out[m.field] = arr.filter(function (x) { return x !== m.value; });
      }
    });
    return out;
  }

  // ---- Natuurlijke, stijl-bewuste bevestiging (geen "Genoteerd: 60") ---------
  function valuePhrase(field, value) {
    switch (field) {
      case 'naam': return String(value);
      case 'primary_goal': return (GOAL_LABEL[value] || value);
      case 'leeftijd': return value + ' jaar';
      case 'lengte': return value + ' cm';
      case 'geslacht': return String(value);
      case 'frequency': return value + 'x per week';
      case 'days': return (value && value.length) ? value.join('/') : 'geen vaste dagen';
      case 'duration_min': return value + ' min per sessie';
      case 'location': return String(value);
      case 'niveau': return (LEVEL_LABEL[value] || value);
      case 'sport': return String(value);
      case 'equipment': case 'secondary_goals': case 'limitations': case 'avoid_exercises':
        return (value && value.length) ? value.join(', ') : 'niets';
      default: return (value == null ? '' : String(value));
    }
  }
  function ackText(field, value, style) {
    if (COACH_STYLES.indexOf(style) === -1) style = 'balanced';
    var isEmptyList = (Object.prototype.toString.call(value) === '[object Array]' && value.length === 0);
    if (value == null || value === '' || isEmptyList) {
      switch (style) {
        case 'direct': return 'Oké, overgeslagen.';
        case 'energetic': return 'Prima, slaan we over!';
        default: return 'Prima, dat slaan we over.';
      }
    }
    var ph = valuePhrase(field, value);
    switch (style) {
      case 'direct': return ph + '.';
      case 'motivating': return ph + ' — top!';
      case 'analytical': return ph + ' — genoteerd.';
      case 'calm': return ph + ' — helder.';
      case 'energetic': return ph + ' — mooi!';
      default: return ph + ' — genoteerd.';
    }
  }

  // ---- AI-extractie: prompt + verwacht schema (AI structureert, rekent niet) -
  function buildExtractionPrompt(question) {
    var q = typeof question === 'string' ? questionById(question) : question;
    if (!q) return '';
    var lines = [
      'Je bent de intake-assistent van TrainingKompas. Je taak is UITSLUITEND het structureren van',
      'het antwoord van de sporter op één specifieke vraag. Je REKENT niet, je adviseert niet, je',
      'verzint niets. Antwoord ALLEEN met geldige JSON, zonder extra tekst.',
      '',
      'Vraag aan de sporter: "' + q.prompt + '"',
      'Te extraheren veld: "' + q.field + '" (type: ' + q.kind + ').'
    ];
    if (q.options) lines.push('Toegestane waarden: ' + q.options.join(', ') + '. Kies de best passende, of null als onduidelijk.');
    if (q.kind === 'int') lines.push('Geef een geheel getal, of null als er geen duidelijk getal is.');
    if (q.kind === 'multiselect' || q.kind === 'list') lines.push('Geef een array van waarden. Lege array als de sporter "geen/nee" zegt.');
    lines.push('');
    lines.push('Output-JSON: {"value": <waarde of null>, "confidence": <0..1>, "note": <korte string of null>}.');
    lines.push('Zet confidence laag (<0.5) en value null als je het niet zeker weet — dan vragen we opnieuw.');
    return lines.join('\n');
  }
  function extractionSchemaHint() {
    return { value: null, confidence: 0, note: null };
  }

  // ---- Mapping kandidaat -> BESTAANDE tabellen (puur, geen DB-call) ----------
  // atleet_profiel: kernprofiel (bestaande kolommen). Behoudt bestaande 'klasse'.
  function toAtleet(cand, base) {
    var out = {};
    if (base) for (var k in base) if (Object.prototype.hasOwnProperty.call(base, k)) out[k] = base[k];
    if (cand.naam != null) out.naam = cand.naam;
    if (cand.leeftijd != null) out.leeftijd = cand.leeftijd;
    if (cand.geslacht != null) out.geslacht = cand.geslacht;
    if (cand.lengte != null) out.lengte = cand.lengte;
    if (cand.niveau != null) out.niveau = cand.niveau;
    if (cand.sport != null) out.sport = cand.sport;
    if (cand.primary_goal != null) out.doel = cand.primary_goal;
    return out;
  }
  // training_context: uitsluitend de genuinely ontbrekende trainingscontext.
  function toTrainingContextRow(cand, userId) {
    return {
      user_id: userId,
      frequency: cand.frequency != null ? cand.frequency : null,
      days: cand.days && cand.days.length ? cand.days : null,
      duration_min: cand.duration_min != null ? cand.duration_min : null,
      location: cand.location != null ? cand.location : null,
      equipment: cand.equipment && cand.equipment.length ? cand.equipment : null,
      avoid_exercises: cand.avoid_exercises && cand.avoid_exercises.length ? cand.avoid_exercises : null
    };
  }
  // Secundaire doelen -> aparte records in de bestaande 'goals'-tabel (type 'eigen').
  function toSecondaryGoals(cand, userId) {
    var list = (cand.secondary_goals || []);
    return list.map(function (naam) {
      return { type: 'eigen', naam: naam, status: 'actief', user_id: userId };
    });
  }
  // Coach-presentatievoorkeuren -> plat object (UI bewaart dit device-lokaal; geen schemawijziging,
  // geen tweede source of truth voor sportdata). GEEN genderidentiteit: coach_voice = coach-aanspreekvorm.
  function toCoachPrefs(cand) {
    return {
      coach_style: (cand.coach_style != null) ? cand.coach_style : 'balanced',
      coach_voice: (cand.coach_voice != null) ? cand.coach_voice : 'neutral',
      coach_detail: (cand.coach_detail != null) ? cand.coach_detail : 'normaal'
    };
  }

  // Beperkingen -> records in de bestaande 'athlete_conditions'-tabel (user_id via DB-trigger).
  function toConditions(cand) {
    var list = (cand.limitations || []);
    return list.map(function (label, i) {
      return { label: label, active: true, sort_order: i };
    });
  }

  // ---- Samenvatting "Dit heb ik van je begrepen" (bewerkbaar) ---------------
  function summaryLines(cand) {
    cand = cand || {};
    function j(a) { return (a && a.length) ? a.join(', ') : '—'; }
    return [
      { field: 'naam', label: 'Naam', value: cand.naam || '—' },
      { field: 'primary_goal', label: 'Hoofddoel', value: GOAL_LABEL[cand.primary_goal] || '—' },
      { field: 'leeftijd', label: 'Leeftijd', value: cand.leeftijd != null ? (cand.leeftijd + ' jaar') : '—' },
      { field: 'lengte', label: 'Lengte', value: cand.lengte != null ? (cand.lengte + ' cm') : '—' },
      { field: 'geslacht', label: 'Geslacht', value: cand.geslacht || '—' },
      { field: 'frequency', label: 'Frequentie', value: cand.frequency != null ? (cand.frequency + 'x per week') : '—' },
      { field: 'days', label: 'Dagen', value: j(cand.days) },
      { field: 'duration_min', label: 'Sessieduur', value: cand.duration_min != null ? (cand.duration_min + ' min') : '—' },
      { field: 'location', label: 'Locatie', value: cand.location || '—' },
      { field: 'equipment', label: 'Apparatuur', value: j(cand.equipment) },
      { field: 'niveau', label: 'Niveau', value: LEVEL_LABEL[cand.niveau] || cand.niveau || '—' },
      { field: 'sport', label: 'Sport', value: cand.sport || '—' },
      { field: 'coach_style', label: 'Coachstijl', value: COACH_STYLE_LABEL[cand.coach_style] || '—' },
      { field: 'coach_voice', label: 'Coach', value: COACH_VOICE_LABEL[cand.coach_voice] || '—' },
      { field: 'coach_detail', label: 'Uitleg', value: COACH_DETAIL_LABEL[cand.coach_detail] || '—' },
      { field: 'secondary_goals', label: 'Nevendoelen', value: j(cand.secondary_goals) },
      { field: 'limitations', label: 'Aandachtspunten', value: j(cand.limitations) },
      { field: 'avoid_exercises', label: 'Te vermijden', value: j(cand.avoid_exercises) }
    ];
  }

  // Compacte, feitelijke samenvatting van training_context voor de AI-coachcontext.
  // Puur tekst: de AI LEEST dit als context (frequentie/dagen/duur/locatie/materiaal/vermijden),
  // maar rekent er niet mee en het is geen bron van waarheid voor berekeningen.
  function contextSummary(tc) {
    if (!tc) return '';
    var parts = [];
    if (tc.frequency != null) parts.push(tc.frequency + 'x per week');
    if (tc.days && tc.days.length) parts.push('dagen: ' + tc.days.join('/'));
    if (tc.duration_min != null) parts.push(tc.duration_min + ' min per sessie');
    if (tc.location) parts.push('locatie: ' + tc.location);
    if (tc.equipment && tc.equipment.length) parts.push('materiaal: ' + tc.equipment.join(', '));
    if (tc.avoid_exercises && tc.avoid_exercises.length) parts.push('te vermijden: ' + tc.avoid_exercises.join(', '));
    return parts.join(' · ');
  }

  var OnboardingCore = {
    VERSION: VERSION,
    contextSummary: contextSummary,
    PRIMARY_GOALS: PRIMARY_GOALS, LEVELS: LEVELS, SPORTS: SPORTS, LOCATIONS: LOCATIONS, DAYS: DAYS,
    COACH_STYLES: COACH_STYLES, COACH_VOICES: COACH_VOICES, COACH_DETAILS: COACH_DETAILS,
    GOAL_LABEL: GOAL_LABEL, LEVEL_LABEL: LEVEL_LABEL,
    COACH_STYLE_LABEL: COACH_STYLE_LABEL, COACH_VOICE_LABEL: COACH_VOICE_LABEL, COACH_DETAIL_LABEL: COACH_DETAIL_LABEL,
    toCoachPrefs: toCoachPrefs,
    QUESTIONS: QUESTIONS,
    questionById: questionById,
    phaseOf: phaseOf,
    nextQuestion: nextQuestion,
    requiredRemaining: requiredRemaining,
    canFinish: canFinish,
    progress: progress,
    validateField: validateField,
    validateCandidate: validateCandidate,
    parseAnswerLocally: parseAnswerLocally,
    extractContext: extractContext,
    extractGoals: extractGoals,
    extractEquipment: extractEquipment,
    extractAvoid: extractAvoid,
    harvest: harvest,
    durationClarifyText: durationClarifyText,
    parseCorrection: parseCorrection,
    applyMutations: applyMutations,
    valuePhrase: valuePhrase,
    ackText: ackText,
    buildExtractionPrompt: buildExtractionPrompt,
    extractionSchemaHint: extractionSchemaHint,
    toAtleet: toAtleet,
    toTrainingContextRow: toTrainingContextRow,
    toSecondaryGoals: toSecondaryGoals,
    toConditions: toConditions,
    summaryLines: summaryLines
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = OnboardingCore; }
  if (global) { global.OnboardingCore = OnboardingCore; }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
