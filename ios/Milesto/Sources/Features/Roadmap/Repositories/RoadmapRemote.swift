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

    func getCurrentWeek(goalId: String) async throws -> CurrentWeekResponseDTO {
        try await ApiClient.shared.request(
            method: "GET",
            path: "goals/\(goalId)/roadmap/current-week"
        )
    }

    func activateNextMilestone(goalId: String) async throws -> MilestoneDTO {
        return try await ApiClient.shared.request(
            method: "POST",
            path: "goals/\(goalId)/roadmap/activate-next-milestone"
        )
    }

    func getTasks(goalId: String) async throws -> [TaskDTO] {
        return try await ApiClient.shared.request(
            method: "GET",
            path: "goals/\(goalId)/tasks"
        )
    }

    func toggleTask(goalId: String, taskId: String, isCompleted: Bool) async throws -> TaskDTO {
        return try await ApiClient.shared.request(
            method: "PATCH",
            path: "goals/\(goalId)/tasks/\(taskId)",
            body: UpdateTaskRequestDTO(isCompleted: isCompleted)
        )
    }

    func submitDebrief(goalId: String, milestoneId: String, note: String) async throws -> DebriefDTO {
        return try await ApiClient.shared.request(
            method: "POST",
            path: "goals/\(goalId)/debrief",
            body: SubmitDebriefRequestDTO(milestoneId: milestoneId, note: note)
        )
    }

    func getTasksForMilestone(milestoneId: String) async throws -> [TaskDTO] {
        try await ApiClient.shared.request(
            method: "GET",
            path: "milestones/\(milestoneId)/tasks"
        )
    }
}
