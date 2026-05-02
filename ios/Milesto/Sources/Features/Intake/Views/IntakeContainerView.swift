import SwiftUI

struct IntakeContainerView: View {
    let goalId: String
    let onComplete: () -> Void

    @Environment(AppDependencies.self) private var dependencies
    @State private var model: IntakeContainerViewModel?

    var body: some View {
        Group {
            if let model {
                content(model: model)
            } else {
                IntakeLoadingView()
            }
        }
        .appBackground()
        .task {
            if model == nil {
                let vm = IntakeContainerViewModel(intake: dependencies.intake)
                vm.configure(goalId: goalId)
                model = vm
            }
            await model?.loadNextBatch()
        }
        .onDisappear {
            model?.cancelPolling()
        }
    }

    private func content(model: IntakeContainerViewModel) -> some View {
        Group {
            switch model.phase {
            case .loading:
                IntakeLoadingView()

            case let .answering(batch):
                IntakeBatchView(
                    batch: batch,
                    answers: model.answers,
                    setAnswer: { questionId, answer in model.setAnswer(answer, for: questionId) },
                    onSubmit: {
                        Task { await model.submitCurrentBatch() }
                    }
                )
                .id(batch.batchId)
                .transition(.push(from: .trailing))

            case .submitting:
                IntakeLoadingView()

            case .generatingProfile:
                IntakeLoadingView(isGeneratingProfile: true)

            case .completed:
                IntakeCompletionView(onContinue: onComplete)

            case let .error(message):
                IntakeErrorView(message: message, onRetry: {
                    Task { await model.loadNextBatch() }
                })

            case .profileFailed:
                IntakeErrorView(
                    message: String(localized: "intake.error.profileFailed", table: "Intake"),
                    onRetry: {
                        Task { await model.retryProfileGeneration() }
                    }
                )
            }
        }
        .appBackground()
        .animation(.easeInOut(duration: 0.3), value: model.phase)
    }
}
