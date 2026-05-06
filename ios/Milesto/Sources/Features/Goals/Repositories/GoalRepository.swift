import Foundation

@MainActor
final class GoalRepository {
    private let remote: GoalRemote

    init(remote: GoalRemote? = nil) {
        self.remote = remote ?? GoalRemote()
    }

    func createGoal(description: String) async throws -> GoalSnapshot {
        let dto = try await remote.createGoal(description: description)
        return dto.snapshot
    }

    func updateGoal(goalId: String, motivationQuote: String?) async throws {
        try await remote.updateGoal(goalId: goalId, motivationQuote: motivationQuote)
    }

    func deleteGoal(goalId: String) async throws {
        try await remote.deleteGoal(goalId: goalId)
    }

    func fetchActiveGoal(userId: String) async throws -> GoalSnapshot? {
        try await goalsForUser(userId: userId).first?.snapshot
    }

    func fetchSwitchableGoals(userId: String) async throws -> [GoalSummary] {
        try await goalsForUser(userId: userId)
            .filter {
                $0.status == .active || $0.status == .intakeCompleted
            }
            .map { GoalSummary(id: $0.id) }
    }

    func resolveActiveGoal(userId: String) async throws -> ActiveGoalDescriptor? {
        let userGoals = try await goalsForUser(userId: userId)
        let priority: [GoalStatus] = [.active, .intakeCompleted, .profileGenerating, .intakeInProgress]
        let matching = userGoals
            .sorted { a, b in
                let aIndex = priority.firstIndex(of: a.status) ?? priority.count
                let bIndex = priority.firstIndex(of: b.status) ?? priority.count
                return aIndex < bIndex
            }
            .first
        guard let goal = matching else { return nil }
        return ActiveGoalDescriptor(goalId: goal.id, phase: phase(for: goal.status))
    }

    func fetchGoal(goalId: String) async throws -> GoalSnapshot? {
        let goals = try await remote.listGoals()
        return goals.first(where: { $0.id == goalId })?.snapshot
    }

    private func goalsForUser(userId: String) async throws -> [GoalDTO] {
        try await remote.listGoals()
            .filter { $0.userId.caseInsensitiveCompare(userId) == .orderedSame }
    }

    private func phase(for status: GoalStatus) -> ActiveGoalDescriptor.Phase {
        switch status {
        case .active: return .active
        case .intakeCompleted: return .intakeCompleted
        case .intakeInProgress: return .intakeInProgress
        case .profileGenerating: return .profileGenerating
        case .generationFailed: return .generationFailed
        }
    }
}
