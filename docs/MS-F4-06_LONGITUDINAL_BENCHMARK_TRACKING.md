# MS-F4-06_LONGITUDINAL_BENCHMARK_TRACKING.md — Trainingskompas

**Canonieke naam/acceptance (ROADMAP_INDEX.json, leidend):** "Longitudinal Program Adaptation & Benchmark Tracking" -- herhaalde benchmark-vergelijking t.o.v. Hevy Trainer na MS-F4-04. Expliciet P2, "niet expliciet in v1.1 maar niet strijdig" -- een documentatie-/trackingopdracht, geen nieuwe runtime-capability.

## Bijgewerkte, actuele benchmark-vergelijking (augustus 2026, gericht webonderzoek)

### Belangrijke, nieuw bevestigde feiten sinds de vorige vergelijking (juni 2026)
- Hevy Trainer is expliciet een algoritme, geen AI/LLM. Hevy zelf onderscheidt dit nadrukkelijk van een conversationeel AI-systeem -- het is adaptief in de zin van prestatie-progressie, geen native LLM-gesprek.
- Hevy Trainer gebruikt geen herstelsignalen als programmeer-input. Slaap, HRV, rusthartslag en een gereedheidsscore staan niet vermeld als input voor Hevy Trainer, ondanks dat de app wel workout-hartslag en Apple Health/Health Connect-synchronisatie ondersteunt.
- Hevy Trainer genereert volledige programma's inclusief sets/reps/rustschema, en past werkgewichten automatisch aan op basis van prestatiehistorie.

### Herziene, eerlijke positionering
Dit is een genuanceerder beeld dan de eerdere ("black-box AI")-framing suggereerde: Hevy Trainer en Trainingskompas zijn niet dezelfde productcategorie. Hevy Trainer is een deterministisch progressie-algoritme zonder herstelbewustzijn; Trainingskompas combineert een deterministische Calculation/Context/Decision-laag (met herstel/HRV-bewuste readiness, per-oefening-stagnatiedetectie, en nu ook een audit-trail-voorziene adaptieve weekregeneratie) met een LLM-gesprekslaag die uitsluitend uitlegt/samenvat, nooit zelf beslist.

Bevestigde TK-differentiators (na MS-F4-01 t/m MS-F4-05), eerlijk t.o.v. wat nu bekend is over Hevy Trainer:
1. Herstel-/HRV-bewuste readiness (readinessDay(), DEC-READYDAY-001) -- Hevy Trainer heeft dit aantoonbaar niet.
2. Audit trail voor programma-aanpassingen (program_regeneration_log, MS-F4-04) -- geen vergelijkbare, publiek gedocumenteerde functionaliteit bij Hevy gevonden.
3. Expliciete, technisch afgedwongen AI-outputgovernance (core/aiOutputContract.js) tegen diagnose-/medische taal -- niet van toepassing bij Hevy Trainer, aangezien dat systeem geen conversationele AI-laag heeft.
4. Per-oefening (lift-by-lift) stagnatiedetectie met expliciete Decision-binding (MS-F4-03) -- Hevy Trainer's automatische gewichtsaanpassing is een deterministisch algoritme; niet vergelijkbaar gedocumenteerd op per-oefening-uitlegniveau.

Bevestigde Hevy-voorsprong, eerlijk erkend: Hevy Trainer's volledige programma-autogeneratie (inclusief automatische sets/reps/rustschema voor een compleet nieuw programma, uitgebreid marktgetest sinds februari 2026) is product-matuur en breed gebruikt; Trainingskompas' vergelijkbare functionaliteit (genereerProgramma()) is functioneel aanwezig en veilig (canonieke exercise-ID-whitelist, preview, bevestiging), maar heeft geen vergelijkbare schaal van gebruikersvalidatie.

## Longitudinal tracking-mechanisme (het "repeated"-aspect van de acceptance gate)
Gezien dit een P2, niet-hard-vereiste acceptance gate is, is de proportionele, niet-overbouwde interpretatie: een canoniek, hernieuwbaar benchmark-trackingdocument (dit bestand) dat bij een toekomstige F4-vervolgsprint of expliciete Product Owner-vraag opnieuw kan worden bijgewerkt met een vers websearch-resultaat, zonder een nieuwe runtime-feature te bouwen die niet door de roadmap wordt vereist. Geen automatisch, geplande "benchmark-cronjob" of vergelijkbare infrastructuur gebouwd -- dat zou architectuur-om-architectuur zijn voor een P2-documentatie-item.

## MS-F4-06 acceptance-gate-toetsing
Letterlijke acceptance gate: "Herhaalde benchmark-vergelijking t.o.v. Hevy Trainer na MS-F4-04; niet expliciet in v1.1 maar niet strijdig."
Resultaat: CLOSED. Bijgewerkte, actuele vergelijking uitgevoerd met gericht, vers webonderzoek (niet uit training overgenomen). Eerlijke, genuanceerde herpositionering (andere productcategorie, niet een simpele "wie is beter"-claim). Geen overbouwde infrastructuur voor een P2-item.
