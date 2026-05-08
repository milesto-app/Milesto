import SwiftUI

struct IntakeFlowView: View {
    let existingGoalId: String?
    let onComplete: (String) -> Void
    let onStartOver: () -> Void

    @Environment(AppEnv.self) private var env
    @State private var model: GoalIntakeFlowViewModel?

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
                let vm = GoalIntakeFlowViewModel(env: env)
                vm.startWithExistingGoalId(existingGoalId)
                model = vm
            }
        }
    }

    @ViewBuilder
    private func content(model: GoalIntakeFlowViewModel) -> some View {
        @Bindable var bindable = model
        NavigationStack {
            ZStack {
                switch model.step {
                case .goalSetup:
                    GoalSetupView(
                        goalDescription: $bindable.goalDescription,
                        isLoading: model.isCreatingGoal,
                        onContinue: {
                            Task { await model.createGoal() }
                        }
                    )
                    .transition(.opacity)
                case let .motivation(goalId):
                    IntakeMotivationView(
                        motivationQuote: $bindable.motivationQuote,
                        isSaving: model.isSavingMotivation,
                        onContinue: {
                            Task { await model.saveMotivation(goalId: goalId) }
                        }
                    )
                    .transition(.opacity)
                case let .intake(goalId):
                    IntakeContainerView(goalId: goalId, onComplete: {
                        onComplete(goalId)
                    })
                    .transition(.opacity)
                }
            }
            .animation(.easeInOut(duration: 0.3), value: model.step.identifier)
            .overlay(alignment: .top) {
                IntakeTopBar(
                    canRestart: model.canRestart,
                    onStartOver: {
                        if await model.restart() {
                            onStartOver()
                        }
                    }
                )
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
