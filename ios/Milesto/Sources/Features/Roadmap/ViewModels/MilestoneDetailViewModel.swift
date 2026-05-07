import Foundation

@MainActor
@Observable
final class MilestoneDetailViewModel {
    @ObservationIgnored private let env: AppEnv
    @ObservationIgnored private let milestoneId: String
    @ObservationIgnored private let status: MilestoneStatus

    private(set) var tasks: [WeeklyTaskDTO] = []
    private(set) var isLoadingTasks = false

    init(env: AppEnv, milestoneId: String, status: MilestoneStatus) {
        self.env = env
        self.milestoneId = milestoneId
        self.status = status
    }

    var sortedTasks: [WeeklyTaskDTO] {
        env.roadmap.sortedTasks(tasks)
    }

    func loadTasks() async {
        guard status != .upcoming else { return }
        isLoadingTasks = true
        defer { isLoadingTasks = false }
        tasks = (try? await env.roadmap.tasksForMilestone(milestoneId: milestoneId)) ?? []
    }

    func toggleTask(_ task: WeeklyTaskDTO) {
        guard status == .current,
              let index = tasks.firstIndex(where: { $0.id == task.id })
        else { return }

        setTaskCompletion(tasks[index], isCompleted: !tasks[index].isCompleted)
    }

    private func setTaskCompletion(_ task: WeeklyTaskDTO, isCompleted: Bool) {
        guard let original = env.roadmap.applyOptimisticCompletion(task: task, isCompleted: isCompleted, in: &tasks) else { return }

        Task {
            do {
                let updated = try await env.roadmap.toggleTask(
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
            }
        }
    }
}
