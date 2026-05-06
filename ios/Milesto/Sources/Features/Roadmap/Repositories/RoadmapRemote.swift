import Foundation

@MainActor
final class RoadmapRemote {
    init() {}

    func generateRoadmap(goalId: String) async throws -> RoadmapDTO {
        return try await ApiClient.shared.request(
            method: "POST",
            path: "goals/\(goalId)/roadmap/generate"
        )
    }

    func getRoadmap(goalId: String) async throws -> RoadmapDTO {
        try await ApiClient.shared.request(
            method: "GET",
            path: "goals/\(goalId)/roadmap"
        )
    }

    func getWeeklyPlan(goalId: String) async throws -> WeeklyPlan? {
        do {
            let plan: WeeklyPlan = try await ApiClient.shared.request(
                method: "GET",
                path: "goals/\(goalId)/roadmap/weekly-plan"
            )
            return plan
        } catch ApiError.httpError(statusCode: 404, _) {
            return nil
        }
    }

    func generateWeeklyPlan(goalId: String) async throws -> WeeklyPlan {
        return try await ApiClient.shared.request(
            method: "POST",
            path: "goals/\(goalId)/roadmap/weekly-plan/generate"
        )
    }

    func getWeeklyTasks(goalId: String) async throws -> [WeeklyTask] {
        return try await ApiClient.shared.request(
            method: "GET",
            path: "goals/\(goalId)/weekly-tasks"
        )
    }

    func toggleTask(goalId: String, taskId: String, isCompleted: Bool) async throws -> WeeklyTask {
        return try await ApiClient.shared.request(
            method: "PATCH",
            path: "goals/\(goalId)/weekly-tasks/\(taskId)",
            body: UpdateTaskRequest(isCompleted: isCompleted)
        )
    }

    func submitDebrief(goalId: String, weeklyPlanId: String, note: String) async throws -> Debrief {
        return try await ApiClient.shared.request(
            method: "POST",
            path: "goals/\(goalId)/debrief",
            body: SubmitDebriefRequest(weeklyPlanId: weeklyPlanId, note: note)
        )
    }

    func getTasksForMilestone(milestoneId: String) async throws -> [WeeklyTask] {
        try await ApiClient.shared.request(
            method: "GET",
            path: "milestones/\(milestoneId)/tasks"
        )
    }

    func getDebriefHistory(goalId: String) async throws -> [Debrief] {
        try await ApiClient.shared.request(
            method: "GET",
            path: "goals/\(goalId)/debrief"
        )
    }
}
