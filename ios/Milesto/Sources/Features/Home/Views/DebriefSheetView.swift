import SwiftUI

struct DebriefSheetView: View {
    let goalId: String
    let weeklyPlanId: String
    let completedTasks: [WeeklyTaskDTO]
    let onDebriefComplete: () -> Void

    @Environment(\.dismiss) private var dismiss
    @Environment(AppDependencies.self) private var dependencies
    @State private var model: DebriefSheetViewModel?

    var body: some View {
        Group {
            if let model {
                content(model: model)
            } else {
                Color("BackgroundBase").ignoresSafeArea()
            }
        }
        .task {
            if model == nil {
                model = DebriefSheetViewModel(
                    repository: dependencies.home,
                    goalId: goalId,
                    weeklyPlanId: weeklyPlanId
                )
            }
        }
    }

    @ViewBuilder
    private func content(model: DebriefSheetViewModel) -> some View {
        @Bindable var bindable = model
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    AppText("home.debrief.title", table: "Home", style: .title)
                        .padding(.bottom, 8)

                    if !completedTasks.isEmpty {
                        ratingsSection(model: model)
                    }

                    reflectionSection(text: $bindable.reflectionNote)

                    if let error = model.errorMessage {
                        AppText(verbatim: error, style: .caption)
                            .color(Color("Error"))
                    }

                    AppButton("home.debrief.submit", table: "Home", style: .primary) {
                        Task {
                            if await model.submit() {
                                dismiss()
                                onDebriefComplete()
                            }
                        }
                    }
                    .fullWidth()
                    .disabled(!model.canSubmit)
                }
                .padding(24)
            }
        }
        .presentationDetents([.large])
    }

    private func ratingsSection(model: DebriefSheetViewModel) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            AppText("home.debrief.ratings.title", table: "Home", style: .headline)

            ForEach(completedTasks) { task in
                VStack(alignment: .leading, spacing: 8) {
                    AppText(verbatim: task.title, style: .body)

                    HStack(spacing: 8) {
                        ratingPill(.easy, label: String(localized: "home.debrief.ratings.easy", table: "Home"), taskId: task.id, model: model)
                        ratingPill(.moderate, label: String(localized: "home.debrief.ratings.moderate", table: "Home"), taskId: task.id, model: model)
                        ratingPill(.hard, label: String(localized: "home.debrief.ratings.hard", table: "Home"), taskId: task.id, model: model)
                    }
                }
            }
        }
    }

    private func ratingPill(_ rating: DifficultyRating, label: String, taskId: String, model: DebriefSheetViewModel) -> some View {
        let isSelected = model.ratings[taskId] == rating
        let pillColor: Color = switch rating {
        case .easy: Color("Brand")
        case .moderate: Color("Warning")
        case .hard: Color("Error")
        }

        return Button {
            withAnimation(.easeOut(duration: 0.15)) {
                model.setRating(rating, for: taskId)
            }
        } label: {
            AppText(verbatim: label, style: .caption)
                .weight(.medium)
                .color(isSelected ? pillColor : Color("TextSecondary"))
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(
                    Capsule()
                        .fill(isSelected ? pillColor.opacity(0.15) : Color.clear)
                )
                .overlay(
                    Capsule()
                        .stroke(isSelected ? pillColor : Color("TextSecondary").opacity(0.3), lineWidth: 1)
                )
        }
        .buttonStyle(.plain)
    }

    private func reflectionSection(text: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            AppText("home.debrief.reflection.title", table: "Home", style: .headline)

            AppTextField(
                text: text,
                placeholder: "home.debrief.reflection.placeholder",
                table: "Home",
                multiline: true
            )

            HStack {
                Spacer()
                TranscriptionToggleButton(transcribedText: text)
            }
        }
    }
}
