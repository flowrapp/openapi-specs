## Context

The BFF forwards commands to Main. Device geofence credentials currently only authorize event ingestion; worker break commands deliberately do not perform location checks. FCM device registration already exists.

## Goals / Non-Goals

**Goals:** Define additive contracts for headless commands, token lifecycle and platform-neutral state.

**Non-Goals:** Implement native UI, delivery services or a new general notification registration.

## Decisions

- Extend the existing scoped credential to exactly three own-worklog commands, rather than storing a bearer session in native code. BFF forwards it without logging; Main checks ownership and membership. Existing credentials need the new scope implemented server-side.
- Reuse each API's own worker command request and response definitions. Clock-out keeps its BLOCK/WARN checks; breaks still have no geofence check. Retrying uses the same idempotency identifier and command content.
- Store one push-to-start token per user/device and one update token per user/device/worklog. PUT replaces, DELETE is idempotent, and device DELETE removes both types at logout. Worklog ownership is verified for update registration. This avoids requiring a list of active activities to clean up on logout.
- Reuse FCM device tokens on both platforms. FCM's iOS `apns.live_activity_token` carries the ActivityKit token; start requires attributes and an alert, updates/end use the activity token. Android data values are strings.
- Use integer epoch seconds for all state instants and define timer offset from the same snapshot. Nullable fields are present as null when unavailable.

## Risks / Trade-offs

- [Credentials gain new authority] → enforce owner, membership, expiry, revocation and log redaction in Main and BFF; these contracts cannot enforce them.
- [Push delivery is best effort, may arrive late or be unavailable] → clients reconcile with server state on resume; native platform constraints and remote-start availability apply.
- [A device/worklog pair has only one update token] → replacing an activity on the same device replaces its old token.

## Migration Plan

Deploy Main support, then BFF forwarding and finally clients; older servers cannot service the new routes. Disable the native integration to roll back, without changing existing endpoints. No repository tag is created.
