# UX Next Screen Brief

**SCREEN:** Hoofdnavigatie-ontsluiting van Sociaal en Voeding (Home/
Lichaam-schermen + de bottom-navigatie zelf)

**CURRENT PURPOSE:** Home toont het dagoverzicht en een klein 👥-icoon
rechtsboven dat naar Sociaal leidt; Lichaam toont de lichaamsstatus en
een klein 🍽️-icoon rechtsboven dat naar Voeding leidt. Beide iconen
hebben geen zichtbaar tekstlabel.

**CURRENT LOCATION:** header-rij van respectievelijk `s-home` en
`s-lichaam`, als `ibtn`-knop naast de bestaande "toevoegen"-knop.

**CURRENT STRUCTURE:** 5-tab bottom-navigatie (Home/Training/Lichaam/
Coach/Voortgang); Sociaal en Voeding hebben elk een eigen, volledig
scherm met een eigen, interne bottom-navigatie (dezelfde 5 tabs,
waarbij het eigen domein niet als "active" wordt gemarkeerd omdat er
geen eigen tab bestaat).

**CURRENT PRIMARY CTA:** N.v.t. voor dit navigatie-vraagstuk zelf (de
CTA's binnen Sociaal/Voeding zelf zijn al apart beoordeeld en
functioneren goed).

**CURRENT SECONDARY ACTIONS:** N.v.t.

**CURRENT SCORE:** 6.5 (Discoverability-dimensie op beide betrokken
schermen; dit is de enige dimensie die beide schermen momenteel onder
9.0 houdt).

**TOP UX PROBLEMS:**
1. Geen zichtbaar tekstlabel bij de 👥/🍽️-iconen -- een nieuwe gebruiker
   moet het icoon raden of per toeval ontdekken.
2. Sociaal en Voeding voelen niet gelijkwaardig aan Training/Lichaam/
   Coach/Voortgang, terwijl ze inmiddels vergelijkbaar volwaardig zijn
   (negen bruikbare Social-onderdelen; een volledig Nutrition-
   registratie/inzichten-traject).
3. De eigen bottom-navigatie binnen Sociaal/Voeding toont geen enkele
   tab als "actief" (geen van de 5 bestaande tabs komt overeen met
   waar de gebruiker daadwerkelijk is), wat een kleine, maar zichtbare
   inconsistentie is t.o.v. de rest van de app.

**FUNCTIONAL REQUIREMENTS THAT MUST REMAIN:**
- Alle bestaande, functionele routes (`go('s-social')`/
  `go('s-nutrition')`) moeten intact blijven -- geen wijziging aan de
  onderliggende data-/RLS-laag.
- Geen wijziging aan de interne structuur/functionaliteit van Sociaal
  of Voeding zelf in deze stap -- uitsluitend de ontsluiting.

**DATA/ENGINE CONTRACTS THAT MUST NOT CHANGE:**
- `renderSocialScreen()`/`renderNutritionScreen()` en alle
  onderliggende RLS-policies, canonieke modules
  (`SocialGroupCore`/`SocialChallengeCore`/`NutritionFoundationCore`/
  `NutritionIntelligenceCore`) blijven ongewijzigd.

**COMPETITOR PATTERNS:**
- Strava: "Feed" (sociaal) als een eigen, gelijkwaardige hoofdtab.
- MyFitnessPal/Cronometer: voeding als primaire, herkenbare hoofdtab
  of prominent startscherm-element.

**QUESTIONS FOR PRODUCT OWNER:**
1. Is een zesde bottom-nav-tab acceptabel (mogelijk krap op smalle
   Android-schermen), of geniet een andere oplossing de voorkeur
   (bijv. een "Meer"-tab die naar Sociaal/Voeding/Instellingen leidt,
   of expliciete tekstlabels toevoegen aan de bestaande iconen zonder
   de tab-structuur te wijzigen)?
2. Moeten Sociaal en Voeding gelijk behandeld worden (beide een eigen
   tab), of is één van de twee belangrijker voor de huidige
   productfase?
3. Is er een gewenste, specifieke plek in de bestaande 5-tab-structuur
   waar dit zou moeten passen, of is een bredere navigatie-herziening
   gewenst?

**MOCK-UP REQUIRED:** YES

**IMPLEMENTATION ALLOWED:** NO — WAITING FOR PRODUCT OWNER APPROVAL
