# Sprint 0.5 — Prioriteitenmatrix & Release Readiness
**TrainingKompas v3.3.25 · 2 augustus 2026**
**Status:** beslisdocument tussen Sprint 0 (Audit) en Sprint 1. Geen code gewijzigd, geen nieuwe functionaliteit bedacht.

**Bronnen, opnieuw geverifieerd (niet blind overgenomen uit eerdere documenten):**
`Sprint0_Product_Audit_v3_3_25.md` · Handbook H1–H14 · `docs/02_Blueprints/Blueprint.md` · `docs/00_Project_Management/CURRENT_STATE.md` en `DECISION_LOG.md` (DEC-001–010) · `docs/12_Roadmap/Roadmap.md` · codebase (`index.html` 8.640 regels / 657.897 bytes, `sw.js`, `manifest.json`, `netlify.toml`, 8 Netlify Functions)

**Ontbrekend brondocument:** een los `PROJECTPLAN.md` bestaat niet als zodanig; wel `PROJECTPLAN_APP.md` en `PROJECTPLAN_AI_Performance_Coach_v3_1.md` (oudere, deels door Blueprint.md/Roadmap.md ingehaalde versies) en `MASTER_SPRINT_BACKLOG.md` (leeg sjabloon, per eerder besluit genegeerd). Waar de opdracht "PROJECTPLAN.md" noemt, is hiervoor Blueprint.md + Roadmap.md gebruikt als de daadwerkelijk geldende opvolgers.

**Scoremethodiek:** percentages zijn een gestructureerde inschatting op basis van geverifieerde dekking (Sprint 0-audit, §2 schermdekking en §7 cross-cutting bevindingen), niet een gemeten testresultaat. Waar geen betrouwbare basis bestaat, staat dat expliciet vermeld in plaats van een cijfer te verzinnen.

---

## 1. Executive Summary

| Volwassenheid | Score | Onderbouwing |
|---|---|---|
| **Product** | **60%** | Kernflows (training, AI-coach, herstel, team) werken en zijn stabiel (DEC-004/006/007/009 afgerond); 12 van 37 H6-schermen ontbreken volledig, waaronder productkritische (Onboarding, Doelen) |
| **Technisch** | **65%** | RLS/JWT/XSS-stabilisatie geverifieerd afgerond; single-file architectuur (657 KB `index.html`) bewust uitgesteld tot na Fase 2, sw.js-cachingstrategie nog niet geverifieerd, geen build-/bundelproces |
| **UX** | **45%** | Kernflows UX-doordacht (Handbook H4 gedetailleerd toegepast op bestaande schermen), maar merkstijl nog niet doorgevoerd (oude kleuren/font in productie) en 12 schermen — waaronder Instellingen — ontbreken of zijn te smal |
| **AI** | **55%** | AI-coach, programmagenerator en sport-context (`SPORT_BLOCKS`) functioneel aanwezig; explainability-velden (waarom/confidence) slechts spaarzaam aangetroffen, niet aantoonbaar systematisch per H8-vereiste — **niet met zekerheid vast te stellen zonder scherm-voor-scherm AI-audit** |
| **Release** | **20%** | Geen Privacy-scherm, geen Data Safety-voorbereiding, geen accessibility-basis, geen dark mode — dit zijn voor Google Play alle harde vereisten (H12), niet optioneel |

**Kernconclusie:** TrainingKompas is functioneel-stabiel genoeg voor single-user/klein-schaalgebruik (het huidige ART CrossFit-scenario), maar **niet release-klaar** voor een bredere of Store-uitrol. Het grootste blokkerende gat is niet een feature, maar de cross-cutting basis (accessibility, dark mode, motion-tokens, privacy) die op geen enkel gecontroleerd scherm is aangetroffen.

---

## 2. Product Maturity Matrix

Status: 🟢 volwassen · 🟡 gedeeltelijk · 🔴 ontbreekt/onvolwassen. Score is een codedekking-inschatting, geen testmeting.

| Onderdeel | Status | Score | Risico | Prioriteit | Afhankelijkheden |
|---|---|---|---|---|---|
| Dashboard | 🟡 | 65% | Laag | Middel | Branding-restyle |
| Training (schema/uitvoeren) | 🟢 | 85% | Laag | Laag (stabiel) | — |
| Workout/set-logging | 🟢 | 85% | Laag | Laag | — |
| AI Coach | 🟢 | 75% | Middel | Middel | Explainability-verificatie (H8) |
| Program Generator | 🟢 | 75% | Middel | Middel | Sport-context-splitsing (open PO-besluit) |
| Recovery (heatmap) | 🟢 | 70% | Laag | Laag | Anatomie/Spierbelasting-schermen (🔴) |
| Statistics | 🟡 | 55% | Laag | Middel | Kalender, PR-tijdlijn (🔴) |
| Profile | 🟢 | 80% | Laag | Laag | — |
| Teams | 🟢 | 80% | Laag | Laag | — |
| Gym | 🟡 | 50% | Middel | Middel | Dynamische branding (Fase 4) |
| Wearables | 🟢 | 70% | Middel | Middel | Google-Testing-mode-tokenverval (bekend risico) |
| Offline | 🟡 | 50% | **Hoog** | **Hoog** | sw.js network-first nog niet geverifieerd; IndexedDB-sync gebouwd, niet bevestigd |
| Authentication | 🟢 | 85% | Laag | Laag | — |
| Security | 🟢 | 80% | Laag | Laag | RLS-audit (DEC-007), JWT-fix (coach.js) geverifieerd; policy-inhoud per tabel blijft aandachtspunt (DEC-007 zelf noemt dit) |
| AI (systeembreed) | 🟡 | 55% | Middel | Middel | Zie AI Coach |
| Branding | 🔴 | 20% | Middel | **Hoog** | Nieuwe merkstijl vastgesteld (DEC-010), 0% doorgevoerd in code |
| Navigation | 🟡 | 60% | Laag | Laag | Afhankelijk van ontbrekende schermen (Doelen, Meldingen e.a.) |
| Performance | 🟡 | 45% | Middel | Middel | 657 KB monolithisch bestand, geen code-splitting; geen gemeten Lighthouse-score beschikbaar — **niet met zekerheid vast te stellen zonder performance-meting** |
| Accessibility | 🔴 | **5%** | **Hoog** | **Kritiek** | 0 aria-attributen geverifieerd in code |
| Dark Mode | 🔴 | **0%** | Middel | Hoog | 0 treffers `prefers-color-scheme` in code |
| Animations | 🟡 | 35% | Laag | Middel | Losse CSS-transities aanwezig, niet herleidbaar tot Handbook-motion-tokenstelsel (H5/H11) |
| Play Store Readiness | 🔴 | **15%** | **Hoog** | Hoog (bij Fase 5) | Zie §12 |
| Privacy | 🔴 | 0% | **Hoog** | **Kritiek voor Fase 5** | Geen Privacy-scherm (9.6), geen beleidstekst gevonden |
| Data Safety | 🔴 | 0% | Hoog | Kritiek voor Fase 5 | Formulier vereist inzicht in databehandeling — nog niet opgesteld |
| Abonnementen | 🔴 | 10% | Laag nu / Hoog bij Fase 5 | Laag nu | Schema aangelegd (DEC-002), bewust niet gehandhaafd; geen Mollie-integratie |
| Import/Export | 🟢 | 70% | Laag | Laag | — |
| Backup | 🟡 | 40% | Middel | Middel | Alleen offline-queue-modal, geen apart backup-overzicht (9.2) |
| Notifications | 🔴 | 10% | Laag | Middel | Geen instellingenscherm (8.2); AI-notificatielogica (H8 Deel 12) leunt hierop zonder gebruikerscontrole |
| Settings | 🔴 | **20%** | Middel | **Hoog** | H6 markeert 8.3 als 🟢 — audit toont dit als onjuist; alleen smalle trainingsinstelling bestaat |
| Help | 🔴 | 0% | Laag | Middel (Fase 5) | Niet aanwezig |
| Feedback | 🔴 | 0% | Laag | Middel | Niet aanwezig |
| Over App | 🔴 | 0% | Laag | Laag | Niet aanwezig |

---

## 3. Release Readiness

| Categorie | Score | Opmerkingen | Blokkeert Release? |
|---|---|---|---|
| Google Play | 20% | Privacy/Data Safety/Accessibility ontbreken — alle drie hard vereist (H12) | **Ja** |
| Android (native wrapper) | n.v.t. | Nog geen Capacitor/TWA-implementatie, staat gepland voor Fase 5 (Blueprint) | Ja (nog niet gestart) |
| PWA | 65% | manifest.json compleet (icons, shortcuts, categorieën), maar slechts één screenshot (narrow) — Play Store vraagt doorgaans meerdere form factors | Nee (huidige fase), wel bij Store-indiening |
| Offline | 45% | sw.js aanwezig, network-first-navigatie nog niet functioneel bevestigd (CURRENT_STATE, open testpunt); IndexedDB-queue gebouwd, niet bevestigd | Nee nu, risico bij schaal |
| Security | 80% | RLS/JWT/XSS-stabilisatie geverifieerd; geen CSP-header aangetroffen in `netlify.toml` | Nee |
| Privacy | 0% | Geen Privacy-scherm, geen policy-tekst | **Ja (bij Store-indiening)** |
| Accessibility | 5% | 0 aria-attributen — dit is zowel een WCAG- als een Play-Store-relevante eis (Data Safety/toegankelijkheidsverklaring) | **Ja (bij Store-indiening)** |
| Performance | Onbekend | Geen Lighthouse/perf-meting beschikbaar in de aangeleverde documentatie — **niet met zekerheid vast te stellen** | Onbekend |
| UX | 60% | Kernflows sterk gespecificeerd (H4/H6), maar 12 schermen ontbreken en merkstijl niet doorgevoerd | Nee nu |
| Branding | 20% | Nieuwe identiteit vastgesteld, 0% in productie-CSS teruggevonden | Nee nu, wel imago-risico bij gym-klant-demo (ART CrossFit) |
| AI | 70% | Functioneel werkend; explainability-dekking niet volledig te verifiëren binnen deze audit-diepte | Nee |
| Database (Supabase) | 80% | RLS op alle 31 tabellen bevestigd (DEC-007); policy-inhoud per tabel niet individueel herverifieerd | Nee |
| Netlify | 75% | Functions + scheduled cleanup werken; cache-headers zijn overal `no-cache` — botst mogelijk met PWA-cachingstrategie van sw.js, niet diepgaand getest | Nee, technisch aandachtspunt |

---

## 4. Prioriteitenmatrix

| Onderdeel | Business Value | Techn. Complexiteit | Gebruikersimpact | Risico | Afhankelijkheden | Quick Win? | MoSCoW | Sprintvolgorde-suggestie |
|---|---|---|---|---|---|---|---|---|
| Instellingen (8.3, écht bouwen) | Hoog | Laag-Middel | Hoog | Middel | Geen | **Ja** | Must | 1 |
| Accessibility-basis (aria, focus, screen reader) | Hoog | Middel | Hoog (specifieke doelgroep) | Hoog | Raakt alle bestaande schermen | Nee (breed) | Must | 1 |
| Dark mode-basis | Middel | Middel | Middel | Middel | Design-tokens (H5) | Nee | Should | 2 |
| Onboarding-flow | Hoog | Middel | Hoog | Middel | Doelen-scherm (deels) | Nee | Must | 1-2 |
| Branding/restyle naar nieuwe kleuren | Middel | Laag-Middel | Middel | Laag | Brand Identity al vastgesteld | **Ja** | Should | 2 |
| Privacy-scherm + policy-tekst | Hoog (bij Fase 5) | Laag | Laag nu | Hoog bij Store | DEC — juridische tekst nodig | **Ja** | Must (vóór Fase 5) | 2-3 |
| Meldingen-instellingen (8.2) | Middel | Laag | Middel | Laag | AI-notificatielogica bestaat al | **Ja** | Should | 2 |
| Doelen/Challenges (7.1/7.2) | Hoog | Middel-Hoog | Hoog | Middel | Social/competitief-koers (DEC-008) | Nee | Should | 3 |
| Offline-sync bevestigen | Middel | Laag (verificatie, geen bouw) | Middel | Hoog | — | **Ja** | Must | 1 |
| sw.js network-first verifiëren | Laag (verificatie) | Laag | Laag | Middel | — | **Ja** | Must | 1 |
| Anatomie/Spierbelasting/Kalender/PR-tijdlijn | Middel | Middel | Middel | Laag | Onderliggende data bestaat al deels | Nee | Could | 3-4 |
| Abonnement/Mollie | Hoog (Fase 5) | Hoog | Laag nu | Laag nu | Entitlement-schema al aangelegd (DEC-002) | Nee | Won't (nu) | Fase 5 |
| Help/Feedback/Over app | Laag nu / Middel bij Store | Laag | Laag | Laag | — | **Ja** | Should (vóór Fase 5) | 3 |

---

## 5. Release Blockers

| Fase | Blokkerende onderdelen | Waarom |
|---|---|---|
| **Interne Test** (huidig ART CrossFit-gebruik) | Geen harde blokkers | Kernflows stabiel, security-fixes bevestigd (DEC-004/006/007) |
| **Closed Test** (bredere gym-uitrol) | Onboarding-flow ontbreekt, Instellingen te smal, offline-sync onbevestigd | Nieuwe gebruikers zonder onboarding + geen taal-/notificatiecontrole is een directe UX-terugval bij schaal |
| **Open Test** | Accessibility-basis, dark mode | Bredere, onbekende gebruikersgroep vergroot het risico van toegankelijkheidsklachten |
| **Google Play** | Privacy-scherm, Data Safety-formulier, Accessibility-verklaring, meerdere Store-screenshots | Formele Play Store-vereisten (H12), geen omzeiling mogelijk |
| **Premium Release** (betaald) | Abonnementen/Mollie niet gehandhaafd, entitlement-schema niet actief | Kan geen betaalde tier afdwingen zonder werkende quota-handhaving |
| **Enterprise Release** (Fase 4, white-label) | Dynamische branding nog niet gebouwd, gym-scherm (7.4) slechts 🟡 | Meerdere-gyms-schaal vereist de skin-laag die nu nog niet bestaat |

---

## 6. Risicoanalyse

| Categorie | Risico | Kans | Impact | Mitigatie | Prioriteit |
|---|---|---|---|---|---|
| Technisch | Single-file `index.html` (657 KB) wordt onbeheersbaar bij verdere groei | Middel | Hoog (op termijn) | File-split is al bewust uitgesteld tot na Fase 2 (Blueprint) — bewaken dat dit moment niet te laat komt | Middel |
| UX | 12 ontbrekende schermen leiden tot inconsistente navigatie-verwachting | Hoog | Middel | Onboarding + Instellingen eerst (zie §4) | Hoog |
| AI | Explainability niet aantoonbaar systematisch — kan H8-non-compliance zijn zonder dat dit zichtbaar is | Middel | Middel | Gerichte AI-behavior-audit (buiten deze audit-diepte) | Middel |
| Performance | Geen gemeten performance-baseline | Onbekend | Onbekend | Lighthouse-meting uitvoeren vóór verdere UI-uitbreiding | Middel |
| Database | Policy-inhoud per tabel niet individueel geverifieerd (RLS staat wél overal aan, DEC-007) | Laag | Hoog als het misgaat | Steekproefsgewijze policy-review | Laag-Middel |
| Offline | sw.js-cachingstrategie en IndexedDB-sync beide onbevestigd | Middel | Hoog (dataverlies-risico bij falen) | Functionele test vóór Closed Test-fase | **Hoog** |
| Security | Geen CSP-header aangetroffen | Laag-Middel | Middel | CSP toevoegen aan `netlify.toml` | Middel |
| Privacy | Geen enkele privacy-voorziening | Zeker (0% aanwezig) | Hoog bij Store-indiening | Privacy-scherm + policy vóór Fase 5 | Hoog (tijdgebonden aan Fase 5) |
| Compliance (AVG) | Privacy-scherm ontbreekt, maar RLS/dataminimalisatie-principes lijken wel toegepast (auth.uid()-scoping) | Middel | Middel-Hoog | Zelfde als Privacy-actie hierboven | Middel |
| Play Store | Accessibility/Data Safety/screenshots ontbreken | Zeker | Hoog bij indiening | Zie §12 | Hoog (tijdgebonden aan Fase 5) |
| Architectuur | Geen build-/bundelproces — elke wijziging raakt direct het volledige productiebestand | Middel | Middel | Bekend en bewust aanvaard risico (Blueprint), geen actie nu nodig | Laag |

---

## 7. Sprintvolgorde (geen sprintplanning, uitsluitend volgorde-advies)

**Sprint 1 — Stabiliteit & kritieke UX-fundamenten**
*Waarom eerst:* dit zijn de items met het hoogste risico (offline-dataverlies) en de laagste complexiteit om te verifiëren of dicht te timmeren; ze blokkeren niets nieuws maar liggen al langer open.
- sw.js network-first verifiëren
- Offline-sync functioneel bevestigen
- Accessibility-basis starten (aria-labels op bestaande kernschermen)
- Afhankelijkheden: geen — kan onafhankelijk van nieuwe schermen
- Winst: sluit de laatste open technische-schuldpunten uit CURRENT_STATE, verkleint het grootste risico (§6)

**Sprint 2 — Instellingen, Onboarding, Branding**
*Waarom hier:* dit zijn de schermen met de hoogste gebruikersimpact per ontwikkeltijd (Quick Wins, §8), en Onboarding is inmiddels expliciet geprioriteerd door de Product Owner (DEC-010).
- Instellingen (8.3) volledig bouwen
- Onboarding-flow (1.2)
- Merkstijl doorvoeren (kleuren/font conform Brand Identity)
- Afhankelijkheden: Accessibility-patroon uit Sprint 1 hergebruiken i.p.v. dupliceren
- Winst: sluit de grootste "H6 zegt 🟢 maar is het niet"-discrepantie, en maakt de app klaar voor bredere interne uitrol

**Sprint 3 — Privacy, Meldingen, Help/Feedback**
*Waarom hier:* geen acute blokkade nu, wel een harde Fase-5-afhankelijkheid; vroeg bouwen voorkomt dat dit een latere release-blokkade wordt op een moment dat er tijdsdruk is.
- Privacy-scherm + tekst
- Meldingen-instellingen (8.2)
- Help/Feedback/Over app
- Afhankelijkheden: geen technische, wel inhoudelijke input (juridische privacytekst) van Product Owner
- Winst: sluit de meeste Play-Store-blokkers uit §5 vóór Fase 5 nodig is

**Sprint 4 — Dark mode & motion-tokens**
*Waarom hier, niet eerder:* raakt élk scherm — efficiënter om te doen ná Sprint 2/3 zodat er niet twee keer aan dezelfde schermen gewerkt wordt.
- Dark mode-tokens (H5 Deel 13)
- Motion-tokenstelsel toepassen (H5 Deel 14/H11)
- Afhankelijkheden: bestaande CSS-structuur inventariseren
- Winst: sluit het laatste cross-cutting gat uit §7 van de audit

**Sprint 5 — Doelen, Challenges, resterende visualisatieschermen**
*Waarom laatst van deze reeks:* nieuwe functionaliteit, geen schuld — logisch na de fundamenten.
- Doelen (7.1), Challenges (7.2)
- Anatomie/Spierbelasting/Kalender/PR-tijdlijn
- Afhankelijkheden: Social/competitief-vormkeuze (DEC-008, nog niet gescoped) moet eerst met ART CrossFit worden opgehaald
- Winst: completeert de H6-schermbibliotheek grotendeels

---

## 8. Quick Wins

| Onderdeel | Waarde | Ontwikkeltijd | Risico | Waarom quick win |
|---|---|---|---|---|
| Instellingen (8.3) | Hoog | Laag-Middel | Laag | Losstaand scherm, geen architecturale impact, dekt direct een audit-discrepantie |
| sw.js/offline-verificatie | Hoog (risicoreductie) | Laag | Laag | Puur testen/bevestigen, geen bouw |
| Meldingen-instellingen (8.2) | Middel | Laag | Laag | AI-notificatielogica bestaat al, dit is enkel de gebruikersinterface eromheen |
| Privacy-scherm | Hoog (tijdgebonden) | Laag | Laag | Grotendeels tekst + één scherm, geen complexe logica |
| Help/Feedback/Over app | Middel | Laag | Laag | Drie kleine, statische schermen |

---

## 9. Grootste Technische Schulden (hoog → laag)

1. **Accessibility-basis ontbreekt volledig** — Waarom: 0% dekking raakt elk scherm en elke toekomstige Store-indiening. Impact: hoog, groeit mee met elk nieuw scherm dat zonder deze basis gebouwd wordt. Oplossing: aria-patroon + screenreader-test op bestaande kernschermen, daarna als vast onderdeel van de Screen Review Checklist (H6) hanteren. Complexiteit: middel (breed, niet diep).
2. **sw.js/offline-sync onbevestigd** — Waarom: enige schuld met een direct dataverlies-risico. Impact: hoog bij falen, onbekende kans zonder test. Oplossing: functionele test conform CURRENT_STATE's eigen openstaande punt. Complexiteit: laag (verificatie, geen herbouw).
3. **Single-file architectuur (657 KB)** — Waarom: bewust uitgesteld, maar groeit met elke sprint. Impact: middel nu, hoog bij verdere schaal. Oplossing: al gepland ná Fase 2 (Blueprint) — bewaken, niet nu al oplossen. Complexiteit: hoog.
4. **Instellingen (8.3) te smal** — Waarom: Handbook markeert dit als 🟢 terwijl het feitelijk 🟡/🔴 is — vervuilt de betrouwbaarheid van de rest van de H6-statusmarkering. Impact: middel. Oplossing: zie Sprint 2. Complexiteit: laag-middel.
5. **Geen CSP-header** — Waarom: ontbrekende defense-in-depth-laag naast de al bevestigde RLS/JWT-fixes. Impact: laag-middel. Oplossing: header toevoegen in `netlify.toml`. Complexiteit: laag.
6. **Rollen/entitlements-schema inactief** — Waarom: bewust (DEC-002), geen acute schuld, maar moet vóór Fase 5 alsnog gehandhaafd worden. Impact: laag nu. Oplossing: activering in Fase 5. Complexiteit: middel-hoog (betaalflow).

---

## 10. UX Prioriteiten (gerangschikt, met onderbouwing)

1. **Instellingen (8.3)** — hoogste gebruikersimpact per inspanning; ontbreekt nu functioneel, terwijl het Handbook het als basisbehoefte (taal, notificaties, weergave) beschouwt.
2. **Onboarding (1.2)** — expliciet door Product Owner geprioriteerd (DEC-010); zonder dit ontstaat frictie bij elke nieuwe gebruiker, wat met het oog op gym-brede uitrol (Fase 3-4) steeds zwaarder gaat wegen.
3. **Merkstijl doorvoeren** — vastgestelde identiteit die nog niet zichtbaar is; beïnvloedt vertrouwen/geloofwaardigheid bij demo's richting (potentiële) gym-klanten.
4. **Meldingen-instellingen (8.2)** — de onderliggende AI-notificatielogica (H8 Deel 12) bestaat al en stuurt al meldingen aan zonder dat de gebruiker dit kan beheren — een bestaande UX-inconsistentie, geen nieuwe wens.
5. **Doelen (7.1)** — hoge gebruikerswaarde, maar afhankelijk van de nog niet gescopede social/competitief-vorm (DEC-008); vandaar lager dan de bovenstaande vier.
6. **Kalender/PR-tijdlijn/Anatomie/Spierbelasting** — waardevol maar het minst urgent: onderliggende data bestaat al deels, dit is presentatie, geen nieuwe capability.

---

## 11. Accessibility Roadmap

**Uitgangspunt:** 0 aria-attributen geverifieerd in de huidige code; dit is geen gedeeltelijke maar een volledige afwezigheid van de WCAG-basis die H4/H6/H12 bindend voorschrijven.

**Must Have (vóór Closed Test):**
- Aria-labels op interactieve elementen in de vijf kernschermen (Dashboard, Training, AI Coach, Profiel, Team)
- Screenreader-doorloop van het trainingsuitvoerscherm (het meest gebruikte scherm)
- `prefers-reduced-motion`-ondersteuning op bestaande animaties

**Should Have (vóór Open Test):**
- Volledige aria-dekking op alle 🟢-schermen uit de audit (§2)
- Contrastcontrole van de nieuwe merkkleuren (`#0B1D2A`/`#0E3B4A`/`#00B894`) tegen WCAG AA — **niet vastgesteld binnen deze audit, vereist een aparte contrastmeting**

**Nice to Have (vóór Google Play):**
- Dynamic-type/tekstgrootte-ondersteuning
- Volledige accessibility-verklaring als onderdeel van het Over-de-app-scherm (9.7)

---

## 12. Google Play Readiness

| Onderdeel | Status | Ontbreekt |
|---|---|---|
| Privacy | 🔴 | Privacy-scherm (9.6) en beleidstekst — volledig afwezig |
| Data Safety | 🔴 | Formulier vereist expliciete inventarisatie van dataverzameling — nog niet opgesteld; RLS-architectuur (DEC-007) geeft wel een goede feitelijke basis om dit op te baseren |
| Permissions | Niet vastgesteld | Geen Android-manifest aanwezig (PWA-stadium, wrapper nog niet gebouwd) — **niet met zekerheid vast te stellen vóór Capacitor/TWA-fase** |
| Branding (Store-vereisten) | 🟡 | Merkidentiteit bestaat (Brand Identity-document), maar nog niet in productie-UI; Store-listing-assets (feature graphic, promo-tekst) niet aangetroffen |
| Store Assets | 🔴 | Slechts één screenshot (narrow form factor) in manifest.json; Play Store vraagt doorgaans meerdere formaten/afbeeldingen |
| Onboarding | 🔴 | Ontbreekt volledig (zie §2/§4) — Play Store beoordeelt eerste-gebruik-ervaring mee bij review |
| Accessibility | 🔴 | 0% — zie §11 |

**Samenvatting:** van de zeven gecontroleerde Play Store-categorieën is er nul die als "gereed" kan gelden. Dit is geen acuut probleem zolang Fase 5 niet gestart is, maar wel een concentratie van werk die vroeg belegd moet worden zodat het niet allemaal tegelijk in Fase 5 valt.

---

## 13. Eindadvies

| Score | Waarde | Toelichting |
|---|---|---|
| Productscore | 60% | Kernflows volwassen, schermbibliotheek voor eenderde onvolledig |
| Technische score | 65% | Stabilisatieronde geverifieerd afgerond; architecturale schuld bewust en bewaakt |
| UX-score | 45% | Sterk op detailniveau (H4-toepassing), zwak op dekking (12 ontbrekende schermen) en merkconsistentie |
| AI-score | 55% | Functioneel sterk, explainability-compliance niet volledig aantoonbaar binnen deze audit-diepte |
| Architectuurscore | 65% | Bewuste, gedocumenteerde keuzes (single-file, uitgestelde entitlements) — schuld is zichtbaar en beheerst, niet verborgen |
| Release-score | 20% | Niet gereed voor Store-indiening; wel geschikt voor het huidige interne/single-gym-gebruik |
| Play Store-score | 15% | Nul van zeven categorieën "gereed" (§12) |
| Toekomstbestendigheid | Middel-Hoog | Governance-niveau B, Decision Log-discipline en bewust uitgestelde complexiteit (DEC-002/003/005) wijzen op een beheersbaar groeipad |
| Onderhoudbaarheid | Middel | Eén ontwikkelaar, één bestand van 657 KB — functioneel houdbaar tot Fase 2 afgerond is, daarna aandachtspunt |
| Schaalbaarheid | Middel | Databaseschema (RLS, gym_id-scoping, entitlement-tabellen) is al vooruitgebouwd op multi-gym; UI-laag (branding, accessibility) is dat nog niet |

**Advies:** eerst de cross-cutting basis (accessibility, offline-verificatie, Instellingen) sluiten vóór verdere schermuitbreiding — niet omdat nieuwe features onbelangrijk zijn, maar omdat elk nieuw scherm zonder deze basis de retrofit-opgave uit Sprint 0-audit §7/§8 vergroot in plaats van verkleint.
