import Foundation

@MainActor
@Observable
final class ProfileOnboardingViewModel {
    @ObservationIgnored private let repository: OnboardingRepository
    @ObservationIgnored private let userId: String
    @ObservationIgnored let missingSteps: [OnboardingStep]
    @ObservationIgnored private let existingProfile: ProfileDTO?

    var firstName: String
    var lastName: String
    var dateOfBirth: Date
    var selectedCoach: CoachPersonality?
    private(set) var currentStepIndex = 0
    private(set) var isSaving = false
    private(set) var errorMessage: String?
    var showError = false

    init(
        repository: OnboardingRepository,
        userId: String,
        missingSteps: [OnboardingStep],
        existingProfile: ProfileDTO?
    ) {
        self.repository = repository
        self.userId = userId
        self.missingSteps = missingSteps
        self.existingProfile = existingProfile

        firstName = existingProfile?.firstName ?? ""
        lastName = existingProfile?.lastName ?? ""
        dateOfBirth = existingProfile?.dateOfBirth ?? Self.defaultDateOfBirth()
        if let coachId = existingProfile?.coachId {
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
            ? (existingProfile?.firstName ?? "") : finalFirstName
        let mergedLastName = finalLastName.isEmpty
            ? (existingProfile?.lastName ?? "") : finalLastName
        let mergedDateOfBirth = existingProfile?.dateOfBirth ?? dateOfBirth
        let mergedCoachId = selectedCoach?.databaseId ?? existingProfile?.coachId

        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"

        let fields = ProfileUpdateFieldsDTO(
            firstName: mergedFirstName,
            lastName: mergedLastName,
            dateOfBirth: formatter.string(from: mergedDateOfBirth),
            coachId: mergedCoachId
        )

        do {
            try await repository.saveProfile(fields: fields)
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
