import SwiftUI

struct MilestoneDetailView: View {
    let milestoneId: String
    let title: String
    let description: String
    let expectedOutcome: String
    let status: MilestoneStatus

    @Environment(AppDependencies.self) private var dependencies
    @State private var model: MilestoneDetailViewModel?
    @State private var selectedTaskId: String?

    var body: some View {
        ZStack {
            ScrollView(showsIndicators: false) {
                VStack(spacing: 24) {
                    HStack(spacing: 8) {
                        MilestoneStatusBadge(status: status)
                        Spacer()
                    }

                    AppText(verbatim: title, style: .largeTitle)
                        .frame(maxWidth: .infinity, alignment: .leading)

                    descriptionCard
                    expectedOutcomeCard

                    if status != .upcoming {
                        tasksSection
                    }
                }
                .padding(.horizontal, 24)
                .padding(.top, 24)
                .padding(.bottom, 40)
            }
            .background(Color("BackgroundBase"))
        }
        .appBackground()
        .task {
            if model == nil {
                model = MilestoneDetailViewModel(
                    repository: dependencies.weeklyTasks,
                    milestoneId: milestoneId,
                    status: status
                )
            }
            await model?.loadTasks()
        }
        .navigationDestination(item: $selectedTaskId) { taskId in
            if let model {
                let ordered = model.sortedTasks.map(\.id)
                if let start = ordered.firstIndex(of: taskId) {
                    let toggleHandler: ((WeeklyTask) -> Void)? =
                        status == .current ? { task in model.toggleTask(task) } : nil
                    WeeklyTaskDetailView(
                        tasks: model.tasks,
                        orderedIds: ordered,
                        startIndex: start,
                        weekNumber: nil,
                        onToggle: toggleHandler
                    )
                }
            }
        }
    }

    private var descriptionCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) {
                TablerIcons(.notebook, size: 20, color: Color("Brand"))
                AppText("roadmap.milestone.description", table: "Roadmap", style: .headline)
            }
            AppText(verbatim: description, style: .body)
                .color(Color("TextSecondary"))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .glassEffect(.regular, in: RoundedRectangle(cornerRadius: 16))
    }

    @ViewBuilder
    private var tasksSection: some View {
        if let model {
            VStack(alignment: .leading, spacing: 12) {
                HStack(spacing: 8) {
                    TablerIcons(.listCheck, size: 20, color: Color("Brand"))
                    AppText("roadmap.milestone.tasks", table: "Roadmap", style: .headline)
                }

                if model.isLoadingTasks {
                    ProgressView()
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                } else if model.tasks.isEmpty {
                    AppText("roadmap.milestone.tasks.empty", table: "Roadmap", style: .subheadline)
                        .color(Color("TextSecondary"))
                } else {
                    VStack(spacing: 4) {
                        ForEach(model.sortedTasks) { task in
                            ObjectiveRowView(
                                task: task,
                                onToggle: { model.toggleTask(task) },
                                onOpen: { selectedTaskId = task.id }
                            )
                            .padding(.vertical, 4)
                        }
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(16)
            .glassEffect(.regular, in: RoundedRectangle(cornerRadius: 16))
        }
    }

    private var expectedOutcomeCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) {
                TablerIcons(.flag, size: 20, color: Color("Brand"))
                AppText("roadmap.milestone.expectedOutcome", table: "Roadmap", style: .headline)
            }
            AppText(verbatim: expectedOutcome, style: .body)
                .color(Color("TextSecondary"))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .glassEffect(.regular, in: RoundedRectangle(cornerRadius: 16))
    }
}
