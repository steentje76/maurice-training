// Alleen de gym-owner mag de coach-toegang-pincode instellen/wijzigen. Er wordt geen
// oude/nieuwe pincode gelogd (alleen het feit dát hij gewijzigd is) — de pincode zelf
// is geen atleet-/trainingsdata maar een clubtoegangscode, en hoort niet leesbaar in een
// logboek te staan.
exports.handler = async function (event) {
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
  const newPin = String(body.newPin || '');
  if (!/^\d{4,8}$/.test(newPin)) return { statusCode: 400, body: JSON.stringify({ error: { message: 'Pincode moet 4-8 cijfers zijn' } }) };

  try {
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: authHeader } });
    if (!userRes.ok) return { statusCode: 401, body: JSON.stringify({ error: { message: 'Ongeldige of verlopen sessie' } }) };
    const { id: callerId, email: callerEmail } = await userRes.json();
    if (!callerId) return { statusCode: 401, body: JSON.stringify({ error: { message: 'Kon gebruiker niet vaststellen' } }) };

    const callerRes = await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${callerId}&select=gym_id,gym_role_level`, { headers: sbHeaders });
    const [caller] = await callerRes.json();
    if (!caller || (caller.gym_role_level ?? -1) < 3) {
      return { statusCode: 403, body: JSON.stringify({ error: { message: 'Alleen de gym-owner mag de coach-pincode instellen' } }) };
    }

    const crypto = require('crypto');
    const pinHash = crypto.createHash('sha256').update(newPin, 'utf8').digest('hex');
    const updRes = await fetch(`${supabaseUrl}/rest/v1/gyms?id=eq.${caller.gym_id}`, {
      method: 'PATCH', headers: { ...sbHeaders, Prefer: 'return=minimal' },
      body: JSON.stringify({ coach_pin_hash: pinHash })
    });
    if (!updRes.ok) return { statusCode: 500, body: JSON.stringify({ error: { message: 'Opslaan mislukt: ' + await updRes.text() } }) };

    await fetch(`${supabaseUrl}/rest/v1/gym_audit_log`, {
      method: 'POST', headers: { ...sbHeaders, Prefer: 'return=minimal' },
      body: JSON.stringify({ gym_id: caller.gym_id, actor_user_id: callerId, actor_email: callerEmail, action: 'coach_pin_changed' })
    });

    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ success: true }) };
  } catch (e) {
    console.error('gym-team-set-pin exception', e);
    return { statusCode: 500, body: JSON.stringify({ error: { message: 'Serverfout: ' + e.message } }) };
  }
};
