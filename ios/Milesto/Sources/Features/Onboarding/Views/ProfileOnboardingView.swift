import SwiftData
import SwiftUI

struct ProfileOnboardingView: View {
    let userId: String
    let missingSteps: [OnboardingStep]
    let existingProfile: Profile?
    let onComplete: () -> Void

    @Environment(\.modelContext) private var modelContext
    @State private var currentStepIndex = 0
    @State private var firstName = ""
    @State private var lastName = ""
    @State private var dateOfBirth = Calendar.current.date(byAdding: .year, value: -20, to: Date())!
    @State private var selectedCoach: CoachPersonality?
    @State private var isSaving = false
    @State private var showError = false
    @State private var errorMessage = ""

    private var currentStep: OnboardingStep? {
        guard currentStepIndex < missingSteps.count else { return nil }
        return missingSteps[currentStepIndex]
    }

    private var deviceLanguage: String {
        Locale.current.language.languageCode?.identifier == "fr" ? "fr" : "en"
    }

    var body: some View {
        NavigationStack {
            Group {
                switch currentStep {
                case .name:
                    OnboardingNameView(
                        firstName: $firstName,
                        lastName: $lastName,
                        onContinue: advanceOrSave
                    )
                case .birthdate:
                    OnboardingBirthdateView(
                        dateOfBirth: $dateOfBirth,
                        onContinue: advanceOrSave
                    )
                case .coach:
                    OnboardingCoachView(
                        selectedCoach: $selectedCoach,
                        onContinue: advanceOrSave
                    )
                case nil:
                    Color.clear.onAppear { onComplete() }
                }
            }
            .id(currentStepIndex)
            .transition(.push(from: .trailing))
            .overlay(alignment: .topLeading) {
                OnboardingSignOutButton()
                    .padding(.top, 8)
                    .padding(.leading, 16)
            }
            .overlay {
                if isSaving {
                    Color("TextPrimary").opacity(0.3)
                        .ignoresSafeArea()
                    ProgressView()
                }
            }
        }
        .alert(String(localized: "onboarding.error.title", table: "Onboarding"), isPresented: $showError) {
            Button(String(localized: "common.ok", table: "Common"), role: .cancel) {}
        } message: {
            Text(errorMessage)
        }
        .onAppear {
            prefillFromExistingProfile()
        }
    }

    private func prefillFromExistingProfile() {
        guard let profile = existingProfile else { return }
        if let fn = profile.firstName, !fn.isEmpty { firstName = fn }
        if let ln = profile.lastName, !ln.isEmpty { lastName = ln }
        if let dob = profile.dateOfBirth { dateOfBirth = dob }
        if let cid = profile.coachId {
            selectedCoach = CoachPersonality.from(databaseId: cid)
        }
    }

    private func advanceOrSave() {
        if currentStepIndex < missingSteps.count - 1 {
            withAnimation(.easeInOut(duration: 0.3)) {
                currentStepIndex += 1
            }
        } else {
            saveProfile()
        }
    }

    private func saveProfile() {
        Task { @MainActor in
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
            let mergedLanguage = deviceLanguage

            let dateFormatter = DateFormatter()
            dateFormatter.dateFormat = "yyyy-MM-dd"

            let fields = ProfileUpdateFields(
                firstName: mergedFirstName,
                lastName: mergedLastName,
                dateOfBirth: dateFormatter.string(from: mergedDateOfBirth),
                coachId: mergedCoachId,
                language: mergedLanguage
            )

            do {
                _ = try await ProfileService.shared.updateProfile(fields)

                onComplete()

                let descriptor = FetchDescriptor<Profile>(
                    predicate: #Predicate { $0.userId == userId }
                )
                let profile = (try? modelContext.fetch(descriptor))?.first

                if let profile {
                    profile.firstName = mergedFirstName
                    profile.lastName = mergedLastName
                    profile.dateOfBirth = mergedDateOfBirth
                    profile.coachId = mergedCoachId
                    profile.language = mergedLanguage
                } else {
                    let newProfile = Profile(
                        userId: userId,
                        firstName: mergedFirstName,
                        lastName: mergedLastName,
                        coachId: mergedCoachId,
                        dateOfBirth: mergedDateOfBirth,
                        language: mergedLanguage
                    )
                    modelContext.insert(newProfile)
                }
            } catch {
                errorMessage = error.localizedDescription
                showError = true
            }
        }
    }
}

#Preview {
    ProfileOnboardingView(
        userId: "preview-user",
        missingSteps: [.name, .birthdate, .coach],
        existingProfile: nil,
        onComplete: {}
    )
}
