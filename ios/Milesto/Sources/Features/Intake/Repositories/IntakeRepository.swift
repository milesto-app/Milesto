import Foundation

@MainActor
protocol IntakeRepository: AnyObject {
    func getNextBatch(goalId: String) async throws -> IntakeBatch
    func submitBatch(goalId: String, answers: [IntakeAnswerDTO]) async throws -> SubmitBatchResponse
    func retryProfile(goalId: String) async throws -> RetryProfileResponse
}
