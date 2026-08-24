# Changelog

## 0.0.44

### Added

- Optional trimmed, case-insensitive partial `name` filtering for business job-role slices, combined with `active` and pagination before deterministic ordering.
- Normalized job-role name uniqueness errors are documented separately from duplicate code conflicts (`1059`).

## 0.0.42

### Breaking changes

- The business job-role collection no longer accepts `includeInactive`; use the optional `active` filter instead (`true` for active roles, `false` for inactive roles, or omit it for both states).
- The business job-role collection response changed from a bare array to a slice with `content`, zero-based `page`, requested `size`, and `hasNext`.

### Added

- Optional `page` and `size` query parameters default to `0` and `20`; `page` must be non-negative and `size` must be between `1` and `100`.
- Job-role slices are ordered by active state descending, name ascending, and ID ascending, including ID tie-breaking for equal names.
- Examples document active-only, inactive-only, and unfiltered requests and the slice metadata.

## 0.0.38

### Breaking changes

- Contract updates now accept only the nullable `endDate`; `jobRoleId`, `totalWeekHours`, and `startDate` are immutable after creation.
- To change contractual hours, job role, or start date, create a new consecutive non-overlapping contract instead of replacing the existing contract.

### Added

- Owner-only business contract range queries over an inclusive maximum-31-day period, including the contracted `userId`.
- Owner-only effective recurring-schedule lookup and idempotent logical job-role deactivation.
- Planning-state conflicts prevent end-date updates affecting `SOLVING`, `READY`, `PUBLISHED`, or `ARCHIVED` weeks; `DRAFT` and `FAILED` remain editable.
- Active state is included in job-role metadata embedded in business-user current contracts.

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
