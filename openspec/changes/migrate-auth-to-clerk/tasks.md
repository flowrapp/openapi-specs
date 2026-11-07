## 1. Tag A — authenticated register (compatible)

- [x] 1.1 Main `invitations-operations.yml#register-user-from-invitation`: set `security: [bearerAuth: []]`, update description with the three semantics (enable+accept / accept / 1009), add `401` and `403 INVITATION_NOT_FOR_CURRENT_USER` example, remove `409`/`1014`, update `x-functional-errors` to `[1005, 1009, 1010]`; verify `node scripts/validate-error-codes.js` passes
- [x] 1.2 Main `components/invitations/components.yml#RegisterUserFromInvitationRequestDTO`: drop `password` from `required`, mark it `deprecated: true` (ignored); remove `password` from request example
- [x] 1.3 BFF `auth-operations.yml#register-from-invitation` and `components/auth/components.yml#RegisterUserFromInvitationRequestDTO`: same changes as 1.1–1.2 (BFF pass-through)
- [x] 1.4 Update `bearerAuth` description in both root specs (Clerk issuer, `mail`/`name`/`roles` claims, default `USER`, legacy HMAC accepted temporarily)
- [x] 1.5 Mark `/api/v1/auth/**` and change-password operations `deprecated: true` in both specs
- [x] 1.7 Main: add `GET /api/v1/users/me` (`getCurrentUser`, `CurrentUserResponseDTO`: id, name, email, phone, role) so the BFF can resolve the profile when the Clerk `sub` is not a Flowrapp id
- [ ] 1.6 Bump `info.version` (Main, BFF); `redocly lint` both specs clean; tag A published

## 2. Tag B — cleanup removals (consume only after new app is published)

- [ ] 2.1 Main root: remove `/api/v1/auth/*` and `/api/v1/users/change-password` paths and `Authentication` tag; delete `services/auth/auth-operations.yml` and `components/auth/auth-components.yml`; remove change-password op/schema from `services/users/user-operations.yml` and its components
- [ ] 2.2 BFF root: remove `/api/v1/auth/*` and `/api/v1/user/change-password`; move `register-from-invitation` + its DTO out of `auth/*` (e.g. `services/invitations`, `components/invitations`), delete remaining auth files; remove change-password op/schema; drop `Authentication` tag
- [ ] 2.3 Remove `password` property from both `RegisterUserFromInvitationRequestDTO`; remove legacy/login wording from `bearerAuth`
- [ ] 2.4 Main: remove the `basicAuth` security scheme from the root spec and every `basicAuth` entry in operation `security` lists (attendance, businesses, admin, users, geofenceEvents, timesheet, worklogs, reports, pushTokens, invitations); verify `grep -rn basicAuth api` is empty
- [ ] 2.5 `grep -rn "auth/\|change-password\|TokenResponseDTO\|OAuthCredential" api` returns no references; `redocly lint` both specs clean; `validate-error-codes.js` passes
- [ ] 2.6 Bump `info.version`; record intended breaking changes in `.oasdiff-err-ignore.md` if CI requires; tag B published
