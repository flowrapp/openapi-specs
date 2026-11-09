## Why

The Main API and BFF descriptions of the management correction operations say reconciliation runs "later" and only records `CORRECTED`. In fact it runs synchronously, and with backend change `correction-accepts-remaining` a correction also accepts any temporal deviation the corrected times still produce, so the owner no longer has to press «Aceptar» after correcting.

## What Changes

- Main API: update descriptions of `correctBusinessWorklog`, `correctBusinessWorklogBreak` and `voidBusinessWorklogBreak` (and the reconciliation note near line 872 of `worklogs-operations.yml`): reconciliation runs in the same request; incidents the corrected data no longer produces close as `CORRECTED`; remaining temporal incidents (`EARLY_ENTRY`, `LATE_ENTRY`, `EARLY_EXIT`, `LATE_EXIT`, `UNEXPLAINED_GAP`) are resolved as `ACCEPTED` by the correcting owner with the correction reason; structural incidents still block approval.
- BFF: update `correctAttendanceShiftWorklog`, `correctAttendanceShiftBreak`, `correctAttendanceMatchWorklog`, `correctAttendanceMatchBreak` (and any void-break counterpart): drop "reconciliation later records CORRECTED" and the claim that a correction yields `RECONCILIATION_PENDING`; state that the refreshed detail already reflects the result and «Aceptar» is only needed if a structural incident or another unreviewed worklog remains.
- Bump both `info.version` patch numbers and add CHANGELOG entries (description-only, no schema change).

## Capabilities

### New Capabilities
- `attendance-correction`: contract wording for what a management correction does to attendance incidents.

## Impact

- Descriptions only: no paths, schemas, enums or operationIds change; no codegen needed for backend, BFF or app.
