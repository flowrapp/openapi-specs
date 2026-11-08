## Main API contract

- [x] Add required `open: boolean` to `TeamScheduleDayDTO` (`api/main-api/rest/v1/components/scheduling/components.yml`) with the closed-day definition in its description.
- [x] Document that `TeamScheduleResponseDTO.days` always has the 7 days of the ISO week (`minItems: 7`, `maxItems: 7`), days without shifts with `shifts: []`, filters never removing days; update the descriptions of both schemas and the `getBusinessTeamSchedule` examples.

## BFF API contract

- [x] Add required `closed: boolean` to `WorkerTeamScheduleDayDTO`, `WorkerWeekDayDTO`, `WorkerDayHistoryResponseDTO` (`api/bff-api/rest/v1/components/worker/components.yml`).
- [x] Document 7 days always on `WorkerTeamScheduleResponseDTO.days`.
- [x] Add required `closed: boolean` to `AttendanceDayDTO` and to the items of `AttendanceWeekDTO.days` (`api/bff-api/rest/v1/components/attendance/components.yml`).
- [x] Add required `closed: boolean` to `AttendanceHoursDayDTO` (owner «Horas» chart); BFF 0.0.89 → 0.0.90, tag `v1.0.5`.
- [x] Update affected examples in operations/components so they include the new fields.

## Release

- [x] Bump Main `info.version` 0.0.100 → 0.0.101 and BFF 0.0.88 → 0.0.89.
- [x] Run `openspec validate --all --strict`, Redocly lint and `node scripts/validate-error-codes.js` (see AGENTS.md / CONTRIBUTING.md).
- [x] Commit on `main`, create tag `v1.0.4`, push `main` and the tag.
