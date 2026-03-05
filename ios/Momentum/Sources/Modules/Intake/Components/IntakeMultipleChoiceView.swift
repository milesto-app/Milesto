import SwiftUI

struct IntakeMultipleChoiceView: View {
    let question: IntakeQuestion
    @Binding var answers: [String: IntakeAnswerDTO]

    private var options: [String] {
        question.config?.options ?? []
    }

    private var selectedOptions: Set<String> {
        Set(answers[question.id]?.selectedOptions ?? [])
    }

    var body: some View {
        VStack(spacing: 8) {
            ForEach(options, id: \.self) { option in
                let isSelected = selectedOptions.contains(option)
                Button {
                    toggleOption(option)
                } label: {
                    HStack {
                        AppText(verbatim: option, style: .body)
                        Spacer()
                        TablerIcon(
                            isSelected ? .squareCheck : .square,
                            size: 22,
                            color: isSelected ? Colors.accent : Colors.iconDefault
                        )
                    }
                    .padding(16)
                    .background(Colors.fieldBackground)
                    .cornerRadius(8)
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(
                                isSelected ? Colors.accent : Color.clear,
                                lineWidth: 2
                            )
                    )
                }
                .buttonStyle(.plain)
            }
        }
    }

    private func toggleOption(_ option: String) {
        var current = selectedOptions
        if current.contains(option) {
            current.remove(option)
        } else {
            current.insert(option)
        }
        answers[question.id] = IntakeAnswerDTO(
            questionId: question.id,
            answerText: nil,
            answerNumeric: nil,
            selectedOptions: Array(current)
        )
    }
}
