# Sprintrapport — v3.3.53 · Premium Set Experience (setinvoer)

**Datum:** 3 augustus 2026
**Doel:** Maak van het uitvoeren van een set de meest premium ervaring in de app. Van "een formulier waarin ik gewicht en reps invul" naar een interactieve coachflow: vorige prestatie → huidige set → feedback → volgende stap. Succescriterium: "Ik hoef niet meer na te denken — de app begeleidt mij."
**Kader:** Geen nieuwe architectuur, database of frameworks; bestaande trainingslogica niet breken. Verbeter bestaande componenten.

---

## Aanpak (dataverlies-eerst)
De setinvoer is de meest dataverlies-gevoelige schrijf-actie. Daarom: de logging-engine blijft ongemoeid en de premium beleving komt uit een herontworpen **layout** + **additieve bediening**. Alle element-id's en handlers zijn identiek gehouden (`s-…-kg/-reps/-rpe`, `sc-…`, `logSet`, `toggleSetDone`, gewicht-modus, warmup, autosave, offline-draft) — zie DEC-035.

## Uitgevoerde werkzaamheden (per deel)

- **Deel 1/2 — Set-scherm & bediening.** `buildWorkSetRow` herontworpen tot een 2-regelige premium setkaart: kop met groot afvink-element ("Set 1", tik → ✓) + rust/meer-knoppen; een volledige gewicht-regel `[−] 82,5 [+]`; en een reps+RPE-regel `[−] 8 [+]` met de bestaande RPE-stepper. Grote, leesbare cijfers (19px) en 46px tikvlakken. Nieuwe additieve functie `stepField(id,delta)` past het bestaande veld aan en vuurt exact dezelfde `input`/`change`-handlers (clamp, `logSet`, `copyToSets`, warmup, recompute) — geen nieuwe logica.
- **Deel 3 — RPE-feedback.** Na een set: "Hoe zwaar was deze set? RPE 7 · Sterke marge. Volgende set kun je verhogen naar 82,5 kg." (RPE 8 → "Perfect niveau. Behoud …"; RPE 9 → "Zware set. Herhaal … en focus op techniek."), uit de bestaande `computeProgression`.
- **Deel 4 — Duidelijke acties.** De actieknop heet nu "Gebruik 82,5 kg volgende set" i.p.v. "Toepassen".
- **Deel 5 — Rusttimer.** De premium rustbalk toont naast voortgangsbalk + aftelling nu ook "VOLGENDE · Set 2 klaar om te starten" (uit de bestaande `openRestTimer(exId,setNum)`).
- **Deel 6/7 — AI coach.** De afsluitende terugblik-prompt is persoonlijker en dynamischer: spreekt de sporter direct aan, verbindt PR/volume/RPE aan betekenis en sluit af met één concrete focus. Zelfde call/model.
- **Deel 8 — Design/toegankelijkheid.** Dezelfde premium identiteit als de Home; tikvlakken ≥44px; contrast en spacing in licht én dark gecontroleerd.

## Aangepaste schermen / componenten
- **Trainingsscherm** (`s-train-*`): `buildWorkSetRow` (setkaart), `stepField` (nieuw, additief), CSS `.setr*`/`.set-step`.
- **Rusttimer** (`#rest-timer-bar`): "volgende set"-label + bestaande voortgangsbalk.
- **Post-set coachkaart** (`showPostSetAdvice`): coachcopy + actieknoptekst.
- **AI-terugblik** (`generateSessionSummaryAI`): persoonlijkere prompt.

## Behouden / ongewijzigd (geen dataverlies-risico)
`logSet`, `toggleSetDone`, PR-detectie, `getEffectiveKg`, gewicht-modi (vast/+kg/%/topset/backoff), warmup-generatie, offline-draft/autosave, en alle element-id's. De afvink-cirkel is gepromoveerd tot groot element met ✓ (via CSS op `.setr-circle.done`) — dezelfde `.done`-class die ook de offline-restore zet, dus de check verschijnt ook bij hervatten.

## Testresultaten
- `node --check`: **OK** · `logic_tests.js`: **141/141** · headless render van de **échte** `buildWorkSetRow` in licht én dark: **0 code-fouten**.
- Interactie bevestigd: `stepField('…-kg',2.5)` 80 → **82,5**; `toggleSetDone` markeert de set als voltooid (✓).
- **Belangrijke caveat:** de cloud-omgeving kan de live app niet met echte data draaien. Bestaande trainingen / PR-registratie / RPE-logica / offline-PWA zijn qua code ongewijzigd, maar een **toestel-validatie van de volledige gym-flow** (supersets, gewicht-modi %/topset/backoff, offline-restore) wordt aanbevolen vóór zwaar gebruik.

## Screenshots
`docs/06_Screenshots/`: `v3.3.53_set_light.png`, `v3.3.53_set_dark.png` (setkaart), `v3.3.53_rpe_feedback.png` (RPE-coachkaart), `v3.3.53_resttimer.png` (rustbalk met "volgende set"). Training-afronding: zie v3.3.52 (ongewijzigd, met persoonlijkere AI-tekst).

## Bekende verbeterpunten
- Toestel-validatie volledige flow; optioneel per-set live "gelijk aan vorige sessie"-feedback; RPE eventueel als grote keuze-chips (mits passend binnen het design system).

## GitHub / Definition of Done — eerlijke status
Cloud-omgeving heeft **alleen leestoegang**; ik kan niet pushen. Alles staat lokaal klaar en is geverifieerd. **Product Owner-stap:** upload `index.html` (voor live volstaat dat; `sw.js` optioneel).

## Versie
**v3.3.53**
