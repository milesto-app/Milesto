# iOS Codebase Rules

## Build Commands

Never run xcodebuild or other build/run commands. The user handles all builds through the Xcode UI.

## Components

**Before making any frontend/UI changes, always check `Shared/Components/` and feature-specific `Components/` folders for existing reusable components.** Use existing components instead of creating new ones or using raw SwiftUI views.

**Starting view animation** (`Shared/Components/AppStartTransition.swift`) - Any view that can become the first visible authenticated screen should use the shared start transition so it fades in consistently with the normal app.

- In `AppView`, wrap new root branches with `startingView { ... }`.
- If a root branch renders a placeholder first while creating/loading a local model, apply `.appStartTransition()` to the first real content that replaces the placeholder.
- Do not add one-off entrance `@State` fade logic inside individual feature views unless the animation is unique to that feature.

```swift
// In AppView:
startingView {
    NewFeatureStartView()
}

// Inside a view that initially shows a loading/background placeholder:
if let model {
    content(model: model)
        .appStartTransition()
} else {
    Color("BackgroundBase").ignoresSafeArea()
}
```

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

**TablerIcon** (`Shared/Components/TablerIcons.swift`) - **Always use `TablerIcon` instead of SF Symbols.** Never use `Image(systemName:)` or `systemImage:` anywhere in the project.

```swift
// Use this:
TablerIcon(.home, size: 24)
TablerIcon(.check, size: 20, color: Color("Brand"))
TablerIcon.filled(.heart, size: 24, color: Color("Error"))

// NOT this:
Image(systemName: "house.fill")
Image(systemName: "checkmark")
```

Icon names come from the `TablerIconOutline` and `TablerIconFilled` enums in `Shared/Components/TablerIcons.swift`. Use outline icons by default, filled via `TablerIcon.filled(...)`.

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

- Keep code self-documenting through clear naming
- Learning-style Xcode file headers are allowed.
- Do not write explanatory comments in code unless they clarify non-obvious behavior.
- Do not use glow effects unless explicitly requested
