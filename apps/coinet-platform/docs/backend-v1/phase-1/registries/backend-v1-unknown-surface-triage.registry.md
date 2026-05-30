# Backend v1 Unknown Surface Triage Registry

**Status:** ACTIVE
**Authority Level:** Level 4 (Registry — produced by Plan 1.8)
**Source Plan:** `phase-1/backend-v1-existing-backend-surface-inventory.md` (Plan 1.8)
**Companion to:** `backend-v1-existing-backend-surface-classification.registry.md`
**Last Updated:** 2026-05-19

> **First-principle alignment (Plan 1.8 §16.3).** When evidence is insufficient, classify as `UNKNOWN_REQUIRES_TRIAGE`, never silently as deferred / dormant / legacy. False certainty is the enemy. This registry exposes unknowns so they remain visible.

> **Hard rule (Plan 1.8 §16.1).** A surface with unclear usage does not disappear into "probably fine." It comes here.

---

## A. Triage Entries

| Unknown ID | Path / Pattern                                              | Why Unknown                                                                                  | Suspected Classes                          | Triage Method                                | Risk if Wrongly Classified |
| ---------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------ | -------------------------------------------- | -------------------------- |
| UNK-001    | `src/api/feedback/routes.ts`                                | Route file present; no direct chat-service import trace; semantics imply judgment-outcome feedback (V1-S02 supporting). | V1_SUPPORTING or DEFERRED                  | Grep for `/api/feedback` callers; trace runtime invocation | MEDIUM — feedback is V1-S02 supporting if used |
| UNK-002    | `src/api/portfolios/routes.ts`                              | Portfolio is on the boundary of V1-S05 (essential persistence) and NB-deferred future product. | V1_SUPPORTING or DEFERRED                  | Determine if portfolio routes are user-required for any V1-S0x | MEDIUM |
| UNK-003    | `src/api/retention/`                                        | Retention semantics unclear; could be user retention (V1-S05 adjacent) or data retention (compliance). | V1_SUPPORTING or DEFERRED                  | Read folder contents; trace usage            | LOW |
| UNK-004    | `src/services/retention/`                                   | Same ambiguity as UNK-003.                                                                   | V1_SUPPORTING or DEFERRED                  | Read folder contents; trace usage            | LOW |
| UNK-005    | `src/services/connector-layer/`                             | Likely deferred provider/connector scaffolding (NB-008), but cannot confirm without inspection. | DEFERRED or UNKNOWN                        | Read folder contents; check imports          | LOW |
| UNK-006    | `src/services/calibration/`                                 | Distinct from `calibration-spine/`. Likely NB-005 (full calibration ecosystem) but could include shared helpers. | DEFERRED (likely)                          | Read folder; verify no production import     | MEDIUM |
| UNK-007    | `src/services/canonicalization/` files unused by judgment   | `entity-confidence-model.ts` and `confidence-gate.ts` ARE imported by judgment; the remaining ~26 files may or may not be load-bearing. | V1_CORE (some), DORMANT (some)            | Per-file import trace                        | HIGH — wrong call may break entity identity |
| UNK-008    | `src/services/canonical/` (4 files)                         | `resolve` is used by chat. Status of `registry.ts`, `resolver.ts`, `types.ts` internals confirmed via SURF-024 but folder breadth not fully verified. | V1_CORE / V1_SUPPORTING                    | Per-file import trace                        | HIGH |
| UNK-009    | `src/services/insight-pack/`                                | Folder present; semantics unclear.                                                           | UNKNOWN — could be V1_CORE chat helper, deferred, or dormant. | Read folder contents; trace imports | MEDIUM |
| UNK-010    | `src/services/evidence-pack/`                               | Folder present; semantics unclear.                                                           | UNKNOWN — could relate to V1-S02 grounding or deferred future area. | Read folder contents; trace imports | MEDIUM |
| UNK-011    | `src/services/cis/`                                         | "CIS" abbreviation unresolved (Coinet Insight System? Coinet Index System?). | UNKNOWN                                    | Read README/index; trace imports             | MEDIUM |
| UNK-012    | `src/services/api-keys.ts`                                  | Could be V1_SUPPORTING (auth-adjacent) or DEFERRED if related to deferred API provider work. | V1_SUPPORTING or DEFERRED                  | Trace usage                                  | MEDIUM |
| UNK-013    | `src/services/cost-optimization.ts`                         | Likely DEFERRED (cost optimization is not a v1 production-readiness requirement) but may be required by an active provider. | DEFERRED or V1_SUPPORTING                  | Trace usage                                  | LOW |
| UNK-014    | `src/services/low-latency-cache.ts`                         | Caching infra; could be V1_SUPPORTING if used by active path.                                | V1_SUPPORTING or DORMANT                   | Trace usage                                  | MEDIUM |
| UNK-015    | `src/services/redis-client.ts`                              | Redis client; presence of low-latency-cache suggests caching infra. Active runtime use unconfirmed. | V1_SUPPORTING or DORMANT                   | Trace usage                                  | MEDIUM |
| UNK-016    | `src/services/token-context.ts`                             | "Token context" could mean asset token context (V1-S02 supporting) or auth token (V1-S05 supporting). | V1_CORE or V1_SUPPORTING                   | Read file; trace usage                       | HIGH if wrong direction |
| UNK-017    | `src/services/coin-id-validator.ts`                         | Likely V1_SUPPORTING for V1-S02 (asset judgment). Active import unconfirmed.                 | V1_CORE supporting                         | Trace usage                                  | MEDIUM |
| UNK-018    | `src/services/user-resolver.ts`                             | Likely V1_SUPPORTING for V1-S05 (user/session) or V1-S01 (chat user context).                | V1_SUPPORTING                              | Trace usage                                  | MEDIUM |
| UNK-019    | `src/services/sentiment-analysis.ts`                        | Distinct from `sentiment-service.ts` (active). May be older or auxiliary. Possibly LEGACY.   | LEGACY_OR_DUPLICATIVE or DORMANT           | Trace usage; compare with `sentiment-service` | MEDIUM |
| UNK-020    | `src/services/social-psychometrics.ts`                      | Adjacent to social cluster; whether active depends on usage.                                 | V1_CORE if active, DORMANT otherwise       | Trace usage                                  | MEDIUM |
| UNK-021    | `src/services/social-network-analysis.ts`                   | Adjacent to social cluster.                                                                  | V1_CORE if active, DORMANT otherwise       | Trace usage                                  | MEDIUM |
| UNK-022    | `src/services/twitter-intelligence.ts`                      | May be active via social-intelligence-orchestrator or unused.                                | V1_CORE if active, LEGACY otherwise        | Trace usage                                  | MEDIUM |
| UNK-023    | `src/services/twitter-service.ts`                           | Adjacent to twitter-intelligence; may overlap.                                               | V1_CORE if active, LEGACY otherwise        | Trace usage                                  | MEDIUM |
| UNK-024    | `src/services/auto-research-integration.ts`                 | Auto-research may be tied to NB-004 (agents) or to active project-research path.             | V1_CORE or DEFERRED                        | Trace usage                                  | MEDIUM |
| UNK-025    | `src/services/intelligence-fusion-engine.ts`                | "Fusion" suggests combining multiple intelligence outputs. Could be canonical orchestration or a duplicate. | V1_CORE or LEGACY              | Trace usage                                  | HIGH |
| UNK-026    | `src/services/investor-psychology-engine.ts`                | Adjacent to behavioral-finance/neuroeconomic cluster (both active).                          | V1_CORE if active, otherwise unclear       | Trace usage                                  | MEDIUM |
| UNK-027    | `src/services/project-investigation-service.ts`             | Adjacent to project-research (active). Possibly redundant.                                   | V1_CORE or LEGACY                          | Trace usage                                  | MEDIUM |
| UNK-028    | `src/services/project-web-researcher.ts`                    | Adjacent to project-research (active). Possibly redundant.                                   | V1_CORE or LEGACY                          | Trace usage                                  | MEDIUM |
| UNK-029    | `src/services/source-systems/` (folder breadth)             | `runBtcQuantumRisk` is imported by chat (SURF-035). Folder contains many subfiles; breadth needs verification. | V1_CORE (partially) / DORMANT (rest)       | Per-file import trace                        | HIGH |
| UNK-030    | `src/services/__tests__/` and other `__tests__` folders     | Test code is V1_SUPPORTING, but coverage scope unverified.                                   | V1_SUPPORTING                              | Inventory test files                          | LOW |
| UNK-031    | `src/components/`                                            | Top-level `components/` in backend src is unusual; might be a misplaced frontend module or a leftover folder. | UNKNOWN                              | Read folder contents                          | LOW |
| UNK-032    | `src/scripts/` (full inventory)                              | Scripts include certification (test-l13_master, test-l14_master, test-ajp1, test-cip05, build-bridge-comparison-ledger) and other helpers. Each script needs class assignment (V1_SUPPORTING test infra or DORMANT). | Mixed | Per-file review | LOW |
| UNK-033    | `src/utils/`                                                | Utility helpers; almost certainly V1_SUPPORTING, but file breadth unverified.                | V1_SUPPORTING                              | Inventory utils                              | LOW |
| UNK-034    | Prisma `EncryptedUserData`, `UserEncryptionKey`, `EncryptionAuditLog`, `UserConsent`, `GDPRRequest`, `DataRetentionPolicy`, `DataResidencyRule` | Compliance/security models. Likely required by production code for user data; status of active code paths unverified. | V1_SUPPORTING (likely) / DEFERRED | Code search for model usage | HIGH — compliance models may be required by law if data is collected |
| UNK-035    | Prisma `SignalSource`, `SignalQualityMetrics`, `SignalSourcePerformanceLog`, `SignalSourceBenchmark`, `Signal`, `AlertTrigger`, `AlertPerformance`, `UserFeedback` | Signal/alert telemetry models. Likely supports active alerts (V1-S06 conditional) and feedback (V1-S02 supporting). Use status unverified. | V1_SUPPORTING / DEFERRED | Code search for model usage | MEDIUM |
| UNK-036    | Prisma `RoleModel`, `Permission`, `UserRoleAssignment`      | RBAC models. Active production use unconfirmed; if used by middleware, V1_SUPPORTING.        | V1_SUPPORTING                              | Code search                                  | MEDIUM |
| UNK-037    | Prisma `AnalyticsEvent`, `AuditLog`                         | Analytics/audit infra. Audit may be V1_SUPPORTING (compliance), analytics may be deferred.    | Mixed                                      | Code search                                  | MEDIUM |

---

## B. Triage Method Definitions

- **Grep for `/api/PATH` callers** — search frontend and other backend code for HTTP usage.
- **Per-file import trace** — `Grep -r "from.*'./PATH'" src/` to find all importers.
- **Read folder contents** — inspect the folder's `index.ts`, `README.md`, or representative file.
- **Code search for model usage** — `Grep -r "prisma.MODEL_NAME" src/`.

## C. Triage Workflow

```text
1. Pick an UNK-NNN entry (highest risk first).
2. Apply the recommended triage method.
3. Update the surface in backend-v1-existing-backend-surface-classification.registry.md
   with the now-known class.
4. Mark this row as RESOLVED with a date, or strike the row entirely
   if the surface is moved to its final classification.
5. Update backend-v1-record-index.registry.md.
```

## D. Triage Prioritization

Triage in this order:

1. **HIGH-risk-if-wrongly-classified** entries first (UNK-007, UNK-008, UNK-016, UNK-025, UNK-029, UNK-034).
2. **MEDIUM-risk** entries second.
3. **LOW-risk** entries last (or batch into a single triage session).

Per Plan 1.8 §17, triage is not implementation work. It updates classifications. Action on classified surfaces (refactor, retire, canonicalize) requires BTAR + appropriate procedure.

## E. Rule on Unknowns Becoming Active Tasks

If a triage outcome reveals a defect (e.g., a "supporting" surface is actually broken), that defect goes through:

- Regular BTAR (Plan 1.6) if non-urgent.
- UDF (Plan 1.6 §17) if it qualifies as urgent.

Triage itself never directly admits work into BACKLOG-A.

---

## F. Initial Triage Bounded Scope

Plan 1.8 commits to producing this registry but does not commit to resolving every entry in the same work session. Resolution of entries happens incrementally as Phase 2 and Phase 3 work requires it. The registry stays current as triage proceeds.

---

*This registry is Level 4. The Plan 1.8 master inventory is authoritative; entries here are open questions, not classifications.*
