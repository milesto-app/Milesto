import SwiftUI

struct OnboardingGoalDescriptionView: View {
    @Binding var goalDescription: String
    let onContinue: () -> Void

    @FocusState private var isFocused: Bool

    private var canContinue: Bool {
        !goalDescription.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    var body: some View {
        VStack(spacing: 24) {
            VStack(spacing: 8) {
                AppText("onboarding.goal.title", table: "Onboarding", style: .title)
                    .alignment(.center)

                AppText("onboarding.goal.subtitle", table: "Onboarding", style: .subheadline)
            }
            .padding(.top, 40)
            .padding(.bottom, 16)
            .padding(.horizontal, 24)

            ZStack(alignment: .topLeading) {
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color("BackgroundElevated"))

                RoundedRectangle(cornerRadius: 12)
                    .stroke(
                        isFocused ? Color("Brand") : Color("TextSecondary").opacity(0.2),
                        lineWidth: 2
                    )

                if goalDescription.isEmpty && !isFocused {
                    AppText("onboarding.goal.placeholder", table: "Onboarding", style: .body)
                        .color(Color("TextSecondary"))
                        .padding(16)
                }

                TextEditor(text: $goalDescription)
                    .focused($isFocused)
                    .scrollContentBackground(.hidden)
                    .padding(12)
            }
            .frame(height: 150)
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
        .appBackground()
    }
}
