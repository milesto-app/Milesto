import SwiftUI

struct SettingsProfileHeaderSection: View {
    let profile: Profile?
    let fullName: String
    let initials: String
    let onEdit: () -> Void

    var body: some View {
        Section {
            if profile == nil {
                HStack {
                    Spacer()
                    ProgressView()
                    Spacer()
                }
                .padding(.vertical, 32)
                .listRowBackground(Color.clear)
            } else {
                Button(action: onEdit) {
                    VStack(spacing: 16) {
                        ProfileAvatarView(
                            imageData: profile?.avatarData,
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

                            if let email = profile?.email, !email.isEmpty {
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
    }
}

struct SettingsProfileDetailsSection: View {
    let profile: Profile?
    let coach: CoachPersonality?
    let currentAppLanguage: String
    let onEditBirthdate: () -> Void
    let onEditCoach: () -> Void
    let onEditLanguage: () -> Void

    var body: some View {
        Section {
            if let dateOfBirth = profile?.dateOfBirth {
                SettingsEditableRow(
                    icon: .cake,
                    label: "settings.profile.birthDate",
                    value: Self.formattedDate(dateOfBirth),
                    action: onEditBirthdate
                )
            }

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

            if let createdAt = profile?.createdAt {
                SettingsDetailRow(
                    icon: .calendar,
                    label: "settings.profile.memberSince",
                    value: Self.formattedDate(createdAt)
                )
            }
        }
    }

    static func formattedDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        return formatter.string(from: date)
    }
}

struct SettingsEditableRow: View {
    let icon: TablerIconOutline
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
    let icon: TablerIconOutline
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

struct SettingsDeleteGoalSection: View {
    let isDeleting: Bool
    let onTap: () -> Void

    var body: some View {
        Section {
            Button(role: .destructive, action: onTap) {
                HStack(spacing: 12) {
                    TablerIcons(.trash, size: 24, color: Color("Error"))
                    AppText("settings.deleteGoal", table: "Settings", style: .body)
                        .color(Color("Error"))
                }
                .contentShape(Rectangle())
            }
            .disabled(isDeleting)
        }
    }
}

struct SettingsSignOutSection: View {
    let onTap: () -> Void

    var body: some View {
        Section {
            Button(role: .destructive, action: onTap) {
                HStack(spacing: 12) {
                    TablerIcons(.logout, size: 24, color: Color("Error"))
                    AppText("settings.signOut", table: "Settings", style: .body)
                        .color(Color("Error"))
                }
                .contentShape(Rectangle())
            }
        } footer: {
            HStack {
                Spacer()
                AppText(verbatim: "\(String(localized: "settings.version", table: "Settings")) \(Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "")", style: .caption)
                    .color(Color("TextSecondary"))
                Spacer()
            }
            .padding(.top, 24)
        }
    }
}
