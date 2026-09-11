// netlify/functions/avatarStorage.js
// Gedeelde server-side helper voor de private bucket 'avatars'.
//
// WAAROM DEZE HELPER BESTAAT: het verwijderen van de rij in atleet_profiel
// haalt alleen avatar_path weg. Het STORAGE-OBJECT blijft dan achter als
// verweesde persoonsgegevens. Dat is exact de gatenklasse die eerder is
// gevonden in PR #316/#317/#318 (tabellen zonder FK-cascade die een
// accountverwijdering overleefden). Hier wordt dat vooraf afgevangen in
// BEIDE verwijderpaden.
//
// Service-role wordt hier bewust gebruikt: dit is een server-side
// opruimactie namens het systeem, geen eindgebruikeractie. De
// eindgebruikerspaden (upload/vervangen/verwijderen vanuit de app) lopen
// juist NIET via service-role maar via de gebruikerssessie, zodat de
// storage-policies met auth.uid() daadwerkelijk gelden.

// Verwijdert alle avatarobjecten van één gebruiker. Best-effort: een
// storagefout mag het verwijderen van het account nooit blokkeren, maar
// wordt wel gelogd zodat een gat zichtbaar blijft.
async function deleteAvatarObjectsForUser(supabaseUrl, serviceKey, userId) {
  if (!supabaseUrl || !serviceKey || !userId) return { verwijderd: 0, ok: false, reden: 'ontbrekende parameters' };
  const prefix = String(userId);
  try {
    // 1. Lijst de objecten onder {user_id}/ -- het padsegment waarop ook de
    //    storage-policy ownership toetst.
    const lijstRes = await fetch(`${supabaseUrl}/storage/v1/object/list/avatars`, {
      method: 'POST',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix, limit: 100, offset: 0 })
    });
    if (!lijstRes.ok) {
      console.error('avatarStorage: lijst mislukt', lijstRes.status);
      return { verwijderd: 0, ok: false, reden: 'lijst_mislukt' };
    }
    const objecten = await lijstRes.json();
    if (!Array.isArray(objecten) || !objecten.length) return { verwijderd: 0, ok: true, reden: null };

    const paden = objecten
      .filter(o => o && o.name)
      .map(o => `${prefix}/${o.name}`);
    if (!paden.length) return { verwijderd: 0, ok: true, reden: null };

    // 2. Verwijder ze in één aanroep.
    const delRes = await fetch(`${supabaseUrl}/storage/v1/object/avatars`, {
      method: 'DELETE',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefixes: paden })
    });
    if (!delRes.ok) {
      console.error('avatarStorage: verwijderen mislukt', delRes.status);
      return { verwijderd: 0, ok: false, reden: 'verwijderen_mislukt' };
    }
    return { verwijderd: paden.length, ok: true, reden: null };
  } catch (e) {
    console.error('avatarStorage: uitzondering', e && e.message);
    return { verwijderd: 0, ok: false, reden: 'uitzondering' };
  }
}

// Verwijdert één specifiek object (gebruikt bij vervangen: het OUDE object
// wordt pas opgeruimd nadat de nieuwe upload én de referentie-update zijn
// geslaagd, zodat een mislukte vervanging de bestaande avatar nooit wist).
async function deleteAvatarObject(supabaseUrl, serviceKey, pad) {
  if (!supabaseUrl || !serviceKey || !pad) return false;
  try {
    const res = await fetch(`${supabaseUrl}/storage/v1/object/avatars`, {
      method: 'DELETE',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefixes: [String(pad)] })
    });
    return res.ok;
  } catch (e) {
    console.error('avatarStorage: deleteAvatarObject', e && e.message);
    return false;
  }
}

module.exports = { deleteAvatarObjectsForUser, deleteAvatarObject };
