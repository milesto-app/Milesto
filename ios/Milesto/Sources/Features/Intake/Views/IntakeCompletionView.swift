import SwiftUI

struct IntakeCompletionView: View {
    let onContinue: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            Spacer()

            TablerIcons(.circleCheck, size: 64, color: Color("Success"))

            AppText("intake.complete.title", table: "Intake", style: .title)

            AppText("intake.complete.subtitle", table: "Intake", style: .subheadline)
                .color(Color("TextSecondary"))

            Spacer()

            AppButton("intake.complete.action", table: "Intake", action: onContinue)
                .fullWidth()
                .padding(.bottom, 24)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .appBackground()
        .padding(.horizontal, 24)
    }
}
