## Why

Flowrapp is moving to two commercial plans, Essential and Professional, in one app and one backend. Essential covers time tracking, geolocation, basic reports and shifts assigned manually by an authorised manager. Employees can consult their shifts. Professional adds the advanced planning view, coverage, automatic generation and advanced attendance incidents. Plan contents must be configurable, per-business availability must live in the backend (not in app switches), and every service must enforce it.

## What Changes

- New closed catalog `BusinessFeature`: `SCHEDULING`, `ATTENDANCE`, `ADVANCED_PLANNING` (the last two require `SCHEDULING`). Scheduling is in both plans; advanced planning and attendance are Professional by default. Clocking, geolocation, team, contracts, reports and business settings are core.
- Each business has a `plan` (open string, `ESSENTIAL` | `PROFESSIONAL` today). Plan → features is backend configuration. Platform admins may disable an included feature for one business directly in the database.
- Effective features = features of the plan ∩ not disabled for the business (dropping any whose requirement is unavailable). Effective permissions = role permissions minus the permissions owned by unavailable features.
- Main `getUserBusinesses` and BFF `getWorkerBusinesses` return `plan` and effective `features`.
- Operations owned by an unavailable feature fail with new `403 1155 BUSINESS_FEATURE_UNAVAILABLE`, including self-service operations (team schedule, own shifts, shift changes, attendance inbox).
- Admin: `PUT /api/v1/admin/businesses/{businessId}/plan` (`updateBusinessPlan`); `registerUser` business accepts optional `plan` (default `ESSENTIAL`). New `400 1156 BUSINESS_PLAN_UNKNOWN`.
- A plan change emits `SyncTopic.PERMISSIONS` to the business members. Database edits emit nothing.
- Professional-only planning operations require `ADVANCED_PLANNING` in addition to the existing scheduling permissions; shared manual-planning operations remain available in Essential.

## Capabilities

### New Capabilities
- `business-plans`: plan entitlements, business features, effective features/permissions exposure and feature-based authorization.

### Modified Capabilities
- none

## Impact

- Main `0.0.105 → 0.0.108`, BFF `0.0.95 → 0.0.98`, tag `v1.0.12`. Additive: new required response fields, new error codes, one admin endpoint and an additional feature value.
- Consumers: flowrapp_backend, wsc_flowrapp, flowrapp_frontend (change `business-plans` in each).
