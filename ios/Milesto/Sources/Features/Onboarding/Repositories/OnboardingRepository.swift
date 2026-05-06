import Foundation

@MainActor
final class OnboardingRepository {
    private let profile: ProfileRepository

    init(profile: ProfileRepository) {
        self.profile = profile
    }

    func saveProfile(fields: ProfileUpdateFields) async throws {
        _ = try await profile.updateProfile(fields)
    }
}
