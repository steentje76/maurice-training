/* core/calendarProjection.js — SPRINT B2-A: Canonical External Calendar
 * Foundation.
 *
 * PUUR · DETERMINISTISCH · OFFLINE-CAPABLE. Geen DOM, geen Supabase/fetch,
 * geen AI, geen globale mutable state. INPUT -> OUTPUT.
 *
 * Canonical bron (B0-bewezen): program_blocks.planned_date. NOOIT
 * training_instances of sessions (die zijn uitsluitend execution/history,
 * geen toekomstige planning). Mijn Trainingen wordt bewust NIET
 * opgenomen -- heeft geen canonical geplande datum (B0/Sprint B-bevinding).
 *
 * Deze module rekent GEEN trainingslogica opnieuw uit, muteert niets, en
 * bevat geen Google/Microsoft-specifieke velden -- provider-neutrale
 * projectie. AI is nergens bij betrokken (sectie 43): titel/datum/status
 * komen 1-op-1 uit canonical data.
 */
(function (global) {
  'use strict';

  var VERSIONS = { projection: 'calendar_projection.v1', ics: 'ics_export.v1' };

  /* ── getExternalCalendarEvents(blocks) ──────────────────────────────────
   * Zet een lijst canonical program_blocks-rijen om in een provider-
   * neutraal event-model. Alleen blocks met een planned_date worden
   * opgenomen (B0: dat is de canonical geplande-training-representatie).
   *
   * SKIPPED SEMANTIEK (sectie 20, V1-keuze, onderbouwd — herbevestigd na
   * adversariële hercertificering PR #279, DELETION-CLASSIFICATIE: A —
   * PROVEN SAFE voor het ondersteunde subscription-model): een geskipte
   * block wordt NIET meegenomen in de feed (optie A). Onderbouwing:
   * skip betekent "deze training vindt niet plaats op deze datum" --
   * een agenda-item laten staan voor iets dat bewust niet doorgaat zou
   * een zombie-event zijn dat de gebruiker in zijn externe agenda moet
   * blijven negeren. Bij een volgende feed-refresh verdwijnt het item
   * simpelweg (net als bij verwijdering, sectie 39) -- geen aparte
   * "CANCELLED"-status nodig, geen risico op UID-hergebruik-verwarring
   * omdat de UID stabiel aan het block-ID blijft gekoppeld en het block
   * zelf nooit wordt verwijderd (alleen uit de actieve feed-selectie valt).
   *
   * Voor een PULL-based, read-only subscription-feed (dit model, GEEN
   * iTIP-invitation-workflow met REQUEST/CANCEL) is omissie-bij-refresh
   * het gangbare, gedocumenteerde patroon dat abonnerende clients
   * verwerken door bij elke fetch hun lokale kopie te vervangen door de
   * dan-actuele feed-inhoud (vergelijkbaar met hoe publieke ICS-feeds
   * voor bijvoorbeeld sportwedstrijdschema's een afgelast evenement
   * simpelweg weglaten, zonder CANCELLED-status). GEEN empirische test
   * tegen een echte Apple/Google/Outlook-client is in deze omgeving
   * uitgevoerd (niet beschikbaar) — dit is een eerlijk gerapporteerde
   * grens van wat hier fysiek geverifieerd kon worden, geen universele
   * garantie voor elke denkbare kalender-implementatie.
   *
   * COMPLETED SEMANTIEK (sectie 21): een voltooide training blijft
   * zichtbaar op zijn oorspronkelijke geplande datum, title/status geeft
   * de voltooiing weer. Sluit aan bij bestaand productgedrag
   * (completed_at wijzigt nooit planned_date, B0-bevinding) -- het event
   * "was" op die datum gepland en is dat ook gebleven.
   *
   * MULTIPLE BLOCKS SAME DAY (bewezen ALLOWED, Sprint B sectie 4): elk
   * block genereert een eigen, onafhankelijk event met een eigen UID --
   * geen samenvoeging, geen aanname van 1 training per dag.
   */
  function getExternalCalendarEvents(blocks) {
    if (!Array.isArray(blocks)) return [];
    return blocks
      .filter(function (b) { return b && b.id != null && b.planned_date; })
      .filter(function (b) { return b.schedule_status !== 'skipped'; }) // skipped -> niet publiceren (optie A)
      .map(function (b) {
        var isCompleted = !!b.completed_at;
        return {
          uid: stableUid(b.id),
          sourceType: 'program_block',
          sourceId: String(b.id),
          title: eventTitle(b),
          date: b.planned_date, // date-only (YYYY-MM-DD) -- geen tijd verzonnen (sectie 14)
          allDay: true,
          status: isCompleted ? 'completed' : 'planned',
          description: null, // V1 privacy-default: geen inhoud, zie privacyLevelDescription()
          deepLink: null // geen bestaande, veilige deep-link-architectuur gevonden -- niet verzonnen (sectie 38)
        };
      });
  }

  /* ── stableUid(blockId) ──────────────────────────────────────────────
   * Stabiel, opaque, geen PII. Blijft ONGEWIJZIGD bij reschedule (UPDATE
   * op dezelfde program_blocks-rij, B0-bewezen) -- uitsluitend de datum
   * in het geprojecteerde event verandert. Geen naam/notitie/gezondheids-
   * informatie in de UID (sectie 13).
   */
  function stableUid(blockId) {
    return 'program-block-' + blockId + '@trainingskompas.app';
  }

  /* ── getMyTrainingCalendarEvents(occurrences, assignmentsByOccurrenceId) ──
   * SPRINT C2-C: analoog aan getExternalCalendarEvents() maar voor Mijn
   * Trainingen canonical occurrences (Sprint C2-B). Zelfde regels: skipped/
   * cancelled niet gepubliceerd, completed blijft zichtbaar, geen tijdstip
   * verzonnen. Effective date = personal_date_override ?? occurrence.
   * planned_date (zelfde regel als Internal Calendar, hier bewust dezelfde
   * inline logica i.p.v. een afhankelijkheid op myTrainingScheduling.js,
   * om deze bestaande, al geteste module niet aan een nieuwe module-
   * afhankelijkheid te binden; de regel zelf is letterlijk identiek).
   *
   * UID gebruikt occurrence-identity (NIET workout_definition_id, want
   * dezelfde definition kan meerdere occurrences hebben).
   */
  function getMyTrainingCalendarEvents(occurrences, assignmentsByOccurrenceId) {
    if (!Array.isArray(occurrences)) return [];
    var out = [];
    occurrences.forEach(function (occ) {
      if (!occ || !occ.id || occ.status === 'cancelled') return;
      var assignments = (assignmentsByOccurrenceId && assignmentsByOccurrenceId[occ.id]) || [];
      assignments.forEach(function (a) {
        if (!a || a.status === 'skipped') return; // skipped: zelfde omissie-regel als Program-blocks
        var effDate = (a.personal_date_override) ? a.personal_date_override : occ.planned_date;
        if (!effDate) return;
        out.push({
          uid: myTrainingStableUid(occ.id),
          sourceType: 'my_training_occurrence',
          sourceId: String(occ.id),
          title: (occ.definition_snapshot && occ.definition_snapshot.naam) || 'Mijn Training',
          date: effDate,
          allDay: true,
          status: a.status === 'completed' ? 'completed' : 'planned',
          description: null // zelfde V1-privacydefault: nooit workoutdetails/coach/availability/health-data (sectie 15)
        });
      });
    });
    return out;
  }

  function myTrainingStableUid(occurrenceId) {
    return 'planned-training-' + occurrenceId + '@trainingskompas.app';
  }

  /* ── eventTitle(block) ──────────────────────────────────────────────
   * Uitsluitend canonical, reeds bestaande velden. Geen AI-generatie
   * (sectie 42/43). Fallback alleen bij ontbrekende brondata.
   */
  function eventTitle(block) {
    var fase = block && block.fase_naam ? String(block.fase_naam) : null;
    return fase || 'Training';
  }

  /* ── icsEscape(text) ──────────────────────────────────────────────────
   * RFC 5545 §3.3.11 tekst-escaping: backslash, komma, puntkomma en
   * newline moeten ge-escaped worden vóórdat ze in een ICS-veld komen.
   */
  function icsEscape(text) {
    return String(text == null ? '' : text)
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\r\n|\n|\r/g, '\\n');
  }

  /* ── icsDateOnly(dateStr) ──────────────────────────────────────────────
   * Zet 'YYYY-MM-DD' om naar RFC 5545 DATE-vorm 'YYYYMMDD' -- puur
   * stringmanipulatie, GEEN Date-object/UTC-conversie, dus geen enkel
   * risico op een off-by-one-dagverschuiving door tijdzone (sectie 16/18).
   */
  function icsDateOnly(dateStr) {
    return String(dateStr).replace(/-/g, '');
  }

  /* ── icsTimestamp(isoOrDate) ─────────────────────────────────────────
   * DTSTAMP vereist een UTC-timestamp (wanneer het ICS-document is
   * gegenereerd) -- dit is metadata over de GENERATIE, niet over de
   * trainingsdatum zelf, dus UTC-conversie hier is correct en veroorzaakt
   * geen dagverschuiving van de training.
   */
  function icsTimestamp(date) {
    var d = date instanceof Date ? date : new Date();
    return d.getUTCFullYear() +
      pad2(d.getUTCMonth() + 1) + pad2(d.getUTCDate()) + 'T' +
      pad2(d.getUTCHours()) + pad2(d.getUTCMinutes()) + pad2(d.getUTCSeconds()) + 'Z';
  }
  function pad2(n) { return n < 10 ? '0' + n : String(n); }

  /* ── buildIcsCalendar(events, now) ────────────────────────────────────
   * Genereert een standards-conform iCalendar-document (RFC 5545).
   * now is optioneel injecteerbaar voor deterministische tests (anders
   * new Date()) -- alleen DTSTAMP is tijdsafhankelijk, event-identiteit/
   * -inhoud niet (sectie 41, determinisme).
   *
   * GEEN SEQUENCE-PROPERTY (bewuste keuze, adversariële hercertificering
   * PR #279 sectie 8): program_blocks heeft geen updated_at/version-kolom
   * die een betrouwbare, deterministische revisie-teller zou opleveren.
   * Een SEQUENCE die willekeurig per fetch omhoog zou tellen zou de
   * determinisme-eis schenden ("zelfde canonical state moet zelfde
   * revision betekenen") en calendar-clients ten onrechte laten denken
   * dat een ongewijzigd event toch is bijgewerkt. RFC 5545 staat een
   * ontbrekende SEQUENCE toe (impliciet 0). Voor een PULL-based
   * subscription-feed (in tegenstelling tot iTIP-invitation-workflows
   * met REQUEST/CANCEL-methods) vergelijken abonnerende clients bij
   * elke refresh de volledige, actuele property-waarden van elke UID uit
   * de opgehaalde feed -- een gewijzigde DTSTART bij een reschedule wordt
   * zo hoe dan ook zichtbaar, zonder afhankelijk te zijn van een
   * SEQUENCE-increment. Dit is het gangbare, gedocumenteerde patroon
   * voor publieke ICS-abonnementen (vergelijkbaar met bijvoorbeeld
   * sportwedstrijdschema's of feestdagenkalenders) -- GEEN empirische
   * Apple/Google/Outlook-clienttest is in deze omgeving uitgevoerd
   * (geen zulke clients beschikbaar); dit blijft een eerlijk
   * gerapporteerde V1-beperking van wat hier fysiek te verifiëren is,
   * niet een claim van universeel bewezen clientgedrag.
   */
  function buildIcsCalendar(events, now) {
    var dtstamp = icsTimestamp(now);
    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Trainingskompas//External Calendar Foundation v1//NL', 'CALSCALE:GREGORIAN'];
    (events || []).forEach(function (ev) {
      lines.push('BEGIN:VEVENT');
      lines.push('UID:' + icsEscape(ev.uid));
      lines.push('DTSTAMP:' + dtstamp);
      // All-day event: DATE-vorm (geen tijd), VALUE=DATE expliciet vermeld.
      lines.push('DTSTART;VALUE=DATE:' + icsDateOnly(ev.date));
      var titel = ev.title;
      if (ev.status === 'completed') titel = titel + ' (voltooid)';
      lines.push('SUMMARY:' + icsEscape(titel));
      if (ev.description) lines.push('DESCRIPTION:' + icsEscape(ev.description));
      lines.push('END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    return lines.join('\r\n') + '\r\n'; // RFC 5545 vereist CRLF-regeleindes
  }

  /* ── privacyLevelDescription(event, level) ─────────────────────────────
   * V1-veilige default: 'minimal' (uitsluitend "Training", geen
   * workoutnaam) -- geen recovery/HRV/gezondheids-/notitie-data ooit
   * (sectie 24/25). 'standard' toont de workoutnaam (al niet-gevoelig,
   * want al de titel). 'detailed' bestaat bewust NOG NIET in V1 (geen
   * overengineering) -- functie retourneert voor elk ander niveau
   * dezelfde veilige 'standard'-uitkomst, nooit gevoeliger dan gevraagd.
   */
  function privacyLevelDescription(event, level) {
    if (level === 'minimal') return null;
    return null; // V1: geen enkel privacy-niveau voegt description toe -- titel is de enige data
  }

  var CalendarProjectionCore = {
    VERSIONS: VERSIONS,
    getExternalCalendarEvents: getExternalCalendarEvents,
    getMyTrainingCalendarEvents: getMyTrainingCalendarEvents,
    stableUid: stableUid,
    myTrainingStableUid: myTrainingStableUid,
    icsEscape: icsEscape,
    icsDateOnly: icsDateOnly,
    icsTimestamp: icsTimestamp,
    buildIcsCalendar: buildIcsCalendar,
    privacyLevelDescription: privacyLevelDescription
  };

  if (typeof module !== 'undefined' && module.exports) { module.exports = CalendarProjectionCore; }
  else { global.CalendarProjectionCore = CalendarProjectionCore; }
}(typeof self !== 'undefined' ? self : this));
