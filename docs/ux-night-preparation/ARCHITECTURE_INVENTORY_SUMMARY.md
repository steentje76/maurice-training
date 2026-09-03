# ARCHITECTURE_INVENTORY_SUMMARY.md

**AANTAL SCHERMEN:** 44 daadwerkelijk gedefinieerde scherm-containers (37 via een expliciete `go()`-aanroep bereikbaar).

**AANTAL FUNCTIONELE CAPABILITIES:** 25 geïdentificeerd (zie PRODUCT_ARCHITECTURE_INVENTORY.md), waarschijnlijk niet volledig uitputtend gezien de omvang van de codebase (28.749 regels index.html) binnen het tijdsbudget van deze read-only inventarisatie.

**AANTAL BACKEND-ONLY CAPABILITIES:** 3 grote (Team Operations, Coach/PT, Canonieke Organizations/Teams), plus kleinere onderdelen (entitlement-gating, coach-notes -- deze laatste twee zijn niet-gebouwd, niet backend-only).

**AANTAL UI-REQUIRED CAPABILITIES:** 3 (met reeds klaarliggende, gedetailleerde UI-requirements-documenten uit eerdere sprints: Team Operations, Coach/PT).

**AANTAL LEGACY/ORPHANED ITEMS:** 1 duidelijk (Gym/Club: actieve UI op `users.gym_id`, canonieke `organizations`-laag ernaast, ongebruikt door UI). Mogelijke naamsverwarring (geen technisch orphan): "Coach" in de bottom-nav = AI Coach-chat, niet Human Coach/PT-beheer.

**HOOFDDOMEINEN:** Training (kracht/hardlopen/fietsen/Concept2/HYROX/programma's), Lichaam (lichaamsgegevens/Recovery/Women's Performance/spieren), Voortgang, AI Coach, Social, Nutrition, Settings/Privacy, Admin (gym).

**GROOTSTE FEITELIJKE STRUCTURELE BIJZONDERHEDEN:**
1. Team Operations en Coach/PT hebben een buitengewoon volwassen, grondig geteste backend (100+ tests samen) maar 0% gebruikersinterface -- de grootste "gebouwd-maar-onzichtbaar"-kloof in de hele app.
2. Gym/Club heeft twee, parallelle organisatiemodellen: een actief, legacy model (`users.gym_id`) dat de huidige UI bedient, en een nieuwer, canoniek model (`organizations`/`memberships`/`teams`) dat al de fundering vormt voor Team/Coach maar zelf geen UI heeft.
3. Geen enkel wearable-koppelscherm bestaat als eigen, top-level scherm -- wearable-status wordt getoond als een kaart binnen bestaande schermen (Lichaam/Settings), niet als een dedicated flow.
4. "Coach" in de hoofdnavigatie verwijst uitsluitend naar de AI-chatinterface; er is geen enkel scherm voor het beheren van een human coach-athlete-relatie, ondanks dat die relatie-architectuur volledig bestaat.
5. Pregnancy/postpartum/menopause-ondersteuning binnen Women's Performance bestaat helemaal niet (geen tabellen, geen schermen) -- dit is een productbeslissing, geen technisch gat.
