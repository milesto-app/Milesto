import Foundation

@MainActor
final class SettingsRepository {
    private let profile: ProfileRepository
    private let goals: GoalRepository

    init(profile: ProfileRepository, goals: GoalRepository) {
        self.profile = profile
        self.goals = goals
    }

    func fetchProfile() async throws -> ProfileSnapshot {
        try await profile.fetchProfile()
    }

    func fetchActiveGoal(userId: String) async throws -> GoalSnapshot? {
        try await goals.fetchActiveGoal(userId: userId)
    }

    func updateProfile(_ fields: ProfileUpdateFields) async throws {
        _ = try await profile.updateProfile(fields)
    }

    func deleteGoal(goalId: String) async throws {
        try await goals.deleteGoal(goalId: goalId)
    }
}
