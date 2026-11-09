## ADDED Requirements

### Requirement: Business feature catalog
Main and BFF specs SHALL define a closed `BusinessFeature` enum with exactly `SCHEDULING` and `ATTENDANCE`, documenting that `ATTENDANCE` requires `SCHEDULING`, that `SCHEDULING` owns `SCHEDULE_VIEW`, `SCHEDULE_MANAGE` and `SHIFT_CHANGES_APPROVE`, and that `ATTENDANCE` owns `ATTENDANCE_VIEW` and `ATTENDANCE_MANAGE`.

#### Scenario: Core permissions are not owned by a feature
- **WHEN** a reader looks up `REPORTS_EXPORT` or `CLOCKING_SETTINGS_MANAGE`
- **THEN** no `BusinessFeature` owns it and it is available in every plan

### Requirement: Plan and effective features exposed
`getUserBusinesses` (Main) and `getWorkerBusinesses` (BFF) SHALL return, per business, the business `plan` and its effective `features`.

#### Scenario: Professional business
- **WHEN** the business plan is `PROFESSIONAL` and nothing is disabled
- **THEN** `plan` is `PROFESSIONAL` and `features` is `[SCHEDULING, ATTENDANCE]`

#### Scenario: Essential business
- **WHEN** the business plan is `ESSENTIAL`
- **THEN** `features` is empty and `permissions` holds no permission owned by a feature, even for the OWNER

#### Scenario: Requirement disabled
- **WHEN** a `PROFESSIONAL` business has `SCHEDULING` disabled
- **THEN** `features` is empty

### Requirement: Feature-based authorization
An operation owned by a feature that is unavailable for the business SHALL fail with `403 1155`, in Main and in the BFF.

#### Scenario: Permission granted by role, feature unavailable
- **WHEN** the OWNER of an `ESSENTIAL` business calls `publishPlanning`
- **THEN** 403 `1155`

#### Scenario: Permission and feature are both unavailable
- **WHEN** an active EMPLOYEE without `SCHEDULE_MANAGE` calls `publishPlanning` in an `ESSENTIAL` business
- **THEN** 403 `1155` in both Main and BFF

#### Scenario: Feature available but permission missing
- **WHEN** an active EMPLOYEE without `SCHEDULE_MANAGE` calls `publishPlanning` in a `PROFESSIONAL` business
- **THEN** 403 `1020`

#### Scenario: Self-service operation
- **WHEN** an EMPLOYEE of an `ESSENTIAL` business calls `getBusinessTeamSchedule` or `getWorkerTeamSchedule`
- **THEN** 403 `1155`

#### Scenario: Core operation
- **WHEN** an EMPLOYEE of an `ESSENTIAL` business clocks in
- **THEN** the feature check does not apply

### Requirement: Plan administration
A platform `ADMIN` SHALL set a business plan with `PUT /api/v1/admin/businesses/{businessId}/plan`, and MAY set it when registering a business (default `ESSENTIAL`).

#### Scenario: Change plan
- **WHEN** an admin sends `{plan: "PROFESSIONAL"}` for an existing business
- **THEN** 204 and members receive a `PERMISSIONS` sync signal

#### Scenario: Unknown plan
- **WHEN** the plan is not configured
- **THEN** 400 `1156`

#### Scenario: Unknown business
- **WHEN** the business does not exist
- **THEN** 404 `1006`
