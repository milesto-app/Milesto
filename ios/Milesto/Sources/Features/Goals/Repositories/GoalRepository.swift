import Foundation
import SwiftData

@MainActor
final class GoalRepository {
    private let remote: GoalRemote
    private let context: ModelContext
    private let syncEngine: SyncEngine<LocalGoal, GoalRemote>

    init(modelContext: ModelContext, remote: GoalRemote? = nil) {
        let remote = remote ?? GoalRemote()
        self.remote = remote
        context = modelContext
        syncEngine = SyncEngine(modelContext: modelContext, remote: remote)
    }

    private func localGoals(userId: String) -> [LocalGoal] {
        let descriptor = FetchDescriptor<LocalGoal>()
        let all = (try? context.fetch(descriptor)) ?? []
        return all.filter { $0.userId.caseInsensitiveCompare(userId) == .orderedSame }
    }

    func createGoal(description: String) async throws -> GoalSnapshot {
        let remote = try await remote.createGoal(description: description)
        upsert(remote)
        try? context.save()
        return remote.snapshot
    }

    func updateGoal(goalId: String, motivationQuote: String?) async throws {
        try await remote.updateGoal(goalId: goalId, motivationQuote: motivationQuote)
    }

    func deleteGoal(goalId: String) async throws {
        let descriptor = FetchDescriptor<LocalGoal>(
            predicate: #Predicate { $0.id == goalId }
        )
        if let local = try? context.fetch(descriptor).first {
            local.syncStatus = .deletedLocally
            local.updatedAt = Date()
            try? context.save()
            try await syncEngine.sync()
        } else {
            try await remote.deleteGoal(goalId: goalId)
        }
    }

    func syncFromRemote(userId _: String) async throws {
        try await syncEngine.sync()
    }

    func loadGoal(goalId: String) -> GoalSnapshot? {
        let descriptor = FetchDescriptor<LocalGoal>(
            predicate: #Predicate { $0.id == goalId }
        )
        return try? context.fetch(descriptor).first?.snapshot
    }

    func loadActiveGoal(userId: String) -> GoalSnapshot? {
        localGoals(userId: userId).first?.snapshot
    }

    func loadSwitchableGoals() -> [GoalSummary] {
        let descriptor = FetchDescriptor<LocalGoal>()
        guard let goals = try? context.fetch(descriptor) else { return [] }
        return goals
            .filter {
                $0.status == GoalStatus.active.rawValue
                    || $0.status == GoalStatus.intakeCompleted.rawValue
            }
            .map { GoalSummary(id: $0.id) }
    }

    func resolveActiveGoal(userId: String) -> ActiveGoalDescriptor? {
        let userGoals = localGoals(userId: userId)
        let statusPriority = [
            GoalStatus.active.rawValue,
            GoalStatus.intakeCompleted.rawValue,
            GoalStatus.profileGenerating.rawValue,
            GoalStatus.intakeInProgress.rawValue,
        ]
        let matching = userGoals
            .sorted { a, b in
                let aIndex = statusPriority.firstIndex(of: a.status) ?? statusPriority.count
                let bIndex = statusPriority.firstIndex(of: b.status) ?? statusPriority.count
                return aIndex < bIndex
            }
            .first
        guard let goal = matching else { return nil }
        return ActiveGoalDescriptor(goalId: goal.id, phase: phase(for: goal.status))
    }

    func resolveGoal(userId: String, goalId: String) -> ActiveGoalDescriptor? {
        guard let goal = localGoals(userId: userId).first(where: { $0.id == goalId }) else {
            return nil
        }
        return ActiveGoalDescriptor(goalId: goal.id, phase: phase(for: goal.status))
    }

    func activateGeneratedRoadmap(goalId: String) throws {
        let descriptor = FetchDescriptor<LocalGoal>(predicate: #Predicate { $0.id == goalId })
        guard let goal = try context.fetch(descriptor).first else { return }
        goal.status = GoalStatus.active.rawValue
        goal.updatedAt = Date()
        goal.syncStatus = .pending
        try context.save()
        Task { try? await syncEngine.sync() }
    }

    func markIntakeCompleted(goalId: String) {
        let descriptor = FetchDescriptor<LocalGoal>(
            predicate: #Predicate { $0.id == goalId }
        )
        if let goal = try? context.fetch(descriptor).first {
            goal.status = GoalStatus.intakeCompleted.rawValue
            goal.updatedAt = Date()
            goal.syncStatus = .pending
            try? context.save()
            Task { try? await syncEngine.sync() }
        }
    }

    private func phase(for status: String) -> ActiveGoalDescriptor.Phase {
        switch status {
        case GoalStatus.active.rawValue:
            return .active
        case GoalStatus.intakeCompleted.rawValue:
            return .intakeCompleted
        case GoalStatus.intakeInProgress.rawValue:
            return .intakeInProgress
        case GoalStatus.profileGenerating.rawValue:
            return .profileGenerating
        case GoalStatus.generationFailed.rawValue:
            return .generationFailed
        default:
            return .other
        }
    }

    private func upsert(_ remote: GoalDTO) {
        let dtoId = remote.id
        let descriptor = FetchDescriptor<LocalGoal>(
            predicate: #Predicate { $0.id == dtoId }
        )
        if let existing = try? context.fetch(descriptor).first {
            existing.update(with: remote)
        } else {
            context.insert(LocalGoal(remote: remote))
        }
    }
}

private extension GoalDTO {
    var snapshot: GoalSnapshot {
        GoalSnapshot(
            id: id,
            title: title,
            targetDate: targetDate
        )
    }
}
