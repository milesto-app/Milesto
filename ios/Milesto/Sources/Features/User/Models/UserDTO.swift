import Foundation

struct UserDTO: Codable {
    let userId: String
    let firstName: String?
    let lastName: String?
    let coachId: Int?
    let birthYear: Int?
    let createdAt: Date?

    enum CodingKeys: String, CodingKey {
        case userId = "id"
        case firstName = "first_name"
        case lastName = "last_name"
        case birthYear = "birth_year"
        case coachId = "coach_id"
        case createdAt = "created_at"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let id = try container.decode(UUID.self, forKey: .userId)
        userId = id.uuidString
        firstName = try container.decodeIfPresent(String.self, forKey: .firstName)
        lastName = try container.decodeIfPresent(String.self, forKey: .lastName)
        coachId = try container.decodeIfPresent(Int.self, forKey: .coachId)
        birthYear = try container.decodeIfPresent(Int.self, forKey: .birthYear)

        if let createdAtString = try container.decodeIfPresent(String.self, forKey: .createdAt) {
            let isoFormatter = ISO8601DateFormatter()
            isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            createdAt = isoFormatter.date(from: createdAtString)
        } else {
            createdAt = nil
        }
    }
}

extension UserDTO {
    var isComplete: Bool {
        firstName?.trimmingCharacters(in: .whitespaces).isEmpty == false
            && lastName?.trimmingCharacters(in: .whitespaces).isEmpty == false
            && coachId != nil
    }

    var missingOnboardingSteps: [OnboardingStep] {
        var steps: [OnboardingStep] = []
        if firstName?.trimmingCharacters(in: .whitespaces).isEmpty != false
            || lastName?.trimmingCharacters(in: .whitespaces).isEmpty != false
        {
            steps.append(.name)
        }
        if coachId == nil {
            steps.append(.coach)
        }
        return steps
    }
}
