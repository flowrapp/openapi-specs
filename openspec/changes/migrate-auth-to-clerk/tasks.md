## 1. Tag A — authenticated register (compatible)

- [x] 1.1 Main `invitations-operations.yml#register-user-from-invitation`: set `security: [bearerAuth: []]`, update description with the three semantics (enable+accept / accept / 1009), add `401` and `403 INVITATION_NOT_FOR_CURRENT_USER` example, remove `409`/`1014`, update `x-functional-errors` to `[1005, 1009, 1010]`; verify `node scripts/validate-error-codes.js` passes
- [x] 1.2 Main `components/invitations/components.yml#RegisterUserFromInvitationRequestDTO`: drop `password` from `required`, mark it `deprecated: true` (ignored); remove `password` from request example
- [x] 1.3 BFF `auth-operations.yml#register-from-invitation` and `components/auth/components.yml#RegisterUserFromInvitationRequestDTO`: same changes as 1.1–1.2 (BFF pass-through)
- [x] 1.4 Update `bearerAuth` description in both root specs (Clerk issuer, `mail`/`name`/`roles` claims, default `USER`, legacy HMAC accepted temporarily)
- [x] 1.5 Mark `/api/v1/auth/**` and change-password operations `deprecated: true` in both specs
- [x] 1.7 Main: add `GET /api/v1/users/me` (`getCurrentUser`, `CurrentUserResponseDTO`: id, name, email, phone, role) so the BFF can resolve the profile when the Clerk `sub` is not a Flowrapp id
- [ ] 1.6 Bump `info.version` (Main, BFF); `redocly lint` both specs clean; tag A published
- [x] 1.8 Main: `1016 CURRENT_USER_NOT_FOUND` is a 403 (was 500) on `GET /api/v1/users/me` and contracts; error table updated (tag v1.0.2)

## 2. Tag B — cleanup (consume only after new app is published)

Decision 2026-11-07: legacy auth code and tables stay in Main/BFF, disabled by a flag. The contract keeps the legacy operations, deprecated, and documents `410 Gone`.

- [ ] 2.1 Main and BFF: keep `/api/v1/auth/**` and change-password operations `deprecated: true`; add a `410 Gone` response ("legacy authentication disabled; use Clerk") to each; keep schemas and files
- [ ] 2.2 Remove the `password` property from both `RegisterUserFromInvitationRequestDTO`
- [ ] 2.3 `bearerAuth` (both specs): drop legacy-token and `roles` wording — Clerk session JWT with `mail` and `name`; the global role (USER/ADMIN) comes from Flowrapp's user record, not from the token
- [ ] 2.4 Main: remove the `basicAuth` security scheme from the root spec and every `basicAuth` entry in operation `security` lists; verify `grep -rn basicAuth api` is empty
- [ ] 2.5 `redocly lint` both specs clean (no new errors); `validate-error-codes.js` passes
- [ ] 2.6 Bump `info.version`; record intended breaking changes in `.oasdiff-err-ignore.md` if CI requires; merge to main and tag B on main
