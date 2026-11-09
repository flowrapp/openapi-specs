## Why

Flowrapp is moving to two commercial plans, Essential and Professional, in one app and one backend. Essential digitalizes time tracking (clocking, geolocation, team, basic reports). Professional adds shift planning and advanced attendance incidents. Plan contents must be configurable, per-business availability must live in the backend (not in app switches), and every service must enforce it.

## What Changes

- New closed catalog `BusinessFeature`: `SCHEDULING`, `ATTENDANCE` (`ATTENDANCE` requires `SCHEDULING`). Only optional product modules are features; clocking, geolocation, team, contracts, reports and business settings are core and always available.
- Each business has a `plan` (open string, `ESSENTIAL` | `PROFESSIONAL` today). Plan → features is backend configuration. Platform admins may disable an included feature for one business directly in the database.
- Effective features = features of the plan ∩ not disabled for the business (dropping any whose requirement is unavailable). Effective permissions = role permissions minus the permissions owned by unavailable features.
- Main `getUserBusinesses` and BFF `getWorkerBusinesses` return `plan` and effective `features`.
- Operations owned by an unavailable feature fail with new `403 1155 BUSINESS_FEATURE_UNAVAILABLE`, including self-service operations (team schedule, own shifts, shift changes, attendance inbox).
- Admin: `PUT /api/v1/admin/businesses/{businessId}/plan` (`updateBusinessPlan`); `registerUser` business accepts optional `plan` (default `ESSENTIAL`). New `400 1156 BUSINESS_PLAN_UNKNOWN`.
- A plan change emits `SyncTopic.PERMISSIONS` to the business members. Database edits emit nothing.

## Capabilities

### New Capabilities
- `business-plans`: plan entitlements, business features, effective features/permissions exposure and feature-based authorization.

### Modified Capabilities
- none

## Impact

- Main `0.0.105 → 0.0.106`, BFF `0.0.95 → 0.0.96`, tag `v1.0.10`. Additive: new required response fields, new error codes, one admin endpoint.
- Consumers: flowrapp_backend, wsc_flowrapp, flowrapp_frontend (change `business-plans` in each).
