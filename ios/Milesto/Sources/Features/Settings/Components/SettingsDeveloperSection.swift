#if DEBUG
    import SwiftUI

    struct SettingsDeveloperSection: View {
        let developerSettings: DeveloperSettings

        var body: some View {
            Section {
                Picker("Developer route", selection: Binding(
                    get: { developerSettings.routeOverride },
                    set: { developerSettings.routeOverride = $0 }
                )) {
                    ForEach(DeveloperRouteOverride.allCases) { route in
                        AppText(verbatim: route.title, style: .body).tag(route)
                    }
                }
                .pickerStyle(.menu)

                if developerSettings.routeOverride != .none {
                    Button {
                        developerSettings.clearRouteOverride()
                    } label: {
                        HStack(spacing: 12) {
                            TablerIcons(.refresh, size: 24, color: Color("Brand"))
                            AppText(verbatim: "Clear developer override", style: .body)
                        }
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                }
            } header: {
                AppText(verbatim: "Developer", style: .caption)
            } footer: {
                AppText(verbatim: "Overrides only change local routing in debug builds.", style: .caption)
            }
        }
    }
#endif
