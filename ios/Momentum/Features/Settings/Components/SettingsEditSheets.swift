import SwiftUI

enum SettingsSheet: Identifiable {
    case name
    case birthdate
    case coach
    case language

    var id: Self { self }
}

struct EditNameSheet: View {
    @State var firstName: String
    @State var lastName: String
    let onSave: (ProfileUpdateFields) -> Void

    @Environment(\.dismiss) private var dismiss

    private var isValid: Bool {
        !firstName.trimmingCharacters(in: .whitespaces).isEmpty
        && !lastName.trimmingCharacters(in: .whitespaces).isEmpty
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: AppTheme.Spacing.lg) {
                AppTextField(
                    text: $firstName,
                    label: "settings.edit.firstName",
                    table: "Settings",
                    textContentType: .givenName,
                    autocorrectionDisabled: true
                )

                AppTextField(
                    text: $lastName,
                    label: "settings.edit.lastName",
                    table: "Settings",
                    textContentType: .familyName,
                    autocorrectionDisabled: true
                )

                Spacer()

                AppButton("settings.edit.save", table: "Settings") {
                    onSave(ProfileUpdateFields(
                        firstName: firstName.trimmingCharacters(in: .whitespaces),
                        lastName: lastName.trimmingCharacters(in: .whitespaces)
                    ))
                    dismiss()
                }
                .fullWidth()
                .disabled(!isValid)
            }
            .padding(AppTheme.Spacing.lg)
            .navigationTitle(String(localized: "settings.edit.name.title", table: "Settings"))
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

struct EditBirthdateSheet: View {
    @State var dateOfBirth: Date
    let onSave: (ProfileUpdateFields) -> Void

    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            VStack(spacing: AppTheme.Spacing.lg) {
                DatePicker(
                    String(localized: "settings.profile.birthDate", table: "Settings"),
                    selection: $dateOfBirth,
                    in: ...Date.now,
                    displayedComponents: .date
                )
                .datePickerStyle(.wheel)
                .labelsHidden()

                Spacer()

                AppButton("settings.edit.save", table: "Settings") {
                    let formatter = DateFormatter()
                    formatter.dateFormat = "yyyy-MM-dd"
                    onSave(ProfileUpdateFields(
                        dateOfBirth: formatter.string(from: dateOfBirth)
                    ))
                    dismiss()
                }
                .fullWidth()
            }
            .padding(AppTheme.Spacing.lg)
            .navigationTitle(String(localized: "settings.edit.birthdate.title", table: "Settings"))
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

struct EditCoachSheet: View {
    @State var selectedCoach: CoachPersonality?
    let onSave: (ProfileUpdateFields) -> Void

    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            VStack(spacing: AppTheme.Spacing.lg) {
                VStack(spacing: AppTheme.Spacing.sm) {
                    ForEach(CoachPersonality.allCases) { personality in
                        CoachCard(
                            personality: personality,
                            isSelected: selectedCoach == personality,
                            onSelect: { selectedCoach = personality }
                        )
                    }
                }

                Spacer()

                AppButton("settings.edit.save", table: "Settings") {
                    if let coachId = selectedCoach?.databaseId {
                        onSave(ProfileUpdateFields(coachId: coachId))
                    }
                    dismiss()
                }
                .fullWidth()
                .disabled(selectedCoach == nil)
            }
            .padding(AppTheme.Spacing.lg)
            .navigationTitle(String(localized: "settings.edit.coach.title", table: "Settings"))
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

struct EditLanguageSheet: View {
    @State var selectedLanguage: String
    let onSave: (ProfileUpdateFields) -> Void

    @Environment(\.dismiss) private var dismiss

    private let languages = [
        ("en", "settings.edit.language.en"),
        ("fr", "settings.edit.language.fr")
    ]

    var body: some View {
        NavigationStack {
            VStack(spacing: AppTheme.Spacing.lg) {
                VStack(spacing: AppTheme.Spacing.sm) {
                    ForEach(languages, id: \.0) { code, labelKey in
                        Button {
                            selectedLanguage = code
                        } label: {
                            HStack(spacing: AppTheme.Spacing.md) {
                                AppText(LocalizedStringKey(labelKey), table: "Settings", style: .body)

                                Spacer()

                                TablerIcon(.circleCheck, size: 24, color: AppTheme.Colors.accent)
                                    .opacity(selectedLanguage == code ? 1 : 0)
                                    .scaleEffect(selectedLanguage == code ? 1 : 0.5)
                                    .animation(.spring(response: 0.3, dampingFraction: 0.7), value: selectedLanguage)
                            }
                            .padding(AppTheme.Spacing.md)
                            .contentShape(Rectangle())
                            .background(AppTheme.Colors.fieldBackground, in: RoundedRectangle(cornerRadius: AppTheme.CornerRadius.md))
                            .overlay(
                                RoundedRectangle(cornerRadius: AppTheme.CornerRadius.md)
                                    .stroke(selectedLanguage == code ? AppTheme.Colors.accent : AppTheme.Colors.fieldBorderDefault, lineWidth: selectedLanguage == code ? 2 : 1)
                                    .animation(.spring(response: 0.3, dampingFraction: 0.7), value: selectedLanguage)
                            )
                        }
                        .buttonStyle(.plain)
                    }
                }

                Spacer()

                AppButton("settings.edit.save", table: "Settings") {
                    onSave(ProfileUpdateFields(language: selectedLanguage))
                    dismiss()
                }
                .fullWidth()
            }
            .padding(AppTheme.Spacing.lg)
            .navigationTitle(String(localized: "settings.edit.language.title", table: "Settings"))
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}
