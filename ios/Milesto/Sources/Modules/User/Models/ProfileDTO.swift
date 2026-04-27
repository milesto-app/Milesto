import Foundation

struct ProfileDTO: Codable {
    let id: UUID
    var firstName: String?
    var lastName: String?
    var dateOfBirth: Date?
    var coachId: Int?
    var language: String?
    var createdAt: Date?

    enum CodingKeys: String, CodingKey {
        case id
        case firstName = "first_name"
        case lastName = "last_name"
        case dateOfBirth = "date_of_birth"
        case coachId = "coach_id"
        case language
        case createdAt = "created_at"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        firstName = try container.decodeIfPresent(String.self, forKey: .firstName)
        lastName = try container.decodeIfPresent(String.self, forKey: .lastName)
        coachId = try container.decodeIfPresent(Int.self, forKey: .coachId)
        language = try container.decodeIfPresent(String.self, forKey: .language)

        if let dateString = try container.decodeIfPresent(String.self, forKey: .dateOfBirth) {
            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy-MM-dd"
            dateOfBirth = formatter.date(from: dateString)
        } else {
            dateOfBirth = nil
        }

        if let createdAtString = try container.decodeIfPresent(String.self, forKey: .createdAt) {
            let isoFormatter = ISO8601DateFormatter()
            isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            createdAt = isoFormatter.date(from: createdAtString)
        } else {
            createdAt = nil
        }
    }

    init(
        id: UUID,
        firstName: String?,
        lastName: String?,
        dateOfBirth: Date?,
        coachId: Int?,
        language: String? = nil,
        createdAt: Date? = nil
    ) {
        self.id = id
        self.firstName = firstName
        self.lastName = lastName
        self.dateOfBirth = dateOfBirth
        self.coachId = coachId
        self.language = language
        self.createdAt = createdAt
    }
}
