import Foundation

@MainActor
@Observable
final class MilestoneDetailViewModel {
    @ObservationIgnored private let repository: any RoadmapFeatureRepository
    @ObservationIgnored private let milestoneId: String
    @ObservationIgnored private let status: MilestoneStatus

    private(set) var tasks: [WeeklyTask] = []
    private(set) var isLoadingTasks = false

    init(repository: any RoadmapFeatureRepository, milestoneId: String, status: MilestoneStatus) {
        self.repository = repository
        self.milestoneId = milestoneId
        self.status = status
    }

    var sortedTasks: [WeeklyTask] {
        tasks.sorted {
            if $0.isCompleted != $1.isCompleted { return !$0.isCompleted }
            let p0 = $0.difficultyRating.priority
            let p1 = $1.difficultyRating.priority
            if p0 != p1 { return p0 < p1 }
            return $0.orderIndex < $1.orderIndex
        }
    }

    func loadTasks() async {
        guard status != .upcoming else { return }
        isLoadingTasks = true
        defer { isLoadingTasks = false }
        tasks = (try? await repository.tasksForMilestone(milestoneId: milestoneId)) ?? []
    }

    func toggleTask(_ task: WeeklyTask) {
        guard status == .current,
              let index = tasks.firstIndex(where: { $0.id == task.id })
        else { return }

        setTaskCompletion(tasks[index], isCompleted: !tasks[index].isCompleted)
    }

    private func setTaskCompletion(_ task: WeeklyTask, isCompleted: Bool) {
        guard let index = tasks.firstIndex(where: { $0.id == task.id }) else { return }
        let original = tasks[index]
        let optimistic = original.with(isCompleted: isCompleted)

        tasks[index] = optimistic
        repository.saveTask(optimistic)

        Task {
            do {
                let updated = try await repository.toggleTask(
                    taskId: original.id,
                    goalId: original.goalId,
                    isCompleted: isCompleted
                )
                if let idx = tasks.firstIndex(where: { $0.id == updated.id }) {
                    tasks[idx] = updated
                }
            } catch {
                if let idx = tasks.firstIndex(where: { $0.id == original.id }) {
                    tasks[idx] = original
                }
                repository.saveTask(original)
            }
        }
    }
}

private extension WeeklyTask {
    func with(isCompleted: Bool) -> WeeklyTask {
        WeeklyTask(
            id: id,
            weeklyPlanId: weeklyPlanId,
            goalId: goalId,
            userId: userId,
            title: title,
            description: description,
            difficultyRating: difficultyRating,
            orderIndex: orderIndex,
            isCompleted: isCompleted,
            isFallback: isFallback,
            createdAt: createdAt
        )
    }
}
