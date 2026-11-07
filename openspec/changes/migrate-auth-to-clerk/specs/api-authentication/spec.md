## Purpose

Defines how the Flowrapp Main and BFF API contracts authenticate callers with Clerk session tokens and how an invited user joins a business using an authenticated Clerk session.

## ADDED Requirements

### Requirement: Bearer authentication with Clerk session tokens
Main and BFF specs SHALL declare a `bearerAuth` HTTP bearer JWT security scheme whose description states that tokens are Clerk session JWTs carrying the `mail`, `name` and optional `roles` claims, that a missing `roles` claim means `USER`, and that legacy Flowrapp-issued tokens are accepted only during the transition.

#### Scenario: Scheme documents Clerk claims
- **WHEN** a consumer reads `components.securitySchemes.bearerAuth` in either spec
- **THEN** it is `type: http`, `scheme: bearer`, `bearerFormat: JWT` and its description names Clerk as issuer and the `mail`, `name`, `roles` claims with `USER` as default role

#### Scenario: No in-house token issuance referenced
- **WHEN** the bearer scheme description is read after tag B
- **THEN** it does not reference Flowrapp login, OAuth or token-refresh endpoints

### Requirement: Authenticated registration from invitation
`POST /api/v1/invitations/register` in Main and BFF SHALL require `bearerAuth`, keep the `token` query parameter, and accept a body with required `username` and `phone` and no password.

#### Scenario: Unauthenticated call rejected
- **WHEN** the operation is called without a valid bearer token
- **THEN** the contract documents a `401` response

#### Scenario: Invited user not yet enabled
- **WHEN** the session `mail` equals the invited email and that user is not enabled
- **THEN** the user is enabled, `username` and `phone` are stored, the invitation is accepted and `201` is returned

#### Scenario: Invited user already enabled
- **WHEN** the session `mail` equals the invited email and that user is already enabled
- **THEN** the invitation is accepted and `201` is returned, without `USER_ALREADY_ENABLED`

#### Scenario: Session email differs from invited email
- **WHEN** the session `mail` differs from the invited email
- **THEN** `403` with `1009 - invitation not for current user` is returned

#### Scenario: Invitation not found or expired
- **WHEN** the token does not match an invitation, or the invitation is expired
- **THEN** `404` `1005` or `403` `1010` is returned respectively

### Requirement: No HTTP Basic security scheme
After tag B the Main spec SHALL NOT declare a `basicAuth` security scheme nor list it in any operation `security` requirement.

#### Scenario: basicAuth absent
- **WHEN** the Main spec is bundled after tag B
- **THEN** `components.securitySchemes` has no `basicAuth` and no operation references it

### Requirement: No in-house credential endpoints
Main and BFF specs SHALL NOT expose login, logout, token refresh, forgot/reset password, GitHub/Google OAuth exchange or change-password operations; credential and password management belong to Clerk.

#### Scenario: Auth paths absent
- **WHEN** the `paths` of either spec are listed after tag B
- **THEN** no path starts with `/api/v1/auth/` and no `change-password` path exists

#### Scenario: No orphaned auth schemas
- **WHEN** both specs are bundled and linted after tag B
- **THEN** `LoginRequestDTO`, `LogoutRequestDTO`, `TokenResponseDTO`, `RefreshRequestDTO`, `ForgotPasswordRequestDTO`, `ResetPasswordRequestDTO`, `OAuthCredentialRequestDTO` and change-password request schemas are not defined or referenced
