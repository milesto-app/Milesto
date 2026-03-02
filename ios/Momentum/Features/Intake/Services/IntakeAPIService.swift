import Foundation

struct RetryProfileResponse: Codable {
    let profileId: String?
    let profileStatus: String?

    enum CodingKeys: String, CodingKey {
        case profileId = "profile_id"
        case profileStatus = "profile_status"
    }
}

final class IntakeAPIService {
    static let shared = IntakeAPIService()

    private init() {}

    func getNextBatch(goalId: String) async throws -> IntakeBatchResponse {
        return try await BackendClient.shared.request(
            method: "GET",
            path: "goals/\(goalId)/intake/next-batch"
        )
    }

    func submitBatch(goalId: String, answers: [IntakeAnswerDTO]) async throws -> SubmitBatchResponse {
        return try await BackendClient.shared.request(
            method: "POST",
            path: "goals/\(goalId)/intake/submit-batch",
            body: SubmitAnswersRequest(answers: answers)
        )
    }

    func retryProfile(goalId: String) async throws -> RetryProfileResponse {
        return try await BackendClient.shared.request(
            method: "POST",
            path: "goals/\(goalId)/intake/retry-profile"
        )
    }
}
