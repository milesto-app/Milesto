import Foundation
import Supabase

struct ProfileUpdateFields: Encodable {
    var firstName: String?
    var lastName: String?
    var dateOfBirth: String?
    var coachId: Int?
    var language: String?
    var notifPermissionStatus: String?
    var notifEnabled: Bool?
    var notifQuietStart: Int?
    var notifQuietEnd: Int?

    enum CodingKeys: String, CodingKey {
        case firstName = "first_name"
        case lastName = "last_name"
        case dateOfBirth = "date_of_birth"
        case coachId = "coach_id"
        case language
        case notifPermissionStatus = "notif_permission_status"
        case notifEnabled = "notif_enabled"
        case notifQuietStart = "notif_quiet_start"
        case notifQuietEnd = "notif_quiet_end"
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        if let firstName { try container.encode(firstName, forKey: .firstName) }
        if let lastName { try container.encode(lastName, forKey: .lastName) }
        if let dateOfBirth { try container.encode(dateOfBirth, forKey: .dateOfBirth) }
        if let coachId { try container.encode(coachId, forKey: .coachId) }
        if let language { try container.encode(language, forKey: .language) }
        if let notifPermissionStatus { try container.encode(notifPermissionStatus, forKey: .notifPermissionStatus) }
        if let notifEnabled { try container.encode(notifEnabled, forKey: .notifEnabled) }
        if let notifQuietStart { try container.encode(notifQuietStart, forKey: .notifQuietStart) }
        if let notifQuietEnd { try container.encode(notifQuietEnd, forKey: .notifQuietEnd) }
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
        let session = try await Supabase.client.auth.session
        return try await Supabase.client
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

        let response: [ProfileDTO] = try await Supabase.client
            .from("profiles")
            .select()
            .eq("id", value: uuid)
            .execute()
            .value

        return response.first
    }

    func setKindEnabled(kind: String, enabled: Bool) async throws -> NotifPreferences {
        struct Params: Encodable {
            let p_kind: String
            let p_enabled: Bool
        }
        return try await Supabase.client
            .rpc("set_notif_preference_kind_enabled", params: Params(p_kind: kind, p_enabled: enabled))
            .execute()
            .value
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
