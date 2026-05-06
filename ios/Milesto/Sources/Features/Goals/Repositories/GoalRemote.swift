import Foundation

@MainActor
final class GoalRemote {
    private let api: ApiClient

    init() {
        api = .shared
    }

    func createGoal(description: String) async throws -> GoalDTO {
        struct Body: Encodable { let description: String }
        return try await api.request(
            method: "POST",
            path: "goals",
            body: Body(description: description)
        )
    }

    func updateGoal(goalId: String, motivationQuote: String?) async throws {
        struct Body: Encodable {
            let userMotivationQuote: String?

            enum CodingKeys: String, CodingKey {
                case userMotivationQuote = "user_motivation_quote"
            }
        }
        try await api.requestVoid(
            method: "PATCH",
            path: "goals/\(goalId)",
            body: Body(userMotivationQuote: motivationQuote)
        )
    }

    func deleteGoal(goalId: String) async throws {
        try await api.requestVoid(
            method: "DELETE",
            path: "goals/\(goalId)"
        )
    }

    func listGoals() async throws -> [GoalDTO] {
        try await api.request(
            method: "GET",
            path: "goals"
        )
    }
}
