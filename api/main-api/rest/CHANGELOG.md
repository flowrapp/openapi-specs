# Changelog

## 0.0.37

### Breaking changes

- The business-user projection now also returns `name`, `email`, and a nullable singular `currentContract` with job-role display metadata.
- The current-contract operation returns one `ContractResponseDTO` or `204`; overlapping contract periods are rejected across all job roles for the same user and business.
- Local scheduling times are now constrained as 24-hour `HH:mm` strings instead of the previous `time` format.
- Job-role create, update, and response schemas require hexadecimal `color` and catalog-slug `icon` values.
- Recurring-schedule and schedule-exception shifts require a hexadecimal `color`.

### Added

- Immutable planning requirement projections, scheduled-shift presentation metadata, and the terminal `FAILED` planning state with a sanitized `failureReason`.
- Atomic schedule-exception configuration replacement while keeping the stored exception date immutable.
- Owner-facing BFF scheduling resources for recurring schedules, exceptions, job roles, workers, weekly planning, and idempotent publication.
