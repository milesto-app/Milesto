import SwiftUI

struct IntakeLoadingView: View {
    var isGeneratingProfile: Bool = false

    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            ProgressView()
                .controlSize(.large)
                .tint(Color("Brand"))

            AppText(
                isGeneratingProfile ? "intake.loading.profile" : "intake.loading.questions",
                table: "Intake",
                style: .subheadline
            )
            .color(Color("TextSecondary"))
            .alignment(.center)

            Spacer()
        }
        .padding(.horizontal, 24)
    }
}
