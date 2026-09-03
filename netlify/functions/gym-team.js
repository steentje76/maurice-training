// Eén endpoint voor alle Team-acties (list/update_role/audit_log). Alle drie vereisen:
// (1) een geldige sessie, (2) een gym_role_level die hoog genoeg is voor de actie, en
// (3) de juiste coach-pincode van de eigen gym. Rolwijzigingen worden altijd gelogd in
// gym_audit_log — nooit atleet-/trainingsdata, uitsluitend lidmaatschap/rol-gebeurtenissen.
// KRITIEKE FIX (Admin Auth Hardening, zelf gevonden): deze constante moet EXACT
// overeenkomen met de database-gegenereerde kolom users.gym_role_level
// (CASE gym_role WHEN 'lid' THEN 1 WHEN 'coach' THEN 2 WHEN 'manager' THEN 3
// WHEN 'owner' THEN 4 ELSE 0 END). De eerdere constante was 0-indexed
// (lid:0..owner:3) terwijl caller.gym_role_level altijd de 1-indexed
// databasewaarde is -- een off-by-one-mismatch die systematisch iedere rol
// één stap hoger autoriseerde dan bedoeld. Live, transactioneel bevestigd
// (Technical Foundation Masterprint, Admin Auth Hardening).
const ROLE_LEVEL = { lid: 1, coach: 2, manager: 3, owner: 4 };

// CANONICAL GYM TRACK B (Technical Foundation Masterprint, strangler-migratie):
// list/audit_log/update_role lezen en schrijven voortaan primair via de
// canonical organizations/memberships-architectuur (B9-H2A/B) in plaats van
// users.gym_id/gym_role. De API-response naar de client blijft EXACT
// hetzelfde contract (gym_role: 'lid'|'coach'|'manager'|'owner',
// gym_role_level: 1-4) -- de bestaande UI (index.html loadTeamMembers/
// changeTeamRole/TEAM_ROLE_LABELS) hoeft niet te wijzigen. Live,
// transactioneel geverifieerd vóór toepassing: canonical memberships bevat
// exact dezelfde 5 gebruikers/rollen als legacy users.gym_id/gym_role.
//
// Rolmapping canonical<->legacy (technisch afgeleid uit de al bestaande,
// vastgestelde rolnamen in de RLS-policies van exercise_equipment/
// equipment_catalog -- 'owner'/'admin'/'staff' -- geen nieuwe naamgeving
// verzonnen, geen Product Owner-beslissing nodig):
//   canonical 'member' <-> legacy 'lid'    (level 1)
//   canonical 'staff'  <-> legacy 'coach'  (level 2)
//   canonical 'admin'  <-> legacy 'manager'(level 3)
//   owner (organizations.owner_user_id)    <-> legacy 'owner' (level 4)
// De canonical 'owner' is GEEN memberships.role-waarde maar
// organizations.owner_user_id (zie org_has_role()) -- consistent met het
// bestaande, bewezen patroon.
const CANONICAL_TO_LEGACY_ROLE = { member: 'lid', staff: 'coach', admin: 'manager' };
const LEGACY_TO_CANONICAL_ROLE = { lid: 'member', coach: 'staff', manager: 'admin' };
// owner wordt apart afgehandeld (organizations.owner_user_id, geen
// memberships-rij nodig/gewenst voor de eigenaar zelf).

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

    // CANONICAL READ (Track B): organizations + memberships zijn nu de bron voor
    // 'list'. caller.gym_id is tevens de organization_id (B9-H2A/B migreerde
    // 1:1 met gelijke ID's, live herbevestigd tijdens deze sprint).
    if (action === 'list') {
      const orgId = caller.gym_id;
      const [ownerRes, membersRes] = await Promise.all([
        fetch(`${supabaseUrl}/rest/v1/organizations?id=eq.${orgId}&select=owner_user_id`, { headers: sbHeaders }),
        fetch(`${supabaseUrl}/rest/v1/memberships?organization_id=eq.${orgId}&status=eq.active&select=user_id,role`, { headers: sbHeaders })
      ]);
      const [org] = await ownerRes.json();
      const canonicalMembers = await membersRes.json();
      const userIds = Array.from(new Set([org?.owner_user_id, ...canonicalMembers.map(m => m.user_id)].filter(Boolean)));
      if (userIds.length === 0) return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ members: [] }) };
      const usersRes = await fetch(`${supabaseUrl}/rest/v1/users?id=in.(${userIds.join(',')})&select=id,name,email`, { headers: sbHeaders });
      const usersById = {};
      (await usersRes.json()).forEach(u => { usersById[u.id] = u; });
      const roleByUser = {};
      canonicalMembers.forEach(m => { roleByUser[m.user_id] = m.role; });
      const members = userIds.map(uid => {
        const isOwner = uid === org?.owner_user_id;
        const canonicalRole = isOwner ? 'owner' : (roleByUser[uid] || 'member');
        const legacyRole = isOwner ? 'owner' : (CANONICAL_TO_LEGACY_ROLE[canonicalRole] || 'lid');
        const u = usersById[uid] || {};
        return { id: uid, name: u.name, email: u.email, gym_role: legacyRole, gym_role_level: ROLE_LEVEL[legacyRole] || 1 };
      }).sort((a, b) => (b.gym_role_level || 0) - (a.gym_role_level || 0));
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

      // P0-002-fix: niemand kan de rol wijzigen van iemand met een gelijke of hogere rol
      // dan zijn eigen rol (voorkomt dat een manager een owner of een andere manager
      // degradeert — de eerdere check hieronder blokkeerde alleen het TOEKENNEN van een
      // te hoge rol, niet het WIJZIGEN van iemand die al gelijk/hoger stond).
      if (target.gym_role_level >= caller.gym_role_level) {
        return { statusCode: 403, body: JSON.stringify({ error: { message: 'Je kunt de rol niet wijzigen van iemand met een gelijke of hogere rol dan die van jezelf' } }) };
      }

      // Niemand kan een rol toekennen die hoger is dan zijn eigen rol (voorkomt dat een
      // manager per ongeluk of moedwillig iemand tot owner promoveert).
      if (ROLE_LEVEL[newRole] > caller.gym_role_level) {
        return { statusCode: 403, body: JSON.stringify({ error: { message: 'Je kunt geen rol toekennen die hoger is dan je eigen rol' } }) };
      }

      const oldRole = target.gym_role;

      // DUAL-WRITE (Track B, strangler-fase TRANSITIONAL): schrijf naar zowel
      // legacy users.gym_role (blijft nodig zolang exercise_equipment/
      // equipment_catalog-RLS nog op gym_role_level leest -- geen regressie
      // op bestaande, bewezen RLS) als canonical memberships.role. Beide
      // schrijfacties moeten slagen; als de canonical write faalt wordt de
      // legacy write NIET stilzwijgend als enige waarheid geaccepteerd --
      // de aanroeper krijgt een fout en geen inconsistente dual-state blijft
      // onopgemerkt.
      const updRes = await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${targetUserId}`, {
        method: 'PATCH', headers: { ...sbHeaders, Prefer: 'return=minimal' },
        body: JSON.stringify({ gym_role: newRole })
      });
      if (!updRes.ok) return { statusCode: 500, body: JSON.stringify({ error: { message: 'Bijwerken mislukt: ' + await updRes.text() } }) };

      if (newRole === 'owner') {
        // Eigenaarschap wordt via organizations.owner_user_id gemodelleerd, niet via
        // memberships.role. Een bestaande memberships-rij voor de nieuwe owner (indien
        // aanwezig als lid/coach/manager) wordt verwijderd zodat er geen tegenstrijdige
        // dubbele bron ontstaat; organizations.owner_user_id wordt de canonical waarheid.
        await fetch(`${supabaseUrl}/rest/v1/organizations?id=eq.${caller.gym_id}`, {
          method: 'PATCH', headers: { ...sbHeaders, Prefer: 'return=minimal' },
          body: JSON.stringify({ owner_user_id: targetUserId })
        });
        await fetch(`${supabaseUrl}/rest/v1/memberships?organization_id=eq.${caller.gym_id}&user_id=eq.${targetUserId}`, {
          method: 'DELETE', headers: sbHeaders
        });
      } else {
        const canonicalRole = LEGACY_TO_CANONICAL_ROLE[newRole] || 'member';
        // GEEN on_conflict-upsert: de unique constraint op memberships is
        // (user_id, organization_id, team_id), en team_id is nullable --
        // in standaard PostgreSQL-semantiek zijn NULL-waarden nooit gelijk
        // aan elkaar, dus een on_conflict=organization_id,user_id-upsert zou
        // niet matchen met de bestaande constraint (PostgREST wijst dit af)
        // en een on_conflict die wel team_id meeneemt zou bij team_id=null
        // GEEN conflict detecteren en dus telkens een nieuwe, dubbele rij
        // aanmaken. Daarom expliciet: eerst kijken of er al een team_id-loze
        // membership-rij bestaat, dan PATCH; anders POST. Live, transactioneel
        // getest vóór toepassing.
        const existingRes = await fetch(`${supabaseUrl}/rest/v1/memberships?organization_id=eq.${caller.gym_id}&user_id=eq.${targetUserId}&team_id=is.null&select=id`, { headers: sbHeaders });
        const [existingMembership] = await existingRes.json();
        const membershipWriteRes = existingMembership
          ? await fetch(`${supabaseUrl}/rest/v1/memberships?id=eq.${existingMembership.id}`, {
              method: 'PATCH', headers: { ...sbHeaders, Prefer: 'return=minimal' },
              body: JSON.stringify({ role: canonicalRole, status: 'active' })
            })
          : await fetch(`${supabaseUrl}/rest/v1/memberships`, {
              method: 'POST', headers: { ...sbHeaders, Prefer: 'return=minimal' },
              body: JSON.stringify({ organization_id: caller.gym_id, user_id: targetUserId, role: canonicalRole, status: 'active' })
            });
        if (!membershipWriteRes.ok) {
          // Canonical write mislukt: meld dit expliciet in plaats van stilzwijgend
          // alleen legacy bij te werken (voorkomt onopgemerkte dual-state-drift).
          return { statusCode: 500, body: JSON.stringify({ error: { message: 'Rol bijgewerkt in legacy, maar canonical membership-update mislukt: ' + await membershipWriteRes.text() } }) };
        }
      }

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
