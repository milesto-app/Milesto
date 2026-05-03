import SwiftUI

struct IntakeErrorView: View {
    let message: String
    let onRetry: () -> Void

    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            TablerIcons(.alertTriangle, size: 48, color: Color("Error"))

            AppText("intake.error.title", table: "Intake", style: .title)
                .alignment(.center)

            AppText(verbatim: message, style: .subheadline)
                .color(Color("TextSecondary"))
                .alignment(.center)

            Spacer()

            AppButton("intake.error.retry", table: "Intake", action: onRetry)
                .fullWidth()
                .padding(.bottom, 24)
        }
        .appBackground()
        .padding(.horizontal, 24)
    }
}
