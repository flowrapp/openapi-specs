## ADDED Requirements

### Requirement: Business permission catalog
Main and BFF specs SHALL define a closed `BusinessPermission` enum with exactly `TEAM_VIEW`, `TEAM_INVITE`, `CONTRACTS_MANAGE`, `WORKLOGS_VIEW`, `WORKLOGS_MANAGE`, `ATTENDANCE_VIEW`, `ATTENDANCE_MANAGE`, `SCHEDULE_VIEW`, `SCHEDULE_MANAGE`, `SHIFT_CHANGES_APPROVE`, `REPORTS_VIEW`, `REPORTS_EXPORT`, `CLOCKING_SETTINGS_MANAGE`, `BUSINESS_EDIT`.

#### Scenario: Implied permissions are stored
- **WHEN** an access role is saved with `ATTENDANCE_MANAGE` only
- **THEN** the returned role contains `ATTENDANCE_MANAGE`, `ATTENDANCE_VIEW`, `WORKLOGS_MANAGE`, `WORKLOGS_VIEW`, `SCHEDULE_VIEW`, `REPORTS_VIEW` and `TEAM_VIEW`

### Requirement: Membership roles without MANAGER
Every business membership role enum in Main and BFF SHALL be `[OWNER, EMPLOYEE]`.

#### Scenario: Invitation with MANAGER rejected
- **WHEN** a business invitation is created with role `MANAGER`
- **THEN** the request fails schema validation with 400

### Requirement: Access role management
The OWNER of a business SHALL list, create, replace and delete access roles of that business. Any other caller SHALL get 403 `1020`.

#### Scenario: Create access role
- **WHEN** the OWNER posts `{name: "Encargado", permissions: [TEAM_VIEW, REPORTS_VIEW]}`
- **THEN** 201 returns the role with `id`, trimmed `name`, closed `permissions` and `memberCount: 0`

#### Scenario: Duplicate name
- **WHEN** a role with the same name (case-insensitive, trimmed) already exists in the business
- **THEN** 409 `1152`

#### Scenario: Invalid role
- **WHEN** the name is blank or longer than 50 characters, or `permissions` is empty
- **THEN** 400 `1153`

#### Scenario: Delete unassigns members
- **WHEN** the OWNER deletes a role assigned to members
- **THEN** 204 and those members have `accessRole: null`

#### Scenario: Unknown role
- **WHEN** the role id does not belong to the business
- **THEN** 404 `1151`

### Requirement: Access role assignment
The OWNER SHALL set or clear the access role of an EMPLOYEE member with `PUT .../users/{userId}/access-role` (Main) or `PUT .../members/{userId}/access-role` (BFF).

#### Scenario: Assign
- **WHEN** the OWNER sends `{accessRoleId: 7}` for an EMPLOYEE
- **THEN** 204 and the member's `accessRole` is `{id: 7, name}`

#### Scenario: Clear
- **WHEN** the OWNER sends `{accessRoleId: null}`
- **THEN** 204 and the member has no access role

#### Scenario: Target is an owner
- **WHEN** the target member is an OWNER
- **THEN** 409 `1154`

#### Scenario: Target not a member
- **WHEN** the target user has no active membership
- **THEN** 403 `1015`

### Requirement: Effective permissions exposed
`getUserBusinesses` (Main) and `getWorkerBusinesses` (BFF) SHALL return, per business, the caller's effective `permissions` and nullable `accessRole`.

#### Scenario: Owner
- **WHEN** the caller is OWNER
- **THEN** `permissions` holds all 14 values and `accessRole` is null

#### Scenario: Employee without active contract
- **WHEN** the caller is an EMPLOYEE without an active contract
- **THEN** `permissions` is empty

### Requirement: Permission-based authorization
Each business operation SHALL require the permission given by the operation → permission table of the root spec description; a caller lacking it SHALL get 403 `1020`.

#### Scenario: Employee granted a permission
- **WHEN** an EMPLOYEE whose access role holds `REPORTS_VIEW` calls `getBusinessReports`
- **THEN** 200

#### Scenario: Permission revoked
- **WHEN** that permission is removed from the role and the employee calls again
- **THEN** 403 `1020`

### Requirement: Member profile per permission
The BFF member profile SHALL require `TEAM_VIEW` and return `null` for blocks the caller cannot read.

#### Scenario: Viewer without worklog access
- **WHEN** the caller holds `TEAM_VIEW` but not `WORKLOGS_VIEW`
- **THEN** `liveStatus` and `week` are `null` and the remaining blocks are filled

### Requirement: Permissions realtime topic
The BFF event stream SHALL emit topic `PERMISSIONS` to all members of a business when one of its access roles or assignments changes, and deliver owner-scoped signals to subscribers holding the view permission of the signal's topic.

#### Scenario: Manager receives worklog signal
- **WHEN** a `WORKLOGS` signal for the business is published with audience `OWNERS`
- **THEN** a subscriber holding `WORKLOGS_VIEW` receives it and one without it does not

### Requirement: Members filtered by access role
Main `getBusinessUsersV2` and BFF `searchBusinessMembers` SHALL accept an optional `accessRoleId` that keeps only active members holding that access role, combined with the other filters.

#### Scenario: Holders of a role
- **WHEN** the OWNER lists members with `accessRoleId=7`
- **THEN** only members whose access role is 7 are returned, paginated like the unfiltered list

#### Scenario: Role of another business
- **WHEN** `accessRoleId` does not belong to the business
- **THEN** 404 `1151`
