import SwiftUI

struct IntakeLoadingView: View {
    var isGeneratingProfile: Bool = false

    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            ProgressView()
                .controlSize(.large)
                .tint(AppTheme.Colors.accent)

            AppText(
                isGeneratingProfile ? "intake.loading.profile" : "intake.loading.questions",
                table: "Intake",
                style: .subheadline
            )
            .color(AppTheme.Colors.textSecondary)
            .alignment(.center)

            Spacer()
        }
        .padding(.horizontal, 24)
    }
}

#Preview("Loading Questions") {
    IntakeLoadingView()
}

#Preview("Generating Profile") {
    IntakeLoadingView(isGeneratingProfile: true)
}
