import SwiftUI

struct DebriefPromptCard: View {
    let onTap: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.md) {
            TablerIcon(.moonStars, size: 28, color: AppTheme.Colors.accent)

            AppText("home.debrief.prompt.title", table: "Home", style: .headline)

            AppText("home.debrief.prompt.subtitle", table: "Home", style: .subheadline)
                .color(AppTheme.Colors.textSecondary)

            AppButton("home.debrief.prompt.action", table: "Home", style: .secondary, action: onTap)
                .fullWidth()
        }
        .padding(AppTheme.Spacing.lg)
        .glassEffect(.clear.interactive(), in: RoundedRectangle(cornerRadius: AppTheme.CornerRadius.xl))
    }
}
