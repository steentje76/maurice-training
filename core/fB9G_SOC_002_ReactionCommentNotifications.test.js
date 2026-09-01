/* fB9G_SOC_002_ReactionCommentNotifications.test.js
 * Benchmark 9+ Functional Deep-Dive -- B9G-SOC-002: notificaties voor
 * reacties/comments op gedeelde activiteiten. Hergebruikt de bestaande,
 * veilige RPC (geen nieuwe engine), geen zelf-notificatie, geen UX-wijziging.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const migratie = fs.readFileSync(path.join(ROOT, 'migratie_v538.sql'), 'utf8');

// ---- A. Migratie: forward-only, geen destructieve wijziging ----
ok(migratie.includes("'reaction','comment'") && migratie.includes("'shared_activity'"),
  'A1: de check-constraints staan de nieuwe event_type/target_type-waarden expliciet toe');
ok(migratie.includes('security definer') && migratie.includes("set search_path to 'public'"),
  'A2: de bijgewerkte RPC behoudt SECURITY DEFINER + expliciete search_path (voorkomt search_path-hijacking)');
ok(migratie.includes("if auth.uid() is null then") && migratie.includes("if p_recipient_id = auth.uid() then"),
  'A3: de authenticatiecheck en de zelf-notificatie-preventie blijven ongewijzigd aanwezig in de bijgewerkte functie');

// ---- B. Client: hergebruikt uitsluitend de bestaande RPC, geen nieuwe engine ----
ok(html.includes("p_event_type:'reaction'") && html.includes("p_event_type:'comment'"),
  'B1: zowel de reactie- als de comment-flow roept de bestaande social_create_notification-RPC aan');
ok(html.includes('athleteId&&athleteId!==uid') && (html.match(/athleteId&&athleteId!==uid/g) || []).length === 2,
  'B2: beide aanroeplocaties (reactie en comment) controleren expliciet dat de ontvanger niet de handelende gebruiker zelf is, vóór de RPC wordt aangeroepen');

// ---- C. Geen UX-wijziging (sectie 27/28 van de opdracht) ----
ok(!html.includes('id="s-social-insights"') && !html.includes('nieuwe-notificatie-scherm'),
  'C1: geen nieuw scherm of nieuwe schermstructuur toegevoegd -- uitsluitend een functionele uitbreiding van het bestaande notificatiescherm');
ok(html.includes("reaction:'reageerde op je gedeelde training'") && html.includes("comment:'plaatste een reactie op je gedeelde training'"),
  'C2: de bestaande, ongewijzigde notificatie-kaart toont nu ook deze twee nieuwe typen met een begrijpelijk label');

console.log('fB9G_SOC_002_ReactionCommentNotifications: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
