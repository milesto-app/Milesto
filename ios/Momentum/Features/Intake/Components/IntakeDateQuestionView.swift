import SwiftUI

struct IntakeDateQuestionView: View {
    let question: IntakeQuestion
    @Binding var answers: [String: IntakeAnswerDTO]

    @State private var selectedDate = Date()
    @State private var hasSelected = false

    private static let isoFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.locale = Locale(identifier: "en_US_POSIX")
        return formatter
    }()

    var body: some View {
        VStack(spacing: 16) {
            if hasSelected {
                AppText(verbatim: selectedDate.formatted(.dateTime.day().month(.wide).year()), style: .title)
                    .color(AppTheme.Colors.accent)
            } else {
                AppText("intake.question.datePlaceholder", table: "Intake", style: .body)
                    .color(AppTheme.Colors.textSecondary)
            }

            DatePicker(
                "",
                selection: $selectedDate,
                in: Date()...,
                displayedComponents: .date
            )
            .datePickerStyle(.graphical)
            .tint(AppTheme.Colors.accent)
            .labelsHidden()
            .onChange(of: selectedDate) {
                hasSelected = true
                answers[question.id] = IntakeAnswerDTO(
                    questionId: question.id,
                    answerText: Self.isoFormatter.string(from: selectedDate),
                    answerNumeric: nil,
                    selectedOptions: nil
                )
            }
        }
    }
}
