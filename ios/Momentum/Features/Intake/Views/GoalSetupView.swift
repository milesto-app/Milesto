import SwiftUI

struct GoalSetupView: View {
    @Binding var goalDescription: String
    let isLoading: Bool
    let onContinue: () -> Void

    private var canContinue: Bool {
        !goalDescription.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    var body: some View {
        VStack(spacing: AppTheme.Spacing.lg) {
            VStack(spacing: AppTheme.Spacing.xs) {
                AppText("intake.goal.title", table: "Intake", style: .title)
                    .alignment(.center)

                AppText("intake.goal.subtitle", table: "Intake", style: .subheadline)
                    .alignment(.center)
            }
            .padding(.top, AppTheme.Spacing.xxl)
            .padding(.bottom, AppTheme.Spacing.md)
            .padding(.horizontal, AppTheme.Spacing.lg)

            VStack(spacing: AppTheme.Spacing.md) {
                AppTextField(text: $goalDescription, label: "intake.goal.descriptionPlaceholder", table: "Intake", multiline: true)
            }
            .padding(.horizontal, AppTheme.Spacing.lg)

            Spacer()

            AppButton("common.continue", table: "Common", action: onContinue)
                .fullWidth()
                .disabled(!canContinue || isLoading)
                .padding(.horizontal, AppTheme.Spacing.lg)
                .padding(.bottom, AppTheme.Spacing.lg)
        }
        .overlay {
            if isLoading {
                ZStack {
                    Color.black.opacity(0.3)
                        .ignoresSafeArea()
                    ProgressView()
                        .tint(AppTheme.Colors.accent)
                }
            }
        }
    }
}

#Preview {
    GoalSetupView(
        goalDescription: .constant(""),
        isLoading: false,
        onContinue: { }
    )
}
