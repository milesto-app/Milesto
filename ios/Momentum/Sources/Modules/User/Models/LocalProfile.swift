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
    var notifPermissionStatus: String?
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
        notifPermissionStatus: String? = nil,
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
        self.notifPermissionStatus = notifPermissionStatus
        self.createdAt = createdAt
    }
}

extension LocalProfile {
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
