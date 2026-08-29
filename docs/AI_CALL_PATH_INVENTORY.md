# AI_CALL_PATH_INVENTORY.md — Trainingskompas (MS-F4-01)

**Auditmethode:** repo-brede zoekactie (anthropic, claude-, systemPrompt, /.netlify/functions/coach) bevestigt: exact 2 bestanden raken de AI-laag (index.html, netlify/functions/coach.js), en exact 6 client-side aanroeppunten. Klein, volledig overzichtelijk oppervlak.

## Server-side proxy (netlify/functions/coach.js)
Pure doorgeefluik: JWT-verificatie (auth), forward naar api.anthropic.com/v1/messages, veilige observability-logging (nooit prompt/response-inhoud). Kernbevinding: retourneert de ruwe Anthropic-respons ongevalideerd, ongefilterd, direct aan de client -- geen schema-, semantische- of contentvalidatie op serverniveau. Dit is exact het gat dat AI-OUTPUT-CONTRACT-001 moet dichten.

## AI_CALL_PATH_INVENTORY

| ID | Functie | Trigger | Output-verwerking | Validation (bestaand) | User-visible | Decision-sensitive |
|---|---|---|---|---|---|---|
| AI-1 | intakeAiExtract(q,txt) | Onboarding-intake, tekst naar structuur | JSON.parse(m[0]) | Geen expliciete schema-validatie zichtbaar op dit niveau | Nee (intern, vult intake-formulier) | Laag -- vult formuliervelden, gebruiker corrigeert zelf vóór opslaan |
| AI-2/AI-3 | buildWeekPrompt(...) (2 aanroeppunten: nieuw programma / doorlopend programma) | Programma-week genereren | parseProgrammaJSON(d.content[0].text, exercises) | Bestaand, substantieel: canonieke exercise_id-whitelist-check tegen de bibliotheek, verplichte velden, geen kg/weight-veld in het schema | Ja, via expliciete preview + aparte opslaanProgramma()-knop | Hoogst -- genereert trainingsstructuur, maar al met preview+bevestiging (sectie 49-50 al voldaan) |
| AI-4 | Post-workout terugblik | Na afronden training | d.content[0].text direct getoond | Geen content-validatie | Ja, direct | Laag -- puur narratieve duiding van al-berekende cijfers, geen nieuwe prescriptie |
| AI-5 | sendMsg(txt) -- Live Coach chat | Gebruiker chat | renderCoachReply(r) -- parsed [[APPLY:exId:kg]]-markers | Bestaand voor de APPLY-marker: CalcCore.validateProposedWeight() (ai_guard.v1) -- type/positiviteit/plausibiliteitscap (120% e1RM), user moet daarna nog zelf de set voltooien. Geen validatie op de vrije tekst zelf | Ja, direct | Middel -- kan vrije tekst met numerieke claims of ongewenste taal bevatten, buiten de APPLY-marker-mechanik om |
| AI-6 | generateProgAdviesAI(adj) | Uitleg bij een reeds genomen herstel-aanpassing | d.content[0].text direct getoond | Geen content-validatie. Consumeert uitsluitend adj.redenen -- een reeds bestaand Decision-outcome (DEC-RECADJ-001), verzint zelf niets | Ja, direct | Laag -- de aanpassing zelf is al besloten vóór deze AI-call; AI legt alleen uit |

## Shadow Decision Audit (sectie 10)
Alle 6 prompts gelezen. Geen enkele bevat "if HRV < X then...", "if RPE > X...", "reduce training by...", "if ACWR..." of vergelijkbare hardcoded numerieke besliscriteria. Classificatie:
- AI-1, AI-4, AI-6: A/B (presentation/explanation) -- consumeren uitsluitend reeds-berekende of reeds-besloten data.
- AI-2/AI-3: A (presentation/generation-binnen-whitelist) -- kiest oefeningen uit een canonieke bibliotheek, genereert RPE-doelen binnen een prescriptief bereik.
- AI-5: A/B, met een reeds bestaande, apart-gevalideerde numerieke toepassingsmarker (ai_guard.v1).

Geen C/D (dubbele of verborgen Decision Rule) gevonden in de 6 huidige AI-aanroepen.

## Kernbevinding en scope voor MS-F4-01
De belangrijkste, nog open technische lacune is niet een tweede Decision Engine (die bestaat niet), maar het ontbreken van semantische contentvalidatie op de vrije-tekst-onderdelen van AI-4, AI-5 (buiten de APPLY-marker) en AI-6: niets controleert of de gegenereerde tekst verboden medische/diagnostische taal, HRV-als-diagnose-taal, of ACWR-als-blessurevoorspeller-taal bevat -- ook al kan de AI via deze paden geen canonieke data direct wijzigen.
