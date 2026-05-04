# iOS Push Notification Registration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the iOS push notification registration flow that was deleted in PR #158, using `@UIApplicationDelegateAdaptor` as the SwiftUI-native bridge.

**Architecture:** A minimal `PushNotificationDelegate` (UIKit) is registered via `@UIApplicationDelegateAdaptor` on `MilestoApp`. It forwards token bytes to `NotificationService` (Shared), which hex-encodes, picks `sandbox`/`production` via `#if DEBUG`, and POSTs through `DeviceTokenRepository` → `ApiClient`. The trigger fires from inside `SupabaseAuthRepository.setupAuthStateListener()` whenever Supabase emits `.initialSession` (with a session) or `.signedIn` — covering both fresh sign-in and cold-launch session restoration in a single hook. Periphery is configured to exclude the new delegate file so dead-code analysis doesn't prune it again.

**Tech Stack:** Swift 6, SwiftUI, UIKit (`UIApplicationDelegate` + `UIApplication`), `UserNotifications`, `OSLog`, existing `ApiClient` and Supabase auth listener.

**Build constraint:** Per `ios/CLAUDE.md`, never run `xcodebuild`. The user runs all builds in Xcode UI. Verification is manual: build in Xcode, sign in, grant permission, then query the database.

---

## File Structure

| Path | Action | Responsibility |
|---|---|---|
| `ios/Milesto/Sources/Shared/Notifications/DeviceTokenRepository.swift` | Modify | Add `register(token:environment:)` POST call |
| `ios/Milesto/Sources/Shared/Notifications/NotificationService.swift` | Modify | Add `requestPermissionAndRegister()` and `registerToken(_:)`; preserve existing `unregisterCurrentToken()` |
| `ios/Milesto/Sources/Shared/Notifications/PushNotificationDelegate.swift` | Create | Minimal `UIApplicationDelegate` that receives token bytes / failure and forwards to `NotificationService` |
| `ios/Milesto/Sources/App/MilestoApp.swift` | Modify | Add `@UIApplicationDelegateAdaptor(PushNotificationDelegate.self)` |
| `ios/Milesto/Sources/Features/Auth/Repositories/SupabaseAuthRepository.swift` | Modify | Trigger `requestPermissionAndRegister()` from `setupAuthStateListener` on `.initialSession` (with session) and `.signedIn` |
| `ios/.periphery.yml` | Modify | Add `PushNotificationDelegate.swift` under `report_exclude` so it isn't flagged as dead |
| `ios/Milesto/Marketing version` (`MARKETING_VERSION` in `ios/Milesto.xcodeproj/project.pbxproj`) | Modify | Bump `shame` segment per project versioning rule |

---

### Task 1: Add `register(token:environment:)` to `DeviceTokenRepository`

**Files:**
- Modify: `ios/Milesto/Sources/Shared/Notifications/DeviceTokenRepository.swift`

- [ ] **Step 1: Add register method and request body**

Replace the entire file contents with:

```swift
import Foundation

private struct RegisterTokenBody: Encodable {
    let token: String
    let environment: String
}

private struct UnregisterTokenBody: Encodable {
    let token: String
}

final class DeviceTokenRepository {
    static let shared = DeviceTokenRepository()

    private init() {}

    func register(token: String, environment: String) async throws {
        try await ApiClient.shared.requestVoid(
            method: "POST",
            path: "notifications/tokens",
            body: RegisterTokenBody(token: token, environment: environment)
        )
    }

    func unregister(token: String) async throws {
        try await ApiClient.shared.requestVoid(
            method: "DELETE",
            path: "notifications/tokens",
            body: UnregisterTokenBody(token: token)
        )
    }
}
```

Note: the API DTO is `RegisterTokenDto` from `api/src/notifications/dto/register-token.dto.ts`; field names are `token` and `environment`. Verify by reading the DTO file before committing if uncertain.

- [ ] **Step 2: Commit**

```bash
git add ios/Milesto/Sources/Shared/Notifications/DeviceTokenRepository.swift
git commit -m "feat(ios): add device token register call"
```

---

### Task 2: Add `requestPermissionAndRegister()` and `registerToken(_:)` to `NotificationService`

**Files:**
- Modify: `ios/Milesto/Sources/Shared/Notifications/NotificationService.swift`

- [ ] **Step 1: Replace file contents**

```swift
import OSLog
import UIKit
import UserNotifications

private let lastTokenKey = "lastAPNSToken"
private let notificationLogger = Logger(subsystem: Bundle.main.bundleIdentifier ?? "app.milesto", category: "Notifications")

final class NotificationService {
    static let shared = NotificationService()

    private init() {}

    func requestPermissionAndRegister() async {
        let center = UNUserNotificationCenter.current()
        let settings = await center.notificationSettings()

        switch settings.authorizationStatus {
        case .notDetermined:
            let granted = (try? await center.requestAuthorization(options: [.alert, .sound, .badge])) ?? false
            guard granted else { return }
        case .authorized, .provisional:
            break
        default:
            return
        }

        await MainActor.run {
            UIApplication.shared.registerForRemoteNotifications()
        }
    }

    func registerToken(_ tokenData: Data) async {
        let token = tokenData.map { String(format: "%02x", $0) }.joined()

        #if DEBUG
            let environment = "sandbox"
        #else
            let environment = "production"
        #endif

        do {
            try await DeviceTokenRepository.shared.register(token: token, environment: environment)
            UserDefaults.standard.set(token, forKey: lastTokenKey)
        } catch {
            notificationLogger.error("Failed to register APNS token: \(String(describing: error), privacy: .public)")
        }
    }

    func unregisterCurrentToken() async {
        guard let token = UserDefaults.standard.string(forKey: lastTokenKey) else { return }
        do {
            try await DeviceTokenRepository.shared.unregister(token: token)
            UserDefaults.standard.removeObject(forKey: lastTokenKey)
        } catch {
            notificationLogger.error("Failed to unregister APNS token: \(String(describing: error), privacy: .public)")
        }
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add ios/Milesto/Sources/Shared/Notifications/NotificationService.swift
git commit -m "feat(ios): add permission request and token registration"
```

---

### Task 3: Create `PushNotificationDelegate`

**Files:**
- Create: `ios/Milesto/Sources/Shared/Notifications/PushNotificationDelegate.swift`

- [ ] **Step 1: Create the file**

```swift
import OSLog
import UIKit

private let pushDelegateLogger = Logger(subsystem: Bundle.main.bundleIdentifier ?? "app.milesto", category: "PushNotificationDelegate")

final class PushNotificationDelegate: NSObject, UIApplicationDelegate {
    func application(
        _: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        Task { await NotificationService.shared.registerToken(deviceToken) }
    }

    func application(
        _: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        pushDelegateLogger.error("Remote notification registration failed: \(String(describing: error), privacy: .public)")
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add ios/Milesto/Sources/Shared/Notifications/PushNotificationDelegate.swift
git commit -m "feat(ios): add minimal UIApplicationDelegate for APNS token"
```

---

### Task 4: Wire `@UIApplicationDelegateAdaptor` into `MilestoApp`

**Files:**
- Modify: `ios/Milesto/Sources/App/MilestoApp.swift`

- [ ] **Step 1: Add the adaptor declaration**

Replace lines 4–6 of `MilestoApp.swift`:

```swift
@main
struct MilestoApp: App {
    let container: ModelContainer = MilestoApp.makeContainer()
```

with:

```swift
@main
struct MilestoApp: App {
    @UIApplicationDelegateAdaptor(PushNotificationDelegate.self) private var pushDelegate
    let container: ModelContainer = MilestoApp.makeContainer()
```

Leave the rest of the file unchanged.

- [ ] **Step 2: Commit**

```bash
git add ios/Milesto/Sources/App/MilestoApp.swift
git commit -m "feat(ios): host PushNotificationDelegate via UIApplicationDelegateAdaptor"
```

---

### Task 5: Trigger registration from `SupabaseAuthRepository.setupAuthStateListener`

**Files:**
- Modify: `ios/Milesto/Sources/Features/Auth/Repositories/SupabaseAuthRepository.swift:22-54`

- [ ] **Step 1: Add registration trigger to `.initialSession` (with session) and `.signedIn`**

Replace the existing `setupAuthStateListener()` method (lines 22–54) with:

```swift
    private func setupAuthStateListener() async {
        for await(event, session) in client.auth.authStateChanges {
            switch event {
            case .initialSession:
                if let session {
                    authState = .authenticated(userId: session.user.id.uuidString)
                    currentUserId = session.user.id.uuidString
                    persistSession(session)
                    Task { await NotificationService.shared.requestPermissionAndRegister() }
                } else {
                    authState = .unauthenticated
                    currentUserId = nil
                }
            case .signedIn:
                if let session {
                    authState = .authenticated(userId: session.user.id.uuidString)
                    currentUserId = session.user.id.uuidString
                    persistSession(session)
                    Task { await NotificationService.shared.requestPermissionAndRegister() }
                }
            case .signedOut:
                authState = .unauthenticated
                currentUserId = nil
                oauth.clearPendingAppleName()
                Keychain.clearAll()
            case .tokenRefreshed:
                if let session {
                    currentUserId = session.user.id.uuidString
                    persistSession(session)
                }
            default:
                break
            }
        }
    }
```

The change adds one line — `Task { await NotificationService.shared.requestPermissionAndRegister() }` — inside both the `.initialSession` (when a session exists) and `.signedIn` branches. Everything else is unchanged.

- [ ] **Step 2: Commit**

```bash
git add ios/Milesto/Sources/Features/Auth/Repositories/SupabaseAuthRepository.swift
git commit -m "feat(ios): trigger push registration on authenticated transition"
```

---

### Task 6: Exclude `PushNotificationDelegate` from Periphery

**Files:**
- Modify: `ios/.periphery.yml`

- [ ] **Step 1: Append to `report_exclude`**

Replace the entire file with:

```yaml
project: Milesto.xcodeproj
schemes:
  - Milesto
index_store_path:
  - ~/Library/Developer/Xcode/DerivedData/Milesto-ansltgdysfezzkauqkyjpqbljord/Index.noindex/DataStore
skip_build: true
retain_public: false
retain_objc_accessible: true
retain_codable_properties: true
disable_unused_import_analysis: false
report_exclude:
  - "Milesto/Sources/Shared/Components/TablerIcons.swift"
  - "Milesto/Sources/Shared/Notifications/PushNotificationDelegate.swift"
```

The reason: Periphery cannot see the runtime-reflection wiring done by `@UIApplicationDelegateAdaptor`, so it flagged the previous delegate as dead and the May-2 prune removed it. Excluding the file from the report prevents the same false positive.

- [ ] **Step 2: Commit**

```bash
git add ios/.periphery.yml
git commit -m "chore(ios): exclude PushNotificationDelegate from periphery"
```

---

### Task 7: Bump iOS marketing version

**Files:**
- Modify: `ios/Milesto.xcodeproj/project.pbxproj` (`MARKETING_VERSION` lines)

- [ ] **Step 1: Read the current version**

```bash
grep MARKETING_VERSION ios/Milesto.xcodeproj/project.pbxproj
```

Record the current value — it appears in two configurations (Debug and Release), both should match.

- [ ] **Step 2: Bump the `shame` (third) segment**

If current is e.g. `1.10.2`, set to `1.10.3`. The format is `proud.default.shame` per `CLAUDE.md`. This PR is a small recovery — bump `shame`, not `default`. Update both occurrences to the same new value.

Use Edit on `project.pbxproj` to change both `MARKETING_VERSION = X.Y.Z;` lines to the bumped value. Do not touch any other line.

- [ ] **Step 3: Commit**

```bash
git add ios/Milesto.xcodeproj/project.pbxproj
git commit -m "chore(ios): bump shame version for push registration restore"
```

---

### Task 8: Manual verification

The user runs all iOS builds in Xcode — do not invoke `xcodebuild`. This task is the user-driven verification step that confirms the fix end-to-end.

- [ ] **Step 1: User builds and runs the app on a physical device (Debug)**

The implementer asks the user to:
1. Open Xcode, select a physical device target (push doesn't work on simulator).
2. Build & Run (`⌘R`).
3. Sign in to the dev account.
4. Tap "Allow" on the iOS permission prompt.

- [ ] **Step 2: Verify the token row landed in the database**

Query Supabase via the MCP tool:

```sql
SELECT id, user_id, environment, created_at, LEFT(token, 16) AS token_prefix
FROM public.device_tokens
ORDER BY created_at DESC
LIMIT 5;
```

Expected: a single new row for the signed-in `user_id` with `environment='sandbox'` (because `aps-environment=development` and the build is Debug). Token prefix should be 16 hex chars.

- [ ] **Step 3: Trigger a test push**

Hit `POST /api/admin/notifications/broadcast` (declared in `api/src/admin/notifications.controller.ts:79`) with an admin bearer token. Body:

```json
{ "title": "Test", "body": "Push works", "segment": "all" }
```

Or use the admin dashboard's broadcast UI under `/admin/notifications` if available.

Confirm the device shows the push banner.

- [ ] **Step 4: Sign out and verify token cleanup**

In the app, sign out. Then re-query:

```sql
SELECT count(*) FROM public.device_tokens
WHERE user_id = '<the test user_id>';
```

Expected: `0` (existing `unregisterCurrentToken` flow runs on sign-out).

- [ ] **Step 5: Confirm Periphery doesn't flag the new file**

Run Periphery against the project (Xcode scheme `Milesto`). Verify `PushNotificationDelegate.swift` does **not** appear in the report.

If Periphery is not part of the user's local toolchain, skip this step — the report_exclude entry is the canonical guard, and CI (if configured) will surface any future regressions.

---

### Task 9: Run repo lint and open PR

- [ ] **Step 1: Run repo-level lint**

From the repo root:

```bash
bun run lint
```

Per `CLAUDE.md`: do not revert linter changes that aren't related to this work. If lint fails for unrelated reasons, fix only the lines this branch touched and proceed.

- [ ] **Step 2: Push the branch**

```bash
git push -u origin feat/ios-push-registration
```

- [ ] **Step 3: Open PR targeting `dev`**

Use `gh pr create`. PR title: `fix(ios): restore push notification registration`. Body should reference PR #158 as the regression source and link the spec at `docs/superpowers/specs/2026-05-04-ios-push-registration-design.md`.

```bash
gh pr create --base dev --title "fix(ios): restore push notification registration" --body "$(cat <<'EOF'
## Summary

Restores the iOS push registration flow that was deleted in #158. Re-introduces a minimal `PushNotificationDelegate` wired via `@UIApplicationDelegateAdaptor` on `MilestoApp`, restores `requestPermissionAndRegister()` and `registerToken(_:)` in `Shared/Notifications/NotificationService.swift`, restores `register(token:environment:)` on `DeviceTokenRepository`, and triggers the registration call from inside `SupabaseAuthRepository.setupAuthStateListener` so it fires on both fresh sign-in and cold-launch session restoration.

Adds a `report_exclude` entry for `PushNotificationDelegate.swift` in `.periphery.yml` so the dead-code prune doesn't recur — the AppDelegate is only referenced via `@UIApplicationDelegateAdaptor` reflection, which Periphery can't see.

Spec: `docs/superpowers/specs/2026-05-04-ios-push-registration-design.md`

## Test plan

- [ ] Sign in on a Debug build → iOS permission prompt appears, then a `device_tokens` row with `environment='sandbox'` lands in the database.
- [ ] Sending a push from the admin tooling delivers a banner to the device.
- [ ] Sign-out removes the row (existing unregister path).
EOF
)"
```

---

## Self-review notes

**Spec coverage:** Tasks 1–6 implement every architectural element in the spec (delegate, service methods, repo method, app adaptor, auth trigger, periphery exclusion). Task 7 satisfies the project versioning rule. Task 8 covers the manual verification listed under "Testing" in the spec. Task 9 covers the open process step (lint, PR).

**Spec open questions resolved here:**
- Insertion point for the trigger — `SupabaseAuthRepository.setupAuthStateListener`, in both `.initialSession` (with session) and `.signedIn` branches. This single hook covers both fresh sign-in and cold-launch session restoration cleanly, parallel to the existing `unregisterCurrentToken()` call in `signOut()`.
- Periphery directive — `report_exclude` (matches the existing pattern used for `TablerIcons.swift`).

**Type consistency check:** `register(token:environment:)` signature appears identically in Tasks 1, 2; `RegisterTokenBody` defined once in Task 1; `requestPermissionAndRegister()` signature consistent across Tasks 2, 5. `lastAPNSToken` UserDefaults key preserved from existing code.

**Out of scope (deliberately):** notification UX (foreground presentation, taps, deep links), badge handling, retry policy beyond next-launch, denial-state surfacing. These belong to a follow-up plan.
