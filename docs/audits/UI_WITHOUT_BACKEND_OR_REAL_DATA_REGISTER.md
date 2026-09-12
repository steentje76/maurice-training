# UI Without Backend or Real Data Register

Canonical mockup-elementen die een capability suggereren die de
database/backend niet (volledig) ondersteunt.

| UI element (canonical mockup) | Suggereert | Werkelijke backend | Classificatie | Gap |
|---|---|---|---|---|
| Vandaag: "Voeding lunch ✓ Voldoende energie" | een werkende, gebruikte voedingsregistratie | nutrition_entries bestaat, 0 rijen | PLACEHOLDER | de UI-tekst in de mockup is een canonical voorbeeld, geen bevestigde runtime-state; er is nooit een echte log geweest om dit te tonen |
| Vandaag: "Voeding" status-chip in de Volgende Actie-kaart | live koppeling tussen voeding en trainingscontext | geen bevestigde read van nutrition_entries in deze context gevonden | UNKNOWN | vereist code-inspectie van de Vandaag-renderfunctie, niet in deze sessie uitgevoerd |
| Samen: "12 online", "4 groepen", "2 actief", "3 ongelezen" | actieve, gebruikte social-counts | social_connections/challenges: 0 rijen; social_groups: 1 rij; geen messaging-tabel | MOCK (canonical voorbeeldwaarden, geen live databron bevestigd) | dit zijn expliciet canonical mockup-voorbeeldcijfers, dus verwacht -- maar bevestigt dat er nog geen enkele render-functie is die deze counts uit echte tabellen haalt |
| Samen: "Berichten" met rode teller | messaging-systeem | geen messaging-tabel gevonden | MISSING | volledige capability ontbreekt op databaseniveau |
| Coach: "Mijn Coach - Mark de Vries" met chatgeschiedenis | een actieve human-coach-relatie | coach_athlete_relationships: 0 rijen | MOCK/PLACEHOLDER | canonical voorbeeldpersoon, geen enkele echte coach-athlete-koppeling bestaat |
| Profiel: "Apparaten & verbindingen - 5 verbonden" | 5 actieve devices | wearable_connections: 1 rij, external_connections: 0 | MOCK (canonical voorbeeldwaarde) | werkelijke koppelingen: hooguit 1 |
| Profiel: "Abonnement - Trainingskompas Premium" | een actieve, betaalde subscription | billing_events: 0, user_credit_purchases: 0 | UNKNOWN | entitlement-tabellen bestaan (plans/features), maar geen bewijs van een echte, actieve betaalde transactie in deze sessie gevonden |

**Nuance:** de canonical PNG's zijn per definitie mockups met
voorbeelddata -- dat is geen fout. Dit register bestaat om te voorkomen
dat bij toekomstige implementatie de mockup-voorbeeldwaarden per ongeluk
als "de capability bestaat al" worden gelezen.
