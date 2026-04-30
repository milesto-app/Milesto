import Foundation
import SwiftData

@MainActor
final class SyncingOnboardingRepository: OnboardingRepository {
    private let profile: any ProfileRepository
    private let container: ModelContainer

    init(profile: any ProfileRepository, container: ModelContainer) {
        self.profile = profile
        self.container = container
    }

    private var context: ModelContext { container.mainContext }

    func saveProfile(userId: String, fields: ProfileUpdateFields, dateOfBirth: Date) async throws {
        _ = try await profile.updateProfile(fields)

        let descriptor = FetchDescriptor<Profile>(
            predicate: #Predicate { $0.userId == userId }
        )
        let existing = (try? context.fetch(descriptor))?.first

        if let existing {
            if let v = fields.firstName { existing.firstName = v }
            if let v = fields.lastName { existing.lastName = v }
            existing.dateOfBirth = dateOfBirth
            if let v = fields.coachId { existing.coachId = v }
            if let v = fields.language { existing.language = v }
        } else {
            context.insert(Profile(
                userId: userId,
                firstName: fields.firstName,
                lastName: fields.lastName,
                coachId: fields.coachId,
                dateOfBirth: dateOfBirth,
                language: fields.language
            ))
        }
        try? context.save()
    }
}
