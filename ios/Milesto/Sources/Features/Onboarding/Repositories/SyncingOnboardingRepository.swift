import Foundation
import SwiftData

@MainActor
final class SyncingOnboardingRepository: OnboardingRepository {
    private let profile: any ProfileRepository

    init(modelContext: ModelContext, auth: any AuthRepository) {
        profile = SyncingProfileRepository(modelContext: modelContext, auth: auth)
    }

    func saveProfile(userId _: String, fields: ProfileUpdateFields, dateOfBirth _: Date) async throws {
        _ = try await profile.updateProfile(fields)
    }
}
