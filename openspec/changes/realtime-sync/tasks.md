## 1. BFF contract

- [x] 1.1 Read the root `api/bff-api/rest/open-api-rest.yml` and an existing business-scoped service (e.g. Attendance/Planning) to follow the file layout, error refs and example style
- [x] 1.2 Add tag `Realtime` and path `/api/v1/businesses/{businessId}/events` → `v1/services/realtime/...` with operation `streamBusinessEvents` (`bearerAuth`, `businessId` path param like siblings)
- [x] 1.3 Document the 200 `text/event-stream` response (`schema: string`, multi-event example with `ready`, `sync` and `: ping`), headers, heartbeat, 30 min close, 3-stream limit, ignored `Last-Event-ID`, and that the BFF hand-writes this controller (generated `RealtimeApi` is excluded)
- [x] 1.4 Document 401, 403 `1015` and 429 with the existing ProblemDetail refs/examples
- [x] 1.5 Add `SyncReadyEvent`, `SyncEvent`, `SyncTopic` under `v1/components/realtime/...` and reference them from the operation description/components so they are rendered
- [x] 1.6 Bump BFF `info.version` and add the CHANGELOG entry

## 2. Shared documentation

- [x] 2.1 Create `docs/realtime-sync.md` from the "Shared contract" section of `design.md` (AMQP message, delivery rule, topics, SSE, push keys)

## 3. Validation

- [x] 3.1 Attempt `redocly lint api/bff-api/rest/open-api-rest.yml` (or `vacuum lint`) and `node scripts/validate-error-codes.js`; neither linter is installed, and the script cannot load its missing `js-yaml` dependency. The modified YAML files parse with PyYAML.
- [x] 3.2 Run `openspec validate realtime-sync --strict` and mark tasks done (passed).
