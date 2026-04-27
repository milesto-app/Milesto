import SwiftUI

struct IntakeTextQuestionView: View {
    let question: IntakeQuestion
    @Binding var answers: [String: IntakeAnswerDTO]

    @FocusState private var isFocused: Bool

    private var text: Binding<String> {
        Binding(
            get: { answers[question.id]?.answerText ?? "" },
            set: { newValue in
                answers[question.id] = IntakeAnswerDTO(
                    questionId: question.id,
                    answerText: newValue,
                    answerNumeric: nil,
                    selectedOptions: nil
                )
            }
        )
    }

    var body: some View {
        ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: 8)
                .fill(Color("BackgroundElevated"))

            RoundedRectangle(cornerRadius: 8)
                .stroke(
                    isFocused ? Color("Brand") : Color("TextSecondary").opacity(0.2),
                    lineWidth: 2
                )

            if (answers[question.id]?.answerText ?? "").isEmpty && !isFocused {
                AppText("intake.question.placeholder", table: "Intake", style: .body)
                    .color(Color("TextSecondary"))
                    .padding(16)
            }

            TextEditor(text: text)
                .focused($isFocused)
                .scrollContentBackground(.hidden)
                .padding(12)
        }
        .frame(minHeight: 100, maxHeight: 150)

        HStack {
            Spacer()
            VoiceToggleButton(transcribedText: text, coachId: nil)
        }
    }
}
