import Foundation

@MainActor
@Observable
final class TasksViewModel {
    @ObservationIgnored private let env: AppEnv
    @ObservationIgnored private var goalId: String = ""

    private(set) var tasks: [TaskDTO] = []
    private(set) var isLoading = true
    private(set) var hasError = false

    init(env: AppEnv) {
        self.env = env
    }

    var sortedTasks: [TaskDTO] {
        env.roadmap.sortedTasks(tasks)
    }

    func configure(goalId: String) {
        self.goalId = goalId
    }

    func refresh() async {
        defer { isLoading = false }
        do {
            tasks = try await env.roadmap.fetchTasks(goalId: goalId)
            hasError = false
        } catch {
            if tasks.isEmpty { hasError = true }
        }
    }

    func toggle(_ task: TaskDTO) {
        guard let current = tasks.first(where: { $0.id == task.id }) else { return }
        setTaskCompletion(current, isCompleted: !current.isCompleted)
    }

    private func setTaskCompletion(_ task: TaskDTO, isCompleted: Bool) {
        guard let original = env.roadmap.applyOptimisticCompletion(task: task, isCompleted: isCompleted, in: &tasks) else { return }

        Task {
            do {
                let confirmed = try await env.roadmap.toggleTask(
                    taskId: original.id,
                    goalId: original.goalId,
                    isCompleted: isCompleted
                )
                if let idx = tasks.firstIndex(where: { $0.id == confirmed.id }) {
                    tasks[idx] = confirmed
                }
                NotificationCenter.default.post(name: .tasksDidChange, object: nil)
            } catch {
                if let idx = tasks.firstIndex(where: { $0.id == original.id }) {
                    tasks[idx] = original
                }
            }
        }
    }
}

extension Notification.Name {
    static let tasksDidChange = Notification.Name("tasksDidChange")
}
