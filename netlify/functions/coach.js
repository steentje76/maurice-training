const { withCors } = require('./_cors.js');   // v4.49.0 — CORS voor de Capacitor-app (https://localhost)
// Server-side AI-proxy — sleutel staat hier als environment variable,
// nooit in de browser. Vervangt de rechtstreekse client-call naar
// api.anthropic.com die de sleutel in localStorage nodig had.
//
// v3.3.10-fix: JWT-verificatie toegevoegd — als ENIGE Netlify Function in dit project
// miste deze functie de auth-check die alle andere functies (delete-account.js,
// gym-team.js, wearable-*.js) al hadden. Zonder die check kon letterlijk iedereen met
// de URL, zonder in te loggen, deze proxy gebruiken als gratis/onbeperkte Claude-API op
// kosten van de ANTHROPIC_API_KEY hierboven — geen rate limiting, geen kostenplafond.
// Zelfde verificatiepatroon als de rest van het project.
const _handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: { message: 'Method not allowed' } }) };
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: { message: 'ANTHROPIC_API_KEY niet ingesteld op Netlify' } }) };
  }

  const supabaseUrl = process.env.SUPABASE_URL || 'https://mhfxhzkdmgkaplicdszg.supabase.co';
  const anonKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_iialkxwRf3vu7gsZKaSzGw_YijcP3mY';
  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader) return { statusCode: 401, body: JSON.stringify({ error: { message: 'Geen sessie meegegeven' } }) };
  let userId = null;
  try {
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: authHeader } });
    if (!userRes.ok) return { statusCode: 401, body: JSON.stringify({ error: { message: 'Ongeldige of verlopen sessie' } }) };
    const user = await userRes.json();
    if (!user.id) return { statusCode: 401, body: JSON.stringify({ error: { message: 'Kon gebruiker niet vaststellen' } }) };
    userId = user.id;
  } catch (e) {
    return { statusCode: 401, body: JSON.stringify({ error: { message: 'Sessie kon niet geverifieerd worden' } }) };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // v4.50.0 — QUOTUM PER GEBRUIKER.
  //
  // De JWT-check hierboven sluit buitenstaanders buiten en v4.49.0 begrensde het model,
  // het tokenplafond en de omvang van het verzoek. Wat ontbrak was een grens op het
  // AANTAL aanroepen. Registratie staat open, dus elk zelfgemaakt account kon onbeperkt
  // verzoeken door de ANTHROPIC_API_KEY van de eigenaar duwen.
  //
  // De teller staat in de database (migratie_v450.sql) en niet hier, om twee redenen:
  // Netlify Functions zijn stateloos, dus een teller in het geheugen telt niets; en een
  // teller in de client staat in de browser van degene die hem zou moeten respecteren.
  // ai_usage_registreer() verhoogt en toetst in één statement, zodat twee gelijktijdige
  // verzoeken niet allebei dezelfde stand lezen.
  //
  // De limieten zijn CONFIGUREERBAAR via omgevingsvariabelen. De defaults hieronder zijn
  // een expliciet productbesluit: 60 aanroepen per dag en 900 per maand. Onderbouwing —
  // een zware trainingsdag gebruikt er in de praktijk ongeveer tien (terugblik,
  // programma-advies, een handvol chatvragen), dus 60 laat ruim zes keer het normale
  // gebruik toe zonder dat een geautomatiseerde misbruikpoging loont. Wil de eigenaar het
  // anders, dan is dat één omgevingsvariabele en geen codewijziging.
  //
  // FAIL-OPEN BIJ EEN INFRASTRUCTUURFOUT, met opzet. Is de tabel er nog niet (migratie
  // niet gedraaid) of is de database onbereikbaar, dan gaat het verzoek door en wordt dat
  // gelogd. Fail-closed zou betekenen dat één databasehapering de coach voor iedereen
  // uitschakelt, en de storing zelf is niet iets wat een aanvaller kan veroorzaken.
  // ═══════════════════════════════════════════════════════════════════════════
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  /* v4.50.0 — een grens uit een omgevingsvariabele. `parseInt(x,10) || standaard` was fout:
     daarmee wordt "0" (bewust alles blokkeren) stilzwijgend 60, en een typefout net zo goed —
     de eigenaar denkt dan dat hij een limiet heeft gezet die er niet is. Nul is een geldige
     keuze; alleen een onleesbare waarde valt terug, mét een waarschuwing. */
  const grens = function (naam, standaard) {
    const ruw = process.env[naam];
    if (ruw == null || ruw === '') return standaard;
    const n = Number(ruw);
    if (!Number.isInteger(n) || n < 0) {
      console.warn('coach: ' + naam + ' is geen geheel getal >= 0 ("' + ruw + '") — standaard ' + standaard + ' gebruikt');
      return standaard;
    }
    return n;
  };
  const LIMIET_DAG = grens('AI_QUOTA_PER_DAG', 60);
  const LIMIET_MAAND = grens('AI_QUOTA_PER_MAAND', 900);
  let quotumGeteld = false;

  try {
    const payload = JSON.parse(event.body || '{}');

    // v4.49.0 — SERVER-SIDE GRENZEN OP HET VERZOEK.
    //
    // De JWT-check hierboven sluit buitenstaanders buiten, maar daarna werd alles wat de
    // client stuurde ongewijzigd doorgezet: `model`, `max_tokens`, `system` en `messages`.
    // Elke ingelogde gebruiker (inclusief een zelf aangemaakt account) kon daarmee een
    // willekeurig, duurder model kiezen en een willekeurig token-plafond opgeven — op
    // kosten van de ANTHROPIC_API_KEY van de eigenaar. Dat is geen theoretisch risico:
    // het is één regel in de console.
    //
    // De grenzen hieronder zijn ruim boven wat de app zelf gebruikt (hoogste max_tokens in
    // index.html is 1500) en veranderen dus niets aan het bestaande gedrag. Ze weigeren
    // niet, ze begrenzen — een geweigerd verzoek zou een werkende coach kunnen breken bij
    // een toekomstige, legitieme wijziging in de client.
    const TOEGESTANE_MODELLEN = ['claude-sonnet-4-5'];
    const MAX_TOKENS_PLAFOND = 2000;
    const MAX_SYSTEM_TEKENS = 60000;
    const MAX_BERICHTEN = 30;
    const MAX_BERICHT_TEKENS = 20000;

    const model = TOEGESTANE_MODELLEN.indexOf(payload.model) >= 0 ? payload.model : TOEGESTANE_MODELLEN[0];
    let maxTokens = parseInt(payload.max_tokens, 10);
    if (!Number.isFinite(maxTokens) || maxTokens < 1) maxTokens = 1000;
    if (maxTokens > MAX_TOKENS_PLAFOND) maxTokens = MAX_TOKENS_PLAFOND;

    const system = typeof payload.system === 'string' ? payload.system.slice(0, MAX_SYSTEM_TEKENS) : undefined;

    if (!Array.isArray(payload.messages) || !payload.messages.length) {
      return { statusCode: 400, body: JSON.stringify({ error: { message: 'Geen berichten meegegeven' } }) };
    }
    const messages = payload.messages.slice(-MAX_BERICHTEN).map(function (m) {
      return {
        role: (m && m.role === 'assistant') ? 'assistant' : 'user',
        content: typeof (m && m.content) === 'string' ? m.content.slice(0, MAX_BERICHT_TEKENS) : ''
      };
    });

    /* v4.50.0 — DE TELLING STAAT HIER, NA DE VALIDATIE EN VLAK VOOR DE ENIGE BETAALDE
       AANROEP. Stond hij bovenaan de handler, dan kostte een client-bug met een kapotte body
       de sporter net zo goed zijn dagquotum, terwijl er nooit een token is verbruikt. Alles
       wat hierboven faalt is gratis; vanaf hier niet meer.

       Wat WEL blijft meetellen: een aanroep die Anthropic zelf met een fout beantwoordt. Dat
       is bewust — anders is een quotum te omzeilen door verzoeken te sturen die daar stuklopen.
       De teller telt pogingen, niet successen. */
    if (serviceKey) {
      try {
        const q = await fetch(`${supabaseUrl}/rest/v1/rpc/ai_usage_registreer`, {
          method: 'POST',
          headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ p_user: userId, p_limiet_dag: LIMIET_DAG, p_limiet_maand: LIMIET_MAAND })
        });
        if (q.ok) {
          const rows = await q.json();
          const r = Array.isArray(rows) ? rows[0] : rows;
          quotumGeteld = true;
          if (r && r.toegestaan === false) {
            const perDag = r.reden === 'daglimiet';
            return {
              statusCode: 429,
              headers: { 'Content-Type': 'application/json', 'Retry-After': perDag ? '3600' : '86400' },
              body: JSON.stringify({ error: { message: perDag
                ? `Je hebt vandaag het maximum van ${LIMIET_DAG} coachvragen bereikt. Morgen kun je weer verder — de rest van de app werkt gewoon door.`
                : `Je hebt deze maand het maximum van ${LIMIET_MAAND} coachvragen bereikt. De rest van de app werkt gewoon door.` } })
            };
          }
        } else {
          console.warn('coach: quotumcontrole niet uitgevoerd (rpc niet beschikbaar)', q.status);
        }
      } catch (e) {
        console.warn('coach: quotumcontrole overgeslagen', e && e.message);
      }
    } else {
      console.warn('coach: SUPABASE_SERVICE_ROLE_KEY ontbreekt — geen quotumcontrole mogelijk');
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model,
        max_tokens: maxTokens,
        system: system,
        messages: messages
      })
    });
    const data = await res.json();

    // v4.50.0 — tokens bijschrijven zodat de eigenaar het werkelijke verbruik ziet en niet
    // alleen het aantal aanroepen. Best effort: mislukt dit, dan is alleen het overzicht
    // onvolledig — nooit de toets zelf, die is hierboven al gedaan.
    if (quotumGeteld && data && data.usage) {
      try {
        await fetch(`${supabaseUrl}/rest/v1/rpc/ai_usage_tokens`, {
          method: 'POST',
          headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ p_user: userId,
                                 p_in: parseInt(data.usage.input_tokens, 10) || 0,
                                 p_uit: parseInt(data.usage.output_tokens, 10) || 0 })
        });
      } catch (e) { console.warn('coach: tokens niet bijgeschreven', e && e.message); }
    }

    return { statusCode: res.status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: { message: 'Proxy-fout: ' + e.message } }) };
  }
};

// v4.49.0 — de handler blijft ongewijzigd; withCors voegt alleen de CORS-headers toe en
// beantwoordt de preflight, zodat de Capacitor-app (https://localhost) deze functie kan bereiken.
exports.handler = withCors(_handler);
