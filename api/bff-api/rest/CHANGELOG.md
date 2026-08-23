# Changelog

## 0.0.42

### Breaking changes

- The manager job-role collection no longer accepts `includeInactive`; use the optional `active` filter instead (`true` for active roles, `false` for inactive roles, or omit it for both states).
- The manager job-role collection response changed from a bare array to a slice with `content`, zero-based `page`, requested `size`, and `hasNext`.

### Added

- Optional `page` and `size` query parameters default to `0` and `20`; `page` must be non-negative and `size` must be between `1` and `100`.
- Manager job-role slices preserve MIG ordering: active state descending, name ascending, and ID ascending, including ID tie-breaking for equal names.
- Examples document active-only, inactive-only, and unfiltered requests and the slice metadata.

## 0.0.38

### Added

- `ARCHIVED` is now a supported read-only manager planning state.
- Manager planning contracts document local wall-clock required seconds, offset-aware scheduled seconds, full-precision contract proration, and the contract/assignment worker union.
- Planning examples cover overnight requirements, consecutive partial-week contracts, unassigned contracted workers, and assignments carrying inactive job-role metadata.

### Dependency migration

- The Main API contract update is now end-date-only. To change contractual hours, job role, or start date, create a new consecutive non-overlapping contract.

## 0.0.37

- Initial manager scheduling contract release.
