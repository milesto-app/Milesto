import SwiftUI
import UIKit

struct SettingsSheetContent: View {
    let sheet: SettingsSheet
    let profile: Profile?
    let onSave: (ProfileUpdateFields) -> Void

    var body: some View {
        switch sheet {
        case .name:
            EditNameSheet(
                firstName: profile?.firstName ?? "",
                lastName: profile?.lastName ?? "",
                onSave: onSave
            )
        case .birthdate:
            EditBirthdateSheet(
                dateOfBirth: profile?.dateOfBirth ?? Date(),
                onSave: onSave
            )
        case .coach:
            EditCoachSheet(
                selectedCoach: profile?.coachId.flatMap { CoachPersonality.from(databaseId: $0) },
                onSave: onSave
            )
        case .language:
            LanguageInfoSheet()
        }
    }
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
            VStack(spacing: 24) {
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
            .padding(24)
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
            VStack(spacing: 24) {
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
            .padding(24)
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
            VStack(spacing: 24) {
                VStack(spacing: 12) {
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
            .padding(24)
            .navigationTitle(String(localized: "settings.edit.coach.title", table: "Settings"))
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

struct LanguageInfoSheet: View {
    @Environment(\.dismiss) private var dismiss

    private var currentLanguageName: String {
        let code = Bundle.main.preferredLocalizations.first ?? "en"
        let locale = Locale(identifier: code)
        return locale.localizedString(forLanguageCode: code)?.capitalized ?? code
    }

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 24) {
                VStack(alignment: .leading, spacing: 8) {
                    AppText("settings.language.info.currentLabel", table: "Settings", style: .caption)
                    HStack(spacing: 12) {
                        TablerIcons(.world, size: 24, color: Color("Brand"))
                        AppText(verbatim: currentLanguageName, style: .headline)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(16)
                .background(Color("BackgroundElevated"), in: RoundedRectangle(cornerRadius: 12))

                AppText("settings.language.info.description", table: "Settings", style: .body)
                    .color(Color("TextSecondary"))

                VStack(alignment: .leading, spacing: 16) {
                    AppText("settings.language.info.stepsTitle", table: "Settings", style: .headline)

                    stepRow(number: 1, textKey: "settings.language.info.step1")
                    stepRow(number: 2, textKey: "settings.language.info.step2")
                    stepRow(number: 3, textKey: "settings.language.info.step3")
                }

                Spacer()

                AppButton("settings.language.info.openSettings", table: "Settings") {
                    if let url = URL(string: UIApplication.openSettingsURLString) {
                        UIApplication.shared.open(url)
                    }
                    dismiss()
                }
                .icon(.arrowUpRight, position: .trailing)
                .fullWidth()
            }
            .padding(24)
            .navigationTitle(String(localized: "settings.language.info.title", table: "Settings"))
            .navigationBarTitleDisplayMode(.inline)
        }
    }

    private func stepRow(number: Int, textKey: String) -> some View {
        HStack(alignment: .top, spacing: 12) {
            ZStack {
                Circle()
                    .fill(Color("Brand").opacity(0.15))
                    .frame(width: 28, height: 28)
                AppText(verbatim: "\(number)", style: .subheadline)
                    .color(Color("Brand"))
                    .weight(.semibold)
            }
            AppText(LocalizedStringKey(textKey), table: "Settings", style: .body)
            Spacer(minLength: 0)
        }
    }
}
