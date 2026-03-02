import SwiftUI

struct OnboardingGoalDescriptionView: View {
    @Binding var goalDescription: String
    let onContinue: () -> Void

    @FocusState private var isFocused: Bool

    private var canContinue: Bool {
        !goalDescription.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    var body: some View {
        VStack(spacing: AppTheme.Spacing.lg) {
            VStack(spacing: AppTheme.Spacing.xs) {
                AppText("onboarding.goal.title", table: "Onboarding", style: .title)
                    .alignment(.center)

                AppText("onboarding.goal.subtitle", table: "Onboarding", style: .subheadline)
            }
            .padding(.top, AppTheme.Spacing.xxl)
            .padding(.bottom, AppTheme.Spacing.md)
            .padding(.horizontal, AppTheme.Spacing.lg)

            ZStack(alignment: .topLeading) {
                RoundedRectangle(cornerRadius: AppTheme.CornerRadius.md)
                    .fill(AppTheme.Colors.fieldBackground)

                RoundedRectangle(cornerRadius: AppTheme.CornerRadius.md)
                    .stroke(
                        isFocused ? AppTheme.Colors.fieldBorderFocused : AppTheme.Colors.fieldBorderDefault,
                        lineWidth: 2
                    )

                if goalDescription.isEmpty && !isFocused {
                    AppText("onboarding.goal.placeholder", table: "Onboarding", style: .body)
                        .color(AppTheme.Colors.textPlaceholder)
                        .padding(AppTheme.Spacing.md)
                }

                TextEditor(text: $goalDescription)
                    .focused($isFocused)
                    .scrollContentBackground(.hidden)
                    .padding(AppTheme.Spacing.sm)
            }
            .frame(height: 150)
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
        OnboardingGoalDescriptionView(
            goalDescription: .constant(""),
            onContinue: { }
        )
    }
}
