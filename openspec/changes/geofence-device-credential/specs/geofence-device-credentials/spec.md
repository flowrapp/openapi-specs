## Purpose

Defines the Main and BFF contracts for issuing and revoking a device-scoped geofence credential and submitting geofence events without a Clerk session.

## ADDED Requirements

### Requirement: Issue and revoke geofence device credentials
Main SHALL expose `POST /api/v1/users/me/geofence-device-credentials` and BFF SHALL expose `POST /api/v1/worker/geofencing/device-credential`. Both operations SHALL require `bearerAuth`, accept `IssueGeofenceDeviceCredentialRequestDTO` with required `deviceId`, and return `201` with `GeofenceDeviceCredentialDTO` containing `token`, `issuedAt`, and `expiresAt`. The token SHALL be opaque (not a JWT), returned only on issue, and expire 90 days after issuance; issuing a credential SHALL replace any previous credential for that user and device. Main and BFF SHALL expose `DELETE` on the same paths, require `bearerAuth`, accept a required `deviceId` query parameter, return `204`, and be idempotent.

#### Scenario: Issue a device credential
- **WHEN** an authenticated caller issues a credential for a device
- **THEN** the request body contains `deviceId` and the response is `201` with `token`, `issuedAt`, and `expiresAt`

#### Scenario: Reject unauthenticated issue and revoke requests
- **WHEN** either operation is called without a valid bearer token
- **THEN** the contract documents a `401` response

#### Scenario: Revoke a device credential
- **WHEN** an authenticated caller deletes the credential path with a `deviceId` query parameter
- **THEN** the operation returns `204`, including when the credential is already absent

### Requirement: Submit geofence events with a device credential
Main and BFF SHALL expose `PUT /api/v1/device/businesses/{businessId}/geofence-events/{eventId}` with operationId `upsertDeviceGeofenceEvent`, require only the `geofenceDeviceCredential` security scheme, and reuse `GeofenceEventRequestDTO`. The scheme SHALL be an API key in the `X-Geofence-Credential` header. The operation SHALL document `201`, `204`, `400`, `401`, `403` (functional error `1015`), `404` (functional error `1006`), and `409` responses, and SHALL state that the header/value must never be logged.

#### Scenario: Submit an event with the device credential
- **WHEN** a device submits a valid geofence event with `X-Geofence-Credential`
- **THEN** the operation uses the device credential security scheme alone and documents the existing event-ingestion outcomes

#### Scenario: Do not accept bearer authentication on the device event operation
- **WHEN** a consumer inspects the device event operation's security requirements
- **THEN** only `geofenceDeviceCredential` is listed, with no `bearerAuth` or `basicAuth`

#### Scenario: Document credential redaction
- **WHEN** a consumer reads either device operation or security scheme description
- **THEN** it is told never to log the `X-Geofence-Credential` header or value

### Requirement: Retain legacy geofence event operations as deprecated
The existing Main `PUT /api/v1/businesses/{businessId}/geofence-events/{eventId}` and BFF `PUT /api/v1/worker/businesses/{businessId}/geofence-events/{eventId}` operations SHALL remain available, be marked `deprecated: true`, and point consumers to the corresponding `/api/v1/device/businesses/{businessId}/geofence-events/{eventId}` operation.

#### Scenario: Consumer finds the replacement for a legacy event operation
- **WHEN** a consumer reads either existing authenticated geofence event operation
- **THEN** it is marked deprecated and its description points to the new device event operation
