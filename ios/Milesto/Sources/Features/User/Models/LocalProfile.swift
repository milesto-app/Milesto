import Foundation
import SwiftData

@Model
final class Profile: Decodable {
    @Attribute(.unique) var userId: String
    var firstName: String?
    var lastName: String?
    var email: String?
    var avatarURL: String?
    @Attribute(.externalStorage) var avatarData: Data?
    var coachId: Int?
    var dateOfBirth: Date?
    var language: String?
    var createdAt: Date?

    init(
        userId: String,
        firstName: String? = nil,
        lastName: String? = nil,
        email: String? = nil,
        avatarURL: String? = nil,
        avatarData: Data? = nil,
        coachId: Int? = nil,
        dateOfBirth: Date? = nil,
        language: String? = nil,
        createdAt: Date? = nil
    ) {
        self.userId = userId
        self.firstName = firstName
        self.lastName = lastName
        self.email = email
        self.avatarURL = avatarURL
        self.avatarData = avatarData
        self.coachId = coachId
        self.dateOfBirth = dateOfBirth
        self.language = language
        self.createdAt = createdAt
    }

    enum CodingKeys: String, CodingKey {
        case userId = "id"
        case firstName = "first_name"
        case lastName = "last_name"
        case dateOfBirth = "date_of_birth"
        case coachId = "coach_id"
        case language
        case createdAt = "created_at"
    }

    required convenience init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let id = try container.decode(UUID.self, forKey: .userId)
        let firstName = try container.decodeIfPresent(String.self, forKey: .firstName)
        let lastName = try container.decodeIfPresent(String.self, forKey: .lastName)
        let coachId = try container.decodeIfPresent(Int.self, forKey: .coachId)
        let language = try container.decodeIfPresent(String.self, forKey: .language)

        var dateOfBirth: Date?
        if let dateString = try container.decodeIfPresent(String.self, forKey: .dateOfBirth) {
            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy-MM-dd"
            dateOfBirth = formatter.date(from: dateString)
        }

        var createdAt: Date?
        if let createdAtString = try container.decodeIfPresent(String.self, forKey: .createdAt) {
            let isoFormatter = ISO8601DateFormatter()
            isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            createdAt = isoFormatter.date(from: createdAtString)
        }

        self.init(
            userId: id.uuidString,
            firstName: firstName,
            lastName: lastName,
            coachId: coachId,
            dateOfBirth: dateOfBirth,
            language: language,
            createdAt: createdAt
        )
    }
}

extension Profile {
    var isProfileComplete: Bool {
        firstName?.trimmingCharacters(in: .whitespaces).isEmpty == false
            && lastName?.trimmingCharacters(in: .whitespaces).isEmpty == false
            && dateOfBirth != nil
            && coachId != nil
    }

    var missingOnboardingSteps: [OnboardingStep] {
        var steps: [OnboardingStep] = []
        if firstName?.trimmingCharacters(in: .whitespaces).isEmpty != false
            || lastName?.trimmingCharacters(in: .whitespaces).isEmpty != false
        {
            steps.append(.name)
        }
        if dateOfBirth == nil {
            steps.append(.birthdate)
        }
        if coachId == nil {
            steps.append(.coach)
        }
        return steps
    }
}

typealias LocalProfile = Profile
