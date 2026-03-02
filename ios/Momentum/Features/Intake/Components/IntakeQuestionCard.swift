import SwiftUI

struct IntakeQuestionCard: View {
    let question: IntakeQuestion
    @Binding var answers: [String: IntakeAnswerDTO]
    let coachId: Int

    var body: some View {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.md) {
            HStack(alignment: .top, spacing: AppTheme.Spacing.xs) {
                AppText(verbatim: question.questionText, style: .headline)
                VoicePlaybackButton(text: question.questionText, coachId: coachId)
            }

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
        .padding(.vertical, AppTheme.Spacing.md)
    }
}
