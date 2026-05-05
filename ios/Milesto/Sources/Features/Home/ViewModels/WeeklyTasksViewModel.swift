import Foundation

@MainActor
@Observable
final class WeeklyTasksViewModel {
    @ObservationIgnored private let repository: RoadmapRepository
    @ObservationIgnored private var goalId: String = ""

    private(set) var tasks: [WeeklyTask] = []
    private(set) var weekNumber: Int?
    private(set) var isLoading = true
    private(set) var hasError = false

    init(repository: RoadmapRepository) {
        self.repository = repository
    }

    var sortedTasks: [WeeklyTask] {
        repository.sortedTasks(tasks)
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
        guard let current = tasks.first(where: { $0.id == task.id }) else { return }
        setTaskCompletion(current, isCompleted: !current.isCompleted)
    }

    private func setTaskCompletion(_ task: WeeklyTask, isCompleted: Bool) {
        guard let original = repository.applyOptimisticCompletion(task: task, isCompleted: isCompleted, in: &tasks) else { return }

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
