import Foundation
import OSLog
import SwiftData

private let settingsLogger = Logger(subsystem: Bundle.main.bundleIdentifier ?? "app.milesto", category: "Settings")

enum SettingsRepositoryError: Error {
    case localPurgeFailed
}

@MainActor
final class SyncingSettingsRepository: SettingsRepository {
    private let profile: any ProfileRepository
    private let goals: any GoalRepository
    private let container: ModelContainer
    private let featurePurgers: [any LocalDataPurging]
    private let purgeAdditionalLocalData: () async throws -> Void

    init(
        profile: any ProfileRepository,
        goals: any GoalRepository,
        container: ModelContainer,
        featurePurgers: [any LocalDataPurging] = [],
        purgeAdditionalLocalData: @escaping () async throws -> Void = {}
    ) {
        self.profile = profile
        self.goals = goals
        self.container = container
        self.featurePurgers = featurePurgers
        self.purgeAdditionalLocalData = purgeAdditionalLocalData
    }

    private var context: ModelContext {
        container.mainContext
    }

    func loadProfile(userId: String) -> Profile? {
        let descriptor = FetchDescriptor<Profile>(
            predicate: #Predicate { $0.userId == userId }
        )
        return try? context.fetch(descriptor).first
    }

    func loadActiveGoal(userId: String) -> Goal? {
        let descriptor = FetchDescriptor<Goal>()
        let goals = (try? context.fetch(descriptor)) ?? []
        return goals.first { $0.userId.caseInsensitiveCompare(userId) == .orderedSame }
    }

    func syncProfile(userId: String) async throws {
        try await profile.sync(userId: userId)
    }

    func updateProfile(_ fields: ProfileUpdateFields) async throws {
        let updated = try await profile.updateProfile(fields)
        if let local = loadProfile(userId: updated.userId) {
            if let v = updated.firstName { local.firstName = v }
            if let v = updated.lastName { local.lastName = v }
            if let v = updated.dateOfBirth { local.dateOfBirth = v }
            if let v = updated.coachId { local.coachId = v }
            if let v = updated.language { local.language = v }
            try? context.save()
        }
    }

    func deleteGoal(goalId: String) async throws {
        try await goals.deleteGoal(goalId: goalId)
        let descriptor = FetchDescriptor<Goal>(
            predicate: #Predicate { $0.id == goalId }
        )
        if let local = try? context.fetch(descriptor).first {
            context.delete(local)
            try? context.save()
        }
    }

    func purgeLocalUserData() async throws {
        do {
            try await purgeAdditionalLocalData()
            for purger in featurePurgers {
                try purger.purgeLocalData()
            }
            try deleteAll(Goal.self)
            try deleteAll(Profile.self)
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
