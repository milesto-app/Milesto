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

    func tasksForMilestone(milestoneId: String) async throws -> [WeeklyTaskDTO] {
        try await remote.getTasksForMilestone(milestoneId: milestoneId)
    }

    func toggleTask(taskId: String, goalId: String, isCompleted: Bool) async throws -> WeeklyTaskDTO {
        try await remote.toggleTask(goalId: goalId, taskId: taskId, isCompleted: isCompleted)
    }

    func fetchWeeklyTasks(goalId: String) async throws -> [WeeklyTaskDTO] {
        try await remote.getWeeklyTasks(goalId: goalId)
    }

    func fetchWeeklyPlanState(goalId: String) async throws -> WeeklyPlanResponseDTO {
        try await remote.getWeeklyPlan(goalId: goalId)
    }

    func fetchWeeklyPlan(goalId: String) async throws -> WeeklyPlanDTO? {
        let response = try await remote.getWeeklyPlan(goalId: goalId)
        if let existing = response.plan, existing.status == .active {
            return existing
        }
        if response.weekState == .inAdvance {
            return response.plan
        }
        return try? await remote.generateWeeklyPlan(goalId: goalId)
    }

    func fetchLatestDebrief(goalId: String) async throws -> DebriefDTO? {
        try await remote.getDebriefHistory(goalId: goalId).first
    }

    func submitDebrief(goalId: String, weeklyPlanId: String, note: String) async throws -> DebriefDTO {
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

    func sortedTasks(_ tasks: [WeeklyTaskDTO]) -> [WeeklyTaskDTO] {
        tasks.sorted {
            if $0.isCompleted != $1.isCompleted { return !$0.isCompleted }
            return $0.orderIndex < $1.orderIndex
        }
    }

    func applyOptimisticCompletion(
        task: WeeklyTaskDTO,
        isCompleted: Bool,
        in tasks: inout [WeeklyTaskDTO]
    ) -> WeeklyTaskDTO? {
        guard let index = tasks.firstIndex(where: { $0.id == task.id }) else { return nil }
        let original = tasks[index]
        tasks[index] = WeeklyTaskDTO(
            id: original.id,
            weeklyPlanId: original.weeklyPlanId,
            goalId: original.goalId,
            userId: original.userId,
            title: original.title,
            description: original.description,
            estimatedMinutes: original.estimatedMinutes,
            orderIndex: original.orderIndex,
            isCompleted: isCompleted,
            createdAt: original.createdAt
        )
        return original
    }
}
