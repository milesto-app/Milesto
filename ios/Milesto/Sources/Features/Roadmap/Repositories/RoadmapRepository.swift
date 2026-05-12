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

    func tasksForMilestone(milestoneId: String) async throws -> [TaskDTO] {
        try await remote.getTasksForMilestone(milestoneId: milestoneId)
    }

    func toggleTask(taskId: String, goalId: String, isCompleted: Bool) async throws -> TaskDTO {
        try await remote.toggleTask(goalId: goalId, taskId: taskId, isCompleted: isCompleted)
    }

    @discardableResult
    func undoLatestCompletedTask(goalId: String) async throws -> TaskDTO? {
        let tasks = try await remote.getTasks(goalId: goalId)
        let completed = tasks.filter(\.isCompleted)
        let latest = completed.max { lhs, rhs in
            (lhs.completedAt ?? lhs.createdAt) < (rhs.completedAt ?? rhs.createdAt)
        }
        guard let latest else { return nil }
        return try await remote.toggleTask(
            goalId: latest.goalId,
            taskId: latest.id,
            isCompleted: false
        )
    }

    func fetchTasks(goalId: String) async throws -> [TaskDTO] {
        try await remote.getTasks(goalId: goalId)
    }

    func fetchCurrentWeekState(goalId: String) async throws -> CurrentWeekResponseDTO {
        try await remote.getCurrentWeek(goalId: goalId)
    }

    func submitDebrief(goalId: String, milestoneId: String, note: String) async throws -> DebriefDTO {
        try await remote.submitDebrief(goalId: goalId, milestoneId: milestoneId, note: note)
    }

    func activateNextMilestone(goalId: String) async throws {
        _ = try await remote.activateNextMilestone(goalId: goalId)
    }

    func waitForGeneratedTasks(goalId: String) async -> Bool {
        for _ in 0 ..< 30 {
            try? await Task.sleep(for: .seconds(2))
            if let tasks = try? await remote.getTasks(goalId: goalId), !tasks.isEmpty {
                return true
            }
        }
        return false
    }

    func sortedTasks(_ tasks: [TaskDTO]) -> [TaskDTO] {
        tasks.sorted {
            if $0.isCompleted != $1.isCompleted { return !$0.isCompleted }
            return $0.orderIndex < $1.orderIndex
        }
    }

    func applyOptimisticCompletion(
        task: TaskDTO,
        isCompleted: Bool,
        in tasks: inout [TaskDTO]
    ) -> TaskDTO? {
        guard let index = tasks.firstIndex(where: { $0.id == task.id }) else { return nil }
        let original = tasks[index]
        tasks[index] = TaskDTO(
            id: original.id,
            milestoneId: original.milestoneId,
            goalId: original.goalId,
            userId: original.userId,
            title: original.title,
            description: original.description,
            estimatedMinutes: original.estimatedMinutes,
            orderIndex: original.orderIndex,
            isCompleted: isCompleted,
            completedAt: isCompleted ? ISO8601DateFormatter().string(from: Date()) : nil,
            createdAt: original.createdAt
        )
        return original
    }
}
