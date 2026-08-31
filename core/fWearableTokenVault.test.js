/* fWearableTokenVault.test.js — F13 Post-Audit Remediation P1-09.
 * Bewaakt dat wearable OAuth-tokens nooit meer in plaintext worden
 * opgeslagen/gelezen/geschreven -- alle vier de betrokken Netlify
 * Functions gebruiken uitsluitend de Vault-RPC's, nooit rechtstreeks
 * de plaintext access_token/refresh_token-kolommen.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const migratie = fs.readFileSync(path.join(ROOT, 'migratie_v527.sql'), 'utf8');
const authCallback = fs.readFileSync(path.join(ROOT, 'netlify/functions/wearable-auth-callback.js'), 'utf8');
const sync = fs.readFileSync(path.join(ROOT, 'netlify/functions/wearable-sync.js'), 'utf8');
const disconnect = fs.readFileSync(path.join(ROOT, 'netlify/functions/wearable-disconnect.js'), 'utf8');
const deleteAccount = fs.readFileSync(path.join(ROOT, 'netlify/functions/delete-account.js'), 'utf8');
const vaultModule = fs.readFileSync(path.join(ROOT, 'netlify/functions/wearableTokenVault.js'), 'utf8');

// ---- A. Schema: de nieuwe secret-id-kolommen bestaan, RPC's zijn service-role-only ----
ok(migratie.includes('access_token_secret_id uuid') && migratie.includes('refresh_token_secret_id uuid'),
  'A1: wearable_connections krijgt access_token_secret_id/refresh_token_secret_id-kolommen');
['store_wearable_token_secret', 'get_wearable_token_secret', 'update_wearable_token_secret'].forEach(function (fn) {
  ok(migratie.includes('grant execute on function public.' + fn) && migratie.includes('to service_role'),
    'A2: ' + fn + '() heeft expliciet EXECUTE voor service_role');
  ok(migratie.match(new RegExp('revoke all on function public\\.' + fn + '[^;]*from public, anon, authenticated')),
    'A3: ' + fn + '() heeft geen EXECUTE voor anon/authenticated');
});

// ---- B. De bestaande plaintext-tokens zijn daadwerkelijk gemigreerd en geleegd ----
ok(migratie.includes('set access_token = null, refresh_token = null'),
  'B1: de migratie leegt expliciet de plaintext-kolommen na een geslaagde Vault-migratie');
ok(migratie.includes('store_wearable_token_secret(access_token'),
  'B2: bestaande, plaintext tokens worden daadwerkelijk naar Vault gemigreerd vóórdat ze geleegd worden');

// ---- C. Geen enkel Netlify-function-bestand leest/schrijft nog rechtstreeks access_token/refresh_token als kolomnaam in een query ----
[
  { naam: 'wearable-auth-callback.js', src: authCallback },
  { naam: 'wearable-sync.js', src: sync },
  { naam: 'wearable-disconnect.js', src: disconnect }
].forEach(function (bestand) {
  ok(!bestand.src.match(/select=access_token(?!_secret_id)/),
    'C: ' + bestand.naam + ' selecteert nergens meer de plaintext access_token-kolom rechtstreeks');
  ok(bestand.src.includes('wearableTokenVault.js'), 'C2: ' + bestand.naam + ' gebruikt de gedeelde Vault-module');
});

// ---- D. wearable-sync.js gebruikt de rotation-strategy (update, geen nieuwe secret per refresh) ----
ok(sync.includes('updateWearableTokenSecret'), 'D1: wearable-sync.js gebruikt updateWearableTokenSecret() bij een token-refresh (rotation strategy, geen nieuwe secret-rij per refresh)');
ok(!sync.match(/body:\s*JSON\.stringify\(\{\s*access_token:\s*accessToken/),
  'D2: de PATCH naar wearable_connections bevat niet langer een plaintext access_token-veld');
{
  const syncCodeOnly = sync.split('\n').filter(function (regel) {
    var t = regel.trim();
    return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*');
  }).join('\n');
  ok(!syncCodeOnly.match(/conn\.access_token\b(?!_secret_id)/) && !syncCodeOnly.match(/conn\.refresh_token\b(?!_secret_id)/),
    'D3: wearable-sync.js benadert nergens meer conn.access_token/conn.refresh_token rechtstreeks als variabele in uitvoerbare code -- uitsluitend via de Vault-secret-id-velden (een verklarende commentaarregel die dit principe documenteert is expliciet toegestaan)');
}

// ---- E. delete-account.js ruimt de onderliggende Vault-secrets op (geen wees-secrets) ----
ok(deleteAccount.includes('deleteWearableTokenSecret'), 'E1: delete-account.js ruimt de Vault-secrets expliciet op vóór/tijdens accountverwijdering');

// ---- F. De gedeelde module bevat zelf geen enkele cryptografische logica ("geen crypto theater") ----
ok(!vaultModule.match(/crypto\.(createCipher|createDecipher|randomBytes)/),
  'F1: wearableTokenVault.js implementeert zelf geen encryptie -- delegeert volledig aan Supabase Vault (de sleutel wordt buiten de database beheerd)');

console.log('fWearableTokenVault: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
