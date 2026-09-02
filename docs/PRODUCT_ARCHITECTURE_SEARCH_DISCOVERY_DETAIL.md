# Trainingskompas Target Product Architecture — Search & Discovery

**Status:** PRODUCT OWNER WORKING SOURCE OF TRUTH  
**Scope:** generieke zoek- en ontdekkingsarchitectuur voor oefeningen, workouts, programma's, events, personen, teams/groepen, gyms/clubs, content en nutrition/product entities. Geen definitief schermontwerp.

## 1. Doel
Search & Discovery moet één consistente productcapability zijn die domeinobjecten vindbaar maakt zonder privacy, applicability, evidence of authorization te omzeilen.

Harde regel: `SEARCH MAY RANK RESULTS; IT MAY NOT EXPAND ACCESS RIGHTS`.

## 2. Search object types
Minimaal: EXERCISE/TRAINING_ELEMENT, WORKOUT_TEMPLATE, PROGRAM, EVENT, ATHLETE/PERSON where visible, COACH, GROUP, TEAM, ORGANIZATION/GYM, CHALLENGE, NUTRITION_PRODUCT, SUPPLEMENT_PRODUCT/INGREDIENT, HELP/CONTENT later.

## 3. Canonical indexing
Search indexeert canonical IDs en searchable metadata. Geen tweede mutable productdatabase in search.

## 4. Authorization filtering
Resultaat komt alleen terug als user object mag discoveren/zien. Filtering gebeurt server-side vóór of tijdens ranking; niet pas na click.

## 5. Privacy
Private athlete profile, sensitive health context, private team/org content en coach-restricted assignments worden niet indexeerbaar voor onbevoegden.

## 6. Visibility
Objecten declareren visibility/discovery policy zoals PRIVATE, CONNECTIONS, TEAM/ORG_CONTEXT, PUBLIC waar domein dit toestaat.

## 7. Search versus recommendation
Search reageert op expliciete intent/query. Discovery/recommendation kan suggesties tonen. Beide gebruiken dezelfde authorization/applicability boundaries maar verschillende ranking signals.

## 8. Query understanding
Ondersteun name/alias/synonym, localized terms, spelling tolerance en domeinfilters. AI/semantic retrieval mag query helpen interpreteren maar geen objectfacts verzinnen.

## 9. Filters
Domeinspecifiek bijvoorbeeld sport, goal, equipment, level, duration, distance, location, date, owner/source, official, availability, language.

## 10. Exercise search
Aliases/localized names mappen naar canonical exercise. Filter op movement/equipment/muscle/sport capabilities zonder biomechanische claims buiten governed metadata.

## 11. Workout/program discovery
Resultaat toont source/owner, sport, goal, duration/equipment/applicability, version/status en entitlement waar relevant. `Official` en `community/private` duidelijk onderscheiden.

## 12. Event discovery
Search op sport/date/location/distance/format/organizer. External event freshness/provenance wordt behouden; public event betekent niet public participation.

## 13. Social/person discovery
People search alleen op bewust discoverable profielvelden. Geen zoeken op email/health metrics tenzij expliciete contact/invite flow dat authoriseert.

## 14. Team/group/gym discovery
Tenant membership/invite-only contexts niet publiek lekken. Public discoverability is organization/team setting, niet default.

## 15. Nutrition/product search
GTIN lookup, name/brand, generic foods, supplements/ingredients. Product identity/data source/confidence en generic-vs-branded onderscheid behouden.

## 16. Evidence-aware supplement discovery
Ranking op populariteit/marketing mag evidence/safety niet overschrijven. Product record en ingredient evidence blijven gescheiden.

## 17. Entitlements
Premium content kan discoverable met duidelijke gate of volledig hidden volgens productpolicy; authorization en entitlement blijven apart.

## 18. Applicability
Resultaat kan worden gefilterd/ranked op sport/equipment/context, maar unknown user context mag niet leiden tot false incompatibility. UNKNOWN blijft unknown.

## 19. Safety
Medical/injury claims niet via search suggestions impliciet diagnosticeren. Search naar pain context kan alleen veilige help/training-scope content tonen volgens policy.

## 20. Ranking governance
Ranking signals kunnen relevance, exact match, recency, quality, source trust, applicability en user preference bevatten. Geen commercieel betaalde ranking zonder expliciete labeling/productbesluit.

## 21. Personalization
Personalization gebruikt alleen toegestane canonical context. Sensitive Women's Performance/recovery/nutrition niet stil gebruiken voor algemene content discovery zonder doel/policy.

## 22. AI search
AI kan natuurlijke query omzetten naar structured filters en resultaten samenvatten, maar resultaten moeten uit authorized canonical search komen. Geen hallucinated programs/events/products.

## 23. Search provenance
Voor external/product/event results bewaart underlying object source/freshness. Search resultaat zelf is geen nieuwe source of truth.

## 24. Index consistency
Object create/update/archive/privacy-change/consent change triggert index update/invalidation. Revoked access mag niet in stale search cache blijven.

## 25. Delete/archive
Deleted/private/deprecated objects verdwijnen uit discovery volgens policy, terwijl historische references intact kunnen blijven voor bevoegde users.

## 26. Search history
Persoonlijke search history is optional productdata met retention/privacy. Geen noodzaak om gevoelige queries permanent te bewaren.

## 27. Recent/favorites
Recent/favorite entities zijn per user en mogen ranking verbeteren. Ze veranderen object ownership/visibility niet.

## 28. Empty/no-result
No result leidt naar veilige alternatieven: filters aanpassen, custom exercise/event/product toevoegen, barcode community flow, etc. Geen verzonnen result.

## 29. Offline
Cached recent/favorites/library search kan beperkt offline; server-only discoverability/auth kan niet offline verruimd worden.

## 30. Performance
Index/search targets voor latency, pagination, result caps, rate limits en abuse prevention. Typeahead mag geen data enumeration leak veroorzaken.

## 31. Moderation/abuse
Public/community results kunnen report/moderation state meenemen; blocked users/content uit social discovery verwijderen volgens policy.

## 32. Functional >=9
Vereist canonical indexing, server authorization filtering, privacy/visibility semantics, localized aliases, filters per domain, source/provenance, entitlement separation, applicability/missingness, evidence/safety boundaries, AI grounded retrieval, index invalidation on privacy/revocation, delete/archive consistency, offline limitations, abuse/rate limits en adversarial enumeration/privacy tests.

## 33. UX governance
Global search versus context-specific search en exacte screens worden later pas ontworpen. Functioneel contract eerst, visual interaction na PO mockup review.

## 34. Harde regels
`SEARCH DOES NOT CREATE DATA.`
`SEARCH DOES NOT EXPAND AUTHORIZATION.`
`RANKING DOES NOT OVERRIDE SAFETY OR EVIDENCE.`
`SEMANTIC AI MAY INTERPRET THE QUERY; CANONICAL RESULTS REMAIN THE SOURCE.`