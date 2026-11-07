# Attendance incident groups — local contract and acceptance matrix

Status: local specification draft only (Main API 0.0.97 / BFF 0.0.86). No runtime, persistence, code generation, UI, migration or release is included or claimed. Source for the two retained legacy contracts: same-repository commit `92f0504`; selection is limited to Main `getCurrentUserAttendanceIncidents` and `getCurrentUserAttendanceInboxBadge`, BFF `getWorkerAttendanceIncidents` and `getWorkerAttendanceInboxBadge`, and their transitively required parameters, page/item/anchor/badge DTOs, problem responses and error-catalog entries. Source F2 confirmation-list/response operations, confirmation DTOs, history/day contracts and individual BFF justification routes were not imported. The badge's existing `confirmationCount` is preserved without adding a route to justify or answer that count. The 0.0.96/0.0.85 legacy contract provenance is from the approved same-repository source revision and is not an assertion that that source's backend code has been approved or deployed.

## Contract rules

- Routes are defined in the Main and BFF attendance inbox service files. Every route requires bearer authentication and an active membership in `businessId`; OWNER, MANAGER and EMPLOYEE receive identical caller-owned data scope. A membership role never grants access to another worker's data.
- Only lifecycle OPEN incidents are represented. RESOLVED incidents stay historical and are not listed, returned as current members, or changed by grouped justification. `correctionReason` on WorklogChange and an incident `resolutionReason` remain separate concepts; `CORRECTED` alone does not establish a justification or infer its origin. UI behavior is not verified by this specification.
- `S-{scheduledShiftId}` is a SHIFT group: all caller-owned OPEN SHIFT-scope incidents on the shift plus caller-owned OPEN MATCH-scope incidents whose current MATCHED matches reference it. `M-{attendanceMatchId}` is UNMATCHED for current non-MATCHED kinds; its identity is stable until matching canonicalizes it. `kind` is only SHIFT or UNMATCHED (never MATCH). GET of a newly matched M id exposes the canonical S id; POST against stale M returns 409 with `currentGroupId`. Reassignment moves eligible members without rewriting their incident evidence and changes the revision.
- Optional date uses the scheduled shift start date or, for UNMATCHED, worklog clock-in date in the business `ZoneId`, with `[startOfDay, nextStartOfDay)` boundaries. DST produces 23/25-hour dates as appropriate; overnight shifts belong to their start date. Filters apply before keyset pagination. Default justification filter is ALL; JUSTIFIED includes COMMON and LEGACY_SINGLE, while NONE/PARTIAL/NOT_COMMON are UNJUSTIFIED.
- Group order is `anchorAt` DESC, `kindRank` ASC (SHIFT 0, UNMATCHED 1), then `anchorId` DESC. Cursor binds business, caller, date, filter and zone; a scope/filter mismatch is 400. This is live keyset pagination, not a global snapshot: anchor movement, eligibility, assignment and M→S canonicalization can require refreshing and do not promise gap/duplicate-free traversal. One response reads a group and its full member set repeatably; `asOf` is informational.
- Revision is `rv1-` plus unpadded base64url SHA-256 (43 characters) of canonical JSON containing business id, caller id, canonical group id, business zone, anchor, ordered match ids, and each incident id/version/lifecycle/assignment. It changes for membership, state, anchor or assignment changes. Request text is 1..500 characters, non-blank, stored exactly without trim; body rejects additional properties. A common command targets the complete group only, never arbitrary incident ids.
- Justification states: COMMON means every current OPEN member has the same group-level text (including a surviving subset after resolution); LEGACY_SINGLE is one legacy individual justification; PARTIAL means some OPEN members have text; NOT_COMMON means all have text but the values differ (do not fabricate common text); NONE means none. `legacy` identifies legacy-origin values. Member justifications use COMMON or INDIVIDUAL origin. Nullable fields are present as null; all other response properties are required.

## Proposed atomic persistence protocol (not implemented)

The design proposes minimal group/common-justification records, append-only prior-value baseline evidence and per-incident markers. Before activating persistence, policy owners must decide retention; retention remains undecided (no indefinite or four-year assumption). Baseline capture must preserve pre-existing individual text and author/time evidence; new common records preserve exact text, actor and timestamp. Group-level common text is not copied into history by rewriting incidents.

For grouped POST, lock order is L1 business shared, then L2 employee exclusive. Multiactor/ancla-changing writers take L1 exclusive before changing state. Under explicit READ COMMITTED, revalidate active membership/authorization after acquiring the guard, load the complete OPEN set, compare the submitted revision, and atomically write common group justification plus append-only evidence/incident markers. Do not justify resolved members and do not resolve any incident. A transaction lock timeout maps to 503/1149 with `Retry-After: 1`.

Exact replay is allowed only for the same baseline, exact text, caller and exact current post-revision. Resolving a subset preserves common group text for remaining OPEN members but invalidates replay. A newly eligible incident changes revision and receives no implied consent. Every writer that can affect membership, incident state, assignment, anchor, authorization or protected evidence—including existing individual justification, correction/rejection, reconciliation, resolution, attendance writes and membership revocation—must adopt the compatible lock protocol before this API can be activated. The same applies to future writers that must reject protected-history mutation with 1150. No triggers, migrations, runtime changes or writer adoption are included here. Cascade/delete protection and immutable identity triggers are future requirements, not tested or present-tense guarantees.

## Functional error allocation

| Code | HTTP | Symbol | Scope |
|---:|---:|---|---|
| 1142 | 400 | INVALID_ATTENDANCE_INBOX_CURSOR | Retained legacy individual list cursor; not reused. |
| 1144 | 400 | REQUEST_INVALID | Invalid date/limit/body or invalid group request. |
| 1145 | 400 | CURSOR_INVALID | Invalid cursor or business/caller/date/filter/zone mismatch. |
| 1146 | 404 | NOT_FOUND | Missing or caller-inaccessible current group. |
| 1147 | 409 | REVISION_CONFLICT | Stale membership/state/anchor/assignment revision or stale M→S canonical id. |
| 1148 | 409 | NOT_OPEN | No current eligible OPEN members for a group command. |
| 1149 | 503 | LOCK_TIMEOUT | Lock timeout, `Retry-After: 1`. |
| 1150 | 409 | HISTORY_PROTECTED | Reserved design requirement for future history-mutating writers; not emitted by current group GET/POST. Future correction, rejection, resolution/reconciliation, membership/delete and other history-changing writers must emit it when they would mutate protected evidence, after adopting the guard protocol. |

These are free after checking the retained source catalog through 1143 and current target catalog/operation references. `x-functional-errors`, examples and the `FunctionalErrorCode` enum/table are kept aligned. Code 1143 remains catalogued but its confirmation route is not imported.

For 1150, candidate future routes/writers that must consult the protection guard are `PUT /api/v1/businesses/{businessId}/worklogs/{worklogId}/correction`, `POST /api/v1/businesses/{businessId}/worklogs/{worklogId}/reject`, `POST /api/v1/businesses/{businessId}/attendance-matches/{attendanceMatchId}/resolution`, `POST /api/v1/businesses/{businessId}/scheduled-shifts/{scheduledShiftId}/no-show/acknowledge`, the existing individual `POST /api/v1/attendance-incidents/{incidentId}/justification`, attendance reconciliation, and membership removal `DELETE /api/v1/businesses/{businessId}/users/{userId}` where it would delete or cascade protected records. They emit 1150 only when they would mutate protected evidence; unchanged reads/updates remain unaffected. These are future adoption requirements, not changes to those routes in this phase.

## Acceptance matrix

| Scenario | Contract checked now | Runtime gate later |
|---|---|---|
| Phantom grouping / no cross-user disclosure | DTO scopes and group membership rules; active membership role does not widen caller scope | Multi-user DB fixtures; verify SHIFT joins and tenant/caller predicates under real queries |
| Concurrent list and membership mutation | Revision covers membership, state, assignment and anchor; live cursor has no global snapshot claim | Race writers against full-set read and confirm repeatable response within request |
| Auth revocation / membership removal | Authorization must be revalidated after lock; removed/non-member yields 403 or indistinguishable item 404 | Revoke session/membership while waiting for locks; prove no post-revocation write |
| Legacy individual justify | Legacy list and badge preserved; grouped command is distinct and never claims legacy individual writes are atomic | Ensure legacy writer adopts L1/L2 before group feature activation; verify compatibility |
| New incident creation | New eligible member changes revision and receives no implied group consent | Race creation/reconciliation with group POST; expect revision conflict and no partial writes |
| Reassignment / M→S | GET canonicalization and POST 409/currentGroupId specified | Exercise matched→unmatched and unmatched→matched transitions with evidence retained |
| Resolve one/all members | RESOLVED leaves active set/history; subset keeps common text, invalidates replay | Resolve concurrently with grouped POST and verify atomic revalidation and history safety |
| Replay/idempotency | Requires same baseline, exact text, caller and exact current post-revision | Test exact replay; reject different text/caller/baseline/post-revision and replay after subset resolution |
| Time-zone/DST/overnight | ZoneId start-day filter with half-open interval and 23/25-hour days | Exercise spring/fall transitions, overnight shift and unmatched clock-in boundaries |
| Cursor scope/order | Filter-before-keyset; tuple order and bound dimensions explicit; no global traversal guarantee | Reject tampered/foreign/date/filter/zone cursors and test ties/anchor movement |
| Privacy | Group DTO excludes author/resolver ids, evidence, reason and resolved members | Inspect serialized payloads and unauthorized ids under all membership roles |
| History protection and retention | 1150 reserved for future writers; retention undecided and activation gated | Decide retention; implement guard adoption, cascade/delete protection and identity trigger; verify actual runtime before release |

## Validation and release gates

Run the local contract checks documented with this change. Code generation was not executed: Java/codegen is not available on the inspected PATH. This is an explicit pending gate; lint/ref checks do not substitute for codegen. Runtime, concurrency/database and application/UI tests are not run and must not be reported as passing. Persistence activation is gated on writer lock adoption and an approved retention policy. Versions 0.0.97/0.0.86 are local specification drafts only, not tags/releases.
