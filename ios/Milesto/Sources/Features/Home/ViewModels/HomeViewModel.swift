import Foundation

@MainActor
@Observable
final class HomeViewModel {
    @ObservationIgnored private let repository: any HomeRepository

    private(set) var goalId: String = ""
    private(set) var goalTitle: String = ""
    private(set) var currentMilestoneTitle: String?
    private(set) var weeklyPlan: WeeklyPlanDTO?
    private(set) var tasks: [WeeklyTaskDTO] = []
    private(set) var todayDebrief: DebriefDTO?
    private(set) var isLoading = true
    private(set) var hasSyncError = false

    init(repository: any HomeRepository) {
        self.repository = repository
    }

    var completedCount: Int {
        tasks.filter(\.isCompleted).count
    }

    var goalProgress: Double {
        guard !tasks.isEmpty else { return 0 }
        let completed = tasks.filter(\.isCompleted).count
        return Double(completed) / Double(tasks.count)
    }

    var sortedTasks: [WeeklyTaskDTO] {
        tasks.sorted {
            if $0.isCompleted != $1.isCompleted { return !$0.isCompleted }
            let p0 = $0.difficultyRating.priority
            let p1 = $1.difficultyRating.priority
            if p0 != p1 { return p0 < p1 }
            return $0.orderIndex < $1.orderIndex
        }
    }

    var heroTitle: String {
        currentMilestoneTitle ?? goalTitle
    }

    func configure(goalId: String) {
        self.goalId = goalId
        applySnapshot(repository.loadCachedSnapshot(goalId: goalId))
    }

    func resetForGoalChange() {
        tasks = []
        weeklyPlan = nil
        todayDebrief = nil
        currentMilestoneTitle = nil
        goalTitle = ""
        isLoading = true
        hasSyncError = false
    }

    func loadAllData() async {
        let snapshot = await repository.refreshAll(goalId: goalId)
        applySnapshot(snapshot)
        isLoading = false
    }

    func toggleTask(_ task: WeeklyTaskDTO) {
        guard let index = tasks.firstIndex(where: { $0.id == task.id }) else { return }
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

    func applyRemoteToggle(_ updated: WeeklyTaskDTO) {
        if let idx = tasks.firstIndex(where: { $0.id == updated.id }) {
            tasks[idx] = updated
        }
        repository.cacheTask(updated)

        Task {
            do {
                let confirmed = try await repository.toggleTask(
                    taskId: updated.id,
                    goalId: updated.goalId,
                    isCompleted: updated.isCompleted
                )
                if let idx = tasks.firstIndex(where: { $0.id == confirmed.id }) {
                    tasks[idx] = confirmed
                }
            } catch {
                let reverted = updated.with(isCompleted: !updated.isCompleted)
                if let idx = tasks.firstIndex(where: { $0.id == reverted.id }) {
                    tasks[idx] = reverted
                }
                repository.cacheTask(reverted)
            }
        }
    }

    func markRetryRequested() {
        isLoading = true
    }

    private func applySnapshot(_ snapshot: HomeSnapshot) {
        if let goalTitle = snapshot.goalTitle {
            self.goalTitle = goalTitle
        }
        currentMilestoneTitle = snapshot.currentMilestoneTitle
        if !snapshot.tasks.isEmpty {
            tasks = snapshot.tasks
            isLoading = false
        }
        if let plan = snapshot.weeklyPlan {
            weeklyPlan = plan
        }
        if let debrief = snapshot.todayDebrief {
            todayDebrief = debrief
        }
        hasSyncError = snapshot.hasSyncError
    }
}

private extension WeeklyTaskDTO {
    func with(isCompleted: Bool) -> WeeklyTaskDTO {
        WeeklyTaskDTO(
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
