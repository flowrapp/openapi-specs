## Context

Main (`version 0.0.97`) and BFF (`version 0.0.86`) roots declare `bearerAuth` (Main also `basicAuth`). Register lives in Main `services/invitations/invitations-operations.yml#register-user-from-invitation` (schema in `components/invitations`) and in BFF `services/auth/auth-operations.yml#register-from-invitation` (schema in `components/auth`). Error codes 1009/1014 already exist in Main `error-components.yml`. Consumers implement against a published tag while the current app still calls the old endpoints.

## Goals / Non-Goals

**Goals:** contract for authenticated register; Clerk-coherent `bearerAuth`; removal of unused auth/change-password contracts; deploy-safe tagging.

**Non-Goals:** Clerk Organizations; webhooks; changing invitation token format.

## Decisions

- **Two tags.**
  - *Tag A (compatible-ish)*: register gets `security: [bearerAuth: []]`, `401`, new description/semantics, `1014` removed from register; `password` removed from `required` and marked `deprecated: true` (ignored). `bearerAuth` description updated (Clerk + legacy). Auth/change-password ops stay but are marked `deprecated: true`. Main/BFF can ship dual-token support and the new register while the old app keeps working (old app's register is anonymous ⇒ it breaks only for not-yet-installed flows; acceptable, no prod users).
  - *Tag B (cleanup)*: delete auth paths, change-password, orphaned schemas/files, `password` property, empty `Authentication` tag; drop legacy wording from `bearerAuth`. Published now, consumed only in phase 6 after the new app is live.
  - Alternative (one tag) rejected: Main/BFF codegen would delete auth controllers immediately, violating "don't deploy auth/** removal before the new app is published".
- **Move BFF register schema**: keep it in `components/auth` in tag A (minimal diff); in tag B move register op/schema to an `invitations` file only if `auth` becomes empty — otherwise leave it.
- **Version bumps**: patch bump per spec per tag, following existing practice (`info.version`).

## Risks / Trade-offs

- oasdiff flags the security change and removals as breaking → note in `.oasdiff-err-ignore.md` if CI requires it.
- Codegen in Main/BFF may change interface names when operations disappear (tag B) → done in cleanup phase only.

## Open Questions

- Exact tag names/numbers (next available after current tags).
