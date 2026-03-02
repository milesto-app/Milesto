import Foundation

final class RoadmapAPIService {
    static let shared = RoadmapAPIService()

    private init() {}

    func generateRoadmap(goalId: String) async throws -> RoadmapDTO {
        return try await BackendClient.shared.request(
            method: "POST",
            path: "goals/\(goalId)/roadmap/generate"
        )
    }

    func getRoadmap(goalId: String) async throws -> RoadmapDTO {
        return try await BackendClient.shared.request(
            method: "GET",
            path: "goals/\(goalId)/roadmap"
        )
    }

    func getMilestones(goalId: String) async throws -> [MilestoneSummaryDTO] {
        return try await BackendClient.shared.request(
            method: "GET",
            path: "goals/\(goalId)/roadmap/milestones"
        )
    }

    func getWeeklyPlan(goalId: String) async throws -> WeeklyPlanDTO? {
        do {
            let plan: WeeklyPlanDTO = try await BackendClient.shared.request(
                method: "GET",
                path: "goals/\(goalId)/roadmap/weekly-plan"
            )
            return plan
        } catch BackendError.httpError(statusCode: let code, _) where code == 404 {
            return nil
        }
    }

    func generateWeeklyPlan(goalId: String) async throws -> WeeklyPlanDTO {
        return try await BackendClient.shared.request(
            method: "POST",
            path: "goals/\(goalId)/roadmap/weekly-plan/generate"
        )
    }

    func submitCheckIn(goalId: String, energyLevel: EnergyLevel, note: String?) async throws -> CheckInDTO {
        return try await BackendClient.shared.request(
            method: "POST",
            path: "goals/\(goalId)/checkin",
            body: SubmitCheckInRequest(energyLevel: energyLevel, note: note)
        )
    }

    func getCheckInHistory(goalId: String) async throws -> [CheckInDTO] {
        return try await BackendClient.shared.request(
            method: "GET",
            path: "goals/\(goalId)/checkin"
        )
    }

    func getDailyObjectives(goalId: String) async throws -> [DailyObjectiveDTO] {
        return try await BackendClient.shared.request(
            method: "GET",
            path: "goals/\(goalId)/daily-objectives"
        )
    }

    func toggleObjective(goalId: String, objectiveId: String, isCompleted: Bool) async throws -> DailyObjectiveDTO {
        return try await BackendClient.shared.request(
            method: "PATCH",
            path: "goals/\(goalId)/daily-objectives/\(objectiveId)",
            body: UpdateObjectiveRequest(isCompleted: isCompleted)
        )
    }

    func submitDebrief(goalId: String, note: String, taskRatings: [TaskRatingDTO]?) async throws -> DebriefDTO {
        return try await BackendClient.shared.request(
            method: "POST",
            path: "goals/\(goalId)/debrief",
            body: SubmitDebriefRequest(note: note, taskRatings: taskRatings)
        )
    }

    func getDebriefHistory(goalId: String) async throws -> [DebriefDTO] {
        return try await BackendClient.shared.request(
            method: "GET",
            path: "goals/\(goalId)/debrief"
        )
    }
}
