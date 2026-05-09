import SwiftUI

struct UserOnboardingView: View {
    let userId: String
    let missingSteps: [OnboardingStep]
    let existingUser: UserDTO?
    let onComplete: () -> Void

    @Environment(AppEnv.self) private var env
    @State private var model: UserOnboardingViewModel?

    var body: some View {
        Group {
            if let model {
                content(model: model)
                    .appStartTransition()
            } else {
                Color("BackgroundPrimary").ignoresSafeArea()
            }
        }
        .task {
            if model == nil {
                model = UserOnboardingViewModel(
                    env: env,
                    userId: userId,
                    missingSteps: missingSteps,
                    existingUser: existingUser
                )
            }
        }
    }

    @ViewBuilder
    private func content(model: UserOnboardingViewModel) -> some View {
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
            .overlay {
                if model.isSaving {
                    Color("TextPrimary").opacity(0.3)
                        .ignoresSafeArea()
                    AppLoader(size: 28)
                }
            }
            .overlay(alignment: .topTrailing) {
                SignOutGlassButton()
                    .padding(.top, 8)
                    .padding(.trailing, 16)
            }
        }
        .appBackground()
        .alert(String(localized: "onboarding.error.title", table: "Onboarding"), isPresented: $bindable.showError) {
            Button(String(localized: "common.ok", table: "Common"), role: .cancel) {}
        } message: {
            AppText(verbatim: model.errorMessage ?? "", style: .body)
        }
    }

    private func handleContinue(model: UserOnboardingViewModel) {
        Task {
            let didComplete = await model.advanceOrSave()
            if didComplete {
                onComplete()
            }
        }
    }
}
