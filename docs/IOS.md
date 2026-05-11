# iOS Codebase Rules

## 1. Build Commands

- Never run `xcodebuild` or other build/run commands.
- The user handles all builds through the Xcode UI.

## 2. Components

### 2.1 General Rule

Before making any frontend/UI changes, always check `Shared/Components/` and feature-specific `Components/` folders for existing reusable components. Use existing components instead of creating new ones or using raw SwiftUI views.

### 2.2 AppText

Located at `Shared/Components/AppText.swift`. Always use `AppText` instead of `Text` for displaying text. This ensures consistent typography across the app.

```swift
AppText("Hello", style: .title)
AppText("Description", style: .body)
    .color(.secondary)
    .alignment(.center)
```

### 2.3 AppTextField

Located at `Shared/Components/AppTextField.swift`. Use for all text input fields. Accepts an `icon: TablerIcon` parameter.

### 2.4 TablerIcon

Located at `Shared/Components/TablerIcons.swift`. Always use `TablerIcon` instead of SF Symbols.

- Never use `Image(systemName:)` or `systemImage:` anywhere in the project.
- Icon names come from the `TablerIcon` enum in `Shared/Components/TablerIcons.swift`.

```swift
TablerIcon(.home, size: 24)
TablerIcon(.check, size: 20, color: Color("Brand"))
```

### 2.5 AppButton Icons

Pass a `TablerIcon` to the `.icon(_:position:)` modifier:

```swift
AppButton("Label", table: "Common", action: doSomething)
    .icon(.arrowRight, position: .trailing)
```

### 2.6 Colors & Corner Radii

- Use color assets from `Assets.xcassets` via `Color("TokenName")`.
- Never use hardcoded color values.
- Corner radii use raw `CGFloat` values directly.

```swift
.foregroundStyle(Color("Brand"))
.cornerRadius(12)
```

## 3. Localization

The app supports English (source language) and French using String Catalogs. Never hardcode user-facing text.

### 3.1 SwiftUI Views

Always pass `table:` to `AppText` / `AppButton` / `AppTextField`:

```swift
AppText("onboarding.welcome.title", table: "Onboarding", style: .largeTitle)
AppButton("common.continue", table: "Common", action: onContinue)
AppTextField(text: $email, label: "auth.form.email", table: "Auth")
```

### 3.2 Native SwiftUI APIs

For `alert`, `Button`, `Tab`, `navigationTitle`, etc., use `String(localized:table:)`:

```swift
.alert(String(localized: "auth.error.title", table: "Auth"), isPresented: $showAlert) { }
Button(String(localized: "common.ok", table: "Common"), role: .cancel) { }
Tab(value: 0) { } label: { TablerTabLabel(.home, title: String(localized: "tabs.home", table: "Common")) }
.navigationTitle(String(localized: "settings.title", table: "Settings"))
```

### 3.3 String Interpolation

Use `String(localized:table:)` together with `verbatim:`:

```swift
AppText(verbatim: String(format: String(localized: "onboarding.complete.title", table: "Onboarding"), firstName), style: .largeTitle)
```

### 3.4 Models / Non-View Code

Use `String(localized:table:)`:

```swift
var title: String {
    return String(localized: "coach.motivateur.title", table: "Coach")
}
```

### 3.5 Adding Strings for a New Feature

- Create a new `<FeatureName>.xcstrings` file in `Resources/Locales/`.
- Never add feature-specific keys to an unrelated table.
- Only `Common.xcstrings` is shared across features.

## 4. Code Style

- Keep code self-documenting through clear naming.
- Do not write comments at all.
- Do not use glow effects unless explicitly requested.
