import Foundation

@MainActor
@Observable
final class UserOnboardingViewModel {
    @ObservationIgnored private let env: AppEnv
    @ObservationIgnored private let userId: String
    @ObservationIgnored let missingSteps: [OnboardingStep]
    @ObservationIgnored private let existingUser: UserDTO?

    var firstName: String
    var lastName: String
    var dateOfBirth: Date
    var selectedCoach: CoachPersonality?
    private(set) var currentStepIndex = 0
    private(set) var isSaving = false
    private(set) var errorMessage: String?
    var showError = false

    init(
        env: AppEnv,
        userId: String,
        missingSteps: [OnboardingStep],
        existingUser: UserDTO?
    ) {
        self.env = env
        self.userId = userId
        self.missingSteps = missingSteps
        self.existingUser = existingUser

        firstName = existingUser?.firstName ?? ""
        lastName = existingUser?.lastName ?? ""
        dateOfBirth = existingUser?.dateOfBirth ?? Self.defaultDateOfBirth()
        if let coachId = existingUser?.coachId {
            selectedCoach = CoachPersonality.from(databaseId: coachId)
        }
    }

    var currentStep: OnboardingStep? {
        guard currentStepIndex < missingSteps.count else { return nil }
        return missingSteps[currentStepIndex]
    }

    func advanceOrSave() async -> Bool {
        if currentStepIndex < missingSteps.count - 1 {
            currentStepIndex += 1
            return false
        }
        return await save()
    }

    private func save() async -> Bool {
        isSaving = true
        defer { isSaving = false }

        let finalFirstName = firstName.trimmingCharacters(in: .whitespaces)
        let finalLastName = lastName.trimmingCharacters(in: .whitespaces)

        let mergedFirstName = finalFirstName.isEmpty
            ? (existingUser?.firstName ?? "") : finalFirstName
        let mergedLastName = finalLastName.isEmpty
            ? (existingUser?.lastName ?? "") : finalLastName
        let mergedDateOfBirth = existingUser?.dateOfBirth ?? dateOfBirth
        let mergedCoachId = selectedCoach?.databaseId ?? existingUser?.coachId

        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"

        let fields = UserUpdateFieldsDTO(
            firstName: mergedFirstName,
            lastName: mergedLastName,
            dateOfBirth: formatter.string(from: mergedDateOfBirth),
            coachId: mergedCoachId
        )

        do {
            try await env.onboarding.saveUser(fields: fields)
            return true
        } catch {
            errorMessage = error.localizedDescription
            showError = true
            return false
        }
    }

    static func defaultDateOfBirth() -> Date {
        Calendar.current.date(byAdding: .year, value: -20, to: Date()) ?? Date()
    }
}
