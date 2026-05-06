import Foundation

enum QuestionType: String, Codable {
    case text
    case scale
    case singleChoice = "single_choice"
    case multipleChoice = "multiple_choice"
}

struct QuestionConfigDTO: Codable {
    let min: Int?
    let max: Int?
    let minLabel: String?
    let maxLabel: String?
    let options: [String]?
    let format: String?

    enum CodingKeys: String, CodingKey {
        case min
        case max
        case minLabel = "min_label"
        case maxLabel = "max_label"
        case options
        case format
    }
}

struct IntakeQuestionDTO: Codable, Identifiable {
    let id: String
    let questionText: String
    let questionType: QuestionType
    let config: QuestionConfigDTO?
    let orderInBatch: Int

    enum CodingKeys: String, CodingKey {
        case id
        case questionText = "question_text"
        case questionType = "question_type"
        case config
        case orderInBatch = "order_in_batch"
    }
}

struct IntakeBatchDTO: Codable {
    let batchId: String?
    let batchNumber: Int?
    let questions: [IntakeQuestionDTO]?
    let isComplete: Bool?
    let profileId: String?
    let profileStatus: String?

    enum CodingKeys: String, CodingKey {
        case batchId = "batch_id"
        case batchNumber = "batch_number"
        case questions
        case isComplete = "is_complete"
        case profileId = "profile_id"
        case profileStatus = "profile_status"
    }
}

struct SubmitBatchResponseDTO: Codable {
    let submittedBatch: SubmittedBatchInfoDTO?
    let nextBatch: IntakeBatchDTO?
    let profileId: String?
    let profileStatus: String?

    enum CodingKeys: String, CodingKey {
        case submittedBatch = "submitted_batch"
        case nextBatch = "next_batch"
        case profileId = "profile_id"
        case profileStatus = "profile_status"
    }
}

struct SubmittedBatchInfoDTO: Codable {
    let batchId: String
    let batchNumber: Int

    enum CodingKeys: String, CodingKey {
        case batchId = "batch_id"
        case batchNumber = "batch_number"
    }
}
