# iOS Push Notification Registration — Design

## Background

Push notifications stopped working after PR #158 (`72f56f0`, 2026-05-02) deleted `MilestoAppDelegate.swift` and the `requestPermissionAndRegister` / `registerToken` halves of `NotificationService`. Periphery flagged the AppDelegate as dead code (it's only referenced via `@UIApplicationDelegateAdaptor`, which uses runtime reflection that Periphery can't see), and the prune cascaded through everything that fed it.

What survived: only the unregister half (`NotificationService.unregisterCurrentToken`, `DeviceTokenRepository.unregister`, called on sign-out).

The API side (`POST /notifications/tokens` in `device-tokens.controller.ts`), the database (`public.device_tokens`), the entitlement (`aps-environment=development`), and the Apple Developer Console configuration are all intact. The only gap is the iOS app no longer asks for permission, never calls `registerForRemoteNotifications()`, and has no callback to receive the token bytes.

## Goal

Restore push registration on iOS using the canonical SwiftUI bridge (`@UIApplicationDelegateAdaptor`), wired so Periphery cannot prune it again. Permission is requested immediately when the user transitions into the authenticated state — both on fresh sign-in and on cold launch with a restored session.

## Non-goals

- No notification UX (foreground presentation, deep links, action handlers, badge management). v1 is registration only.
- No re-prompt UI for users who deny permission.
- No analytics or telemetry around grant rates.
- No changes to the API or database schema.

## Architecture

### Files

```
ios/Milesto/Sources/Shared/Notifications/
├── PushNotificationDelegate.swift   (new) — minimal UIApplicationDelegate
├── NotificationService.swift        (modified) — add permission + token register
└── DeviceTokenRepository.swift      (modified) — add register(token:environment:)

ios/Milesto/Sources/App/MilestoApp.swift   (modified) — @UIApplicationDelegateAdaptor
ios/Milesto/Sources/Features/Auth/...      (modified) — call requestPermissionAndRegister on sign-in success
.periphery.yml                              (modified) — exclude PushNotificationDelegate
```

The trigger lives in the Auth feature's sign-in success path — same feature ownership as today, no cross-feature reach. The `@UIApplicationDelegateAdaptor` declaration lives at the composition root (`App/`), which is exactly where feature MVVM places app-level adapters.

### Components

**`PushNotificationDelegate`** — `final class PushNotificationDelegate: NSObject, UIApplicationDelegate`. Implements two callbacks only:
- `application(_:didRegisterForRemoteNotificationsWithDeviceToken:)` → forwards `Data` to `NotificationService.shared.registerToken(_:)`.
- `application(_:didFailToRegisterForRemoteNotificationsWithError:)` → logs to `OSLog`, no retry.

No other delegate methods. The class exists solely so iOS has a target for the token callback.

**`NotificationService`** — extended with:
- `requestPermissionAndRegister()` (async) — reads current `UNUserNotificationCenter` settings, requests authorization if undetermined, then calls `UIApplication.shared.registerForRemoteNotifications()` on the main actor when authorization is granted (`.authorized`, `.provisional`). No-op on `.denied`. Idempotent — safe to call every launch.
- `registerToken(_ data: Data)` (async) — hex-encodes the bytes, picks `sandbox`/`production` from `#if DEBUG`, calls `DeviceTokenRepository.shared.register(token:environment:)`. Persists `lastAPNSToken` to `UserDefaults` only on successful registration, so a failed POST will retry on next launch.
- `unregisterCurrentToken()` (existing, untouched).

**`DeviceTokenRepository`** — extended with `register(token:environment:)` that calls `ApiClient.shared.requestVoid(method: "POST", path: "notifications/tokens", body: ...)`. Mirrors the existing `unregister` shape.

**`MilestoApp`** — adds:
```swift
@UIApplicationDelegateAdaptor(PushNotificationDelegate.self) private var pushDelegate
```

**Auth feature** — fire-and-forget call to `NotificationService.shared.requestPermissionAndRegister()` on every transition into the authenticated state. The Auth feature already exposes `AuthState` / `AuthSessionProviding`; the trigger hooks into whichever observer surface gets called for both fresh sign-in and cold-launch session restoration. Exact code path is decided during planning.

### Runtime flow

`@UIApplicationDelegateAdaptor` instantiates `PushNotificationDelegate` at process start. The delegate sits idle until the registration call fires.

When the user transitions into the authenticated state (fresh sign-in or cold-launch session restoration):
1. Auth feature's observer triggers `NotificationService.shared.requestPermissionAndRegister()`.
2. Permission flow runs. If granted, `UIApplication.shared.registerForRemoteNotifications()` is called.
3. iOS hands the token to `PushNotificationDelegate.application(_:didRegisterForRemoteNotificationsWithDeviceToken:)`.
4. `NotificationService.registerToken(_:)` POSTs to the API.
5. API `upsert`s the row in `device_tokens`.

On token rotation: iOS calls the AppDelegate callback again with new bytes during a future launch; the API `upsert` treats it as a new row, and the stale token is cleaned up by APNs's 410 Unregistered response on its next push attempt (handled by existing code at `api/src/notifications/notifications.service.ts:116`).

## Error handling

- **Permission denied** — silent no-op. User can re-enable from iOS Settings. v1 has no UI surface for this state.
- **`registerForRemoteNotifications` fails** — logged via `OSLog` from `application(_:didFailToRegisterForRemoteNotificationsWithError:)`. No retry, no UI. Common in simulators without push capability and during offline launches.
- **`POST /notifications/tokens` fails** — logged via `OSLog`. `lastAPNSToken` is not persisted, so the next launch will retry through the normal flow.
- **Multiple sign-ins on same device** — sign-out unregisters using the persisted `lastAPNSToken`. New sign-in triggers a fresh registration cycle.
- **Auth not established when registration fires** — registration only fires from the post-sign-in success path, so the bearer token is guaranteed.

## Periphery configuration

`PushNotificationDelegate` must be excluded from Periphery's dead-code scan, otherwise the prune will recur. Add it to `.periphery.yml` under `retain_unused_protocol_func_params` or via an explicit `retain` rule for the class. The exact key depends on Periphery's current schema; the planning step verifies which directive applies.

## Architecture compliance

- Trigger lives in the Auth feature (no cross-feature reach into another feature's internals).
- `@UIApplicationDelegateAdaptor` declaration lives in `App/` — explicit composition-root concern, allowed by feature MVVM rules.
- `Shared/Notifications/` continues to host the cross-feature push infrastructure (matches existing layout that survived the prune).
- Singletons (`NotificationService.shared`, `DeviceTokenRepository.shared`) preserved — already in use; the system-driven callback origin makes DI impractical here, and the pattern is consistent with the codebase.

## Testing

- **Manual:** Local Debug install → sign in → grant permission → verify a `device_tokens` row appears with `environment='sandbox'`. TestFlight build → same flow → verify `environment='production'`.
- **No unit tests** for `requestPermissionAndRegister` or `PushNotificationDelegate` — they wrap iOS system APIs (`UNUserNotificationCenter`, `UIApplication`), where mocking provides little signal vs. the maintenance cost.
- **Existing tests** for `DeviceTokensController` and the API push flow are unaffected.

## Open questions for planning

- Exact code path inside the Auth feature that observes the transition into authenticated state — repository-level callback, ViewModel-level subscription, or App-level `AuthSessionProviding` observer. Whichever path covers both fresh sign-in and cold-launch session restoration with a single trigger point.
- Periphery directive name to retain `PushNotificationDelegate` (verify against the current `.periphery.yml` schema in use).
