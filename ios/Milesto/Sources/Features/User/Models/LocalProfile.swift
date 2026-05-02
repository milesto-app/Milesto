import Foundation
import SwiftData

@Model
final class LocalProfile {
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

    var snapshot: ProfileSnapshot {
        ProfileSnapshot(
            userId: userId,
            firstName: firstName,
            lastName: lastName,
            email: email,
            avatarData: avatarData,
            coachId: coachId,
            dateOfBirth: dateOfBirth,
            language: language,
            createdAt: createdAt
        )
    }
}

struct RemoteProfile: Codable {
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

    init(
        userId: String,
        firstName: String? = nil,
        lastName: String? = nil,
        coachId: Int? = nil,
        dateOfBirth: Date? = nil,
        language: String? = nil,
        createdAt: Date? = nil
    ) {
        self.userId = userId
        self.firstName = firstName
        self.lastName = lastName
        self.coachId = coachId
        self.dateOfBirth = dateOfBirth
        self.language = language
        self.createdAt = createdAt
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
    let userId: String
    let firstName: String?
    let lastName: String?
    let email: String?
    let avatarData: Data?
    let coachId: Int?
    let dateOfBirth: Date?
    let language: String?
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

extension LocalProfile {
    convenience init(remote: RemoteProfile?, userId: String, email: String?, avatarURL: String?, avatarData: Data?) {
        self.init(
            userId: userId,
            firstName: remote?.firstName,
            lastName: remote?.lastName,
            email: email,
            avatarURL: avatarURL,
            avatarData: avatarData,
            coachId: remote?.coachId,
            dateOfBirth: remote?.dateOfBirth,
            language: remote?.language,
            createdAt: remote?.createdAt
        )
    }

    func update(remote: RemoteProfile?, email: String?, avatarURL: String?, avatarData: Data?) {
        firstName = remote?.firstName
        lastName = remote?.lastName
        self.email = email
        self.avatarURL = avatarURL
        self.avatarData = avatarData
        coachId = remote?.coachId
        dateOfBirth = remote?.dateOfBirth
        language = remote?.language
        createdAt = remote?.createdAt
    }

    func apply(_ snapshot: ProfileSnapshot) {
        firstName = snapshot.firstName
        lastName = snapshot.lastName
        email = snapshot.email
        avatarData = snapshot.avatarData
        coachId = snapshot.coachId
        dateOfBirth = snapshot.dateOfBirth
        language = snapshot.language
        createdAt = snapshot.createdAt
    }
}
