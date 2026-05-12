import SwiftUI

struct MilestoneDetailView: View {
    let milestoneId: String
    let title: String
    let description: String
    let expectedOutcome: String
    let status: MilestoneStatus
    let position: Int
    let totalInSection: Int
    let targetWeek: Int
    let targetMonth: Int

    @Environment(AppEnv.self) private var env
    @State private var model: MilestoneDetailViewModel?

    var body: some View {
        ZStack {
            ScrollView(showsIndicators: false) {
                VStack(spacing: 24) {
                    VStack(spacing: 24) {
                        AppText(verbatim: title, style: .largeTitle)
                            .frame(maxWidth: .infinity, alignment: .leading)

                        tagsRow

                        descriptionCard
                        expectedOutcomeCard
                    }
                    .padding(.horizontal, 24)

                    if status != .upcoming, let model {
                        TasksCard(
                            title: "roadmap.milestone.tasks",
                            titleTable: "Roadmap",
                            emptyText: "roadmap.milestone.tasks.empty",
                            emptyTextTable: "Roadmap",
                            tasks: model.sortedTasks,
                            isLoading: model.isLoadingTasks,
                            onToggle: status == .current ? { task in model.toggleTask(task) } : nil
                        )
                    }
                }
                .padding(.top, 24)
                .padding(.bottom, 40)
            }
            .background(Color("BackgroundPrimary"))
        }
        .appBackground()
        .task {
            if model == nil {
                model = MilestoneDetailViewModel(
                    env: env,
                    milestoneId: milestoneId,
                    status: status
                )
            }
            await model?.loadTasks()
        }
    }

    private var tagsRow: some View {
        HStack(spacing: 8) {
            MilestoneStatusBadge(status: status)

            AppPill(
                verbatim: String(
                    format: String(localized: "roadmap.phase.step", table: "Roadmap"),
                    position,
                    totalInSection
                ),
                tint: Color("TextSecondary"),
                icon: .route
            )

            AppText(
                verbatim: targetWeek > 0
                    ? String(format: String(localized: "roadmap.phase.week", table: "Roadmap"), targetWeek)
                    : String(format: String(localized: "roadmap.phase.month", table: "Roadmap"), targetMonth),
                style: .caption
            )
            .color(Color("TextSecondary"))

            Spacer()
        }
    }

    private var descriptionCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            AppText("roadmap.milestone.description", table: "Roadmap", style: .headline)
            AppText(verbatim: description, style: .body)
                .color(Color("TextSecondary"))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var expectedOutcomeCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            AppText("roadmap.milestone.expectedOutcome", table: "Roadmap", style: .headline)
            AppText(verbatim: expectedOutcome, style: .body)
                .color(Color("TextSecondary"))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
