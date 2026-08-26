# DECISION REQUIRED — Bekkenbodem-context

**Status:** wacht op productbeslissing door Maurice. Niet gebouwd, geen code geschreven.
**Bron:** Trainingskompas_Womens_Performance_Blueprint_v1.0, gap-matrix-item 12
("Pelvic-floor context").

## VRAAG
Moet Trainingskompas een optionele "bekkenbodem-comfort"-context krijgen — bijvoorbeeld
het kunnen markeren van bepaalde oefeningen als te vermijden vanuit bekkenbodem-
overwegingen? Dit onderwerp zit tussen twee categorieën in: het is deels een zuiver
fitness-/comfortvraagstuk (net als "ik wil geen overhead-oefeningen vandaag"), maar
bekkenbodemklachten zijn ook een erkend medisch onderwerp (bekkenbodemdisfunctie,
verzakking), en het CLASSIFICEREN van specifieke oefeningen als "bekkenbodemveilig"
vereist fysiotherapeutische expertise die ik niet zelfstandig mag claimen of verzinnen.

## OPTIE A — Niet bouwen
Geen bekkenbodem-specifieke functionaliteit.

**Voordelen:** geen risico op het ten onrechte suggereren van medische validatie voor
een door mij verzonnen oefeningclassificatie.
**Nadelen:** een reële gebruikersgroep krijgt geen ondersteuning op dit vlak.

## OPTIE B — Generiek "oefeningen vermijden"-mechanisme, geen bekkenbodem-specifieke labels
Hergebruik het al bestaande, generieke vermijdingsmechanisme (`training_context`,
dezelfde infrastructuur die ook voor de zwangerschapscontext is voorgesteld in
`DECISION_REQUIRED_zwangerschap.md`, optie C). De gebruiker kan zelf, per oefening,
aangeven dat zij die wil vermijden — zonder dat Trainingskompas zelf een oordeel geeft
over WELKE oefeningen "bekkenbodemveilig" zijn.

**Voordelen:** geen door mij verzonnen medische classificatie; benut bestaande,
al gebouwde infrastructuur; consistent met de aanpak voor zwangerschap.
**Nadelen:** vereist dat de gebruiker zelf weet welke oefeningen zij wil vermijden
(geen ingebouwde begeleiding) — vermindert de directe waarde van de feature, maar
dat is bewust: begeleiding hierin zou een medische claim zijn.

## OPTIE C — Oefeningclassificatie op basis van een externe, erkende bron
Alleen indien Maurice een concrete, betrouwbare, erkende bron aandraagt (bijvoorbeeld
een fysiotherapeutisch geverifieerde lijst) zouden specifieke oefeningen gelabeld
kunnen worden. Dit vereist expliciete input van Maurice — ik kan en mag dit niet
zelf samenstellen of "aannemelijk" invullen.

**Voordelen:** directe, praktische waarde voor de gebruiker.
**Nadelen:** vereist een externe, geverifieerde bron; zonder die bron niet
verantwoord uitvoerbaar.

## AANBEVELING
Optie B als enige zelfstandig verantwoorde stap — en uitsluitend als Maurice dit
onderwerp daadwerkelijk relevant vindt voor Trainingskompas. Optie C uitsluitend
met een door Maurice aangeleverde, erkende bron.

## IMPACT OP ARCHITECTUUR
Optie B vereist geen nieuwe tabel — hergebruikt de bestaande, generieke
vermijdingsinfrastructuur. Geen Calculation/Decision Engine-wijziging.

## IMPACT OP PRIVACY
Als "bekkenbodem" als reden/label wordt opgeslagen bij een vermijding, is dat
gevoelige gezondheidscontext — zelfde RLS-patroon als de bestaande cyclustabellen,
verwijderbaar, nooit automatisch gedeeld.

## IMPACT OP UX
Vereist neutrale taal ("oefeningen die je wilt vermijden"), geen suggestie dat
Trainingskompas een medisch oordeel geeft over welke oefeningen geschikt zijn.
