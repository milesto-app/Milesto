# iOS Codebase Rules

## Build Commands

Never run xcodebuild or other build/run commands. The user handles all builds through the Xcode UI.

## Components

**Before making any frontend/UI changes, always check `Shared/Components/` and feature-specific `Components/` folders for existing reusable components.** Use existing components instead of creating new ones or using raw SwiftUI views.

**AppText** (`Shared/Components/AppText.swift`) - Always use `AppText` instead of `Text` for displaying text. This ensures consistent typography across the app.

```swift
AppText("Hello", style: .title)
AppText("Description", style: .body)
    .color(.secondary)
    .alignment(.center)
```

**AppTextField** (`Shared/Components/AppTextField.swift`) - Use for all text input fields. Accepts `icon: TablerIcon` parameter.

**TablerIcon** (`Shared/Components/TablerIcons.swift`) - **Always use `TablerIcon` instead of SF Symbols.** Never use `Image(systemName:)` or `systemImage:` anywhere in the project.

```swift
TablerIcon(.home, size: 24)
TablerIcon(.check, size: 20, color: Color("Brand"))
```

Icon names come from the `TablerIcon` enum in `Shared/Components/TablerIcons.swift`.

**For `AppButton` icons** — pass a `TablerIcon`:

```swift
AppButton("Label", table: "Common", action: doSomething)
    .icon(.arrowRight, position: .trailing)
```

**Colors** — Use color assets from `Assets.xcassets` via `Color("TokenName")`. Never use hardcoded color values. Corner radii use raw CGFloat values directly.

```swift
.foregroundStyle(Color("Brand"))
.cornerRadius(12)
```

## Localization

**Never hardcode user-facing text.** The app supports English (source language) and French using String Catalogs.

**In SwiftUI views** — always pass `table:` to `AppText`/`AppButton`/`AppTextField`:

```swift
AppText("onboarding.welcome.title", table: "Onboarding", style: .largeTitle)
AppButton("common.continue", table: "Common", action: onContinue)
AppTextField(text: $email, label: "auth.form.email", table: "Auth")
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

**Adding strings for a new feature:** Create a new `<FeatureName>.xcstrings` file in `Resources/Locales/`. Never add feature-specific keys to an unrelated table. Only `Common.xcstrings` is shared across features.

## Code Style

- Keep code self-documenting through clear naming
- Do not write comments at all.
- Do not use glow effects unless explicitly requested
