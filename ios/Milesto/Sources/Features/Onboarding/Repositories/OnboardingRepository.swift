import Foundation
import SwiftData

@MainActor
final class OnboardingRepository {
    private let profile: ProfileRepository

    init(modelContext: ModelContext, auth: AuthRepository) {
        profile = ProfileRepository(modelContext: modelContext, auth: auth)
    }

    func saveProfile(userId _: String, fields: ProfileUpdateFields, dateOfBirth _: Date) async throws {
        _ = try await profile.updateProfile(fields)
    }
}
