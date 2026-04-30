import Foundation

@MainActor
protocol GoalRepository: AnyObject {
    func createGoal(description: String) async throws -> Goal
    func updateGoal(goalId: String, motivationQuote: String?) async throws
    func getGoal(goalId: String) async throws -> Goal
    func deleteGoal(goalId: String) async throws
    func listGoals() async throws -> [Goal]
}

@MainActor
protocol IntakeFlowRepository: AnyObject {
    func createGoal(description: String) async throws -> Goal
    func saveMotivation(goalId: String, quote: String) async throws
    func markIntakeCompleted(goalId: String)
}
