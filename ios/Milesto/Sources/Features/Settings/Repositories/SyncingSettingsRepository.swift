import Foundation
import OSLog
import SwiftData

private let settingsLogger = Logger(subsystem: Bundle.main.bundleIdentifier ?? "app.milesto-ai", category: "Settings")

enum SettingsRepositoryError: LocalizedError {
    case localPurgeFailed

    var errorDescription: String? {
        switch self {
        case .localPurgeFailed:
            String(localized: "settings.signOut.purge.error", table: "Settings")
        }
    }
}

@MainActor
final class SyncingSettingsRepository: SettingsRepository {
    private let profile: any ProfileRepository
    private let goals: any GoalRepository
    private let container: ModelContainer

    init(profile: any ProfileRepository, goals: any GoalRepository, container: ModelContainer) {
        self.profile = profile
        self.goals = goals
        self.container = container
    }

    private var context: ModelContext { container.mainContext }

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
            try await SubscriptionSyncOutbox.shared.purgeAll()
            try deleteAll(LocalChatMessage.self)
            try deleteAll(LocalConversation.self)
            try deleteAll(LocalDebrief.self)
            try deleteAll(LocalWeeklyTask.self)
            try deleteAll(LocalWeeklyPlan.self)
            try deleteAll(LocalMilestone.self)
            try deleteAll(LocalRoadmap.self)
            try deleteAll(LocalStats.self)
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
