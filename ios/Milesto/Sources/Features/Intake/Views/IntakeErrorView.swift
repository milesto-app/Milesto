import SwiftUI

struct IntakeErrorView: View {
    let message: String
    let onRetry: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            Spacer()

            TablerIcons(.alertTriangle, size: 48, color: Color("Error"))

            AppText("intake.error.title", table: "Intake", style: .title)

            AppText(verbatim: message, style: .subheadline)
                .color(Color("TextSecondary"))

            Spacer()

            AppButton("intake.error.retry", table: "Intake", action: onRetry)
                .fullWidth()
                .padding(.bottom, 24)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .appBackground()
        .padding(.horizontal, 24)
    }
}
