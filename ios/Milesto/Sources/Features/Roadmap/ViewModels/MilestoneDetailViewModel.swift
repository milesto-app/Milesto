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

        let original = tasks[index]
        let newCompleted = !task.isCompleted
        let optimistic = original.with(isCompleted: newCompleted)
        tasks[index] = optimistic
        repository.cacheTask(optimistic)

        Task {
            do {
                let updated = try await repository.toggleTask(
                    taskId: task.id,
                    goalId: task.goalId,
                    isCompleted: newCompleted
                )
                if let idx = tasks.firstIndex(where: { $0.id == updated.id }) {
                    tasks[idx] = updated
                }
            } catch {
                if let idx = tasks.firstIndex(where: { $0.id == original.id }) {
                    tasks[idx] = original
                }
                repository.cacheTask(original)
            }
        }
    }

    func applyRemoteToggle(_ updated: WeeklyTask) {
        if let idx = tasks.firstIndex(where: { $0.id == updated.id }) {
            tasks[idx] = updated
        }
        repository.cacheTask(updated)

        Task {
            if let confirmed = try? await repository.toggleTask(
                taskId: updated.id,
                goalId: updated.goalId,
                isCompleted: updated.isCompleted
            ) {
                if let idx = tasks.firstIndex(where: { $0.id == confirmed.id }) {
                    tasks[idx] = confirmed
                }
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
