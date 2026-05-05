import Foundation

@MainActor
@Observable
final class MilestoneDetailViewModel {
    @ObservationIgnored private let repository: RoadmapRepository
    @ObservationIgnored private let milestoneId: String
    @ObservationIgnored private let status: MilestoneStatus

    private(set) var tasks: [WeeklyTask] = []
    private(set) var isLoadingTasks = false

    init(repository: RoadmapRepository, milestoneId: String, status: MilestoneStatus) {
        self.repository = repository
        self.milestoneId = milestoneId
        self.status = status
    }

    var sortedTasks: [WeeklyTask] {
        repository.sortedTasks(tasks)
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
        guard let original = repository.applyOptimisticCompletion(task: task, isCompleted: isCompleted, in: &tasks) else { return }

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
