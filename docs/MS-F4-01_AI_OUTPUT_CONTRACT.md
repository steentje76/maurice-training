# MS-F4-01_AI_OUTPUT_CONTRACT.md — Trainingskompas

**Auditmethode:** repo-brede zoekactie naar alle AI/LLM-aanroeppaden, lezing van elk van de 6 gevonden prompts, en een gerichte Shadow Decision Audit.

## Baseline audit
Zie docs/AI_CALL_PATH_INVENTORY.md. Kernbevinding: klein oppervlak (2 bestanden, 6 aanroeppunten), netlify/functions/coach.js gaf de ruwe Anthropic-respons ongevalideerd door -- dit is het gat dat deze sprint dicht.

## Shadow Decision Audit -- resultaat
Geen enkele van de 6 prompts bevat verborgen, dubbele Decision-logica. Twee bestaande, substantiële veiligheidslagen bevestigd (niet opnieuw gebouwd, want al aanwezig):
1. parseProgrammaJSON() -- canonieke exercise-ID-whitelist voor AI-gegenereerde programma's, met verplichte preview + expliciete opslaanProgramma()-bevestigingsknop vóór opslag. Dit voldoet al aan de opdrachtvereisten sectie 44 en 49-50.
2. CalcCore.validateProposedWeight() (ai_guard.v1) -- deterministische plausibiliteitscheck (type, positiviteit, 120%-e1RM-plafond) op elk AI-voorgesteld gewicht vóór het via een [[APPLY:...]]-marker toegepast kan worden; ook bij goedkeuring vult dit alleen een bewerkbaar veld voor, de gebruiker voltooit de set zelf. Dateert al van F1.3.

## Wat deze sprint nieuw bouwde
core/aiOutputContract.js: een pure, deterministische semantische validator voor de PROZA-tekst van de coach -- het onderdeel dat nog geheel ongevalideerd was. Categorieën: diagnose-taal, HRV-als-diagnose, ACWR-als-blessurevoorspeller, verplichte-rustdag-medische-taal, prompt-injectie-signalen. Bij afwijzing: canonieke, veilige fallbacktekst.

Gekoppeld aan de 3 vrije-tekst-call sites (chat, post-workout-terugblik, herstel-uitleg). Tijdens het koppelen werd een aanvullend, echt lek gevonden en gefixed: de chatgeschiedenis (in-memory + DB) sloeg altijd de ruwe respons op, ook bij afwijzing.

## Eerlijke maturity-beoordeling (geen status-inflatie)
De opdracht schetst conceptueel een volledig, gestructureerd JSON-outputcontract met schema-validatie, semantische validatie tegen canonieke referenties, en een uitgebreide 26-categorie testmatrix. Wat feitelijk is gebouwd, is een patroon-gebaseerde (regex) validator op vrije prozatekst -- dit dekt de belangrijkste, aantoonbaar reële risico's (medische/diagnostische taal) die het huidige, kleine AI-oppervlak daadwerkelijk kent, maar dekt NIET:
- Generieke detectie van een willekeurig, niet-gedekt getal dat een nieuwe prescriptie lijkt te zijn in vrije tekst buiten de reeds bestaande APPLY-marker-mechanek.
- Volledige schema-/referentie-validatie tegen canonieke Calculation/Decision-ID's (sectie 18) -- dit vereist een structured-output-contract dat de huidige, bewust-vrije-coachtaal-architectuur niet gebruikt.
- Provenance-taalvalidatie (sectie 39) -- vereist runtime-context die de tekstvalidator zelf niet heeft.

Conclusie: AI-OUTPUT-CONTRACT-001 is TESTED, niet CLOSED. De belangrijkste, aantoonbaar bestaande risico's zijn technisch afgedwongen en getest (inclusief sabotagebewijs), maar de volledige, opdracht-geschetste contractarchitectuur (structured JSON-output met referentie-validatie) is niet gebouwd -- dat zou een architectuurverandering van de coach-interactie zijn die niet door de huidige, kleine risico-omvang wordt gerechtvaardigd, en die de opdracht zelf ook relativeert ("ontwerp op actuele productbehoefte, geen onnodig complexe schema's" -- sectie 14).

## Bypass-audit
Alle 6 plekken die ruwe AI-tekst uitlezen opnieuw geïnventariseerd: de 2 JSON-programmapaden zijn al schema-gevalideerd, de 3 vrije-tekst-paden zijn nu gekoppeld aan de validator, het intake-extractiepad (laag risico) blijft ongewijzigd -- geen kritieke bypass gevonden voor de geïdentificeerde risicocategorieën.

## Tests
core/fAiOutputContract.test.js (17/17): output-testmatrix-subset, de exacte adversarial-zinnen uit de opdracht, wiring-bevestiging, en de chatgeschiedenis-lek-fix. Sabotagebewijs geleverd (validator tijdelijk altijd valid, 6 kritieke checks faalden zoals verwacht, teruggedraaid).

## MS-F4-01 acceptance-gate-toetsing
Letterlijke acceptance gate: "Schema/contract tests; no invented values/diagnosis language."
Resultaat: TESTED (niet CLOSED). "No invented diagnosis language" is aantoonbaar technisch afgedwongen en getest. "Schema/contract tests" in de volle, structured-JSON-zin van de opdracht is niet gebouwd -- de bestaande schema-validatie voor programmagenerering dekt dat specifieke pad al, maar er is geen nieuw, algemeen JSON-outputschema voor de coach-chat zelf. Eerlijk vastgelegd als openstaand vervolgwerk, geen kunstmatige CLOSED-claim.
