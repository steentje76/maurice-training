# DELTA-ANALYSE RONDE 2 — Vandaag · Coach · Samen · Profiel · Herstelcomponent

## 1. VANDAAG — POLISH (bevestigd)
`#s-home` bevat al: `home-hero` (de anatomische herstelvisualisatie),
`home-hrv-card`, `home-coach-vandaag`, `home-readiness`, `home-context`,
`home-plan`, `home-weather`, `offline-badge`, `home-theme`, `home-dash`.

**Consequentie**: mijn eerdere Vandaag v2/v3/v4 reconstrueerden grotendeels
wat er al is. Weather en de body bestonden al als eigen componenten — ik
"herstelde" ze terwijl ze nooit weg waren uit de implementatie, alleen uit
mijn proposal. Minimal-change bevestigd: **polish, geen redesign.**
Te polishen: spacing/density, canonical IA-nav, dev-banner weg.

## 2. COACH — ECHT STRUCTUREEL VERSCHIL (geen polish)
`#s-coach` is in current een **chatscherm**: `coach-chips`, `chat-wrap`,
`chat-inp`, `send-btn`, `coach-back-bar`, `coach-session-label`.

Canonical `coach-v0.2` toont iets anders: segmented control (AI Coach /
Mijn coach met badge), een AI-samenvattingskaart met herstelstatus en
volgende training, "Actuele coach inzichten", en "Recente gesprekken" met
doorklik naar gesprekken.

**Dit is het enige van de zes schermen waar canonical en current
fundamenteel verschillen.** Canonical maakt van Coach een overzichtsscherm
met de chat als één van de ingangen; current IS de chat.

Dat is een **productbeslissing**, geen polish-opdracht:
- (a) Canonical volgen: nieuw overzichtsniveau, chat wordt een detailroute.
- (b) Current behouden: chat blijft het scherm, canonical-elementen komen
  er als kaarten boven.
- (c) Hybride: chat blijft default, overzicht als tweede tab.

Ik kies hier niet zelfstandig — optie (a) verplaatst een bestaande,
werkende primaire route en dat raakt de journey van elke gebruiker.

## 3. SAMEN — niet statisch te beoordelen
`#s-social` bevat alleen `social-scroll`; de inhoud wordt volledig
dynamisch gerenderd. Zonder sessie is de gevulde staat niet te zien.
Structurele delta daarom **niet bewezen**. De eerder vastgestelde feiten
blijven: challenges bestaan (`socialRenderChallenges`,
`SocialChallengeCore`), avatars zijn initialen, geen progress/ranking/foto
in het datamodel zonder de twee goedgekeurde capabilities.

## 4. PROFIEL — CURRENT IS RIJKER DAN CANONICAL
`#s-profiel` bevat naast de canonical items twee dingen die **niet** in
`profiel-v0.1` staan:
- `tenant-brand-card` + `tenant-brand-logo` + `tenant-brand-name` +
  `tenant-powered-by` → **white-label/tenant-branding**.
- `plan-huidig-card` + `plan-huidig-naam` + `plan-huidig-status` →
  abonnementsstatus (past bij BETA/PRE-COMMERCIAL: status tonen zonder
  checkout).

**Beide behouden.** Mijn eerdere Profiel-proposals lieten tenant-branding
volledig weg — dat was silent loss. Polish, geen redesign.
NB: `tenant-brand-admin-btn` is de eerder gevonden dode knop
(`tenantBrandingAdminEdit()` bestaat niet) — P3, apart geregistreerd.

## 5. HERSTELCOMPONENT — architectuur al correct
`home-hero` (Vandaag compact) en Lichaam delen `v43HomeRecColor()`; het
commentaar stelt expliciet dat er daarom geen twee implementaties naast
elkaar bestaan. Eén recovery source of truth is dus **al gerealiseerd**.
Te doen: Herstel & belasting-detail met tabs Overzicht · Per groep ·
Voorzijde · Achterzijde, gevoed door dezelfde `SVG_ID_RECOVERY_HOURS` —
geen tweede calculation model.

## 6. VERBANDEN-VISUALISATIE — toets op jouw implementatievoorwaarde
`core/relationship.js` levert gestructureerde output: `relationship_id`,
`source_variable`, `target_variable`, `status` (classificatie met rang,
o.a. POSSIBLE_PATTERN), `confidence`, sample-`tier`, `isPatroon`. Er zijn
`candidates()`, `discover()`, `rank()`, `evaluate()`. Het wordt gebruikt
(10 referenties in index.html).

**Oordeel**: de engine levert echte paarsgewijze verbanden mét status en
confidence. Een netwerkvisualisatie is daarmee *toegestaan*, maar een
losse "wolk" van knopen suggereert meer samenhang dan de engine
uitspreekt. Veiliger en even informatief: een **korte gerangschikte lijst
van bron→doel-paren** met statuslabel en confidence-indicatie, precies
zoals `rank()` ze oplevert. Dat toont uitsluitend beschikbare evidence en
kan nooit causaliteit suggereren.

## Samenvatting
| Scherm | Oordeel |
|---|---|
| Vandaag | POLISH — componenten bestaan al |
| Trainen | POLISH — v2 akkoord |
| Inzicht | POLISH — v2 goedgekeurd |
| Profiel | POLISH — tenant-branding + plan behouden |
| Samen | ONBEWEZEN — vereist gevulde staat |
| **Coach** | **PO-BESLISSING — structureel verschil** |
