import SwiftUI

struct GoalIntakeFlowView: View {
    let existingGoalId: String?
    let onClose: (() -> Void)?
    let onComplete: (String) -> Void

    @Environment(AppDependencies.self) private var dependencies
    @State private var model: GoalIntakeFlowViewModel?

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
                let vm = GoalIntakeFlowViewModel(repository: dependencies.intakeFlow)
                vm.startWithExistingGoalId(existingGoalId)
                model = vm
            }
        }
    }

    @ViewBuilder
    private func content(model: GoalIntakeFlowViewModel) -> some View {
        @Bindable var bindable = model
        NavigationStack {
            Group {
                switch model.step {
                case .goalSetup:
                    GoalSetupView(
                        goalDescription: $bindable.goalDescription,
                        isLoading: model.isCreatingGoal,
                        onContinue: {
                            Task { await model.createGoal() }
                        }
                    )
                case let .motivation(goalId):
                    IntakeMotivationView(
                        motivationQuote: $bindable.motivationQuote,
                        isSaving: model.isSavingMotivation,
                        onContinue: {
                            Task { await model.saveMotivation(goalId: goalId) }
                        },
                        onSkip: { model.advanceToIntake(goalId: goalId) }
                    )
                case let .intake(goalId):
                    IntakeContainerView(goalId: goalId, onComplete: {
                        model.markGoalCompleted(goalId: goalId)
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
        }
        .appBackground()
        .alert(String(localized: "intake.error.title", table: "Intake"), isPresented: $bindable.showError) {
            Button(String(localized: "common.ok", table: "Common"), role: .cancel) {}
        } message: {
            AppText(verbatim: model.errorMessage, style: .body)
        }
    }
}
