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
        .popover(
            isPresented: Binding(
                get: { selectedTaskId != nil },
                set: { if !$0 { selectedTaskId = nil } }
            )
        ) {
            if let model {
                if let taskId = selectedTaskId,
                   let task = model.sortedTasks.first(where: { $0.id == taskId })
                {
                    let toggleHandler: ((WeeklyTask) -> Void)? =
                        status == .current ? { task in model.toggleTask(task) } : nil
                    WeeklyTaskDetailView(
                        task: task,
                        weekNumber: nil,
                        onToggle: toggleHandler
                    )
                }
            }
        }
        .onChange(of: model?.tasks.map(\.id) ?? []) { _, ids in
            if let id = selectedTaskId, !ids.contains(id) {
                selectedTaskId = nil
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
                    VStack(spacing: 8) {
                        ForEach(model.sortedTasks) { task in
                            ObjectiveRowView(
                                task: task,
                                onToggle: { model.toggleTask(task) },
                                onOpen: { selectedTaskId = task.id }
                            )
                            .padding(.horizontal, 16)
                            .padding(.vertical, 14)
                            .glassEffect(.regular.interactive(), in: RoundedRectangle(cornerRadius: 16))
                        }
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
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
