/* fResearchConsentWithdrawal.test.js — F14 MS-F14-01.
 * Bewaakt de research-consent-architectuur: append-only, doelgebonden,
 * versioneerbaar, intrekbaar, volledig los van elk ander consent-
 * mechanisme, least-privilege vanaf dag 1, en geen impliciete
 * researchdeelname.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

let pass = 0, fail = 0;
const msgs = [];
function ok(cond, label) { if (cond) { pass++; } else { fail++; msgs.push('MISLUKT: ' + label); } }

const migratie = fs.readFileSync(path.join(ROOT, 'migratie_v530.sql'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

// ---- A. Schema: append-only, doelgebonden, versioneerbaar, RLS, least privilege ----
ok(migratie.includes("action text not null check (action in ('granted','withdrawn'))"),
  'A1: consent-acties zijn een gesloten enum (granted/withdrawn), geen vrije tekst');
ok(migratie.includes('consent_version text not null'),
  'A2: elke consent-rij is expliciet versioneerbaar (geen impliciete geldigheid over versies heen)');
ok(migratie.includes("research_purpose text not null check"),
  'A3: consent is doelgebonden (gesloten enum), niet één algemene vlag');
ok(!migratie.match(/create policy \w+ on public\.research_consents\s+for update/i) && !migratie.match(/grant update on public\.research_consents/i),
  'A4: geen enkele UPDATE-policy of -grant -- append-only is architecturaal afgedwongen, niet alleen conventie');
ok(migratie.includes('revoke all on public.research_consents from anon'),
  'A5: anon heeft helemaal geen toegang (least privilege vanaf dag 1, conform de F14-instructie om de F13-P2-bevinding niet te herhalen)');
ok(migratie.includes('revoke update, delete, truncate, trigger, references on public.research_consents from authenticated'),
  'A6: authenticated heeft uitsluitend SELECT/INSERT, geen UPDATE/DELETE (least privilege)');

// ---- B. Volledig los van elk ander consent-mechanisme (uitvoerbare SQL, geen commentaar) ----
{
  const sqlCodeOnly = migratie.split('\n').filter(function (regel) { return !regel.trim().startsWith('--'); }).join('\n');
  ok(!sqlCodeOnly.match(/wearable|women|cyclus|coach_athlete|membership|social/i),
    'B1: de uitvoerbare SQL (tabel/kolommen/policies) verwijst nergens naar een ander, bestaand consent-mechanisme (volledig eigen, aparte laag) -- een verklarende commentaarregel die dit expliciet uitsluit is toegestaan');
}

// ---- C. Client-side: geen impliciete grant, expliciete opt-in, altijd intrekbaar ----
ok(html.includes('async function getResearchConsentStatus') && html.includes('async function grantResearchConsent') && html.includes('async function withdrawResearchConsent'),
  'C1: alle drie de kernfuncties (status/grant/withdraw) bestaan');
ok(html.match(/getResearchConsentStatus[\s\S]{0,10}=[\s\S]{0,300}return false/) || html.includes('if(!rows.length) return false'),
  'C2: zonder een expliciete, bestaande consent-rij is de status altijd false (geen impliciete opt-in, "fail-closed")');
ok(html.includes("laatste.action==='granted' && laatste.consent_version===RESEARCH_CONSENT_ACTIVE_VERSION"),
  'C3: alleen een granted-rij bij de HUIDIGE, actieve versie telt als geldige consent -- een oudere versie telt niet automatisch mee');
ok(html.match(/confirm\('Onderzoeksdeelname intrekken\?[^']*normale gebruik van Trainingskompas verandert hierdoor niet/),
  'C4: intrekking bevestigt expliciet dat normaal gebruik van de app niet verandert (geen dark pattern, geen dreiging met functieverlies)');
ok(!html.match(/checked(?=[^>]*research-consent)/i),
  'C5: geen enkel research-consent-element staat standaard/vooraf aangevinkt in de HTML');

console.log('fResearchConsentWithdrawal: ' + pass + ' geslaagd, ' + fail + ' mislukt');
if (msgs.length) console.log(msgs.join('\n'));
console.log('Resultaat: ' + pass + ' geslaagd, ' + fail + ' mislukt');
process.exit(fail > 0 ? 1 : 0);
