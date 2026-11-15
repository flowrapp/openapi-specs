## Purpose

Define the device commands, token lifecycle and shared state that keep a worker's live clock current outside the app.

## ADDED Requirements

### Requirement: Authorize headless worklog commands
Main and BFF SHALL expose device clock-out, break-start and break-end routes using only `X-Geofence-Credential`, never bearer authentication. The credential SHALL be valid, unexpired and unrevoked, and its user SHALL own the worklog and remain a business member. The BFF SHALL forward the credential without logging its header or value. Requests, responses, errors and idempotency SHALL match the corresponding existing worker commands. Clock-out SHALL apply the existing ALLOW/WARN/BLOCK geofence policy; break commands SHALL not perform geofence checks, as in the worker contract.

#### Scenario: Worker pauses from the live clock
- **WHEN** a device submits a valid start-break command for its owner's worklog and repeats the identical command with the same idempotency identifier
- **THEN** both calls return the same break and do not require a location

#### Scenario: Credential cannot act on another worker's worklog
- **WHEN** a device submits a command for a worklog owned by another user
- **THEN** the command is forbidden using the corresponding worker error contract

#### Scenario: Blocked clock-out without location
- **WHEN** a device submits a clock-out without location under BLOCK
- **THEN** the existing policy rejects it with 403 and functional code 1100

### Requirement: Manage iOS activity tokens
Main and BFF SHALL allow a bearer-authenticated user to replace and delete a push-to-start token per device and an update token per device and owned worklog. Device-wide deletion SHALL remove both kinds for that user and device. Deletes SHALL be idempotent. Registrations SHALL be scoped to the authenticated user and device and SHALL NOT expose or log token values. Android SHALL reuse existing FCM device registration.

#### Scenario: Rotate an activity token
- **WHEN** the worker registers a new update token for the same device and owned worklog
- **THEN** it replaces the previous update token without affecting another device

#### Scenario: Clean up on logout
- **WHEN** the worker deletes all live clock tokens for a device, including a repeated deletion
- **THEN** the server returns 204 and no push-to-start or update token remains for that user and device

### Requirement: Publish live clock state
Both contracts SHALL define `LiveClockState` with status, business/worklog identity and names, epoch-second clock and shift instants, net worked seconds, break identity and planned break minutes. Optional domain values SHALL be represented by required nullable fields. At each snapshot `timerStartEpochSeconds` SHALL equal `asOfEpochSeconds - workedSeconds`; WORKING displays now minus that value, while ON_BREAK and CLOCKED_OUT display frozen worked seconds. State SHALL support local construction and remote updates.

#### Scenario: A worker is on break
- **WHEN** a snapshot is ON_BREAK
- **THEN** worked seconds are frozen and the active break ID and start instant are present

#### Scenario: Push state to either platform
- **WHEN** worklog state changes while the app is closed, including auto-clocking, another device or a manager edit
- **THEN** the backend sends the applicable iOS start/update/end ActivityKit push via FCM or Android FCM data message with the same state, subject to platform delivery constraints
