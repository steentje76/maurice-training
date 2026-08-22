const { withCors } = require('./_cors.js');   // v4.49.0 — CORS voor de Capacitor-app (https://localhost)
// Eén endpoint voor alle Team-acties (list/update_role/audit_log). Alle drie vereisen:
// (1) een geldige sessie, (2) een gym_role_level die hoog genoeg is voor de actie, en
// (3) de juiste coach-pincode van de eigen gym. Rolwijzigingen worden altijd gelogd in
// gym_audit_log — nooit atleet-/trainingsdata, uitsluitend lidmaatschap/rol-gebeurtenissen.
const ROLE_LEVEL = { lid: 0, coach: 1, manager: 2, owner: 3 };

const _handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: { message: 'Method not allowed' } }) };
  }
  const supabaseUrl = process.env.SUPABASE_URL || 'https://mhfxhzkdmgkaplicdszg.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY || 'sb_publishable_iialkxwRf3vu7gsZKaSzGw_YijcP3mY';
  if (!serviceKey) return { statusCode: 500, body: JSON.stringify({ error: { message: 'SUPABASE_SERVICE_ROLE_KEY niet ingesteld op Netlify' } }) };

  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader) return { statusCode: 401, body: JSON.stringify({ error: { message: 'Geen sessie meegegeven' } }) };

  const sbHeaders = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' };
  let body;
  try { body = JSON.parse(event.body || '{}'); } catch (e) { return { statusCode: 400, body: JSON.stringify({ error: { message: 'Ongeldige request body' } }) }; }
  const { action, pin, targetUserId, newRole } = body;

  try {
    // Stap 1: wie is de aanroeper, echt (nooit een user_id van de client vertrouwen).
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: authHeader } });
    if (!userRes.ok) return { statusCode: 401, body: JSON.stringify({ error: { message: 'Ongeldige of verlopen sessie' } }) };
    const { id: callerId, email: callerEmail } = await userRes.json();
    if (!callerId) return { statusCode: 401, body: JSON.stringify({ error: { message: 'Kon gebruiker niet vaststellen' } }) };

    const callerRes = await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${callerId}&select=gym_id,gym_role,gym_role_level`, { headers: sbHeaders });
    const [caller] = await callerRes.json();
    if (!caller) return { statusCode: 403, body: JSON.stringify({ error: { message: 'Geen gym-account gevonden voor deze gebruiker' } }) };

    // 'whoami' heeft geen pincode nodig — dit bepaalt alleen of de client de
    // Team-ingang aan de gebruiker toont.
    if (action === 'whoami') {
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gymId: caller.gym_id, gymRole: caller.gym_role, gymRoleLevel: caller.gym_role_level }) };
    }

    // 'lookup_teammate' heeft ook geen pincode nodig — dit is geen management-actie maar
    // een lichte opzoek-actie voor de "deel met persoon"-functie (v333-UI). Geeft alleen
    // iets terug als het e-mailadres bij iemand in DEZELFDE gym hoort — geen platformbrede
    // e-mail-enumeratie mogelijk.
    if (action === 'lookup_teammate') {
      const email = String(body.email || '').trim().toLowerCase();
      if (!email) return { statusCode: 400, body: JSON.stringify({ error: { message: 'E-mailadres verplicht' } }) };
      if (!caller.gym_id) return { statusCode: 403, body: JSON.stringify({ error: { message: 'Geen gym-koppeling' } }) };
      const lookupRes = await fetch(`${supabaseUrl}/rest/v1/users?email=eq.${encodeURIComponent(email)}&gym_id=eq.${caller.gym_id}&select=id,name,email`, { headers: sbHeaders });
      const [found] = await lookupRes.json();
      if (!found) return { statusCode: 404, body: JSON.stringify({ error: { message: 'Niemand met dit e-mailadres gevonden in jouw gym' } }) };
      if (found.id === callerId) return { statusCode: 400, body: JSON.stringify({ error: { message: 'Je kunt niet met jezelf delen' } }) };
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: found.id, name: found.name || found.email }) };
    }

    const minLevelForAction = { list: ROLE_LEVEL.coach, audit_log: ROLE_LEVEL.coach, update_role: ROLE_LEVEL.manager };
    if (!(action in minLevelForAction)) return { statusCode: 400, body: JSON.stringify({ error: { message: 'Onbekende actie' } }) };
    if ((caller.gym_role_level ?? -1) < minLevelForAction[action]) {
      return { statusCode: 403, body: JSON.stringify({ error: { message: 'Onvoldoende rechten voor deze actie' } }) };
    }

    // Coach-pincode verifiëren tegen de gym van de aanroeper.
    const gymRes = await fetch(`${supabaseUrl}/rest/v1/gyms?id=eq.${caller.gym_id}&select=coach_pin_hash`, { headers: sbHeaders });
    const [gym] = await gymRes.json();
    if (!gym?.coach_pin_hash) {
      // Kip-en-ei: er kan nog geen pincode ingevoerd worden als er nog nooit een is
      // ingesteld. De owner mag er in dat specifieke geval doorheen (alleen om zelf de
      // eerste pincode in te stellen); iedereen anders blijft geblokkeerd.
      if (caller.gym_role_level < 3) return { statusCode: 403, body: JSON.stringify({ error: { message: 'Er is nog geen coach-pincode ingesteld door de gym-owner' } }) };
    } else {
      const pinHash = await sha256Hex(String(pin || ''));
      if (pinHash !== gym.coach_pin_hash) return { statusCode: 403, body: JSON.stringify({ error: { message: 'Onjuiste pincode' } }) };
    }

    if (action === 'list') {
      const listRes = await fetch(`${supabaseUrl}/rest/v1/users?gym_id=eq.${caller.gym_id}&select=id,name,email,gym_role,gym_role_level&order=gym_role_level.desc`, { headers: sbHeaders });
      const members = await listRes.json();
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ members }) };
    }

    if (action === 'audit_log') {
      const logRes = await fetch(`${supabaseUrl}/rest/v1/gym_audit_log?gym_id=eq.${caller.gym_id}&select=action,actor_email,target_email,details,created_at&order=created_at.desc&limit=50`, { headers: sbHeaders });
      const entries = await logRes.json();
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entries }) };
    }

    if (action === 'update_role') {
      if (!targetUserId || !(newRole in ROLE_LEVEL)) return { statusCode: 400, body: JSON.stringify({ error: { message: 'Ongeldig verzoek: targetUserId en newRole verplicht' } }) };
      if (targetUserId === callerId) return { statusCode: 400, body: JSON.stringify({ error: { message: 'Je kunt je eigen rol niet wijzigen' } }) };

      const targetRes = await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${targetUserId}&select=id,email,gym_id,gym_role,gym_role_level`, { headers: sbHeaders });
      const [target] = await targetRes.json();
      if (!target || target.gym_id !== caller.gym_id) return { statusCode: 404, body: JSON.stringify({ error: { message: 'Gebruiker niet gevonden in jouw gym' } }) };

      // Niemand kan een rol toekennen die hoger is dan zijn eigen rol (voorkomt dat een
      // manager per ongeluk of moedwillig iemand tot owner promoveert).
      if (ROLE_LEVEL[newRole] > caller.gym_role_level) {
        return { statusCode: 403, body: JSON.stringify({ error: { message: 'Je kunt geen rol toekennen die hoger is dan je eigen rol' } }) };
      }

      const oldRole = target.gym_role;
      const updRes = await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${targetUserId}`, {
        method: 'PATCH', headers: { ...sbHeaders, Prefer: 'return=minimal' },
        body: JSON.stringify({ gym_role: newRole })
      });
      if (!updRes.ok) return { statusCode: 500, body: JSON.stringify({ error: { message: 'Bijwerken mislukt: ' + await updRes.text() } }) };

      await fetch(`${supabaseUrl}/rest/v1/gym_audit_log`, {
        method: 'POST', headers: { ...sbHeaders, Prefer: 'return=minimal' },
        body: JSON.stringify({
          gym_id: caller.gym_id, actor_user_id: callerId, actor_email: callerEmail,
          action: 'role_changed', target_user_id: targetUserId, target_email: target.email,
          details: { from: oldRole, to: newRole }
        })
      });
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: true }) };
    }
  } catch (e) {
    console.error('gym-team exception', e);
    return { statusCode: 500, body: JSON.stringify({ error: { message: 'Serverfout: ' + e.message } }) };
  }
};

async function sha256Hex(str) {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(str, 'utf8').digest('hex');
}

// v4.49.0 — de handler blijft ongewijzigd; withCors voegt alleen de CORS-headers toe en
// beantwoordt de preflight, zodat de Capacitor-app (https://localhost) deze functie kan bereiken.
exports.handler = withCors(_handler);
