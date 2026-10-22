# TK-REL-SEC-06 — Voeding: geen succes-UI zonder duurzame mutatie

**Datum:** 19 oktober 2026  
**Status:** Draft, gestapeld op TK-REL-SEC-05 / PR #557, niet main.

## Gevonden defect

Diverse voedingsschermen riepen `sbPatchQ` of `sbDelQ` aan, maar **negeerden de geretourneerde boolean**. Na de geaccepteerde afhandeling van een mislukte offlinequeue kon de UI daarom nog steeds `Verwijderd` of `Wijzigingen opgeslagen` melden, navigeren of het formulier leegmaken, hoewel server en IndexedDB niet bevestigden dat de wijziging bewaard was.

## Gericht herstel

- `voedingRemoveMealItemConfirmed`: alleen `Verwijderd` melden bij `sbDelQ === true`, anders foutmelding.
- `voedingSaveItemEdit`: bij `sbPatchQ === false` fout tonen, invoer behouden, op huidig scherm blijven en busy-state herstellen.
- `voedingDeleteMealConfirmed`: alleen de ouder verwijderen wanneer de kindverwijdering succesvol is geaccepteerd; bij elke falende stap gebruiker informeren en niet navigeren.
- `voedingDeleteSupplementLog`: bij `false` fout tonen en niet alsof de verwijdering is geslaagd de historie verversen.
- Succesvolle offlinequeues blijven door de gedeelde schrijffunctie als geaccepteerd behandeld, maar zijn daarmee **niet servergeverifieerd**.

## Bewijs

`core/fNutritionWriteUiGate.test.js` voert de echte productiehandlers in een geïsoleerde VM uit en controleert twee scenario's (duurzame mutatie geweigerd/geaccepteerd) voor vier workflows: **20/20 checks GREEN**. Vóór de fix faalde meteen het scenario waarin het verwijderen van een maaltijditem `false` opleverde maar de UI `Verwijderd` meldde.

## Restpunten

- Dit is géén complete caller-by-caller audit van alle 50+ PATCH/DELETE/RPC-aanroepen.
- Server-read-after-write, accountwissel tijdens lange import, ownerless items, multi-tab replay en on-idempotente activities/laps staan nog open.
- Een succesvolle queue-commit bewijst alleen lokale bewaring, geen Supabase-write.
- Geen Android-toestel, geen productie/RLS-migratie, geen signingbesluit D1–D4.
- NO MERGE / NO DEPLOY / NO (HER)INSTALLATIE zonder aparte heracceptatie.
