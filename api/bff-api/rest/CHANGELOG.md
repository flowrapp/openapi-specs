# Changelog

## 0.0.78

Next repository tag: `v0.0.101` (Main API 0.0.91 and BFF API 0.0.78), not tagged yet.

### Fixed

- Documentation only, no schema or behaviour change: `409` errors of the Main API that the BFF already passes through unchanged (status and ProblemDetail) are now listed.
  - `requestPlanGeneration`: `1049` `CONCURRENT_MODIFICATION` (a week planning changed while the generation saved it, for example an edit of a draft that `replaceDrafts` regenerates). Added to `x-functional-errors`, the `409` description and a `409` example.
  - `createManagerRecurringSchedule` (with `1051`) and `replaceManagerRecurringSchedule` (with `1049` and `1051`): `1055` `SCHEDULE_EXCEPTION_OVERLAPS` in the `409` description and examples.
  - `createManagerScheduleException`: `1055` next to `1054` in the `409` description and examples.
  - `deleteManagerScheduleException`: new `409` response for `1055` (deleting the exception would make an opening interval that crosses midnight collide with the adjacent day once the recurring schedule applies again).
  - `replaceManagerScheduleException` already documented `1055`; no change.

## 0.0.77

Release: repository tag `v0.0.100` (Main API 0.0.90 and BFF API 0.0.77).

### Added

- `GET /api/v1/businesses/{businessId}/schedule/coverage?week=YYYY-Www` (`getWeekCoverage`, tag Planning, OWNER, `WeekCoverageDTO`): weekly coverage «¿Llegas con tu equipo?» for «Planificar semana». Per job role: N (`requiredSeconds`, net shift seconds × `targetEmployees` over the week, special days included, closed days add nothing), E (`contractedSeconds`, prorated exactly like the solver: Σ floor(totalWeekHours × 3600 × coveredDays / 7) per contract, active members only, pending invitations do not count), `shortfallSeconds`, `surplusSeconds`, `minimumSeconds`, `status` (SHORT when E < N, TIGHT when N ≤ E < 1.10·N, else COVERED), `belowMinimum` (E below the minimum demand; a warning only, it never changes `status`), `memberCount` and `members`. Week totals with `coveragePercent` = Σmin(N,E)/ΣN (null without demand, also for a week without any recurring schedule: `200` with its dates `source: NONE`), worst `status`, `openDays`, `shiftOccurrences`, `memberCount`. Per date: `dayOfWeek`, `source`, `scheduleExceptionId`, `open`, `status`, `reason` (CLOSED, NO_DEMAND, BELOW_MINIMUM_AT_ONCE, SHORT_AT_ONCE, TIGHT_AT_ONCE), `reasonJobRoleId`, per-role totals and the shifts with their role demands and the people of each role on that date. `planning` (existing planning id and status, or null) and `generation` (`allowed`, `blocker`, `replacesDraft`), a hint of what «Generar» would do. Main API calls, in parallel (at most 5): `getPlanningGenerationInput` (Main API 0.0.90), `getBusinessJobRoles`, `getPlanning`, `getBusinessUsers`, `getUserBusinesses`. Invalid `week`: `400` `1045`.
- `PlanningGenerationRequestDTO.replaceDrafts` (boolean, optional, default false) in `requestPlanGeneration`, forwarded to the Main API 0.0.90: regenerates a DRAFT week only, replacing its shifts (manual edits are lost). The app warns the OWNER first (`generation.replacesDraft`).

## 0.0.76

### Added

- `MemberSearchItemDTO` (`GET /api/v1/businesses/{businessId}/members/search`, `searchBusinessMembers`), for the redesigned «Equipo» list (one call, no threshold in the app). Three additive required response properties:
  - `totalWeekHours` (number, double, > 0, or null): `contract.totalWeekHours` of the current contract, from the current-contract batch the endpoint already calls (`getCurrentContractsForUsers`). Null when the member has no current contract.
  - `currentContractEndDate` (date or null): `contract.endDate` of the same batch, inclusive and business-local. Null for an open-ended contract and when there is no current contract (`currentContractId` tells them apart).
  - `contractEndingSoon` (boolean, always present): computed by the BFF, true when `currentContractEndDate` is not null and `today <= currentContractEndDate <= today + 30 days`, with `today` the business-local date. False for an open-ended contract or no current contract.
- One more Main API call for a non-empty page, `getUserBusinesses`, only to read the business `zone` for the business-local today (UTC when the business has none). It runs together with the contract and open-worklog batches (at most three in flight, four Main API calls in total). Still no per-user call.
- Main API unchanged: the current-contract batch already returns `totalWeekHours` and `endDate`.

## 0.0.75

### Added

- `ClockViewResponseDTO.autoClocking` (`getWorkerClockView`, required): the worker's effective automatic clock-in for the business, `CurrentUserAutoClockingSettingsDTO` (`effectiveEnabled`), the same object and value as `getWorkerAutoClockingSettings` (business-wide switch AND the worker's preference, Main API setting `AUTO_CLOCKING_BY_GEOFENCE`, both default true). It lets the employee home show «Fichaje automático activo» without another call; the app still ANDs it with its own device state (geofence registered, location permission «Always»). One more Main API call, `getCurrentUserAutoClockingSettings`, in parallel with the existing ones; its errors are propagated. Main API unchanged. Additive required response property.

## 0.0.74

### Added

- Attendance chip and incident type `OUTSIDE_GEOFENCE` in `AttendanceChipTypeDTO` (Main API 0.0.89, WARN geofence mark: a clock-in or clock-out more than 25 m outside the business area, or without a location, under the WARN policy). Passed through unchanged like the other Main API incident types; severity WARNING in the `AttendanceSeverityDTO` table (the hours are real and it is a normal review). It never blocks «Aceptar» (`actions.accept`), and accepting, correcting or rejecting resolves it as for a temporal incident. Additive value in a response enum: clients must tolerate unknown values (an older BFF already maps an unknown type to WARNING).
- No other schema change: the geofence evidence of the Main API (`evidence.geofenceChecks`: distance and area radius per clock action) is not exposed by the BFF yet; it will be a separate, additive change of the attendance detail.

## 0.0.73

### Added

- Worker breaks («Pausa»), on top of the Main API breaks of 0.0.94 (`worklog_breaks`; Main API untouched). There is a single kind of break, without types, and every break is deducted from the worked time.
  - `POST /api/v1/worker/businesses/{businessId}/worklogs/{worklogId}/breaks` (`startWorkerBreak`, tag `Worker`): starts a break on the worker's open worklog. Body `WorkerBreakStartRequestDTO` (`idempotencyId` required, optional `startedAt`); `200` with `WorkerBreakDTO`. One Main API call, `startWorklogBreak`.
  - `PUT /api/v1/worker/businesses/{businessId}/worklogs/{worklogId}/breaks/{breakId}/end` (`endWorkerBreak`, tag `Worker`): ends the open break. Body `WorkerBreakEndRequestDTO` (`idempotencyId` required, optional `endedAt`); `200` with `WorkerBreakDTO`. One Main API call, `endWorklogBreak`.
  - Both are idempotent by `idempotencyId`, take no location and do not go through the geofence policy (the Main API break commands take neither). Main API functional errors are propagated unchanged: `400` `1073` (interval not valid), `403` `1018` (worklog closed, so no open worklog) / `1019`, `404` `1017` / `1065` / `1069` (end), `409` `1070` (a break is already open, start), `1071` (no open break, end), `1072` (idempotency conflict), `1049` (concurrent change). The Main API has no separate break-overlap code: with at most one open break, explicit start/end cannot overlap, and an invalid interval is `1073`.
- `ClockViewResponseDTO` (`getWorkerClockView`): `activeBreak` (`WorkerBreakDTO` or null: the open break of `activeWorklog`, so the app shows «Reanudar») and `breaks` (required array: the EFFECTIVE breaks of `activeWorklog` and `sessions`, open one included, sorted by `startedAt`; VOIDED breaks are not listed). No extra Main API call: they come in the `breaks` of the `getUserWorklogs` worklogs the view already reads.

### Changed

- `SessionDTO.durationSeconds` (clock view, clock-out, day/week/month history, manager worker sessions) is net of breaks: `clockOut - clockIn` minus the EFFECTIVE closed breaks of the worklog, never negative. This is the Main API `reportableSeconds` rule, already used by the reports-based week and month totals, so a day's sessions add up consistently with them. Before, it was the gross interval. No schema change; the value is lower only for worklogs with breaks.
- `workerClockOut`: a break still open is ended by the Main API at the clock-out instant (documented; Main API behaviour).

## 0.0.72

### Added

- `getWorkerBusinesses` (`GET /api/v1/worker/businesses`): `WorkerBusinessResponseDTO.attendanceToleranceMinutes` (integer 0–1440, required), the business's attendance tolerance, read-only, for the front's Business tab. It is the Main API `getUserBusinesses` value (required there, `NOT NULL DEFAULT 5` in the database), forwarded unchanged: no extra Main API call and no N+1. Every role already receives it from the Main API, so the BFF does not gate it. Additive; no other change.

## 0.0.71

### Changed

- Attendance `filterOptions.people` (`getAttendanceHours`, `getAttendanceDay`, `getAttendanceWeek`): documented guarantee that it never depends on `userIds`, `jobRoleId`, the period or the rows. Every filtered person who is or was a member of the business (removed members included, `removed: true`) is always listed with their name, even without shifts, worklogs or hours in the period, so the member profile's shortcut to Attendance filtered by person can label its filter chip. A requested id that was never a member is not added. Documentation of the current behaviour (the list is the full `getBusinessUsers?includeRemoved=true` roster); no schema change.

### Fixed

- Correction to the 0.0.69 `getBusinessMemberProfile` description: the BFF does not call the Main API `getUser` (`POST /api/v1/users`). The caller's id for `isSelf` is the JWT `sub`, the same source as BFF `GET /api/v1/me` (which never called `getUser` either). Stage 0 is 2 calls (`getUserBusinesses` and `getBusinessUsers`), 11 Main API calls in total with one page each of contracts and job roles, at most 8 in flight. A `sub` that is not a numeric user id returns 401 1003 before any Main API call (1003 added to the operation's `x-functional-errors`). Documentation only; no schema change.
- `getAttendanceWeek` examples: `state: "OFF"` is quoted in the three week-cell examples, so YAML 1.1 parsers no longer read it as `false`. Examples only; no contract change and no version bump.
- Settings `businessUserId` (geofencing and auto-clocking lists and the two member PATCH path parameters) is described as the user id (`userId`), as the Main API fills it, not the membership row id. Mirrors the Main API doc fix; documentation only, no contract change and no version bump.

## 0.0.70

### Fixed

- `MemberLiveStatusStateDTO` (`getBusinessMemberProfile` `liveStatus.state`): the enum value `OFF` is now quoted, so YAML 1.1 parsers (such as the one OpenAPI Generator 7.24 uses; Redocly and oasdiff already read YAML 1.2) read it as the string `OFF` instead of the boolean `false`. The generated enum had a `false` constant and the response would have said `"state": "false"`. The endpoint was not implemented yet (BFF answered 501), so no client depends on the old value.

## 0.0.69

### Added

- `GET /api/v1/businesses/{businessId}/members/{userId}/profile` (`getBusinessMemberProfile`, tag `Members`): the «ficha de persona» (design A) in one response ready to paint, OWNER only.
  - Header: `userId`, `businessUserId` (the id the geofencing and auto-clocking PATCHes take), `name`, `email`, `role`, `isSelf` and `liveStatus` (`WORKING`, `ON_BREAK`, `NOT_CLOCKED_IN`, `NOT_STARTED`, `FINISHED`, `NO_SHOW`, `OFF`, first match wins, so the gap of a split shift is `NOT_STARTED`; `since`, `lateSeconds`).
  - Resumen: `week` (`from`, `to`, `workedSeconds` including pending worklogs as Attendance «Horas», `openElapsedSeconds`, `plannedSeconds` or null without a published planning, `remainingPlannedSeconds`; every worklog counts by the business-local day of its clock-in), `today` rows (`kind` `SHIFT`/`UNMATCHED`, so clock-ins without a shift show with the `UNSCHEDULED_WORK` chip; the chips are the only source of «Tarde»), `clockInRules` summary (`customRuleCount`, `followsBusiness`) and `employment` (`hireDate` = first contract start, `seniority`).
  - Contratos: `contracts` (`current`, the only source of the current job role, weekly hours and end date; `upcoming`, `previous`; `state`, `canDelete` = UPCOMING). Fichaje: `clockInRules.geofencing` and `autoClocking` (business, member and effective values, `source` `BUSINESS`/`MEMBER`, `selectablePolicies`, `radiusMeters`; «Como el negocio» is `ALLOW` / `enabled: true`). Ajustes: `actions` (`canEndContract`, `canRemove`, `removeBlockedReason` `SELF`/`TARGET_IS_OWNER`).
  - Only existing Main API reads, 12 calls in two `parZip` stages (3, then 9 with at most 8 in flight): `getUserBusinesses`, `getBusinessUsers`, `getUser`, `getUserContracts`, `getBusinessJobRoles`, `getWorklogs`, 2 × `getBusinessReports` (reportable and pending), `getBusinessTeamSchedule`, `getDailyAttendance`, `getBusinessGeofencingSettings`, `getBusinessAutoClockingSettings`. Time zones are converted in Kotlin with the business `ZoneId`.
  - Errors: a user who is not an active member returns `404` `1126`; a non-owner `403` `1020`, a non-member `403` `1015`. Any other Main API failure fails the whole request (no partial response), except `404` `1046` of `getBusinessTeamSchedule`, which gives `week.plannedSeconds: null`.

## 0.0.68

### Added

- `POST /api/v1/businesses/{businessId}/attendance/shifts/{scheduledShiftId}/clock-in-notices` (`notifyAttendanceShiftClockIn`, tag `Attendance`): «Avisar para fichar». OWNER only (`getUserBusinesses`, then Main API `notifyShiftClockIn`, Main API 0.0.88). `202` with `AttendanceClockInNoticeDTO`; the push is asynchronous. Main API errors are propagated unchanged: `404` `1006`/`1076`, `409` `1116` (outside the window from 15 minutes before the start until the end), `1117` (already clocked in, clocked in and out included), `1118` (not an active member with a contract in force), `429` `1119` with `Retry-After` (one notice per shift every 10 minutes), `403` `1015`/`1020`.
- `clockInNotice` (`AttendanceClockInNoticeStateDTO`: `lastNotice` and `blocker`) in `AttendanceDayRowDTO` and `AttendanceDetailDTO`, from Main API `ShiftAttendanceDTO.clockInNotice`; null for UNMATCHED. The action is enabled when `blocker` is null. Not listed as required.
- New tag `Planning`, OWNER only: `POST /api/v1/businesses/{businessId}/planning-generations` (`requestPlanGeneration`) and `GET /api/v1/businesses/{businessId}/planning-generations/{generationId}` (`getPlanGeneration`), pass-through to Main API `requestPlanningGeneration` and `getPlanningGeneration`. `202` with the job and `Location`; the result is one DRAFT plan per week. The period may start at the Monday of the current business-local week, so the current week can be generated; only earlier weeks return `400` `1098`. Errors propagated unchanged: `400` `1098`/`1120`, `409` `1121`/`1122`, `422` `1123`/`1124`, `404` `1006`/`1125`, `403` `1015`/`1020`.

### Fixed

- `AttendanceWeekCellStateDTO`: `OFF` is quoted, so YAML no longer parses it as `false`. Same change as tag `v0.0.90` (290ebc4), which is not on `main`; without it the next tag cut from `main` would bring the bug back.

## 0.0.67

### Changed

- Attendance `jobRoleId` (`getAttendanceHours`, `getAttendanceDay`, `getAttendanceWeek`): the BFF forwards it unchanged to the Main API (`getBusinessReports`, `getDailyAttendance`, Main API 0.0.87), which filters it server-side with `userIds` (AND), instead of resolving it to `userIds` from the roster. The job role is the one stored on each scheduled shift; worklogs without a shift use the member's contract in force that day (Main API semantics). The parameter itself does not change.
- Attendance match routes (`getAttendanceMatchDetail` and the six `…/matches/{attendanceMatchId}/…` actions) read the match with the Main API owner read `getBusinessAttendanceMatch`. The `date` and `userId` query parameters are now optional and deprecated: they are ignored and stay optional and deprecated until the front stops sending them. Non-breaking for existing clients.
- Badge (`getAttendanceBadge`): the front shows `openIncidentCount` (open incidents only), as Sergio decided; `attentionCount` stays in the response. Documentation only.
- Match resolution (`DECLARE_UNPLANNED`) and match correction re-read the match by its id (`getBusinessAttendanceMatch`), no longer by date.

## 0.0.66

### Added

- New `Attendance` tag, OWNER only, with one endpoint per screen of the owner's attendance area under `/api/v1/businesses/{businessId}/attendance/…`. Responses are ready to paint, so the front never calls the Main API: `hours` (`getAttendanceHours`), `day` (`getAttendanceDay`), `week` (`getAttendanceWeek`), `shifts/{scheduledShiftId}` (`getAttendanceShiftDetail`), `matches/{attendanceMatchId}?date&userId` (`getAttendanceMatchDetail`) and `badge` (`getAttendanceBadge`, no parameters: always today). Each operation lists the Main API calls it aggregates (Main API 0.0.87). Independent calls run with Arrow `parZip`, with at most 8 Main API calls in flight per request, and every filter is a Main API parameter.
- Attendance actions, each on its own resource and each returning the refreshed `AttendanceDetailDTO`:
  - on a shift: `…/shifts/{scheduledShiftId}/accept`, `/no-show/acknowledge`, `/correction`, `/rejection`, `/breaks/{breakId}/correction` and `/breaks/{breakId}/void`;
  - on a match: `…/matches/{attendanceMatchId}/accept`, `/resolution` (`ASSIGN_SHIFT` or `DECLARE_UNPLANNED`), `/correction`, `/rejection`, `/breaks/{breakId}/correction` and `/breaks/{breakId}/void`.
- An `AUTOMATIC_CLOSE` incident is resolved only by correction or rejection, and a correction of a worklog with `provisionalClockOut` must send `clockOut`. Evidence is in seconds, and `measuredSeconds` is nullable.
- `revision` is an opaque string: always a non-empty string when `kind` is `SHIFT` (enforced with `if`/`then`), null only for `UNMATCHED`.
- Attendance severity follows a fixed mapping (`AttendanceSeverityDTO`):
  - `CRITICAL`: `NO_SHOW`, `AUTOMATIC_CLOSE`, and the alerts `MISSING_CLOCK_IN` and `LONG_OPEN`;
  - `WARNING`: every other incident type, plus any unknown value.
- Week cells (`AttendanceWeekCellStateDTO`): REJECTED worklogs are ignored; `UPCOMING` only with at least one shift, all of them `UPCOMING`, and no worklog; a mix is decided by the non-`UPCOMING` shifts; a day with only REJECTED worklogs is `OFF`; unplanned work follows the `UNMATCHED` rules; an acknowledged `NO_SHOW` is `WARNING`.
- Hours: `plannedSeconds` is null when the week has no published plan (one extra `getPlannings` call) and 0 for a plan with 0 h; job-role names come from all job roles, inactive included.
- Detail: `clocked.workedSeconds` counts closed worklogs only, as Hours does; the new `clocked.openElapsedSeconds` shows the elapsed time of open worklogs.
- Badge: `attentionCount` (today's rows with severity other than OK, alerts included) is the number the front shows; `openIncidentCount` is kept. Pending Sergio's open question 4.
- All attendance enums are open, so clients must tolerate unknown values.
- Every attendance action is OWNER only, and a non-owner gets `403` `1020`. Main API functional errors are propagated unchanged and documented per operation (`1006`, `1015`, `1017`, `1022`, `1025`, `1049`, `1067`–`1069`, `1073`–`1076`, `1078`–`1085` and `1111`). `acceptAttendanceShift` documents the Main API's `400` (`Approval request is invalid`, no functional code). Corrections without `clockIn` and `clockOut`, or without `clockOut` on a provisional clock-out, return `400` `1025` (`WORKLOG_NOT_VALID`). An invalid `week` or `date`, or a `date` outside `week` in Hours, returns `400` with the new code `1115` (`INVALID_ATTENDANCE_PERIOD`).
- Owner-only `DELETE /api/v1/businesses/{businessId}/members/{userId}` under the new `Members` tag forwards membership removal to the Main API and returns `204` without a response body. Historical data is preserved.
- Removing an OWNER returns `403` with functional code `1106` (`CANNOT_REMOVE_OWNER_FROM_BUSINESS`).
- `GET /api/v1/businesses/{businessId}/members/search` (`searchBusinessMembers`), under the `Members` tag, returns a keyset page for the hub. It calls `GET /api/v2/businesses/{businessId}/users` once, then, for the whole page, `GET /api/v1/businesses/{businessId}/contracts/current?userIds=` and `GET /api/v1/businesses/{businessId}/worklogs/open?userIds=`. Each item has `userId`, `name`, `role`, `jobRole` or null, `currentContractId` or null, and `workingNow`. Access is OWNER or MANAGER (`403` `1020`, `404` `1006`). There is no per-user call and no email.
- Optional `periodType` (`MONTH`, `YEAR`, `RANGE`; default `RANGE`) in the body of `POST /api/v1/businesses/{businessId}/reports/worked-hours` and as a query parameter of `GET /api/v1/manager/businesses/{businessId}/export/worked-hours-report`, defined as `WorkedHoursReportPeriodTypeDTO` and forwarded to the Main API (0.0.84). Omitting it behaves exactly as before (`RANGE`). A mismatch propagates `400` `1114` (`REPORT_PERIOD_TYPE_MISMATCH`).
- Main API 0.0.84 adds the attendance incident type `AUTOMATIC_CLOSE` (worklog closed automatically after 24 hours without a clock-out). No BFF schema exposes attendance incident types today, so the BFF contract does not change. A future BFF schema that exposes them must include this value and tolerate unknown values.

### Changed

- `GET /api/v1/businesses/{businessId}/members/search`: `q` is now optional. Omitted, empty, or blank lists every active member (ordered by normalized name, then userId) instead of returning `400`. A non-blank `q` that normalizes to fewer than 2 characters still returns `400` `1107`.
- `searchBusinessMembers` documents `403` `1020` as `user is not an owner or manager of the business`. The code stays `USER_NOT_OWNER_OF_BUSINESS`, which is already in the catalog. A MANAGER is allowed; the previous example said the caller was not the owner.
- Future worker contract deletion propagates functional code `1102` instead of `1098` for planning-state conflicts, matching the Main API. Already-started contracts continue to return `1097`; both conflicts use HTTP `409`.
- Member removal propagates `403` `1106` instead of `409` `1103`. `1103` remains `INVALID_REPORT_TYPE` (`only PDF worked-hours reports are supported`).
- Worked-hours reports are owner-only. `GET /api/v1/manager/businesses/{businessId}/export/worked-hours-report` no longer documents MANAGER access: like `POST /api/v1/businesses/{businessId}/reports/worked-hours`, only the business OWNER may call it, and anyone else receives `403` `1020`, propagated from the Main API.
- Worked-hours reports (`POST /api/v1/businesses/{businessId}/reports/worked-hours` and `GET /api/v1/manager/businesses/{businessId}/export/worked-hours-report`) accept a period that ends after today; the Main API truncates the effective end to today in the business time zone. A period whose `from` is after today returns `400`.
- `PUT /api/v1/manager/businesses/{businessId}/worklogs/{worklogId}` (`managerUpdateWorklog`) is documented as OWNER-only (M7, Main API 0.0.85): a MANAGER receives `403`. The schema does not change.

### Tooling

- `scripts/validate-error-codes.js` now also checks the `x-functional-errors` of `api/bff-api/rest/v1/services`, not only the Main API.

## 0.0.65

### Added

- Owner-only `DELETE /api/v1/manager/businesses/{businessId}/workers/{userId}/contracts/{contractId}` forwards future contract deletion to the Main API and returns `204` without a response body.
- Preserves the Main API's business-local date restriction (`startDate` must be strictly after today) and planning-state protection (`SOLVING`, `DRAFT`, `PUBLISHED`, `ARCHIVED`). Functional codes `1097` and `1098` identify these conflicts; `CREATED` and `FAILED` do not block deletion.

## 0.0.64

### Added

- Owner-only manager endpoints to create a worker contract and read its paginated history at `/api/v1/manager/businesses/{businessId}/workers/{userId}/contracts`.
- `PUT /api/v1/manager/businesses/{businessId}/workers/{userId}/contracts/{contractId}` updates only the nullable `endDate`, preserving the Main API's non-overlap and planning-state restrictions. Changes to weekly hours, job role, or start date require a new contract.

## 0.0.63

### Compatibility

- Restores compatibility with clients predating 0.0.62: `deviceId` is optional for password and Google/GitHub OAuth login. It is required only when `push` is supplied.
- Login without `deviceId`, existing unbound access/refresh tokens, and independent push registration retain their previous behavior; no forced reauthentication is required.
- Device/session checks for push registration apply only to device-bound tokens. Missing or revoked bound sessions must never fall back to legacy validation.
- The new logout endpoint still requires `deviceId` and a device-bound session. Legacy tokens return `403` on this endpoint only; clients can opt into device-bound logout by authenticating with `deviceId`.

## 0.0.62

### Added

- Login and Google/GitHub OAuth forward optional `push` details (`token`, `platform`) in the same call as authentication. Independent push registration remains available for delayed tokens and rotation.
- `POST /api/v1/auth/logout` forwards `deviceId` and the bearer token in a single call to the Main API for atomic session revocation and push cleanup. All session access/refresh tokens stop working immediately; other sessions and reassigned push registrations are preserved.

### Breaking changes

- `deviceId` is required for password and Google/GitHub OAuth login. Clients must supply a stable app-installation identifier.
- Bearer authentication now requires an active server-side user/device session. Refresh preserves that binding and cannot reactivate a revoked session. Existing unbound tokens require reauthentication.
- Push registration must target the authenticated session's device; a mismatch returns `403`.

### Client behavior

- Logout requires a valid access token; refresh an expired token before calling it. Already revoked sessions return `401`. Local credential deletion alone does not confirm server-side logout if the request fails or the device is offline.

## 0.0.61

### Added

- `GET /api/v1/me/settings/geofencing?businessId=101` exposes the authenticated user's effective geofencing policy for the selected business to all membership roles, for client-side clock-in and clock-out validation.

## 0.0.60

### Added

- Worker endpoints expose the authenticated business member's effective settings via `GET /api/v1/worker/businesses/{businessId}/settings/auto-clocking` and `GET /api/v1/worker/businesses/{businessId}/settings/geofencing`, available to all membership roles.

## 0.0.59

### Added

- Owner-only manager endpoints for reading and updating business-wide and per-business-user geofencing policies (`ALLOW`, `WARN`, `BLOCK`) for clock-in and clock-out. Missing settings default to `ALLOW`; the more restrictive policy applies.

## 0.0.58

### Added

- Owner-only manager endpoints for reading and updating business-wide and per-business-user auto-clocking settings.

## 0.0.57

### Added

- `GET /api/v1/manager/businesses` accepts an optional `businessId` and, for a managed business, includes `home` with sorted working-now and today's attendance rows, seven daily team-hour totals in seconds, and a business-local hourly presence series.

## 0.0.56

### Added

- Manager invitations accept an optional proposed `contract` (job role, weekly hours, and start/end dates) and include it in invitation responses. When omitted, acceptance creates the default 40-hour GENERAL contract.

## 0.0.55

### Added

- `POST /api/v1/manager/businesses/{businessId}/schedule` creates an empty manual DRAFT planning for a Monday `weekStart`.
- `PUT /api/v1/manager/businesses/{businessId}/schedule/{planningId}/scheduled-shifts` atomically replaces all assignments in a DRAFT planning using its `version`; an empty array clears them.
- Manager planning responses include `version` for optimistic concurrency and support manual drafts without solver requirements.

## 0.0.53

### Breaking changes

- `idempotencyId` is now required on worker clock-in and clock-out requests.

## 0.0.52

### Added

- Optional client-generated `idempotencyId` on worker clock-in and clock-out requests so mobile retries reuse the same command identifier.

## 0.0.50

### Breaking changes

- Manager planning status vocabulary is now `CREATED`, `SOLVING`, `DRAFT`, `PUBLISHED`, `ARCHIVED`, and `FAILED`.
- The semantic mapping is old `DRAFT` (created and awaiting solver submission) to `CREATED`, and old `READY` (solved and awaiting publication) to `DRAFT`.
- `DRAFT` is solved and reviewable but unpublished; `ARCHIVED` is previously published, read-only history.

## 0.0.47

### Added

- Optional trimmed, case-insensitive literal substring search across worker name, username, or email, combinable with the role filter.
- Worker ordering follows the Main API's name-then-user-ID ordering, and `totalWorkers` counts the returned memberships.

## 0.0.44

### Added

- Optional trimmed, case-insensitive partial `name` filtering for manager job-role slices, preserving main API ordering and slice metadata.
- Distinct duplicate normalized-name (`1059`) and duplicate-code (`1035`) conflict examples for manager job-role writes.

## 0.0.42

### Breaking changes

- The manager job-role collection no longer accepts `includeInactive`; use the optional `active` filter instead (`true` for active roles, `false` for inactive roles, or omit it for both states).
- The manager job-role collection response changed from a bare array to a slice with `content`, zero-based `page`, requested `size`, and `hasNext`.

### Added

- Optional `page` and `size` query parameters default to `0` and `20`; `page` must be non-negative and `size` must be between `1` and `100`.
- Manager job-role slices preserve MIG ordering: active state descending, name ascending, and ID ascending, including ID tie-breaking for equal names.
- Examples document active-only, inactive-only, and unfiltered requests and the slice metadata.

## 0.0.38

### Added

- `ARCHIVED` is now a supported read-only manager planning state.
- Manager planning contracts document local wall-clock required seconds, offset-aware scheduled seconds, full-precision contract proration, and the contract/assignment worker union.
- Planning examples cover overnight requirements, consecutive partial-week contracts, unassigned contracted workers, and assignments carrying inactive job-role metadata.

### Dependency migration

- The Main API contract update is now end-date-only. To change contractual hours, job role, or start date, create a new consecutive non-overlapping contract.

## 0.0.37

- Initial manager scheduling contract release.
