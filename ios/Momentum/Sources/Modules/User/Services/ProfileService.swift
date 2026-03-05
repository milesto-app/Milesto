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

enum ProfileUpdateError: LocalizedError {
    case validationFailed(field: String, message: String)
    case serverError(String)

    var errorDescription: String? {
        switch self {
        case let .validationFailed(_, message):
            return message
        case let .serverError(message):
            return message
        }
    }
}

final class ProfileService {
    static let shared = ProfileService()

    private init() {}

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
            throw ProfileServiceError.invalidUserId
        }

        let response: [ProfileDTO] = try await SupabaseConfig.client
            .from("profiles")
            .select()
            .eq("id", value: uuid)
            .execute()
            .value

        return response.first
    }
}

enum ProfileServiceError: LocalizedError {
    case invalidUserId

    var errorDescription: String? {
        switch self {
        case .invalidUserId:
            return "Invalid user ID format"
        }
    }
}
