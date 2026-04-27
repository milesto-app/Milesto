import SwiftUI

struct IntakeScaleQuestionView: View {
    let question: IntakeQuestion
    @Binding var answers: [String: IntakeAnswerDTO]

    private var minValue: Int {
        question.config?.min ?? 1
    }

    private var maxValue: Int {
        Swift.max(question.config?.max ?? 10, minValue + 1)
    }

    private var currentValue: Double {
        Double(answers[question.id]?.answerNumeric ?? minValue)
    }

    var body: some View {
        VStack(spacing: 12) {
            AppText(verbatim: "\(Int(currentValue))", style: .largeTitle)
                .color(Color("TintPrimary"))
                .alignment(.center)

            Slider(
                value: Binding(
                    get: { currentValue },
                    set: { newValue in
                        answers[question.id] = IntakeAnswerDTO(
                            questionId: question.id,
                            answerText: nil,
                            answerNumeric: Int(newValue),
                            selectedOptions: nil
                        )
                    }
                ),
                in: Double(minValue) ... Double(maxValue),
                step: 1
            )
            .tint(Color("TintPrimary"))

            HStack {
                AppText(verbatim: "\(minValue)", style: .caption)
                    .color(Color("TextSecondary"))
                Spacer()
                AppText(verbatim: "\(maxValue)", style: .caption)
                    .color(Color("TextSecondary"))
            }
        }
        .onAppear {
            if answers[question.id] == nil {
                answers[question.id] = IntakeAnswerDTO(
                    questionId: question.id,
                    answerText: nil,
                    answerNumeric: minValue,
                    selectedOptions: nil
                )
            }
        }
    }
}
