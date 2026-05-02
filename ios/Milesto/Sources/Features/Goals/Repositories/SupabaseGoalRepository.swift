import Foundation
import Supabase

@MainActor
final class SupabaseGoalRepository: RemoteGoalRepository {
    private let client: SupabaseClient
    private let backend: BackendClient

    init(client: SupabaseClient, backend: BackendClient) {
        self.client = client
        self.backend = backend
    }

    func createGoal(description: String) async throws -> RemoteGoal {
        struct Body: Encodable { let description: String }
        return try await backend.request(
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
        try await backend.requestVoid(
            method: "PATCH",
            path: "goals/\(goalId)",
            body: Body(userMotivationQuote: motivationQuote)
        )
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

        try await client
            .from("goals")
            .update(body)
            .eq("id", value: goalId)
            .execute()
    }

    func listGoals() async throws -> [RemoteGoal] {
        try await client
            .from("goals")
            .select()
            .is("deleted_at", value: nil)
            .order("created_at", ascending: false)
            .execute()
            .value
    }
}
