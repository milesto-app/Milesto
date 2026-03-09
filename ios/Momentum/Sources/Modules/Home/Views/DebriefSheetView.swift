import SwiftUI

struct DebriefSheetView: View {
    let goalId: String
    let completedObjectives: [DailyObjectiveDTO]
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

                    if !completedObjectives.isEmpty {
                        ratingsSection
                    }

                    reflectionSection

                    if let error {
                        AppText(verbatim: error, style: .caption)
                            .color(Color("StatusError"))
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

            ForEach(completedObjectives) { objective in
                VStack(alignment: .leading, spacing: 8) {
                    AppText(verbatim: objective.title, style: .body)

                    HStack(spacing: 8) {
                        ratingPill(.easy, label: String(localized: "home.debrief.ratings.easy", table: "Home"), objectiveId: objective.id)
                        ratingPill(.moderate, label: String(localized: "home.debrief.ratings.moderate", table: "Home"), objectiveId: objective.id)
                        ratingPill(.hard, label: String(localized: "home.debrief.ratings.hard", table: "Home"), objectiveId: objective.id)
                    }
                }
            }
        }
    }

    private func ratingPill(_ rating: DifficultyRating, label: String, objectiveId: String) -> some View {
        let isSelected = ratings[objectiveId] == rating
        let pillColor = switch rating {
        case .easy: Color("TintPrimary")
        case .moderate: Color("AccentAmber")
        case .hard: Color("StatusError")
        }

        return Button {
            withAnimation(.easeOut(duration: 0.15)) {
                ratings[objectiveId] = rating
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
                VoiceToggleButton(transcribedText: $reflectionNote, coachId: nil)
            }
        }
    }

    private func submit() async {
        isSubmitting = true
        error = nil

        let taskRatings: [TaskRatingDTO]? = ratings.isEmpty ? nil : ratings.map { objectiveId, rating in
            TaskRatingDTO(objectiveId: objectiveId, rating: rating)
        }

        do {
            _ = try await RoadmapAPIService.shared.submitDebrief(
                goalId: goalId,
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
