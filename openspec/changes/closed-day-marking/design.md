## Context

A date is **closed** when its effective daily configuration has no opening intervals. The effective configuration is the special day (schedule exception) of the date if any, otherwise the day of the recurring schedule effective on that date, otherwise none (closed). Main already resolves this (`EffectiveScheduleDayResolver`) and exposes it to owners only through `getPlanningGenerationInput`. Workers can only read `getBusinessTeamSchedule`.

## Decisions

- **Metadata on existing responses, no new endpoints.** Main exposes `open` per day on the member-visible team schedule; the BFF derives `closed` for workers from it and for owners from `getPlanningGenerationInput`, which it already reads.
- **Main uses `open`, BFF uses `closed`.** Main mirrors the planning input wording (opening intervals); BFF fields describe what the UI marks.
- **7 days always** in both team schedule responses, so a closed day without shifts is still reported. Filters (`userIds`, `jobRoleId`) only filter shifts, never days.
- **Required booleans.** Servers always send them. In BFF history responses `closed` is `false` when it cannot be known (e.g. no published planning for that week).
- `closed` refers to the business, not to the person: a person's day off on an open day is not closed.

- `WorkerMonthDayDTO` is out of scope: the app does not read the month history.

## Risks / Trade-offs

- Worker history weeks without a published planning cannot report closed days (Main returns 404 for the team schedule) → documented as `false`.
