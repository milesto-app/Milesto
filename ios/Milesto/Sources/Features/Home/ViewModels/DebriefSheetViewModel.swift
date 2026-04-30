import Foundation

@MainActor
@Observable
final class DebriefSheetViewModel {
    @ObservationIgnored private let repository: any HomeRepository
    @ObservationIgnored private let goalId: String
    @ObservationIgnored private let weeklyPlanId: String

    private(set) var ratings: [String: DifficultyRating] = [:]
    private(set) var reflectionNote: String = ""
    private(set) var isSubmitting = false
    private(set) var errorMessage: String?

    init(repository: any HomeRepository, goalId: String, weeklyPlanId: String) {
        self.repository = repository
        self.goalId = goalId
        self.weeklyPlanId = weeklyPlanId
    }

    var canSubmit: Bool {
        reflectionNote.count >= 10 && !isSubmitting
    }

    func setRating(_ rating: DifficultyRating, for taskId: String) {
        ratings[taskId] = rating
    }

    func updateReflectionNote(_ newValue: String) {
        reflectionNote = newValue
    }

    func submit() async -> Bool {
        isSubmitting = true
        errorMessage = nil
        defer { isSubmitting = false }

        let taskRatings: [TaskRating]? = ratings.isEmpty ? nil : ratings.map { taskId, rating in
            TaskRating(taskId: taskId, rating: rating)
        }

        do {
            _ = try await repository.submitDebrief(
                goalId: goalId,
                weeklyPlanId: weeklyPlanId,
                note: reflectionNote,
                taskRatings: taskRatings
            )
            return true
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }
}
