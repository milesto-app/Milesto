import SwiftUI

struct IntakeCompletionView: View {
    let onContinue: () -> Void

    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            TablerIcons(.circleCheck, size: 64, color: Colors.success)

            AppText("intake.complete.title", table: "Intake", style: .title)
                .alignment(.center)

            AppText("intake.complete.subtitle", table: "Intake", style: .subheadline)
                .color(Colors.textSecondary)
                .alignment(.center)

            Spacer()

            AppButton("intake.complete.action", table: "Intake", action: onContinue)
                .fullWidth()
                .padding(.bottom, 24)
        }
        .padding(.horizontal, 24)
    }
}

#Preview {
    IntakeCompletionView(onContinue: {})
}
