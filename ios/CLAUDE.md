# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

Never run xcodebuild or other build/run commands. The user handles all builds through the Xcode UI.

## Architecture

This is a SwiftUI iOS app using SwiftData for persistence with a feature-oriented file structure.

**Project Structure (illustrative, not exhaustive — the actual structure evolves as features are added):**

```
Momentum/
├── App/                           # App entry point and root navigation
├── Core/
│   └── Components/                # Shared reusable UI components only
├── Features/                      # Feature modules (each self-contained)
│   └── <FeatureName>/
│       ├── Models/                # SwiftData models and data structures
│       ├── Views/                 # SwiftUI views
│       └── Components/            # Feature-specific reusable components
└── Resources/                     # Assets, String Catalogs, etc.
    └── Locales/                   # Localization files split by feature
```

New features follow this pattern: create `Features/<FeatureName>/` with `Models/`, `Views/`, and/or `Components/` subdirectories as needed. Not every feature needs all three — only add what's relevant.

Always place new models in their feature directory (`Features/<FeatureName>/Models/`), never in `Core/`. `Core/` is reserved for shared UI components only.

**Data Flow:**

- `App/MomentumApp.swift` creates the shared `ModelContainer` (schema includes all `@Model` classes) and injects it via `.modelContainer()`
- Views use `@Query` for reactive data fetching and `@Environment(\.modelContext)` for mutations
- Remote data from Supabase is synced into SwiftData models for local persistence (cache-first pattern)

**Key Patterns:**

- SwiftData handles all local persistence via the `ModelContainer`/`ModelContext` pattern
- Views use `@Query` property wrapper for instant, reactive data fetching from the local store
- CRUD operations go through `modelContext.insert()` and `modelContext.delete()`
- **Cache-first for remote data**: read from SwiftData immediately (no loading state), then sync from Supabase in background via `.task`. `@Query` automatically re-renders when data updates. Only show a loading state on first launch when no local data exists yet.
- When adding a new `@Model`, always register it in the schema in `App/MomentumApp.swift`

**Existing SwiftData Models:**

- `LocalProfile` (`Features/User/Models/LocalProfile.swift`) — cached user profile data (name, email, avatar, coach, etc.), synced from Supabase `profiles` table + auth metadata

## Components

**Before making any frontend/UI changes, always check `Core/Components/` and feature-specific `Components/` folders for existing reusable components.** Use existing components instead of creating new ones or using raw SwiftUI views.

**AppText** (`Core/Components/AppText.swift`) - Always use `AppText` instead of `Text` for displaying text. This ensures consistent typography across the app.

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

Available styles: `.largeTitle`, `.title`, `.headline`, `.body`, `.subheadline`, `.caption`

**AppTextField** (`Core/Components/AppTextField.swift`) - Use for all text input fields. Accepts `icon: TablerIconOutline` parameter.

**TablerIcon** (`Core/Components/TablerIcon.swift`) - **Always use `TablerIcon` instead of SF Symbols.** Never use `Image(systemName:)` or `systemImage:` anywhere in the project.

```swift
// Use this:
TablerIcon(.home, size: 24)
TablerIcon(.check, size: 20, color: AppTheme.Colors.accent)
TablerIcon.filled(.heart, size: 24, color: AppTheme.Colors.error)

// NOT this:
Image(systemName: "house.fill")
Image(systemName: "checkmark")
```

Icon names come from the `TablerIconOutline` and `TablerIconFilled` enums in `Core/Components/TablerIconCatalog.swift`. Use outline icons by default, filled via `TablerIcon.filled(...)`.

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

**AppTheme** (`Core/Components/AppTheme.swift`) - Use for all design tokens (colors, spacing, corner radii). Never use hardcoded values.

```swift
// Use this:
.foregroundStyle(AppTheme.Colors.accent)
.padding(AppTheme.Spacing.md)
.cornerRadius(AppTheme.CornerRadius.sm)

// NOT this:
.foregroundStyle(.orange)
.padding(16)
.cornerRadius(8)
```

Available tokens:

- `AppTheme.Colors`: `.accent`, `.success`, `.error`, `.disabled`, `.textPrimary`, `.textSecondary`, `.textPlaceholder`, `.textOnAccent`, `.iconDefault`, `.fieldBackground`, `.fieldBorderFocused`, `.fieldBorderError`, `.fieldBorderDefault`
- `AppTheme.Spacing`: `.xxs` (4), `.xs` (8), `.sm` (12), `.md` (16), `.lg` (24), `.xl` (32), `.xxl` (40)
- `AppTheme.CornerRadius`: `.sm` (8), `.md` (12), `.lg` (16), `.xl` (24)

## Localization

**Never hardcode user-facing text.** The app supports French (source language) and English using String Catalogs.

**String Catalogs are split by feature** in `Resources/Locales/`:

| Table        | File                   | Content                                                |
| ------------ | ---------------------- | ------------------------------------------------------ |
| `Auth`       | `Auth.xcstrings`       | Authentication (welcome, sign-in, sign-up, errors)     |
| `Onboarding` | `Onboarding.xcstrings` | Onboarding flow (name, goal, deadline, coach, etc.)    |
| `Home`       | `Home.xcstrings`       | Home screen (greeting, tasks, mock data)               |
| `Coach`      | `Coach.xcstrings`      | Coach personalities (titles, descriptions)             |
| `Settings`   | `Settings.xcstrings`   | Settings screen (sign-out, version)                    |
| `Common`     | `Common.xcstrings`     | Shared strings (continue, cancel, ok) + tab bar labels |
| `Stats`      | `Stats.xcstrings`      | Statistics screen                                      |

**In SwiftUI views** — always pass `table:` to `AppText`/`AppButton`/`AppTextField`:

```swift
// Use this:
AppText("onboarding.welcome.title", table: "Onboarding", style: .largeTitle)
AppButton("common.continue", table: "Common", action: onContinue)
AppTextField(text: $email, label: "auth.form.email", table: "Auth")

// NOT this:
AppText("Bienvenue sur Momentum", style: .largeTitle)
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
- Do not use shadows or glow effects unless explicitly requested

## Backend — Supabase

The backend runs entirely on **Supabase** (PostgreSQL, Auth, Storage, Edge Functions).

A **Supabase MCP server** is configured and available — use it to interact directly with the project's Supabase instance: run SQL queries, apply migrations, manage Edge Functions, check logs, generate TypeScript types, etc. Always prefer the MCP tools over manual API calls or CLI commands.

Key points:

- **Auth**: Supabase Auth handles authentication (email, Apple, Google) via `AuthService.shared` on the client side
- **Database**: PostgreSQL with Row Level Security (RLS). Always enable RLS on new tables and define appropriate policies
- **Migrations**: Use the MCP `apply_migration` tool for all DDL changes (create/alter tables, policies, indexes). Never run DDL via `execute_sql`
- **Edge Functions**: Deploy and manage via MCP tools. Use Deno runtime with `verify_jwt: true` by default
- **After DDL changes**: Run the `get_advisors` tool (security + performance) to catch missing RLS policies or other issues

## Technologies

- Swift 5, SwiftUI, SwiftData
- iOS 26.2+ deployment target
- Xcode 16.2 build system
- Supabase (PostgreSQL, Auth, Edge Functions)
- Supabase MCP server for backend management
