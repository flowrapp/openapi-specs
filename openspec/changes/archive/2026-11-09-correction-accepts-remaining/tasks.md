## 1. Main API

- [x] 1.1 Update descriptions of `correctBusinessWorklog`, `correctBusinessWorklogBreak`, `voidBusinessWorklogBreak` and the reconciliation note in `api/main-api/rest/v1/services/worklogs/worklogs-operations.yml`
- [x] 1.2 Check other Main descriptions that say a correction is resolved "later" (`grep -rn -i "later" api/main-api` around attendance/incidents) and align them
- [x] 1.3 Bump `info.version` patch and add a CHANGELOG entry (description-only)

## 2. BFF

- [x] 2.1 Update descriptions of the shift and match worklog/break correction operations (and void-break if present) in `api/bff-api/rest/v1/services/attendance/attendance-operations.yml`
- [x] 2.2 Bump `info.version` patch and add a CHANGELOG entry (description-only)

## 3. Verify

- [x] 3.1 `redocly lint` (or `vacuum lint`) on both root specs; no new errors versus `main`
- [x] 3.2 `git diff` shows description, version and CHANGELOG changes only
