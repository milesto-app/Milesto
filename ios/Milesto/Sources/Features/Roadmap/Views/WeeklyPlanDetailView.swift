import SwiftUI

struct WeeklyPlanDetailView: View {
    let weekNumber: Int
    let weekStartDate: String
    let objectives: [String]
    let summary: WeeklySummary?
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
            .background(Color("BackgroundBase"))
        }
        .appBackground()
    }

    private var tasksCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            AppText("roadmap.weeklyPlan.tasks", table: "Roadmap", style: .headline)

            ForEach(objectives, id: \.self) { objective in
                HStack(alignment: .top, spacing: 8) {
                    TablerIcons(.listCheck, size: 18, color: Color("Brand"))
                    AppText(verbatim: objective, style: .body)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .glassEffect(.regular, in: RoundedRectangle(cornerRadius: 16))
    }

    private func summaryCard(_ summary: WeeklySummary) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) {
                TablerIcons(.chartBar, size: 20, color: Color("Brand"))
                AppText("roadmap.weeklyPlan.summary", table: "Roadmap", style: .headline)
            }

            ProgressView(value: summary.completionRate)
                .tint(Color("Brand"))

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
