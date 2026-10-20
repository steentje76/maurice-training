/* ==========================================================================
 * TrainingKompas — HISTORISCHE LOKALE INVENTARIS  (localinventory.v1)
 * --------------------------------------------------------------------------
 * WAAROM (TK-REL-SEC-26, fase 3, 19-10-2026)
 * Het verificatieregister (fase 2) kent alleen writes van ná zijn invoering. Alles
 * wat al op het toestel stond — eigen trainingen, concepten, een lopende training,
 * de offline-wachtrij, voorkeuren — is daar onzichtbaar. Een de-installatie wist
 * dat allemaal. Deze module beschrijft ELKE bekende lokale opslagbron (manifest),
 * deelt de gevonden gegevens op in records en bepaalt per record wat er aantoonbaar
 * is. Zuivere functies: geen opslag, geen netwerk, geen DOM, geen klok.
 *
 * Statussen (nooit SERVER_VERIFIED: een historisch record dat op een serverrij
 * lijkt, is daarmee niet door de server bevestigd):
 *   HIST_GEKOPPELD        identiteit, eigenaar en inhoud gelijk aan een zichtbare serverrij
 *   HIST_AFWIJKEND        serverrij gevonden, inhoud of eigenaar wijkt af
 *   HIST_NIET_GEVONDEN    geen zichtbare serverrij (niet definitief: RLS)
 *   HIST_ONBEKEND         niet vergeleken (offline, leesfout, accountwissel)
 *   HIST_ANDERE_EIGENAAR  hoort bij een andere gebruiker van dit toestel
 *   HIST_EIGENAARLOOS     eigenaar niet vast te stellen
 *   HIST_ONLEESBAAR       bron of record niet te lezen/parsen
 *   HIST_NIET_VERIFIEERBAAR geen serveridentiteit (concept, lokale log, voorkeur, oude structuur)
 *   HIST_WACHTRIJ         nog niet verstuurde write in de offline-wachtrij
 *   HIST_ONBEKENDE_BRON   opslagsleutel/database die niet in het manifest staat
 *   HIST_NIET_PERSOONLIJK toestelinstelling of systeemsleutel zonder gebruikersgegevens
 * Alles behalve HIST_GEKOPPELD en HIST_NIET_PERSOONLIJK blokkeert de de-installatiepoort.
 * Een cache is nooit automatisch "veilig te verwijderen".
 * ========================================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.LocalInventoryCore = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VERSIE = 'localinventory.v1';
  var HIST = {
    GEKOPPELD: 'HIST_GEKOPPELD', AFWIJKEND: 'HIST_AFWIJKEND', NIET_GEVONDEN: 'HIST_NIET_GEVONDEN', ONBEKEND: 'HIST_ONBEKEND',
    ANDERE_EIGENAAR: 'HIST_ANDERE_EIGENAAR', EIGENAARLOOS: 'HIST_EIGENAARLOOS', ONLEESBAAR: 'HIST_ONLEESBAAR',
    NIET_VERIFIEERBAAR: 'HIST_NIET_VERIFIEERBAAR', WACHTRIJ: 'HIST_WACHTRIJ', ONBEKENDE_BRON: 'HIST_ONBEKENDE_BRON',
    NIET_PERSOONLIJK: 'HIST_NIET_PERSOONLIJK'
  };
  var NIET_BLOKKEREND = [HIST.GEKOPPELD, HIST.NIET_PERSOONLIJK];
  // Categorieën: duurzaam (gebruikersgegevens), concept (lopend/onafgemaakt, nooit op de server), wachtrij,
  // serverkopie (afgeleid van serverdata, herstel niet bewezen), voorkeur (persoonsgebonden keuze), toestel
  // (toestelinstelling zonder persoonsgegevens), systeem (techniek, geen gebruikersgegevens), legacy (oude structuur).
  var CAT = { DUURZAAM: 'duurzaam', CONCEPT: 'concept', WACHTRIJ: 'wachtrij', SERVERKOPIE: 'serverkopie', VOORKEUR: 'voorkeur',
    TOESTEL: 'toestel', SYSTEEM: 'systeem', LEGACY: 'legacy' };

  function b(o) { return o; }
  // Manifest. vorm: array (één record per element), ids (array van id's), map (één record per sleutel), object/tekst
  // (één record), geheim (alleen aanwezigheid; inhoud wordt nooit gelezen), wachtrij (IndexedDB, eigenaar per item).
  // eigenaar: cache (tk_cache_owner_uid: persoonlijke caches horen bij de laatste toesteleigenaar, zie
  // resetPersonalCacheIfNewDeviceOwner), suffix (uid in de sleutel), item (owner_uid per item), geen (niet persoonlijk),
  // onbekend (structuur zonder eigenaar).
  var BRONNEN = [
    b({ id: 'eigen_trainingen', opslag: 'localStorage', sleutel: 'tk_trainings', categorie: CAT.DUURZAAM, vorm: 'array', identiteit: 'id', eigenaar: 'cache',
      serverTabel: 'custom_trainings', kindTabel: 'custom_training_exercises', versie: 'v2 (exercises + exercise_targets, metadata)', afhankelijk: ['tk_trainings_onbevestigd'],
      omschrijving: 'Eigen trainingen (handmatig en Workout Builder)' }),
    b({ id: 'trainingen_onbevestigd', opslag: 'localStorage', sleutel: 'tk_trainings_onbevestigd', categorie: CAT.DUURZAAM, vorm: 'ids', eigenaar: 'cache',
      versie: 'v1', afhankelijk: ['tk_trainings'], omschrijving: 'Markering "alleen op dit toestel" per eigen training' }),
    b({ id: 'actieve_training', opslag: 'localStorage', sleutel: 'tk_draft_training', categorie: CAT.CONCEPT, vorm: 'object', eigenaar: 'cache',
      versie: 'v1 {t, sessionLog, sessionExtra, ts, instanceId}', omschrijving: 'Lopende krachttraining (concept, sets nog niet afgerond)' }),
    b({ id: 'begeleide_training_actief', opslag: 'localStorage', sleutel: 'tk_gw_active', categorie: CAT.CONCEPT, vorm: 'object', eigenaar: 'cache',
      versie: 'v1', omschrijving: 'Lopende of niet-opgeslagen Guided Workout' }),
    b({ id: 'begeleide_training_log', opslag: 'localStorage', sleutel: 'tk_gw_log', categorie: CAT.DUURZAAM, vorm: 'array', identiteit: 'positie', eigenaar: 'cache',
      versie: 'v1 (max. 50)', omschrijving: 'Samenvattingen van afgeronde Guided Workouts (alleen lokaal)' }),
    b({ id: 'begeleide_training_historie', opslag: 'localStorage', sleutel: 'tk_gw_hist', categorie: CAT.DUURZAAM, vorm: 'map', eigenaar: 'cache',
      versie: 'v1', omschrijving: 'Laatste gewicht/herhalingen per oefening in Guided Workouts (alleen lokaal)' }),
    b({ id: 'hyrox_actief', opslag: 'localStorage', sleutel: 'tk_hyrox_active', categorie: CAT.CONCEPT, vorm: 'object', eigenaar: 'cache',
      versie: 'v1', omschrijving: 'Lopende HYROX/triathlon-race' }),
    b({ id: 'hardloop_uitvoering', opslag: 'localStorage', prefix: 'tk_running_execution_v1_', categorie: CAT.CONCEPT, vorm: 'object', eigenaar: 'suffix',
      versie: 'v1 {state, config}', omschrijving: 'Lopende hardlooptraining (per gebruiker)' }),
    b({ id: 'fiets_uitvoering', opslag: 'localStorage', prefix: 'tk_cycling_execution_v1_', categorie: CAT.CONCEPT, vorm: 'object', eigenaar: 'suffix',
      versie: 'v1 {state, config}', omschrijving: 'Lopende fietstraining (per gebruiker)' }),
    b({ id: 'zwem_uitvoering', opslag: 'localStorage', prefix: 'tk_swimming_execution_v1_', categorie: CAT.CONCEPT, vorm: 'object', eigenaar: 'suffix',
      versie: 'v1 {state, config}', omschrijving: 'Lopende zwemtraining (per gebruiker)' }),
    b({ id: 'hardloop_uitvoering_legacy', opslag: 'localStorage', sleutel: 'tk_running_execution_v1', categorie: CAT.LEGACY, vorm: 'object', eigenaar: 'onbekend',
      versie: 'v0 (globale sleutel zonder gebruiker)', omschrijving: 'Oude, niet-gebruikersgebonden hardloopuitvoering' }),
    b({ id: 'builder_concept', opslag: 'localStorage', sleutel: 'tk_wb_draft', categorie: CAT.CONCEPT, vorm: 'object', eigenaar: 'cache',
      versie: 'v1 {sel, plan}', omschrijving: 'Workout Builder-concept' }),
    b({ id: 'builder_opgeslagen_legacy', opslag: 'localStorage', sleutel: 'tk_wb_saved', categorie: CAT.LEGACY, vorm: 'array', identiteit: 'id', eigenaar: 'cache',
      versie: 'v0 (vóór Werkblok B; gemigreerd naar tk_trainings als tk_wb_migrated_v1 staat)', afhankelijk: ['tk_wb_migrated_v1', 'tk_trainings'],
      omschrijving: 'Oude, alleen-lokale Builder-trainingen' }),
    b({ id: 'laatste_training_legacy', opslag: 'localStorage', sleutel: 'tk_last_training', categorie: CAT.LEGACY, vorm: 'tekst', eigenaar: 'cache',
      versie: 'v0 (geen schrijvers meer)', omschrijving: 'Oude laatste-trainingsmarkering' }),
    b({ id: 'eenrm_cache_legacy', opslag: 'localStorage', prefix: 'tk_1rm_', categorie: CAT.LEGACY, vorm: 'tekst', eigenaar: 'cache',
      versie: 'v0 (geen schrijvers meer)', omschrijving: 'Oude 1RM-cache per oefening' }),
    b({ id: 'namespace_legacy', opslag: 'localStorage', prefix: 'maurice_', categorie: CAT.LEGACY, vorm: 'tekst', eigenaar: 'onbekend',
      versie: 'v0 (vóór namespace-migratie tk_ns_migrated)', omschrijving: 'Sleutels uit de oude naamruimte (migratie niet voltooid)' }),
    b({ id: 'atleetprofiel', opslag: 'localStorage', sleutel: 'tk_atleet', categorie: CAT.SERVERKOPIE, vorm: 'object', eigenaar: 'cache',
      versie: 'v1', omschrijving: 'Kopie van het atleetprofiel (herstel van de server niet per veld bewezen)' }),
    b({ id: 'supplement_koppelingen', opslag: 'localStorage', sleutel: 'tk_supp_defs', categorie: CAT.SERVERKOPIE, vorm: 'map', eigenaar: 'cache',
      versie: 'v1', omschrijving: 'Koppeling supplementnaam → serverdefinitie' }),
    b({ id: 'voeding_shells', opslag: 'localStorage', sleutel: 'tk_voeding_shells', categorie: CAT.SERVERKOPIE, vorm: 'map', eigenaar: 'cache',
      versie: 'v1', omschrijving: 'Koppeling voedingsproduct → serverrij' }),
    b({ id: 'vaste_training_meta', opslag: 'localStorage', sleutel: 'tk_vt_meta', categorie: CAT.VOORKEUR, vorm: 'map', eigenaar: 'cache', versie: 'v1', omschrijving: 'Weergave-instellingen per vaste training' }),
    b({ id: 'actieve_sport', opslag: 'localStorage', sleutel: 'tk_active_sport', categorie: CAT.VOORKEUR, vorm: 'tekst', eigenaar: 'cache', versie: 'v1', omschrijving: 'Gekozen sport' }),
    b({ id: 'roeiers', opslag: 'localStorage', sleutel: 'tk_rowers', categorie: CAT.VOORKEUR, vorm: 'object', eigenaar: 'cache', versie: 'v1', omschrijving: 'Bekende roeimachines' }),
    b({ id: 'roeier', opslag: 'localStorage', sleutel: 'tk_rower', categorie: CAT.VOORKEUR, vorm: 'tekst', eigenaar: 'cache', versie: 'v1', omschrijving: 'Gekozen roeimachine' }),
    b({ id: 'halterschijven', opslag: 'localStorage', sleutel: 'tk_plates', categorie: CAT.VOORKEUR, vorm: 'object', eigenaar: 'cache', versie: 'v1', omschrijving: 'Beschikbare halterschijven' }),
    b({ id: 'rusttijd', opslag: 'localStorage', sleutel: 'tk_rest_default', categorie: CAT.VOORKEUR, vorm: 'tekst', eigenaar: 'cache', versie: 'v1', omschrijving: 'Standaard rusttijd' }),
    b({ id: 'uitrustinggeheugen', opslag: 'localStorage', sleutel: 'tk_eqmem', categorie: CAT.VOORKEUR, vorm: 'map', eigenaar: 'cache', versie: 'v1', omschrijving: 'Laatst gekozen uitrusting per oefening' }),
    b({ id: 'bibliotheek_favorieten', opslag: 'localStorage', sleutel: 'tk_lib_favs', categorie: CAT.VOORKEUR, vorm: 'object', eigenaar: 'cache', versie: 'v1', omschrijving: 'Favoriete oefeningen in de bibliotheek' }),
    b({ id: 'bibliotheek_recent', opslag: 'localStorage', sleutel: 'tk_lib_recent', categorie: CAT.VOORKEUR, vorm: 'object', eigenaar: 'cache', versie: 'v1', omschrijving: 'Recent bekeken oefeningen' }),
    b({ id: 'bibliotheek_zoekopdrachten', opslag: 'localStorage', sleutel: 'tk_lib_recentq', categorie: CAT.VOORKEUR, vorm: 'object', eigenaar: 'cache', versie: 'v1', omschrijving: 'Recente zoekopdrachten' }),
    b({ id: 'builder_favorieten', opslag: 'localStorage', sleutel: 'tk_wb_favs', categorie: CAT.VOORKEUR, vorm: 'map', eigenaar: 'cache', versie: 'v1', omschrijving: 'Favoriete Builder-trainingen' }),
    b({ id: 'coach_stijl', opslag: 'localStorage', sleutel: 'tk_coach_style', categorie: CAT.VOORKEUR, vorm: 'tekst', eigenaar: 'cache', versie: 'v1', omschrijving: 'Coachvoorkeur stijl' }),
    b({ id: 'coach_stem', opslag: 'localStorage', sleutel: 'tk_coach_voice', categorie: CAT.VOORKEUR, vorm: 'tekst', eigenaar: 'cache', versie: 'v1', omschrijving: 'Coachvoorkeur stem' }),
    b({ id: 'coach_detail', opslag: 'localStorage', sleutel: 'tk_coach_detail', categorie: CAT.VOORKEUR, vorm: 'tekst', eigenaar: 'cache', versie: 'v1', omschrijving: 'Coachvoorkeur detailniveau' }),
    b({ id: 'machines_bikeerg', opslag: 'localStorage', sleutel: 'bikeerg_machines', categorie: CAT.VOORKEUR, vorm: 'object', eigenaar: 'cache', versie: 'v1', omschrijving: 'Bekende BikeErgs' }),
    b({ id: 'machines_skierg', opslag: 'localStorage', sleutel: 'skierg_machines', categorie: CAT.VOORKEUR, vorm: 'object', eigenaar: 'cache', versie: 'v1', omschrijving: 'Bekende SkiErgs' }),
    b({ id: 'machines_assault', opslag: 'localStorage', sleutel: 'assault_machines', categorie: CAT.VOORKEUR, vorm: 'object', eigenaar: 'cache', versie: 'v1', omschrijving: 'Bekende Assault-machines' }),
    b({ id: 'machinekeuze', opslag: 'localStorage', prefix: 'sel_', categorie: CAT.VOORKEUR, vorm: 'tekst', eigenaar: 'cache', versie: 'v1', omschrijving: 'Laatst gekozen machine per cardiotype' }),
    b({ id: 'onboarding_klaar', opslag: 'localStorage', sleutel: 'tk_onboarding_done', categorie: CAT.VOORKEUR, vorm: 'tekst', eigenaar: 'cache', versie: 'v1', omschrijving: 'Intake afgerond (afgeleid van atleet_profiel)' }),
    b({ id: 'toestemming_ai', opslag: 'localStorage', sleutel: 'tk_ai_consent', categorie: CAT.VOORKEUR, vorm: 'tekst', eigenaar: 'cache', versie: 'v1', omschrijving: 'Toestemming AI Coach' }),
    b({ id: 'toestemming_ai_kennis', opslag: 'localStorage', sleutel: 'tk_ai_consent_knowledge', categorie: CAT.VOORKEUR, vorm: 'tekst', eigenaar: 'cache', versie: 'v1', omschrijving: 'Toestemming kennis-AI' }),
    b({ id: 'toestemming_telemetrie', opslag: 'localStorage', sleutel: 'tk_product_telemetry_consent', categorie: CAT.VOORKEUR, vorm: 'tekst', eigenaar: 'cache', versie: 'v1', omschrijving: 'Toestemming producttelemetrie' }),
    b({ id: 'toestemming_weer', opslag: 'localStorage', sleutel: 'tk_weather_optin', categorie: CAT.VOORKEUR, vorm: 'tekst', eigenaar: 'cache', versie: 'v1', omschrijving: 'Toestemming weer' }),
    b({ id: 'toestemming_cyclus', opslag: 'localStorage', sleutel: 'tk_cyclus_optin', categorie: CAT.VOORKEUR, vorm: 'tekst', eigenaar: 'cache', versie: 'v1', omschrijving: 'Toestemming cycluscontext' }),
    b({ id: 'thema', opslag: 'localStorage', sleutel: 'tk_theme', categorie: CAT.TOESTEL, vorm: 'tekst', eigenaar: 'geen', versie: 'v1', omschrijving: 'Weergavethema van het toestel' }),
    b({ id: 'geluid', opslag: 'localStorage', sleutel: 'tk_sound_enabled', categorie: CAT.TOESTEL, vorm: 'tekst', eigenaar: 'geen', versie: 'v1', omschrijving: 'Geluid aan/uit' }),
    b({ id: 'trillen', opslag: 'localStorage', sleutel: 'tk_haptics_enabled', categorie: CAT.TOESTEL, vorm: 'tekst', eigenaar: 'geen', versie: 'v1', omschrijving: 'Trillen aan/uit' }),
    b({ id: 'dynamische_rust', opslag: 'localStorage', sleutel: 'tk_dynrest_enabled', categorie: CAT.TOESTEL, vorm: 'tekst', eigenaar: 'geen', versie: 'v1', omschrijving: 'Dynamische rust aan/uit' }),
    b({ id: 'scherm_aan', opslag: 'localStorage', sleutel: 'tk_wakelock_enabled', categorie: CAT.TOESTEL, vorm: 'tekst', eigenaar: 'geen', versie: 'v1', omschrijving: 'Scherm aan houden' }),
    b({ id: 'meldingen', opslag: 'localStorage', prefix: 'tk_notif_', categorie: CAT.TOESTEL, vorm: 'tekst', eigenaar: 'geen', versie: 'v1', omschrijving: 'Meldingsvoorkeuren van het toestel' }),
    b({ id: 'sessie', opslag: 'localStorage', sleutel: 'tk_auth_session', categorie: CAT.SYSTEEM, vorm: 'geheim', eigenaar: 'geen', versie: 'v1', omschrijving: 'Inlogsessie (inhoud wordt nooit gelezen; opnieuw inloggen herstelt)' }),
    b({ id: 'cache_eigenaar', opslag: 'localStorage', sleutel: 'tk_cache_owner_uid', categorie: CAT.SYSTEEM, vorm: 'tekst', eigenaar: 'geen', versie: 'v1', omschrijving: 'Eigenaar van de persoonlijke caches' }),
    b({ id: 'namespace_migratie', opslag: 'localStorage', sleutel: 'tk_ns_migrated', categorie: CAT.SYSTEEM, vorm: 'tekst', eigenaar: 'geen', versie: 'v1', omschrijving: 'Markering namespace-migratie' }),
    b({ id: 'builder_migratie', opslag: 'localStorage', sleutel: 'tk_wb_migrated_v1', categorie: CAT.SYSTEEM, vorm: 'tekst', eigenaar: 'geen', versie: 'v1', omschrijving: 'Markering Builder-migratie' }),
    b({ id: 'register_defect', opslag: 'localStorage', sleutel: 'tk_verify_register_defect', categorie: CAT.SYSTEEM, vorm: 'tekst', eigenaar: 'geen', versie: 'v1', omschrijving: 'Opslagfout in het controleregister' }),
    b({ id: 'export_bezig', opslag: 'localStorage', sleutel: 'tk_export_bezig', categorie: CAT.SYSTEEM, vorm: 'object', eigenaar: 'geen', versie: 'v1 {naam, gestart}', omschrijving: 'Markering van een lopende native export (bestandsnaam en tijdstip, geen inhoud)' }),
    b({ id: 'organisatiecontext', opslag: 'sessionStorage', sleutel: 'tk_active_org_pref_v1', categorie: CAT.TOESTEL, vorm: 'tekst', eigenaar: 'geen', versie: 'v1', omschrijving: 'Gekozen organisatie in deze sessie' }),
    b({ id: 'offline_wachtrij', opslag: 'indexedDB', database: 'maurice_offline', categorie: CAT.WACHTRIJ, vorm: 'wachtrij', eigenaar: 'item', versie: 'v1 (store queue)',
      omschrijving: 'Nog niet verstuurde writes; eigenaar per item (owner_uid)' }),
    b({ id: 'controleregister', opslag: 'indexedDB', database: 'tk_verificatie', categorie: CAT.SYSTEEM, vorm: 'systeemdb', eigenaar: 'geen', versie: 'v1 (store register)',
      omschrijving: 'Verificatieregister en deze inventaris' })
  ];

  function leeg(v) { return v === null || v === undefined; }
  function canon(v) {
    if (leeg(v)) return null;
    if (Array.isArray(v)) return v.map(canon);
    if (typeof v === 'object') { var o = {}; Object.keys(v).sort().forEach(function (k) { o[k] = canon(v[k]); }); return o; }
    return v;
  }
  // FNV-1a 32-bit: deterministische vingerafdruk (wijzigingsdetectie), geen inhoud.
  function vingerafdruk(tekst) {
    var h = 0x811c9dc5, s = String(tekst);
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return ('00000000' + h.toString(16)).slice(-8);
  }
  function bronVoorSleutel(opslag, sleutel) {
    var exact = null, prefix = null;
    BRONNEN.forEach(function (br) {
      if (br.opslag !== opslag) return;
      if (br.sleutel === sleutel) exact = br;
      else if (br.prefix && sleutel.indexOf(br.prefix) === 0 && sleutel.length > br.prefix.length && (!prefix || br.prefix.length > prefix.prefix.length)) prefix = br;
    });
    return exact || prefix;
  }

  function persoonlijk(br) { return br.categorie !== CAT.TOESTEL && br.categorie !== CAT.SYSTEEM; }

  /* inventariseer({ scanner, cacheEigenaar, localStorage:{sleutel:waarde}|null, sessionStorage:{...}|null,
   *                 wachtrij: [items]|null (null = onleesbaar), databases: [namen]|null (null = lijst onbekend) })
   *  Uitkomst: { versie, volledig, redenen[], bronnen: [{ id, opslag, sleutel, categorie, vingerafdruk, leesbaar,
   *               records: [{ bron, record_sleutel, eigenaar, status, redenen[], vingerafdruk, teVergelijken, waarde? }] }] }
   *  'waarde' (geparseerd element) staat alleen op records die met de server vergeleken moeten worden en wordt nooit
   *  opgeslagen; de app bewaart alleen vingerafdrukken. */
  function inventariseer(inv) {
    var i = inv || {}, scanner = leeg(i.scanner) ? null : String(i.scanner);
    var cacheEig = (typeof i.cacheEigenaar === 'string' && i.cacheEigenaar !== '') ? i.cacheEigenaar : null;
    var redenen = [], bronnen = {}, volgorde = [];
    if (!scanner) redenen.push('geen_scanner');
    function bronUit(id, meta) {
      if (!bronnen[id]) { bronnen[id] = { id: id, opslag: meta.opslag, sleutel: meta.sleutel || meta.prefix || meta.database || null, categorie: meta.categorie || null,
        leesbaar: true, delen: [], records: [] }; volgorde.push(id); }
      return bronnen[id];
    }
    function eigenaarVan(br, sleutel) {
      if (br.eigenaar === 'geen') return null;
      if (br.eigenaar === 'cache') return cacheEig;
      if (br.eigenaar === 'suffix') { var s = sleutel.slice(br.prefix.length); return s ? s : null; }
      return null;
    }
    function status(br, eig, extra) {
      if (!persoonlijk(br)) return HIST.NIET_PERSOONLIJK;
      if (!eig) return HIST.EIGENAARLOOS;
      if (eig !== scanner) return HIST.ANDERE_EIGENAAR;
      if (br.categorie === CAT.WACHTRIJ) return HIST.WACHTRIJ;
      if (extra && extra.teVergelijken) return HIST.ONBEKEND;
      return HIST.NIET_VERIFIEERBAAR;
    }
    function rec(uit, br, sleutel, recordSleutel, eig, waarde, extra) {
      var st = status(br, eig, extra), r = { bron: uit.id, record_sleutel: recordSleutel, eigenaar: eig, status: st, redenen: [],
        vingerafdruk: vingerafdruk(JSON.stringify(canon(waarde))), teVergelijken: !!(extra && extra.teVergelijken && st === HIST.ONBEKEND) };
      if (br.categorie === CAT.LEGACY) r.redenen.push('oude_structuur');
      if (br.categorie === CAT.CONCEPT) r.redenen.push('concept_niet_op_server');
      if (br.categorie === CAT.SERVERKOPIE) r.redenen.push('serverkopie_herstel_onbewezen');
      if (br.categorie === CAT.VOORKEUR) r.redenen.push('voorkeur_niet_op_server');
      if (extra && extra.reden) r.redenen.push(extra.reden);
      if (r.teVergelijken) r.waarde = waarde;
      uit.records.push(r);
    }
    function opslagBron(opslag, store) {
      if (store === null || store === undefined) { var u = bronUit(opslag + ':onleesbaar', { opslag: opslag }); u.leesbaar = false;
        u.records.push({ bron: u.id, record_sleutel: '*', eigenaar: null, status: HIST.ONLEESBAAR, redenen: ['opslag_niet_leesbaar'], vingerafdruk: null, teVergelijken: false });
        redenen.push(opslag + '_onleesbaar'); return; }
      Object.keys(store).sort().forEach(function (sleutel) {
        var ruw = store[sleutel], br = bronVoorSleutel(opslag, sleutel);
        if (!br) {
          var o = bronUit(opslag + ':onbekend', { opslag: opslag, categorie: null });
          o.delen.push(sleutel + '=' + vingerafdruk(ruw));
          o.records.push({ bron: o.id, record_sleutel: sleutel, eigenaar: null, status: HIST.ONBEKENDE_BRON, redenen: ['niet_in_manifest'], vingerafdruk: vingerafdruk(ruw), teVergelijken: false });
          return;
        }
        var uit = bronUit(br.id, br), eig = eigenaarVan(br, sleutel);
        uit.delen.push(sleutel + '=' + (br.vorm === 'geheim' ? 'aanwezig' : vingerafdruk(ruw)));
        if (br.vorm === 'geheim') { rec(uit, br, sleutel, sleutel, eig, 'aanwezig'); return; }
        if (br.vorm === 'tekst') { rec(uit, br, sleutel, sleutel, eig, ruw); return; }
        var v;
        try { v = JSON.parse(ruw); } catch (e) {
          uit.leesbaar = false;
          uit.records.push({ bron: uit.id, record_sleutel: sleutel, eigenaar: eig, status: persoonlijk(br) ? HIST.ONLEESBAAR : HIST.NIET_PERSOONLIJK,
            redenen: ['json_ongeldig'], vingerafdruk: vingerafdruk(ruw), teVergelijken: false });
          return;
        }
        if (br.vorm === 'array' || br.vorm === 'ids') {
          if (!Array.isArray(v)) { uit.leesbaar = false; uit.records.push({ bron: uit.id, record_sleutel: sleutel, eigenaar: eig, status: HIST.ONLEESBAAR,
            redenen: ['onverwachte_structuur'], vingerafdruk: vingerafdruk(ruw), teVergelijken: false }); return; }
          v.forEach(function (el, idx) {
            if (br.vorm === 'ids') { rec(uit, br, sleutel, 'id:' + String(el), eig, el); return; }
            if (br.identiteit === 'id' && el && typeof el === 'object' && !leeg(el.id) && el.id !== '') {
              rec(uit, br, sleutel, 'id:' + String(el.id), eig, el, { teVergelijken: !!br.serverTabel });
            } else {
              rec(uit, br, sleutel, 'positie:' + idx, eig, el, { reden: br.identiteit === 'id' ? 'geen_id' : 'identiteit_op_positie' });
            }
          });
          return;
        }
        if (br.vorm === 'map') {
          if (!v || typeof v !== 'object' || Array.isArray(v)) { uit.leesbaar = false; uit.records.push({ bron: uit.id, record_sleutel: sleutel, eigenaar: eig,
            status: HIST.ONLEESBAAR, redenen: ['onverwachte_structuur'], vingerafdruk: vingerafdruk(ruw), teVergelijken: false }); return; }
          Object.keys(v).sort().forEach(function (k) { rec(uit, br, sleutel, 'sleutel:' + k, eig, v[k]); });
          return;
        }
        rec(uit, br, sleutel, sleutel, eig, v);
      });
    }
    opslagBron('localStorage', i.localStorage);
    opslagBron('sessionStorage', i.sessionStorage);
    // Offline-wachtrij: eigenaar per item.
    var wq = BRONNEN.filter(function (x) { return x.id === 'offline_wachtrij'; })[0];
    var wu = bronUit(wq.id, wq);
    if (!Array.isArray(i.wachtrij)) {
      wu.leesbaar = false; redenen.push('wachtrij_onleesbaar');
      wu.records.push({ bron: wu.id, record_sleutel: '*', eigenaar: null, status: HIST.ONLEESBAAR, redenen: ['wachtrij_niet_leesbaar'], vingerafdruk: null, teVergelijken: false });
    } else {
      i.wachtrij.forEach(function (it, idx) {
        var eig = (it && typeof it.owner_uid === 'string' && it.owner_uid !== '') ? it.owner_uid : null;
        var rs = 'item:' + ((it && !leeg(it.id)) ? String(it.id) : ('positie:' + idx));
        var inhoud = it ? { table: it.table, method: it.method, filter: it.filter, body: it.body, function: it.function, args: it.args } : null;
        wu.delen.push(rs + '=' + vingerafdruk(JSON.stringify(canon(inhoud))));
        rec(wu, wq, null, rs, eig, inhoud, it && it.onzeker ? { reden: 'onzeker_verzonden' } : null);
      });
    }
    // IndexedDB-databases: alleen bekende databases zijn toegestaan; een onbekende database of een onbekende lijst blokkeert.
    if (!Array.isArray(i.databases)) {
      var d0 = bronUit('indexedDB:lijst', { opslag: 'indexedDB' }); d0.leesbaar = false; redenen.push('databaselijst_onbekend');
      d0.records.push({ bron: d0.id, record_sleutel: '*', eigenaar: null, status: HIST.ONBEKEND, redenen: ['databaselijst_niet_beschikbaar'], vingerafdruk: null, teVergelijken: false });
    } else {
      i.databases.slice().sort().forEach(function (naam) {
        var br = BRONNEN.filter(function (x) { return x.opslag === 'indexedDB' && x.database === naam; })[0];
        if (br) { if (br.vorm === 'systeemdb') { var s = bronUit(br.id, br); s.delen.push(naam); s.records.push({ bron: s.id, record_sleutel: naam, eigenaar: null, status: HIST.NIET_PERSOONLIJK, redenen: [], vingerafdruk: null, teVergelijken: false }); } return; }
        var o = bronUit('indexedDB:onbekend', { opslag: 'indexedDB' }); o.delen.push(naam);
        o.records.push({ bron: o.id, record_sleutel: 'database:' + naam, eigenaar: null, status: HIST.ONBEKENDE_BRON, redenen: ['database_niet_in_manifest'], vingerafdruk: null, teVergelijken: false });
      });
    }
    var lijst = volgorde.map(function (id) {
      var x = bronnen[id]; x.vingerafdruk = vingerafdruk(x.delen.slice().sort().join('\u0001') + '|' + (x.leesbaar ? '1' : '0')); delete x.delen; return x;
    });
    lijst.forEach(function (x) { if (!x.leesbaar && redenen.indexOf('bron_onleesbaar:' + x.id) < 0) redenen.push('bron_onleesbaar:' + x.id); });
    return { versie: VERSIE, volledig: redenen.length === 0, redenen: redenen, bronnen: lijst };
  }

  /* vergelijkTraining(lokaal, server, serverKinderen, scanner, inhoud)
   *  server: rij | null (niet zichtbaar) | undefined (niet gelezen); serverKinderen: array | undefined.
   *  inhoud: functie die een training (lokaal model) canoniek maakt (app: tkTrainingInhoud). De serverrij wordt
   *  door de aanroeper al naar het lokale model omgezet (zelfde mapping als de sync). Nooit SERVER_VERIFIED. */
  function vergelijkTraining(lokaal, server, serverKinderen, scanner, inhoud) {
    if (server === undefined || (server && serverKinderen === undefined) || typeof inhoud !== 'function') return { status: HIST.ONBEKEND, redenen: ['niet_vergeleken'] };
    if (server === null) return { status: HIST.NIET_GEVONDEN, redenen: ['niet_zichtbaar_voor_eigenaar'] };
    if (leeg(server.user_id) || String(server.user_id) !== String(scanner)) return { status: HIST.AFWIJKEND, redenen: ['eigenaar'] };
    if (String(server.id) !== String(lokaal && lokaal.id)) return { status: HIST.AFWIJKEND, redenen: ['record_id'] };
    var a, c;
    try { a = inhoud(lokaal); c = inhoud(server.model); } catch (e) { return { status: HIST.ONBEKEND, redenen: ['inhoud_niet_te_bepalen'] }; }
    if (a !== c) return { status: HIST.AFWIJKEND, redenen: ['inhoud'] };
    return { status: HIST.GEKOPPELD, redenen: [] };
  }

  /* bronnenTeVerwerken(voortgang, bronnen): bij een onderbroken run (status 'bezig') worden bronnen die in DEZE run
   *  al zijn afgerond en sindsdien niet gewijzigd (zelfde vingerafdruk) overgeslagen. Elke andere situatie: alles. */
  function bronnenTeVerwerken(voortgang, bronnen) {
    var v = voortgang && voortgang.status === 'bezig' && voortgang.bronnen && typeof voortgang.bronnen === 'object' ? voortgang.bronnen : null;
    return (bronnen || []).filter(function (br) { var k = v && v[br.id]; return !(k && k.klaar === true && k.vingerafdruk === br.vingerafdruk); });
  }

  /* samenvatting(records, { volledig, bronnen, voortgang }) → aantallen en poortinvoer.
   *  geinventariseerd: alle records; overeenkomend: HIST_GEKOPPELD; onbekend: niet vast te stellen (ONBEKEND,
   *  EIGENAARLOOS, ONLEESBAAR, ONBEKENDE_BRON); geblokkeerd: alles wat de poort blokkeert. */
  function samenvatting(records, meta) {
    var m = meta || {}, telling = {}, perCategorie = {}, rs = Array.isArray(records) ? records : [];
    rs.forEach(function (r) { telling[r.status] = (telling[r.status] || 0) + 1; });
    var tel = function (lst) { return lst.reduce(function (s, k) { return s + (telling[k] || 0); }, 0); };
    var geblokkeerd = rs.filter(function (r) { return NIET_BLOKKEREND.indexOf(r.status) < 0; }).length;
    var compleet = m.volledig === true && !!m.voortgang && m.voortgang.status === 'voltooid';
    return {
      versie: VERSIE, geinventariseerd: rs.length, overeenkomend: telling[HIST.GEKOPPELD] || 0,
      onbekend: tel([HIST.ONBEKEND, HIST.EIGENAARLOOS, HIST.ONLEESBAAR, HIST.ONBEKENDE_BRON]),
      geblokkeerd: geblokkeerd, telling: telling, compleet: compleet,
      poort: { geinventariseerd: compleet, aantal: compleet ? geblokkeerd : NaN }
    };
  }
  function blokkeert(status) { return NIET_BLOKKEREND.indexOf(status) < 0; }

  return { VERSIE: VERSIE, HIST: HIST, CAT: CAT, BRONNEN: BRONNEN, inventariseer: inventariseer, vergelijkTraining: vergelijkTraining,
    bronnenTeVerwerken: bronnenTeVerwerken, samenvatting: samenvatting, blokkeert: blokkeert, bronVoorSleutel: bronVoorSleutel, vingerafdruk: vingerafdruk };
}));
