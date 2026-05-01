import SwiftUI

struct OnboardingNameView: View {
    @Binding var firstName: String
    @Binding var lastName: String
    let onContinue: () -> Void

    private var canContinue: Bool {
        !firstName.trimmingCharacters(in: .whitespaces).isEmpty &&
            !lastName.trimmingCharacters(in: .whitespaces).isEmpty
    }

    var body: some View {
        VStack(spacing: 24) {
            VStack(spacing: 8) {
                AppText("onboarding.name.title", table: "Onboarding", style: .title)

                AppText("onboarding.name.subtitle", table: "Onboarding", style: .subheadline)
            }
            .padding(.top, 40)
            .padding(.bottom, 16)

            VStack(spacing: 16) {
                AppTextField(
                    text: $firstName,
                    label: "onboarding.name.firstName",
                    table: "Onboarding",
                    textContentType: .givenName,
                    autocorrectionDisabled: true
                )

                AppTextField(
                    text: $lastName,
                    label: "onboarding.name.lastName",
                    table: "Onboarding",
                    textContentType: .familyName,
                    autocorrectionDisabled: true
                )
            }
            .padding(.horizontal, 24)

            Spacer()

            VStack(spacing: 16) {
                AppButton("common.continue", table: "Common", action: onContinue)
                    .fullWidth()
                    .disabled(!canContinue)

                AppText("onboarding.editLater", table: "Onboarding", style: .caption)
                    .alignment(.center)
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 24)
        }
    }
}
