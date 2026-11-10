# Changelog

## 0.0.109

Spec only. No Main API implementation in this change. Coordinate with BFF API 0.0.99. This is a draft increment of `info.version`, not a repository tag.

### Added

- `failureCode` and `failedAt` (both nullable, not required) on `PlanningResponseDTO`, `PlanningGenerationDTO` and `PlanningGenerationWeekDTO`. `failureCode` is an open string (`PlanningFailureCodeDTO`, `x-extensible-enum`, not a closed `enum`) with known values `SOLVER_REJECTED`, `SOLVER_UNAVAILABLE`, `SOLVER_FAILED` and `INTERNAL`; clients must tolerate unknown values. It is only meaningful when `status` (or `planningStatus`) is `FAILED`. `failedAt` uses the same `date-time` format as `createdAt`.

### Changed

- `failureReason` `maxLength` increased from 500 to 1000 on the same three schemas. The field remains a sanitized diagnostic for operators and support, not for display in the owner UI (the app shows copy from `failureCode`).

## 0.0.102 (local spec draft; not a release or repository tag)

Description-only update for backend change `correction-accepts-remaining`: management worklog and break corrections reconcile attendance incidents synchronously, accepting remaining temporal deviations and leaving structural incidents open. No paths, schemas, enums or operationIds changed.

## 0.0.97 (local spec draft; not a release or repository tag)

Spec only. No Main API implementation is included. Requires coordinated BFF 0.0.86. Java/codegen was omitted by Sergio's direct decision (t37u: «No hace falta que valides nada con Java») and is not a phase-1 delivery gate. Runtime/concurrency/database behavior remains unverified; persistence activation and release remain gated on compatible writer-lock adoption and an approved retention policy, as described in `docs/attendance-incident-groups.md`.

### Added

- Caller-scoped `GET /api/v1/businesses/{businessId}/attendance-incident-groups`, `GET .../{groupId}` and `POST .../{groupId}/justification`. Any active membership role may read or justify only their own data. Groups are canonical `S-{scheduledShiftId}` SHIFT groups or `M-{attendanceMatchId}` UNMATCHED groups; OPEN incident aggregation, business-zone date filtering, JUSTIFIED/UNJUSTIFIED filtering, live keyset pagination, full-member response snapshots and revision-safe atomic common justification are specified in the new design note.
- Legacy `getCurrentUserAttendanceIncidents` listing from approved source commit `92f0504`, restricted to that operation and its necessary DTOs/refs. Legacy list retains OPEN + justification IS NULL, `limit` 1..50/default 20 and updatedAt DESC/id DESC. Source `92f0504` also had a standalone badge; it is not carried over, and its two counts are exposed only as group-page `summary`. No confirmation endpoint is added. Code 1142 remains the legacy list cursor error.
- New functional codes 1144–1149 for grouped request validation, scoped cursor, group not found, revision/canonicalization conflict, no-open group and lock timeout. Code 1150 is catalogued as a future-writer history-protection requirement only; these GET/POST routes do not emit it.
- Bumped local OpenAPI version to 0.0.97. This is a draft increment, not a release or tag.
- Group-list pages now require `totalGroupsMatchingFilters` (complete matching OPEN groups after filters, before cursor/limit) and `AttendanceInboxSummaryDTO` as global caller/business `summary`. The list, exact total, global summary and complete members are specified to share one `REPEATABLE READ READ ONLY` transaction per response; count failure fails the response, while later pages remain independent live snapshots.
- Group-list examples include required counts and an empty filtered result with nonzero global summary; acceptance/runtime gates are updated in `docs/attendance-incident-groups.md`.

## 0.0.95

Spec only. No backend implementation and no repository tag in this change. Coordinate with BFF API 0.0.83.

### Added

- `POST /api/v1/businesses/{businessId}/invitations/{invitationId}/resend` (`resendBusinessInvitation`, tag Invitations, OWNER only): resends and reactivates an existing invitation whose stored status is `PENDING` (expired by date or not) or `EXPIRED`. It does not create an invitation: the same invitation goes back to `PENDING` and `expiresAt` becomes the resend moment plus seven days; `id`, token, invitee, role, contract, `createdAt` and the remaining data are preserved (the token is not regenerated). The email is sent asynchronously: the existing event that `createBusinessInvitation` publishes is published again through the outbox. No request body. `200` returns `InvitationResponseDTO` with status `PENDING` (same mapping as `createBusinessInvitation`). Functional errors: `404` `1006` (business), `404` `1005` (invitation missing or of another business), `403` `1020` (not the OWNER), `403` `1013` (terminal status `ACCEPTED` or `DECLINED`). Each invitation can be resent at most once every 10 minutes: after those checks, a resend of the same invitation less than 10 minutes after its previous resend returns `429` `1141` with a `Retry-After` header (whole seconds, rounded up, at least 1). The cooldown is per invitation and recorded by the server; the creation email does not count, so the first resend is always accepted; exactly 10 minutes later a resend is accepted; of several simultaneous resends of the same invitation only one is accepted and the others get `429`. A `429` does not change the invitation and does not publish the email. New functional error `1141` `INVITATION_RESENT_TOO_SOON` (429, `invitation was resent too recently`). No new response fields and no global rate limit.

## 0.0.94

Spec only. No backend implementation and no repository tag in this change. The partial unique index described on open shift-change requests is the intended constraint, not an applied migration.

### Added

- Shift exchange requests under `/api/v1/businesses/{businessId}/shift-exchange-requests`: reciprocal swap of two concrete published assignments (`scheduled_shifts.id`), including across planning weeks. `PENDING_PEER` → `PENDING_OWNER` → `APPLIED`, plus terminal `REJECTED`, `CANCELLED`, `EXPIRED` and `SUPERSEDED`. The counterpart accepts. Only an OWNER approves and applies. A MANAGER has no new permission.
- Schedule change requests under `/api/v1/businesses/{businessId}/schedule-change-requests`: an OWNER proposes `before` and `after` for one future assignment. A holder-only change is accepted by the incoming person and the outgoing person is notified. A holder-and-schedule change is accepted by the incoming person and the current holder. With no planning warnings the last acceptance applies it. With warnings the status stops at `PENDING_OWNER` until the OWNER approves with `warningsFingerprint` and `override.accepted: true`.
- At most one open request per (`scheduled_shift_id`, `original_user_id`). An exchange reserves both assignments in one transaction. Detail returns full before/after snapshots. Owner detail adds typed warnings. Participants do not receive those fields. List pages are cursor pages (`content`, `hasNext`, `nextCursor`); an empty page is `content: []` and `nextCursor: null`.
- List filters for the independent Solicitudes screen, which Horario only links to. Worker `direction=RECEIVED` (the caller must answer and did not create the request) or `direction=SENT` (`createdBy`). OWNER `lifecycle=OPEN` is every non-terminal status, including those not yet waiting on the OWNER, and `lifecycle=TERMINAL` is Historial. The two collections stay separate. No vacation type and no combined endpoint. Empty tabs are `content: []` and `nextCursor: null`.
- A different puesto does not reject an exchange or a reassignment. It is a `JOB_ROLE_MISMATCH` warning on the OWNER detail (`ShiftExchangeRequestOwnerDTO` / `ScheduleChangeRequestOwnerDTO`). Participant and list schemas have no warning fields. Rejection `reason` is required for the worker and the OWNER.
- GET detail adds `viewerRole` (`PARTICIPANT` or `OWNER`) as the discriminator. A rejected request includes `rejection` (actor from the JWT, reason, `rejectedAt`) on GET and on the list row. The OWNER detail adds `blockers`, which an override cannot clear. Historial's explicit status list is the five terminal statuses.
- Functional errors `1127`–`1140`. A request the caller must not see is `404` `1134` or `1135`, the same body as a missing id.

## Unreleased

### Added

- Functional error catalog: `1115` `INVALID_ATTENDANCE_PERIOD` (400, `attendance week or date is invalid`). It is raised by the BFF attendance screens (BFF 0.0.66: invalid `week` or `date`, or a `date` outside `week` in Hours); no Main API operation returns it, so the Main API contract and version do not change.
- Functional error catalog: `1126` `BUSINESS_MEMBER_NOT_FOUND` (404, `user is not an active member of the business`). It is raised by the BFF member profile (BFF 0.0.69, `getBusinessMemberProfile`); no Main API operation returns it, so the Main API contract and version do not change.

## 0.0.92

Proposed for repository tag after `v0.0.101` (coordinate with BFF 0.0.79). Spec only; no backend implementation in this change.

### Added

- `GET /api/v1/businesses/{businessId}/job-roles` (`getBusinessJobRoles`): each `content` item is now `BusinessJobRoleListItemDTO` (same fields as `BusinessJobRoleResponseDTO` plus required `memberCount` ≥ 0): distinct active non-ADMIN members with a current contract on that role for the business-local today (`LocalDate.now(business.zone)`; current = `startDate <= today` and (`endDate` null or `>= today`), same rule as `getCurrentContractsForUsers`). Computed with one grouped query for the page ids, zeros and archived roles included; no N+1. POST/PUT keep `BusinessJobRoleResponseDTO` without `memberCount`. REST design chosen by Sergio (t580u): no aggregate subroute.
- `GET /api/v2/businesses/{businessId}/users` (`getBusinessUsersV2`): optional `jobRoleId` (int64, min 1). Filters to members with a current contract on that role today (same rule as `getCurrentContractsForUsers`), AND with `search`, before the page limit. Job role must belong to the business (active or archived); else 404 `1034`. Cursor is also bound to `jobRoleId`; incompatible reuse → 400 `1110`. Old cursors without `jobRoleId` stay valid when the filter is omitted. Order, `limit`, and response unchanged.

### Changed

- `createRecurringSchedule`, `replaceRecurringSchedule`, `createScheduleException`, `replaceScheduleException`: document that existing daily-shift references to an archived Shift may be kept (new inactive Shift refs → 404 `1061`) and that existing role demands for an inactive job role of the business may be kept (new inactive job-role demands → 404 `1034`), aligning archived job-role demand semantics with archived shifts (P4a F6). Description only; no new error codes.

### Fixed

- Documentation only, no contract or behaviour change and no version bump: `createBusinessInvitation`, `getBusinessInvitations` and `deleteBusinessInvitation` document `403` `1020` (`user is not the owner of business`), which is what the backend returns (`BusinessRoleService`), instead of `1011`. `1011` stays in the catalog.
- Documentation only: `businessUserId` in the geofencing and auto-clocking settings (`GeofencingUserSettingDTO`, `AutoClockingUserSettingDTO` and the path parameter of the two individual PATCH operations) is described as the user id, which is what the backend reads and returns (mapper source `businessUser.user.id`; `findByUserAndBusinessId(userId, …)`), not as the id of the membership row.

## 0.0.93

Next repository tag: `v0.0.103` (with BFF API 0.0.80), after `v0.0.102` (P4a: Main 0.0.92 / BFF 0.0.79). Spec only; no backend implementation in this change.

### Added

- Catalog Shift field `defaultBreakMinutes` (int32 ≥ 0) on `CreateBusinessShiftRequestDTO` (optional; omitted → 0), `UpdateBusinessShiftRequestDTO` (optional; omitted keeps stored value; not added to `required`), and `BusinessShiftResponseDTO` (required; always populated; 0 = no default break). Suggested unpaid planned break when a NEW daily occurrence is created by the client; never changes existing occurrences, schedule exceptions or plannings; not a clocked break. Validated `<` duration of `defaultStartAt`→`defaultEndAt` (start equal to end = 24h); otherwise 400 `1060` `INVALID_SHIFT`. No new error codes; no server-side propagation. `DailyShiftRequestDTO.breakMinutes` stays required and unchanged. Snapshot rule reinforced (Sergio t585u): the planning snapshot and each `scheduled_shift` keep the occurrence's effective `breakMinutes` and never read the catalog `defaultBreakMinutes` back, so editing the default cannot alter existing plannings, their net planned seconds or their assigned shifts.

## 0.0.91

Next repository tag: `v0.0.101` (Main API 0.0.91 and BFF API 0.0.78), not tagged yet.

### Fixed

- Documentation only, no schema or behaviour change: `409` errors the backend already returns are now listed.
  - `requestPlanningGeneration`: `1049` `CONCURRENT_MODIFICATION` (a week planning changed while the generation saved it, for example an OWNER edit of a draft that `replaceDrafts` regenerates; read it again and retry). Added to `x-functional-errors`, the `409` description and a `409` example.
  - `createRecurringSchedule` and `replaceRecurringSchedule`: `1055` `SCHEDULE_EXCEPTION_OVERLAPS` (with the schedule exceptions next to its validity, an opening interval that crosses midnight would collide with the opening of the following day). Added to `x-functional-errors` and to a new operation description, which also lists `1051` and, for the replace, `1049`. `deleteRecurringSchedule` does not run that check, so it does not get `1055`.
  - `createScheduleException`, `replaceScheduleException` and `deleteScheduleException` already listed `1055`; no change.

## 0.0.90

Release: repository tag `v0.0.100` (Main API 0.0.90 and BFF API 0.0.77).

### Added

- `GET /api/v1/businesses/{businessId}/planning-generations/input?weekStart=` (`getPlanningGenerationInput`, tag Planning, OWNER, `PlanningGenerationInputDTO`): read-only view of what a generation of that week would send to the solver, for the BFF weekly coverage («¿Llegas con tu equipo?»). The 7 dates with the effective day of each (the schedule exception of the date, else the recurring schedule with the latest `validFrom` effective on it, else an empty day), its `source` (`EXCEPTION`, `RECURRING_SCHEDULE`, `NONE`), `scheduleExceptionId`, opening intervals and shifts with their demands (`minimumEmployees`, `targetEmployees`, `maximumEmployees` per job role); and the contracts of the solver set (active members, intersecting the week), as `BusinessContractResponseDTO`. No proration in the Main API: the consumer applies the solver one. Past weeks allowed. `weekStart` not a Monday: `400` `1045`. Not the owner: `403` `1020`; unknown business: `404` `1006`. Nothing is written or locked. No migration. A week without any recurring schedule is not an error: its dates come with `source: NONE` and no shifts.
- `PlanningGenerationRequestDTO.replaceDrafts` (boolean, optional, default false) in `requestPlanningGeneration`. With true, a week of the period whose planning is DRAFT is regenerated on the same planning (like a FAILED one: back to CREATED, its scheduled shifts are replaced by the new result, new snapshot and job), so manual edits of that draft are lost: clients must warn first. Only DRAFT weeks are replaced. PUBLISHED and ARCHIVED keep `409` `1121`, CREATED and SOLVING keep `409` `1122`. Without the property nothing changes.

## 0.0.89

### Added

- Attendance incident type `OUTSIDE_GEOFENCE` in `AttendanceIncidentTypeDTO` (WARN geofence mark). Under the WARN geofencing policy a clock-in or clock-out more than 25 m (GPS margin) outside the business area (`distanceMeters > areaMeters + 25`), or without a device location, is let through and flagged for review: the worklog's match gets one open `OUTSIDE_GEOFENCE` incident (scope `MATCH`, at most one open per worklog, covering both actions), so the worklog is `PENDING_REVIEW` and counts as pending until it is reviewed. Only for a worklog whose match is `MATCHED`, `UNSCHEDULED` or `AMBIGUOUS` (the ones attendance shows); with a `NOT_APPLICABLE` match (no published planning that day) the check is recorded but no incident is opened, until the worklog is rematched to a planning. It is opened at clock-in when the clock-in is flagged, and by reconciliation after the clock-out when only the clock-out is. It is a normal review, not structural: it does not block `approveShiftAttendance` nor `approveBusinessWorklog`, both of which accept it; a correction (`CORRECTED`) or a rejection (`WORKLOG_REJECTED`) of the worklog also resolves it, and once a person resolves it it is not reopened. ALLOW never flags, and BLOCK keeps rejecting the action with `403` `1100`, so neither opens it. No push notification. This is an additive value in a response enum: clients must tolerate unknown values.
- `AttendanceIncidentEvidenceDTO.geofenceChecks` (array of `AttendanceGeofenceCheckDTO`: `action` `CLOCK_IN`/`CLOCK_OUT`, `outcome` `INSIDE`/`OUTSIDE`/`NO_LOCATION`, `distanceMeters` (null for `NO_LOCATION`), `areaMeters` (radius in force at the time) and `checkedAt`). For `OUTSIDE_GEOFENCE` it lists every WARN check of the worklog, the inside one included; empty for every other type. Always returned, not listed as required. The checks are append-only evidence; device coordinates are never stored or returned.

### Changed

- `clockIn`, `clockOut` and `GeofencingPolicy` describe the WARN flag above. Request bodies unchanged: the location stays optional.

## 0.0.88

### Added

- `POST /api/v1/businesses/{businessId}/scheduled-shifts/{scheduledShiftId}/clock-in-notices` (`notifyShiftClockIn`): the OWNER asks the worker of one scheduled shift to clock in. Per shift, only for a shift of a published planning (`404` `1076` otherwise), only from 15 minutes before `startAt` until `endAt` in the business time zone (`409` `1116`), only while the worker has not clocked in for the shift, clocked in and out included, and has no open worklog (`409` `1117`), only for an active member with a contract in force that day (`409` `1118`), and at most one notice per shift every 10 minutes (`429` `1119` with `Retry-After`). The notice is recorded with who and when in its own table and the push goes out asynchronously (outbox and RabbitMQ), so the response is `202` with `ClockInNoticeDTO`. OWNER only: `403` `1020`.
- `ShiftAttendanceDTO.clockInNotice` (`ShiftClockInNoticeDTO`: `lastNotice` and `blocker`, typed by `ClockInNoticeBlockerDTO`) in `getDailyAttendance` and `getShiftAttendance`, so the client can show «avisado hace X min» and enable the action without another call. Always returned, not listed as required.
- `POST /api/v1/businesses/{businessId}/planning-generations` (`requestPlanningGeneration`) and `GET /api/v1/businesses/{businessId}/planning-generations/{generationId}` (`getPlanningGeneration`): the OWNER requests the automatic generation (the existing Timefold flow) of an explicit period of whole weeks (`from` Monday, `to` Sunday, at most 4 weeks, starting at the current business-local week or later; only earlier weeks return `400` `1098`). The result is one DRAFT planning per week, never published automatically. `202` with `PlanningGenerationDTO` (status `PENDING`, `RUNNING`, `COMPLETED`, `FAILED`, and one entry per week) and a `Location` header. Errors: `400` `1120` or `1098`, `409` `1121` (a planning already exists in the period) or `1122` (a generation is in progress, double click included), `422` `1123` (no active member with a contract in the period) or `1124` (a week without a shift with staffing demand), `404` `1125`. OWNER only: `403` `1020`.
- Functional error catalog: `1116`–`1125`.

### Changed

- `createDraftPlanning`: the description points to `requestPlanningGeneration` for automatic generation. Behaviour unchanged.

## 0.0.87

### Added

- `GET /api/v1/businesses/{businessId}/reports` (`getBusinessReports`) and `GET /api/v1/businesses/{businessId}/attendance` (`getDailyAttendance`) accept an optional `jobRoleId` (int64) query parameter, filtered server-side and combined with `userId`/`userIds` using AND (M8). The job role is the one stored on the scheduled shift when it was created (`scheduled_shifts.job_role_id`), so a past day keeps the job role in force that day; worklogs count under the job role of their matched shift, and worklogs without a shift (unscheduled or ambiguous) under the job role of the member's contract in force that day.
- `GET /api/v1/businesses/{businessId}/attendance-matches/{attendanceMatchId}` (`getBusinessAttendanceMatch`): OWNER read of one attendance match of the business, returning `UnmatchedAttendance` (match, worklog and incidents), the same shape as an entry of `getDailyAttendance.unmatchedAttendances`. A match already assigned to a shift is still returned with `200`. Errors: `403` `1020` for anyone but the OWNER, `404` `1006` or `1074`.
- `GET /api/v1/businesses/{businessId}/team-schedules/{weekStart}` (`getBusinessTeamSchedule`) accepts optional repeated `userIds` and an optional `jobRoleId` (same job-role semantics, from `scheduled_shifts.job_role_id`), filtered server-side and combined using AND.

## 0.0.86

### Changed

- `GET /api/v1/worklogs/{worklogId}/history` (`getWorklogHistory`) returns the worklog change history read from the append-only `worklog_changes` table: a plain array of `WorklogChangeDTO` ordered by `occurredAt` ascending (then `id`). Each change has `id`, `worklogId`, `userId`, `businessId`, `action` (`WorklogChangeActionDTO`: `CORRECTED`, `REJECTED`, `BREAK_CORRECTED`, `BREAK_VOIDED`, `AUTO_CLOSED`, `MEMBER_REMOVED_CLOSE`), old and new clock-in and clock-out, a nullable `breakChange` (`WorklogBreakChangeDTO`), a nullable `authorId` (null for system actions), `reason` and `occurredAt`. Access: the worker of the worklog and the OWNER of its business; anyone else, MANAGER included, receives `403` `1020`. `404` `1017` when the worklog does not exist. This is a breaking change accepted in `.oasdiff-err-ignore.md`: the operation was never implemented.

### Removed

- `WorklogAuditEntryDTO`, `WorklogAuditSnapshotDTO`, `WorklogBreakAuditSnapshotDTO` and `WorklogAuditActorTypeDTO`, used only by the old `getWorklogHistory` response.

## 0.0.85

Released after 0.0.84 (PR #40, `periodType` on worked-hours reports).

### Added

- `GET /api/v1/businesses/{businessId}/reports` (`getBusinessReports`) accepts optional repeated `userIds` and `reviewStatus`. Each closed worklog is attributed to the business-local date of its clock-in, with seconds net of effective breaks. Without `reviewStatus`, only `CONFIRMED` and `APPROVED` count, as before.
- `GET /api/v1/businesses/{businessId}/attendance` (`getDailyAttendance`) accepts optional repeated `userIds`, restricting shifts, unmatched worklogs and the summary to those users.
- `ShiftAttendanceDTO.worklogs` lists the current worklogs of the shift with their `breaks`. `ShiftAttendanceDTO.approvalBlocker` is the nullable first reason `approveShiftAttendance` would refuse the shift, typed by the new `ShiftAttendanceApprovalBlockerDTO` (`SHIFT_NOT_FINISHED`, `RECONCILIATION_PENDING`, `OPEN_WORKLOGS`, `STRUCTURAL_INCIDENTS`).
- `GET /api/v1/businesses/{businessId}/scheduled-shifts/{scheduledShiftId}/attendance` (`getShiftAttendance`) returns the read-only `ShiftAttendance` of one shift. Errors: `403` `1020`, `404` `1006` or `1076`.
- `TeamScheduleShiftDTO.plannedSeconds` is the optional planned net seconds of the shift.

### Changed

- `getBusinessReports` documents OWNER or MANAGER access, matching the backend: anyone else receives `403` `1020` with the message `user is not an owner or manager of the business`, as the error catalog prescribes for OWNER-or-MANAGER operations. `getShiftAttendance` uses the same message.
- `AUTOMATIC_CLOSE` descriptions say the owner (not a manager) corrects or rejects the worklog, in line with the OWNER-only review below.
- `DailyAttendanceSummaryDTO.recordedWorkedSeconds` and `reportableWorkedSeconds` are documented as net of breaks.
- Review operations are OWNER-only across the app (M7): `approveShiftAttendance`, `acceptUnplannedAttendance`, `resolveAttendanceMatch`, `acknowledgeNoShow`, `approveWorklog`, `rejectWorklog`, `correctBusinessWorklog`, `correctBusinessWorklogBreak` and `voidBusinessWorklogBreak` now document that only the OWNER may call them; a MANAGER receives `403` `1020` (`user is not the owner of business`). Previously the descriptions allowed an OWNER or MANAGER. The schema does not change, so oasdiff does not report it, but it narrows who may call these operations: the backend must enforce it. `rejectWorklog` is included because rejecting is part of the same review.

## 0.0.84

### Added

- Optional `periodType` (`MONTH`, `YEAR`, `RANGE`; default `RANGE`) on `GET /api/v1/businesses/{businessId}/reports/worked-hours.pdf` (query) and `POST /api/v1/businesses/{businessId}/reports/worked-hours` (request body), defined once as `WorkedHoursReportPeriodTypeDTO`. `MONTH` requires `from`/`to` to cover exactly one calendar month, `YEAR` exactly one calendar year (January 1 to December 31; no fiscal years), and `RANGE` accepts any valid range as before. A mismatch returns `400` with the new functional code `1114` (`REPORT_PERIOD_TYPE_MISMATCH`, `from and to do not match periodType`). Omitting it behaves exactly as before (`RANGE`); nothing is inferred from the dates. A multi-employee PDF, including YEAR, is one single PDF, not a ZIP.
- Attendance incident type `AUTOMATIC_CLOSE` in `AttendanceIncidentTypeDTO`. The system opens it when it closes a worklog automatically after 24 hours without a clock-out. The clock-out time is a placeholder and not valid: the worklog does not count in totals or reports until a manager corrects the clock-out or rejects the worklog, and `POST /api/v1/businesses/{businessId}/worklogs/{worklogId}/approve` returns `409` `1067` while the incident is open. This is an additive value in a response enum: clients must tolerate unknown values.

### Changed

- Worked-hours reports are owner-only. `GET /api/v1/businesses/{businessId}/reports/worked-hours.pdf` no longer allows a MANAGER: like `POST /api/v1/businesses/{businessId}/reports/worked-hours`, only the business OWNER may call it, and anyone else receives `403` `1020` (`user is not the owner of business`).
- Worked-hours reports accept a period that ends after today for every `periodType` (for example the current month or year sent in full); the server truncates the effective end to today in the business time zone. A period whose `from` is after today returns `400`.

## 0.0.83

### Added

- `POST /api/v1/attendance-incidents/{incidentId}/justification` (`justifyAttendanceIncident`) lets the employee who owns the worklog or the shift write or replace the justification of an open incident. The incident stays OPEN. Blank or over-long text returns `400` `1113`. A resolved incident returns `409` `1112`. A missing incident, or one the caller does not own, returns `404` `1085`.
- `AttendanceIncidentDTO.justification` is an optional nullable object `{ text, justifiedBy, justifiedAt }`. `text` is at most 500 characters.
- `AttendanceMatchDTO.incidents` is an optional list of the match incidents, returned only to the owner of the worklog.
- Worklog review status `PENDING_RECONCILIATION`. Closing a worklog enters this state. Worklog listings still return it. Worked-hours reports count only `CONFIRMED` and `APPROVED`, so this state does not count until attendance reconciliation moves the worklog to `CONFIRMED` or `PENDING_REVIEW`.

### Changed

- `GET /api/v1/businesses/{businessId}/attendance` accepts an EMPLOYEE and returns the same daily schema restricted to that employee's shifts and worklogs. A caller who is not a member receives `403` `1015`.
- `attendanceMatchId` on clock-in stays required. The backend fills it with the match created for the worklog, including `NOT_APPLICABLE`.
- Attendance tolerance stays one field of the business. It is not a per-member setting and not a business-settings key. Only the OWNER may change it.
- `CORRECTED` and `WORKLOG_REJECTED` are not new incident actions. They come from `PUT /api/v1/businesses/{businessId}/worklogs/{worklogId}/correction` and `POST /api/v1/businesses/{businessId}/worklogs/{worklogId}/reject`.
- `GET /api/v2/businesses/{businessId}/users` documents `403` `1020` as `user is not an owner or manager of the business`. The code is the existing `USER_NOT_OWNER_OF_BUSINESS`. Owner-only operations keep the message `user is not the owner of business`.

### Breaking changes

- Removed the unimplemented weekly attendance period routes and schemas: `GET /api/v1/businesses/{businessId}/attendance-periods/{weekStart}`, and `POST` `bulk-approve`, `close`, and `reopen`. Functional codes `1089`–`1092` are removed with them.
- Functional codes `1086`, `1087`, and `1088` now match the backend enum: `401` `SESSION_EXPIRED` (`session expired`), `409` `PLANNING_ALREADY_EXISTS` (`a planning already exists for this business and week`), and `409` `PLANNING_VERSION_MISMATCH` (`planning version does not match`). Code `1095` is still `PLANNING_ALREADY_EXISTS` and is unchanged. This renumbering lives in the error catalog; oasdiff does not see it as a schema break.
- Adding `PENDING_RECONCILIATION` to `WorklogReviewStatusDTO` is a response enum addition. Clients that only accept the previous four values must accept this one. oasdiff reports it, and `.oasdiff-err-ignore.md` records that report together with the removed period routes.

## Unreleased

### Added

- Owner-only `DELETE /api/v1/businesses/{businessId}/users/{userId}` ends a user's membership in the business and returns `204` without a response body. Historical data (worklogs, contracts, reports) is preserved.
- Removing an OWNER returns `403` with functional code `1106` (`CANNOT_REMOVE_OWNER_FROM_BUSINESS`).
- `GET /api/v1/businesses/{businessId}/users` accepts optional `includeRemoved` (default `false`). When true, removed members are also returned with a non-null `removedAt` and a null `currentContract`, so historical plannings and reports can resolve their names. `BusinessUserResponseDTO` gains the optional nullable `removedAt`.

### Changed

- `GET /api/v2/businesses/{businessId}/users`: an empty or blank `search` now lists every active membership, same as omitting it. The `minLength: 2` constraint is removed from the schema. A non-blank value that normalizes to fewer than 2 characters still returns `400` `1107`.
- Contract deletion blocked by planning now returns functional code `1102` instead of `1098`, avoiding a collision with the backend's existing `PLANNING_CREATE_ON_PAST` error. Contracts starting today or earlier continue to return `1097`; both deletion conflicts use HTTP `409`.

## 0.0.69

### Added

- `GET /api/v2/businesses/{businessId}/users` (`getBusinessUsersV2`) returns a keyset page of active memberships (`content`, `hasNext`, `nextCursor`). Each item is the user and the membership role only: `userId`, `username`, `name`, and `role`. Email, the current contract, the job role, and presence are not included. Optional `search` matches the name only and must be 2 to 64 characters after trim and normalization. `limit` defaults to 20 and cannot exceed 50. The opaque cursor is bound to the business and the normalized search. `GET /api/v1/businesses/{businessId}/users` is unchanged.
- `GET /api/v1/businesses/{businessId}/contracts/current?userIds=` returns the current contract, including its job role, for up to 50 users in one call. Users without a current contract are omitted.
- `GET /api/v1/businesses/{businessId}/worklogs/open?userIds=` returns the user ids, among up to 50, that have an open worklog. It does not return the worklog.

### Changed

- Functional code `1103` is `INVALID_REPORT_TYPE` (HTTP 400), message `only PDF worked-hours reports are supported`, matching the backend.
- Membership removal no longer documents functional code `1103` or a `409` for the last owner. The backend has no `LAST_OWNER_CANNOT_BE_REMOVED`. Removing an OWNER is `403` `1106`. `1105` (`CANNOT_REMOVE_SELF_FROM_BUSINESS`) is catalogued because the backend defines it; the removal operation does not document self-removal, so it does not reference `1105`.
- Name-search failures use `1107` `SEARCH_QUERY_TOO_SHORT`, `1108` `SEARCH_QUERY_TOO_LONG`, `1109` `INVALID_SEARCH_LIMIT`, and `1110` `INVALID_SEARCH_CURSOR`. A `userIds` list outside 1..50 uses `1111` `INVALID_USER_IDS`.

## 0.0.68

### Changed

- `GET /api/v1/businesses/{businessId}/users` is restricted to an OWNER or MANAGER of that business. Previously any authenticated user could list another business's members. Callers who are not an owner or manager receive `403` with functional code `1020`. A missing business returns `404` with functional code `1006`.

## 0.0.67

### Added

- Owner-only `DELETE /api/v1/businesses/{businessId}/users/{userId}/contracts/{contractId}` removes a contract belonging to the specified user and business and returns `204` without a response body.
- Deletion requires `startDate` strictly after the business-local current date. Contracts starting today or earlier return `409` with functional code `1097`.
- Deletion is blocked when the inclusive contract period intersects a planning in `SOLVING`, `DRAFT`, `PUBLISHED`, or `ARCHIVED` (`409`, code `1098`); `CREATED` and `FAILED` do not block deletion. Eligibility checks and deletion must be atomic.

## 0.0.66

### Compatibility

- Restores compatibility with clients predating 0.0.65: `deviceId` is optional for password and Google/GitHub OAuth login. It is required only when `push` is supplied.
- Login without `deviceId`, existing unbound access/refresh tokens, and independent push registration retain their previous behavior; no forced reauthentication is required.
- Device/session checks for push registration apply only to device-bound tokens. Missing or revoked bound sessions must never fall back to legacy validation.
- The new logout endpoint still requires `deviceId` and a device-bound session. Legacy tokens return `403` on this endpoint only; clients can opt into device-bound logout by authenticating with `deviceId`.

## 0.0.65

### Added

- Login and Google/GitHub OAuth accept optional `push` details (`token`, `platform`) to register notifications in the same transaction as session creation. Independent push registration remains available for delayed tokens and rotation.
- `POST /api/v1/auth/logout` accepts `deviceId`, revokes the authenticated session and all its access/refresh tokens immediately, and removes its push registration atomically. Other sessions and reassigned push registrations are preserved.

### Breaking changes

- `deviceId` is required for password and Google/GitHub OAuth login. Clients must supply a stable app-installation identifier.
- Bearer authentication now requires an active server-side user/device session. Refresh preserves that binding and cannot reactivate a revoked session. Existing unbound tokens require reauthentication.
- Bearer-authenticated push registration must target the session's device; a mismatch returns `403`.

### Client behavior

- Logout requires a valid access token; refresh an expired token before calling it. Already revoked sessions return `401`. Local credential deletion alone does not confirm server-side logout if the request fails or the device is offline.

## 0.0.64

### Added

- Authenticated business members can retrieve their own effective auto-clocking and geofencing settings via `GET /api/v1/businesses/{businessId}/settings/auto-clocking/users/me` and `GET /api/v1/businesses/{businessId}/settings/geofencing/users/me`.

## 0.0.63

### Added

- Owner-only geofencing settings with business-wide and per-business-user policies (`ALLOW`, `WARN`, `BLOCK`) for clock-in and clock-out. Missing settings default to `ALLOW`; the more restrictive policy applies.

## 0.0.62

### Added

- Owner-only auto-clocking settings with business-wide and per-business-user controls.

## 0.0.60

### Added

- `GET /api/v1/scheduled-shifts` now supports optional `businessId`, `jobRoleId`, `shiftId`, and `planningId` filters, combined with the required time range.

## 0.0.59

### Added

- `POST /api/v1/businesses/{businessId}/plannings` creates an empty manual `DRAFT` planning for a requested week.
- `PUT /api/v1/businesses/{businessId}/plannings/{planningId}/scheduled-shifts` atomically replaces all assignments in a `DRAFT` planning with optimistic version control.

### Breaking changes

- Removed `PUT /api/v1/businesses/{businessId}/plannings/{weekStart}`. Automatic planning generation is no longer a public Main API operation.

## 0.0.54

### Added

- Explicit worklog break start, end, correction, void, operational-state, and audit-history representations.
- Required idempotency identifiers for worker break start and end commands.

### Breaking changes

- Worklog reporting now represents net worked time after effective completed breaks are deducted.

## 0.0.53

### Breaking changes

- `idempotencyId` is now required on clock-in and clock-out requests.

## 0.0.52

### Compatibility

- The Main API contract is unchanged from v0.0.51; the tag also carries the BFF worker retry field.

## 0.0.51

### Added

- Optional client-generated `idempotencyId` and current worklog notes on clock-in and clock-out requests.
- Worklog punch origins, review states, optimistic version, business identity, and server timestamps in responses.
- Worker correction and confirmation, management correction/approval/rejection, review-state filtering, audit history, and owner worklog settings operations.
- Worklog audit snapshot and actor representations.

### Compatibility

- `idempotencyId` remains optional for this compatibility release; the following contract release will require it for clock-in and clock-out.

## 0.0.50

### Breaking changes

- Planning status vocabulary is now `CREATED`, `SOLVING`, `DRAFT`, `PUBLISHED`, `ARCHIVED`, and `FAILED`.
- The semantic mapping is old `DRAFT` (created and awaiting solver submission) to `CREATED`, and old `READY` (solved and awaiting publication) to `DRAFT`.
- Planning publication now accepts the solved, reviewable `DRAFT` state; published history is automatically represented as `ARCHIVED` after its business-local week ends.

## 0.0.47

### Added

- Optional trimmed, case-insensitive literal substring search across business-user name, username, or email, combinable with the role filter.
- Business-user results are ordered by name without regard to case, then user ID ascending.

## 0.0.44

### Added

- Optional trimmed, case-insensitive partial `name` filtering for business job-role slices, combined with `active` and pagination before deterministic ordering.
- Normalized job-role name uniqueness errors are documented separately from duplicate code conflicts (`1059`).

## 0.0.42

### Breaking changes

- The business job-role collection no longer accepts `includeInactive`; use the optional `active` filter instead (`true` for active roles, `false` for inactive roles, or omit it for both states).
- The business job-role collection response changed from a bare array to a slice with `content`, zero-based `page`, requested `size`, and `hasNext`.

### Added

- Optional `page` and `size` query parameters default to `0` and `20`; `page` must be non-negative and `size` must be between `1` and `100`.
- Job-role slices are ordered by active state descending, name ascending, and ID ascending, including ID tie-breaking for equal names.
- Examples document active-only, inactive-only, and unfiltered requests and the slice metadata.

## 0.0.38

### Breaking changes

- Contract updates now accept only the nullable `endDate`; `jobRoleId`, `totalWeekHours`, and `startDate` are immutable after creation.
- To change contractual hours, job role, or start date, create a new consecutive non-overlapping contract instead of replacing the existing contract.

### Added

- Owner-only business contract range queries over an inclusive maximum-31-day period, including the contracted `userId`.
- Owner-only effective recurring-schedule lookup and idempotent logical job-role deactivation.
- Planning-state conflicts prevent end-date updates affecting `SOLVING`, `READY`, `PUBLISHED`, or `ARCHIVED` weeks; `DRAFT` and `FAILED` remain editable.
- Active state is included in job-role metadata embedded in business-user current contracts.

## 0.0.37

### Breaking changes

- The business-user projection now also returns `name`, `email`, and a nullable singular `currentContract` with job-role display metadata.
- The current-contract operation returns one `ContractResponseDTO` or `204`; overlapping contract periods are rejected across all job roles for the same user and business.
- Local scheduling times are now constrained as 24-hour `HH:mm` strings instead of the previous `time` format.
- Job-role create, update, and response schemas require hexadecimal `color` and catalog-slug `icon` values.
- Recurring-schedule and schedule-exception shifts require a hexadecimal `color`.

### Added

- Immutable planning requirement projections, scheduled-shift presentation metadata, and the terminal `FAILED` planning state with a sanitized `failureReason`.
- Atomic schedule-exception configuration replacement while keeping the stored exception date immutable.
- Owner-facing BFF scheduling resources for recurring schedules, exceptions, job roles, workers, weekly planning, and idempotent publication.
