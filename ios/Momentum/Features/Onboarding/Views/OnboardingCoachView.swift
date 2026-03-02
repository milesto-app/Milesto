import SwiftUI

struct OnboardingCoachView: View {
    @Binding var selectedCoach: CoachPersonality?
    let onContinue: () -> Void

    var body: some View {
        VStack(spacing: AppTheme.Spacing.lg) {
            VStack(spacing: AppTheme.Spacing.xs) {
                AppText("onboarding.coach.title", table: "Onboarding", style: .title)
                    .alignment(.center)

                AppText("onboarding.coach.subtitle", table: "Onboarding", style: .subheadline)
            }
            .padding(.top, AppTheme.Spacing.xxl)
            .padding(.bottom, AppTheme.Spacing.md)
            .padding(.horizontal, AppTheme.Spacing.lg)

            VStack(spacing: AppTheme.Spacing.sm) {
                ForEach(CoachPersonality.allCases) { personality in
                    CoachCard(
                        personality: personality,
                        isSelected: selectedCoach == personality,
                        onSelect: { selectedCoach = personality }
                    )
                }
            }
            .padding(.horizontal, AppTheme.Spacing.lg)

            Spacer()

            VStack(spacing: AppTheme.Spacing.md) {
                AppButton("common.continue", table: "Common", action: onContinue)
                    .fullWidth()
                    .disabled(selectedCoach == nil)

                AppText("onboarding.editLater", table: "Onboarding", style: .caption)
                    .alignment(.center)
            }
            .padding(.bottom, AppTheme.Spacing.lg)
        }
    }
}

#Preview {
    NavigationStack {
        OnboardingCoachView(
            selectedCoach: .constant(nil),
            onContinue: { }
        )
    }
}
