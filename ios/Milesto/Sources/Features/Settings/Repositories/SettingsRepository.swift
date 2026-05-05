import Foundation
import OSLog
import SwiftData

private let settingsLogger = Logger(subsystem: Bundle.main.bundleIdentifier ?? "app.milesto", category: "Settings")

enum SettingsRepositoryError: Error {
    case localPurgeFailed
}

@MainActor
final class SettingsRepository {
    private let profile: ProfileRepository
    private let goals: GoalRepository
    private let context: ModelContext

    init(modelContext: ModelContext, auth: AuthRepository) {
        profile = ProfileRepository(modelContext: modelContext, auth: auth)
        goals = GoalRepository(modelContext: modelContext)
        context = modelContext
    }

    func loadProfile(userId: String) -> ProfileSnapshot? {
        profile.loadProfile(userId: userId)
    }

    func loadActiveGoal(userId: String) -> GoalSnapshot? {
        goals.loadActiveGoal(userId: userId)
    }

    func syncProfile(userId: String) async throws {
        try await profile.sync(userId: userId)
    }

    func updateProfile(_ fields: ProfileUpdateFields) async throws {
        _ = try await profile.updateProfile(fields)
    }

    func deleteGoal(goalId: String) async throws {
        try await goals.deleteGoal(goalId: goalId)
    }

    func purgeLocalUserData() async throws {
        do {
            try deleteAll(LocalGoal.self)
            try deleteAll(LocalProfile.self)
            try context.save()
        } catch {
            settingsLogger.error("Failed to purge local user data before sign-out")
            throw SettingsRepositoryError.localPurgeFailed
        }
    }

    private func deleteAll<T: PersistentModel>(_: T.Type) throws {
        let descriptor = FetchDescriptor<T>()
        let rows = try context.fetch(descriptor)
        for row in rows {
            context.delete(row)
        }
    }
}
