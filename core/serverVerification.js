/* ==========================================================================
 * TrainingKompas — SERVER READ-AFTER-WRITE VERIFICATIE  (serververify.v1)
 * --------------------------------------------------------------------------
 * WAAROM DEZE MODULE BESTAAT (TK-REL-SEC-10, heracceptatie 19-10-2026)
 * Een HTTP 2xx of een lege offline-wachtrij bewijst NIET dat de sportergegevens
 * volledig en correct op de server staan (ignore-duplicates geeft 2xx bij een
 * al bestaande — mogelijk andere — rij; een PATCH met 0 rijen is 2xx; RLS kan
 * een rij onzichtbaar maken). Een Android-de-installatie (allowBackup=false)
 * wist alle lokale data. Daarom één formeel contract:
 *
 *   LOCAL → QUEUED → SENT → SERVER_ACCEPTED → SERVER_VERIFIED
 *
 * met daarnaast de eindtoestanden MISMATCH, MISSING en UNKNOWN. Alleen
 * SERVER_VERIFIED geldt als bewijs van serveropslag; alles anders blokkeert.
 *
 * SCOPE VAN DEZE EERSTE, NIET-DESTRUCTIEVE STAP
 * Zuivere functies: vergelijken wat lokaal is ingevoerd met wat de server bij
 * teruglezen teruggeeft, en daaruit een verificatie-uitkomst en een
 * de-installatiepoort afleiden. Geen netwerk, geen opslag, geen DOM, geen klok
 * (tijdstip en bron worden meegegeven). Deze module wijzigt geen enkele
 * trainingsrij en wordt nog niet door de app geladen; de leesroute per tabel en
 * het lokale register van te verifiëren id's volgen in een aparte Draft-PR.
 *
 * Fail-closed: ontbrekende of ongeldige invoer is UNKNOWN, nooit VERIFIED.
 *
 * FASE 2 (TK-REL-SEC-21, 19-10-2026): identiteit van een verificatie is
 * SAMENGESTELD: tabel + record-id + eigenaar + lokale revisie (sleutel()).
 * Een resultaat telt alleen voor precies die combinatie; een resultaat voor een
 * andere tabel, eigenaar of een oudere revisie is géén bewijs. Een rij die bij
 * teruglezen ontbreekt is MISSING maar nooit definitief (RLS kan een rij
 * onzichtbaar maken); een leesfout is UNKNOWN. beoordeelRegister() is de poort:
 * een leeg, defect of onvolledig register, historische lokale gegevens buiten
 * het register of één ontbrekend resultaat betekent nooit "veilig".
 * ========================================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ServerVerificationCore = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VERSIE = 'serververify.v1';
  var STATUS = {
    LOCAL: 'LOCAL', QUEUED: 'QUEUED', SENT: 'SENT',
    SERVER_ACCEPTED: 'SERVER_ACCEPTED', SERVER_VERIFIED: 'SERVER_VERIFIED',
    MISMATCH: 'MISMATCH', MISSING: 'MISSING', UNKNOWN: 'UNKNOWN'
  };
  // Toegestane overgangen; een sprong naar SERVER_VERIFIED kan alleen via verifyRecord().
  var OVERGANGEN = {
    LOCAL: ['QUEUED', 'SENT'],
    QUEUED: ['SENT'],
    SENT: ['SERVER_ACCEPTED', 'QUEUED', 'UNKNOWN'],
    SERVER_ACCEPTED: ['SERVER_VERIFIED', 'MISMATCH', 'MISSING', 'UNKNOWN'],
    SERVER_VERIFIED: [], MISMATCH: [], MISSING: [], UNKNOWN: []
  };
  function magOvergaan(van, naar) {
    return Object.prototype.hasOwnProperty.call(OVERGANGEN, van) && OVERGANGEN[van].indexOf(naar) >= 0;
  }

  function leeg(v) { return v === null || v === undefined; }
  // Canonieke waarde: getallen als genormaliseerd getal (ook "8.0" == 8), strings getrimd, objecten met
  // gesorteerde sleutels. Een numerieke string is alleen gelijk aan een getal als het veld numeriek is
  // opgegeven (velden met type 'number'): geen gokwerk over types.
  function canon(v, type) {
    if (leeg(v)) return null;
    if (type === 'number') {
      var n = (typeof v === 'number') ? v : (typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN);
      return isFinite(n) ? n : { ongeldig: String(v) };
    }
    if (typeof v === 'string') return v.trim();
    if (Array.isArray(v)) return v.map(function (x) { return canon(x); });
    if (typeof v === 'object') {
      var o = {}; Object.keys(v).sort().forEach(function (k) { o[k] = canon(v[k]); }); return o;
    }
    return v;
  }
  // TK-REL-SEC-21: automatische, deterministische vergelijking voor velden zonder opgegeven type.
  //  - getal tegen numerieke string: numeriek vergeleken (PostgREST geeft numeric/integer als getal terug);
  //  - ISO-tijdstip met tijdzone tegen ISO-tijdstip: vergeleken op milliseconden (Postgres schrijft +00:00 i.p.v. Z);
  //  - objecten en arrays: canoniek (gesorteerde sleutels, recursief met dezelfde regels);
  //  - verder: strikt na trimmen van strings. Geen andere conversies (geen gokwerk).
  var ISO_TS = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}(:?\d{2})?)$/;
  function isNumeriekeString(x) { return typeof x === 'string' && x.trim() !== '' && isFinite(Number(x)); }
  function waardeGelijk(a, b) {
    if (leeg(a) || leeg(b)) return leeg(a) && leeg(b);
    if (typeof a === 'number' || typeof b === 'number') {
      var na = typeof a === 'number' ? a : (isNumeriekeString(a) ? Number(a) : NaN);
      var nb = typeof b === 'number' ? b : (isNumeriekeString(b) ? Number(b) : NaN);
      return isFinite(na) && isFinite(nb) && na === nb;
    }
    if (typeof a === 'string' && typeof b === 'string') {
      var ta = a.trim(), tb = b.trim();
      if (ta === tb) return true;
      if (ISO_TS.test(ta) && ISO_TS.test(tb)) { var ma = Date.parse(ta.replace(' ', 'T')), mb = Date.parse(tb.replace(' ', 'T')); return isFinite(ma) && ma === mb; }
      return false;
    }
    if (Array.isArray(a) || Array.isArray(b)) {
      if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
      for (var i = 0; i < a.length; i++) if (!waardeGelijk(a[i], b[i])) return false;
      return true;
    }
    if (typeof a === 'object' && typeof b === 'object') {
      var ka = Object.keys(a).filter(function (k) { return !leeg(a[k]); }).sort();
      var kb = Object.keys(b).filter(function (k) { return !leeg(b[k]); }).sort();
      if (ka.join('\u0001') !== kb.join('\u0001')) return false;
      return ka.every(function (k) { return waardeGelijk(a[k], b[k]); });
    }
    return a === b;
  }
  function veldGelijk(f, a, b) {
    if (f.type) return JSON.stringify(canon(a, f.type)) === JSON.stringify(canon(b, f.type));
    return waardeGelijk(a, b);
  }
  // TK-REL-SEC-21: samengestelde identiteit. Een lege component maakt de sleutel ongeldig (null).
  function sleutel(tabel, recordId, eigenaar) {
    if (leeg(tabel) || leeg(recordId) || leeg(eigenaar) || tabel === '' || recordId === '' || eigenaar === '') return null;
    return String(tabel) + '\u001f' + String(recordId) + '\u001f' + String(eigenaar);
  }
  // record-id uit één of meer sleutelvelden (bv. activity_laps: activity_id + lap_index).
  function recordIdVan(rij, sleutelVelden) {
    if (!rij || typeof rij !== 'object') return null;
    var sv = (Array.isArray(sleutelVelden) && sleutelVelden.length) ? sleutelVelden : ['id'];
    var delen = sv.map(function (k) { return rij[k]; });
    if (delen.some(leeg)) return null;
    return delen.map(String).join(':');
  }

  // velden: [{naam, type}] of ['naam']; alleen deze velden tellen (server-velden zoals created_at niet).
  function normVelden(velden) {
    return (velden || []).map(function (f) { return typeof f === 'string' ? { naam: f, type: null } : f; })
      .filter(function (f) { return f && typeof f.naam === 'string'; })
      .sort(function (a, b) { return a.naam < b.naam ? -1 : a.naam > b.naam ? 1 : 0; });
  }
  function canoniek(rij, velden) {
    var o = {}; normVelden(velden).forEach(function (f) { o[f.naam] = canon(rij ? rij[f.naam] : undefined, f.type); });
    return JSON.stringify(o);
  }
  // FNV-1a 32-bit: deterministische inhoudsvingerafdruk voor rapportage (geen beveiligingsfunctie).
  function vingerafdruk(tekst) {
    var h = 0x811c9dc5;
    for (var i = 0; i < tekst.length; i++) { h ^= tekst.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return ('00000000' + h.toString(16)).slice(-8);
  }

  /* verifyRecord({ verwacht, server, eigenaar, eigenaarVeld, velden, bron, tijdstip,
   *                 tabel, revisie, sleutelVelden, eigenaarViaOuder, verwijderd })
   *  verwacht: de lokaal ingevoerde rij; server: de teruggelezen rij, null (niet zichtbaar) of undefined (niet gelezen).
   *  tabel/revisie (TK-REL-SEC-21) maken de samengestelde identiteit compleet; zonder beide telt het resultaat
   *  in beoordeelRegister() nooit als bewijs. eigenaarVeld:null mag alleen met eigenaarViaOuder:true (tabellen
   *  zonder eigen user_id, zoals nutrition_meal_items/activity_laps: eigendom via de ouder en RLS op de ouder).
   *  verwijderd:true: de laatste lokale write was een DELETE; verwacht wordt dat de rij ontbreekt.
   *  Uitkomst: { versie, status, tabel, record_id, owner_uid, revisie, sleutel, hash_lokaal, hash_server,
   *              afwijkingen[], definitief, bron, verified_at } */
  function verifyRecord(inv) {
    var i = inv || {};
    var basis = { versie: VERSIE, status: STATUS.UNKNOWN, tabel: leeg(i.tabel) ? null : String(i.tabel), record_id: null,
      owner_uid: null, revisie: leeg(i.revisie) ? null : i.revisie, sleutel: null, hash_lokaal: null, hash_server: null,
      afwijkingen: [], definitief: false, bron: i.bron || null, verified_at: null };
    var v = i.verwacht, velden = normVelden(i.velden);
    var eigenaarVeld = (i.eigenaarVeld === null) ? null : (i.eigenaarVeld || 'user_id');
    var rid = recordIdVan(v, i.sleutelVelden);
    var eigenaarOk = eigenaarVeld !== null || i.eigenaarViaOuder === true;
    if (!v || typeof v !== 'object' || rid === null || !i.eigenaar || (!velden.length && i.verwijderd !== true) || !i.bron || !i.tijdstip || !eigenaarOk) {
      basis.afwijkingen.push('onvolledige_invoer'); return basis;
    }
    basis.record_id = rid; basis.owner_uid = String(i.eigenaar);
    basis.sleutel = sleutel(basis.tabel, rid, basis.owner_uid);
    basis.hash_lokaal = vingerafdruk(canoniek(v, velden));
    if (i.server === undefined) { basis.afwijkingen.push('niet_teruggelezen'); return basis; }
    if (i.verwijderd === true) {
      if (i.server === null) { basis.status = STATUS.SERVER_VERIFIED; basis.afwijkingen = []; basis.verified_at = String(i.tijdstip); return basis; }
      basis.status = STATUS.MISMATCH; basis.afwijkingen.push('nog_aanwezig'); return basis;
    }
    // Niet zichtbaar ≠ bewezen afwezig: RLS of een andere eigenaar kan de rij verbergen. Nooit definitief.
    if (i.server === null) { basis.status = STATUS.MISSING; basis.afwijkingen.push('rij_ontbreekt'); basis.afwijkingen.push('niet_zichtbaar_voor_eigenaar'); return basis; }
    var s = i.server;
    basis.hash_server = vingerafdruk(canoniek(s, velden));
    if (recordIdVan(s, i.sleutelVelden) !== rid) basis.afwijkingen.push('record_id');
    if (eigenaarVeld !== null && (leeg(s[eigenaarVeld]) || String(s[eigenaarVeld]) !== basis.owner_uid)) basis.afwijkingen.push('eigenaar');
    velden.forEach(function (f) { if (!veldGelijk(f, v[f.naam], s[f.naam])) basis.afwijkingen.push('veld:' + f.naam); });
    if (basis.afwijkingen.length) { basis.status = STATUS.MISMATCH; basis.definitief = true; return basis; }
    basis.status = STATUS.SERVER_VERIFIED; basis.verified_at = String(i.tijdstip);
    return basis;
  }

  /* verifyParentChildren({ ouder, kinderen, serverOuder, serverKinderen, oudertabel, kindtabel, ouderRevisie,
   *                         kindRevisies, kindSleutelVelden, kindEigenaarVeld, ...verifyRecord-opties })
   *  Ouder en elk verwacht kind moeten SERVER_VERIFIED zijn. Extra serverkinderen (niet lokaal bekend) maken de
   *  groep MISMATCH. Kinderen zonder eigen eigenaarsveld worden via de ouder toegerekend (alleen als de ouder
   *  zelf SERVER_VERIFIED is; anders is het kind hooguit UNKNOWN). serverKinderen === undefined = niet gelezen. */
  function verifyParentChildren(inv) {
    var i = inv || {};
    var ouder = verifyRecord({ verwacht: i.ouder, server: i.serverOuder, eigenaar: i.eigenaar, eigenaarVeld: i.eigenaarVeld,
      velden: i.oudervelden, bron: i.bron, tijdstip: i.tijdstip, tabel: i.oudertabel, revisie: i.ouderRevisie });
    var srvKids = Array.isArray(i.serverKinderen) ? i.serverKinderen : null;
    var ksv = i.kindSleutelVelden;
    var kindEigenaarVeld = (i.kindEigenaarVeld === null) ? null : (i.kindEigenaarVeld || i.eigenaarVeld || 'user_id');
    var lokaal = Array.isArray(i.kinderen) ? i.kinderen : [];
    var kids = lokaal.map(function (k, idx) {
      var rid = recordIdVan(k, ksv);
      var srv = srvKids === null ? undefined : (srvKids.filter(function (x) { return recordIdVan(x, ksv) === rid; })[0] || null);
      var r = verifyRecord({ verwacht: k, server: srv, eigenaar: i.eigenaar, eigenaarVeld: kindEigenaarVeld,
        eigenaarViaOuder: kindEigenaarVeld === null, velden: i.kindvelden, bron: i.bron, tijdstip: i.tijdstip,
        tabel: i.kindtabel, revisie: Array.isArray(i.kindRevisies) ? i.kindRevisies[idx] : undefined, sleutelVelden: ksv });
      if (kindEigenaarVeld === null && r.status === STATUS.SERVER_VERIFIED && ouder.status !== STATUS.SERVER_VERIFIED) {
        r.status = STATUS.UNKNOWN; r.verified_at = null; r.afwijkingen.push('eigenaar_ouder_onbewezen');
      }
      return r;
    });
    var extra = srvKids === null ? [] : srvKids.filter(function (x) {
      var rid = recordIdVan(x, ksv);
      return !lokaal.some(function (k) { return recordIdVan(k, ksv) === rid; });
    }).map(function (x) { return String(recordIdVan(x, ksv)); });
    var alle = [ouder].concat(kids);
    var status = aggregate(alle).status;
    if (extra.length && ERNST[STATUS.MISMATCH] > ERNST[status]) status = STATUS.MISMATCH;
    // Onbekende lokale kinderlijst of niet-gelezen serverkinderen: geen uitspraak mogelijk.
    if (!Array.isArray(i.kinderen) || srvKids === null) status = STATUS.UNKNOWN;
    return { versie: VERSIE, status: status, ouder: ouder, kinderen: kids, extra_server_kinderen: extra };
  }

  // Ernst: UNKNOWN en MISSING en MISMATCH blokkeren allemaal; de zwaarste bepaalt de groepsstatus.
  var ERNST = { SERVER_VERIFIED: 0, MISMATCH: 3, MISSING: 2, UNKNOWN: 1 };
  function aggregate(resultaten) {
    var r = Array.isArray(resultaten) ? resultaten : [];
    if (!r.length) return { status: STATUS.UNKNOWN, aantal: 0, geverifieerd: 0 };
    var slechtst = STATUS.SERVER_VERIFIED, ok = 0;
    r.forEach(function (x) {
      var s = (x && ERNST.hasOwnProperty(x.status)) ? x.status : STATUS.UNKNOWN;
      if (s === STATUS.SERVER_VERIFIED) ok++;
      if (ERNST[s] > ERNST[slechtst]) slechtst = s;
    });
    return { status: slechtst, aantal: r.length, geverifieerd: ok };
  }

  /* beoordeelRegister({ register, resultaten, historisch, onleesbaar })  — TK-REL-SEC-21
   *  register:  { aanwezig:boolean, defect:boolean, sinds:string, items:[{tabel, record_id, eigenaar, revisie}] }
   *  resultaten: uitkomsten van verifyRecord/verifyParentChildren (alleen records met tabel, eigenaar en revisie tellen)
   *  historisch: { geinventariseerd:boolean, aantal:number } — lokale gegevens van vóór het register
   *  onleesbaar: [bron...] — lokale bronnen die niet gelezen konden worden
   *  Uitkomst: { versie, toegestaan, redenen[], telling{status:aantal}, per[] }. Toegestaan alleen als het register
   *  aanwezig en heel is, de historie volledig is geïnventariseerd, niets onleesbaar is en ELK registeritem een
   *  SERVER_VERIFIED-resultaat heeft voor exact dezelfde tabel, record-id, eigenaar én revisie. */
  function beoordeelRegister(inv) {
    var i = inv || {}, reg = i.register || {}, redenen = [], telling = {}, per = [];
    var resultaten = (Array.isArray(i.resultaten) ? i.resultaten : []).filter(function (x) { return x && typeof x === 'object'; });
    if (reg.aanwezig !== true) redenen.push('register_ontbreekt');
    if (reg.defect === true) redenen.push('register_defect');
    var hist = i.historisch || {};
    if (hist.geinventariseerd !== true) redenen.push('historie_niet_geinventariseerd');
    if (typeof hist.aantal !== 'number' || hist.aantal !== 0) redenen.push('historische_gegevens_buiten_register');
    if (!Array.isArray(i.onleesbaar) || i.onleesbaar.length) redenen.push('lokale_bron_onleesbaar');
    var items = Array.isArray(reg.items) ? reg.items : null;
    if (items === null) redenen.push('register_zonder_items');
    // Resultaat per samengestelde sleutel; per sleutel de nieuwste revisie die is teruggelezen.
    var opSleutel = {};
    resultaten.forEach(function (r) {
      var k = sleutel(r.tabel, r.record_id, r.owner_uid);
      if (k === null || leeg(r.revisie)) return;
      (opSleutel[k] = opSleutel[k] || []).push(r);
    });
    (items || []).forEach(function (it) {
      var k = it ? sleutel(it.tabel, it.record_id, it.eigenaar) : null;
      var status;
      if (k === null || leeg(it.revisie)) { status = 'IDENTITEIT_ONVOLLEDIG'; redenen.push('identiteit_onvolledig'); }
      else {
        var kandidaten = (opSleutel[k] || []).filter(function (r) { return String(r.revisie) === String(it.revisie); });
        if (!kandidaten.length) { status = (opSleutel[k] || []).length ? 'VEROUDERD' : 'NIET_GEVERIFIEERD'; redenen.push(status.toLowerCase() + ':' + k); }
        else {
          // Bij meerdere uitkomsten voor dezelfde identiteit telt de zwaarste (geen gunstige keuze).
          status = aggregate(kandidaten).status;
          if (status !== STATUS.SERVER_VERIFIED) redenen.push(status.toLowerCase() + ':' + k);
        }
      }
      telling[status] = (telling[status] || 0) + 1;
      per.push({ sleutel: k, revisie: it ? it.revisie : null, status: status });
    });
    if (items !== null && !items.length && !redenen.length) redenen.push('register_leeg');
    return { versie: VERSIE, toegestaan: redenen.length === 0, redenen: redenen, telling: telling, per: per };
  }

  /* uninstallGate({ inventaris, resultaten }) — compatibele ingang naar beoordeelRegister().
   *  inventaris: { volledig, onleesbaar[], ids:[{tabel, record_id, eigenaar, revisie}], historischGeinventariseerd,
   *                historischAantal, registerDefect }. Kale string-id's (zonder tabel/eigenaar/revisie) zijn
   *  dubbelzinnig (dezelfde id kan in twee tabellen of bij twee gebruikers bestaan) en worden geweigerd. */
  function uninstallGate(inv) {
    var i = inv || {}, inventaris = i.inventaris || {};
    var ids = Array.isArray(inventaris.ids) ? inventaris.ids : null;
    var uit = beoordeelRegister({
      register: { aanwezig: ids !== null, defect: inventaris.registerDefect === true,
        items: ids === null ? null : ids.map(function (x) { return (x && typeof x === 'object') ? x : { record_id: x }; }) },
      resultaten: i.resultaten, onleesbaar: Array.isArray(inventaris.onleesbaar) ? inventaris.onleesbaar : [],
      historisch: { geinventariseerd: inventaris.historischGeinventariseerd === true, aantal: typeof inventaris.historischAantal === 'number' ? inventaris.historischAantal : NaN }
    });
    var redenen = uit.redenen.slice();
    if (inventaris.volledig !== true) redenen.unshift('inventaris_onvolledig');
    if (ids === null) redenen.push('inventaris_zonder_ids');
    return { versie: VERSIE, toegestaan: redenen.length === 0, redenen: redenen, telling: uit.telling };
  }

  return {
    VERSIE: VERSIE, STATUS: STATUS, magOvergaan: magOvergaan, canoniek: canoniek, vingerafdruk: vingerafdruk,
    verifyRecord: verifyRecord, verifyParentChildren: verifyParentChildren, aggregate: aggregate, uninstallGate: uninstallGate,
    beoordeelRegister: beoordeelRegister, sleutel: sleutel, recordIdVan: recordIdVan, waardeGelijk: waardeGelijk
  };
}));
