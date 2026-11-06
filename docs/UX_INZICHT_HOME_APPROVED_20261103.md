# Trainingskompas — UX Inzicht V2 + Home cleanup (PO-approved 2026-11-03)

Status: **implementation in PR #594; revised PO visual decision on 2026-11-03 supersedes the original 3-tile/hero proposal**. Branch based on `fix/tk-all-findings-20261101`, NOT on production main. No APK or production deploy by this document.

## Scope and non-negotiable preservation
- Preserve existing routes, functions, data sources, account isolation, raw input, Calculation/Context/Decision Engine provenance, and history; no invented training advice.
- Match existing Trainingskompas design tokens: pale grey-blue background, white rounded cards, navy headings, turquoise/teal highlights, same bottom navigation.
- Mobile 320/360/390/430 px, Android keyboard and 130% text, touch targets, safe-area insets.
- All labels Dutch, no phantom or disconnected buttons.

## Inzicht — approved grouping
1. Header: title/subtitle with standard profile avatar only, no extra shortcuts.
2. Filters: 7 dagen / 4 weken / 3 maanden and Alle sporten. One filter state drives all compatible summary modules.
3. Jouw ontwikkeling: **preserve the original four tiles** (Verbeterd; Stijgende trends; Trainingen; Adherence), original canonical sources, details deep-link and unknown-data handling. This supersedes the earlier three-tile mock-up.
4. **No duplicate Today/readiness dark hero or daily check-in block on Inzicht**: these functions belong to Home / Vandaag. Preserve the five quick-overview metrics (HRV, rusthartslag, slaap, spierherstel, krachtvolume) and their measurement provenance. This supersedes the earlier mock-up hero.
5. Herstel & belasting: **preserve the original, previously functioning layout** in full (Herstel / Spierbelasting tabs, front/back body maps, legend, muscle percentages, all-muscles drilldown) without calculation or rendering changes. The duplicate daily hero/check-in must not push this section down.
6. Hersteltrends: compact HRV, Rust HR, Slaap, Gewicht tiles; existing drilldowns retained.
7. Verbanden: show at most two grounded summaries and an Alle verbanden deep link. Correlation is not causation, preserve existing caveats and quality criteria.
8. Domeinen: Prestaties, Herstel, Trainingsbelasting, Voeding, Verbanden, Doelen. Remove Lichaam from this top-level list ONLY after its route is re-exposed below.
9. Gegevens & context: Lichaamssamenstelling (same previous Lichaam functionality), Gezondheidsgegevens & koppelingen, Cyclus, Voeding rond je training. Keep existing routing and logging controls.
10. Recente inzichten: compact drilldown cards, with full overview action. Existing derived metrics only.

## Home / Vandaag — approved removals
- Remove duplicated top-right Samen button; bottom Samen tab remains.
- Remove redundant top-right pulse/status shortcut only after verifying its sole useful destination still exists via Inzicht/other route.
- Move `Jouw ritme` card from Vandaag to Trainen planning/ritme, preserving account-scoped values and edit action.
- Remove separate motivational 7-active-days text card; preserve actual Ritme metric.
- Follow-up design optimization (reduce overlap between Herstel nu, Coach Vandaag, Goed hersteld) requires separate visual review, not silently included.

## Definition of done (code)
- Source route / handler inventory before deleting anything.
- Screenshots at 320, 360, 390, 430 px before/after; scrolling, no horizontal overflow or obscured touch controls.
- Automated nav/re-entry tests for every relocated action, including Lichaamssamenstelling and Jouw ritme.
- Full existing relevant tests and exact-SHA CI green with independent review.
- PR remains draft until user confirms actual rendered implementation; keep APK-HOLD, never silently merge full recovery branch to production.
- Confirm MoveKit issue #504 not affected: no public raw-video URLs or additional library media.
