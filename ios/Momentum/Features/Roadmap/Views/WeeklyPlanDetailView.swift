import SwiftUI

struct WeeklyPlanDetailView: View {
    let weekNumber: Int
    let weekStartDate: String
    let focus: String
    let objectives: [String]
    let summary: WeeklySummaryDTO?
    let status: WeeklyPlanStatus

    var body: some View {
        ZStack {
            AnimatedBackground()

            ScrollView(showsIndicators: false) {
                VStack(spacing: 24) {
                    VStack(alignment: .leading, spacing: 4) {
                        AppText(
                            verbatim: String(
                                format: String(localized: "roadmap.weeklyPlan.title", table: "Roadmap"),
                                weekNumber
                            ),
                            style: .largeTitle
                        )

                        AppText(verbatim: weekStartDate, style: .subheadline)
                            .color(AppTheme.Colors.textSecondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)

                    focusCard

                    objectivesCard

                    if status == .completed, let summary {
                        summaryCard(summary)
                    }
                }
                .padding(.horizontal, 24)
                .padding(.top, 24)
                .padding(.bottom, 40)
            }
        }
    }

    private var focusCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) {
                TablerIcon(.target, size: 20, color: AppTheme.Colors.accent)
                AppText("roadmap.weeklyPlan.focus", table: "Roadmap", style: .headline)
            }

            AppText(verbatim: focus, style: .body)
                .color(AppTheme.Colors.textSecondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .glassEffect(.clear, in: RoundedRectangle(cornerRadius: AppTheme.CornerRadius.lg))
    }

    private var objectivesCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            AppText("roadmap.weeklyPlan.objectives", table: "Roadmap", style: .headline)

            ForEach(objectives, id: \.self) { objective in
                HStack(alignment: .top, spacing: 8) {
                    TablerIcon(.listCheck, size: 18, color: AppTheme.Colors.accent)
                    AppText(verbatim: objective, style: .body)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .glassEffect(.clear, in: RoundedRectangle(cornerRadius: AppTheme.CornerRadius.lg))
    }

    private func summaryCard(_ summary: WeeklySummaryDTO) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) {
                TablerIcon(.chartBar, size: 20, color: AppTheme.Colors.accent)
                AppText("roadmap.weeklyPlan.summary", table: "Roadmap", style: .headline)
            }

            ProgressView(value: summary.completionRate)
                .tint(AppTheme.Colors.accent)

            AppText(
                verbatim: String(
                    format: String(localized: "roadmap.weeklyPlan.completion", table: "Roadmap"),
                    summary.objectivesCompleted,
                    summary.objectivesTotal
                ),
                style: .body
            )

            if let narrative = summary.narrative {
                AppText(verbatim: narrative, style: .body)
                    .color(AppTheme.Colors.textSecondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .glassEffect(.clear, in: RoundedRectangle(cornerRadius: AppTheme.CornerRadius.lg))
    }
}

#Preview {
    WeeklyPlanDetailView(
        weekNumber: 3,
        weekStartDate: "24 fev 2026",
        focus: "Augmenter progressivement la distance de course",
        objectives: [
            "Courir 8 km sans pause",
            "Faire 2 seances de renforcement musculaire",
            "Etirer apres chaque seance"
        ],
        summary: WeeklySummaryDTO(
            completionRate: 0.66,
            objectivesCompleted: 2,
            objectivesTotal: 3,
            debriefCount: nil,
            energyDistribution: nil,
            narrative: "Bonne progression cette semaine, l'endurance s'ameliore."
        ),
        status: .completed
    )
}
