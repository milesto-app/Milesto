import Foundation
import SwiftData

@MainActor
final class SyncingGoalRepository: GoalRoutingRepository {
    private let remote: any GoalRepository
    private let container: ModelContainer

    init(remote: any GoalRepository, container: ModelContainer) {
        self.remote = remote
        self.container = container
    }

    private var context: ModelContext {
        container.mainContext
    }

    private func localGoals(userId: String) -> [Goal] {
        let descriptor = FetchDescriptor<Goal>()
        let all = (try? context.fetch(descriptor)) ?? []
        return all.filter { $0.userId.caseInsensitiveCompare(userId) == .orderedSame }
    }

    func syncFromRemote(userId: String) async throws {
        let remoteGoals = try await remote.listGoals()
        let remoteIds = Set(remoteGoals.map { $0.id })

        for dto in remoteGoals {
            let dtoId = dto.id
            let descriptor = FetchDescriptor<Goal>(predicate: #Predicate { goal in
                goal.id == dtoId
            })
            let existing = try? context.fetch(descriptor).first
            if let existing {
                existing.status = dto.status
                existing.title = dto.title
                existing.goalDescription = dto.goalDescription
            } else {
                context.insert(Goal(
                    id: dto.id,
                    userId: dto.userId,
                    title: dto.title,
                    goalDescription: dto.goalDescription,
                    status: dto.status,
                    createdAt: Date()
                ))
            }
        }

        let stale = localGoals(userId: userId).filter { !remoteIds.contains($0.id) }
        for goal in stale {
            context.delete(goal)
        }
        try? context.save()
    }

    func resolveActiveGoal(userId: String) -> ActiveGoalDescriptor? {
        let userGoals = localGoals(userId: userId)
        let statusPriority = ["active", "intake_completed", "profile_generating", "intake_in_progress"]
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
        let descriptor = FetchDescriptor<Goal>(predicate: #Predicate { $0.id == goalId })
        guard let goal = try context.fetch(descriptor).first else { return }
        goal.status = "active"
        try context.save()
    }

    private func phase(for status: String) -> ActiveGoalDescriptor.Phase {
        switch status {
        case "active":
            return .active
        case ProfileStatus.intakeCompleted.rawValue:
            return .intakeCompleted
        case "intake_in_progress":
            return .intakeInProgress
        case ProfileStatus.profileGenerating.rawValue:
            return .profileGenerating
        case ProfileStatus.generationFailed.rawValue:
            return .generationFailed
        default:
            return .other
        }
    }
}
