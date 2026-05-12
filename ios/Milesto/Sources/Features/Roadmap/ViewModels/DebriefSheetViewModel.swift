import Foundation

@MainActor
@Observable
final class DebriefSheetViewModel {
    @ObservationIgnored private let env: AppEnv
    @ObservationIgnored private let goalId: String
    @ObservationIgnored private let milestoneId: String

    private(set) var reflectionNote: String = ""
    private(set) var isSubmitting = false
    private(set) var errorMessage: String?

    init(env: AppEnv, goalId: String, milestoneId: String) {
        self.env = env
        self.goalId = goalId
        self.milestoneId = milestoneId
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
            _ = try await env.roadmap.submitDebrief(
                goalId: goalId,
                milestoneId: milestoneId,
                note: reflectionNote
            )
            return true
        } catch {
            errorMessage = error.localizedDescription
            return false
        }
    }
}
