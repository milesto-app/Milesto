import SwiftUI

struct GoalIntakeFlowView: View {
    let userId: String
    let existingGoalId: String?
    let onClose: (() -> Void)?
    let onComplete: (String) -> Void

    @Environment(\.modelContext) private var modelContext
    @State private var model = GoalIntakeFlowViewModel()

    var body: some View {
        NavigationStack {
            Group {
                switch model.step {
                case .goalSetup:
                    GoalSetupView(
                        goalDescription: $model.goalDescription,
                        isLoading: model.isCreatingGoal,
                        onContinue: {
                            Task { await model.createGoal(in: modelContext) }
                        }
                    )
                case let .motivation(goalId):
                    OnboardingMotivationView(
                        motivationQuote: $model.motivationQuote,
                        isSaving: model.isSavingMotivation,
                        onContinue: {
                            Task { await model.saveMotivation(goalId: goalId) }
                        },
                        onSkip: { model.advanceToIntake(goalId: goalId) }
                    )
                case let .intake(goalId):
                    IntakeContainerView(goalId: goalId, onComplete: {
                        model.markGoalCompleted(goalId: goalId, in: modelContext)
                        onComplete(goalId)
                    })
                }
            }
            .overlay(alignment: .topTrailing) {
                if let onClose {
                    Button(action: onClose) {
                        TablerIcons(.x, size: 24, color: Color("TextPrimary"))
                            .frame(width: 44, height: 44)
                            .glassEffect(.regular.interactive(), in: .circle)
                    }
                    .padding(.top, 8)
                    .padding(.trailing, 16)
                }
            }
            .overlay(alignment: .topLeading) {
                OnboardingSignOutButton()
                    .padding(.top, 8)
                    .padding(.leading, 16)
            }
        }
        .onAppear {
            model.startWithExistingGoalId(existingGoalId)
        }
        .alert(String(localized: "intake.error.title", table: "Intake"), isPresented: $model.showError) {
            Button(String(localized: "common.ok", table: "Common"), role: .cancel) {}
        } message: {
            Text(model.errorMessage)
        }
    }
}
