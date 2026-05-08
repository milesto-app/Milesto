import SwiftUI

struct IntakeContainerView: View {
    let goalId: String
    let onComplete: () -> Void

    @Environment(AppEnv.self) private var env
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
                let vm = IntakeContainerViewModel(env: env)
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
        ZStack {
            switch model.phase {
            case .loading:
                IntakeLoadingView()
                    .transition(.opacity)

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
                .transition(.opacity)

            case .submitting:
                IntakeLoadingView()
                    .transition(.opacity)

            case .generatingProfile:
                IntakeLoadingView()
                    .transition(.opacity)

            case .completed:
                IntakeCompletionView(onContinue: onComplete)
                    .transition(.opacity)

            case let .error(message):
                IntakeErrorView(message: message, onRetry: {
                    Task { await model.loadNextBatch() }
                })
                .transition(.opacity)

            case .profileFailed:
                IntakeErrorView(
                    message: String(localized: "intake.error.profileFailed", table: "Intake"),
                    onRetry: {
                        Task { await model.retryProfileGeneration() }
                    }
                )
                .transition(.opacity)
            }
        }
        .appBackground()
        .animation(.easeInOut(duration: 0.3), value: model.phase)
    }
}
