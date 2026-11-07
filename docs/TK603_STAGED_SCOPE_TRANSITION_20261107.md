# TK603 — gecontroleerde overgang voor technische catalogusreferenties

Datum: 7 november 2026. Refs #603, #504 en PR #607.
Status: migratie voorbereid en werkelijk uitgevoerd in tijdelijke lokale containers.
Niet toegepast op productie; geen oefeningen, koppelingen of rechten vrijgegeven.

## Probleem en gedrag

De bestaande set_exercise_scope_context-trigger vereist een gym-owner voor globale
oefeningen. Zonder aangemelde gebruiker blokkeerde hij ook een databasebeheerder
die een technische TKC-referentie wilde toevoegen. De eerdere lokale
acceptatieproef gebruikte daarom een tijdelijke functie-aanpassing.

De nieuwe staged migratie bevat een smalle extra tak voor INSERT van
TKC-000001..TKC-000582: alleen een directe postgres-sessie, current_user postgres,
geen auth.uid of clientrolclaim, global scope, active=false en geen user,
created_by of gym. Alle oorspronkelijke personal/gym/global-takken blijven
na LF-normalisatie bytegelijk aan de vastgelegde bron.

## Bestanden en volgorde

1. De bestaande typed-FK-schema-migratie moet aanwezig zijn.
2. De met Supabase CLI aangemaakte migratie
   supabase/migrations/20261107154937_tk603_reserved_scope_provisioning_stage.sql
   controleert de bronfunctie en de bestaande reserved-aliasbescherming.
3. Afzonderlijke, brongecontroleerde provisioning volgt pas na de overige gates.
   Deze migratie voegt zelf geen alias, binding, publicatie of grant toe.
4. tools/tk603-scope-transition-rollback.sql herstelt uitsluitend de oorspronkelijke
   scopefunctie. De bron moet nog exact overeenkomen met de staged definitie;
   onverwachte wijzigingen worden nooit overschreven.

## Grenzen en controles

- Eén atomair DO-statement, met lock tegen gelijktijdige oefeningwrites.
- SHA256 van de complete bestaande scopefunctie, met alleen LF-normalisatie.
- De reserved-aliastrigger moet enabled zijn en naar de verwachte functie wijzen.
  Ook de functiebody-SHA256, SECURITY INVOKER en search_path=pg_catalog zijn gepind.
- Geen trigger uitschakelen, RLS-beleid wijzigen, rollen/rechten aanpassen,
  bestaande persoonlijke oefening wijzigen of sessies herschrijven.
- CREATE OR REPLACE behoudt de bestaande eigenaar/ACL; de legacy SECURITY DEFINER
  en search_path worden uit de vastgelegde bron behouden, niet nieuw toegevoegd.
- Niet opnieuw toepassen op een onbekende of reeds gewijzigde functie. Eerst
  status onderzoeken; de precondition niet verwijderen om een fout te omzeilen.

## Uitgevoerd bewijs

Commando:
node tools/tk603-real-auth-captured-schema.cjs --batch25 --staged-scope

380/380 lokale Auth/PostgREST/PostgreSQL-controles PASS; cleanup PASS.
Dit omvat bestaande 66 controles, de volledige eerste 25 catalogus-/writerproeven,
en disabled-guard-, guard-body-drift-, scope-drift-, privilege- en rollbacktests.
De actieve technische alias wordt geweigerd. Na rollback zijn de oorspronkelijke
functie en lokale ACL/eigenaarschap exact hersteld. Volledige rij-inhoud-SHA256
blijft gelijk voor exercises, sessions, bindings en publications. Opnieuw toepassen
na rollback behoudt dezelfde gegevens.

core/tk603StagedScopeTransition.test.js: 25 automatische bron-/rechteninvarianten
PASS. Uitvoerbaar zonder Docker en opgenomen in de ontdekkende projectgate.
Het volledige uitvoeringsrapport staat in TK603_STAGED_SCOPE_BATCH25_20261107.md.

## Nog nodig vóór productie

De fixture gebruikt het vastgelegde exercise/session-schemacontract met synthetische
afhankelijkheden. Zij is geen volledige productierestore: function owners/ACLs van
productie, kolomrechten, indexes en typemodifiers zijn niet geheel gereconstrueerd.
Behoud in de lokale fixture bewijst geen voorafgaande gelijkheid met productie.

Vóór productie blijven actuele schema-/rolcontrole, onafhankelijk review, backup,
toegestane beheerdersroute en een gecontroleerd migratiebesluit nodig. Ook de
bestaande volledige releasegate, beveiligde media/cutover, echte browser/Android-
acceptatie en gebruikers-UX-afspraak blijven open. Geen APK gemaakt.
