# B9-H3C Product Owner External Action

## WHY THIS IS REQUIRED

De software voor Running/Cycling-activiteiten-import via Google Health
is volledig gebouwd en getest (B9-H3B/H3C, 45/45 nieuwe tests, 0
regressie). Om dit daadwerkelijk te laten werken voor een echte
gebruiker, moet de nieuwe machtiging (scope) voor sportactiviteiten
zichtbaar en beschikbaar zijn in het Google-toestemmingsscherm, en
moet een gebruiker deze machtiging opnieuw geven.

## EXACT ACTION

**Stap 1 -- controleer of de nieuwe scope al zichtbaar is (2 minuten):**
Log in op de Google Cloud Console van het Trainingskompas-project.

**WHERE:** console.cloud.google.com -> APIs & Services -> OAuth consent
screen -> Data access (tabblad "Gegevenstoegang").

**WHAT TO CLICK:** "Add or remove scopes" -> zoek naar "Google Health
API" -> controleer of `.../auth/googlehealth.activity_and_fitness.
readonly` al in de lijst met toegevoegde scopes staat.

**EXPECTED RESULT:** als de scope er al staat: niets doen, ga naar
Stap 2. Als de scope er nog niet staat: selecteer hem, klik "Update",
dan "Save".

**Stap 2 -- controleer de publicatiestatus:**
**WHERE:** dezelfde OAuth consent screen -> tabblad "Audience"
("Doelgroep").
**WHAT TO CLICK:** controleer of de status "In production" (Published)
is, of "Testing".
**EXPECTED RESULT:** als "Testing": zorg dat het eigen Google-account
(en elk ander account waarmee getest wordt) onder "Test users" staat.

**Stap 3 -- opnieuw koppelen in de app (1 minuut):**
Open Trainingskompas -> Instellingen/Profiel -> wearable-koppeling ->
ontkoppel de bestaande Google-koppeling -> koppel opnieuw. Dit toont
een nieuw Google-toestemmingsscherm met de sportactiviteiten-
machtiging erbij.

**WHAT NOT TO CHANGE:** verander geen andere scopes, verwijder geen
bestaande OAuth-client, wijzig geen redirect-URI's.

**SECURITY WARNING:** deel nooit een OAuth client secret in chat,
e-mail, of documentatie. Deze stappen vereisen geen enkel wachtwoord
of geheime sleutel te typen of te delen.

## HOW TO CONFIRM SUCCESS

Na opnieuw koppelen: voer een echte hardloop- of fietstraining uit die
door een sporthorloge/telefoon naar Google Health wordt gelogd. Wacht
tot de eerstvolgende synchronisatie (of trigger deze handmatig als de
app dat ondersteunt). Controleer daarna of de training verschijnt in
de trainingsgeschiedenis van Trainingskompas.
