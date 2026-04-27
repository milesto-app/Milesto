import SwiftUI

struct WeeklyPlanDetailView: View {
    let weekNumber: Int
    let weekStartDate: String
    let objectives: [String]
    let summary: WeeklySummaryDTO?
    let status: WeeklyPlanStatus

    var body: some View {
        ZStack {
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
                            .color(Color("TextSecondary"))
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)

                    tasksCard

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

    private var tasksCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            AppText("roadmap.weeklyPlan.tasks", table: "Roadmap", style: .headline)

            ForEach(objectives, id: \.self) { objective in
                HStack(alignment: .top, spacing: 8) {
                    TablerIcons(.listCheck, size: 18, color: Color("TintPrimary"))
                    AppText(verbatim: objective, style: .body)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .glassEffect(.regular, in: RoundedRectangle(cornerRadius: 16))
    }

    private func summaryCard(_ summary: WeeklySummaryDTO) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) {
                TablerIcons(.chartBar, size: 20, color: Color("TintPrimary"))
                AppText("roadmap.weeklyPlan.summary", table: "Roadmap", style: .headline)
            }

            ProgressView(value: summary.completionRate)
                .tint(Color("TintPrimary"))

            AppText(
                verbatim: String(
                    format: String(localized: "roadmap.weeklyPlan.completion", table: "Roadmap"),
                    summary.tasksCompleted,
                    summary.tasksTotal
                ),
                style: .body
            )

            if let narrative = summary.narrative {
                AppText(verbatim: narrative, style: .body)
                    .color(Color("TextSecondary"))
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .glassEffect(.regular, in: RoundedRectangle(cornerRadius: 16))
    }
}

#Preview {
    WeeklyPlanDetailView(
        weekNumber: 3,
        weekStartDate: "24 fev 2026",
        objectives: [
            "Courir 8 km sans pause",
            "Faire 2 seances de renforcement musculaire",
            "Etirer apres chaque seance",
        ],
        summary: WeeklySummaryDTO(
            completionRate: 0.66,
            tasksCompleted: 2,
            tasksTotal: 3,
            debriefCount: nil,
            narrative: "Bonne progression cette semaine, l'endurance s'ameliore."
        ),
        status: .completed
    )
}
