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
        VStack(spacing: AppTheme.Spacing.lg) {
            VStack(spacing: AppTheme.Spacing.xs) {
                AppText("onboarding.name.title", table: "Onboarding", style: .title)

                AppText("onboarding.name.subtitle", table: "Onboarding", style: .subheadline)
            }
            .padding(.top, AppTheme.Spacing.xxl)
            .padding(.bottom, AppTheme.Spacing.md)

            VStack(spacing: AppTheme.Spacing.md) {
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
            .padding(.horizontal, AppTheme.Spacing.lg)

            Spacer()

            VStack(spacing: AppTheme.Spacing.md) {
                AppButton("common.continue", table: "Common", action: onContinue)
                    .fullWidth()
                    .disabled(!canContinue)

                AppText("onboarding.editLater", table: "Onboarding", style: .caption)
                    .alignment(.center)
            }
            .padding(.bottom, AppTheme.Spacing.lg)
        }
    }
}

#Preview {
    NavigationStack {
        OnboardingNameView(
            firstName: .constant(""),
            lastName: .constant(""),
            onContinue: { }
        )
    }
}
