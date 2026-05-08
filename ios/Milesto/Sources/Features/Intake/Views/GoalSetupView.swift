import SwiftUI

struct GoalSetupView: View {
    @Binding var goalDescription: String
    let isLoading: Bool
    let onContinue: () -> Void

    private var canContinue: Bool {
        !goalDescription.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            VStack(alignment: .leading, spacing: 8) {
                AppText("intake.goal.title", table: "Intake", style: .title)

                AppText("intake.goal.subtitle", table: "Intake", style: .subheadline)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.top, 8)
            .padding(.bottom, 16)
            .padding(.leading, 24)
            .padding(.trailing, 76)

            IntakeTextField(
                text: $goalDescription,
                placeholder: "intake.goal.descriptionPlaceholder",
                table: "Intake",
                multiline: true
            )
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
                ProgressView()
                    .controlSize(.large)
                    .tint(Color("Brand"))
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(.regularMaterial)
                    .ignoresSafeArea()
                    .transition(.opacity)
            }
        }
        .animation(.easeInOut(duration: 0.25), value: isLoading)
        .appBackground()
    }
}
