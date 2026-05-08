import SwiftUI

struct IntakeBatchView: View {
    let batch: IntakeBatchDTO
    let answers: [String: IntakeAnswerDTO]
    let setAnswer: (String, IntakeAnswerDTO) -> Void
    let onSubmit: () -> Void

    @State private var currentQuestionIndex = 0

    private var questions: [IntakeQuestionDTO] {
        (batch.questions ?? []).sorted { $0.orderInBatch < $1.orderInBatch }
    }

    private var currentQuestion: IntakeQuestionDTO? {
        guard currentQuestionIndex < questions.count else { return nil }
        return questions[currentQuestionIndex]
    }

    private var isLastQuestion: Bool {
        currentQuestionIndex >= questions.count - 1
    }

    private var currentAnswered: Bool {
        guard let question = currentQuestion,
              let answer = answers[question.id] else { return false }
        switch question.questionType {
        case .text:
            return !(answer.answerText?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ?? true)
        case .scale:
            return answer.answerNumeric != nil
        case .singleChoice:
            return answer.selectedOptions?.count == 1
        case .multipleChoice:
            return !(answer.selectedOptions?.isEmpty ?? true)
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            if let question = currentQuestion {
                VStack(alignment: .leading, spacing: 8) {
                    AppText(verbatim: question.questionText, style: .title)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.top, 8)
                .padding(.bottom, 16)
                .padding(.leading, 24)
                .padding(.trailing, 76)

                IntakeQuestionCard(question: question, answers: answers, setAnswer: setAnswer)
                    .id(question.id)
                    .transition(.opacity)
                    .padding(.horizontal, 24)
            }

            Spacer()

            AppButton("intake.submit", table: "Intake", action: advance)
                .fullWidth()
                .disabled(!currentAnswered)
                .padding(.horizontal, 24)
                .padding(.bottom, 24)
        }
        .appBackground()
        .animation(.easeInOut(duration: 0.3), value: currentQuestionIndex)
    }

    private func advance() {
        if isLastQuestion {
            onSubmit()
        } else {
            withAnimation {
                currentQuestionIndex += 1
            }
        }
    }
}
