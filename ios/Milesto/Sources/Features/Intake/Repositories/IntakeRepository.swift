import Foundation

@MainActor
final class IntakeRepository {
    private let remote: IntakeRemote
    private let goals: GoalRepository

    init(goals: GoalRepository, remote: IntakeRemote? = nil) {
        self.goals = goals
        self.remote = remote ?? IntakeRemote()
    }

    func createGoal(description: String) async throws -> GoalDTO {
        try await goals.createGoal(description: description)
    }

    func saveMotivation(goalId: String, quote: String) async throws {
        try await goals.updateGoal(goalId: goalId, motivationQuote: quote)
    }

    func getNextBatch(goalId: String) async throws -> IntakeBatchDTO {
        try await remote.getNextBatch(goalId: goalId)
    }

    func submitBatch(goalId: String, answers: [IntakeAnswerDTO]) async throws -> SubmitBatchResponseDTO {
        try await remote.submitBatch(goalId: goalId, answers: answers)
    }

    func retryProfile(goalId: String) async throws -> RetryProfileResponseDTO {
        try await remote.retryProfile(goalId: goalId)
    }
}
