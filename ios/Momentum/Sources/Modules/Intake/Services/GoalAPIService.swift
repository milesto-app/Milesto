import Foundation

final class GoalAPIService {
    static let shared = GoalAPIService()

    private init() {}

    func createGoal(description: String) async throws -> GoalDTO {
        struct Body: Encodable { let description: String }
        return try await BackendClient.shared.request(
            method: "POST",
            path: "goals",
            body: Body(description: description)
        )
    }

    func getGoal(goalId: String) async throws -> GoalDTO {
        return try await BackendClient.shared.request(
            method: "GET",
            path: "goals/\(goalId)"
        )
    }

    func deleteGoal(goalId: String) async throws {
        try await BackendClient.shared.requestVoid(method: "DELETE", path: "goals/\(goalId)")
    }

    func listGoals() async throws -> [GoalDTO] {
        let response: PaginatedResponse<GoalDTO> = try await BackendClient.shared.request(
            method: "GET",
            path: "goals"
        )
        return response.data
    }
}
