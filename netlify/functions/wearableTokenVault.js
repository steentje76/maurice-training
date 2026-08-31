// wearableTokenVault.js — F13 Post-Audit Remediation (P1-09).
//
// Gedeelde helperfuncties voor het veilig opslaan/ophalen/vernieuwen van
// wearable-OAuth-tokens via Supabase Vault (Transparent Column
// Encryption). Vervangt het eerdere, kritieke lek waarbij access_token/
// refresh_token in plaintext in wearable_connections stonden.
//
// ARCHITECTUUR: drie kleine, service-role-only RPC's in de database
// (store_wearable_token_secret/get_wearable_token_secret/
// update_wearable_token_secret, migratie_v527.sql) wrappen de eigenlijke
// vault.create_secret()/vault.decrypted_secrets/vault.update_secret()-
// primitieven. Encrypt/decrypt gebeurt altijd server-side, in de
// database zelf -- deze module roept uitsluitend de RPC's aan met de
// service-role-sleutel, bevat zelf geen enkele cryptografische logica
// ("geen crypto theater": de sleutel wordt door Supabase beheerd,
// buiten de database, nooit door deze applicatiecode).
'use strict';

async function storeWearableTokenSecret(supabaseUrl, serviceKey, secretValue, naam) {
  if (!secretValue) return null;
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/store_wearable_token_secret`, {
      method: 'POST',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_secret: secretValue, p_naam: naam })
    });
    if (!res.ok) { console.error('storeWearableTokenSecret mislukt', res.status, await res.text()); return null; }
    return await res.json();
  } catch (e) { console.error('storeWearableTokenSecret catch', e); return null; }
}

async function getWearableTokenSecret(supabaseUrl, serviceKey, secretId) {
  if (!secretId) return null;
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/get_wearable_token_secret`, {
      method: 'POST',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_secret_id: secretId })
    });
    if (!res.ok) { console.error('getWearableTokenSecret mislukt', res.status, await res.text()); return null; }
    return await res.json();
  } catch (e) { console.error('getWearableTokenSecret catch', e); return null; }
}

async function updateWearableTokenSecret(supabaseUrl, serviceKey, secretId, nieuweWaarde) {
  if (!secretId) return false;
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/update_wearable_token_secret`, {
      method: 'POST',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_secret_id: secretId, p_nieuwe_waarde: nieuweWaarde })
    });
    if (!res.ok) { console.error('updateWearableTokenSecret mislukt', res.status, await res.text()); return false; }
    return true;
  } catch (e) { console.error('updateWearableTokenSecret catch', e); return false; }
}

async function deleteWearableTokenSecret(supabaseUrl, serviceKey, secretId) {
  if (!secretId) return true;
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/delete_wearable_token_secret`, {
      method: 'POST',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_secret_id: secretId })
    });
    if (!res.ok) { console.error('deleteWearableTokenSecret mislukt', res.status, await res.text()); return false; }
    return true;
  } catch (e) { console.error('deleteWearableTokenSecret catch', e); return false; }
}

module.exports = { storeWearableTokenSecret, getWearableTokenSecret, updateWearableTokenSecret, deleteWearableTokenSecret };
