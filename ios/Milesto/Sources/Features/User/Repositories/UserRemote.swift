import Foundation

struct UserUpdateFieldsDTO: Encodable {
    var firstName: String?
    var lastName: String?
    var birthYear: Int?
    var coachId: Int?

    enum CodingKeys: String, CodingKey {
        case firstName = "first_name"
        case lastName = "last_name"
        case birthYear = "birth_year"
        case coachId = "coach_id"
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        if let firstName { try container.encode(firstName, forKey: .firstName) }
        if let lastName { try container.encode(lastName, forKey: .lastName) }
        if let birthYear { try container.encode(birthYear, forKey: .birthYear) }
        if let coachId { try container.encode(coachId, forKey: .coachId) }
    }
}

@MainActor
final class UserRemote {
    init() {}

    func updateUser(_ fields: UserUpdateFieldsDTO) async throws -> UserDTO {
        try await ApiClient.shared.request(
            method: "PATCH",
            path: "me",
            body: fields
        )
    }

    func fetchUser() async throws -> UserDTO? {
        do {
            let user: UserDTO = try await ApiClient.shared.request(
                method: "GET",
                path: "me"
            )
            return user
        } catch ApiError.httpError(statusCode: 404, _) {
            return nil
        }
    }
}
