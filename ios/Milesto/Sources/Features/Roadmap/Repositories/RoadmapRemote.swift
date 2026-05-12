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

    func getWeeklyPlan(goalId: String) async throws -> WeeklyPlanResponseDTO {
        try await ApiClient.shared.request(
            method: "GET",
            path: "goals/\(goalId)/roadmap/weekly-plan"
        )
    }

    func generateWeeklyPlan(goalId: String) async throws -> WeeklyPlanDTO {
        return try await ApiClient.shared.request(
            method: "POST",
            path: "goals/\(goalId)/roadmap/weekly-plan/generate"
        )
    }

    func getWeeklyTasks(goalId: String) async throws -> [WeeklyTaskDTO] {
        return try await ApiClient.shared.request(
            method: "GET",
            path: "goals/\(goalId)/weekly-tasks"
        )
    }

    func toggleTask(goalId: String, taskId: String, isCompleted: Bool) async throws -> WeeklyTaskDTO {
        return try await ApiClient.shared.request(
            method: "PATCH",
            path: "goals/\(goalId)/weekly-tasks/\(taskId)",
            body: UpdateTaskRequestDTO(isCompleted: isCompleted)
        )
    }

    func submitDebrief(goalId: String, weeklyPlanId: String, note: String) async throws -> DebriefDTO {
        return try await ApiClient.shared.request(
            method: "POST",
            path: "goals/\(goalId)/debrief",
            body: SubmitDebriefRequestDTO(weeklyPlanId: weeklyPlanId, note: note)
        )
    }

    func getTasksForMilestone(milestoneId: String) async throws -> [WeeklyTaskDTO] {
        try await ApiClient.shared.request(
            method: "GET",
            path: "milestones/\(milestoneId)/tasks"
        )
    }

    func getDebriefHistory(goalId: String) async throws -> [DebriefDTO] {
        try await ApiClient.shared.request(
            method: "GET",
            path: "goals/\(goalId)/debrief"
        )
    }
}
