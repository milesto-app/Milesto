import Foundation

@MainActor
protocol SettingsRepository: AnyObject {
    func loadProfile(userId: String) -> Profile?
    func loadActiveGoal(userId: String) -> Goal?
    func syncProfile(userId: String) async throws
    func updateProfile(_ fields: ProfileUpdateFields) async throws
    func deleteGoal(goalId: String) async throws
    func purgeLocalUserData() async throws
}
