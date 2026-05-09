import Foundation

@MainActor
final class OnboardingRepository {
    private let user: UserRepository

    init(user: UserRepository) {
        self.user = user
    }

    func saveUser(fields: UserUpdateFieldsDTO) async throws {
        _ = try await user.updateUser(fields)
    }
}
