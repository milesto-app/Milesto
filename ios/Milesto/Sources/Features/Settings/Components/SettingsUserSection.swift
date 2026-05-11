import SwiftUI

struct SettingsUserHeaderSection: View {
    let user: UserDTO?
    let email: String?
    let avatarURL: String?
    let fullName: String
    let initials: String
    let onEdit: () -> Void

    var body: some View {
        Section {
            if user == nil {
                HStack {
                    Spacer()
                    AppLoader()
                    Spacer()
                }
                .padding(.vertical, 32)
                .listRowBackground(Color.clear)
            } else {
                Button(action: onEdit) {
                    VStack(spacing: 16) {
                        UserAvatarView(
                            imageURL: avatarURL.flatMap(URL.init(string:)),
                            initials: initials,
                            size: 80
                        )

                        VStack(spacing: 4) {
                            if !fullName.isEmpty {
                                HStack(spacing: 6) {
                                    TablerIcons(.pencil, size: 16, color: .clear)
                                    AppText(verbatim: fullName, style: .title)
                                    TablerIcons(.pencil, size: 16, color: Color("TextSecondary"))
                                }
                            }

                            if let email, !email.isEmpty {
                                AppText(verbatim: email, style: .subheadline)
                                    .alignment(.center)
                            }
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 24)
                }
                .buttonStyle(.plain)
                .listRowBackground(Color.clear)
                .listRowInsets(EdgeInsets())
            }
        }
        .listRowBackground(Color("BackgroundPrimary"))
    }
}

struct SettingsUserDetailsSection: View {
    let user: UserDTO?
    let coach: CoachPersonality?
    let currentAppLanguage: String
    let onEditBirthdate: () -> Void
    let onEditCoach: () -> Void
    let onEditLanguage: () -> Void

    var body: some View {
        Section {
            SettingsEditableRow(
                icon: .cake,
                label: "settings.profile.birthYear",
                value: user?.birthYear.map(String.init) ?? "—",
                action: onEditBirthdate
            )

            if let coach {
                SettingsEditableRow(
                    icon: coach.icon,
                    label: "settings.profile.coach",
                    value: coach.title,
                    action: onEditCoach
                )
            }

            SettingsEditableRow(
                icon: .world,
                label: "settings.profile.language",
                value: currentAppLanguage,
                action: onEditLanguage
            )

            if let createdAt = user?.createdAt {
                SettingsDetailRow(
                    icon: .calendar,
                    label: "settings.profile.memberSince",
                    value: Self.formattedDate(createdAt)
                )
            }
        }
        .listRowBackground(Color("BackgroundSecondary"))
    }

    static func formattedDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        return formatter.string(from: date)
    }
}

struct SettingsSubscriptionSection: View {
    let onManageSubscription: () -> Void

    var body: some View {
        Section {
            SettingsEditableRow(
                icon: .creditCard,
                label: "settings.subscription.manage",
                value: "",
                action: onManageSubscription
            )
        }
        .listRowBackground(Color("BackgroundSecondary"))
    }
}

struct SettingsEditableRow: View {
    let icon: TablerIcon
    let label: LocalizedStringKey
    let value: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 12) {
                TablerIcons(icon, size: 24, color: Color("Brand"))
                AppText(label, table: "Settings", style: .body)
                Spacer()
                AppText(verbatim: value, style: .body)
                    .color(Color("TextSecondary"))
                TablerIcons(.chevronRight, size: 16, color: Color("TextSecondary"))
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}

struct SettingsDetailRow: View {
    let icon: TablerIcon
    let label: LocalizedStringKey
    let value: String

    var body: some View {
        HStack(spacing: 12) {
            TablerIcons(icon, size: 24, color: Color("Brand"))
            AppText(label, table: "Settings", style: .body)
            Spacer()
            AppText(verbatim: value, style: .body)
                .color(Color("TextSecondary"))
        }
    }
}

struct SettingsDangerSection: View {
    let isDeleting: Bool
    let onDeleteGoal: () -> Void
    let onSignOut: () -> Void
    var onUnlockDesignSystem: (() -> Void)?

    @State private var versionTapCount: Int = 0
    @State private var lastVersionTap: Date = .distantPast

    private let unlockTapTarget: Int = 7
    private let tapResetWindow: TimeInterval = 2.0

    var body: some View {
        Section {
            dangerButton(
                icon: .trash,
                label: "settings.deleteGoal",
                action: onDeleteGoal
            )
            .disabled(isDeleting)

            dangerButton(
                icon: .logout,
                label: "settings.signOut",
                action: onSignOut
            )
        } footer: {
            HStack {
                Spacer()
                AppText(verbatim: "\(String(localized: "settings.version", table: "Settings")) \(Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "")", style: .caption)
                    .color(Color("TextSecondary"))
                    .contentShape(Rectangle())
                    .onTapGesture { handleVersionTap() }
                Spacer()
            }
            .padding(.top, 24)
        }
        .listRowBackground(Color("BackgroundSecondary"))
    }

    private func handleVersionTap() {
        let now = Date()
        if now.timeIntervalSince(lastVersionTap) > tapResetWindow {
            versionTapCount = 1
        } else {
            versionTapCount += 1
        }
        lastVersionTap = now

        if versionTapCount >= unlockTapTarget {
            versionTapCount = 0
            onUnlockDesignSystem?()
        }
    }

    private func dangerButton(
        icon: TablerIcon,
        label: LocalizedStringKey,
        action: @escaping () -> Void
    ) -> some View {
        Button(role: .destructive, action: action) {
            HStack(spacing: 12) {
                TablerIcons(icon, size: 24, color: Color("Error"))
                AppText(label, table: "Settings", style: .body)
                    .color(Color("Error"))
            }
            .contentShape(Rectangle())
        }
    }
}
