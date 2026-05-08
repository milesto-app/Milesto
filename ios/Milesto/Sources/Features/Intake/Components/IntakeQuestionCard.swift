import SwiftUI

struct IntakeQuestionCard: View {
    let question: IntakeQuestionDTO
    let answers: [String: IntakeAnswerDTO]
    let setAnswer: (String, IntakeAnswerDTO) -> Void

    var body: some View {
        Group {
            switch question.questionType {
            case .text:
                if question.config?.format == "date" {
                    IntakeDateQuestionView(question: question, setAnswer: setAnswer)
                } else {
                    IntakeTextQuestionView(question: question, answers: answers, setAnswer: setAnswer)
                }
            case .scale:
                IntakeScaleQuestionView(question: question, answers: answers, setAnswer: setAnswer)
            case .singleChoice:
                IntakeSingleChoiceView(question: question, answers: answers, setAnswer: setAnswer)
            case .multipleChoice:
                IntakeMultipleChoiceView(question: question, answers: answers, setAnswer: setAnswer)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
