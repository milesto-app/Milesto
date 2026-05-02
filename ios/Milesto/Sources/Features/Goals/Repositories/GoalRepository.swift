import Foundation

@MainActor
protocol RemoteGoalRepository: AnyObject {
    func createGoal(description: String) async throws -> GoalDTO
    func updateGoal(goalId: String, motivationQuote: String?) async throws
    func getGoal(goalId: String) async throws -> GoalDTO
    func deleteGoal(goalId: String) async throws
    func listGoals() async throws -> [GoalDTO]
}

@MainActor
protocol GoalRepository: AnyObject {
    func createGoal(description: String) async throws -> GoalSnapshot
    func updateGoal(goalId: String, motivationQuote: String?) async throws
    func getGoal(goalId: String) async throws -> GoalSnapshot
    func deleteGoal(goalId: String) async throws
    func syncFromRemote(userId: String) async throws
    func loadGoal(goalId: String) -> GoalSnapshot?
    func loadActiveGoal(userId: String) -> GoalSnapshot?
    func loadSwitchableGoals() -> [GoalSummary]
    func activateGeneratedRoadmap(goalId: String) throws
    func markIntakeCompleted(goalId: String)
}

@MainActor
protocol IntakeFlowRepository: AnyObject {
    func createGoal(description: String) async throws -> GoalSnapshot
    func saveMotivation(goalId: String, quote: String) async throws
    func markIntakeCompleted(goalId: String)
}
