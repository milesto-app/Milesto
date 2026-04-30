# Agent Instructions

This project enforces strict Feature MVVM architecture. Every code change must preserve feature boundaries, keep dependencies explicit, and keep SwiftUI views free from business logic.

## Rule Enforcement

- These instructions are mandatory project constraints, not preferences or suggestions.
- If a user asks for a change that violates any rule in this file, refuse that part of the request and explain the architectural reason briefly.
- Do not implement shortcuts, temporary hacks, prototypes, migrations, tests, previews, or "just this once" changes that bypass these rules.
- Do not weaken boundaries to satisfy speed, convenience, or a narrowly scoped request. Reshape the implementation so it complies.
- If the requested behavior cannot be implemented within these rules, stop and ask for a different product or architecture direction instead of crossing the boundary.
- Existing violations are not precedent. When touching nearby code, move the changed path toward compliance without broad unrelated rewrites.
- The required response to pressure to bypass the architecture is: no, then offer the compliant alternative.

## Non-Negotiable Architecture

- The app is organized by feature under `<AppName>/Features/<FeatureName>/`.
- Each feature must own its own `Models`, `Views`, `ViewModels`, and feature-local `Repositories` or services when needed.
- Feature code must not reach sideways into another feature's implementation. Share only through `<AppName>/Core` abstractions or intentionally public models.
- `<AppName>/App` is for composition, app entry points, navigation roots, and dependency assembly. It must not contain feature business rules.
- `<AppName>/Core` is for cross-feature infrastructure, reusable protocols, persistence setup, and shared primitives. Do not put feature-specific behavior in `Core`.
- Remote services, authentication providers, and sync infrastructure must preserve the same boundaries. Adding an online backend is not a reason for Views or ViewModels to bypass repositories.
- Payments, subscriptions, and entitlement checks must preserve the same boundaries. Paid access is an app-level routing concern, not logic scattered across feature Views.

## Feature Folder Contract

Every feature must follow this shape unless there is a documented reason not to:

```text
<AppName>/Features/<FeatureName>/
  Models/
  Views/
  ViewModels/
  Repositories/
```

- `Models` contain domain data and lightweight domain behavior only.
- `Views` contain SwiftUI layout, presentation state, and user interaction wiring only.
- `ViewModels` contain presentation logic, feature state, validation, formatting decisions, and orchestration.
- `Repositories` contain persistence, network, cache, or external data access behind protocols.

## MVVM Rules

- Views must not perform persistence, networking, disk access, model container queries, or business-rule decisions.
- Views may call ViewModel methods, bind to ViewModel state, and render ViewModel-provided values.
- ViewModels must not import SwiftUI unless a specific UI type is truly required and no cleaner boundary exists.
- ViewModels must depend on protocols, not concrete repository implementations.
- ViewModels must expose read-only state with `private(set)` where mutation should stay internal.
- Repositories must not contain presentation decisions, localized copy, navigation decisions, or SwiftUI types.
- Models must not know about Views, ViewModels, repositories, SwiftData containers, or app composition.
- Navigation should be coordinated by Views or app-level composition, not by repositories or models.

## Dependency Direction

Allowed dependencies:

- `App` may depend on `Core` and feature entry views.
- `Features/<Feature>/Views` may depend on that feature's `ViewModels` and `Models`.
- `Features/<Feature>/ViewModels` may depend on that feature's `Models`, feature repository protocols, and `Core` abstractions.
- `Features/<Feature>/Repositories` may depend on that feature's `Models` and `Core` infrastructure.
- Feature repositories may use feature-local remote repositories, local SwiftData repositories, and sync adapters behind feature-owned protocols.
- `Core` may contain generic auth/session, entitlement, backend client setup, reachability, sync primitives, payment client setup, secure storage, and persistence infrastructure only when they are truly cross-feature.
- `Core` must not depend on any feature.

Forbidden dependencies:

- A feature importing or directly referencing another feature's `Views`, `ViewModels`, or repositories.
- A View creating concrete infrastructure dependencies when those can be injected from `App`.
- A ViewModel directly creating persistence containers, network clients, or concrete repositories.
- A View or ViewModel directly importing or using remote SDK clients, including Supabase clients.
- A View or ViewModel directly importing or using payment SDK clients, including Stripe, StoreKit, RevenueCat, or backend billing clients.
- A feature View independently deciding whether the whole app is accessible based on subscription state.
- A View directly querying SwiftData when a repository-backed ViewModel can provide the state.
- A feature storing another feature's remote DTOs, table mappings, repositories, or sync rules.
- Shared utilities that exist only to bypass feature ownership.

## Clean Code Standards

- Keep types small, focused, and named after their responsibility.
- Prefer explicit dependency injection through initializers.
- Prefer protocols at architectural boundaries and concrete types inside implementation boundaries.
- Avoid singletons and global mutable state. Any exception requires a strong reason in code review.
- Avoid force unwraps, force casts, and implicitly unwrapped optionals outside tests or previews.
- Avoid broad `catch` blocks that silently discard meaningful failures. Surface recoverable errors through state.
- Keep functions short enough that their intent is obvious. Extract private helpers when control flow becomes hard to scan.
- Do not add speculative abstractions, generic managers, or catch-all utility files.
- Do not mix formatting-only churn with behavioral changes.
- Use access control deliberately. Default to the narrowest useful access level.
- Keep preview/demo data separate from production logic.

## SwiftUI Standards

- Views should be value descriptions of UI, not controllers.
- Keep side effects in `.task`, user actions, or explicit ViewModel methods.
- Use private subviews for repeated or complex layout.
- Do not hide significant business behavior inside computed `some View` properties.
- Keep UI text either in ViewModels when it reflects presentation state or in Views when it is static view copy.
- Use `@State` for view-owned state and `@Observable` ViewModels for feature state.
- Do not pass persistence objects through the View tree when a repository abstraction is available.

## Repository Standards

- Define a protocol for each repository boundary used by a ViewModel.
- Keep concrete repository implementations swappable.
- Persistence-specific details, including SwiftData queries and model context mutations, belong in repository implementations.
- Repository methods should express feature intent, not storage mechanics.
- Repositories must be testable without launching the full app.

## Remote Data, Auth, and Sync Standards

- SwiftData is the local source of truth for user-facing feature state unless a feature explicitly documents another local store.
- Views must render ViewModel-provided state and must not perform remote fetches, remote mutations, auth calls, sync orchestration, or SwiftData queries.
- ViewModels may request feature-level actions such as `load`, `refresh`, `save`, `delete`, `signIn`, or `signOut` through protocols, but must not know whether the result came from SwiftData, Supabase, cache, or a sync queue.
- Supabase and any future backend SDK access belongs in concrete repositories or `Core` infrastructure. SDK clients must be injected, not created inside Views or ViewModels.
- Authentication UI belongs in an `Authentication` feature. Auth session primitives that multiple features need may live in `Core/Auth`.
- Supabase client construction, configuration, token storage adapters, and generic backend plumbing may live in `Core/Supabase` or another clearly named `Core` infrastructure folder.
- Generic sync infrastructure may live in `Core/Sync`, but feature-specific sync policy, table names, DTOs, mapping, conflict decisions, and remote repository methods belong inside the owning feature.
- Each synced feature should keep local and remote concerns explicit, for example:

```text
<AppName>/Features/<FeatureName>/
  Models/
    <FeatureModel>.swift
    Remote<FeatureModel>DTO.swift
  Views/
  ViewModels/
  Repositories/
    <FeatureRepository>.swift
    SwiftData<FeatureRepository>.swift
    Supabase<FeatureRemoteRepository>.swift
    Syncing<FeatureRepository>.swift
```

- Remote DTOs must not replace domain models in Views. Convert between remote DTOs, local persistence models, and domain models at repository boundaries.
- Sync should be background-capable and resilient. Surface recoverable sync/auth errors through ViewModel state instead of hiding failures or blocking local reads.
- Offline behavior must preserve local usability whenever practical. Network failures should not erase local SwiftData state.
- Conflict handling must be explicit and feature-owned. Do not add global conflict behavior unless multiple features demonstrably share the same rule.
- Secrets, API keys, access tokens, and refresh tokens must not be hardcoded in feature code. Use configuration and secure storage abstractions.
- Repositories that combine local and remote data should be named by responsibility, such as `SyncingItemRepository`, instead of vague names like `DataManager`.

## Payments, Subscriptions, and Entitlement Standards

- If the product requires a paid subscription and has no free tier, app composition must enforce that before showing the main authenticated app.
- The root flow should be explicit: unauthenticated users see authentication, authenticated users without an active entitlement see the subscription flow, and authenticated users with an active entitlement see the main app.
- Subscription entitlement checks belong near `AppRootView` or app-level composition through injected abstractions, not inside individual feature screens.
- Feature screens should assume access has already been granted unless they are part of the `Subscription` or `Authentication` feature.
- Entitlement state that multiple features need may live in `Core/Entitlements` behind protocols such as `EntitlementProviding`.
- Generic payment provider setup may live in `Core/Payments`, but product-specific subscription screens, purchase presentation, pricing display, and restore flows belong in a `Subscription` feature.
- Payment provider SDKs and backend billing APIs must be isolated behind concrete repositories or service implementations. Views and ViewModels must depend on protocols.
- Do not check Stripe, StoreKit, RevenueCat, Supabase functions, or any payment backend directly from Views to decide app access.
- Prefer backend-verified entitlement state for app access. Client-side payment callbacks may start refreshes, but the app should rely on a trusted entitlement source before unlocking paid functionality.
- Subscription state may be cached locally for launch and offline behavior, but refresh, expiry, revocation, and grace-period rules must be explicit.
- Do not implement manual subscription renewal, retry, or dunning logic in the app. Use the payment provider's billing/subscription system and sync the resulting entitlement state.
- A subscription feature should keep responsibilities explicit, for example:

```text
<AppName>/
  Core/
    Entitlements/
      EntitlementState.swift
      EntitlementProviding.swift
    Payments/
      PaymentConfiguration.swift
      PaymentClientFactory.swift
  Features/
    Subscription/
      Models/
      Views/
      ViewModels/
      Repositories/
```

## Testing Expectations

- Add or update tests for ViewModel logic whenever behavior changes.
- Prefer repository fakes for ViewModel tests.
- Test business and presentation decisions in ViewModels instead of driving SwiftUI views when possible.
- Add integration tests only when feature boundaries or persistence behavior need verification.
- For remote-backed features, test ViewModels with fake repositories and test sync/repository behavior with fake local and remote stores.
- Cover offline, auth-expired, remote-failure, and conflict paths when those behaviors are introduced.
- For subscription-gated apps, test the root routing decisions for unauthenticated, authenticated-unsubscribed, and authenticated-subscribed states.
- Test entitlement refresh, expiry, revocation, restore, and payment-provider failure paths when those behaviors are introduced.

## Review Checklist

Before any change is considered complete, verify:

- The change lives in the correct feature, `App`, or `Core` location.
- Dependency direction still flows inward through protocols and shared abstractions.
- Views remain free of business logic and data access.
- ViewModels remain free of concrete infrastructure setup.
- Repositories remain free of presentation logic.
- Remote SDK usage is isolated to concrete repositories or `Core` infrastructure.
- Payment SDK usage is isolated to concrete repositories or `Core` infrastructure.
- SwiftData remains behind repository boundaries for feature UI state.
- Remote DTOs, table mappings, and sync policies are owned by the correct feature.
- Auth state flows through explicit auth/session abstractions, not globals or direct SDK calls in UI.
- Subscription access is enforced by app composition through entitlement abstractions, not by scattered feature-level checks.
- No-free-tier requirements route authenticated users without active entitlement to the subscription flow before the main app is shown.
- Names are specific, behavior is cohesive, and no catch-all utility or manager was introduced.
- Errors are handled intentionally.
- Tests or a clear manual verification path cover the changed behavior.

If a requested change conflicts with these rules, stop and reshape the implementation to preserve Feature MVVM. Architecture consistency is a requirement, not a preference. Do not cross these boundaries even when explicitly asked to do so.

## Build Commands

Never run xcodebuild or other build/run commands. The user handles all builds through the Xcode UI.

## Components

**Before making any frontend/UI changes, always check `Shared/Components/` and feature-specific `Components/` folders for existing reusable components.** Use existing components instead of creating new ones or using raw SwiftUI views.

**AppText** (`Shared/Components/AppText.swift`) - Always use `AppText` instead of `Text` for displaying text. This ensures consistent typography across the app.

```swift
// Use this:
AppText("Hello", style: .title)
AppText("Description", style: .body)
    .color(.secondary)
    .alignment(.center)

// NOT this:
Text("Hello")
    .font(.title)
```

**AppTextField** (`Shared/Components/AppTextField.swift`) - Use for all text input fields. Accepts `icon: TablerIconOutline` parameter.

**TablerIcon** (`Shared/Icons/TablerIcons.swift`) - **Always use `TablerIcon` instead of SF Symbols.** Never use `Image(systemName:)` or `systemImage:` anywhere in the project.

```swift
// Use this:
TablerIcon(.home, size: 24)
TablerIcon(.check, size: 20, color: Color("Brand"))
TablerIcon.filled(.heart, size: 24, color: Color("Error"))

// NOT this:
Image(systemName: "house.fill")
Image(systemName: "checkmark")
```

Icon names come from the `TablerIconOutline` and `TablerIconFilled` enums in `Shared/Icons/TablerIcons.swift`. Use outline icons by default, filled via `TablerIcon.filled(...)`.

**For tab bars**, use `TablerTabLabel` which converts the icon to an `Image` for tab bar compatibility:

```swift
Tab(value: 0) {
    ContentView()
} label: {
    TablerTabLabel(.home, title: String(localized: "tabs.home", table: "Common"))
}
```

**For `AppButton` icons** — pass a `TablerIconOutline`:

```swift
AppButton("Label", table: "Common", action: doSomething)
    .icon(.arrowRight, position: .trailing)
```

**Colors** — Use color assets from `Assets.xcassets` via `Color("TokenName")`. Never use hardcoded color values. Corner radii use raw CGFloat values directly.

```swift
// Use this:
.foregroundStyle(Color("Brand"))
.cornerRadius(12)

// NOT this:
.foregroundStyle(.orange)
```

## Localization

**Never hardcode user-facing text.** The app supports English (source language) and French using String Catalogs.

**String Catalogs are split by feature** in `Resources/Locales/`:

| Table        | File                   | Content                                                |
| ------------ | ---------------------- | ------------------------------------------------------ |
| `Auth`       | `Auth.xcstrings`       | Authentication (welcome, sign-in, sign-up, errors)     |
| `Chat`       | `Chat.xcstrings`       | Chat/conversation UI                                   |
| `Coach`      | `Coach.xcstrings`      | Coach personalities (titles, descriptions)             |
| `Common`     | `Common.xcstrings`     | Shared strings (continue, cancel, ok) + tab bar labels |
| `Home`       | `Home.xcstrings`       | Home screen (greeting, tasks)                          |
| `Intake`     | `Intake.xcstrings`     | Intake question flow                                   |
| `Onboarding` | `Onboarding.xcstrings` | Onboarding flow (name, goal, deadline, coach, etc.)    |
| `Paywall`    | `Paywall.xcstrings`    | Paywall / subscription UI                              |
| `Roadmap`    | `Roadmap.xcstrings`    | Roadmap, milestones, weekly plans                      |
| `Settings`   | `Settings.xcstrings`   | Settings screen (sign-out, version)                    |
| `Stats`      | `Stats.xcstrings`      | Statistics screen                                      |

**In SwiftUI views** — always pass `table:` to `AppText`/`AppButton`/`AppTextField`:

```swift
// Use this:
AppText("onboarding.welcome.title", table: "Onboarding", style: .largeTitle)
AppButton("common.continue", table: "Common", action: onContinue)
AppTextField(text: $email, label: "auth.form.email", table: "Auth")

// NOT this:
AppText("Bienvenue sur Milesto", style: .largeTitle)
```

**For native SwiftUI APIs** (`alert`, `Button`, `Tab`, `navigationTitle`) — use `String(localized:table:)`:

```swift
.alert(String(localized: "auth.error.title", table: "Auth"), isPresented: $showAlert) { }
Button(String(localized: "common.ok", table: "Common"), role: .cancel) { }
Tab(value: 0) { } label: { TablerTabLabel(.home, title: String(localized: "tabs.home", table: "Common")) }
.navigationTitle(String(localized: "settings.title", table: "Settings"))
```

**For string interpolation** — use `String(localized:table:)` with `verbatim:`:

```swift
AppText(verbatim: String(format: String(localized: "onboarding.complete.title", table: "Onboarding"), firstName), style: .largeTitle)
```

**In models/non-view code** — use `String(localized:table:)`:

```swift
var title: String {
    return String(localized: "coach.motivateur.title", table: "Coach")
}
```

**Key naming convention:** `feature.screen.element` (e.g., `onboarding.welcome.title`, `coach.zen.description`, `common.continue`)

**Adding strings for a new feature:** Create a new `<FeatureName>.xcstrings` file in `Resources/Locales/`. Never add feature-specific keys to an unrelated table. Only `Common.xcstrings` is shared across features.

## Code Style

- Do not write comments in code
- Do not add file headers (the `//  FileName.swift` blocks at the top of files)
- Keep code self-documenting through clear naming
- Do not use glow effects unless explicitly requested
