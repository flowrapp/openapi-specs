# Worker attendance history, inbox and change confirmations

Contract design for t205u (Main API 0.0.96, BFF API 0.0.85). Spec only: no backend, BFF,
migration or app change is implied by this document or by the specs.

## Product decisions this contract follows

Confirmed by Sergio (t206s756, t206s761):

- A worker can justify their own attendance incidents. Management resolves them. A
  justification never resolves anything.
- The worker inbox («Bandeja») is separate from Peticiones (shift exchanges and schedule
  changes). Those collections and screens are unchanged.
- A worker can confirm that they reviewed an admin correction or rejection of their worklog, or
  record that they disagree. The worker never resolves anything with that answer.
- This is not a legal claim. Nothing in the contract states that a law requires it, and the
  wording does not present an answer as legal consent. Legal validation, if wanted, is a
  separate task (see the team study t205u, section 4.1).

Phases requested by Frontend and Backend:

- **F1**: day history by attendance row with incident state, and an inbox of incidents to
  justify, with the justification command.
- **F2**: one exact confirmation per management change, the worker answer, and a read-only
  view of that answer for the OWNER.

## Facts this design starts from (spec `main` f805532)

- `getDailyAttendance` already accepts an EMPLOYEE and restricts the day to their own shifts
  and worklogs. It returns `ShiftAttendanceDTO` (shift, matches, worklogs, incidents) and
  `UnmatchedAttendanceDTO` (UNSCHEDULED or AMBIGUOUS match, worklog, incidents).
- The justification route is `POST /api/v1/attendance-incidents/{incidentId}/justification`
  (`justifyAttendanceIncident`). It writes or replaces the text while the incident is OPEN. This
  contract does not add an `attendance/incidents` alias.
- `getWorklogHistory` returns the append-only `WorklogChangeDTO` list to the worker of the
  worklog and to the OWNER.
- `getAttendanceMatch` (`GET /api/v1/attendance-matches/{attendanceMatchId}`) returns a match
  of any kind only to the worker of its worklog, with its MATCH-scoped incidents; anyone else
  gets 404 `1074`. `getWorklogById` returns a worklog only to its worker (403 `1019`
  otherwise). Every worklog has exactly one current match (`attendance_matches.worklog_id` is
  unique, migration V40 backfilled NOT_APPLICABLE matches for older worklogs, and the match
  repository has no delete operation).
- `confirmWorklog` confirms a pending or automatically closed worklog. It is not an
  acknowledgement of an admin change and is not reused. `IncidentResolution.ACKNOWLEDGED` is a
  no-show resolution and is not reused. Shift exchanges and schedule changes (#80) are a
  different lifecycle and are not reused.
- The BFF worker history (`history/day|week|month`) had no incidents, matches or changes.

### Main source facts (backend `main` at `d35b137`, read-only inspection)

These were read in the Main source, not inferred from the spec. They are not HTTP-level tests.

- `getWorklogHistory` calls `Worklog.checkHistoryReadableBy`: the worker of the worklog or
  an OWNER of its business may read it; anyone else gets 403 `1020`. Unit tests cover the
  worker, the OWNER and the MANAGER/non-member cases. No permission changes here.
- `getAttendanceMatch` loads the match and returns 404 `1074` unless the caller is its
  worker; it does not filter by kind, so NOT_APPLICABLE, MATCHED, UNSCHEDULED and AMBIGUOUS
  are all readable by their worker. AMBIGUOUS has no `scheduledShift`, only candidates.
- `getWorklogById` requires a membership of the worklog business and that the caller owns
  the worklog (403 `1019` otherwise).
- The incident entity has `@Version version`, `@CreationTimestamp created_at` and
  `@UpdateTimestamp updated_at`; `justifyAttendanceIncident` takes no version from the client
  and overwrites `justification`, `justified_by` and `justified_at`.
- A scheduled shift has a NOT NULL `job_role_id` (FK to `business_job_roles`, no ON DELETE);
  job roles are only deactivated (`deleteBusinessJobRole` sets `active = false`).
  `getBusinessTeamSchedule` (any OWNER, MANAGER or EMPLOYEE member, published or
  previously published plannings) returns each shift's `jobRole` with the role's current
  `name`, joined live from that row. There is no role-name snapshot on the shift.
- Still to add with the implementation: HTTP integration tests of the authorization of
  `getWorklogHistory`, `getAttendanceMatch` and `getWorklogById` for the worker. They are a
  follow-up, not a blocker, and nothing here claims they exist.

## F1: day history and incident inbox

### Day history

`GET /api/v1/worker/businesses/{businessId}/history/day` gains the required `attendances`.
`totalSeconds` and `sessions` are unchanged.

- One SHIFT row per Main API shift attendance (`kind: SHIFT`, `scheduledShiftId`). Its
  `worklogs` are only those whose current match is MATCHED to that shift. Its `incidents` are
  the SHIFT-scoped incidents of the shift (NO_SHOW) and the MATCH-scoped incidents of those
  MATCHED matches. A NO_SHOW, or a shift whose only clock-ins are ambiguous candidates, is a
  SHIFT row with `worklogs: []`.
- One UNMATCHED row per distinct `match.id` whose current kind is UNSCHEDULED or
  AMBIGUOUS: the `unmatchedAttendances` plus the matches of those kinds that Main lists in
  `shiftAttendances[].matches` (an AMBIGUOUS worklog listed as a candidate of one or several
  shifts), deduplicated by `match.id`. The row has the worklog with `matchKind`, the incidents
  of that match (deduplicated by id), `planned: null`, `jobRoleId: null` and `jobRole: null`.
  No candidate shift or role is exposed.
- NOT_APPLICABLE and every other kind outside these rules is never a row. The worklog stays in
  `sessions` and is read with the match detail below.
- Each worklog appears in at most one row of the day and each incident only on the row of the
  match or shift that owns it. The BFF regroups by match id and kind only; it never pairs
  sessions and shifts by time and never chooses a candidate.
- SHIFT rows add `jobRoleId` (Main `scheduledShift.jobRoleId`, non-null in Main) and
  `jobRole` (`{id, name}` or null). The name comes from `getBusinessTeamSchedule`, the same
  member-visible read behind the worker team schedule. If the shift is not found there, or that
  read returns 404, `jobRole` is null and the app shows no role. A deactivated role still
  resolves. A renamed role shows its current name, because Main keeps no role-name snapshot.
  `getBusinessJobRoles` (OWNER or MANAGER) is not used.
- Each worklog has its current `version` (from `WorkLogResponseDTO`), EFFECTIVE breaks and
  `changes[]`, the subset of `WorklogChangeDTO` fields plus `confirmation`, without
  `authorId`. The worker sees no author and no management identity. `confirmation.respondedBy`
  can only be the worker.
- Incidents keep lifecycle, resolution, justification (`text`, `justifiedAt`), the resolution
  `reason`, `createdAt`, `updatedAt` and `version`, and add `canJustify` (true while OPEN). Not
  mapped: `resolvedBy`, `justifiedBy`, candidate shift ids and geofence checks.

Tests the BFF implementation must add (obligations, not results of this change): the
`attendances` worklog count equals the distinct non-NOT_APPLICABLE worklogs of the Main day,
with no duplicate for ambiguous candidates; every incident lands on its owner row for MATCHED,
UNSCHEDULED, AMBIGUOUS and SHIFT scope.

Call graph (BFF):

```text
stage 1 (parZip, with the existing day calls)
  └─ getDailyAttendance(businessId, date, userIds=[caller])
stage 2 (Semaphore(8))
  ├─ getWorklogHistory(worklogId) × distinct worklogs of the rows
  └─ getBusinessTeamSchedule(businessId, Monday of date, userIds=[caller]), once, only if a SHIFT row exists
```

The week and month views make no `getDailyAttendance` call, so a week never costs seven daily
reads plus one call per worklog.

### Own match detail

BFF `GET /api/v1/worker/attendance-matches/{attendanceMatchId}` (`getWorkerAttendanceMatch`)
returns `WorkerAttendanceMatchDetailDTO` for a match of any kind. It is the target of an
inbox item or deep link whose anchor has no `scheduledShiftId`, and the only worker view of a
NOT_APPLICABLE worklog. It always has the worklog.

```text
stage 1 (parZip)
  ├─ getAttendanceMatch(attendanceMatchId)      own match of any kind, else 404 1074
  └─ getUserBusinesses()                        business time zone, as the other worker endpoints
stage 2 (parZip)
  ├─ getWorklogById(match.worklogId)            own worklog only
  └─ getWorklogHistory(match.worklogId)         worker of the worklog
```

- Fields: `attendanceMatchId`, `matchKind`, `date` (same value as `anchor.date`),
  `scheduledShiftId` (MATCHED only, `scheduledShift.id`), `worklog` (same DTO as the day) and
  `incidents` (the match incidents, same `canJustify` rule).
- No planned shift and no job role. For MATCHED, the day history row has them.
  `candidateShifts`, candidate ids, geofence checks, reconciliation, origin and management
  identities are dropped.
- No OWNER or MANAGER route (`getBusinessAttendanceMatch`, `getShiftAttendance`), no
  date-range listing (`getUserWorklogs`, `getDailyAttendance`) and no conditional fallback.
  If the match business is not among the caller's businesses, the BFF returns the same 404
  `1074`. No new Main API operation.

### Incident inbox

Main: `GET /api/v1/businesses/{businessId}/attendance-incidents`
(`getCurrentUserAttendanceIncidents`). BFF: `GET /api/v1/worker/businesses/{businessId}/attendance-incidents`,
one call, cursor forwarded.

- Rows: the caller's own OPEN incidents in the business whose current `justification` is null
  (`justification IS NULL`). This is the only line between inbox and history.
- After a justification the incident leaves the inbox and stays in the day history and the
  match detail, where it can still be replaced while OPEN. A RESOLVED incident is history
  only. An OPEN incident without text (new, or brought back by reconciliation) is listed.
  One that keeps a saved text is not. This contract never forces deleting a saved text.
- Order: `updatedAt` descending, then `id` descending, keyset cursor. New or changed incidents
  sort before the cursor and appear on the next refresh. They never make the next page skip
  or repeat an unchanged row. No exact total.
- `updatedAt` is the persisted incident value, read literally. The Main entity (verified at
  `d35b137`) stores it as the `Instant` column `updated_at` with `@UpdateTimestamp`. It is not
  derived or recomputed at read time. This contract adds no other update trigger and no
  delivery guarantee.
- `anchor` (`date`, `scheduledShiftId`, `attendanceMatchId`, `worklogId`) comes from stored
  relationships. `scheduledShiftId` is set for SHIFT scope and for a MATCHED match, and null
  for UNSCHEDULED, AMBIGUOUS and NOT_APPLICABLE: the server never picks the original or a
  candidate shift. `attendanceMatchId` is always the real current match id of a MATCH-scoped
  incident or of a changed worklog, NOT_APPLICABLE included. It is null only for a
  SHIFT-scoped incident (NO_SHOW), which has no match. The route already gives the business,
  so the item does not repeat it.
- Navigation: with `scheduledShiftId`, open the day `date` and its SHIFT row. Otherwise open
  `GET /api/v1/worker/attendance-matches/{attendanceMatchId}`, which is never empty.
- `anchor.date` is for navigation only. It is never a sort key, a filter or part of the
  cursor, and it never replaces `updatedAt`.
- No read or unread state. An item is listed while it is actionable.

Justification from the worker app: `PUT /api/v1/worker/attendance-incidents/{incidentId}/justification`
forwards to the literal Main API POST and returns the updated incident.

- While OPEN, `canJustify` means create or replace, from the inbox, the history or the
  detail, as often as needed. The latest saved text replaces the previous one. `justifiedAt`
  and `updatedAt` take the time of that write, and `createdAt` keeps the incident creation. No
  earlier text is kept.
- The body has no expected version, and Main checks none from the client. Between two writes
  of the same worker the later persisted one is the stored text: last write wins, not first.
  The response `version` (Main `@Version`) is output metadata only. This contract claims no
  client-side optimistic locking.
- Errors stay as they are: 404 `1085`, 409 `1112` (no longer OPEN, including a resolution in
  between), 409 `1049` (the existing concurrent-modification error) and 400 `1113`.

## F2: worklog change confirmations

### Model

`WorklogChangeConfirmation` is persistent, one per `worklogChangeId` (unique), owned by the
immutable `WorklogChange.userId`.

| Field | Value |
|---|---|
| `status` | `PENDING`, `ACKNOWLEDGED` or `DISPUTED` |
| `comment` | `string \| null`, trimmed, 1–500, optional with both answers |
| `respondedBy` | `null` while PENDING, then the worker |
| `respondedAt` | `null` while PENDING |
| `version` | 0 while PENDING, incremented by the answer |

- Created PENDING atomically, in the same transaction as the change, only for a management
  CORRECTED (`correctBusinessWorklog`) or REJECTED (`rejectWorklog`) change made by someone
  other than the worker, after the rollout.
- Never created for a worker's own correction, break corrections and voids, AUTO_CLOSED or
  MEMBER_REMOVED_CLOSE. There is no backfill.
- `WorklogChangeDTO.confirmation` is required and nullable. **`null` means that no
  confirmation was requested** (legacy, own, break or system change). It never means
  "reviewed" or "no disagreement".
- A later management change of the same worklog is a new change with its own PENDING
  confirmation. Each PENDING confirmation stays independent: a later change of any kind never
  cancels, invalidates or answers an earlier one.
- An answer never reverts the change, never changes the worklog or its `reviewStatus`, never
  gates reports, PDFs or invoices, and never resolves an incident. A comment is not a
  justification. Corrections stay approved immediately and rejections are unchanged.

### Answer

`PUT /api/v1/worklog-changes/{worklogChangeId}/confirmation` with body
`{status: ACKNOWLEDGED|DISPUTED, comment?, version}`. BFF:
`PUT /api/v1/worker/worklog-changes/{worklogChangeId}/confirmation`, the literal Main API path,
with the caller's token only.

| Situation | Result |
|---|---|
| PENDING, same version | 200, answer stored, version + 1 |
| Same status, same trimmed comment, version it was answered from | 200, idempotent, no write |
| Other answer after it was answered, or stale version | 409 `1049` |
| Change missing, another worker's, or `confirmation: null` | 404 `1143`, same body |
| Invalid body (status, blank or long comment, version) | plain 400 |

### Pending list and badge

- Main `GET /api/v1/businesses/{businessId}/worklog-change-confirmations`, BFF
  `GET /api/v1/worker/businesses/{businessId}/worklog-change-confirmations`. Always PENDING
  and the caller's own. Order `occurredAt` descending, then `id` descending, keyset. A
  PENDING row does not change until it is answered, so this key is stable. The incident
  inbox uses `updatedAt` because incidents change while they stay open. Each item is the full
  change plus the same `anchor` and the required `laterChangeExists`. Main reads the anchor
  through an explicit join from the change to the current match of its worklog, never one
  lookup per item. The cursor and the order are unchanged.
- `laterChangeExists` (Main `CurrentUserWorklogChangeConfirmationDTO`, BFF
  `WorkerWorklogChangeConfirmationItemDTO`) is true when the same worklog has any
  `WorklogChange` after this one in (`occurredAt`, `id`) order, whatever its action or author:
  management, the worker's own corrections, break corrections and voids, AUTO_CLOSED and
  MEMBER_REMOVED_CLOSE. Main derives it in the same page query (an aggregate or EXISTS over
  the worklog changes), never one query per row. The app shows «Hay un cambio posterior».
  The item stays PENDING and is answered with the same body, version and state rules. The
  flag is not part of the order, the filter or the cursor.
- Badge: Main `GET /api/v1/businesses/{businessId}/attendance-inbox/badge`, BFF
  `GET /api/v1/worker/businesses/{businessId}/attendance-inbox/badge`. Two separate counts,
  `incidentCount` and `confirmationCount`, with the same filters as the lists. The app keeps
  incidents and confirmations in separate sections and never pages to count.
- No synthetic accepted or rejected request appears in Peticiones. The list is unrelated to
  shift exchanges, schedule changes and `confirmWorklog`.

### OWNER visibility

The OWNER attendance detail (`AttendanceWorklogChangeDTO`) gains the read-only
`confirmation`. It comes from the `getWorklogHistory` call the detail already makes. There is
no owner inbox, no filter and no owner action.

The OWNER reads each change on its own through the existing `getWorklogHistory` and the
read-only, nullable `WorklogChangeDTO.confirmation`: `null` (no confirmation requested),
`PENDING`, `ACKNOWLEDGED` or `DISPUTED`, with the worker's `comment`, `respondedBy` and
`respondedAt`. That is the whole minimal slice. Grouping, a DISPUTED filter and owner actions
are out of the initial phase and a future separate decision, not ruled out for good. Existing
incident management keeps resolving incidents through the existing Main API contracts; F2 adds
no admin command. An ACKNOWLEDGED answer supports no legal conclusion.

## Delivery slices

Each slice ships on its own. F1 never depends on anything F2 creates.

- **F1**: day history rows with incidents, `canJustify`, `justification`, incident
  `createdAt`, `updatedAt` and `version`, and the SHIFT row `jobRoleId` and `jobRole`; the
  justification command (the existing Main API POST behind the BFF PUT); the worker-only
  incident list (`getCurrentUserAttendanceIncidents`), which returns incident items only; and
  the own match detail (`getWorkerAttendanceMatch`). The list filter is what `incidentCount`
  counts, but the badge endpoint ships in F2. F1 ships no partial badge and no field that
  Main does not provide.
- **F2**: the confirmation commands and reads, independent of F1: the answer
  (`respondToWorklogChangeConfirmation`), the worker pending list
  (`getCurrentUserWorklogChangeConfirmations`, with `laterChangeExists`), the complete badge
  with `incidentCount` and
  `confirmationCount`, and the nullable `WorklogChangeDTO.confirmation` the OWNER already
  reads.
- Before F2 no confirmation exists, so every `confirmation` reads `null`. The versioned shape
  stays as published: the field is not removed, swapped or given another meaning before F2.
- Not in the first delivery and not a gate for F1: new OWNER aggregation, a DISPUTED filter or
  list, push notifications and admin commands. The outbox event names in
  `docs/worker-inbox-events.md` are optional future additions, not implemented.
- No new release, tag or version bump: Main API 0.0.96 and BFF API 0.0.85 stay as they are.
- No new Main API operation: the match detail composes the existing `getAttendanceMatch`,
  `getWorklogById`, `getWorklogHistory` and `getUserBusinesses`, and the job role name uses the
  existing `getBusinessTeamSchedule`. No owner mutation, no push and no gateway change.

## Decisions that differ from the brief

The brief allowed refinements to fit repository conventions. Each one is listed here.

1. **One field name, `status`.** The brief used `status` in the read DTO and `state` in the
   request. Both use `status`, the name every other lifecycle in the specs uses.
2. **Error names.** `1142` is `INVALID_ATTENDANCE_INBOX_CURSOR`, after `INVALID_SEARCH_CURSOR`
   and `INVALID_SHIFT_CHANGE_CURSOR`. The brief proposed `EMPLOYEE_INBOX_CURSOR_INVALID`.
   `1143` is `WORKLOG_CHANGE_CONFIRMATION_NOT_FOUND`, not `WORKLOG_CHANGE_NOT_FOUND`, because
   it also covers an existing own change that has no confirmation.
3. **No `businessId` in the two BFF commands.** The routes are
   `PUT /api/v1/worker/attendance-incidents/{id}/justification` and
   `PUT /api/v1/worker/worklog-changes/{id}/confirmation`. The Main API routes are not
   business-scoped, and the Main API incident response has no `businessId`. The BFF could not
   check a route business without an extra read, so the parameter would have been decorative
   and a mismatch would have passed silently. Ownership stays the only rule.
4. **`limit` outside 1–50 is a plain 400.** The shift-change lists use a functional code for
   this. Here no extra code is added, following the brief's "generic 400" for invalid bodies.
5. **No author for the worker.** `WorkerWorklogChangeDTO` has no `authorId` and no name. The
   Main API `WorklogChangeDTO.authorId` stays for the OWNER views, which keep `author`. A
   non-null `confirmation` already shows the change came from management.
6. **No owner action or filter on DISPUTED.** As in the brief: visibility only.
   This scopes the initial phase; anything more is a future separate decision.

## Known limitations and open points

- `getDailyAttendance` does not list a worklog whose match is NOT_APPLICABLE (no published
  planning that day), so it is never a day history row. Its anchor has
  `scheduledShiftId: null` and the real `attendanceMatchId`. The app opens
  `getWorkerAttendanceMatch` for it, never a broken day-history link.
- `getWorklogHistory` accepts the worker of the worklog. This was verified in the Main source
  at `d35b137` (`checkHistoryReadableBy`, worker or OWNER, with unit tests); an earlier
  implementation (#169) had required OWNER or MANAGER. Permissions are not widened. An HTTP
  integration test of this authorization stays a follow-up for the implementation, not a
  blocker.
- `jobRole` is the role's current name, not the name it had when the shift was planned: Main
  keeps no role-name snapshot. It is null when `getBusinessTeamSchedule` does not return the
  shift. `planned.shiftName` never replaces it.
- `getDailyAttendance` dates an attendance by shift start, or by clock-in when there is no
  shift. `sessions` keep the existing BFF rule. Around midnight the two lists may disagree.
- Rollout order: Main API 0.0.96 first, then BFF 0.0.85. The new response fields are
  required.
- The push notification and deep link are specified as events only
  (`docs/worker-inbox-events.md`). No push code, and no navigation parameters in the app, are
  part of this change.
- Not covered: deadlines or expiry of PENDING, what happens after DISPUTED, departed workers,
  showing confirmations in PDFs, and legal review. These stay product decisions.
