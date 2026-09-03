/* core/designSystemIcons.js
 * DS-03 — Canonical Icon Foundation (Design System v1, Product Owner approved).
 *
 * ICON STRATEGY DECISION: hergebruik van de reeds bestaande, dominante inline-
 * SVG-stijl uit index.html (viewBox="0 0 24 24" fill="none" stroke="currentColor"
 * stroke-width="2" — 31 van de 44 bestaande <svg viewBox="0 0 24 24">-elementen
 * gebruiken exact dit patroon). Geen externe icon-library/CDN geintroduceerd.
 *
 * WHY: (1) al bewezen, consistent gebruikt in de codebase; (2) 100% offline/PWA-
 * veilig, geen netwerkafhankelijkheid; (3) geen licentierisico (eigen, simpele
 * geometrische paden, geen gekopieerde library-assets); (4) geen bundle-gewicht
 * toegevoegd (geen dependency); (5) consistente stroke-breedte/style, sluit aan
 * bij de rustige, volwassen uitstraling van de zes canonical PNG's.
 * ALTERNATIVES OVERWOGEN: een externe library (bv. Feather/Lucide/Heroicons)
 * zou een build-stap of CDN-afhankelijkheid vereisen -- dit project is een
 * single-file PWA zonder build-pipeline voor dependencies; een externe library
 * toevoegen zou de offline-garantie doorbreken zonder aantoonbare meerwaarde
 * t.o.v. de al werkende inline-SVG-aanpak. LICENSE: n.v.t. (eigen paden).
 * BUNDLE/OFFLINE IMPACT: 0 -- puur JS-strings, geen extra netwerk-requests,
 * geen extra service-worker-cache-entries nodig.
 *
 * Dit is een puur presentationele module: geen berekeningen, geen canonical
 * metrics, geen business-logica. Components presenteren alleen (Fase 13).
 */
'use strict';

/* Canonical semantic icon registry. Elke naam een enkel, generiek pictogram --
 * geen sportspecifieke betekenis verzonnen waar een generiek icoon semantisch
 * veiliger is (bv. 'more' is drie puntjes, geen sport-icoon). */
var ICON_PATHS = {
  // Primaire navigatie (5 tabs)
  vandaag: '<path d="M3 12l9-9 9 9M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10"/>',
  trainen: '<path d="M6.5 6.5l11 11M4 4l3 3M20 20l-3-3M2 8l4-4M22 16l-4 4M14 4l3 3-8 8-3-3z"/>',
  inzicht: '<path d="M3 3v18h18M7 15l4-4 3 3 5-6"/>',
  coach: '<path d="M12 3l1.2 3.2L16.4 7.6 13.2 8.8 12 12l-1.2-3.2L7.6 7.6l3.2-1.2z"/><path d="M5 16l.7 1.8L7.5 18.5l-1.8.7L5 21l-.7-1.8L2.5 18.5l1.8-.7z"/>',
  samen: '<circle cx="9" cy="8" r="3"/><circle cx="16" cy="9" r="2.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M14.5 14.2c2.5.3 4.5 2.4 4.5 5.1"/>',

  // Profiel & instellingen
  profiel: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>',
  instellingen: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  apparaten: '<rect x="4" y="8" width="6" height="10" rx="1"/><rect x="14" y="5" width="6" height="13" rx="1"/><path d="M7 18v2M17 18v2"/>',
  privacy: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  meldingen: '<path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10.5 20a1.5 1.5 0 0 0 3 0"/>',
  abonnement: '<path d="M3 8l4 3 5-6 5 6 4-3-2 11H5z"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.7-2.5 2-2.5 4"/><path d="M12 17h.01"/>',
  feedback: '<path d="M4 5h16v11H8l-4 4z"/>',
  account: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>',

  // Training
  start: '<path d="M6 4l14 8-14 8z"/>',
  agenda: '<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M4 10h16M8 3v4M16 3v4"/>',
  historie: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/><path d="M4 5l1.5 3"/>',
  programma: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 9h8M8 13h8M8 17h5"/>',
  workout: '<circle cx="6" cy="12" r="2"/><circle cx="18" cy="12" r="2"/><path d="M8 12h8M4 10v4M20 10v4"/>',
  kracht: '<circle cx="6" cy="12" r="2"/><circle cx="18" cy="12" r="2"/><path d="M8 12h8M4 10v4M20 10v4"/>',
  hardlopen: '<circle cx="15" cy="5" r="2"/><path d="M5 21l4-5 3 2 2-4-3-3 1-4 4 2 2 4"/>',
  fietsen: '<circle cx="6" cy="17" r="3"/><circle cx="18" cy="17" r="3"/><path d="M9 17l4-9h4M9 17l3-5 3 5"/>',
  hyrox: '<circle cx="12" cy="12" r="9"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/>',
  meer: '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
  oefening: '<circle cx="6" cy="12" r="2"/><circle cx="18" cy="12" r="2"/><path d="M8 12h8M4 10v4M20 10v4"/>',

  // Inzicht / herstel
  herstel: '<path d="M20 8.5c0-2.5-2-4.5-4.5-4.5-1.5 0-2.8.7-3.5 1.8-.7-1.1-2-1.8-3.5-1.8C6 4 4 6 4 8.5c0 4.5 8 10.5 8 10.5s8-6 8-10.5z"/>',
  hartslag: '<path d="M3 12h4l2-7 4 14 2-7h6"/>',
  slaap: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  lichaam: '<circle cx="12" cy="5" r="2.5"/><path d="M9 22v-6l-2-5 1-4h8l1 4-2 5v6"/><path d="M9 12h6"/>',
  trend: '<path d="M3 17l5-5 4 4 8-8"/><path d="M15 8h5v5"/>',
  doel: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="0.7" fill="currentColor"/>',
  belasting: '<path d="M4 20V10M9 20V4M14 20v-8M19 20v-4"/>',

  // Coach
  aisparkle: '<path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z"/><path d="M5 16l.7 1.8L7.5 18.5l-1.8.7L5 21l-.7-1.8L2.5 18.5l1.8-.7z"/>',
  menselijkecoach: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>',
  bericht: '<path d="M4 5h16v11H8l-4 4z"/>',

  // Samen
  vrienden: '<circle cx="9" cy="8" r="3"/><circle cx="16" cy="9" r="2.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M14.5 14.2c2.5.3 4.5 2.4 4.5 5.1"/>',
  groep: '<circle cx="8" cy="9" r="3"/><circle cx="16" cy="9" r="3"/><path d="M2 20c0-3.3 2.7-6 6-6s6 2.7 6 6M10 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/>',
  challenge: '<path d="M8 3h8v4a4 4 0 0 1-8 0z"/><path d="M12 11v4M9 20h6M4 5H2v2a4 4 0 0 0 4 4M20 5h2v2a4 4 0 0 1-4 4"/>',
  team: '<circle cx="8" cy="9" r="3"/><circle cx="16" cy="9" r="3"/><path d="M2 20c0-3.3 2.7-6 6-6s6 2.7 6 6M10 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/>',
  gymclub: '<path d="M4 21V10l8-6 8 6v11"/><path d="M9 21v-6h6v6"/>',
  device: '<rect x="4" y="8" width="6" height="10" rx="1"/><rect x="14" y="5" width="6" height="13" rx="1"/><path d="M7 18v2M17 18v2"/>',

  // Interactie / systeem
  bewerken: '<path d="M4 20h4l11-11-4-4L4 16z"/>',
  toevoegen: '<path d="M12 5v14M5 12h14"/>',
  verwijderen: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  terug: '<path d="M15 5l-7 7 7 7"/>',
  vooruit: '<path d="M9 5l7 7-7 7"/>',
  sluiten: '<path d="M6 6l12 12M18 6L6 18"/>',
  zoeken: '<circle cx="10" cy="10" r="6"/><path d="M20 20l-5.5-5.5"/>',
  filter: '<path d="M4 5h16M7 12h10M10 19h4"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/>',
  waarschuwing: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17h.01"/>',
  fout: '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>',
  succes: '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
  sync: '<path d="M4 12a8 8 0 0 1 14-5.3L20 5M20 12a8 8 0 0 1-14 5.3L4 19"/><path d="M17 3v4h-4M7 21v-4h4"/>',
  offline: '<path d="M3 3l18 18"/><path d="M8.5 8.5A6 6 0 0 0 5 14M12.5 5.1A8 8 0 0 1 20 12M16 16.5A4 4 0 0 0 13 12"/>'
};

var ICON_SIZE = { inline: 16, standard: 20, feature: 28, navigation: 22 };

/**
 * Rendert een canonical icoon als inline SVG-string.
 * @param {string} name - naam uit ICON_PATHS
 * @param {object} [opts]
 * @param {'inline'|'standard'|'feature'|'navigation'} [opts.size='standard']
 * @param {string} [opts.label] - accessible name; wanneer aanwezig wordt het
 *   icoon NIET aria-hidden gemaakt en krijgt het role="img" + aria-label.
 *   Zonder label wordt het icoon aria-hidden="true" (decoratief, conform
 *   Fase 3B/Fase 10 -- icon-only controls MOETEN een label meegeven).
 */
function tkIcon(name, opts) {
  opts = opts || {};
  var path = ICON_PATHS[name];
  if (!path) {
    // Onbekend icoon: nooit stilzwijgend een verzonnen vorm tonen -- een lege,
    // maar geldige, decoratieve placeholder met dezelfde afmetingen.
    path = '';
  }
  var px = ICON_SIZE[opts.size] || ICON_SIZE.standard;
  var a11y = opts.label
    ? 'role="img" aria-label="' + String(opts.label).replace(/"/g, '&quot;') + '"'
    : 'aria-hidden="true"';
  return '<svg class="tk-icon" data-icon="' + name + '" width="' + px + '" height="' + px +
    '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" ' + a11y + '>' + path + '</svg>';
}

/** Geeft alle geregistreerde icoonnamen terug (voor tests/showcase). */
function tkIconNames() { return Object.keys(ICON_PATHS); }

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { tkIcon: tkIcon, tkIconNames: tkIconNames, ICON_SIZE: ICON_SIZE, ICON_PATHS: ICON_PATHS };
}
