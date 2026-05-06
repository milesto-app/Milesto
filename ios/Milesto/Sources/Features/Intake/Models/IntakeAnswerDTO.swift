import Foundation

struct IntakeAnswerDTO: Codable {
    let questionId: String
    let answerText: String?
    let answerNumeric: Int?
    let selectedOptions: [String]?

    enum CodingKeys: String, CodingKey {
        case questionId = "question_id"
        case answerText = "answer_text"
        case answerNumeric = "answer_numeric"
        case selectedOptions = "selected_options"
    }
}

struct SubmitAnswersRequestDTO: Codable {
    let answers: [IntakeAnswerDTO]
}
