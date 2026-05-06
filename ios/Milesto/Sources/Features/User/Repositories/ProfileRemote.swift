import Foundation

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
        try await ApiClient.shared.request(
            method: "PATCH",
            path: "me/profile",
            body: fields
        )
    }

    func fetchProfile() async throws -> ProfileDTO? {
        do {
            let profile: ProfileDTO = try await ApiClient.shared.request(
                method: "GET",
                path: "me/profile"
            )
            return profile
        } catch ApiError.httpError(statusCode: 404, _) {
            return nil
        }
    }

    func fetchAuthSnapshot() async throws -> ProfileAuthSnapshot {
        let email = try await AuthSession.userEmail()
        let avatarURL = try await AuthSession.userMetadataString("avatar_url")
        return ProfileAuthSnapshot(email: email, avatarURL: avatarURL)
    }
}
