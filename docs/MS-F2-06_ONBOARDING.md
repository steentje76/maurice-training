# MS-F2-06_ONBOARDING.md — Trainingskompas

**Auditmethode:** lezing van `initOnboarding`/`obNext`/`obFinish` (klassieke wizard), `intakeStart`/`intakeSwitchToForm` (AI Conversational Intake), en alle `ocore()`-aanroepen (validatie/mapping naar `OnboardingCore`).

## Bevinding: twee onboarding-systemen, bewust geen duplicatie
De AI Conversational Intake (`intakeStart()`, scherm `s-intake`) is de **primaire** onboardingflow. De klassieke stap-wizard (`initOnboarding()`, scherm `s-onboarding`) is een **expliciete terugval**, geactiveerd wanneer `window.OnboardingCore` ontbreekt, óf wanneer de gebruiker zelf kiest voor `intakeSwitchToForm()` (code-commentaar: *"Terugval naar de klassieke wizard (offline/AI onbereikbaar/voorkeur)"*). Dit is geen per-ongeluk-duplicatie zoals bij de MS-F2-01-bevinding — het is een bewust, gedocumenteerd primair+fallback-ontwerp.

## AI-grens (sectie 21-22 van de opdracht): bevestigd correct
Elk AI-geëxtraheerd antwoord loopt via `ocore().validateField()` (per veld) en uiteindelijk `ocore().validateCandidate()` (volledige kandidaat-context) — deterministische validatie in de pure `OnboardingCore`-module, niet door de AI zelf bepaald. Er bestaat bovendien een **lokale, niet-AI-afhankelijke parser** (`ocore().parseAnswerLocally()`), expliciet genoemd in code-commentaar als privacy-by-default/offline-vast alternatief. AI structureert vrije tekst (`buildExtractionPrompt`), maar de Core beslist of een waarde geldig is — geen AI-waarde wordt ongevalideerd als canonical fact opgeslagen.

## Canonical destinations (sectie 20-21)
Opgeslagen context landt via expliciete, herleidbare mapper-functies: `toAtleet` (atleet-profiel), `toTrainingContextRow` (training_context-tabel), `toCoachPrefs`, `toSecondaryGoals` (goals), `toConditions` (athlete_conditions). Geen enkele functie schrijft ongestructureerde AI-tekst rechtstreeks als canonical waarde weg.

## Veldclassificatie (sectie 20)
Op basis van de vragenset (`ocore().QUESTIONS`) en de wizardstappen: leeftijd/lengte/geslacht/doel/niveau/sport zijn **ESSENTIAL** (blokkeren voortgang, zie `obBodyStepComplete()`); trainingsfrequentie/dagen/equipment/omgeving zijn **USEFUL** (via de intake-flow, niet hard-verplicht); notificatie-toestemming is **OPTIONAL** (eigen knoppen, geen blokkerende "Volgende"). Geen overmatige verplichte datahonger aangetroffen.

## Geen nieuw defect gevonden
Consistent met MS-F2-02 t/m MS-F2-05: geen actief gebruikersgevoeld defect. Geen wijziging aan `index.html`.

## Nieuw: regressiecontract
`core/fOnboarding.test.js` (11/11, sabotagebewijs geleverd voor de `toConditions`-mapper) legt de primair/fallback-architectuur, de AI-validatiegrens en de canonical-mapping-garanties vast.

## MS-F2-06 acceptance-gate-toetsing
Letterlijke acceptance gate: *"Conversational but structured intake; goal/context captured deterministically."*
**Resultaat: CLOSED** — beide eigenschappen (conversationeel via AI-intake, deterministisch gevalideerd via `OnboardingCore`) bevestigd aanwezig en correct gescheiden.
