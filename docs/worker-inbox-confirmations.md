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
- `confirmWorklog` confirms a pending or automatically closed worklog. It is not an
  acknowledgement of an admin change and is not reused. `IncidentResolution.ACKNOWLEDGED` is a
  no-show resolution and is not reused. Shift exchanges and schedule changes (#80) are a
  different lifecycle and are not reused.
- The BFF worker history (`history/day|week|month`) had no incidents, matches or changes.

## F1: day history and incident inbox

### Day history

`GET /api/v1/worker/businesses/{businessId}/history/day` gains the required `attendances`.
`totalSeconds` and `sessions` are unchanged.

- One row per Main API shift attendance (`kind: SHIFT`, `scheduledShiftId`) and one per
  unmatched attendance (`kind: UNMATCHED`, `attendanceMatchId`). A NO_SHOW is a SHIFT row
  without worklogs.
- Worklogs carry their `attendanceMatchId` and `matchKind`. In a SHIFT row, an AMBIGUOUS
  worklog is a candidate (Main API includes candidates). The same worklog also has its own
  UNMATCHED row. The BFF never pairs sessions and shifts by time.
- Each worklog has its current `version` (from `WorkLogResponseDTO`), EFFECTIVE breaks
  and `changes[]`, the exact subset of `WorklogChangeDTO` fields plus `confirmation`.
- Incidents keep lifecycle, resolution, justification (`text`, `justifiedAt`) and the
  resolution `reason`, and add `canJustify` (true while OPEN).

Call graph (BFF):

```text
stage 1 (parZip, with the existing day calls)
  └─ getDailyAttendance(businessId, date, userIds=[caller])
stage 2 (Semaphore(8))
  └─ getWorklogHistory(worklogId) × distinct worklogs of the rows
```

The week and month views make no `getDailyAttendance` call, so a week never costs seven daily
reads plus one call per worklog.

### Incident inbox

Main: `GET /api/v1/businesses/{businessId}/attendance-incidents`
(`getCurrentUserAttendanceIncidents`). BFF: `GET /api/v1/worker/businesses/{businessId}/attendance-incidents`,
one call, cursor forwarded.

- Rows: the caller's own OPEN incidents in the business with `justification` null.
- After a justification the incident leaves the inbox and stays in the day history, where it
  can still be replaced while OPEN. A RESOLVED incident is history only.
- Order: `updatedAt` descending, then `id` descending, keyset cursor. New or changed incidents
  sort before the cursor and appear on the next refresh. They never make the next page skip
  or repeat an unchanged row. No exact total.
- `anchor` (`date`, `scheduledShiftId`, `attendanceMatchId`, `worklogId`) comes from stored
  relationships. For an AMBIGUOUS or UNSCHEDULED match `scheduledShiftId` is null: the server
  never picks the original or a candidate shift. The route already gives the business, so the
  item does not repeat it.
- No read or unread state. An item is listed while it is actionable.

Justification from the worker app: `PUT /api/v1/worker/attendance-incidents/{incidentId}/justification`
forwards to the literal Main API POST and returns the updated incident.

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
  confirmation.
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
  change plus the same `anchor`. Main reads the anchor through an explicit join from the change
  to the current match of its worklog, never one lookup per item.
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
5. **Author names are not resolved for the worker.** The Main API user directory
   (`getBusinessUsers`) is OWNER or MANAGER only. Worker DTOs keep `authorId`. A non-null
   `confirmation` already shows the change came from management.
6. **No owner action or filter on DISPUTED.** As in the brief: visibility only.

## Known limitations and open points

- `getDailyAttendance` does not list a worklog whose match is NOT_APPLICABLE (no published
  planning that day). A MATCH item in this state has both `anchor.scheduledShiftId` and
  `anchor.attendanceMatchId` null. The client can justify it or review/answer its correction
  directly from the inbox and must not offer a broken day-history link. The anchor does not
  infer a match relation that the daily query cannot currently provide.
- `getWorklogHistory` must accept the worker of the worklog, as the spec already says. The
  team study recorded that an earlier implementation (#169) required OWNER or MANAGER. Backend
  must verify this before the BFF day enrichment ships.
- `getDailyAttendance` dates an attendance by shift start, or by clock-in when there is no
  shift. `sessions` keep the existing BFF rule. Around midnight the two lists may disagree.
- Rollout order: Main API 0.0.96 first, then BFF 0.0.85. The new response fields are
  required.
- The push notification and deep link are specified as events only
  (`docs/worker-inbox-events.md`). No push code, and no navigation parameters in the app, are
  part of this change.
- Not covered: deadlines or expiry of PENDING, what happens after DISPUTED, departed workers,
  showing confirmations in PDFs, and legal review. These stay product decisions.
