## Why

Background geofencing must be able to submit events without loading a Clerk session. The API contracts need a device-scoped credential that is limited to geofence event delivery, while keeping the existing authenticated event routes available during migration.

## What Changes

- Add authenticated issue and idempotent revoke operations to Main and BFF for a device's geofence credential.
- Add a credential-only device geofence-event operation in Main and BFF, and document that the credential header must never be logged.
- Deprecate, but retain, the existing bearer/basic-auth geofence event operations.
- Increment both OpenAPI info versions.

## Capabilities

### New Capabilities
- `geofence-device-credentials`: contract for issuing, revoking, and using a device-scoped geofence credential.

### Modified Capabilities
- None.

## Impact

- Main and BFF OpenAPI paths, operations, security schemes, and geofence DTOs.
- No backend implementation or client changes are included in this contract-only change.
