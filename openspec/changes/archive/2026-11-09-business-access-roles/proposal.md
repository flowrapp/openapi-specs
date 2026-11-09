## Why

Business authorization is hard-coded in three roles (`OWNER`, `MANAGER`, `EMPLOYEE`). `MANAGER` mixes "a worker" with "a set of privileges", has no contract, and its reach is fixed in code (read-only on team, worklogs, reports, attendance). Owners need to delegate concrete capabilities (see attendance, approve shift changes, invite people...) to specific employees. Supersedes the model of flowrapp/flowrapp_backend#101 (custom roles were out of scope there; they are the core here).

## What Changes

- **BREAKING** `MANAGER` disappears from every role enum (Main and BFF). Membership is `OWNER | EMPLOYEE`. Existing managers become employees holding a business access role named "Encargado" (backend migration).
- New closed catalog `BusinessPermission` (14 values, view/manage per area) with implication rules (e.g. `*_MANAGE` ⇒ `*_VIEW`).
- New per-business **access roles** (`BusinessAccessRole`): a name plus a set of permissions, created by the OWNER. Each EMPLOYEE has 0 or 1 access role. OWNER holds every permission implicitly. Only the OWNER manages access roles and assignments.
- Main API: CRUD `/api/v1/businesses/{businessId}/access-roles`, `PUT /api/v1/businesses/{businessId}/users/{userId}/access-role`; `getUserBusinesses` returns the caller's effective `permissions` and `accessRole`; `getBusinessUsers` returns each member's `accessRole`.
- BFF: same operations under `/api/v1/businesses/{businessId}/access-roles` and `/api/v1/businesses/{businessId}/members/{userId}/access-role`; `WorkerBusinessResponseDTO` gains `permissions` and `accessRole`; `MemberProfileDTO` gains `accessRole`, `actions.canChangeAccessRole`, and blocks the caller cannot read become `null`.
- Error `1020` keeps its code but now means "caller lacks the business permission the operation requires". New codes `1151`–`1154` for access roles.
- Realtime: new `SyncTopic.PERMISSIONS`; owner-scoped signals are delivered to members holding the topic's view permission.
- Root specs document the operation → permission table (authoritative over older "owner/manager" wording in operation descriptions).

## Capabilities

### New Capabilities
- `business-access-roles`: permission catalog, access-role management, role assignment, effective permissions exposure and permission-based authorization of business operations.

### Modified Capabilities
- none (realtime delivery rules for permissions are part of `business-access-roles`).

## Impact

- Main `0.0.102 → 0.0.103`, BFF `0.0.92 → 0.0.93`, tag `v1.0.7`.
- Consumers: flowrapp_backend (change `business-access-roles`), wsc_flowrapp (change `business-access-roles`), flowrapp_frontend (change `business-access-roles`).
- oasdiff flags the enum removal and new nullable profile blocks as breaking; intentional.
