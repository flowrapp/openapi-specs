## Context

Headless geofencing cannot rely on a Clerk session being available. It needs a credential that is scoped to the device and is accepted only by the event-ingestion operation. The Main API remains the credential issuer and authority; the BFF exposes the mobile-facing contract and forwards device event requests.

## Decisions

- Model the credential as an API-key security scheme in the `X-Geofence-Credential` header. The device event operation declares only this scheme; credential issue and revoke remain `bearerAuth` operations.
- Issue credentials with `POST` and revoke them with an idempotent `DELETE` using the `deviceId` query parameter, consistent with the approved endpoint design.
- Use explicit request and response DTOs for issuance and reuse each spec's existing `GeofenceEventRequestDTO` for event delivery.
- Retain and deprecate the existing authenticated event operations rather than removing them in this change.
- Document that the credential header/value must never be logged in both the security scheme and device operation descriptions.

## Risks / Trade-offs

- The OpenAPI describes the credential boundary but cannot enforce that implementations reject bearer credentials, scope the credential, or redact it from logs; those are backend/BFF implementation responsibilities.
- The old event operations remain available until a separately coordinated cleanup.

## Migration Plan

1. Publish the additive device credential contract.
2. Implement it in Main and BFF and migrate clients.
3. Remove the deprecated legacy event routes only in a future coordinated change.
