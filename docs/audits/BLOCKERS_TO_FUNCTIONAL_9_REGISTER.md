# Blockers to Functional >=9 Register

| ID | Domain | Capability | Current maturity | Exact gap | Why <9 | PO decision required? | External blocker? | Safe software fix? | Priority |
|---|---|---|---|---|---|---|---|---|---|
| B01 | Samen | Centraal overzichtsscherm | geen scherm | `s-samen` bestaat niet | UI-laag 0, ondanks werkende backend voor connections/groups/challenges | ja -- scherm-architectuur | nee | nee (nieuw scherm) | P1 |
| B02 | Samen | Messaging | geen tabel/UI | volledige capability ontbreekt op databaseniveau | A=0, B=0, C=0 | ja -- scope/ontwerp | nee | nee | P1 |
| B03 | Human Coach | Relatie-model integratie | code bestaat (coachAccess/coachRoster.js), 0 integratie | geen enkele aanroep vanuit index.html, geen tests | IMPLEMENTED maar NOT INTEGRATED, NOT TESTED | ja -- volledige Coach v0.2 UX | nee | gedeeltelijk: tests toevoegen aan bestaande, ongeteste modules is safe; UI-integratie is dat niet | P1 |
| B04 | Nutrition | Productdatabase/barcode | geen schema | geen enkele tabel bestaat | A=0 | ja -- scope-besluit (bouwen vs. externe API) | mogelijk (externe voedingsdata-bron) | nee | P1 |
| B05 | Nutrition | Data population (macro-logger) | werkend, 0 rijen | nooit echt gebruikt | B=0 ondanks A=6 | nee (technisch) | nee | ja -- geen fix nodig, wel test toevoegen | P2 |
| B06 | Periodisering | Seasons/macro/meso/microcycles | schema only, 0 code-integratie | geen enkele CRUD/UI-aanroep gevonden, geen apart core-bestand | A=2, puur architectuur | ja -- is dit model nog actueel of vervangen door program_blocks (dat wel actief is)? | nee | nee (architectuurkeuze) | P2 |
| B07 | Commercial | Echte betaalstroom-validatie | architectuur compleet, 0 transacties | billing_events/user_credit_purchases: 0 rijen | B=0, C=0 | ja (prijzen blijven altijd PO) | mogelijk (payment-provider) | nee | P2 |
| B08 | Devices | Generieke external_connections-laag | 1 wearable-koppeling, generieke laag leeg | Concept2/overige providers niet bevestigd geintegreerd | onbekend zonder verdere code-audit | nee (technisch) | ja (echte provider-accounts nodig) | onbekend zonder audit | P2 |
| B09 | Team/Gym/Club canoniek (MS-F11) | Locations/team_events | schema only, 0 rijen | geen enkele UI-aanroep bevestigd | A onbekend (niet volledig geverifieerd), B=0 | ja | nee | nee | P3 |
| B10 | Touch target / focus-visible | Design drift gates | niet gebouwd | geen bestaande test dekt dit | ontbrekend test-contract, geen productblocker op zich | nee (technisch) | nee | ja -- veilige, technische testtoevoeging | P2 |

**P0:** geen gevonden in deze of vorige sessie.
