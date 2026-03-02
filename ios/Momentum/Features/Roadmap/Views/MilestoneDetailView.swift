import SwiftUI

struct MilestoneDetailView: View {
    let title: String
    let description: String
    let expectedOutcome: String
    let targetMonth: Int
    let status: MilestoneStatus

    var body: some View {
        ZStack {
            AnimatedBackground()

            ScrollView(showsIndicators: false) {
                VStack(spacing: AppTheme.Spacing.lg) {
                    MilestoneStatusBadge(status: status)

                    AppText(verbatim: title, style: .largeTitle)
                        .frame(maxWidth: .infinity, alignment: .leading)

                    descriptionCard

                    expectedOutcomeCard

                    targetCard
                }
                .padding(.horizontal, AppTheme.Spacing.lg)
                .padding(.top, AppTheme.Spacing.lg)
                .padding(.bottom, AppTheme.Spacing.xxl)
            }
        }
    }

    private var descriptionCard: some View {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.sm) {
            HStack(spacing: AppTheme.Spacing.xs) {
                TablerIcon(.notebook, size: 20, color: AppTheme.Colors.accent)
                AppText("roadmap.milestone.description", table: "Roadmap", style: .headline)
            }

            AppText(verbatim: description, style: .body)
                .color(AppTheme.Colors.textSecondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(AppTheme.Spacing.md)
        .glassEffect(.clear, in: RoundedRectangle(cornerRadius: AppTheme.CornerRadius.lg))
    }

    private var expectedOutcomeCard: some View {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.sm) {
            HStack(spacing: AppTheme.Spacing.xs) {
                TablerIcon(.flag, size: 20, color: AppTheme.Colors.accent)
                AppText("roadmap.milestone.expectedOutcome", table: "Roadmap", style: .headline)
            }

            AppText(verbatim: expectedOutcome, style: .body)
                .color(AppTheme.Colors.textSecondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(AppTheme.Spacing.md)
        .glassEffect(.clear, in: RoundedRectangle(cornerRadius: AppTheme.CornerRadius.lg))
    }

    private var targetCard: some View {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.sm) {
            HStack(spacing: AppTheme.Spacing.xs) {
                TablerIcon(.calendar, size: 20, color: AppTheme.Colors.accent)
                AppText("roadmap.milestone.target", table: "Roadmap", style: .headline)
            }

            AppText(
                verbatim: String(
                    format: String(localized: "roadmap.milestone.targetMonth", table: "Roadmap"),
                    targetMonth
                ),
                style: .body
            )
            .color(AppTheme.Colors.accent)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(AppTheme.Spacing.md)
        .glassEffect(.clear, in: RoundedRectangle(cornerRadius: AppTheme.CornerRadius.lg))
    }
}

#Preview {
    MilestoneDetailView(
        title: "Courir un semi-marathon",
        description: "Completez 21,1 km en course a pied sans vous arreter. Cela demande un entrainement regulier et progressif.",
        expectedOutcome: "Etre capable de courir 21,1 km en moins de 2h30",
        targetMonth: 3,
        status: .current
    )
}
