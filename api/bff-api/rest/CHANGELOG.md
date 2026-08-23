# Changelog

## 0.0.38

### Added

- `ARCHIVED` is now a supported read-only manager planning state.
- Manager planning contracts document local wall-clock required seconds, offset-aware scheduled seconds, full-precision contract proration, and the contract/assignment worker union.
- Planning examples cover overnight requirements, consecutive partial-week contracts, unassigned contracted workers, and assignments carrying inactive job-role metadata.

### Dependency migration

- The Main API contract update is now end-date-only. To change contractual hours, job role, or start date, create a new consecutive non-overlapping contract.

## 0.0.37

- Initial manager scheduling contract release.
