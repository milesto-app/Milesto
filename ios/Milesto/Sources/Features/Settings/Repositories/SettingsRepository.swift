import Foundation

@MainActor
final class SettingsRepository {
    private let user: UserRepository
    private let goals: GoalRepository

    init(user: UserRepository, goals: GoalRepository) {
        self.user = user
        self.goals = goals
    }

    func fetchUser() async throws -> UserDTO? {
        try await user.fetchUser()
    }

    func fetchActiveGoal(userId: String) async throws -> GoalDTO? {
        try await goals.fetchActiveGoal(userId: userId)
    }

    func updateUser(_ fields: UserUpdateFieldsDTO) async throws {
        _ = try await user.updateUser(fields)
    }

    func deleteGoal(goalId: String) async throws {
        try await goals.deleteGoal(goalId: goalId)
    }

    func deleteAccount() async throws {
        try await user.deleteAccount()
    }
}
