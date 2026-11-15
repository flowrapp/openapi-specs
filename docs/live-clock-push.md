# Live clock push contract

`LiveClockState` is the same JSON object in both API component catalogs. The app can construct it locally; Main sends a current snapshot when a worklog changes, including auto-clocking, another device and a manager edit. It starts, updates or ends the live clock as appropriate. Push is best effort; after resume the app reconciles with the authoritative server state. Send only to the affected user's devices, never to other members. State contains business information and must not be logged unnecessarily.

All instants are integer Unix epoch seconds, not ISO strings or milliseconds. Every field is present; absent nullable values are `null`. `workedSeconds` is net of effective breaks at `asOfEpochSeconds`. `timerStartEpochSeconds = asOfEpochSeconds - workedSeconds`: while WORKING the display advances as current epoch seconds minus that origin; ON_BREAK and CLOCKED_OUT display frozen `workedSeconds`. A new snapshot after resuming adjusts the origin for the break. `breakId` and `breakStartEpochSeconds` identify the open break only in ON_BREAK; `clockOutEpochSeconds` is set only in CLOCKED_OUT. Planned shift fields can be null when no shift is available.

## iOS via FCM

Use the existing FCM registration token as `message.token`. Set `message.apns.live_activity_token` to the device's ActivityKit push-to-start token for `start`, or the per-worklog update token for `update` and `end`. ActivityKit push-to-start requires iOS 17.2 or later; updates require an eligible Live Activity. Follow platform requirements, including `aps.timestamp` in epoch seconds, a start alert, and appropriate APNs headers. Register rotated tokens. A start has `aps.event: "start"`, `aps.attributes-type: "LiveClockAttributes"`, `aps.attributes` with `businessId`, `worklogId`, `businessName`, and `aps.content-state` containing the complete `LiveClockState`. An update or end uses `aps.event: "update"` or `"end"` and the complete `aps.content-state`; attributes are for start only. End uses the final CLOCKED_OUT state when the worklog closes.

Example start payload (illustrative tokens):

```json
{
  "message": {
    "token": "FCM_DEVICE_TOKEN",
    "apns": {
      "live_activity_token": "ACTIVITYKIT_PUSH_TO_START_TOKEN",
      "headers": {"apns-priority": "10"},
      "payload": {
        "aps": {
          "timestamp": 1794218400,
          "event": "start",
          "attributes-type": "LiveClockAttributes",
          "attributes": {"businessId": 12, "worklogId": 123, "businessName": "Example Cafe"},
          "content-state": {"status":"ON_BREAK","businessId":12,"worklogId":123,"businessName":"Example Cafe","jobRoleName":"Barista","clockInEpochSeconds":1794211200,"timerStartEpochSeconds":1794211200,"workedSeconds":7200,"asOfEpochSeconds":1794218400,"breakId":457,"breakStartEpochSeconds":1794218400,"shiftStartEpochSeconds":1794211200,"shiftEndEpochSeconds":1794240000,"plannedBreakMinutes":30,"clockOutEpochSeconds":null},
          "alert": {"title": "Work session", "body": "Your session is active."}
        }
      }
    }
  }
}
```

## Android via FCM

Reuse `POST /api/v1/push-tokens` with `platform: ANDROID` and the same device ID. Send an FCM data message with string values `type: "LIVE_CLOCK"` and `state`, the JSON serialization of the complete `LiveClockState` (not a nested JSON object). The native client creates or updates the promoted notification and ends it for CLOCKED_OUT, subject to OS support and notification permissions.

```json
{"message":{"token":"FCM_DEVICE_TOKEN","data":{"type":"LIVE_CLOCK","state":"{\"status\":\"ON_BREAK\",\"businessId\":12,\"worklogId\":123,\"businessName\":\"Example Cafe\",\"jobRoleName\":\"Barista\",\"clockInEpochSeconds\":1794211200,\"timerStartEpochSeconds\":1794211200,\"workedSeconds\":7200,\"asOfEpochSeconds\":1794218400,\"breakId\":457,\"breakStartEpochSeconds\":1794218400,\"shiftStartEpochSeconds\":1794211200,\"shiftEndEpochSeconds\":1794240000,\"plannedBreakMinutes\":30,\"clockOutEpochSeconds\":null}"}}}
```

Native buttons call the device routes with the securely stored geofence credential, without opening the app. Clock-out requires a two-step confirmation in the native UI before sending its command; retries keep the same idempotency ID and command content. This contract does not implement the UI or bypass the existing geofence policy.
