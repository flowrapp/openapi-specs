## Why

Flowrapp is moving login (email/password, Google, GitHub, password recovery) to Clerk (see master plan `~/.opencode/plan/clerk-migration.md`). The Main and BFF contracts still expose the in-house auth endpoints and an anonymous, password-based invitation registration; they must describe the Clerk-based flow before Main and BFF implement it.

## What Changes

- `POST /api/v1/invitations/register?token=` (Main and BFF) becomes authenticated with `bearerAuth` (Clerk session JWT). Body: `username`, `phone` only. New semantics: not-enabled invited user ⇒ enable + update profile + accept; already-enabled ⇒ just accept (no more `1014 USER_ALREADY_ENABLED`); session `mail` ≠ invited email ⇒ `1009 INVITATION_NOT_FOR_CURRENT_USER` (403). Adds 401.
- `bearerAuth` description in both specs documents Clerk session tokens (claims `mail`, `name`, optional `roles`, default `USER`) and the transitional acceptance of legacy Flowrapp HMAC tokens.
- **BREAKING (tag B, cleanup)**: remove `/api/v1/auth/login`, `/logout`, `/token-refresh`, `/forgot-password`, `/reset-password`, `/oauth/github`, `/oauth/google` and change-password (Main `users/change-password`, BFF `user/change-password`) from both specs, plus orphaned auth schemas/components and the `Authentication` tag where empty.
- Published in two version tags: **A** (register authenticated, password optional/deprecated, compatible for current app) and **B** (removals + `password` dropped).

## Capabilities

### New Capabilities
- `api-authentication`: how Main/BFF contracts authenticate callers (Clerk bearer JWT), invitation registration with a Clerk session, and the absence of in-house credential endpoints.

### Modified Capabilities
- none (`openspec/specs` is empty).

## Impact

- Files: `api/main-api/rest/open-api-rest.yml`, `api/bff-api/rest/open-api-rest.yml`, `api/*/rest/v1/services/auth/auth-operations.yml`, `api/*/rest/v1/components/auth/*`, `api/main-api/rest/v1/services/invitations/invitations-operations.yml`, `api/main-api/rest/v1/components/invitations/components.yml`, `api/*/rest/v1/services/user*/user-operations.yml` and related components.
- Consumers: Main (flowrapp_backend), BFF (wsc_flowrapp), app, landing — they bump to tag A first; tag B only after the new app is published.
- oasdiff will flag tag B (and the security change in tag A) as breaking; intentional.
