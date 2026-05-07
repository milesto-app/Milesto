import Foundation

struct RetryProfileResponseDTO: Codable {
    let profileId: String?
    let profileStatus: String?

    enum CodingKeys: String, CodingKey {
        case profileId = "profile_id"
        case profileStatus = "profile_status"
    }
}

@MainActor
final class IntakeRemote {
    init() {}

    func getNextBatch(goalId: String) async throws -> IntakeBatchDTO {
        return try await ApiClient.shared.request(
            method: "GET",
            path: "goals/\(goalId)/intake/next-batch"
        )
    }

    func submitBatch(goalId: String, answers: [IntakeAnswerDTO]) async throws -> SubmitBatchResponseDTO {
        return try await ApiClient.shared.request(
            method: "POST",
            path: "goals/\(goalId)/intake/submit-batch",
            body: SubmitAnswersRequestDTO(answers: answers)
        )
    }

    func retryProfile(goalId: String) async throws -> RetryProfileResponseDTO {
        return try await ApiClient.shared.request(
            method: "POST",
            path: "goals/\(goalId)/intake/retry-profile"
        )
    }
}
