# Worker inbox domain events (internal contract note)

Main API 0.0.96. This note is not a public HTTP contract. The specs have no public event
endpoint (no `POST /api/v1/events`) and no message schemas. Existing asynchronous work, such as
the clock-in notice and the invitation emails, runs through the transactional outbox and
RabbitMQ, and the OpenAPI files describe it only in prose. These two events follow that
pattern. No push code and no new transport are part of this change.

## Events

| Name | When | Written |
|---|---|---|
| `worklogChangeConfirmationPending` | A management CORRECTED or REJECTED change creates a PENDING confirmation (`correctBusinessWorklog`, `rejectWorklog`, author is not the worker) | Outbox row in the same transaction as the change and its confirmation |
| `worklogChangeDisputed` | `respondToWorklogChangeConfirmation` stores DISPUTED | Outbox row in the same transaction as the answer; not written again on an idempotent retry |

An ACKNOWLEDGED answer emits no event. The specification does not establish
that the existing management operations already publish an event named `WorklogUpdated`; no existing event is asserted or replaced here.
The two notifications below are additional outbox rows in their respective transactions.

## Payload

| Field | Type | Both | Notes |
|---|---|---|---|
| `eventId` | uuid | yes | Outbox id, for idempotent consumers |
| `worklogChangeId` | int64 | yes | Parent change; the confirmation identity |
| `worklogId` | int64 | yes | |
| `businessId` | int64 | yes | |
| `userId` | int64 | yes | Worker of the change (recipient of the pending push) |
| `action` | `CORRECTED` \| `REJECTED` | yes | |
| `authorId` | int64 | yes | Management author of the change |
| `respondedBy` | int64 \| null | disputed | Null in `worklogChangeConfirmationPending` |
| `occurredAt` | date-time | yes | Change time (pending) or answer time (disputed) |
| `date` | date | yes | `AttendanceAnchorDTO.date` |
| `scheduledShiftId` | int64 \| null | yes | `AttendanceAnchorDTO.scheduledShiftId`; null when not MATCHED |
| `attendanceMatchId` | int64 \| null | yes | `AttendanceAnchorDTO.attendanceMatchId` |

The navigation fields are the same values as the inbox `anchor`. A deep link opens the day
history on `date`, then the SHIFT row of `scheduledShiftId` when it is set, otherwise the
UNMATCHED row of `attendanceMatchId`. It never derives a shift from `date` alone and never picks
a candidate of an ambiguous match.

## Consumers (to be decided, not specified here)

- A proposed later push to the worker's devices for
  `worklogChangeConfirmationPending`, along the lines of
  «Han corregido o rechazado tu fichaje del {date}: revísalo». The wording needs Content
  review, and must not claim a legal requirement.
- Any OWNER notification for `worklogChangeDisputed`. There is no owner inbox in this contract;
  the OWNER sees the answer in the attendance detail.
- Pushes for newly opened attendance incidents are out of scope. If they are added, they
  should carry the same anchor fields.
