## Why

A business day without opening hours (closed in the weekly schedule or by a special day) is invisible in the worker's schedule and history and in the owner's attendance views: it looks the same as a normal day off. Consumers need to know a date is closed to mark it clearly, without a new Main API endpoint.

## What Changes

- Main API: `TeamScheduleDayDTO` gains required `open: boolean`, and `TeamScheduleResponseDTO.days` always contains the 7 days of the ISO week (Monday→Sunday), days without shifts carrying `shifts: []`.
- BFF API: required `closed: boolean` on `WorkerTeamScheduleDayDTO`, `WorkerWeekDayDTO`, `WorkerDayHistoryResponseDTO`, `AttendanceDayDTO` and the items of `AttendanceWeekDTO.days`. `WorkerTeamScheduleResponseDTO.days` always contains the 7 days of the week.
- Bump Main (0.0.100 → 0.0.101) and BFF (0.0.88 → 0.0.89) info versions; release tag `v1.0.4`.

## Capabilities

### New Capabilities
- `closed-day-marking`: contract for exposing whether a business-local date is closed.

### Modified Capabilities
- None.

## Impact

- Main: `getBusinessTeamSchedule` response schemas only. No new paths.
- BFF: worker schedule/history and owner attendance day/week response schemas only. No new paths.
- Consumers: flowrapp_backend (server, Main), wsc_flowrapp (Main client + BFF server), flowrapp_frontend (hand-written types).
