import Foundation
import Supabase

@MainActor
final class GoalRemote: SyncableRemote {
    private let client: SupabaseClient
    private let api: ApiClient

    init() {
        client = SupabaseConfig.client
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

    func listGoals() async throws -> [GoalDTO] {
        try await client
            .from("goals")
            .select()
            .is("deleted_at", value: nil)
            .order("created_at", ascending: false)
            .execute()
            .value
    }

    func fetchAll() async throws -> [GoalDTO] {
        try await listGoals()
    }

    func upsert(_ dto: GoalDTO) async throws -> GoalDTO {
        struct Body: Encodable {
            let title: String
            let description: String
            let status: String
            let targetDate: String?
            let updatedAt: String

            enum CodingKeys: String, CodingKey {
                case title
                case description
                case status
                case targetDate = "target_date"
                case updatedAt = "updated_at"
            }
        }

        let dateFormatter = DateFormatter()
        dateFormatter.calendar = Calendar(identifier: .gregorian)
        dateFormatter.locale = Locale(identifier: "en_US_POSIX")
        dateFormatter.timeZone = TimeZone(secondsFromGMT: 0)
        dateFormatter.dateFormat = "yyyy-MM-dd"

        return try await client
            .from("goals")
            .update(Body(
                title: dto.title,
                description: dto.description,
                status: dto.status.rawValue,
                targetDate: dto.targetDate.map(dateFormatter.string(from:)),
                updatedAt: ISO8601DateFormatter().string(from: dto.updatedAt)
            ))
            .eq("id", value: dto.id)
            .select()
            .single()
            .execute()
            .value
    }

    func delete(id: String) async throws {
        try await deleteGoal(goalId: id)
    }
}
