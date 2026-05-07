import Foundation

@MainActor
final class GoalRepository {
    private let remote: GoalRemote

    init(remote: GoalRemote? = nil) {
        self.remote = remote ?? GoalRemote()
    }

    func createGoal(description: String) async throws -> GoalDTO {
        try await remote.createGoal(description: description)
    }

    func updateGoal(goalId: String, motivationQuote: String?) async throws {
        try await remote.updateGoal(goalId: goalId, motivationQuote: motivationQuote)
    }

    func deleteGoal(goalId: String) async throws {
        try await remote.deleteGoal(goalId: goalId)
    }

    func fetchActiveGoal(userId: String) async throws -> GoalDTO? {
        let goals = try await goalsForUser(userId: userId)
        let priority: [GoalStatus] = [.active, .intakeCompleted, .profileGenerating, .intakeInProgress]
        return goals.sorted { a, b in
            let aIndex = priority.firstIndex(of: a.status) ?? priority.count
            let bIndex = priority.firstIndex(of: b.status) ?? priority.count
            return aIndex < bIndex
        }
        .first
    }

    func fetchGoal(goalId: String) async throws -> GoalDTO? {
        try await remote.listGoals().first(where: { $0.id == goalId })
    }

    private func goalsForUser(userId: String) async throws -> [GoalDTO] {
        try await remote.listGoals()
            .filter { $0.userId.caseInsensitiveCompare(userId) == .orderedSame }
    }
}
