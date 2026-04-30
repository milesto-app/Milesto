import Foundation

@MainActor
final class RoadmapBackedHomeRemote: HomeRemoteRepository {
    private let underlying: any RoadmapRepository

    init(_ underlying: any RoadmapRepository) {
        self.underlying = underlying
    }

    func getWeeklyPlan(goalId: String) async throws -> WeeklyPlan? {
        try await underlying.getWeeklyPlan(goalId: goalId)
    }

    func generateWeeklyPlan(goalId: String) async throws -> WeeklyPlan {
        try await underlying.generateWeeklyPlan(goalId: goalId)
    }

    func getWeeklyTasks(goalId: String) async throws -> [WeeklyTask] {
        try await underlying.getWeeklyTasks(goalId: goalId)
    }

    func toggleTask(goalId: String, taskId: String, isCompleted: Bool) async throws -> WeeklyTask {
        try await underlying.toggleTask(goalId: goalId, taskId: taskId, isCompleted: isCompleted)
    }

    func getDebriefHistory(goalId: String) async throws -> [Debrief] {
        try await underlying.getDebriefHistory(goalId: goalId)
    }

    func submitDebrief(goalId: String, weeklyPlanId: String, note: String, taskRatings: [TaskRating]?) async throws -> Debrief {
        try await underlying.submitDebrief(goalId: goalId, weeklyPlanId: weeklyPlanId, note: note, taskRatings: taskRatings)
    }
}
