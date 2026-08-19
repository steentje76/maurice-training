/* ==========================================================================
 * TrainingKompas — UNIFIED ATHLETE INTELLIGENCE  (Sprint 21)
 * --------------------------------------------------------------------------
 * Contracten: athlete.v1 · load.v1 · performance_index.v1
 *
 * WAAROM DEZE LAAG BESTAAT
 * Trainingskompas bewaart per sessie: welke oefening, hoeveel sets, hoeveel reps,
 * welk gewicht, welke RPE, en voor cardio afstand en tijd. Elk scherm rekende daar
 * tot nu toe zijn eigen dagtotaal uit. Deze laag maakt daar EEN dagbeeld van, zodat
 * "wat heb ik gisteren gedaan" overal hetzelfde antwoord geeft — en zodat de
 * Relationship Engine trainingsreeksen krijgt om mee te werken.
 *
 * WAT HIER BEWUST NIET GEBEURT — en dat is het belangrijkste ontwerpbesluit
 * Er komt GEEN enkel getal dat kracht en cardio bij elkaar optelt. De gangbare
 * manier om dat te doen is sessie-RPE maal duur (Foster). Trainingskompas slaat
 * duur niet op: de sessions-tabel heeft geen duurkolom, alleen time_str bij cardio
 * (13 van de 112 sessies). Een getal dat kilo's en minuten optelt zou een eenheid
 * suggereren die niet bestaat. Daarom levert unifiedLoad() bewust null met
 * reason 'geen_gemeenschappelijke_eenheid' en een expliciete `ontbreekt`-lijst.
 * Zodra er een duur per sessie wordt opgeslagen kan die functie zonder verdere
 * wijzigingen wel een getal geven — de plek is er, hij vult zich alleen niet met
 * een aanname. Dat is het verschil tussen ontbrekende data en een verzonnen getal.
 *
 * WAT HIER WEL GEBEURT
 *   - per dag, per modaliteit: tonnage, sets, gewogen RPE, afstand, tijd
 *   - rollende reeksen: weekbelasting, belasting van de dag ervoor, frequentie
 *   - monotonie (Foster) over EEN eenheid, nooit over een mengsel
 *   - acuut/chronisch (ACWR) met een expliciete ondergrens
 *   - prestatie-index: prestatie ten opzichte van je EIGEN recente niveau voor
 *     DEZELFDE oefening, want een e1RM van bankdrukken en van squat zijn niet
 *     optelbaar en al helemaal niet vergelijkbaar
 *
 * MULTI-SPORT
 * De modaliteit van een sessie wordt afgeleid, niet aangenomen, en de sportcontext
 * komt uit het BESTAANDE SportDefinitionCore. Er wordt hier geen tweede sportenlijst
 * aangelegd. Een atleet kan meerdere modaliteiten op een dag hebben; die blijven
 * naast elkaar staan in plaats van in elkaar geschoven te worden.
 *
 * PUUR EN DETERMINISTISCH. Geen Date.now(), geen Math.random(), geen DOM, geen
 * netwerk. Rekenregels worden ingespoten of hergebruikt uit CalcCore.
 * ========================================================================== */
(function (global) {
  'use strict';

  var ATHLETE_VERSIE = 'athlete.v1';
  var LOAD_VERSIE = 'load.v1';
  var PERFINDEX_VERSIE = 'performance_index.v1';

  /* ────────────────────────────────────────────────────────────────────────
   * MODALITEITEN
   * Niet "sporten" maar "manieren van belasten": zij bepalen in welke EENHEID
   * een sessie meetelt. Twee sessies met dezelfde eenheid zijn optelbaar, twee
   * met verschillende eenheden niet. Dat is de hele regel.
   * ──────────────────────────────────────────────────────────────────────── */
  var MODALITEITEN = {
    strength: { key: 'strength', label: 'Kracht',      eenheid: 'kg',  optelbaar: true },
    cardio:   { key: 'cardio',   label: 'Cardio',      eenheid: 'm',   optelbaar: true },
    overig:   { key: 'overig',   label: 'Overig',      eenheid: null,  optelbaar: false }
  };

  function _num(v) {
    if (typeof v === 'number') return isFinite(v) ? v : null;
    if (typeof v === 'string') {
      var t = v.trim();
      if (!t || !/^[-+]?\d*\.?\d+$/.test(t)) return null;
      var x = Number(t);
      return isFinite(x) ? x : null;
    }
    return null;
  }
  function _ymd(v) { return (v == null) ? null : String(v).slice(0, 10); }

  /* Modaliteit van EEN sessie. Volgorde is bewust: eerst kijken of er kracht-invoer
   * is (sets/reps/gewicht), dan of er cardio-invoer is (afstand/tijd). Een sessie
   * zonder beide is 'overig' en telt nergens in mee — hij verdwijnt niet, hij wordt
   * alleen niet bij iets opgeteld waar hij niet bij hoort. */
  function modaliteitVan(sessie) {
    var s = sessie || {};
    var sets = _num(s.sets), reps = _num(s.reps), kg = _num(s.weight);
    if (sets != null && sets > 0 && reps != null && reps > 0 && kg != null && kg > 0) return 'strength';
    var afstand = _num(s.distance), tijd = _num(s.pace_sec), cal = _num(s.calories);
    if ((afstand != null && afstand > 0) || (tijd != null && tijd > 0) || (cal != null && cal > 0)) return 'cardio';
    return 'overig';
  }

  /* ────────────────────────────────────────────────────────────────────────
   * SESSIEBELASTING (load.v1)
   *
   * Kracht: tonnage = sets x reps x gewicht. Die formule staat in CalcCore
   * (volume.v1) en wordt daar aangeroepen — er komt hier geen zevende kopie bij.
   * Is er een RPE, dan wordt de tonnage gewogen met rpe/10: een set op RPE 9 belast
   * zwaarder dan dezelfde set op RPE 6. De weging staat expliciet in de uitkomst
   * (`gewogen: true/false`) zodat nooit onduidelijk is of hij is toegepast.
   *
   * Cardio: afstand in meters. Geen omrekening naar kilo's, geen "equivalent volume".
   * ──────────────────────────────────────────────────────────────────────── */
  var RPE_MAX = 10;
  /* Basis waarop een cardio-split wordt uitgedrukt: seconden per 500 meter, de conventie
     die de app overal al gebruikt (roeien/skierg/bikeerg). Geen nieuwe eenheid. */
  var SPLIT_BASIS_M = 500;
  function sessionLoad(sessie, deps) {
    var s = sessie || {}, d = deps || {};
    var mod = modaliteitVan(s);
    var basis = { versie: LOAD_VERSIE, modaliteit: mod, eenheid: MODALITEITEN[mod].eenheid,
                  waarde: null, gewogen: false, rpe: null, sets: null, reden: 'geen_invoer' };
    var rpe = _num(s.rpe);
    if (rpe != null && (rpe <= 0 || rpe > RPE_MAX)) rpe = null;   // buiten de schaal telt niet mee

    if (mod === 'strength') {
      var sets = _num(s.sets), reps = _num(s.reps), kg = _num(s.weight);
      var volume = (typeof d.calculateVolume === 'function')
        ? d.calculateVolume({ sets: sets, reps: reps, weight: kg })
        : null;
      if (volume == null || !isFinite(volume)) { basis.reden = 'volume_niet_berekenbaar'; return basis; }
      var waarde = (rpe != null) ? (volume * rpe / RPE_MAX) : volume;
      return { versie: LOAD_VERSIE, modaliteit: 'strength', eenheid: 'kg',
               waarde: Math.round(waarde * 10) / 10, gewogen: rpe != null, rpe: rpe,
               sets: sets, volume: Math.round(volume * 10) / 10,
               /* Sprint 26: het gewicht van de zwaarste set van deze sessie. Geen
                  berekening, geen regel — de ruwe ingevoerde waarde, doorgegeven zodat
                  het dagbeeld er een maximum van kan nemen. */
               topgewicht: kg, reden: 'ok' };
    }
    if (mod === 'cardio') {
      var afstand = _num(s.distance);
      if (afstand == null || afstand <= 0) { basis.reden = 'geen_afstand'; return basis; }
      /* Sprint 26 — SPLIT. De sessies-tabel heeft een pace_sec-kolom die in de praktijk
         leeg is; de duur staat als tekst in time_str. De omrekening naar een split gebeurt
         NIET hier maar in de bestaande CardioCore (cardio_time.v1 + split), die wordt
         ingespoten. Ontbreekt die functie of de tijd, dan blijft de split null — er wordt
         niets geschat. */
      var split = null;
      if (typeof d.parseTime === 'function' && typeof d.splitFromDistTime === 'function') {
        var sec = _num(s.pace_sec) != null ? null : d.parseTime(s.time_str);
        var secNum = _num(sec);
        if (secNum != null && secNum > 0) {
          var sp = d.splitFromDistTime(afstand, secNum, SPLIT_BASIS_M);
          if (typeof sp === 'number' && isFinite(sp) && sp > 0) split = Math.round(sp * 10) / 10;
        }
      }
      return { versie: LOAD_VERSIE, modaliteit: 'cardio', eenheid: 'm',
               waarde: Math.round(afstand), gewogen: false, rpe: rpe, sets: null,
               volume: Math.round(afstand), split: split, reden: 'ok' };
    }
    return basis;
  }

  /* ────────────────────────────────────────────────────────────────────────
   * DAGBEELD (athlete.v1)
   *
   * Alles wat op een dag gebeurd is, per modaliteit apart. Dit is de enige plek
   * waar sessies tot dagen worden samengevoegd. De uitkomst is bewust een object
   * per modaliteit en GEEN totaal: optellen over eenheden gebeurt hier niet.
   * ──────────────────────────────────────────────────────────────────────── */
  function dailyModel(sessies, deps) {
    var arr = Array.isArray(sessies) ? sessies : [];
    var d = deps || {};
    var perDag = {};
    arr.forEach(function (s) {
      var datum = _ymd(s && s.date);
      if (!datum) return;
      if (!perDag[datum]) perDag[datum] = { date: datum, sessies: 0, modaliteiten: {}, sporten: {} };
      var dag = perDag[datum];
      dag.sessies++;
      var l = sessionLoad(s, d);
      if (s && s.training_type) dag.sporten[String(s.training_type)] = true;
      if (l.reden !== 'ok') return;
      var m = dag.modaliteiten[l.modaliteit];
      if (!m) {
        m = dag.modaliteiten[l.modaliteit] = {
          modaliteit: l.modaliteit, eenheid: l.eenheid, belasting: 0, volume: 0,
          sets: 0, sessies: 0, rpeSom: 0, rpeGewicht: 0, gewogen: 0,
          topgewicht: null, split: null
        };
      }
      m.belasting += l.waarde;
      m.volume += (l.volume != null ? l.volume : 0);
      m.sets += (l.sets || 0);
      m.sessies++;
      if (l.gewogen) m.gewogen++;
      /* RPE wordt gewogen met het aantal sets: een RPE 9 over vijf sets weegt
         zwaarder dan een RPE 6 over een enkele set. Een sessie zonder RPE telt
         niet mee in de noemer — hij wordt niet als "gemiddeld" meegerekend. */
      if (l.rpe != null) { var w = (l.sets || 1); m.rpeSom += l.rpe * w; m.rpeGewicht += w; }
      /* Zwaarste set van de dag: een maximum, geen gemiddelde — twee lichte sessies naast
         een zware maken de dag niet lichter. */
      if (typeof l.topgewicht === 'number' && isFinite(l.topgewicht)) {
        if (m.topgewicht == null || l.topgewicht > m.topgewicht) m.topgewicht = l.topgewicht;
      }
      /* Beste split van de dag: bij een split is LAGER beter (seconden per 500 m). */
      if (typeof l.split === 'number' && isFinite(l.split)) {
        if (m.split == null || l.split < m.split) m.split = l.split;
      }
    });

    var dagen = Object.keys(perDag).sort().map(function (k) {
      var dag = perDag[k];
      var mods = Object.keys(dag.modaliteiten).map(function (mk) {
        var m = dag.modaliteiten[mk];
        return {
          modaliteit: m.modaliteit, eenheid: m.eenheid,
          belasting: Math.round(m.belasting * 10) / 10,
          volume: Math.round(m.volume * 10) / 10,
          sets: m.sets, sessies: m.sessies,
          rpe: m.rpeGewicht > 0 ? Math.round(m.rpeSom / m.rpeGewicht * 10) / 10 : null,
          rpeDekking: m.sessies > 0 ? Math.round(m.gewogen / m.sessies * 100) / 100 : 0,
          topgewicht: m.topgewicht, split: m.split
        };
      }).sort(function (a, b) { return a.modaliteit < b.modaliteit ? -1 : 1; });
      return {
        date: dag.date, sessies: dag.sessies, modaliteiten: mods,
        sporten: Object.keys(dag.sporten).sort()
      };
    });
    return { versie: ATHLETE_VERSIE, dagen: dagen, aantalDagen: dagen.length };
  }

  /* Uit het dagbeeld een enkelvoudige dagreeks halen voor EEN modaliteit en EEN veld.
   * Dit is wat de Relationship Engine als bron krijgt. Dagen zonder die modaliteit
   * komen er niet als 0 in — 0 zou "niet getraind" en "wel getraind maar nul volume"
   * door elkaar halen. Ze ontbreken gewoon. */
  function serie(model, modaliteit, veld) {
    var m = model || {};
    var uit = [];
    (m.dagen || []).forEach(function (dag) {
      var mod = (dag.modaliteiten || []).filter(function (x) { return x.modaliteit === modaliteit; })[0];
      if (!mod) return;
      var v = mod[veld];
      if (typeof v !== 'number' || !isFinite(v)) return;
      uit.push({ date: dag.date, value: v });
    });
    return uit;
  }

  /* ────────────────────────────────────────────────────────────────────────
   * ROLLENDE REEKSEN
   * Elk van deze functies werkt op EEN reeks in EEN eenheid. Ze weten niet wat
   * ze optellen en dat hoeft ook niet — daarom kunnen ze niet per ongeluk kilo's
   * bij meters optellen.
   * ──────────────────────────────────────────────────────────────────────── */
  function _dagNr(ymd) {
    var p = String(ymd).split('-');
    /* Dagnummer sinds een vast punt, puur uit de datumtekst berekend. Bewust geen
       Date-object: dat zou tijdzones en zomertijd binnenhalen in een functie die
       alleen hoeft te weten hoeveel dagen er tussen twee datums zitten. */
    var y = Number(p[0]), m = Number(p[1]), dd = Number(p[2]);
    if (!isFinite(y) || !isFinite(m) || !isFinite(dd)) return null;
    var a = Math.floor((14 - m) / 12);
    var y2 = y + 4800 - a;
    var m2 = m + 12 * a - 3;
    return dd + Math.floor((153 * m2 + 2) / 5) + 365 * y2 + Math.floor(y2 / 4)
             - Math.floor(y2 / 100) + Math.floor(y2 / 400) - 32045;
  }

  /* Rollende som over een venster van N dagen, per dag in de reeks. De som loopt
   * over KALENDERDAGEN, niet over de laatste N metingen: zeven trainingen verspreid
   * over drie maanden zijn geen weekbelasting. */
  function rollingSum(reeks, dagen) {
    var arr = (Array.isArray(reeks) ? reeks : []).filter(function (p) {
      return p && p.date && typeof p.value === 'number' && isFinite(p.value);
    }).slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    var venster = (typeof dagen === 'number' && dagen > 0) ? Math.floor(dagen) : 7;
    var nrs = arr.map(function (p) { return _dagNr(p.date); });
    return arr.map(function (p, i) {
      var eind = nrs[i], som = 0;
      for (var j = 0; j <= i; j++) {
        if (nrs[j] == null || eind == null) continue;
        if (eind - nrs[j] < venster) som += arr[j].value;
      }
      return { date: p.date, value: Math.round(som * 10) / 10 };
    });
  }

  /* De waarde van de vorige TRAININGSDAG, op de dag van vandaag gezet. Hiermee kan
   * de Relationship Engine onderzoeken of de belasting van gisteren samenhangt met
   * het herstel van vandaag — een tijdsverschoven vraag die met de ruwe reeks niet
   * te stellen is. maxGat voorkomt dat een training van drie weken geleden als
   * "de vorige dag" wordt gepresenteerd. */
  function previousDaySeries(reeks, maxGat) {
    var arr = (Array.isArray(reeks) ? reeks : []).filter(function (p) {
      return p && p.date && typeof p.value === 'number' && isFinite(p.value);
    }).slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    var gat = (typeof maxGat === 'number' && maxGat > 0) ? Math.floor(maxGat) : 3;
    var uit = [];
    for (var i = 1; i < arr.length; i++) {
      var a = _dagNr(arr[i - 1].date), b = _dagNr(arr[i].date);
      if (a == null || b == null) continue;
      if (b - a > gat) continue;
      uit.push({ date: arr[i].date, value: arr[i - 1].value });
    }
    return uit;
  }

  /* Trainingsfrequentie: aantal trainingsdagen binnen het venster, per dag.
   * Een geheel getal, geen gemiddelde — "vier keer in de afgelopen week" is
   * begrijpelijker dan "0,57 per dag". */
  function frequencySeries(reeks, dagen) {
    var arr = (Array.isArray(reeks) ? reeks : []).filter(function (p) { return p && p.date; })
      .slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    var venster = (typeof dagen === 'number' && dagen > 0) ? Math.floor(dagen) : 7;
    var nrs = arr.map(function (p) { return _dagNr(p.date); });
    return arr.map(function (p, i) {
      var eind = nrs[i], k = 0;
      for (var j = 0; j <= i; j++) if (nrs[j] != null && eind != null && eind - nrs[j] < venster) k++;
      return { date: p.date, value: k };
    });
  }

  /* MONOTONIE (Foster): gemiddelde belasting gedeeld door de spreiding ervan, over
   * een venster. Hoog betekent: elke dag hetzelfde, weinig afwisseling tussen zwaar
   * en licht. Het is een BESCHRIJVING van je week, geen waarschuwing en geen advies —
   * die interpretatie hoort in de Decision Engine, niet hier.
   * Minimaal aantal dagen omdat een spreiding over twee punten niets zegt. */
  var MONOTONIE_MIN_DAGEN = 5;
  function monotony(reeks, dagen) {
    var arr = (Array.isArray(reeks) ? reeks : []).filter(function (p) {
      return p && p.date && typeof p.value === 'number' && isFinite(p.value);
    }).slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    var venster = (typeof dagen === 'number' && dagen > 0) ? Math.floor(dagen) : 7;
    if (arr.length < MONOTONIE_MIN_DAGEN) {
      return { versie: LOAD_VERSIE, waarde: null, n: arr.length,
               minimum: MONOTONIE_MIN_DAGEN, reden: 'te_weinig_dagen' };
    }
    var laatste = arr.slice(-venster);
    var n = laatste.length;
    var som = 0; laatste.forEach(function (p) { som += p.value; });
    var gem = som / n;
    var vari = 0; laatste.forEach(function (p) { vari += Math.pow(p.value - gem, 2); });
    var sd = Math.sqrt(vari / n);
    if (!(sd > 0)) {
      return { versie: LOAD_VERSIE, waarde: null, n: n, gemiddelde: Math.round(gem * 10) / 10,
               spreiding: 0, minimum: MONOTONIE_MIN_DAGEN, reden: 'geen_spreiding' };
    }
    return { versie: LOAD_VERSIE, waarde: Math.round(gem / sd * 100) / 100, n: n,
             gemiddelde: Math.round(gem * 10) / 10, spreiding: Math.round(sd * 10) / 10,
             minimum: MONOTONIE_MIN_DAGEN, reden: 'ok' };
  }

  /* ACUUT/CHRONISCH. Belasting van de laatste week ten opzichte van het weekgemiddelde
   * over vier weken. Staat al jaren op de wensenlijst (Blueprint v6). Hij wordt hier
   * BEREKEND, niet geïnterpreteerd: er staat nergens een grens waarboven het "gevaarlijk"
   * zou zijn. Zulke grenzen zijn in de literatuur omstreden en horen hoe dan ook thuis
   * in de Decision Engine, met een eigen contract en eigen tests. */
  var ACWR_MIN_DAGEN = 21;
  function acuteChronic(reeks, acuutDagen, chronischDagen) {
    var arr = (Array.isArray(reeks) ? reeks : []).filter(function (p) {
      return p && p.date && typeof p.value === 'number' && isFinite(p.value);
    }).slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    var A = (typeof acuutDagen === 'number' && acuutDagen > 0) ? Math.floor(acuutDagen) : 7;
    var C = (typeof chronischDagen === 'number' && chronischDagen > 0) ? Math.floor(chronischDagen) : 28;
    if (!arr.length) return { versie: LOAD_VERSIE, waarde: null, reden: 'geen_data', spanDagen: 0, minimum: ACWR_MIN_DAGEN };
    var eerste = _dagNr(arr[0].date), laatste = _dagNr(arr[arr.length - 1].date);
    var span = (eerste != null && laatste != null) ? (laatste - eerste + 1) : 0;
    if (span < ACWR_MIN_DAGEN) {
      return { versie: LOAD_VERSIE, waarde: null, reden: 'te_kort_bereik', spanDagen: span, minimum: ACWR_MIN_DAGEN };
    }
    var eind = laatste, acuut = 0, chronisch = 0;
    arr.forEach(function (p) {
      var nr = _dagNr(p.date); if (nr == null) return;
      var afstand = eind - nr;
      if (afstand < A) acuut += p.value;
      if (afstand < C) chronisch += p.value;
    });
    var chronischPerWeek = chronisch / (C / A);
    if (!(chronischPerWeek > 0)) {
      return { versie: LOAD_VERSIE, waarde: null, reden: 'geen_chronische_belasting',
               acuut: Math.round(acuut * 10) / 10, spanDagen: span, minimum: ACWR_MIN_DAGEN };
    }
    return { versie: LOAD_VERSIE, waarde: Math.round(acuut / chronischPerWeek * 100) / 100,
             acuut: Math.round(acuut * 10) / 10, chronischPerVenster: Math.round(chronischPerWeek * 10) / 10,
             acuutDagen: A, chronischDagen: C, spanDagen: span, minimum: ACWR_MIN_DAGEN, reden: 'ok' };
  }

  /* ────────────────────────────────────────────────────────────────────────
   * PRESTATIE-INDEX (performance_index.v1)
   *
   * Het probleem: een geschat 1RM van 120 kg bij squat en 70 kg bij bankdrukken
   * zijn allebei "je 1RM", maar je kunt ze niet middelen en al helemaal niet als
   * dagreeks tegen je HRV zetten — dan meet je welke oefening je die dag deed.
   *
   * De oplossing: reken elke sessie om naar een verhouding ten opzichte van je
   * EIGEN mediane niveau voor DIE oefening, over de voorgaande sessies. 1,00 is
   * "zoals je meestal presteert", 1,05 is vijf procent boven je eigen niveau.
   * Die verhouding is wel vergelijkbaar tussen oefeningen en dus optelbaar tot een
   * dagwaarde.
   *
   * Er is een minimum aan voorgeschiedenis nodig; zonder dat is er geen "eigen
   * niveau" om tegen af te zetten en levert de functie niets in plaats van iets
   * onbetrouwbaars. De mediaan (niet het gemiddelde) omdat één uitschieter
   * anders het hele referentieniveau verschuift.
   * ──────────────────────────────────────────────────────────────────────── */
  var PERFINDEX_MIN_HISTORIE = 3;
  function _mediaan(getallen) {
    if (!getallen.length) return null;
    var s = getallen.slice().sort(function (a, b) { return a - b; });
    var m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }
  function performanceIndex(sessies, deps) {
    var arr = Array.isArray(sessies) ? sessies : [];
    var d = deps || {};
    if (typeof d.oneRMRaw !== 'function') {
      return { versie: PERFINDEX_VERSIE, reeks: [], reden: 'geen_e1rm_functie', minimumHistorie: PERFINDEX_MIN_HISTORIE };
    }
    var bruikbaar = arr.filter(function (s) {
      return s && s.date && s.exercise_id && modaliteitVan(s) === 'strength';
    }).map(function (s) {
      return { date: _ymd(s.date), ex: String(s.exercise_id),
               e1rm: d.oneRMRaw(_num(s.weight), _num(s.reps)) };
    }).filter(function (p) {
      return p.date && typeof p.e1rm === 'number' && isFinite(p.e1rm) && p.e1rm > 0;
    }).sort(function (a, b) { return a.date < b.date ? -1 : (a.date > b.date ? 1 : 0); });

    var historie = {}, perDag = {}, gebruikt = 0, overgeslagen = 0;
    bruikbaar.forEach(function (p) {
      var h = historie[p.ex] || (historie[p.ex] = []);
      if (h.length >= PERFINDEX_MIN_HISTORIE) {
        var basis = _mediaan(h);
        if (basis != null && basis > 0) {
          var idx = p.e1rm / basis;
          if (!perDag[p.date]) perDag[p.date] = { som: 0, n: 0 };
          perDag[p.date].som += idx; perDag[p.date].n++;
          gebruikt++;
        }
      } else { overgeslagen++; }
      h.push(p.e1rm);
    });
    var reeks = Object.keys(perDag).sort().map(function (k) {
      return { date: k, value: Math.round(perDag[k].som / perDag[k].n * 1000) / 1000 };
    });
    return {
      versie: PERFINDEX_VERSIE, reeks: reeks,
      reden: reeks.length ? 'ok' : 'te_weinig_historie',
      minimumHistorie: PERFINDEX_MIN_HISTORIE,
      gebruikteSessies: gebruikt, overgeslagenSessies: overgeslagen,
      oefeningen: Object.keys(historie).length
    };
  }

  /* ────────────────────────────────────────────────────────────────────────
   * EEN GEZAMENLIJKE BELASTING — en waarom die er nu niet is
   *
   * Deze functie bestaat zodat de ontbrekende capability zichtbaar is in de code en
   * in tests, in plaats van als losse opmerking in een document. Hij levert nooit
   * een getal zolang de benodigde invoer ontbreekt, en zegt precies wat er mist.
   * ──────────────────────────────────────────────────────────────────────── */
  function unifiedLoad(dagModel) {
    var dagen = (dagModel && dagModel.dagen) || [];
    var eenheden = {};
    dagen.forEach(function (dag) {
      (dag.modaliteiten || []).forEach(function (m) { if (m.eenheid) eenheden[m.eenheid] = true; });
    });
    var lijst = Object.keys(eenheden).sort();
    if (lijst.length <= 1) {
      /* Eén eenheid: optellen mag, want er wordt niets ongelijksoortigs gemengd. */
      var reeks = dagen.map(function (dag) {
        var som = 0, gezien = false;
        (dag.modaliteiten || []).forEach(function (m) { if (m.eenheid) { som += m.belasting; gezien = true; } });
        return gezien ? { date: dag.date, value: Math.round(som * 10) / 10 } : null;
      }).filter(Boolean);
      return { versie: LOAD_VERSIE, beschikbaar: true, reden: 'ok',
               eenheid: lijst[0] || null, reeks: reeks, eenheden: lijst, ontbreekt: [] };
    }
    return {
      versie: LOAD_VERSIE, beschikbaar: false, reden: 'geen_gemeenschappelijke_eenheid',
      eenheid: null, reeks: [], eenheden: lijst,
      /* Wat er nodig zou zijn om dit wel te kunnen: een duur per sessie, waarmee
         sessie-RPE maal duur (Foster) een eenheid oplevert die over modaliteiten
         heen geldig is. Die kolom bestaat vandaag niet. */
      ontbreekt: ['duur_per_sessie']
    };
  }

  /* ────────────────────────────────────────────────────────────────────────
   * SPORTCONTEXT
   * Welke sporten heeft deze atleet werkelijk beoefend? Uitsluitend afgeleid uit
   * de eigen sessies; de definities komen uit het BESTAANDE SportDefinitionCore.
   * Dit is de architectonische voorbereiding op meerdere sporten waar de roadmap
   * om vraagt — geen club-, team- of ledenfunctionaliteit.
   * ──────────────────────────────────────────────────────────────────────── */
  function sportContext(dagModel, deps) {
    var d = deps || {};
    var dagen = (dagModel && dagModel.dagen) || [];
    var tellers = {}, modTellers = {};
    dagen.forEach(function (dag) {
      (dag.sporten || []).forEach(function (t) { tellers[t] = (tellers[t] || 0) + 1; });
      (dag.modaliteiten || []).forEach(function (m) {
        modTellers[m.modaliteit] = (modTellers[m.modaliteit] || 0) + 1;
      });
    });
    var sporten = Object.keys(tellers).sort().map(function (t) {
      var canoniek = (typeof d.resolveCanonicalSportId === 'function') ? d.resolveCanonicalSportId(t) : null;
      var def = (canoniek && typeof d.getSportDefinition === 'function') ? d.getSportDefinition(canoniek) : null;
      return { trainingType: t, dagen: tellers[t], sportId: canoniek,
               label: (def && def.label) || null, herkend: !!def };
    });
    return {
      versie: ATHLETE_VERSIE,
      sporten: sporten,
      modaliteiten: Object.keys(modTellers).sort().map(function (k) {
        return { modaliteit: k, label: MODALITEITEN[k] ? MODALITEITEN[k].label : k, dagen: modTellers[k] };
      }),
      multiSport: sporten.length > 1,
      multiModaliteit: Object.keys(modTellers).length > 1
    };
  }

  /* ────────────────────────────────────────────────────────────────────────
   * BRONNEN VOOR DE RELATIONSHIP ENGINE
   * Levert precies de reeksen die in RelationshipCore.VARIABLE_REGISTRY staan.
   * Een reeks die niet berekend kan worden komt er niet in — hij wordt niet leeg
   * of op nul gezet, want dat zou de inventarisatie laten denken dat er data is.
   * ──────────────────────────────────────────────────────────────────────── */
  function relationshipSources(sessies, deps) {
    var d = deps || {};
    var model = dailyModel(sessies, d);
    var uit = {};
    var volume = serie(model, 'strength', 'volume');
    var belasting = serie(model, 'strength', 'belasting');
    var sets = serie(model, 'strength', 'sets');
    var rpe = serie(model, 'strength', 'rpe');
    if (volume.length) uit.volume = volume;
    if (belasting.length) uit.load = belasting;
    if (sets.length) uit.sets = sets;
    if (rpe.length) uit.rpe = rpe;
    if (belasting.length) {
      var week = rollingSum(belasting, 7);
      if (week.length) uit.weekbelasting = week;
      var vorige = previousDaySeries(belasting, 3);
      if (vorige.length) uit.load_vorige_dag = vorige;
    }
    /* Sprint 26 — TOPGEWICHT. Het register kende deze grootheid al maar kreeg hem nooit
       aangeleverd. Het is een AGGREGATIE van bestaande waarden (het maximum van de dag),
       geen nieuwe berekening en geen nieuwe regel. */
    var top = serie(model, 'strength', 'topgewicht');
    if (top.length) uit.topgewicht = top;

    /* Sprint 26 — CARDIO-SPLIT: bewust NIET aangeleverd, en dat is een besluit met reden.
     *
     * De split per sessie wordt hier wél correct berekend (zie sessionLoad, via de
     * bestaande CardioCore) en staat in het dagmodel. Maar hem als ÉÉN dagreeks aan de
     * Relationship Engine geven zou splits van verschillende machines door elkaar husselen:
     * op deze dataset staat 58,7 s/500 m (bike-erg) naast 108 s/500 m (roeien). Het
     * "beste" van die twee is geen prestatie maar een meetfout.
     *
     * De app kent die regel al: de cardio-records werken machine- én afstand-bewust
     * ("dominante afstand-key, geen 2k≠5k", ProgressionCore.recordsBy). Een dagminimum
     * over alle machines heen zou daarmee in tegenspraak zijn. Welke machine of afstand
     * de reeks moet dragen is een PRODUCTBESLISSING, geen technische keuze — en die wordt
     * hier niet zelf genomen. Zolang die er niet is blijft cardio_split afwezig in plaats
     * van misleidend aanwezig. Zie het sprintrapport. */
    var pi = performanceIndex(sessies, d);
    if (pi.reeks && pi.reeks.length) uit.e1rm = pi.reeks;
    return { versie: ATHLETE_VERSIE, bronnen: uit, model: model, prestatieIndex: pi };
  }

  var AthleteCore = {
    ATHLETE_VERSIE: ATHLETE_VERSIE,
    LOAD_VERSIE: LOAD_VERSIE,
    PERFINDEX_VERSIE: PERFINDEX_VERSIE,
    MODALITEITEN: MODALITEITEN,
    RPE_MAX: RPE_MAX,
    SPLIT_BASIS_M: SPLIT_BASIS_M,
    MONOTONIE_MIN_DAGEN: MONOTONIE_MIN_DAGEN,
    ACWR_MIN_DAGEN: ACWR_MIN_DAGEN,
    PERFINDEX_MIN_HISTORIE: PERFINDEX_MIN_HISTORIE,
    modaliteitVan: modaliteitVan,
    sessionLoad: sessionLoad,
    dailyModel: dailyModel,
    serie: serie,
    rollingSum: rollingSum,
    previousDaySeries: previousDaySeries,
    frequencySeries: frequencySeries,
    monotony: monotony,
    acuteChronic: acuteChronic,
    performanceIndex: performanceIndex,
    unifiedLoad: unifiedLoad,
    sportContext: sportContext,
    relationshipSources: relationshipSources,
    VERSIONS: { athlete: ATHLETE_VERSIE, load: LOAD_VERSIE, performanceIndex: PERFINDEX_VERSIE }
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = AthleteCore; }
  if (global) { global.AthleteCore = AthleteCore; }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
