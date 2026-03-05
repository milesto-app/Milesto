import SwiftUI

struct IntakeSingleChoiceView: View {
    let question: IntakeQuestion
    @Binding var answers: [String: IntakeAnswerDTO]

    private var options: [String] {
        question.config?.options ?? []
    }

    private var selectedOption: String? {
        answers[question.id]?.selectedOptions?.first
    }

    var body: some View {
        VStack(spacing: 8) {
            ForEach(options, id: \.self) { option in
                Button {
                    answers[question.id] = IntakeAnswerDTO(
                        questionId: question.id,
                        answerText: nil,
                        answerNumeric: nil,
                        selectedOptions: [option]
                    )
                } label: {
                    HStack {
                        AppText(verbatim: option, style: .body)
                        Spacer()
                        if selectedOption == option {
                            TablerIcon(.circleCheck, size: 22, color: AppTheme.Colors.accent)
                        }
                    }
                    .padding(16)
                    .background(AppTheme.Colors.fieldBackground)
                    .cornerRadius(AppTheme.CornerRadius.sm)
                    .overlay(
                        RoundedRectangle(cornerRadius: AppTheme.CornerRadius.sm)
                            .stroke(
                                selectedOption == option ? AppTheme.Colors.accent : Color.clear,
                                lineWidth: 2
                            )
                    )
                }
                .buttonStyle(.plain)
            }
        }
    }
}
