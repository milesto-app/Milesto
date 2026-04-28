import SwiftUI

struct DebriefSheetView: View {
    let goalId: String
    let weeklyPlanId: String
    let completedTasks: [WeeklyTaskDTO]
    let onDebriefComplete: () -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var ratings: [String: DifficultyRating] = [:]
    @State private var reflectionNote: String = ""
    @State private var isSubmitting = false
    @State private var error: String?

    private var canSubmit: Bool {
        reflectionNote.count >= 10 && !isSubmitting
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    AppText("home.debrief.title", table: "Home", style: .title)
                        .padding(.bottom, 8)

                    if !completedTasks.isEmpty {
                        ratingsSection
                    }

                    reflectionSection

                    if let error {
                        AppText(verbatim: error, style: .caption)
                            .color(Color("Error"))
                    }

                    AppButton("home.debrief.submit", table: "Home", style: .primary) {
                        Task { await submit() }
                    }
                    .fullWidth()
                    .disabled(!canSubmit)
                }
                .padding(24)
            }
        }
        .presentationDetents([.large])
    }

    private var ratingsSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            AppText("home.debrief.ratings.title", table: "Home", style: .headline)

            ForEach(completedTasks) { task in
                VStack(alignment: .leading, spacing: 8) {
                    AppText(verbatim: task.title, style: .body)

                    HStack(spacing: 8) {
                        ratingPill(.easy, label: String(localized: "home.debrief.ratings.easy", table: "Home"), taskId: task.id)
                        ratingPill(.moderate, label: String(localized: "home.debrief.ratings.moderate", table: "Home"), taskId: task.id)
                        ratingPill(.hard, label: String(localized: "home.debrief.ratings.hard", table: "Home"), taskId: task.id)
                    }
                }
            }
        }
    }

    private func ratingPill(_ rating: DifficultyRating, label: String, taskId: String) -> some View {
        let isSelected = ratings[taskId] == rating
        let pillColor = switch rating {
        case .easy: Color("Brand")
        case .moderate: Color("Warning")
        case .hard: Color("Error")
        }

        return Button {
            withAnimation(.easeOut(duration: 0.15)) {
                ratings[taskId] = rating
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

    private var reflectionSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            AppText("home.debrief.reflection.title", table: "Home", style: .headline)

            AppTextField(
                text: $reflectionNote,
                placeholder: "home.debrief.reflection.placeholder",
                table: "Home",
                multiline: true
            )

            HStack {
                Spacer()
                TranscriptionToggleButton(transcribedText: $reflectionNote)
            }
        }
    }

    private func submit() async {
        isSubmitting = true
        error = nil

        let taskRatings: [TaskRatingDTO]? = ratings.isEmpty ? nil : ratings.map { taskId, rating in
            TaskRatingDTO(taskId: taskId, rating: rating)
        }

        do {
            _ = try await RoadmapAPIService.shared.submitDebrief(
                goalId: goalId,
                weeklyPlanId: weeklyPlanId,
                note: reflectionNote,
                taskRatings: taskRatings
            )
            dismiss()
            onDebriefComplete()
        } catch {
            self.error = error.localizedDescription
        }
        isSubmitting = false
    }
}
