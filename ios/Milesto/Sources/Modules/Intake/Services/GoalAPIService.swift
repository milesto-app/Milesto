import Foundation
import Supabase

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

    func updateGoal(goalId: String, motivationQuote: String?) async throws {
        struct Body: Encodable {
            let userMotivationQuote: String?

            enum CodingKeys: String, CodingKey {
                case userMotivationQuote = "user_motivation_quote"
            }
        }
        try await BackendClient.shared.requestVoid(
            method: "PATCH",
            path: "goals/\(goalId)",
            body: Body(userMotivationQuote: motivationQuote)
        )
    }

    func getGoal(goalId: String) async throws -> GoalDTO {
        try await Supabase.client
            .from("goals")
            .select()
            .eq("id", value: goalId)
            .is("deleted_at", value: nil)
            .single()
            .execute()
            .value
    }

    func deleteGoal(goalId: String) async throws {
        struct SoftDeleteBody: Encodable {
            let deletedAt: String
            let updatedAt: String

            enum CodingKeys: String, CodingKey {
                case deletedAt = "deleted_at"
                case updatedAt = "updated_at"
            }
        }

        let now = ISO8601DateFormatter().string(from: Date())
        let body = SoftDeleteBody(deletedAt: now, updatedAt: now)

        try await Supabase.client
            .from("goals")
            .update(body)
            .eq("id", value: goalId)
            .execute()
    }

    func listGoals() async throws -> [GoalDTO] {
        try await Supabase.client
            .from("goals")
            .select()
            .is("deleted_at", value: nil)
            .order("created_at", ascending: false)
            .execute()
            .value
    }
}
