import Foundation

@MainActor
@Observable
final class WeeklyTasksViewModel {
    @ObservationIgnored private let repository: any RoadmapFeatureRepository
    @ObservationIgnored private var goalId: String = ""

    private(set) var tasks: [WeeklyTask] = []
    private(set) var weekNumber: Int?
    private(set) var isLoading = true
    private(set) var hasError = false

    init(repository: any RoadmapFeatureRepository) {
        self.repository = repository
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

    var completedCount: Int {
        tasks.filter(\.isCompleted).count
    }

    func configure(goalId: String) {
        self.goalId = goalId
        let localTasks = repository.loadWeeklyTasks(goalId: goalId)
        if !localTasks.isEmpty {
            tasks = localTasks
            isLoading = false
        }
        weekNumber = repository.loadWeeklyPlan(goalId: goalId)?.weekNumber
    }

    func refresh() async {
        defer { isLoading = false }
        do {
            tasks = try await repository.refreshWeeklyTasks(goalId: goalId)
            hasError = false
        } catch {
            if tasks.isEmpty { hasError = true }
        }
        if let plan = await repository.refreshWeeklyPlan(goalId: goalId) {
            weekNumber = plan.weekNumber
        }
    }

    func toggle(_ task: WeeklyTask) {
        guard let index = tasks.firstIndex(where: { $0.id == task.id }) else { return }
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
                let confirmed = try await repository.toggleTask(
                    taskId: original.id,
                    goalId: original.goalId,
                    isCompleted: isCompleted
                )
                if let idx = tasks.firstIndex(where: { $0.id == confirmed.id }) {
                    tasks[idx] = confirmed
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
