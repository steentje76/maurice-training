# F13 Post-Audit — P1-02/P1-03 AI Governance Matrix

## Call-site-matrix (alle 6 daadwerkelijke aanroeppunten, index.html)

| Call site | Request type | Client input | Server input | System prompt source | Output validation (vóór fix) | Numeric mutation mogelijk? | Decision mutation mogelijk? |
|---|---|---|---|---|---|---|---|
| Onboarding-intake (regel ~9420) | intake_extract | model, max_tokens, system, messages | JWT (auth) | Client-side samengesteld (`sys`) | Geen (JSON-extractie, geen proza-render) | Nee (geen APPLY-context) | Nee |
| Programmageneratie (regel ~11183) | program_generation | model, max_tokens, system, messages | JWT + entitlement/quota | Client-side samengesteld (`sys`) | `parseProgrammaJSON` (canonieke exercise-ID-validatie, al bestaand) | Nee (schrijft geen sessie-data direct) | Nee |
| Programmageneratie (regel ~11568) | program_generation | idem | idem | idem | idem | Nee | Nee |
| Sessiesamenvatting (regel ~16515) | session_summary | model, max_tokens, system, messages | JWT + entitlement/quota | Client-side samengesteld (`sys`) | **Alleen client-side** `AIOutputContract.validateAiOutputText()` vóór fix | Nee | Nee |
| Coach-chat (regel ~19262) | chat | model, max_tokens, system, messages | JWT + entitlement/quota | Client-side samengesteld (`buildCtx()`) | **Alleen client-side** vóór fix | **Ja — `[[APPLY:exId:kg]]`, met client-side plausibiliteitsgrens (1RM×1.2)** | Nee |
| Coach-uitleg-kort (regel ~20411) | chat | model, max_tokens, system, messages | idem | idem | **Alleen client-side** vóór fix | Ja (zelfde mechanisme) | Nee |

## Kernbevinding P1-02 (bevestigd, code-niveau)

`coach.js` gebruikte `system: payload.system` **rechtstreeks**, zonder enige server-side validatie of aanvulling. Elke `system`-prompt komt volledig van de client (`buildCtx()` in index.html) — inclusief de governance-instructies die daarin staan. Een gemanipuleerde client (aangepaste browser-request, niet de officiële app) kon dus:
1. De governance-instructies uit de system-prompt verwijderen of vervangen.
2. De AIOutputContract-validatie omzeilen door `renderCoachReply()` simpelweg niet aan te roepen — de server retourneerde de rauwe Anthropic-respons ongefilterd.

**Root cause**: output-validatie (`AIOutputContract.validateAiOutputText()`) bestond al, maar draaide uitsluitend **client-side** — een verdedigingslaag die de client zelf kan omzeilen, biedt geen echte bescherming tegen een gemanipuleerde client.

## Kernbevinding P1-03 (bevestigd, code-niveau)

De client-side system-promptopbouw (`buildCtx()`) bevatte de instructie **"Geef altijd een concreet gewicht als advies"** — een expliciete opdracht aan de AI om een numerieke waarde te leveren, ook wanneer er geen door de Calculation/Decision Engine berekende waarde beschikbaar is (dat bestaat alleen in de aparte, reeds goed ontworpen "LIVE COACH-CONTEXT"-blok tijdens een actieve training). Dit is een architectuurschending: AI mag nooit zelfstandig numerieke load berekenen.

De bestaande `[[APPLY:exId:kg]]`-validatie (`CalcCore.validateProposedWeight`) is een **plausibiliteitsgrens** (1RM×1.2, of 500kg-cap zonder bekend 1RM) — niet een verificatie dat het getal daadwerkelijk van een geautoriseerde Calculation/Decision-uitkomst afkomstig is. De AI kan nog altijd een volledig zelfverzonnen, maar plausibel klinkend getal voorstellen.

## Ontwerpbeslissing voor de fix (minimale, veilige aanpak — geen volledige herbouw)

Een volledige herbouw van de system-prompt-architectuur (server bouwt de hele context zelf, inclusief alle HRV/1RM/trainingsgeschiedenis-queries die nu client-side met de gebruikers eigen RLS-context gebeuren) zou een zeer omvangrijke, risicovolle refactor zijn die de kern-coachingervaring zou kunnen breken. In plaats daarvan:

1. **Server-side output-validatie (P1-02, de belangrijkste fix)**: `coach.js` importeert en past `AIOutputContract.validateAiOutputText()` zelf toe op elke Anthropic-respons vóórdat die wordt teruggestuurd naar de client. Bij een schending vervangt de server de tekst met de canonieke `safeCoachFallback()` — dit gebeurt nu **altijd server-side**, ongeacht wat een gemanipuleerde client zou doen met de client-side kopie van dezelfde validator. Dit is de belangrijkste, architectonisch correcte verbetering: governance wordt afgedwongen op de plek die de client niet kan omzeilen.

2. **Prompt-instructie gecorrigeerd (P1-03)**: "Geef altijd een concreet gewicht als advies" wordt vervangen door een instructie die expliciet verbiedt een gewicht te verzinnen wanneer er geen engine-berekende waarde beschikbaar is.

3. **Extra server-side APPLY-validatie (P1-03)**: naast de bestaande client-side plausibiliteitsgrens, valideert de server nu ook `[[APPLY:...]]`-markers in de AI-respons met dezelfde soort strengere check (geïmporteerde `CalcCore`-logica, indien pure/Node-compatibel) — voordat de tekst de client bereikt. Dit is een tweede, servergecontroleerde laag bovenop de al bestaande client-side check.
