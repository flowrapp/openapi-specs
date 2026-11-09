## ADDED Requirements

### Requirement: Business feature catalog
Main and BFF specs SHALL define `BusinessFeature` values `SCHEDULING`, `ATTENDANCE` and `ADVANCED_PLANNING`, documenting that the latter two require `SCHEDULING`, that `SCHEDULING` owns `SCHEDULE_VIEW`, `SCHEDULE_MANAGE` and `SHIFT_CHANGES_APPROVE`, and that `ATTENDANCE` owns `ATTENDANCE_VIEW` and `ATTENDANCE_MANAGE`. `ADVANCED_PLANNING` gates the explicitly listed advanced operations independently of RBAC.

#### Scenario: Core permissions are not owned by a feature
- **WHEN** a reader looks up `REPORTS_EXPORT` or `CLOCKING_SETTINGS_MANAGE`
- **THEN** no `BusinessFeature` owns it and it is available in every plan

### Requirement: Plan and effective features exposed
`getUserBusinesses` (Main) and `getWorkerBusinesses` (BFF) SHALL return, per business, the business `plan` and its effective `features`.

#### Scenario: Professional business
- **WHEN** the business plan is `PROFESSIONAL` and nothing is disabled
- **THEN** `plan` is `PROFESSIONAL` and `features` contains `SCHEDULING`, `ATTENDANCE` and `ADVANCED_PLANNING`

#### Scenario: Essential business
- **WHEN** the business plan is `ESSENTIAL`
- **THEN** `features` contains `SCHEDULING` but not `ATTENDANCE` or `ADVANCED_PLANNING`; `permissions` includes the role's scheduling permissions and excludes attendance permissions

#### Scenario: Requirement disabled
- **WHEN** a `PROFESSIONAL` business has `SCHEDULING` disabled
- **THEN** `features` is empty

### Requirement: Feature-based authorization
An operation owned by a feature that is unavailable for the business SHALL fail with `403 1155`, in Main and in the BFF.

#### Scenario: Advanced feature unavailable
- **WHEN** the OWNER of an `ESSENTIAL` business requests automatic planning generation or the BFF coverage view
- **THEN** 403 `1155`

#### Scenario: Permission and feature are both unavailable
- **WHEN** an active EMPLOYEE without `SCHEDULE_MANAGE` requests automatic planning generation in an `ESSENTIAL` business
- **THEN** 403 `1155` in both Main and BFF

#### Scenario: Feature available but permission missing
- **WHEN** an active EMPLOYEE without `SCHEDULE_MANAGE` calls `publishPlanning` in a `PROFESSIONAL` business
- **THEN** 403 `1020`

#### Scenario: Self-service operation
- **WHEN** an EMPLOYEE calls `getBusinessTeamSchedule` or `getWorkerTeamSchedule` in a business where `SCHEDULING` is disabled
- **THEN** 403 `1155`

#### Scenario: Manual schedule in Essential
- **WHEN** an authorised manager of an `ESSENTIAL` business creates an empty draft, assigns shifts manually and publishes it
- **THEN** the operations succeed and an employee can read the published schedule

#### Scenario: Existing generated schedule after downgrade
- **WHEN** a business with a previously generated schedule downgrades to `ESSENTIAL`
- **THEN** authorised members can still read and manually maintain the schedule, but cannot start generation or open the dedicated coverage operation

#### Scenario: Core operation
- **WHEN** an EMPLOYEE of an `ESSENTIAL` business clocks in
- **THEN** the feature check does not apply and the response includes the durable `attendanceMatchId` of a passive `NOT_APPLICABLE` match

#### Scenario: Core clock-out
- **WHEN** an EMPLOYEE of an `ESSENTIAL` business closes an ordinary confirmed worklog
- **THEN** the worklog remains confirmed, and its worked hours are included after the asynchronous report recalculation

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
