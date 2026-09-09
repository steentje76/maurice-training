// netlify/functions/calendar-feed.js — SPRINT B2-A: External Calendar
// Foundation. ICS/iCalendar subscription-feed.
//
// Belangrijk onderscheid t.o.v. alle andere Netlify functions in dit
// project (sectie 30): die verwachten een normale, ingelogde Trainingskompas-
// sessie (Authorization: Bearer <JWT>). Een agenda-app (Apple/Google/
// Outlook subscription) heeft dat niet -- die doet een simpele, periodieke
// GET-request naar een URL. Authenticatie gebeurt daarom via een
// hoge-entropie, revocable TOKEN in de query-string, NOOIT via een
// voorspelbare user_id in het pad (sectie 27).
//
// Fail-closed: elke onbekende/ongeldige/gerevokeerde token -> 404 (niet
// 401/403 -- geen bevestiging dat een token ooit heeft bestaan, voorkomt
// enumereerbaarheid).
//
// GEEN Calculation Engine, GEEN Decision Engine, GEEN AI-aanroep hier --
// uitsluitend canonical program_blocks lezen en via CalendarProjectionCore
// (puur, gedeeld met de client-tests) naar ICS omzetten.
const crypto = require('crypto');
const CalendarProjectionCore = require('../../core/calendarProjection.js');

exports.handler = async function (event) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method not allowed' };
  }
  const supabaseUrl = process.env.SUPABASE_URL || 'https://mhfxhzkdmgkaplicdszg.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return { statusCode: 500, body: 'Server misconfiguration' };

  const token = event.queryStringParameters && event.queryStringParameters.token;
  if (!token || typeof token !== 'string' || token.length < 20) {
    // Fail-closed: te kort/ontbrekend token wordt nooit als geldig behandeld.
    return { statusCode: 404, body: 'Not found' };
  }
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  try {
    const headers = { apikey: serviceKey, Authorization: 'Bearer ' + serviceKey };
    // Server-side (service-role) resolutie -- de client kan deze tabel
    // nooit direct queryen op token_hash (RLS staat alleen eigen user_id
    // toe, en token_hash is sowieso geen bruikbare client-zoekingang).
    const tokRes = await fetch(
      supabaseUrl + '/rest/v1/calendar_feed_tokens?select=user_id&token_hash=eq.' + tokenHash + '&active=eq.true&limit=1',
      { headers }
    );
    if (!tokRes.ok) return { statusCode: 404, body: 'Not found' };
    const tokRows = await tokRes.json();
    const userId = tokRows && tokRows[0] && tokRows[0].user_id;
    if (!userId) return { statusCode: 404, body: 'Not found' };

    // Canonical bron (B0-bewezen): program_blocks.planned_date, uitsluitend
    // van ACTIEVE programma's van deze ene, server-side-geresolveerde gebruiker.
    // NOOIT training_instances of sessions. Geen filter op completed_at --
    // voltooide trainingen blijven zichtbaar (sectie 21, V1-beleid).
    const progRes = await fetch(
      supabaseUrl + '/rest/v1/programs?select=id&user_id=eq.' + userId + '&status=eq.actief',
      { headers }
    );
    const progs = progRes.ok ? await progRes.json() : [];
    let blocks = [];
    if (progs.length) {
      const progIds = progs.map(function (p) { return p.id; }).join(',');
      const blockRes = await fetch(
        supabaseUrl + '/rest/v1/program_blocks?select=id,planned_date,fase_naam,completed_at,schedule_status&program_id=in.(' + progIds + ')&planned_date=not.is.null',
        { headers }
      );
      blocks = blockRes.ok ? await blockRes.json() : [];
    }

    // SPRINT C2-C — Mijn Trainingen occurrences toevoegen aan dezelfde,
    // bestaande feed (geen tweede ICS-generator, geen tweede feed-endpoint --
    // exact zoals vereist). Uitsluitend velden die de projectie nodig heeft
    // (data-minimalisatie, sectie 15): geen coach-metadata, geen availability-
    // reden, geen health/recovery/RPE/nutrition/roster-data.
    const occRes = await fetch(
      supabaseUrl + '/rest/v1/planned_training_occurrences?select=id,planned_date,definition_snapshot,status&creator_user_id=eq.' + userId + '&status=eq.scheduled',
      { headers }
    );
    const occurrences = occRes.ok ? await occRes.json() : [];
    let assignmentsByOccurrenceId = {};
    if (occurrences.length) {
      const occIds = occurrences.map(function (o) { return o.id; }).join(',');
      const assRes = await fetch(
        supabaseUrl + '/rest/v1/planned_training_assignments?select=id,occurrence_id,athlete_user_id,personal_date_override,status&occurrence_id=in.(' + occIds + ')&athlete_user_id=eq.' + userId,
        { headers }
      );
      const assignments = assRes.ok ? await assRes.json() : [];
      assignments.forEach(function (a) { (assignmentsByOccurrenceId[a.occurrence_id] = assignmentsByOccurrenceId[a.occurrence_id] || []).push(a); });
    }

    const events = CalendarProjectionCore.getExternalCalendarEvents(blocks)
      .concat(CalendarProjectionCore.getMyTrainingCalendarEvents(occurrences, assignmentsByOccurrenceId));
    const ics = CalendarProjectionCore.buildIcsCalendar(events);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="trainingskompas.ics"',
        // Agenda-apps pollen periodiek; geen realtime-belofte (sectie 33).
        // Korte cache voorkomt overmatige herberekening zonder de feed
        // urenlang stale te laten.
        'Cache-Control': 'private, max-age=900'
      },
      body: ics
    };
  } catch (e) {
    return { statusCode: 404, body: 'Not found' };
  }
};
