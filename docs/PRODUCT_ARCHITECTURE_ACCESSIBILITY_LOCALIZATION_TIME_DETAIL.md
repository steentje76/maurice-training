# Trainingskompas Target Product Architecture — Accessibility, Localization & Time

**Status:** PRODUCT OWNER WORKING SOURCE OF TRUTH  
**Scope:** accessibility, language/localization, units, timezone/DST, date/time semantics en cross-device consistency. Geen definitieve visuele UX.

## 1. Doel
Trainingskompas moet functioneel correct blijven ongeacht taal, units, timezone, DST, device locale en toegankelijkheidsbehoeften.

## 2. Accessibility is productfunctionaliteit
Accessibility is geen visuele afwerking achteraf. Kritieke flows moeten bruikbaar zijn met screenreader, keyboard/external input waar relevant, voldoende focus semantics, scalable text, reduced motion en non-color-only status communication.

## 3. Target standard
Web/mobile UX streeft minimaal naar WCAG 2.2 AA-equivalente productkwaliteit waar platformtechniek dit ondersteunt. Exacte compliance claim pas na echte audit.

## 4. Semantic controls
Knoppen, tabs, inputs, progress, charts en errors krijgen programmatic labels/roles/states. Geen icon-only functie zonder accessible name.

## 5. Dynamic text
Text scaling mag kritieke content/actions niet afsnijden. Layouts moeten reflow/scroll ondersteunen.

## 6. Color/contrast
Status mag nooit uitsluitend via kleur worden gecommuniceerd. Contrast wordt design-systemmatig getest; geen definitieve claims vóór visuele audit.

## 7. Motion/haptics/audio
Reduced motion respecteren. Haptic/audio cues hebben alternatieve feedback en zijn configureerbaar waar passend.

## 8. Charts/data visualization
Charts hebben tekstuele samenvatting/data representation, units, timeframe, legend semantics en geen kleur-only onderscheid.

## 9. Training execution accessibility
Tijdens training: grote bedienbare targets, duidelijke focus, screenreader labels, safe pause/finish confirmation, hands-busy/device-context later. Accessibility mag execution state niet verstoren.

## 10. Language model
Canonical IDs/data blijven taalneutraal. UI strings/content worden localized resources, geen businesslogica op Nederlandse labels.

## 11. Localization
Ondersteun locale-specific decimal separators, number formatting, dates, week start, pluralization en translated exercise/content aliases.

## 12. Exercise/content translation
Vertaling verandert canonical exercise/program identity niet. Source language/version/provenance behouden.

## 13. AI language
AI Coach antwoordt in user language/locale waar mogelijk, maar structured inputs/outputs blijven canonical. Vertaling mag numerieke betekenis of Decision status niet veranderen.

## 14. Units
Canonical storage gebruikt expliciete SI/registered base units waar passend. Display preference kan kg/lb, km/mi, pace/speed etc. zijn. Conversies deterministic en getest.

## 15. No unit guessing
Elke numeric input/output met relevante fysieke betekenis heeft unit. Imported unit unknown -> geen stille aanname.

## 16. Pace semantics
Running/RowErg/SkiErg/BikeErg pace basis expliciet. Display conversion verandert betekenis niet; BikeErg basis mag niet via generieke 500m-aanname fout gaan.

## 17. Time model
Bewaar waar relevant UTC instant + source/local timezone + local date semantics. Een geplande training om 18:00 lokale tijd is niet alleen een UTC-string zonder zonecontext.

## 18. Timezone preference
Athlete heeft home/current display timezone; events/organizations kunnen eigen timezone hebben. Bronobject bepaalt canonical local-time semantics.

## 19. DST
Planning, reminders, recurring events en calendar sync testen spring-forward/fall-back. `08:00 local recurring` blijft 08:00 local als dat de intentie is.

## 20. Travel
Event in andere timezone toont event-local start én begrijpelijke athlete context. Travel verandert historische workout timestamps niet.

## 21. Date-only objects
Geboortedatum/event day/period day en andere date-only concepts mogen niet door UTC-conversie één dag verschuiven.

## 22. Duration versus wall clock
Elapsed duration wordt niet afgeleid uit lokale klok over DST. Gebruik monotonic/device/session timestamps waar nodig.

## 23. Week/day boundaries
Training day, daily recovery snapshot en streak/consistency gebruiken expliciete timezone policy. Geen verschillende daggrens per scherm.

## 24. Calendar locale
Week start Monday/Sunday en week numbers locale/configurable zonder underlying planned item identity te veranderen.

## 25. Notifications
Reminder scheduling gebruikt canonical event/planned-item timezone semantics en recalculatie bij timezone/date changes.

## 26. Offline
Offline writes bewaren source timestamps/timezone/offset en reconcile bij sync. Device klokafwijking detecteren waar relevant; niet blind trusten als provider timestamp sterker is.

## 27. Accessibility preferences
Text size/system settings, reduce motion, high contrast/platform accessibility worden waar mogelijk gerespecteerd. Geen parallel privacyprofiel.

## 28. Localization fallback
Ontbrekende translation valt gecontroleerd terug op supported default; nooit lege kritieke safetytekst.

## 29. Content governance
Translated scientific/safety claims houden link naar dezelfde Evidence/content version. Vertaling krijgt reviewstatus voor high-impact tekst.

## 30. Search
Search ondersteunt aliases, accent-insensitive matching en localized names zonder duplicate canonical records.

## 31. Input parsing
Natural-language onboarding ondersteunt locale-specific dates/units, maar ambiguïteit wordt bevestigd. `10/11` zonder locale/context niet stil exact interpreteren.

## 32. Accessibility testing
Automated checks + handmatige screenreader/navigation + scaling + contrast + critical-flow testing. Alleen automated test is onvoldoende.

## 33. Functional >=9
Vereist semantic accessibility in critical flows, scalable text, non-color status, accessible charts, locale-neutral canonical IDs, translation resources, deterministic unit conversion, no unit guessing, correct timezone/DST/travel/date-only semantics, notification/calendar consistency, offline timestamp integrity, localized AI without logic mutation en echte accessibility audit vóór complianceclaim.

## 34. Harde regels
`LOCALE CHANGES PRESENTATION, NOT PRODUCT TRUTH.`
`DISPLAY UNIT != STORED SEMANTIC VALUE.`
`TIMEZONE IS DATA, NOT JUST FORMATTING.`
`ACCESSIBILITY IS FUNCTIONAL QUALITY, NOT POLISH.`