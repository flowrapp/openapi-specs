## 1. Main API

- [x] 1.1 `components/business`: `BusinessFeature`; `plan` and `features` (required) in `BusinessResponseDTO`
- [x] 1.2 `components/admin`: optional `plan` in `BusinessDTO`; `BusinessPlanUpdateRequestDTO`
- [x] 1.3 `services/admin`: `updateBusinessPlan`; register path in root
- [x] 1.4 Error catalog: `1155`, `1156`
- [x] 1.5 Root `info.description`: plans and features section with the operation → feature table

## 2. BFF

- [x] 2.1 `BusinessFeature`; `plan` and `features` (required) in `WorkerBusinessResponseDTO`
- [x] 2.2 Root `info.description`: operation → feature table; realtime description mentions plan changes

## 3. Release

- [x] 3.1 `node scripts/validate-error-codes.js`, `redocly lint` both specs (no new errors)
- [x] 3.2 Bump Main `0.0.106`, BFF `0.0.96`; commit to `main`; tag `v1.0.10`; push

## 4. Contract clarification

- [x] 4.1 Document core clock-in/clock-out without attendance and the precedence of feature and permission errors; bump Main `0.0.107` and BFF `0.0.97`.
- [x] 4.2 Lint both APIs, validate errors and OpenSpec; publish the clarifications in a new tag.
