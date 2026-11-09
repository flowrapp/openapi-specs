# realtime/bff-event-stream-contract Specification

## Purpose
TBD - created by archiving change realtime-sync. Update Purpose after archive.

## Requirements

### Requirement: BFF exposes a business event stream

The BFF API SHALL define `GET /api/v1/businesses/{businessId}/events` (tag `Realtime`, operationId `streamBusinessEvents`, `bearerAuth`) returning `200 text/event-stream`. The description SHALL document the `ready` and `sync` events, the 25 s heartbeat comment, the 30 min server-side close, the 3-streams-per-user limit, the `Cache-Control: no-cache` and `X-Accel-Buffering: no` headers, and that `Last-Event-ID` is ignored.

#### Scenario: Member opens the stream

- **WHEN** an authenticated member of the business calls the endpoint
- **THEN** the contract documents a `200 text/event-stream` response whose first event is `ready` with `{"businessId": <id>}`

#### Scenario: Not a member

- **WHEN** the caller is not a member of the business
- **THEN** the contract documents `403 application/problem+json` with functional code `1015` before any event is sent

#### Scenario: Invalid token or rate limited

- **WHEN** the token is missing or invalid, or the caller exceeds the connect limit
- **THEN** the contract documents `401` and `429` `application/problem+json` responses respectively

### Requirement: Sync event payloads are documented schemas

The BFF API SHALL define `SyncReadyEvent {businessId}`, `SyncEvent {businessId (nullable), topics: SyncTopic[]}` and `SyncTopic` (`WORKLOGS`, `ATTENDANCE`, `SCHEDULE`, `SHIFT_CHANGES`, `REPORTS`) under the BFF components. `SyncTopic` SHALL state that clients must ignore unknown values. `audience` and `userIds` SHALL NOT appear in any app-facing schema.

#### Scenario: Topic list grows

- **WHEN** a future version adds a topic
- **THEN** the contract already states that clients ignore unknown topics, so the change is non-breaking

### Requirement: Cross-service sync contract is documented

The repository SHALL contain `docs/realtime-sync.md` describing the `SyncSignal` AMQP message (exchange `flowrapp.outbox-events`, routing key `sync.changed`, Namastack `OutboxEnvelope` wrapping, fields, delivery rule), the phase-1 topic table with audiences, and the FCM data keys `syncBusinessId` / `syncTopics`.

#### Scenario: A service implements the contract

- **WHEN** Main, the BFF or the app implement realtime sync
- **THEN** they can take field names, routing key, delivery rule and push keys from `docs/realtime-sync.md` without reading another repository

### Requirement: BFF API version is bumped

The BFF API `info.version` SHALL be incremented and `api/bff-api/rest/CHANGELOG.md` SHALL describe the addition. The Main API spec SHALL NOT change.

#### Scenario: Lint passes

- **WHEN** the BFF spec is linted (`redocly lint` or `vacuum lint`, whichever is available) and `node scripts/validate-error-codes.js` runs
- **THEN** both pass, or the change records why they could not run
