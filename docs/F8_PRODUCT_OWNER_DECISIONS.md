# F8_PRODUCT_OWNER_DECISIONS.md — Trainingskompas

Vastgelegde afwegingen tijdens autonome F8-uitvoering (Product Owner niet beschikbaar). Elke afweging is reversibel; geen enkele onomkeerbare actie is genomen zonder expliciete Product Owner-bevestiging.

## Afweging 1: Scope-beperking tot Cycle & Symptoms, DEFER voor de overige drie domeinen
Waarom nodig: de acceptance gate vraagt vijf gesloten beslissingen, maar drie domeinen (contraceptie, zwangerschap/postpartum, perimenopauze/menopauze/bekkenbodem) vereisen een diepere, aparte evidence-review dan binnen deze sprint verantwoord uit te voeren is, gezien de medische/veiligheidsimplicaties.
Opties overwogen: (a) alle vijf domeinen implementeren, (b) alle vijf als architecture-only behandelen, (c) alleen implementeren waarvoor reeds bestaande, correcte code + voldoende actueel onderzoek beschikbaar is, overige drie bewust uitstellen.
Impact: optie (c) gekozen. Geen functionaliteit voor de meest gevoelige domeinen wordt gebouwd zonder een aparte, toekomstige sprint met hogere veiligheidslat.
Aanbevolen, reversibele default: DEFER voor de drie domeinen. Volledig reversibel.
Kan onafhankelijk werk doorgaan? Ja.

## Afweging 2: cycle_symptom_logs-migratiebestand alsnog retroactief committen
Waarom nodig: de tabel bestaat correct en veilig op de live database (RLS aan, eigen-data-alleen-policy geverifieerd), maar het aanmaak-script ontbreekt in de repo.
Opties overwogen: (a) een retroactief migratiebestand toevoegen (IF NOT EXISTS, geen destructieve wijziging), (b) puur als gedocumenteerd gap laten staan.
Impact: optie (a) is veilig en verbetert reproduceerbaarheid zonder risico.
Aanbevolen, reversibele default: optie (a) -- toegevoegd als onderdeel van MS-F8-01.
Kan onafhankelijk werk doorgaan? Ja.

## Afweging 3 (MS-F8-04): perimenopauze/menopauze CONTEXT_ONLY -- architectuur goedgekeurd, UI-implementatie uitgesteld
Waarom nodig: evidence (WHEN 2026/ACSM) rechtvaardigt een context-only aanpak analoog aan Cycle/Symptoms, maar de UI vereist een apart, niet-"Cyclus"-gelabeld scherm dat zorgvuldig eigen ontwerpwerk verdient.
Opties overwogen: (a) UI nu overhaast bouwen binnen deze audit-sprint, (b) architectuur goedkeuren en de UI-implementatie als aparte, toekomstige sprint documenteren.
Impact: optie (b) voorkomt een haastige, onvoldoende doordachte UI-toevoeging aan een gevoelig domein.
Aanbevolen, reversibele default: optie (b). Dit vereist GEEN Product Owner-beslissing meer over WELKE aanpak (context-only is al vastgesteld) -- uitsluitend een toekomstige planningsbeslissing over WANNEER de UI gebouwd wordt. Dit is dus EVIDENCE/SAFETY-onderbouwd, geen onopgeloste productkeuze.
Kan onafhankelijk werk doorgaan? Ja.

## Afweging 4 (MS-F8-04): zwangerschap/postpartum/bekkenbodem blijven DEFER
Waarom nodig: voor alle drie geldt hetzelfde onderliggende risico -- zelfs voorzichtig geframede context loopt reëel risico op impliciete geruststelling/klaring zonder dat Trainingskompas enige contra-indicatie kan detecteren.
Dit is een EVIDENCE/SAFETY DEFER, geen onopgeloste Product Owner-vraag: er is geen productkeuze die dit zou veranderen zonder een fundamenteel andere, zwaarder-gereguleerde medische capability te bouwen (expliciet buiten scope van een softwareontwikkelsprint).
Wat zou nodig zijn om dit te heroverwegen: een aparte sprint met expliciete, gespecialiseerde medisch-inhoudelijke review (niet alleen literatuuronderzoek door een software-ontwikkelaar), en een concreet productvoorstel voor hoe contra-indicaties/rode vlaggen verantwoord afgehandeld zouden worden.
Kan onafhankelijk werk doorgaan? Ja -- dit blokkeert niets in de rest van F8.
