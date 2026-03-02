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
            RoundedRectangle(cornerRadius: AppTheme.CornerRadius.sm)
                .fill(AppTheme.Colors.fieldBackground)

            RoundedRectangle(cornerRadius: AppTheme.CornerRadius.sm)
                .stroke(
                    isFocused ? AppTheme.Colors.fieldBorderFocused : AppTheme.Colors.fieldBorderDefault,
                    lineWidth: 2
                )

            if (answers[question.id]?.answerText ?? "").isEmpty && !isFocused {
                AppText("intake.question.placeholder", table: "Intake", style: .body)
                    .color(AppTheme.Colors.textPlaceholder)
                    .padding(AppTheme.Spacing.md)
            }

            TextEditor(text: text)
                .focused($isFocused)
                .scrollContentBackground(.hidden)
                .padding(AppTheme.Spacing.sm)
        }
        .frame(minHeight: 100, maxHeight: 150)

        HStack {
            Spacer()
            VoiceToggleButton(transcribedText: text, coachId: nil)
        }
    }
}
