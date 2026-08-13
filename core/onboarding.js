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

  var GOAL_LABEL = {
    kracht: 'Kracht opbouwen', conditie: 'Conditie verbeteren',
    afvallen: 'Afvallen / lichaamscompositie', prestatie: 'Sportprestatie verbeteren',
    algemeen: 'Algemene fitheid'
  };
  var LEVEL_LABEL = {
    beginner: 'Beginner (<1 jaar)', gevorderd: 'Gevorderd (1-3 jaar)',
    ervaren: 'Ervaren (3-5 jaar)', expert: 'Expert (5+ jaar)'
  };

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
      { field: 'secondary_goals', label: 'Nevendoelen', value: j(cand.secondary_goals) },
      { field: 'limitations', label: 'Aandachtspunten', value: j(cand.limitations) },
      { field: 'avoid_exercises', label: 'Te vermijden', value: j(cand.avoid_exercises) }
    ];
  }

  var OnboardingCore = {
    VERSION: VERSION,
    PRIMARY_GOALS: PRIMARY_GOALS, LEVELS: LEVELS, SPORTS: SPORTS, LOCATIONS: LOCATIONS, DAYS: DAYS,
    GOAL_LABEL: GOAL_LABEL, LEVEL_LABEL: LEVEL_LABEL,
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
