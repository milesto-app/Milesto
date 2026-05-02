import Foundation

@MainActor
final class SyncingOnboardingRepository: OnboardingRepository {
    private let profile: any ProfileRepository

    init(profile: any ProfileRepository) {
        self.profile = profile
    }

    func saveProfile(userId _: String, fields: ProfileUpdateFields, dateOfBirth _: Date) async throws {
        _ = try await profile.updateProfile(fields)
    }
}
