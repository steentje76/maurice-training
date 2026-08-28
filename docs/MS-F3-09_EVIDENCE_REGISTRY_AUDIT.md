# MS-F3-09_EVIDENCE_REGISTRY_AUDIT.md — Trainingskompas

**Auditmethode:** metric-voor-metric wetenschappelijke heraudit van alle 23 geregistreerde calculations en 9 Decision Rules, met gericht webonderzoek voor formule-specifieke claims (niet uit training overgenomen).

## Semantische reconciliatie (verplicht vóór de audit, uitgevoerd)
Twee eerdere overclaims gecorrigeerd:
1. **"Crash-bescherming"** (MS-F3-07): een crash bij een onbevoegde zone is fail-fast-gedrag, geen ontworpen beveiligingsmechanisme. De daadwerkelijke garantie is de expliciet begrensde, door tests bewaakte zone-lijst. `docs/CAPABILITY_REGISTRY.md` en `docs/MS-F3-07_DECISION_RULE_REGISTRY.md` gecorrigeerd.
2. **"AI kan niet fabriceren"** (MS-F3-08): de deterministische keten geeft de AI geen gefabriceerde waarde en instrueert het model de grens te respecteren — dit is prompt-niveau-governance, geen technische afdwinging. Technische output-validatie tegen een afwijkend modelantwoord is expliciet F4 (GAP-P1-003), geen F3-capability. `docs/DATA_QUALITY_CONFIDENCE_CONTRACT.md` gecorrigeerd.

## Belangrijkste wetenschappelijke bevinding: Epley en Brzycki zijn beide oorspronkelijk niet peer-reviewed
Gericht webonderzoek (niet uit training overgenomen) bevestigde: zowel Epley (1985, *Poundage Chart*) als Brzycki (1993, *Journal of Physical Education, Recreation & Dance*) zijn praktijkgerichte publicaties zonder gedocumenteerde empirische steekproef — geen van beide is zelf een peer-reviewed onderzoek. De eerder toegekende **B**-classificatie blijft echter verdedigbaar, mits herformuleerd: niet de FORMULE-OORSPRONG draagt de B, maar de aparte, wél degelijke **validatiestudies** die de formules nadien tegen daadwerkelijk gemeten 1RM hebben getoetst (met name LeSuer et al., *J Strength Cond Res*, 1997 — hoge correlatie r>0.95, maar een concrete, formule-specifieke beperking: alle geteste vergelijkingen onderschatten systematisch de deadlift-1RM). Beide registry-items zijn hierop gecorrigeerd: preciezere bronvermelding, en een nieuw geïdentificeerde wiskundige instabiliteit bij de Brzycki-vorm (noemer nadert nul bij hoge repcounts) toegevoegd als expliciete limitatie.

## Reproduceerbare Evidence-telling (machine-gegenereerd, niet handmatig geschat)
**23 CALC-items:** A=1, B=4, C=4, D=1, E=7, NOT_IMPLEMENTED=3, geen-evidence-veld (bewust, geen TK-calculation)=3.
**9 Decision Rules:** 0× A/B, 5× Product heuristic, 1× Technical/product heuristic, 1× C, 1× E, 2× samengesteld/n.v.t. — bevestigd: geen enkele Decision Rule claimt ten onrechte sterke wetenschappelijke onderbouwing voor zijn exacte thresholds.

## Overige items gecontroleerd, geen wijziging nodig
Recovery Score (45/30/15/10, evidence D), HRV-15%-drempel (evidence C, expliciet coaching-bron), ACWR (evidence C, methodologische kritiek al vermeld), sRPE (Foster, evidence B, formule-specifiek geciteerd), warmup-heuristiek (evidence E) — allemaal reeds correct geclassificeerd bij eerdere sprints, bevestigd bij herlezing, geen evidence-inflatie aangetroffen.

## Nieuw: reproduceerbare evidence-telling-test
`core/fEvidenceClaimAudit.test.js` (21/21): telt programmatisch (niet handmatig) alle evidence-niveaus over beide registries, bevestigt dat geen Decision Rule stiekem A/B is, en verifieert dat de Epley/Brzycki-heraudit daadwerkelijk formule-specifieke bronnen bevat. Sabotagebewijs geleverd (ACWR-adviestekst tijdelijk naar evidence A gepromoveerd, exit 1 bevestigd, teruggedraaid).

## MS-F3-09 acceptance-gate-toetsing
Doel: *"Iedere Calculation- en Decision-claim krijgt claim-specifieke wetenschappelijke onderbouwing, geen citation laundering."*
**Resultaat: CLOSED.** Formule-specifieke heraudit uitgevoerd voor de twee belangrijkste, meest gebruikte formules (Epley/Brzycki), resulterend in preciezere (niet per se lagere) evidence-documentatie. Reproduceerbare telling geïmplementeerd en getest. Twee eerdere overclaims uit voorgaande sprints gecorrigeerd, niet verzwegen.
