import SwiftUI

struct IntakeMultipleChoiceView: View {
    let question: IntakeQuestion
    let answers: [String: IntakeAnswerDTO]
    let setAnswer: (String, IntakeAnswerDTO) -> Void

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
                        TablerIcons(
                            isSelected ? .squareCheck : .square,
                            size: 22,
                            color: isSelected ? Color("Brand") : Color("TextSecondary")
                        )
                    }
                    .padding(16)
                    .background(Color("BackgroundElevated"))
                    .cornerRadius(8)
                    .overlay(
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(
                                isSelected ? Color("Brand") : Color.clear,
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
        setAnswer(question.id, IntakeAnswerDTO(
            questionId: question.id,
            answerText: nil,
            answerNumeric: nil,
            selectedOptions: Array(current)
        ))
    }
}
