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

  /* verifyRecord({ verwacht, server, eigenaar, eigenaarVeld, velden, bron, tijdstip })
   *  verwacht: de lokaal ingevoerde rij (met id); server: de teruggelezen rij of null.
   *  Uitkomst: { versie, status, record_id, owner_uid, hash_lokaal, hash_server, afwijkingen[], bron, verified_at } */
  function verifyRecord(inv) {
    var i = inv || {};
    var basis = { versie: VERSIE, status: STATUS.UNKNOWN, record_id: null, owner_uid: null, hash_lokaal: null,
      hash_server: null, afwijkingen: [], bron: i.bron || null, verified_at: null };
    var v = i.verwacht, eigenaarVeld = i.eigenaarVeld || 'user_id', velden = normVelden(i.velden);
    if (!v || typeof v !== 'object' || leeg(v.id) || !i.eigenaar || !velden.length || !i.bron || !i.tijdstip) {
      basis.afwijkingen.push('onvolledige_invoer'); return basis;
    }
    basis.record_id = String(v.id); basis.owner_uid = String(i.eigenaar);
    basis.hash_lokaal = vingerafdruk(canoniek(v, velden));
    if (i.server === undefined) { basis.afwijkingen.push('niet_teruggelezen'); return basis; }
    if (i.server === null) { basis.status = STATUS.MISSING; basis.afwijkingen.push('rij_ontbreekt'); return basis; }
    var s = i.server;
    basis.hash_server = vingerafdruk(canoniek(s, velden));
    if (String(s.id) !== basis.record_id) basis.afwijkingen.push('record_id');
    if (leeg(s[eigenaarVeld]) || String(s[eigenaarVeld]) !== basis.owner_uid) basis.afwijkingen.push('eigenaar');
    velden.forEach(function (f) {
      if (JSON.stringify(canon(v[f.naam], f.type)) !== JSON.stringify(canon(s[f.naam], f.type))) basis.afwijkingen.push('veld:' + f.naam);
    });
    if (basis.afwijkingen.length) { basis.status = STATUS.MISMATCH; return basis; }
    basis.status = STATUS.SERVER_VERIFIED; basis.verified_at = String(i.tijdstip);
    return basis;
  }

  /* verifyParentChildren({ ouder, kinderen, serverOuder, serverKinderen, sleutel, ...verifyRecord-opties })
   *  Ouder en elk verwacht kind moeten SERVER_VERIFIED zijn. Extra serverkinderen (niet lokaal bekend)
   *  maken de groep MISMATCH: de server bevat dan iets anders dan de sporter lokaal heeft. */
  function verifyParentChildren(inv) {
    var i = inv || {};
    var opties = function (verwacht, server, velden) {
      return { verwacht: verwacht, server: server, eigenaar: i.eigenaar, eigenaarVeld: i.eigenaarVeld,
        velden: velden, bron: i.bron, tijdstip: i.tijdstip };
    };
    var ouder = verifyRecord(opties(i.ouder, i.serverOuder, i.oudervelden));
    var srvKids = Array.isArray(i.serverKinderen) ? i.serverKinderen : null;
    var kids = (Array.isArray(i.kinderen) ? i.kinderen : []).map(function (k) {
      var srv = srvKids === null ? undefined : (srvKids.filter(function (x) { return String(x.id) === String(k && k.id); })[0] || null);
      return verifyRecord(opties(k, srv, i.kindvelden));
    });
    var extra = srvKids === null ? [] : srvKids.filter(function (x) {
      return !(i.kinderen || []).some(function (k) { return k && String(k.id) === String(x.id); });
    }).map(function (x) { return String(x.id); });
    var alle = [ouder].concat(kids);
    var status = aggregate(alle).status;
    if (status === STATUS.SERVER_VERIFIED && extra.length) status = STATUS.MISMATCH;
    if (!Array.isArray(i.kinderen)) status = STATUS.UNKNOWN;
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

  /* uninstallGate({ inventaris, resultaten })
   *  inventaris: { volledig:boolean, onleesbaar:[...], ids:[record_id...] } — alles wat lokaal bestaat.
   *  Toegestaan alleen als de inventaris volledig en leesbaar is EN elk lokaal id SERVER_VERIFIED is. */
  function uninstallGate(inv) {
    var i = inv || {}, inventaris = i.inventaris || {}, redenen = [];
    var resultaten = Array.isArray(i.resultaten) ? i.resultaten : [];
    if (inventaris.volledig !== true) redenen.push('inventaris_onvolledig');
    if (Array.isArray(inventaris.onleesbaar) && inventaris.onleesbaar.length) redenen.push('lokale_bron_onleesbaar');
    var ids = Array.isArray(inventaris.ids) ? inventaris.ids.map(String) : null;
    if (ids === null) redenen.push('inventaris_zonder_ids');
    (ids || []).forEach(function (id) {
      var r = resultaten.filter(function (x) { return x && x.record_id === id; })[0];
      if (!r) redenen.push('niet_geverifieerd:' + id);
      else if (r.status !== STATUS.SERVER_VERIFIED) redenen.push(String(r.status).toLowerCase() + ':' + id);
    });
    return { versie: VERSIE, toegestaan: redenen.length === 0, redenen: redenen };
  }

  return {
    VERSIE: VERSIE, STATUS: STATUS, magOvergaan: magOvergaan, canoniek: canoniek, vingerafdruk: vingerafdruk,
    verifyRecord: verifyRecord, verifyParentChildren: verifyParentChildren, aggregate: aggregate, uninstallGate: uninstallGate
  };
}));
