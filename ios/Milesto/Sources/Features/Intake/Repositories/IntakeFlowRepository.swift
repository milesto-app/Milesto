import Foundation

@MainActor
final class IntakeFlowRepository {
    private let goals: GoalRepository

    init(goals: GoalRepository) {
        self.goals = goals
    }

    func createGoal(description: String) async throws -> GoalDTO {
        try await goals.createGoal(description: description)
    }

    func saveMotivation(goalId: String, quote: String) async throws {
        try await goals.updateGoal(goalId: goalId, motivationQuote: quote)
    }
}
