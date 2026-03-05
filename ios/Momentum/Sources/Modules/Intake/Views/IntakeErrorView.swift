import SwiftUI

struct IntakeErrorView: View {
    let message: String
    let onRetry: () -> Void

    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            TablerIcons(.alertTriangle, size: 48, color: Colors.error)

            AppText("intake.error.title", table: "Intake", style: .title)
                .alignment(.center)

            AppText(verbatim: message, style: .subheadline)
                .color(Colors.textSecondary)
                .alignment(.center)

            Spacer()

            AppButton("intake.error.retry", table: "Intake", action: onRetry)
                .fullWidth()
                .padding(.bottom, 24)
        }
        .padding(.horizontal, 24)
    }
}

#Preview {
    IntakeErrorView(
        message: "Something went wrong. Please try again.",
        onRetry: {}
    )
}
