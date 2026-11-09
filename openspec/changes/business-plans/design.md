## Context

Main `0.0.105` / BFF `0.0.95` (tag `v1.0.9`) authorize business operations with `BusinessPermission` and per-business access roles. Effective permissions are computed in one place in Main (`BusinessRoleService`), returned by `getUserBusinesses`, forwarded unchanged by the BFF and used by the app for visibility. No plan or feature concept exists. This change is the contract; implementations live in the `business-plans` changes of flowrapp_backend, wsc_flowrapp and flowrapp_frontend.

## Goals / Non-Goals

**Goals:** two plans with configurable contents; per-business feature availability persisted in the backend; effective features exposed to the app; authoritative enforcement in Main and early rejection in the BFF; no behaviour change for existing businesses.

**Non-Goals:** generic feature flags, per-user features, owner-facing feature toggles, billing, admin back-office, add-ons, features for modules that do not exist yet (advanced reporting, documents), plans stored in the database.

## Decisions

### Three separate concepts
- **Plan entitlements** — `plan → features`, backend configuration (Main `application.yml`), changed by deploy.
- **Business features** — per business, persisted in Main. Platform admins disable an included feature directly in the database (absent row = enabled). The owner cannot toggle features.
- **Permissions (RBAC)** — access roles, unchanged.

### Feature catalog (`BusinessFeature`, closed enum)

| Feature | Requires | Owns permissions | Self-service operations it gates (Main) |
|---|---|---|---|
| `SCHEDULING` | — | `SCHEDULE_VIEW`, `SCHEDULE_MANAGE`, `SHIFT_CHANGES_APPROVE` | getCurrentUserScheduledShifts, getBusinessTeamSchedule, every shift exchange and schedule change operation |
| `ATTENDANCE` | `SCHEDULING` | `ATTENDANCE_VIEW`, `ATTENDANCE_MANAGE` | getAttendanceMatch, getDailyAttendance (any scope), justifyAttendanceIncident, getCurrentUserAttendanceIncidents, getCurrentUserAttendanceIncidentGroups, getCurrentUserAttendanceIncidentGroup, justifyCurrentUserAttendanceIncidentGroup, updateAttendanceTolerance |

Every other permission and operation is core: always available (clocking, breaks, worklog corrections and confirmations, geolocation and auto-clocking, team, invitations, contracts, job-role catalog read, reports and PDF export, business settings). Only optional modules are features; a core module becomes a feature only when a plan must exclude it. Future modules (advanced reporting, documents) are added as new enum values with their permissions.

Plans today:

| Plan | Features |
|---|---|
| `ESSENTIAL` | — |
| `PROFESSIONAL` | `SCHEDULING`, `ATTENDANCE` |

`plan` is an open string in the contract so a plan can be added by configuration. `BusinessFeature` is closed because a feature needs code.

### Effective computation
```
features    = plan features − disabled for the business − those whose requirement is not in the result
permissions = role permissions − permissions owned by features not in `features`
```
Job-role writes require `SCHEDULE_MANAGE` and therefore `SCHEDULING`; the job-role catalog read stays `TEAM_VIEW` (core).

### Errors
- `1155 BUSINESS_FEATURE_UNAVAILABLE` (403), message `business feature <FEATURE> is not available`. After membership and contract checks, an unavailable feature takes precedence over its permission: `1155` is returned even if the caller's role also lacks that permission. When the feature is available, a caller lacking the permission gets `1020`. Self-service operations of an unavailable feature also return `1155`.
- `1156 BUSINESS_PLAN_UNKNOWN` (400), message `business plan is unknown`.

### Endpoints and schemas
- Main `BusinessFeature` schema; BFF `BusinessFeature` (members components).
- `BusinessResponseDTO` (Main) and `WorkerBusinessResponseDTO` (BFF): required `plan` (string) and `features` (effective, `BusinessFeature[]`).
- Main `PUT /api/v1/admin/businesses/{businessId}/plan` (`updateBusinessPlan`, tag Admin, basic auth, `ADMIN` authority), body `BusinessPlanUpdateRequestDTO {plan}`, 204; `400 1156`, `404 1006`.
- Main admin `BusinessDTO` (registerUser): optional `plan`, default `ESSENTIAL`; unknown → `400 1156`.
- BFF: no new operation. It rejects early with `1155` when the required permission belongs to an unavailable feature (mapping in the `BusinessFeature` description), and its aggregated responses omit data of an unavailable feature exactly as they do for a missing permission. An opaque, unscoped match ID must be resolved by Main first to preserve the same 404 for nonexistent, foreign and no-longer-accessible matches.

### Realtime
`updateBusinessPlan` emits `SyncTopic.PERMISSIONS` with audience MEMBERS; clients refetch their businesses. Database edits of business features emit nothing: Main and the BFF enforce on the next request; the app learns on its next businesses fetch (stream reconnect at most every 30 min, or a `1155` response).

### Migration
Existing businesses get `PROFESSIONAL` with nothing disabled, so deploying changes no behaviour. Data of an unavailable feature is kept and reappears when it becomes available again.

## Risks / Trade-offs

- Database edits are not signalled; the app may show a feature for up to one stream lifetime. It must handle `1155` by refetching its businesses.
- Operation descriptions are not rewritten; the root tables are authoritative, as for permissions.
- New required response fields are additive for clients that ignore unknown properties.
