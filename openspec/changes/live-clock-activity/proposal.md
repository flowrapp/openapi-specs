## Why

Workers need to see and control their current work session without opening the app, including when a session changes while the app is closed.

## What Changes

- Add device-credential clock-out and break commands to Main and BFF, preserving the existing worker command semantics.
- Add authenticated iOS Live Activity token registration and cleanup per device and worklog; reuse the existing Android FCM registration.
- Specify a shared net-worked-time state and platform push formats for starting, updating and ending the activity.
- Publish additive Main and BFF contract versions; implementation in backend and app is outside this repository.

## Capabilities

### New Capabilities

- `live-clock-activity`: Headless worklog commands, activity token lifecycle and live clock push state.

### Modified Capabilities

None.

## Impact

Main and BFF OpenAPI contracts, device credential scope, changelogs, backend push delivery and iOS/Android clients. The change does not implement these services or clients.
