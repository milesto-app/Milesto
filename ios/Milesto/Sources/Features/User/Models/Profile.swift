import Foundation

struct ProfileDTO: Codable {
    let userId: String
    let firstName: String?
    let lastName: String?
    let coachId: Int?
    let dateOfBirth: Date?
    let language: String?
    let createdAt: Date?

    enum CodingKeys: String, CodingKey {
        case userId = "id"
        case firstName = "first_name"
        case lastName = "last_name"
        case dateOfBirth = "date_of_birth"
        case coachId = "coach_id"
        case language
        case createdAt = "created_at"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let id = try container.decode(UUID.self, forKey: .userId)
        userId = id.uuidString
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
}

struct ProfileSnapshot {
    let firstName: String?
    let lastName: String?
    let email: String?
    let avatarURL: String?
    let coachId: Int?
    let dateOfBirth: Date?
    let createdAt: Date?

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
