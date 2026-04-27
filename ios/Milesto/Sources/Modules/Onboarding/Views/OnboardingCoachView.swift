import SwiftUI

struct OnboardingCoachView: View {
    @Binding var selectedCoach: CoachPersonality?
    let onContinue: () -> Void

    var body: some View {
        VStack(spacing: 24) {
            VStack(spacing: 8) {
                AppText("onboarding.coach.title", table: "Onboarding", style: .title)
                    .alignment(.center)

                AppText("onboarding.coach.subtitle", table: "Onboarding", style: .subheadline)
            }
            .padding(.top, 40)
            .padding(.bottom, 16)
            .padding(.horizontal, 24)

            VStack(spacing: 12) {
                ForEach(CoachPersonality.allCases) { personality in
                    CoachCard(
                        personality: personality,
                        isSelected: selectedCoach == personality,
                        onSelect: { selectedCoach = personality }
                    )
                }
            }
            .padding(.horizontal, 24)

            Spacer()

            VStack(spacing: 16) {
                AppButton("common.continue", table: "Common", action: onContinue)
                    .fullWidth()
                    .disabled(selectedCoach == nil)

                AppText("onboarding.editLater", table: "Onboarding", style: .caption)
                    .alignment(.center)
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 24)
        }
    }
}

#Preview {
    NavigationStack {
        OnboardingCoachView(
            selectedCoach: .constant(nil),
            onContinue: {}
        )
    }
}
