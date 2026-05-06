import Foundation

@MainActor
@Observable
final class WeeklyTasksViewModel {
    @ObservationIgnored private let repository: RoadmapRepository
    @ObservationIgnored private var goalId: String = ""

    private(set) var tasks: [WeeklyTaskDTO] = []
    private(set) var weekNumber: Int?
    private(set) var isLoading = true
    private(set) var hasError = false

    init(repository: RoadmapRepository) {
        self.repository = repository
    }

    var sortedTasks: [WeeklyTaskDTO] {
        repository.sortedTasks(tasks)
    }

    func configure(goalId: String) {
        self.goalId = goalId
    }

    func refresh() async {
        defer { isLoading = false }
        do {
            tasks = try await repository.fetchWeeklyTasks(goalId: goalId)
            hasError = false
        } catch {
            if tasks.isEmpty { hasError = true }
        }
        if let plan = try? await repository.fetchWeeklyPlan(goalId: goalId) {
            weekNumber = plan.weekNumber
        }
    }

    func toggle(_ task: WeeklyTaskDTO) {
        guard let current = tasks.first(where: { $0.id == task.id }) else { return }
        setTaskCompletion(current, isCompleted: !current.isCompleted)
    }

    private func setTaskCompletion(_ task: WeeklyTaskDTO, isCompleted: Bool) {
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
            }
        }
    }
}
