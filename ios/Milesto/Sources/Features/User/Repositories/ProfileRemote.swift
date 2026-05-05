import Foundation
import Supabase

struct ProfileUpdateFields: Encodable {
    var firstName: String?
    var lastName: String?
    var dateOfBirth: String?
    var coachId: Int?
    var language: String?

    enum CodingKeys: String, CodingKey {
        case firstName = "first_name"
        case lastName = "last_name"
        case dateOfBirth = "date_of_birth"
        case coachId = "coach_id"
        case language
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        if let firstName { try container.encode(firstName, forKey: .firstName) }
        if let lastName { try container.encode(lastName, forKey: .lastName) }
        if let dateOfBirth { try container.encode(dateOfBirth, forKey: .dateOfBirth) }
        if let coachId { try container.encode(coachId, forKey: .coachId) }
        if let language { try container.encode(language, forKey: .language) }
    }
}

struct ProfileAuthSnapshot {
    let email: String?
    let avatarURL: String?
}

@MainActor
final class ProfileRemote {
    init() {}

    func updateProfile(_ fields: ProfileUpdateFields) async throws -> ProfileDTO {
        let session = try await SupabaseConfig.client.auth.session
        return try await SupabaseConfig.client
            .from("profiles")
            .update(fields)
            .eq("id", value: session.user.id)
            .select()
            .single()
            .execute()
            .value
    }

    func fetchProfile(userId: String) async throws -> ProfileDTO? {
        guard let uuid = UUID(uuidString: userId) else {
            throw ProfileRepositoryError.invalidUserId
        }

        let response: [ProfileDTO] = try await SupabaseConfig.client
            .from("profiles")
            .select()
            .eq("id", value: uuid)
            .execute()
            .value

        return response.first
    }

    func fetchAuthSnapshot() async throws -> ProfileAuthSnapshot {
        let session = try await SupabaseConfig.client.auth.session
        let avatarURL = session.user.userMetadata["avatar_url"]?.stringValue
        return ProfileAuthSnapshot(email: session.user.email, avatarURL: avatarURL)
    }
}

enum ProfileRepositoryError: LocalizedError {
    case invalidUserId

    var errorDescription: String? {
        switch self {
        case .invalidUserId:
            return "Invalid user ID format"
        }
    }
}
