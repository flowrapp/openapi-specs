## Why

Flowrapp screens only refresh on focus, pull or 60 s polling, so an owner does not see a worker's clock-in, an attendance resolution or a published schedule until something triggers a refetch. We add realtime sync: the BFF streams lightweight invalidation signals over SSE while the app is in the foreground, and the existing FCM pushes carry the same signal. The app refetches through the existing REST endpoints; signals never carry data.

This repository owns the shared contracts: the BFF SSE endpoint and the `SyncSignal` message that Main publishes on RabbitMQ and the BFF consumes.

## What Changes

- BFF API: new tag `Realtime` and `GET /api/v1/businesses/{businessId}/events` (`text/event-stream`), events `ready` and `sync`, errors 401, 403 `1015`, 429.
- New schemas `SyncEvent`, `SyncReadyEvent`, `SyncTopic` (`WORKLOGS`, `ATTENDANCE`, `SCHEDULE`, `SHIFT_CHANGES`, `REPORTS`; clients ignore unknown values).
- New `docs/realtime-sync.md`: the AMQP `SyncSignal` contract (exchange, routing key, envelope, fields, delivery rule) and the FCM `data` keys. This is the single source of truth referenced by Main, BFF and app changes.
- BFF API version bump + CHANGELOG entry. Main API spec unchanged.

## Capabilities

### New Capabilities

- `realtime/bff-event-stream-contract`: the SSE endpoint, its events and the cross-service `SyncSignal` / push data contract.

## Impact

- `api/bff-api/rest/open-api-rest.yml`, new `v1/services/realtime/...` and `v1/components/realtime/...`, `api/bff-api/rest/CHANGELOG.md`, `docs/realtime-sync.md`.
- Consumers: BFF (`wsc_flowrapp`, change `realtime-sync`; implements the endpoint by hand, excluding the generated `RealtimeApi`), Main (`flowrapp_backend`, change `realtime-sync`; publishes `SyncSignal`), app (`flowrapp_frontend`, change `realtime-sync`).
- No repository tag is created by this change; Sergio tags the release.
