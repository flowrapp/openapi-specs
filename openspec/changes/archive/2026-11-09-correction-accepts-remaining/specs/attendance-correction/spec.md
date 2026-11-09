## ADDED Requirements

### Requirement: Management correction outcome is documented

The Main API and BFF descriptions of every management worklog and break correction operation SHALL state that incident reconciliation runs within the same request, that incidents no longer produced by the corrected data are resolved as `CORRECTED`, that remaining temporal incidents are resolved as `ACCEPTED` by the correcting owner with the correction reason, and that structural incidents keep blocking approval. The descriptions MUST NOT claim that reconciliation of a correction happens later.

#### Scenario: Client reads the correction contract

- **WHEN** a client developer reads the description of a correction operation
- **THEN** it learns that no separate accept call is needed when only temporal deviations remain

#### Scenario: Structural incident remains

- **WHEN** a correction leaves an `AUTOMATIC_CLOSE`, `UNSCHEDULED_WORK` or `AMBIGUOUS_MATCH` open
- **THEN** the description says approval remains blocked by that incident
