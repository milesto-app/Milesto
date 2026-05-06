import Foundation

@MainActor
final class SettingsRepository {
    private let profile: ProfileRepository
    private let goals: GoalRepository

    init(profile: ProfileRepository, goals: GoalRepository) {
        self.profile = profile
        self.goals = goals
    }

    func fetchProfile() async throws -> ProfileDTO? {
        try await profile.fetchProfile()
    }

    func fetchActiveGoal(userId: String) async throws -> GoalDTO? {
        try await goals.fetchActiveGoal(userId: userId)
    }

    func updateProfile(_ fields: ProfileUpdateFieldsDTO) async throws {
        _ = try await profile.updateProfile(fields)
    }

    func deleteGoal(goalId: String) async throws {
        try await goals.deleteGoal(goalId: goalId)
    }
}
