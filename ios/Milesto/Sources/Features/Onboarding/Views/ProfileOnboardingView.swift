import SwiftUI

struct ProfileOnboardingView: View {
    let userId: String
    let missingSteps: [OnboardingStep]
    let existingProfile: Profile?
    let onComplete: () -> Void

    @Environment(AppDependencies.self) private var dependencies
    @State private var model: ProfileOnboardingViewModel?

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
                model = ProfileOnboardingViewModel(
                    repository: dependencies.onboarding,
                    userId: userId,
                    missingSteps: missingSteps,
                    existingProfile: ProfileSnapshot(profile: existingProfile)
                )
            }
        }
    }

    @ViewBuilder
    private func content(model: ProfileOnboardingViewModel) -> some View {
        @Bindable var bindable = model
        NavigationStack {
            Group {
                switch model.currentStep {
                case .name:
                    OnboardingNameView(
                        firstName: $bindable.firstName,
                        lastName: $bindable.lastName,
                        onContinue: { handleContinue(model: model) }
                    )
                case .birthdate:
                    OnboardingBirthdateView(
                        dateOfBirth: $bindable.dateOfBirth,
                        onContinue: { handleContinue(model: model) }
                    )
                case .coach:
                    OnboardingCoachView(
                        selectedCoach: $bindable.selectedCoach,
                        onContinue: { handleContinue(model: model) }
                    )
                case nil:
                    Color.clear.onAppear { onComplete() }
                }
            }
            .id(model.currentStepIndex)
            .transition(.push(from: .trailing))
            .overlay(alignment: .topLeading) {
                OnboardingSignOutButton()
                    .padding(.top, 8)
                    .padding(.leading, 16)
            }
            .overlay {
                if model.isSaving {
                    Color("TextPrimary").opacity(0.3)
                        .ignoresSafeArea()
                    ProgressView()
                }
            }
        }
        .alert(String(localized: "onboarding.error.title", table: "Onboarding"), isPresented: $bindable.showError) {
            Button(String(localized: "common.ok", table: "Common"), role: .cancel) {}
        } message: {
            AppText(verbatim: model.errorMessage ?? "", style: .body)
        }
    }

    private func handleContinue(model: ProfileOnboardingViewModel) {
        Task {
            let didComplete = await model.advanceOrSave()
            if didComplete {
                onComplete()
            }
        }
    }
}
