import SwiftUI

struct GoalSetupView: View {
    @Binding var goalDescription: String
    let isLoading: Bool
    let onContinue: () -> Void

    private var canContinue: Bool {
        !goalDescription.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    var body: some View {
        VStack(spacing: 24) {
            VStack(spacing: 8) {
                AppText("intake.goal.title", table: "Intake", style: .title)
                    .alignment(.center)

                AppText("intake.goal.subtitle", table: "Intake", style: .subheadline)
                    .alignment(.center)
            }
            .padding(.top, 40)
            .padding(.bottom, 16)
            .padding(.horizontal, 24)

            VStack(spacing: 16) {
                AppTextField(text: $goalDescription, label: "intake.goal.descriptionPlaceholder", table: "Intake", multiline: true)
            }
            .padding(.horizontal, 24)

            Spacer()

            AppButton("common.continue", table: "Common", action: onContinue)
                .fullWidth()
                .disabled(!canContinue || isLoading)
                .padding(.horizontal, 24)
                .padding(.bottom, 24)
        }
        .overlay {
            if isLoading {
                ZStack {
                    Color.black.opacity(0.3)
                        .ignoresSafeArea()
                    ProgressView()
                        .tint(Colors.accent)
                }
            }
        }
    }
}

#Preview {
    GoalSetupView(
        goalDescription: .constant(""),
        isLoading: false,
        onContinue: {}
    )
}
