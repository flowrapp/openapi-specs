# closed-day-marking Specification

## Purpose
TBD - created by archiving change closed-day-marking. Update Purpose after archive.

## Requirements

### Requirement: Closed day definition
The contracts SHALL define a business-local date as closed when its effective daily configuration has no opening intervals: the schedule exception of the date if any, otherwise the day of the recurring schedule effective on that date, otherwise no configuration (closed). A person without shifts on an open date SHALL NOT make the date closed.

#### Scenario: Closed by the weekly schedule
- **WHEN** the recurring schedule effective on a Sunday has no opening intervals for Sunday and there is no exception
- **THEN** that Sunday is closed

#### Scenario: Closed by a special day
- **WHEN** a schedule exception for a date has no opening intervals
- **THEN** the date is closed even if the weekly schedule opens that weekday

#### Scenario: Open day without shifts
- **WHEN** a date has opening intervals but no assigned shifts
- **THEN** the date is not closed

### Requirement: Main team schedule exposes open days
`getBusinessTeamSchedule` SHALL return `TeamScheduleResponseDTO.days` with exactly the 7 dates of the ISO week, Monday to Sunday, and each `TeamScheduleDayDTO` SHALL include required `open: boolean` (`false` when closed). Days without shifts SHALL be returned with `shifts: []`. The `userIds` and `jobRoleId` filters SHALL only filter shifts.

#### Scenario: Week with a closed day and no shifts
- **WHEN** a member reads the team schedule of a week whose Sunday is closed
- **THEN** the response contains 7 days and Sunday has `open: false` and `shifts: []`

#### Scenario: Filtered read keeps every day
- **WHEN** the team schedule is filtered by `userIds`
- **THEN** the response still contains the 7 days with their `open` value

### Requirement: BFF day responses expose closed days
The BFF SHALL include required `closed: boolean` in `WorkerTeamScheduleDayDTO`, `WorkerWeekDayDTO`, `WorkerDayHistoryResponseDTO`, `AttendanceDayDTO`, each item of `AttendanceWeekDTO.days` and each `AttendanceHoursDayDTO`. `WorkerTeamScheduleResponseDTO.days` SHALL contain the 7 dates of the week. In worker history responses `closed` SHALL be `false` when it cannot be determined.

#### Scenario: Worker week history over a closed day
- **WHEN** a worker reads a week history whose published week has a closed Sunday
- **THEN** the Sunday item has `closed: true`

#### Scenario: Owner attendance week
- **WHEN** an owner reads the attendance week containing a closed day
- **THEN** the matching item of `days` has `closed: true`

### Requirement: Contract release
Main `info.version` SHALL be 0.0.101, BFF `info.version` SHALL be 0.0.89, and the change SHALL be released as tag `v1.0.4` on `main`.

#### Scenario: Consumers pin the release
- **WHEN** a consumer points its generator at tag `v1.0.4`
- **THEN** it receives the `open` and `closed` fields described above
