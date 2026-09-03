# Trainingskompas Canonical Visual UX Baseline v1

**STATUS: PRODUCT OWNER APPROVED — CANONICAL VISUAL BASELINE** (3 september 2026)

Deze map bevat de door de Product Owner goedgekeurde visuele mockups van de zes primaire schermen van de nieuwe Trainingskompas-navigatie (Vandaag | Trainen | Inzicht | Coach | Samen + Profiel). Dit zijn de originele, aangeleverde image-bytes — niet opnieuw gegenereerd, gescreenshot, geconverteerd, gecomprimeerd, gecropt, geresized, of qua kleur/tekst aangepast.

## Canonical screens

| Screen | Version | File | Status |
|---|---|---|---|
| Vandaag | v0.11 | `vandaag-v0.11.png` | APPROVED |
| Trainen | v0.2 | `trainen-v0.2.png` | APPROVED |
| Inzicht | v0.1 | `inzicht-v0.1.png` | APPROVED |
| Coach | v0.2 | `coach-v0.2.png` | APPROVED |
| Samen | v0.1 | `samen-v0.1.png` | APPROVED |
| Profiel | v0.1 | `profiel-v0.1.png` | APPROVED |

## SHA-256 hashes (integriteitscontrole — deze mogen nooit stilzwijgend veranderen)

```
dce35fd2eb97f8666c52d47fcf31dfafda6a2833d05d5cf8644fe44c8c02f584  vandaag-v0.11.png
e9602c6e3527efbfa3bd9ecbaea8f5199a2d261cbc15bcfa0bd707682a70cf1a  trainen-v0.2.png
7c1ed35fdc2b8d0fadbfe0ea88ca5a388d2c7a532cfa96667396e7c8a424bf8a  inzicht-v0.1.png
ee209edcdd0ae3ece0fc24b64ac90bc784576ee5d26e4f1dc78eb329a0defca5  coach-v0.2.png
cc4479b912b059c1c3f7749f758649fe432c4271a4aafe1e419de30fe0453ffb  samen-v0.1.png
adeca214e5dc3644ea0e98ad7d3346105361d8aa5449ae3b6997f56e4e343ad4  profiel-v0.1.png
```

## Image dimensions (geldige PNG, RGB, non-interlaced)

| File | Dimensions |
|---|---|
| vandaag-v0.11.png | 853 × 1843 |
| trainen-v0.2.png | 852 × 1846 |
| inzicht-v0.1.png | 853 × 1844 |
| coach-v0.2.png | 853 × 1844 |
| samen-v0.1.png | 853 × 1844 |
| profiel-v0.1.png | 853 × 1844 |

## Rejected image handling

Naast de zes goedgekeurde mockups is een **zevende, alternatief Coach-ontwerp met een grote robotmascotte** aangeleverd (bestandsnaam bij aanlevering: `05d72d94-954c-49e4-8ab6-a1861ea9642d-1_all_62009.png`). Deze afbeelding is **REJECTED / DEPRECATED** en is:

- **NIET opgenomen** in deze map of ergens anders in de repository;
- **NIET gehasht/gearchiveerd** — er bestaat bewust geen permanent spoor van in de repo;
- **NIET gebruikt** als AI Coach-identiteit of visual reference.

De canonieke Coach-baseline is uitsluitend `coach-v0.2.png` — het abstracte sparkle/star-symbool, GEEN robotmascotte, GEEN menselijke avatar voor AI.

## Source-of-truth hierarchy

**Voor visuele compositie en visuele hiërarchie:**
1. Canonical Visual UX Baseline (dit document/deze PNG's)
2. `docs/TRAININGSKOMPAS_DESIGN_SYSTEM_V1.md`
3. bestaande runtime

**Voor functionaliteit, data, business rules en gedrag:**
1. Product Architecture (`docs/TRAININGSKOMPAS_PRODUCT_ARCHITECTURE.md`, `docs/target-product-architecture`-branch)
2. Calculation / Context / Decision / Evidence-architectuur
3. Capability Registry / canonieke specificaties
4. UX baseline

**VISUAL MOCKUP != FUNCTIONAL SPECIFICATION.** **MOCKUP OMISSION != FUNCTIONALITY REMOVAL.** Een functie die niet zichtbaar is in een mockup mag nooit automatisch worden verwijderd.

## Implementation contract (verplicht bij toekomstige implementatie)

Bij implementatie van één van deze zes schermen MOET de implementer, in deze volgorde:
1. de bijbehorende canonical PNG daadwerkelijk bekijken;
2. `docs/TRAININGSKOMPAS_DESIGN_SYSTEM_V1.md` raadplegen;
3. de relevante Product Architecture raadplegen;
4. bestaande runtime-functionaliteit inventariseren;
5. `docs/UX_BASELINE_PRESERVATION_MATRIX.md` raadplegen;
6. pas daarna implementeren.

Reconstructie uitsluitend op basis van een tekstuele omschrijving is niet toegestaan.

## Conflict rules

**PNG vs. Design System:** behoud de compositie/intentie van de approved PNG; gebruik Design System-tokens/componenten voor technische normalisatie; verander geen belangrijke UX-compositie zonder Product Owner-review.

**PNG vs. Product Architecture:** Product Architecture bepaalt functionaliteit en gedrag; PNG bepaalt visuele presentatie; ontbrekende functionaliteit wordt logisch geïntegreerd zonder een bestaande capability stilzwijgend te verwijderen; een belangrijke visuele afwijking vereist PO-review.

**Bij echte ambiguïteit:** niet zelf een grote UX-beslissing verzinnen — markeer **PO REVIEW REQUIRED**.

## Navigation contract

Canonieke bottom navigation: **Vandaag | Trainen | Inzicht | Coach | Samen**. Profiel is GEEN zesde bottom-navigation-tab — geopend via de avatar rechtsboven. De bottom-navigatie die zichtbaar is onderaan de Profiel-mockup blijft de normale vijf-tab-navigatie (Profiel zelf voegt geen zesde tab toe).

## AI Coach contract

**APPROVED:** abstract sparkle/star AI-identiteit, teal/navy Trainingskompas visual language, expliciet label "AI Coach", duidelijke scheiding AI Coach / Mijn coach.

**REJECTED:** robotmascotte, grote cartoonrobot, menselijke avatar voor AI, AI presenteren alsof het een menselijke coach is. De robot-Coach is geen alternatief ontwerp — hij is DEPRECATED/REJECTED en niet in deze repository opgenomen.

## Avatar note

De persoon/foto in de mockups is **visuele placeholder-content** — niet hardcoden als echte gebruiker. Canonieke implementatie gebruikt de toekomstige, gedeelde avatarcomponent (uploaded image, fallback initials, generic fallback, replace/remove — zie Design System v1 §14). De afbeelding bepaalt alleen layout, grootte, positie en presentatie van de avatar.

## Mock data warning

Alle waarden in de mockups (78% herstel, 62 ms HRV, 48 bpm, Training A, 19:00, Mark de Vries, HYROX Amsterdam, Maurice Gym, etc.) zijn **voorbeelddata** en mogen NOOIT als business rules of productiegegevens worden hardcoded. Runtime-data komt uitsluitend uit de bestaande canonieke keten: RAW DATA → Calculation → Context → Decision → Evidence/Data Quality/Confidence → AI Coach → UX. AI mag geen ontbrekende waarden verzinnen.
