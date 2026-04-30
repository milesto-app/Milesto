import SwiftUI

struct IntakeQuestionCard: View {
    let question: IntakeQuestion
    @Binding var answers: [String: IntakeAnswerDTO]

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            AppText(verbatim: question.questionText, style: .headline)

            switch question.questionType {
            case .text:
                if question.config?.format == "date" {
                    IntakeDateQuestionView(question: question, answers: $answers)
                } else {
                    IntakeTextQuestionView(question: question, answers: $answers)
                }
            case .scale:
                IntakeScaleQuestionView(question: question, answers: $answers)
            case .singleChoice:
                IntakeSingleChoiceView(question: question, answers: $answers)
            case .multipleChoice:
                IntakeMultipleChoiceView(question: question, answers: $answers)
            }
        }
        .padding(.vertical, 16)
    }
}
