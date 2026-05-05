import Foundation
import SwiftData

@MainActor
final class SyncingGoalRepository: GoalRepository, GoalRoutingRepository {
    private let remote: any RemoteGoalRepository
    private let context: ModelContext

    init(modelContext: ModelContext, remote: any RemoteGoalRepository = SupabaseGoalRepository()) {
        self.remote = remote
        context = modelContext
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
        try await remote.deleteGoal(goalId: goalId)
        let descriptor = FetchDescriptor<LocalGoal>(
            predicate: #Predicate { $0.id == goalId }
        )
        if let local = try? context.fetch(descriptor).first {
            context.delete(local)
            try? context.save()
        }
    }

    func syncFromRemote(userId: String) async throws {
        let remoteGoals = try await remote.listGoals()
        let remoteIds = Set(remoteGoals.map { $0.id })

        for remote in remoteGoals {
            let dtoId = remote.id
            let descriptor = FetchDescriptor<LocalGoal>(predicate: #Predicate { goal in
                goal.id == dtoId
            })
            let existing = try? context.fetch(descriptor).first
            if let existing {
                existing.update(with: remote)
            } else {
                context.insert(LocalGoal(remote: remote))
            }
        }

        let stale = localGoals(userId: userId).filter { !remoteIds.contains($0.id) }
        for goal in stale {
            context.delete(goal)
        }
        try? context.save()
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
        try context.save()
    }

    func markIntakeCompleted(goalId: String) {
        let descriptor = FetchDescriptor<LocalGoal>(
            predicate: #Predicate { $0.id == goalId }
        )
        if let goal = try? context.fetch(descriptor).first {
            goal.status = GoalStatus.intakeCompleted.rawValue
            try? context.save()
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

    private func upsert(_ remote: RemoteGoal) {
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

private extension RemoteGoal {
    var snapshot: GoalSnapshot {
        GoalSnapshot(
            id: id,
            title: title,
            targetDate: targetDate
        )
    }
}
