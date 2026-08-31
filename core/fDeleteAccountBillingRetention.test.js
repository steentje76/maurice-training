/* fDeleteAccountBillingRetention.test.js — MS-F13-05 regressietest.
 * Bewaakt de expliciete data-retentiebeslissing: billing_events wordt
 * NOOIT verwijderd bij accountverwijdering. De koppeling naar de
 * persoon verdwijnt (ON DELETE SET NULL), de financiële audit-
 * geschiedenis zelf blijft bestaan.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const migratie = fs.readFileSync(path.join(ROOT, 'migratie_v524.sql'), 'utf8');

// ---- A. De foreign-key moet ON DELETE SET NULL zijn, nooit CASCADE ----
ok(migratie.includes('target_user_id uuid references auth.users(id) on delete set null'),
  'A1: billing_events.target_user_id gebruikt ON DELETE SET NULL (nooit CASCADE) -- accountverwijdering verwijdert nooit de financiële audit-geschiedenis zelf');
ok(!migratie.match(/target_user_id[^,]*on delete cascade/i),
  'A2: geen enkele CASCADE-variant op deze foreign-key bestaat');

// ---- B. delete-account.js mag nooit rechtstreeks in billing_events muteren --
// de database-constraint is de enige, correcte plek voor dit gedrag, niet
// applicatiecode (voorkomt een tweede, mogelijk inconsistente implementatie). ----
{
  const deleteSrc = fs.readFileSync(path.join(ROOT, 'netlify/functions/delete-account.js'), 'utf8');
  ok(!deleteSrc.includes('billing_events'),
    'B1: delete-account.js bevat geen enkele verwijzing naar billing_events (het ON DELETE SET NULL-gedrag is uitsluitend database-niveau, geen dubbele applicatielogica)');
}

// ---- C. users.mollie_customer_id/individual_plan_* worden wel expliciet
// meegenomen (via de bestaande, volledige users-rij-verwijdering) ----
{
  const deleteSrc = fs.readFileSync(path.join(ROOT, 'netlify/functions/delete-account.js'), 'utf8');
  ok(deleteSrc.match(/rest\/v1\/users\?id=eq\.\$\{userId\}/),
    'C1: delete-account.js verwijdert de volledige users-rij (inclusief mollie_customer_id/individual_plan_*) als onderdeel van de bestaande flow');
}

console.log('fDeleteAccountBillingRetention: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
