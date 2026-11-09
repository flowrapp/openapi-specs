## Context

Main `0.0.102` / BFF `0.0.92`. Business authorization today: `BusinessRoleService` in Main (`getMembershipAsOwner`, `getMembershipAsOwnerOrManager`), `requireOwner`/`requireOwned` in the BFF, `can(role, capability)` in the app. `MANAGER` is a read-only observer without contract. Error `1020` (`USER_NOT_OWNER_OF_BUSINESS`) is the generic business 403. This change is the contract; implementations live in the `business-access-roles` changes of flowrapp_backend, wsc_flowrapp and flowrapp_frontend.

## Goals / Non-Goals

**Goals:** permission catalog; per-business access roles managed by the OWNER; effective permissions exposed to the app; authoritative operation → permission table; drop `MANAGER`.

**Non-Goals:** per-person permission overrides (only via roles), permissions derived from `BusinessJobRole`, per-resource ACLs, delegation of role management, contracts for owners, changes to global `ADMIN`.

## Decisions

### Model
- Membership `BusinessUserRole`: `OWNER | EMPLOYEE`.
- `BusinessAccessRole`: `{id, businessId, name, permissions[]}`. Name unique per business (case-insensitive, trimmed, 1..50 chars).
- An EMPLOYEE membership has `accessRole` 0..1. An OWNER never has one (`1154` if attempted).
- Effective permissions of the caller in a business:
  - OWNER → all 14.
  - EMPLOYEE with an active contract → permissions of its access role (empty if none).
  - EMPLOYEE without an active contract → none (keeps today's `hasAccess` rule; the caller still gets 403 `1104` on business operations as today).
- Self-service operations (clock-in/out, own worklogs/reports/timesheet/contracts/inbox/settings, team schedule, shift exchanges as participant) need no permission.
- Only the OWNER: manage access roles, assign access roles, remove members. Not grantable.

### Permission catalog (`BusinessPermission`, closed enum)

| Permission | Implies | Grants |
|---|---|---|
| `TEAM_VIEW` | — | Member lists/search/profile, members' contracts (read), current-contracts batch, open-worklog lookup, job-role catalog read |
| `TEAM_INVITE` | `TEAM_VIEW` | Invitations: list, create (EMPLOYEE only), resend, delete |
| `CONTRACTS_MANAGE` | `TEAM_VIEW` | Create, update, delete contracts |
| `WORKLOGS_VIEW` | `TEAM_VIEW` | Business worklogs, any worker's worklog history, manager history day/week/month |
| `WORKLOGS_MANAGE` | `WORKLOGS_VIEW` | Approve, reject, correct business worklogs and breaks, void breaks, manager worklog update |
| `ATTENDANCE_VIEW` | `WORKLOGS_VIEW`, `SCHEDULE_VIEW`, `REPORTS_VIEW` | Daily attendance of everyone, shift attendance, business attendance match, BFF Asistencia reads and badge |
| `ATTENDANCE_MANAGE` | `ATTENDANCE_VIEW`, `WORKLOGS_MANAGE` | Resolve match, accept unplanned, approve shift attendance, acknowledge no-show, notify clock-in, BFF Asistencia actions |
| `SCHEDULE_VIEW` | `TEAM_VIEW` | Recurring schedules, schedule exceptions (closed days), shifts catalog, plannings incl. drafts, generation settings/runs/input, coverage |
| `SCHEDULE_MANAGE` | `SCHEDULE_VIEW` | Every write on the above plus job-role catalog writes and publish |
| `SHIFT_CHANGES_APPROVE` | `SCHEDULE_VIEW` | Owner view of shift exchanges/schedule changes, approve, reject as reviewer, create/cancel schedule changes |
| `REPORTS_VIEW` | `TEAM_VIEW` | Business reports, business weekly timesheet |
| `REPORTS_EXPORT` | `REPORTS_VIEW` | Worked-hours PDF (sync and emailed) |
| `CLOCKING_SETTINGS_MANAGE` | `TEAM_VIEW` | Read/write business and per-member auto-clocking and geofencing settings, worklog settings, attendance tolerance |
| `BUSINESS_EDIT` | — | Business profile and geofence location |

Implications are closed transitively by Main **when an access role is saved**: the stored and returned set always contains the implied permissions. Checks are then plain set membership. Alternative (resolve at check time) rejected: two places to get wrong.

### Operation → permission (Main API, authoritative)

| Operations | Requirement |
|---|---|
| `getBusinessUsers`, `getBusinessUsersV2`, `getCurrentContractsForUsers`, `getOpenWorklogsForUsers`, `getBusinessContracts`, `getUserContracts`, `getCurrentUserContract`, `getBusinessJobRoles` | `TEAM_VIEW` |
| `getBusinessInvitations`, `createBusinessInvitation`, `resendBusinessInvitation`, `deleteBusinessInvitation` | `TEAM_INVITE` (OWNER invitations remain ADMIN-only) |
| `createUserContract`, `updateUserContract`, `deleteUserContract` | `CONTRACTS_MANAGE` |
| `getWorklogs`, `getWorklogHistory` (other worker) | `WORKLOGS_VIEW` |
| `updateWorklog` (business), `correctBusinessWorklog`, `approveWorklog`, `rejectWorklog`, `correctBusinessWorklogBreak`, `voidBusinessWorklogBreak` | `WORKLOGS_MANAGE` |
| `getDailyAttendance` (unscoped; without it the result is narrowed to the caller), `getShiftAttendance`, `getBusinessAttendanceMatch` | `ATTENDANCE_VIEW` |
| `resolveAttendanceMatch`, `acceptUnplannedAttendance`, `approveShiftAttendance`, `acknowledgeNoShow`, `notifyShiftClockIn` | `ATTENDANCE_MANAGE` |
| `getRecurringSchedules`, `getRecurringSchedule`, `getEffectiveRecurringSchedule`, `getScheduleExceptions`, `getBusinessShifts`, `getBusinessShift`, `getPlannings`, `getPlanning`, `getPlanningSettings`, `getPlanningGeneration`, `getPlanningGenerationInput` | `SCHEDULE_VIEW` |
| `create/replace/deleteRecurringSchedule`, `create/replace/deleteScheduleException`, `create/update/deleteBusinessShift`, `create/update/deleteBusinessJobRole`, `createDraftPlanning`, `replacePlanningScheduledShifts`, `publishPlanning`, `replace/deletePlanningSettings`, `requestPlanningGeneration` | `SCHEDULE_MANAGE` |
| `approveShiftExchangeRequest`, `approveScheduleChangeRequest`, `createScheduleChangeRequest`, `cancelScheduleChangeRequest`; reviewer view in `list/get*Requests` and reviewer `reject*` | `SHIFT_CHANGES_APPROVE` |
| `getBusinessReports`, `getWeeklyHoursReport` | `REPORTS_VIEW` |
| `exportBusinessWorkedHoursReportPdf`, `requestBusinessWorkedHoursReport` | `REPORTS_EXPORT` |
| `getBusinessAutoClockingSettings`, `updateBusinessAutoClockingSetting`, `updateBusinessUserAutoClockingPreference`, `getBusinessGeofencingSettings`, `updateBusinessGeofencingPolicy`, `updateBusinessUserGeofencingPolicy`, `updateBusinessWorklogSettings`, `updateAttendanceTolerance` | `CLOCKING_SETTINGS_MANAGE` |
| `updateBusinessProfile`, `updateBusinessGeofence` | `BUSINESS_EDIT` |
| `removeBusinessUser`, access-role operations, `updateBusinessUserAccessRole` | OWNER |
| Everything else scoped to the caller or any member (`clockIn`, `getBusinessTeamSchedule`, inbox, own settings...) | membership only |

BFF operations require the permission of the Main operations they call; the BFF table is in the root spec description.

### Errors
- `1020` keeps code and name in the catalog; message for permission failures: `user lacks permission <PERMISSION> in business`; OWNER-only operations keep `user is not the owner of business`. A non-member still gets `1020` (unchanged).
- New: `1151 ACCESS_ROLE_NOT_FOUND` (404), `1152 ACCESS_ROLE_NAME_ALREADY_EXISTS` (409), `1153 ACCESS_ROLE_INVALID` (400: blank/too long name, unknown permission, empty permission set), `1154 ACCESS_ROLE_TARGET_NOT_EMPLOYEE` (409).

### Endpoints
- Main:
  - `GET/POST /api/v1/businesses/{businessId}/access-roles` (`getBusinessAccessRoles`, `createBusinessAccessRole`)
  - `PUT/DELETE /api/v1/businesses/{businessId}/access-roles/{accessRoleId}` (`replaceBusinessAccessRole`, `deleteBusinessAccessRole`). Delete unassigns its members.
  - `PUT /api/v1/businesses/{businessId}/users/{userId}/access-role` body `{accessRoleId: int|null}` (`updateBusinessUserAccessRole`), 204.
- BFF: pass-through `getAccessRoles`, `createAccessRole`, `replaceAccessRole`, `deleteAccessRole` at `/api/v1/businesses/{businessId}/access-roles[/{accessRoleId}]` and `updateMemberAccessRole` at `/api/v1/businesses/{businessId}/members/{userId}/access-role` (tag Members).
- DTOs: `BusinessPermission` enum, `BusinessAccessRoleDTO {id, name, permissions, memberCount}`, `BusinessAccessRoleRequestDTO {name, permissions}`, `BusinessAccessRoleSummaryDTO {id, name}`, `BusinessUserAccessRoleRequestDTO {accessRoleId}`.
- `BusinessResponseDTO` / `WorkerBusinessResponseDTO`: `permissions` (required, effective) and `accessRole` (nullable summary). `BusinessUserResponseDTO`: `accessRole`.
- `MemberProfileDTO`: requires `TEAM_VIEW`; adds `accessRole`; `liveStatus` is `null` without `WORKLOGS_VIEW`, `week` without `WORKLOGS_VIEW` or `REPORTS_VIEW`, `today` is `null` without `ATTENDANCE_VIEW`, `clockInRules` is `null` without `CLOCKING_SETTINGS_MANAGE`. The BFF decides from the caller's permissions and does not call Main for those blocks. `actions.canChangeAccessRole` (caller OWNER and target EMPLOYEE). `removeBlockedReason` gains `CALLER_NOT_OWNER`.

### Realtime
- `SyncTopic.PERMISSIONS`: emitted with audience MEMBERS of the business when an access role is created, replaced, deleted or assigned. Clients refetch their businesses.
- The internal audience `OWNERS` (Rabbit `sync.changed`) keeps its wire value; the BFF delivers it to subscribers holding the view permission of any topic of the signal: `WORKLOGS→WORKLOGS_VIEW`, `ATTENDANCE→ATTENDANCE_VIEW`, `SCHEDULE→SCHEDULE_VIEW`, `SHIFT_CHANGES→SHIFT_CHANGES_APPROVE`, `REPORTS→REPORTS_VIEW`. On a `PERMISSIONS` signal the BFF re-resolves the subscriber's permissions.

## Risks / Trade-offs

- Operation descriptions still say "owner" or "owner or manager" in many places; the root table is authoritative. Rewriting every description was rejected as churn.
- App caches permissions; between an edit and the `PERMISSIONS` signal the app may show an action that Main rejects with 403. The app must handle 403 gracefully.
- Removing `MANAGER` from enums is breaking for generated clients; all consumers adopt `v1.0.7` together.

## Revisions

- `v1.0.8` (Main `0.0.104`, BFF `0.0.94`): `ATTENDANCE_VIEW` also implies `SCHEDULE_VIEW` and `REPORTS_VIEW`, because the BFF attendance screens (Day, Week, Hours) read the planning input, schedule and reports. The member profile `week` block is null without `REPORTS_VIEW` as well. Description-only change; no schema shape changes.
