import Foundation

@MainActor
final class RoadmapRepository {
    private let remote: RoadmapRemote

    init() {
        remote = RoadmapRemote()
    }

    func fetchRoadmap(goalId: String) async throws -> RoadmapDTO {
        try await remote.getRoadmap(goalId: goalId)
    }

    func fetchRoadmapStatus(goalId: String) async throws -> RoadmapStatus {
        try await remote.getRoadmap(goalId: goalId).status
    }

    func generateRoadmap(goalId: String) async throws {
        _ = try await remote.generateRoadmap(goalId: goalId)
    }

    func tasksForMilestone(milestoneId: String) async throws -> [WeeklyTask] {
        try await remote.getTasksForMilestone(milestoneId: milestoneId)
    }

    func toggleTask(taskId: String, goalId: String, isCompleted: Bool) async throws -> WeeklyTask {
        try await remote.toggleTask(goalId: goalId, taskId: taskId, isCompleted: isCompleted)
    }

    func fetchWeeklyTasks(goalId: String) async throws -> [WeeklyTask] {
        try await remote.getWeeklyTasks(goalId: goalId)
    }

    func fetchWeeklyPlan(goalId: String) async throws -> WeeklyPlan? {
        if let existing = try? await remote.getWeeklyPlan(goalId: goalId) {
            return existing
        }
        return try? await remote.generateWeeklyPlan(goalId: goalId)
    }

    func fetchLatestDebrief(goalId: String) async throws -> Debrief? {
        try await remote.getDebriefHistory(goalId: goalId).first
    }

    func submitDebrief(goalId: String, weeklyPlanId: String, note: String) async throws -> Debrief {
        try await remote.submitDebrief(goalId: goalId, weeklyPlanId: weeklyPlanId, note: note)
    }

    func generateWeeklyPlan(goalId: String) async throws {
        _ = try await remote.generateWeeklyPlan(goalId: goalId)
    }

    func waitForGeneratedTasks(goalId: String) async -> Bool {
        for _ in 0 ..< 30 {
            try? await Task.sleep(for: .seconds(2))
            if let tasks = try? await remote.getWeeklyTasks(goalId: goalId), !tasks.isEmpty {
                return true
            }
        }
        return false
    }

    func sortedTasks(_ tasks: [WeeklyTask]) -> [WeeklyTask] {
        tasks.sorted {
            if $0.isCompleted != $1.isCompleted { return !$0.isCompleted }
            return $0.orderIndex < $1.orderIndex
        }
    }

    func applyOptimisticCompletion(
        task: WeeklyTask,
        isCompleted: Bool,
        in tasks: inout [WeeklyTask]
    ) -> WeeklyTask? {
        guard let index = tasks.firstIndex(where: { $0.id == task.id }) else { return nil }
        let original = tasks[index]
        tasks[index] = original.with(isCompleted: isCompleted)
        return original
    }
}

extension WeeklyTask {
    func with(isCompleted: Bool) -> WeeklyTask {
        WeeklyTask(
            id: id,
            weeklyPlanId: weeklyPlanId,
            goalId: goalId,
            userId: userId,
            title: title,
            description: description,
            estimatedMinutes: estimatedMinutes,
            orderIndex: orderIndex,
            isCompleted: isCompleted,
            createdAt: createdAt
        )
    }
}
