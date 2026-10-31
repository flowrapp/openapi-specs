# Changelog

## 0.0.81

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

### Changed

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
