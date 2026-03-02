import SwiftUI

struct IntakeErrorView: View {
    let message: String
    let onRetry: () -> Void

    var body: some View {
        VStack(spacing: AppTheme.Spacing.lg) {
            Spacer()

            TablerIcon(.alertTriangle, size: 48, color: AppTheme.Colors.error)

            AppText("intake.error.title", table: "Intake", style: .title)
                .alignment(.center)

            AppText(verbatim: message, style: .subheadline)
                .color(AppTheme.Colors.textSecondary)
                .alignment(.center)

            Spacer()

            AppButton("intake.error.retry", table: "Intake", action: onRetry)
                .fullWidth()
                .padding(.bottom, AppTheme.Spacing.lg)
        }
        .padding(.horizontal, AppTheme.Spacing.lg)
    }
}

#Preview {
    IntakeErrorView(
        message: "Something went wrong. Please try again.",
        onRetry: { }
    )
}
