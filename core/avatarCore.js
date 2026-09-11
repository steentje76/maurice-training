/* core/avatarCore.js — CANONICAL USER AVATAR CORE
 *
 * PURE · DETERMINISTIC · OFFLINE-CAPABLE. Geen DOM, geen netwerk, geen DB.
 * De ENE bron van waarheid voor avatar-resolutie, bestandsvalidatie en
 * crop-berekening. Alle consumers (Profiel, Home/Vandaag, Samen, Coach/PT,
 * messaging, teams) gebruiken deze module -- er mag geen tweede
 * avatarsysteem per module ontstaan.
 *
 * FORENSISCH VASTGESTELD vóór deze module: index.html rendert al
 * `atleet.foto` op twee plekken met initialen-fallback, maar dat veld werd
 * nergens gezet. Die bestaande drietraps-gedachte (foto -> initialen ->
 * neutraal) is hier gecodificeerd, niet opnieuw bedacht.
 *
 * AI-IDENTITEIT: de AI Coach gebruikt deze menselijke avatar NIET. De
 * canonical AI-identiteit blijft het abstracte sparkle-symbool; resolve()
 * weigert daarom expliciet een AI-actor.
 */
(function (global) {
  'use strict';

  var VERSIONS = { resolve: 'avatar_resolve.v1', crop: 'avatar_crop.v1' };

  // Gelijk aan de bucketlimiet in migratie_v562.
  var MAX_BYTES = 2 * 1024 * 1024;
  // SVG ontbreekt bewust: kan script bevatten -> uitvoerbare inhoud als avatar.
  var TOEGESTANE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  // 512px is ruim voor een ronde avatar op 3x-schermen (max ~160 CSS-px).
  // Een 12 MP camerafoto wordt dus nooit permanent opgeslagen.
  var OUTPUT_PX = 512;

  var BRON = { FOTO: 'photo', INITIALEN: 'initials', NEUTRAAL: 'neutral' };

  function initialen(naam) {
    var s = String(naam == null ? '' : naam).trim();
    if (!s) return null;
    var delen = s.split(/\s+/).filter(Boolean);
    if (!delen.length) return null;
    if (delen.length === 1) return delen[0].charAt(0).toUpperCase();
    var tussen = ['van', 'de', 'der', 'den', 'het', 'ten', 'ter', "'t"];
    var laatste = null;
    for (var i = delen.length - 1; i >= 1; i--) {
      if (tussen.indexOf(delen[i].toLowerCase()) === -1) { laatste = delen[i]; break; }
    }
    if (!laatste) return delen[0].charAt(0).toUpperCase();
    return (delen[0].charAt(0) + laatste.charAt(0)).toUpperCase();
  }

  /* Drietraps resolutie. `zichtbaar` komt van de caller en volgt de
   * BESTAANDE privacy-/blokkeerregels; deze module beslist daar niet over.
   * avatar_path is een storage-referentie, nooit de bron van autorisatie. */
  function resolve(input) {
    var x = input || {};
    if (x.isAI) {
      return { versie: VERSIONS.resolve, bron: BRON.NEUTRAAL, isAI: true,
               pad: null, initialen: null,
               reden: 'AI-identiteit gebruikt het sparkle-symbool, niet deze renderer' };
    }
    var pad = (typeof x.avatarPath === 'string' && x.avatarPath.trim()) ? x.avatarPath.trim() : null;
    var zichtbaar = x.zichtbaar !== false;
    if (pad && zichtbaar) {
      return { versie: VERSIONS.resolve, bron: BRON.FOTO, pad: pad,
               initialen: initialen(x.naam), isAI: false, reden: null };
    }
    var ini = initialen(x.naam);
    if (ini) {
      return { versie: VERSIONS.resolve, bron: BRON.INITIALEN, pad: null,
               initialen: ini, isAI: false,
               reden: (pad && !zichtbaar) ? 'foto niet zichtbaar voor deze kijker' : null };
    }
    return { versie: VERSIONS.resolve, bron: BRON.NEUTRAAL, pad: null,
             initialen: null, isAI: false, reden: 'geen naam bekend' };
  }

  function valideerBestand(bestand) {
    var f = bestand || {};
    if (!f.type && !f.size) {
      return { ok: false, code: 'GEEN_BESTAND', bericht: 'Geen afbeelding gekozen.' };
    }
    if (TOEGESTANE_TYPES.indexOf(f.type) === -1) {
      return { ok: false, code: 'ONGELDIG_TYPE', bericht: 'Kies een JPG-, PNG- of WEBP-afbeelding.' };
    }
    if (typeof f.size === 'number' && f.size > MAX_BYTES) {
      return { ok: false, code: 'TE_GROOT', bericht: 'Deze afbeelding is groter dan 2 MB. Kies een kleinere foto.' };
    }
    return { ok: true, code: null, bericht: null };
  }

  function extensieVoor(mime) {
    if (mime === 'image/png') return 'png';
    if (mime === 'image/webp') return 'webp';
    return 'jpg';
  }

  /* Pad is ALTIJD {user_id}/{uuid}.{ext}. Het eerste segment is wat de
   * storage-policy tegen auth.uid() toetst; de bestandsnaam is een uuid en
   * bevat dus nooit door de gebruiker aangeleverde tekst.
   * Immutable key: bij vervangen komt er een NIEUWE uuid, zodat een gecachte
   * oude URL nooit de nieuwe foto maskeert -- geen Date.now()-cachebuster. */
  function bouwPad(userId, uuid, mime) {
    var uid = String(userId == null ? '' : userId).trim();
    var id = String(uuid == null ? '' : uuid).trim();
    if (!uid || !id) return null;
    if (!/^[A-Za-z0-9-]+$/.test(id)) return null;
    if (uid.indexOf('/') !== -1 || uid.indexOf('..') !== -1) return null;
    return uid + '/' + id + '.' + extensieVoor(mime);
  }

  function padEigenaar(pad) {
    if (typeof pad !== 'string') return null;
    var i = pad.indexOf('/');
    return i > 0 ? pad.slice(0, i) : null;
  }

  function minZoom() { return 1; }
  function maxZoom() { return 4; }
  function clampZoom(z) {
    var v = Number(z);
    if (!isFinite(v)) return 1;
    return Math.min(maxZoom(), Math.max(minZoom(), v));
  }

  /* De gebruiker bepaalt de uitsnede via verschuiven en zoomen. Centreren is
   * slechts de STARTWAARDE (offset 0,0) -- er is geen automatische
   * center-crop als enige optie. Venster is altijd vierkant (1:1). */
  function berekenCrop(invoer) {
    var x = invoer || {};
    var bw = Number(x.breedte), bh = Number(x.hoogte);
    if (!isFinite(bw) || !isFinite(bh) || bw <= 0 || bh <= 0) return null;

    var zoom = clampZoom(x.zoom == null ? 1 : x.zoom);
    var zijde = Math.min(bw, bh) / zoom;

    var cx = (bw / 2) + (Number(x.offsetX) || 0);
    var cy = (bh / 2) + (Number(x.offsetY) || 0);

    var half = zijde / 2;
    // Begrenzen: venster mag nooit buiten de afbeelding vallen -> geen lege
    // randen, geen vervorming.
    cx = Math.min(bw - half, Math.max(half, cx));
    cy = Math.min(bh - half, Math.max(half, cy));

    var s = Math.round(zijde);
    var sx = Math.round(cx - half);
    var sy = Math.round(cy - half);
    if (sx + s > bw) sx = Math.round(bw - s);
    if (sy + s > bh) sy = Math.round(bh - s);

    // Nooit opschalen -> geen kwaliteitsverlies of vervorming.
    var uit = Math.min(OUTPUT_PX, s);
    return {
      versie: VERSIONS.crop,
      sx: Math.max(0, sx), sy: Math.max(0, sy),
      sBreedte: s, sHoogte: s,
      uitBreedte: uit, uitHoogte: uit,
      zoom: zoom
    };
  }

  /* EXIF-orientatie 1..8. Native camerafoto's komen regelmatig geroteerd
   * binnen; zonder correctie staat de avatar scheef. */
  function orientatieTransform(o) {
    switch (Number(o)) {
      case 2: return { rotatie: 0,   spiegelX: true  };
      case 3: return { rotatie: 180, spiegelX: false };
      case 4: return { rotatie: 180, spiegelX: true  };
      case 5: return { rotatie: 90,  spiegelX: true  };
      case 6: return { rotatie: 90,  spiegelX: false };
      case 7: return { rotatie: 270, spiegelX: true  };
      case 8: return { rotatie: 270, spiegelX: false };
      default: return { rotatie: 0,  spiegelX: false };
    }
  }
  function wisseltAssen(o) {
    var n = Number(o);
    return n >= 5 && n <= 8;
  }

  var AvatarCore = {
    VERSIONS: VERSIONS, MAX_BYTES: MAX_BYTES, TOEGESTANE_TYPES: TOEGESTANE_TYPES,
    OUTPUT_PX: OUTPUT_PX, BRON: BRON,
    initialen: initialen, resolve: resolve, valideerBestand: valideerBestand,
    extensieVoor: extensieVoor, bouwPad: bouwPad, padEigenaar: padEigenaar,
    minZoom: minZoom, maxZoom: maxZoom, clampZoom: clampZoom,
    berekenCrop: berekenCrop,
    orientatieTransform: orientatieTransform, wisseltAssen: wisseltAssen
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = AvatarCore; }
  else { global.AvatarCore = AvatarCore; }
})(typeof window !== 'undefined' ? window : this);
