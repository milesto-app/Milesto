import SwiftData
import SwiftUI

@Observable
final class HomeViewModel {
    var weeklyPlan: WeeklyPlanDTO?
    var tasks: [WeeklyTaskDTO] = []
    var todayDebrief: DebriefDTO?
    var isLoading = true
    var hasSyncError = false

    var goalId: String = ""
    var modelContext: ModelContext?

    var completedCount: Int {
        tasks.filter(\.isCompleted).count
    }

    var goalProgress: Double {
        guard !tasks.isEmpty else { return 0 }
        let total = tasks.count
        let completed = tasks.filter(\.isCompleted).count
        return total > 0 ? Double(completed) / Double(total) : 0
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

    func configure(goalId: String, modelContext: ModelContext) {
        self.goalId = goalId
        self.modelContext = modelContext
    }

    func resetForGoalChange() {
        tasks = []
        weeklyPlan = nil
        todayDebrief = nil
        isLoading = true
    }

    func applyRemoteToggle(_ updated: WeeklyTaskDTO) {
        if let idx = tasks.firstIndex(where: { $0.id == updated.id }) {
            tasks[idx] = updated
        }
        updateCachedTask(id: updated.id, isCompleted: updated.isCompleted)

        Task {
            do {
                let remote = try await SupabaseRoadmapRepository.shared.toggleTask(
                    goalId: updated.goalId,
                    taskId: updated.id,
                    isCompleted: updated.isCompleted
                )
                if let idx = tasks.firstIndex(where: { $0.id == remote.id }) {
                    tasks[idx] = remote
                }
                updateCachedTask(id: remote.id, isCompleted: remote.isCompleted)
            } catch {
                let reverted = !updated.isCompleted
                if let idx = tasks.firstIndex(where: { $0.id == updated.id }) {
                    let original = tasks[idx]
                    tasks[idx] = WeeklyTaskDTO(
                        id: original.id,
                        weeklyPlanId: original.weeklyPlanId,
                        goalId: original.goalId,
                        userId: original.userId,
                        title: original.title,
                        description: original.description,
                        difficultyRating: original.difficultyRating,
                        orderIndex: original.orderIndex,
                        isCompleted: reverted,
                        isFallback: original.isFallback,
                        createdAt: original.createdAt
                    )
                }
                updateCachedTask(id: updated.id, isCompleted: reverted)
            }
        }
    }

    func toggleTask(_ task: WeeklyTaskDTO) {
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

        updateCachedTask(id: task.id, isCompleted: newCompleted)

        Task {
            do {
                let updated = try await SupabaseRoadmapRepository.shared.toggleTask(
                    goalId: task.goalId,
                    taskId: task.id,
                    isCompleted: newCompleted
                )
                if let idx = tasks.firstIndex(where: { $0.id == updated.id }) {
                    tasks[idx] = updated
                }
                updateCachedTask(id: updated.id, isCompleted: updated.isCompleted)
            } catch {
                if let idx = tasks.firstIndex(where: { $0.id == original.id }) {
                    tasks[idx] = original
                }
                updateCachedTask(id: original.id, isCompleted: original.isCompleted)
            }
        }
    }

    func updateCachedTask(id: String, isCompleted: Bool) {
        guard let modelContext else { return }
        let descriptor = FetchDescriptor<LocalWeeklyTask>(
            predicate: #Predicate { $0.id == id }
        )
        if let local = try? modelContext.fetch(descriptor).first {
            local.isCompleted = isCompleted
            try? modelContext.save()
        }
        notifyTaskCompletionChanged()
    }

    func notifyTaskCompletionChanged() {
        NotificationCenter.default.post(
            name: .weeklyTaskCompletionDidChange,
            object: nil,
            userInfo: ["goalId": goalId]
        )
    }

    func loadAllData() async {
        hasSyncError = false

        let cachedTasks = fetchCachedTasks()
        if !cachedTasks.isEmpty {
            tasks = cachedTasks
            isLoading = false
        }

        if weeklyPlan == nil {
            weeklyPlan = fetchCachedWeeklyPlan()
        }

        if let cached = fetchCachedDebrief() {
            todayDebrief = cached
        }

        var didSync = false

        async let fetchPlan: () = loadWeeklyPlan()
        async let fetchTasks: () = loadTasks()
        _ = await(fetchPlan, fetchTasks)
        didSync = !tasks.isEmpty || weeklyPlan != nil

        if let debriefs = try? await SupabaseRoadmapRepository.shared.getDebriefHistory(goalId: goalId) {
            let latestDebrief = debriefs.first
            todayDebrief = latestDebrief
            syncDebriefToCache(latestDebrief)
        }

        if !didSync, tasks.isEmpty, weeklyPlan == nil {
            hasSyncError = true
        }

        isLoading = false
    }

    func loadWeeklyPlan() async {
        if weeklyPlan == nil {
            weeklyPlan = fetchCachedWeeklyPlan()
        }

        if let existing = try? await SupabaseRoadmapRepository.shared.getWeeklyPlan(goalId: goalId) {
            weeklyPlan = existing
            upsertWeeklyPlanToCache(existing)
            return
        }
        if let generated = try? await SupabaseRoadmapRepository.shared.generateWeeklyPlan(goalId: goalId) {
            weeklyPlan = generated
            upsertWeeklyPlanToCache(generated)
        }
    }

    func loadTasks() async {
        let cachedTasks = fetchCachedTasks()
        if !cachedTasks.isEmpty {
            tasks = cachedTasks
        }

        if let fetched = try? await SupabaseRoadmapRepository.shared.getWeeklyTasks(goalId: goalId) {
            tasks = fetched
            syncTasksToCache(fetched)
        }
    }
}
