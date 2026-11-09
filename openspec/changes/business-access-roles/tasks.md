## 1. Main API

- [ ] 1.1 `components/business`: add `BusinessPermission`, `BusinessAccessRoleDTO`, `BusinessAccessRoleRequestDTO`, `BusinessAccessRoleSummaryDTO`, `BusinessUserAccessRoleRequestDTO`; add `permissions` + `accessRole` to `BusinessResponseDTO`, `accessRole` to `BusinessUserResponseDTO`
- [ ] 1.2 `services/business/access-roles-operations.yml`: access-role CRUD and `updateBusinessUserAccessRole`; register paths in root
- [ ] 1.3 Error catalog: `1151`–`1154`; `1020` note updated to permission semantics
- [ ] 1.4 Remove `MANAGER` from every role enum and example (business, settings, invitations, role filter)
- [ ] 1.5 Root `info.description`: permission model and operation → permission table

## 2. BFF

- [ ] 2.1 Components: permission/access-role schemas; `WorkerBusinessResponseDTO.permissions` + `accessRole`; `MemberProfileDTO.accessRole`, nullable `liveStatus`/`week`/`today`/`clockInRules`, `actions.canChangeAccessRole`, `CALLER_NOT_OWNER`
- [ ] 2.2 Members operations: access-role CRUD and `updateMemberAccessRole`; register paths
- [ ] 2.3 `SyncTopic.PERMISSIONS`; realtime description of the permission audience
- [ ] 2.4 Remove `MANAGER` from every role enum and example
- [ ] 2.5 Root `info.description`: BFF operation → permission table

## 3. Release

- [ ] 3.1 `node scripts/validate-error-codes.js`, `redocly lint` both specs (no new errors)
- [ ] 3.2 Bump Main `0.0.103`, BFF `0.0.93`; commit to `main`; tag `v1.0.7`; push

## 4. Revision v1.0.8

- [x] 4.1 `ATTENDANCE_VIEW` implies `SCHEDULE_VIEW` and `REPORTS_VIEW`; profile `week` needs `REPORTS_VIEW`; bump Main `0.0.104`, BFF `0.0.94`; tag `v1.0.8`
- [x] 4.2 `accessRoleId` filter on `getBusinessUsersV2` / `searchBusinessMembers`; bump Main `0.0.105`, BFF `0.0.95`; tag `v1.0.9`
