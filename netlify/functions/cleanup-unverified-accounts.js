// Geplande achtergrondtaak (zie netlify.toml — draait @daily) die accounts verwijdert
// die na 30 dagen hun e-mailadres nog steeds niet bevestigd hebben. Draait als
// service_role, zonder JWT (geen ingelogde gebruiker die dit aanvraagt — dit is een
// achtergrondtaak, geen user-actie), dus GEEN JWT-verificatiestap zoals in
// delete-account.js. In plaats daarvan bepaalt de query zelf (email_confirmed_at IS
// NULL + ouder dan 30 dagen) wie in aanmerking komt — nooit input van buitenaf.
//
// Zelfde opruim-volgorde/tabellenlijst als delete-account.js (bewust gedupliceerd,
// niet gedeeld via een module — dit project heeft geen build-stap voor Netlify
// Functions, dus geen gedeelde imports tussen functiebestanden). Bij wijzigingen aan
// de een, ook de ander nalopen.
const { verwijderGebruikersdata } = require('./_userData.js');

exports.handler = async function (event) {
  /* ═══════════════════════════════════════════════════════════════════════════
   * v4.50.0 — WIE MAG DEZE OPRUIMING STARTEN?
   *
   * Dit is een achtergrondtaak zonder ingelogde gebruiker, dus een JWT-check zoals in
   * delete-account.js past hier niet. De functie stond volledig open: elke POST startte een
   * verwijderronde. De query bepaalt weliswaar zelf wie in aanmerking komt (nooit invoer van
   * buitenaf), dus er valt niets ánders te verwijderen dan wat de dagelijkse taak toch al zou
   * doen — maar het versnelt wel een onomkeerbare actie en kost de eigenaar resources.
   *
   * TWEE TOEGESTANE BRONNEN:
   *   1. de geplande aanroep van Netlify zelf. Die is te herkennen aan de payload die het
   *      platform meestuurt: {"next_run":"<ISO-8601>"}. Netlify laat een functie mét een
   *      schedule in netlify.toml NIET rechtstreeks via zijn URL aanroepen ("You can't invoke
   *      scheduled functions directly with a URL", docs.netlify.com/build/functions/
   *      scheduled-functions), dus in de praktijk kan alleen het platform dit pad bereiken.
   *      Deze controle is daarmee vooral een tweede slot: verdwijnt de schedule ooit uit
   *      netlify.toml, dan gaat de deur niet vanzelf open.
   *   2. een handmatige aanroep mét de gedeelde sleutel uit CLEANUP_SECRET.
   *
   * WAT HIER BEWUST NIET STAAT: een x-nf-event-header als toegangsbewijs. Die is door een
   * client zelf mee te sturen en staat niet in de documentatie van scheduled functions — als
   * toegangscontrole is dat geen slot maar een sticker. En de payload wordt echt geparseerd:
   * "bevat ergens de tekst next_run" zou betekenen dat elke body met dat woord erin volstaat.
   *
   * Is CLEANUP_SECRET NIET ingesteld, dan blijft het gedrag zoals het was en wordt er
   * gewaarschuwd in de log. Anders zou het zetten van deze code de dagelijkse opruiming
   * stilzwijgend uitschakelen — een beveiliging die een werkende taak breekt is geen
   * verbetering. Zodra de eigenaar de variabele zet, is de handmatige weg dicht.
   * ═══════════════════════════════════════════════════════════════════════════ */
  const h = (event && event.headers) || {};
  let gepland = false;
  try {
    const body = (event && typeof event.body === 'string' && event.body) ? JSON.parse(event.body) : null;
    const nr = body && body.next_run;
    gepland = typeof nr === 'string' && !isNaN(Date.parse(nr));
  } catch (_) { gepland = false; }
  const geheim = process.env.CLEANUP_SECRET;
  const meegegeven = h['x-cleanup-secret'] || h['X-Cleanup-Secret'] || null;
  if (!gepland) {
    if (!geheim) {
      console.warn('cleanup-unverified-accounts: CLEANUP_SECRET niet ingesteld — de functie staat open voor handmatige aanroepen');
    } else if (meegegeven !== geheim) {
      return { statusCode: 401, body: JSON.stringify({ error: { message: 'Niet toegestaan' } }) };
    }
  }

  const supabaseUrl = process.env.SUPABASE_URL || 'https://mhfxhzkdmgkaplicdszg.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.error('cleanup-unverified-accounts: SUPABASE_SERVICE_ROLE_KEY niet ingesteld');
    return { statusCode: 500, body: JSON.stringify({ error: 'SUPABASE_SERVICE_ROLE_KEY niet ingesteld' }) };
  }
  const sbHeaders = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' };

  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  try {
    // public.users heeft sinds migratie v334 een email_confirmed_at-spiegelkolom —
    // NULL betekent nooit bevestigd. created_at is het registratiemoment.
    const staleRes = await fetch(
      `${supabaseUrl}/rest/v1/users?email_confirmed_at=is.null&created_at=lt.${cutoff}&select=id,email`,
      { headers: sbHeaders }
    );
    if (!staleRes.ok) {
      const err = await staleRes.text();
      console.error('cleanup-unverified-accounts: kon stale users niet ophalen', err);
      return { statusCode: 500, body: JSON.stringify({ error: 'Kon accounts niet ophalen: ' + err }) };
    }
    const stale = await staleRes.json();

    const results = [];
    for (const u of stale) {
      // v4.50.0 — ÉÉN gedeelde opruimroutine met delete-account.js. Deze functie had zijn
      // eigen kopie van de tabellenlijst en was achtergebleven op 16 van de 30 tabellen;
      // onder de veertien die ontbraken zat wearable_connections, met het OAuth access- én
      // refresh-token erin. Een niet-bevestigd account werd dus opgeruimd mét zijn tokens.
      const failedTables = await verwijderGebruikersdata(supabaseUrl, serviceKey, u.id);

      const delRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${u.id}`, {
        method: 'DELETE',
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
      });

      results.push({ id: u.id, email: u.email, deleted: delRes.ok, failedTables: failedTables.length ? failedTables : undefined });
    }

    console.log(`cleanup-unverified-accounts: ${results.length} account(s) verwerkt`, results);
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ processed: results.length, results }) };
  } catch (e) {
    console.error('cleanup-unverified-accounts exception', e);
    return { statusCode: 500, body: JSON.stringify({ error: { message: 'Serverfout: ' + e.message } }) };
  }
};
