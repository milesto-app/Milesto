import SwiftUI

struct IntakeCompletionView: View {
    let onContinue: () -> Void

    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            TablerIcon(.circleCheck, size: 64, color: AppTheme.Colors.success)

            AppText("intake.complete.title", table: "Intake", style: .title)
                .alignment(.center)

            AppText("intake.complete.subtitle", table: "Intake", style: .subheadline)
                .color(AppTheme.Colors.textSecondary)
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
    IntakeCompletionView(onContinue: { })
}
