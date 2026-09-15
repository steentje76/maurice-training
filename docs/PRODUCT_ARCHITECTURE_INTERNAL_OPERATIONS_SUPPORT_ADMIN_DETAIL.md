# Trainingskompas Target Product Architecture — Internal Operations, Support & Admin

**Status:** PRODUCT OWNER WORKING SOURCE OF TRUTH  
**Scope:** production operations, support tooling, incident handling, moderation, privileged access, data repair, audit and internal administration. Geen definitieve admin-UX.

## 1. Doel
Interne tooling moet productiebeheer mogelijk maken zonder een verborgen superuserpad te creëren dat RLS, privacy, tenant isolation of audit omzeilt.

Harde regel: `SUPPORT ACCESS != NORMAL USER ACCESS`.

## 2. Rollen
Minimaal onderscheiden: SUPPORT_AGENT, SUPPORT_ESCALATION, SECURITY_ADMIN, BILLING_SUPPORT, CONTENT_ADMIN, MODERATOR, RESEARCH_ADMIN, PLATFORM_OPERATOR. Rollen zijn least-privilege en combineren niet automatisch alle rechten.

## 3. Privileged access
Elke privileged action vereist server-side authorization, actor identity, reden/ticket, scope, timestamp en audit. Geen gedeeld admin-PIN als targetarchitectuur.

## 4. Impersonation
Default: geen vrije impersonation. Als later noodzakelijk: expliciete support session, time-limited, zichtbaar/audited, read-only waar mogelijk, geen toegang tot secrets/payment credentials, gevoelige data alleen extra gated.

## 5. Support cases
Canonical support case bevat case_id, user/org reference, category, severity, status, assigned actor, timestamps, linked incidents, user-provided diagnostics en resolution. Supporttekst is geen productdata source.

## 6. Diagnostics
User kan bewust diagnostics delen. Crash/log payloads worden gescrubd van tokens, raw health payloads, Women's Performance, nutrition details en chat content tenzij expliciet noodzakelijk en toegestaan.

## 7. Data repair
Geen directe handmatige database-edit als standaardproces. Data repair via versioned/admin action met validation, dry-run, audit, rollback/reconciliation waar mogelijk.

## 8. Security incident
Incident lifecycle: detect -> classify -> contain -> investigate -> remediate -> notify where required -> postmortem -> controls/tests. Security events gescheiden van product notifications.

## 9. Operational incident
Outage/degraded connector/device/provider krijgt canonical incident state, affected capabilities, start/end, severity, status, public/user communication policy en postmortem reference.

## 10. Moderation
Social/community moderation ondersteunt report, block, content removal, account restriction volgens policy. Moderator ziet minimum necessary context. Health data niet nodig voor normale contentmoderatie.

## 11. Content administration
TK official exercises/programs/evidence/content gebruiken draft/review/publish/deprecate lifecycle. Content admin mag geen Calculation/Decision logic wijzigen zonder aparte registry governance.

## 12. Billing support
Billing support kan subscription state onderzoeken en audited support grants uitvoeren binnen policy, maar krijgt geen athlete health/trainingdata omdat iemand betaalt.

## 13. Organization support
Support kan tenantconfiguratie onderzoeken zonder cross-tenant browse. Organisatiecontext expliciet kiezen en auditen.

## 14. Account recovery
Recovery volgt auth-provider/securityflow. Support mag wachtwoord, MFA secret of OAuth token nooit kunnen lezen.

## 15. Export/delete operations
Failed export/delete jobs hebben retry/reconciliation tooling. Admin mag delete niet stil annuleren zonder policy/reason. Legal holds, indien ooit nodig, expliciet apart.

## 16. Connector operations
Beheer connector health, credentials metadata, scopes, webhook status, rate limits, backlog, retries en provider incidents; geen raw tokens in logs/UI.

## 17. Queue/retry operations
Offline/sync/import/notification jobs hebben observable states en idempotent replay. Handmatige replay mag geen duplicates veroorzaken.

## 18. Feature flags
Feature flags zijn versioned, scoped, auditable, default-safe en niet bedoeld om authorization/privacy te omzeilen. Safety-critical behavior niet willekeurig togglen buiten release governance.

## 19. Configuration
Runtime config/secrets gescheiden. Wijzigingen aan config met validation/audit; secrets nooit in repository/admin UI output.

## 20. Release operations
Release bevat version, migrations, registry versions, rollout state, health checks, rollback plan en known limitations. Documentatie is beschrijving, code/database/tests/live validation blijven bewijs.

## 21. Data migration
Migraties zijn idempotent/controlled waar passend, backup/rollback strategy, verification queries en post-deploy consistency checks. Geen ongedocumenteerde productie-SQL als normale praktijk.

## 22. Observability
Metrics/logs/traces voor availability, errors, latency, queue depth, sync failures, auth/RLS denials, billing/webhook health, AI failures, device connector health. Geen sensitive payload logging.

## 23. AI operations
Monitor model/provider failures, schema validation, safety/guardrail failures, latency/cost en fallback. Ops mag AI output niet als calculation truth herstellen.

## 24. Abuse/fraud
Rate limits, spam, fake community product submissions, entitlement abuse, malicious invitations en scraping worden apart gedetecteerd. Geen automatische health-data profiling voor fraud.

## 25. Audit log
Immutable append-oriented audit voor privileged actions met actor, action, object/scope, reason, result, timestamp, correlation id. Audit bevat zo weinig mogelijk sensitive content.

## 26. Break-glass
Alleen indien operationeel noodzakelijk: expliciete break-glass procedure, sterk auth, beperkte duur, extra logging/alerts, post-review. Geen permanent verborgen superadminaccount.

## 27. User-visible support
Help/support toont case status en veilige communicatie. Supportmessage wordt duidelijk onderscheiden van AI Coach/Human Coach.

## 28. Status page
Later mogelijk publieke service status voor outages. Geen interne securitydetails of persoonsgegevens.

## 29. Retention
Support tickets/logs/audit/diagnostics hebben afzonderlijke retention policies. Niet alles voor onbepaalde tijd bewaren.

## 30. Functional >=9
Vereist role separation, no free impersonation, audited privileged actions, safe diagnostics, controlled data repair, incident workflows, moderation, connector/queue tooling, feature/config governance, release/migration controls, privacy-safe observability, break-glass governance, adversarial admin/RLS tests en bewezen cross-tenant isolation.

## 31. UX governance
Admin/support/web operations UI pas later ontwerpen na taak- en rechtenmatrixreview.

## 32. Harde regels
`NO HIDDEN SUPERUSER PATH.`
`EVERY PRIVILEGED ACTION IS AUTHORIZED, SCOPED AND AUDITED.`
`SUPPORT DOES NOT BECOME A BACKDOOR TO HEALTH DATA.`
`OPERATIONS MAY REPAIR SYSTEM STATE, NOT REDEFINE SCIENTIFIC TRUTH.`