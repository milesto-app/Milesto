import SwiftUI

struct MilestoneDetailView: View {
    let milestoneId: String
    let title: String
    let description: String
    let expectedOutcome: String
    let isMonthlyCheckpoint: Bool
    let status: MilestoneStatus

    @State private var tasks: [WeeklyTaskDTO] = []
    @State private var isLoadingTasks = false
    @State private var selectedTaskId: String?

    var body: some View {
        ZStack {
            ScrollView(showsIndicators: false) {
                VStack(spacing: 24) {
                    HStack(spacing: 8) {
                        MilestoneStatusBadge(status: status)

                        if isMonthlyCheckpoint {
                            AppText("roadmap.milestone.monthlyCheckpoint", table: "Roadmap", style: .caption)
                                .weight(.semibold)
                                .color(Color("TintPrimary"))
                                .padding(.horizontal, 10)
                                .padding(.vertical, 4)
                                .background(
                                    Capsule()
                                        .fill(Color("TintPrimary").opacity(0.15))
                                )
                        }

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
        }
        .task {
            guard status != .upcoming else { return }
            isLoadingTasks = true
            tasks = (try? await RoadmapAPIService.shared.getTasksForMilestone(milestoneId: milestoneId)) ?? []
            isLoadingTasks = false
        }
        .navigationDestination(item: $selectedTaskId) { taskId in
            let ordered = sortedTasks.map(\.id)
            if let start = ordered.firstIndex(of: taskId) {
                let toggleHandler: ((WeeklyTaskDTO) -> Void)? =
                    status == .current ? { updated in applyToggle(updated) } : nil
                WeeklyTaskDetailView(
                    tasks: tasks,
                    orderedIds: ordered,
                    startIndex: start,
                    weekNumber: nil,
                    onToggle: toggleHandler
                )
            }
        }
    }

    private func applyToggle(_ updated: WeeklyTaskDTO) {
        if let idx = tasks.firstIndex(where: { $0.id == updated.id }) {
            tasks[idx] = updated
        }
        Task {
            _ = try? await RoadmapAPIService.shared.toggleTask(
                taskId: updated.id,
                isCompleted: updated.isCompleted
            )
        }
    }

    private var descriptionCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) {
                TablerIcons(.notebook, size: 20, color: Color("TintPrimary"))
                AppText("roadmap.milestone.description", table: "Roadmap", style: .headline)
            }

            AppText(verbatim: description, style: .body)
                .color(Color("TextSecondary"))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .glassEffect(.regular, in: RoundedRectangle(cornerRadius: 16))
    }

    private var tasksSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) {
                TablerIcons(.listCheck, size: 20, color: Color("TintPrimary"))
                AppText("roadmap.milestone.tasks", table: "Roadmap", style: .headline)
            }

            if isLoadingTasks {
                ProgressView()
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
            } else if tasks.isEmpty {
                AppText("roadmap.milestone.tasks.empty", table: "Roadmap", style: .subheadline)
                    .color(Color("TextSecondary"))
            } else {
                VStack(spacing: 4) {
                    ForEach(sortedTasks) { task in
                        ObjectiveRowView(
                            task: task,
                            onToggle: {
                                guard status == .current else { return }
                                toggleTask(task)
                            },
                            onOpen: {
                                selectedTaskId = task.id
                            }
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

    private var sortedTasks: [WeeklyTaskDTO] {
        tasks.sorted {
            if $0.isCompleted != $1.isCompleted { return !$0.isCompleted }
            let p0 = $0.difficultyRating.priority
            let p1 = $1.difficultyRating.priority
            if p0 != p1 { return p0 < p1 }
            return $0.orderIndex < $1.orderIndex
        }
    }

    private func toggleTask(_ task: WeeklyTaskDTO) {
        guard let index = tasks.firstIndex(where: { $0.id == task.id }) else { return }
        let newCompleted = !task.isCompleted
        let original = tasks[index]
        tasks[index] = WeeklyTaskDTO(
            id: original.id,
            weeklyPlanId: original.weeklyPlanId,
            goalId: original.goalId,
            userId: original.userId,
            title: original.title,
            description: original.description,
            difficultyRating: original.difficultyRating,
            orderIndex: original.orderIndex,
            isCompleted: newCompleted,
            isFallback: original.isFallback,
            createdAt: original.createdAt
        )
        Task {
            _ = try? await RoadmapAPIService.shared.toggleTask(taskId: task.id, isCompleted: newCompleted)
        }
    }

    private var expectedOutcomeCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) {
                TablerIcons(.flag, size: 20, color: Color("TintPrimary"))
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

#Preview {
    MilestoneDetailView(
        milestoneId: "preview-id",
        title: "Courir un semi-marathon",
        description: "Completez 21,1 km en course a pied sans vous arreter. Cela demande un entrainement regulier et progressif.",
        expectedOutcome: "Etre capable de courir 21,1 km en moins de 2h30",
        isMonthlyCheckpoint: true,
        status: .current
    )
}
