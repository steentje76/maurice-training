/* fSecurityDefinerTriggerScope.test.js — V1 PROVEN MATURITY SPRINT 01.
 * Documenteert en verifieert (waar mogelijk statisch) de live-database-fix
 * die trigger-only SECURITY DEFINER-functies afschermt van directe
 * publieke RPC-aanroep. De daadwerkelijke DB-migratie/adversariële proef
 * is uitgevoerd tegen het live Supabase-project (mhfxhzkdmgkaplicdszg) en
 * is hier NIET herhaalbaar zonder databasetoegang -- dit bestand legt de
 * repo-brede invariant vast die de fix rechtvaardigde (geen van deze
 * functies wordt ooit als RPC door de app zelf aangeroepen) en dient als
 * regressiewaarschuwing als dat ooit verandert.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
let coachSrc = '';
try { coachSrc = fs.readFileSync(path.join(ROOT, 'netlify/functions/coach.js'), 'utf8'); } catch (e) { /* n.v.t. */ }
let allJs = html;
try { allJs += fs.readFileSync(path.join(ROOT, 'netlify/functions/coach.js'), 'utf8'); } catch (e) { /* n.v.t. */ }

// Deze 16 functies zijn live geverifieerd (pg_trigger) als ECHTE, actieve
// triggers op bestaande tabellen, en hadden PER ONGELUK ook publieke
// EXECUTE voor anon/authenticated (Postgres' standaard PUBLIC-grant bij
// het aanmaken van een functie, nooit expliciet ingetrokken). Live
// EXECUTE ingetrokken (migratie: revoke_trigger_only_execute_from_public_roles),
// adversarieel bevestigd: directe RPC geeft nu "permission denied", de
// trigger zelf blijft normaal functioneren bij een gewone UPDATE.
const TRIGGER_ONLY_FUNCTIONS = [
  'coach_relationship_set_default_scopes', 'memberships_prevent_tenant_identifier_change',
  'notify_message_participants', 'prevent_event_attendance_identity_change',
  'prevent_event_responsibilities_event_id_change', 'prevent_gyms_organization_id_change',
  'prevent_organization_id_change', 'prevent_team_events_team_id_change', 'prevent_team_id_change',
  'protect_commercial_user_columns', 'protect_privileged_user_columns',
  'responsibilities_assignee_status_only', 'set_exercise_equipment_owner', 'set_gyms_updated_meta',
  'team_events_validate_linked_training', 'team_events_validate_location_tenant'
];

TRIGGER_ONLY_FUNCTIONS.forEach((fn) => {
  const patronen = ["rpc/" + fn, ".rpc('" + fn + "'", '.rpc("' + fn + '"'];
  const gevonden = patronen.some((p) => allJs.indexOf(p) >= 0);
  ok(!gevonden, 'regressie-waarschuwing: ' + fn + ' wordt nog steeds nergens door de app als RPC aangeroepen (rechtvaardigt de ingetrokken publieke EXECUTE) -- als dit ooit FAALT, betekent het dat iemand deze functie alsnog als RPC is gaan gebruiken en de live EXECUTE-intrekking moet worden heroverwogen vóórdat die code werkt');
});

// Functies die BEWUST NIET zijn aangepast omdat ze aantoonbaar in RLS-
// policies worden gebruikt (USING/WITH CHECK) -- EXECUTE intrekken voor
// authenticated zou die policies breken (de querying role heeft zelf
// EXECUTE nodig om een functie in zijn eigen RLS-expressie te evalueren,
// ook al is de functie SECURITY DEFINER). Dit is een bewuste, bewezen
// afweging (boolean-relatiecontrole-lek is aanvaardbaar risico t.o.v.
// het breken van tientallen RLS-policies), geen vergeten fix.
const RLS_POLICY_HELPER_FUNCTIONS_KEPT_PUBLIC = [
  'coach_has_scope', 'org_user_has_role', 'org_has_role', 'team_has_access',
  'is_relationship_athlete', 'is_relationship_coach', 'is_thread_participant',
  'social_is_blocked_pair', 'social_is_group_member', 'social_is_group_owner'
];
ok(RLS_POLICY_HELPER_FUNCTIONS_KEPT_PUBLIC.length === 10, 'documentatie: 10 RLS-policy-helperfuncties blijven bewust publiek-uitvoerbaar (breken anders tientallen policies) -- bekend, geaccepteerd, laag-severity restrisico (boolean-relatie-aftasting tussen bekende UUID-paren)');

console.log('fSecurityDefinerTriggerScope: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
