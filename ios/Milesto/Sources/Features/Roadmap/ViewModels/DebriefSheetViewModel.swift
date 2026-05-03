import Foundation

@MainActor
@Observable
final class DebriefSheetViewModel {
    @ObservationIgnored private let repository: any DebriefRepository
    @ObservationIgnored private let goalId: String
    @ObservationIgnored private let weeklyPlanId: String

    private(set) var reflectionNote: String = ""
    private(set) var isSubmitting = false
    private(set) var errorMessage: String?

    init(repository: any DebriefRepository, goalId: String, weeklyPlanId: String) {
        self.repository = repository
        self.goalId = goalId
        self.weeklyPlanId = weeklyPlanId
    }

    var canSubmit: Bool {
        reflectionNote.count >= 10 && !isSubmitting
    }

    func updateReflectionNote(_ newValue: String) {
        reflectionNote = newValue
    }

    func submit() async -> Bool {
        isSubmitting = true
        errorMessage = nil
        defer { isSubmitting = false }

        do {
            _ = try await repository.submitDebrief(
                goalId: goalId,
                weeklyPlanId: weeklyPlanId,
                note: reflectionNote
            )
            return true
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }
}
