# Realtime sync — shared contract

This document is the shared source of truth for Main, the BFF and the app realtime-sync contracts.

## Architecture

```text
Main use case (tx) ── outbox ──► exchange flowrapp.outbox-events (topic)
   domain event ────────────────► flowrapp.notification ──► FCM push (+ sync data)
   + SyncSignal ────────────────► routing key sync.changed
                                      │ one anonymous queue per BFF instance (broadcast)
                                      ▼
                      BFF SseHub (in memory, filters by business / OWNER / user)
                                      │ SSE GET /api/v1/businesses/{businessId}/events
                                      ▼
                 App ─► TanStack invalidateQueries ─► REST refetch through the BFF
```

Principles:

- Signals say *what changed*, never the data. No PII.
- Delivery is best effort. Correctness comes from the app: on every (re)connect it receives `ready` and invalidates its whole cache; on resume it already refetches active queries.
- Main decides the audience; the BFF enforces it against a membership snapshot taken when the stream opens.
- No Redis, no sticky sessions, no replay (`Last-Event-ID` is ignored).
- Only `OWNER` gets owner-scoped signals. `MANAGER` is treated as a regular member (the role is being removed).

## AMQP message: `SyncSignal`

- Exchange: `flowrapp.outbox-events` (topic, durable). Routing key: `sync.changed`.
- Published by Main through the Namastack outbox, so it travels inside Main's `OutboxEnvelope`:

```json
{
  "schemaVersion": 1.0,
  "eventId": "3f0c…",
  "occurredAt": "2026-11-08T10:00:00Z",
  "payloadClass": "io.github.flowrapp.event.SyncSignal",
  "payload": "{\"eventId\":\"3f0c…\",\"occurredAt\":\"2026-11-08T10:00:00Z\",\"businessId\":12,\"topics\":[\"WORKLOGS\",\"ATTENDANCE\"],\"audience\":\"OWNERS\",\"userIds\":[34]}"
}
```

Consumers MUST NOT depend on `payloadClass`; they parse `payload` (a JSON string) as:

| Field | Type | Notes |
|---|---|---|
| `eventId` | UUID | unique per signal |
| `occurredAt` | ISO instant | |
| `businessId` | long, nullable | null = only `userIds` are addressed |
| `topics` | string[] | see topics; unknown values are forwarded/ignored, never fail |
| `audience` | `MEMBERS` \| `OWNERS` \| `USERS` | |
| `userIds` | long[] | internal Flowrapp user ids, always addressed in addition to `audience` |

### Delivery rule

A stream of user `u`, opened for business `b`, where `u` has role `r` in `b`, receives a signal `s` iff:

```text
u ∈ s.userIds
OR ( s.businessId == b AND ( s.audience == MEMBERS OR (s.audience == OWNERS AND r == OWNER) ) )
```

`USERS` means "only `userIds`".

## Topics (phase 1)

| Topic | Emitted when | Audience |
|---|---|---|
| `WORKLOGS` | clock-in/out, worklog correction/update, breaks, automatic close, geofencing auto clock, approve/reject worklog | `OWNERS` + the worker |
| `ATTENDANCE` | attendance reconciliation finished, attendance actions (approve shift, acknowledge no-show, accept unplanned, resolve match, justify incident group, respond to a change confirmation), shift due/no-show, tolerance change | `OWNERS` + affected workers |
| `SCHEDULE` | planning published (`MEMBERS`); planning created/solved/draft edits, recurring schedule, schedule exceptions, business shifts, generation settings (`OWNERS`); approved shift change (`MEMBERS`) | see left |
| `SHIFT_CHANGES` | any shift-exchange / schedule-change request transition | `OWNERS` + request recipients |
| `REPORTS` | the asynchronous daily report recalculation finished | `OWNERS` + the worker |

## SSE stream (BFF → app)

`GET /api/v1/businesses/{businessId}/events`, `Accept: text/event-stream`, `Authorization: Bearer <Clerk token>`.

- 401 invalid token, 403 `1015` not a member of the business (both `application/problem+json`, before any event), 429 rate limited.
- Response headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `X-Accel-Buffering: no`.
- Events:

```text
event: ready
data: {"businessId":12}

id: 3f0c…
event: sync
data: {"businessId":12,"topics":["WORKLOGS","REPORTS"]}

: ping
```

- `audience` and `userIds` are never sent to the app.
- Heartbeat comment every 25 s. The server closes the stream after 30 min (the app reconnects, which re-validates the token and membership). Max 3 concurrent streams per user per BFF instance (the oldest is closed).
- `Last-Event-ID` is ignored; the stream does not replay events.

## Push data (FCM)

Existing notifications keep their title/body/data. When the triggering event maps to a signal, Main adds (FCM data values are strings):

| Key | Example |
|---|---|
| `syncBusinessId` | `"12"` (absent when null) |
| `syncTopics` | `"WORKLOGS,ATTENDANCE"` |

Keys are prefixed so they never collide with existing keys such as `type: CLOCK_IN_NOTICE` or `requestId`. No silent/data-only pushes are sent.
