import Foundation

@MainActor
protocol SettingsRepository: AnyObject {
    func loadProfile(userId: String) -> ProfileSnapshot?
    func loadActiveGoal(userId: String) -> GoalSnapshot?
    func syncProfile(userId: String) async throws
    func updateProfile(_ fields: ProfileUpdateFields) async throws
    func deleteGoal(goalId: String) async throws
    func purgeLocalUserData() async throws
}
