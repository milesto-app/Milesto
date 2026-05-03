import Foundation

@MainActor
final class SyncingIntakeFlowRepository: IntakeFlowRepository {
    private let goals: any GoalRepository

    init(goals: any GoalRepository) {
        self.goals = goals
    }

    func createGoal(description: String) async throws -> GoalSnapshot {
        try await goals.createGoal(description: description)
    }

    func saveMotivation(goalId: String, quote: String) async throws {
        try await goals.updateGoal(goalId: goalId, motivationQuote: quote)
    }

    func markIntakeCompleted(goalId: String) {
        goals.markIntakeCompleted(goalId: goalId)
    }
}
