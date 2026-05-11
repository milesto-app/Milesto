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
    var birthYear: Int?
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
        birthYear = existingUser?.birthYear
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

    func skipBirthYear() async -> Bool {
        birthYear = nil
        return await advanceOrSave()
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
        let mergedBirthYear = birthYear ?? existingUser?.birthYear
        let mergedCoachId = selectedCoach?.databaseId ?? existingUser?.coachId

        let fields = UserUpdateFieldsDTO(
            firstName: mergedFirstName,
            lastName: mergedLastName,
            birthYear: mergedBirthYear,
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
}
